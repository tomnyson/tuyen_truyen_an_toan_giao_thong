"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  ShowcaseGallery,
  type ShowcaseDataState,
} from "@/components/ShowcaseGallery";
import { SiteQrCode } from "@/components/SiteQrCode";
import { ContentMedia } from "@/components/ContentMedia";
import { GameZone } from "@/components/GameZone";
import { SituationAnswer } from "@/components/SituationAnswer";
import { HeroArt } from "@/components/HeroArt";
import {
  ArrowRightIcon,
  ArrowUpRightIcon,
  BoltIcon,
  BookIcon,
  ChatIcon,
  CloseIcon,
  MailIcon,
  MenuIcon,
  EyeIcon,
  PhoneIcon,
  PlayCircleIcon,
  ScalesIcon,
  SearchIcon,
  SendIcon,
  ShieldIcon,
  SparkleIcon,
  TopicIcon,
  TrafficIcon,
  WarningIcon,
} from "@/components/icons";
import { EngagementProvider } from "@/components/EngagementProvider";
import { EngagementBar, EngagementStat } from "@/components/EngagementBar";
import {
  useSharedContentId,
  useSharedContentUrl,
} from "@/components/useSharedContentLink";
import {
  brandLocality,
  brandName,
  brandShortName,
} from "@/lib/brand";
import {
  chatAnswerSectionTitle,
  parseChatAnswerSections,
  parseChatFollowUps,
  type ChatAnswerSection,
} from "@/lib/chat-answer-presentation";
import {
  laws,
  reviewedLegalBasisOf as reviewedLegalBasis,
  reviewedPenaltyOf as reviewedPenalty,
  sources,
  type LawItem,
} from "@/lib/legal-content";
import {
  filterTopics,
  heroQuickChips,
  type Topic,
} from "@/lib/topics";
import { rankBySituation } from "@/lib/situation-search";
import { resolveShowcaseMedia } from "@/lib/showcase-media";
import {
  parsePublicShowcases,
  type PublicShowcase,
} from "@/lib/public-showcase";
import {
  parsePublicSourceLinks,
  publicSourceUiCopy,
  type OfficialSourceLink,
  type PublicSourceKind,
} from "@/lib/official-source-url";
import {
  answerOriginCopyOf,
  parseAnswerOrigin,
  type AnswerOrigin,
} from "@/lib/answer-origin";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  warning?: string;
  sections?: ChatAnswerSection[];
  sources?: OfficialSourceLink[];
  sourceKind?: PublicSourceKind;
  answerOrigin?: AnswerOrigin;
  followUps?: string[];
};

type PublishedCitation = {
  documentNumber: string;
  title: string;
  issuedAt: string | null;
  article: string | null;
  clause: string | null;
  point: string | null;
  effectiveFrom: string | null;
  lastVerifiedAt: string | null;
  officialUrl: string;
};

type PublishedContent = {
  laws?: Array<{
    id: number;
    topic: LawItem["topic"];
    icon: string;
    title: string;
    legalBasis: string;
    penalty: string;
    remedy: string;
    caseStudy: string;
    tags: string;
    mediaUrl?: string;
    citations?: PublishedCitation[];
  }>;
  showcases?: unknown;
};

function parseTags(value: string) {
  try {
    const tags = JSON.parse(value) as unknown;
    return Array.isArray(tags) ? tags.filter((tag): tag is string => typeof tag === "string") : [];
  } catch {
    return [];
  }
}

const initialChatMessage: ChatMessage = {
  role: "assistant",
  content: `Chào bạn! Mình là trợ lý ${brandName}. Bạn có thể hỏi về giao thông hoặc an toàn trên mạng nhé.`,
};

// Entry lấy từ database được dịch id để không đè lên nội dung seed tĩnh; bộ
// đếm tương tác chỉ áp dụng cho entry có thật trong database.
const managedLawIdOffset = 100_000;
const lookupPageSize = 6;

// Mỗi chip tra cứu nhanh mang một biểu tượng riêng để bốn ô không nhìn giống
// hệt nhau; dùng bộ icon tự vẽ trong `components/icons.tsx`.
const quickChipIcons = {
  brick: WarningIcon,
  sky: EyeIcon,
  green: PhoneIcon,
  gold: TrafficIcon,
} as const;

// Ba đầu mối trong băng trợ giúp khẩn — viên vàng hiển thị số máy (hoặc nhãn
// viết tắt khi đầu mối không phải tổng đài số).
const helpHotlines = [
  {
    code: "111",
    name: "Tổng đài quốc gia bảo vệ trẻ em",
    note: "24/7 · Miễn phí",
  },
  {
    code: "113",
    name: "Công an – tình huống khẩn cấp",
    note: "24/7 · Miễn phí",
  },
  {
    code: "TGPL",
    name: `Trung tâm Trợ giúp pháp lý Nhà nước tỉnh ${brandLocality}`,
    note: "Sở Tư pháp · Tư vấn miễn phí cho HSSV",
  },
] as const;

function managedLawId(id: number): number | null {
  return id > managedLawIdOffset ? id - managedLawIdOffset : null;
}

function HomeContent() {
  const [topic, setTopic] = useState<Topic>("Tất cả");
  const [query, setQuery] = useState("");
  // Bản thiết kế mở đầu lưới tra cứu bằng 6 thẻ; phần còn lại hiện dần qua nút
  // "Xem thêm" nên không mất tình huống nào.
  const [visibleLaws, setVisibleLaws] = useState(lookupPageSize);
  const [lastLookupKey, setLastLookupKey] = useState("Tất cả\u0000");

  const [selectedLaw, setSelectedLaw] = useState<LawItem | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([initialChatMessage]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [managedLaws, setManagedLaws] = useState<LawItem[]>([]);
  const [managedShowcases, setManagedShowcases] = useState<PublicShowcase[]>([]);
  const [showcaseState, setShowcaseState] =
    useState<ShowcaseDataState>("loading");
  const sharedLawId = useSharedContentId("law");

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const response = await fetch("/api/content");
        if (!response.ok) throw new Error("content dependency unavailable");
        const content = (await response.json()) as PublishedContent;
        const parsedShowcases = parsePublicShowcases(content.showcases);
        if (!parsedShowcases) throw new Error("invalid showcase response");
        if (!active) return;
        const parsedLaws = (content.laws ?? []).map((item) => {
          const firstCitation = item.citations?.[0];
          const verified = (item.citations?.length ?? 0) > 0;
          const media = resolveShowcaseMedia(item.mediaUrl);
          return {
            id: managedLawIdOffset + item.id,
            topic: item.topic,
            icon: item.icon,
            title: item.title,
            legal: item.legalBasis,
            penalty: item.penalty,
            remedy: item.remedy,
            caseStudy: item.caseStudy,
            tags: parseTags(item.tags),
            mediaUrl: media.embedUrl,
            mediaKind: media.kind,
            verified,
            citation: firstCitation
              ? {
                  documentNumber: firstCitation.documentNumber,
                  title: firstCitation.title,
                  issuedAt: firstCitation.issuedAt ?? "",
                  article: firstCitation.article ?? "",
                  clause: firstCitation.clause ?? "",
                  point: firstCitation.point ?? undefined,
                  effectiveFrom: firstCitation.effectiveFrom ?? "",
                  lastVerifiedAt: firstCitation.lastVerifiedAt ?? "",
                  officialUrl: firstCitation.officialUrl,
                }
              : undefined,
          };
        });
        setManagedLaws(parsedLaws);
        // Người nhận liên kết chia sẻ được đưa thẳng vào điều luật đó.
        if (sharedLawId !== null) {
          const shared = parsedLaws.find(
            (item) => managedLawId(item.id) === sharedLawId,
          );
          if (shared) setSelectedLaw(shared);
        }
        setManagedShowcases(parsedShowcases);
        setShowcaseState(parsedShowcases.length > 0 ? "ready" : "empty");
      } catch {
        if (!active) return;
        setManagedShowcases([]);
        setShowcaseState("degraded");
      }
    })();
    return () => {
      active = false;
    };
  }, [sharedLawId]);

  const availableLaws = useMemo(() => [...managedLaws, ...laws], [managedLaws]);

  const selectedLawEngagementId = selectedLaw ? managedLawId(selectedLaw.id) : null;
  useSharedContentUrl("law", selectedLawEngagementId);

  // Đổi lĩnh vực hoặc từ khoá thì quay lại trang đầu của lưới. Chỉnh ngay trong
  // lúc render (thay vì trong effect) để không phải vẽ lại lần hai với số thẻ cũ.
  const lookupKey = `${topic}\u0000${query}`;
  if (lookupKey !== lastLookupKey) {
    setLastLookupKey(lookupKey);
    setVisibleLaws(lookupPageSize);
  }

  // Xếp hạng theo tình huống: người dùng gõ nguyên câu hỏi đời thực hoặc từ
  // viết tắt (ATGT, BLHĐ…) đều phải ra kết quả, kết quả khớp nhiều lên trước.
  const filteredLaws = useMemo(() => {
    const byTopic = availableLaws.filter(
      (item) => topic === "Tất cả" || item.topic === topic,
    );
    return rankBySituation(byTopic, query, (item) =>
      [
        item.title,
        item.legal,
        item.topic,
        item.remedy,
        item.caseStudy,
        item.tags.join(" "),
      ].join(" "),
    );
  }, [availableLaws, query, topic]);

  // Tình huống cũng phải tìm được bằng ô tra cứu và bộ lọc lĩnh vực — trước
  // đây gallery bỏ qua hoàn toàn `query`/`topic` (bug #4).
  const filteredShowcases = useMemo(() => {
    const byTopic = managedShowcases.filter(
      (item) => topic === "Tất cả" || item.topic === topic,
    );
    return rankBySituation(byTopic, query, (item) =>
      [item.title, item.summary, item.topic].join(" "),
    );
  }, [managedShowcases, query, topic]);

  const visibleShowcaseState: ShowcaseDataState =
    showcaseState === "ready" && filteredShowcases.length === 0
      ? "no-match"
      : showcaseState;

  function scrollToResults() {
    document.getElementById("tra-cuu")?.scrollIntoView({ behavior: "smooth" });
  }

  async function submitChatQuestion(event?: FormEvent, suggestedQuestion?: string) {
    event?.preventDefault();
    const question = (suggestedQuestion ?? chatInput).trim();
    if (!question || isChatLoading) return;

    const pendingMessages: ChatMessage[] = [
      ...chatMessages,
      { role: "user", content: question },
    ];
    setChatMessages(pendingMessages);
    setChatInput("");
    setIsChatLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: pendingMessages.slice(-8) }),
      });
      const data = (await response.json()) as {
        answer?: string;
        error?: string;
        mode?: string;
        warning?: string;
        sourceKind?: string;
        answerOrigin?: unknown;
        sections?: unknown;
        sources?: unknown;
        followUps?: unknown;
      };
      const sourceKind: PublicSourceKind =
        data.mode === "web_search" && data.sourceKind === "reference"
          ? "reference"
          : "official";
      const searchedSources =
        data.mode === "web_search" || data.mode === "knowledge"
          ? parsePublicSourceLinks(data.sources, sourceKind)
          : [];
      const answerSections =
        data.mode === "web_search" || data.mode === "knowledge"
          ? parseChatAnswerSections(data.sections)
          : null;
      const followUps =
        data.mode === "knowledge" ? parseChatFollowUps(data.followUps) : [];
      setChatMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: data.answer ?? data.error ?? "Mình chưa thể trả lời lúc này. Bạn thử lại sau nhé.",
          warning:
            data.mode === "web_search" && typeof data.warning === "string"
              ? data.warning
              : undefined,
          sections: answerSections ?? undefined,
          sources: searchedSources.length > 0 ? searchedSources : undefined,
          sourceKind:
            searchedSources.length > 0 ? sourceKind : undefined,
          answerOrigin: parseAnswerOrigin(data.answerOrigin) ?? undefined,
          followUps: followUps.length > 0 ? followUps : undefined,
        },
      ]);
    } catch {
      setChatMessages((current) => [
        ...current,
        { role: "assistant", content: "Kết nối đang gián đoạn. Bạn thử gửi lại câu hỏi sau ít phút nhé." },
      ]);
    } finally {
      setIsChatLoading(false);
    }
  }

  return (
    <>
      <a className="skip-link" href="#noi-dung">
        Chuyển tới nội dung chính
      </a>

      <header className="site-header">
        <div className="shell">
          <a className="brand" href="#top" aria-label={`${brandName} — Trang chủ`}>
            <span className="brand-mark" aria-hidden="true">
              <ScalesIcon />
            </span>
            <span className="brand-text">
              <strong>{brandShortName}</strong>
              <small>{brandLocality}</small>
            </span>
          </a>
          <button
            type="button"
            className="nav-toggle"
            aria-expanded={navOpen}
            aria-controls="dieu-huong-chinh"
            onClick={() => setNavOpen((open) => !open)}
          >
            <span className="sr-only">
              {navOpen ? "Đóng danh mục" : "Mở danh mục"}
            </span>
            {navOpen ? <CloseIcon /> : <MenuIcon />}
          </button>
          <nav
            id="dieu-huong-chinh"
            className="site-nav"
            data-open={navOpen}
            aria-label="Điều hướng chính"
            onClick={() => setNavOpen(false)}
          >
            <a href="#top" aria-current="page">Trang chủ</a>
            <a href="#chu-de">Chủ đề</a>
            <a href="#tra-cuu">Tra cứu</a>
            <a href="#tinh-huong">Tình huống</a>
            <a href="#ren-luyen">Thử thách</a>
          </nav>
          <button
            type="button"
            className="header-cta"
            onClick={() => setChatOpen(true)}
          >
            Hỏi trợ lý <ArrowUpRightIcon />
          </button>
        </div>
      </header>

      <main id="noi-dung">
        <section className="hero" id="top">
          <div className="shell">
            <div className="hero-copy">
              <p className="hero-eyebrow">
                <BookIcon /> Cẩm nang pháp luật cho học sinh, sinh viên tỉnh
                Đắk Lắk
              </p>
              <h1>
                Hiểu luật dễ dàng.
                <span>Ứng xử an toàn.</span>
              </h1>
              <p className="hero-lead">
                Tra cứu nhanh những quy định gần gũi với trường học — từ giao
                thông, mạng xã hội đến bản quyền — bằng ngôn ngữ dễ hiểu và tình
                huống có thật.
              </p>

              <div className="hero-search" role="search">
                <label htmlFor="main-search">Bạn đang thắc mắc điều gì?</label>
                <div className="search-row">
                  <SearchIcon />
                  <input
                    id="main-search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    onKeyDown={(event) => event.key === "Enter" && scrollToResults()}
                    placeholder="Thử: bị ghép ảnh chế giễu thì làm gì?"
                  />
                  <button
                    type="button"
                    className="search-go"
                    onClick={scrollToResults}
                  >
                    Tra cứu <ArrowRightIcon />
                  </button>
                </div>
              </div>

              <div className="quick-links">
                <span>Tình huống thường gặp:</span>
                <div className="quick-link-grid">
                  {heroQuickChips.map((chip) => {
                    const ChipIcon = quickChipIcons[chip.tone];
                    return (
                      <button
                        type="button"
                        key={chip.label}
                        data-tone={chip.tone}
                        onClick={() => {
                          setTopic(chip.topic);
                          setQuery(chip.label);
                          scrollToResults();
                        }}
                      >
                        <ChipIcon />
                        {chip.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="hero-visual">
              <span className="hero-blob gold" aria-hidden="true" />
              <span className="hero-blob ring" aria-hidden="true" />
              <span className="hero-blob pink" aria-hidden="true" />
              <div className="hero-photo">
                <HeroArt />
              </div>
              <div className="hero-badge top">
                <i aria-hidden="true"><ShieldIcon /></i>
                <div>
                  <strong>5 lĩnh vực</strong>
                  <small>được biên soạn theo văn bản đang hiệu lực</small>
                </div>
              </div>
              <div className="hero-badge bottom">
                <i aria-hidden="true"><ChatIcon /></i>
                <div>
                  <strong>Hỏi đáp tức thì</strong>
                  <small>trợ lý trả lời kèm căn cứ pháp lý</small>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="ribbon" aria-hidden="true" />

        <section className="topics-section" id="chu-de">
          <div className="shell">
            <div className="section-head">
              <div>
                <span className="section-kicker">Chủ đề pháp luật</span>
                <h2>Chọn chủ đề bạn quan tâm</h2>
                <p className="lead">
                  Năm nhóm quy định sát với đời sống học sinh, sinh viên. Mỗi chủ
                  đề gom sẵn tình huống, mức xử lý tham khảo và điều luật để bạn
                  đối chiếu, thay vì phải đọc trọn cả nghị định.
                </p>
              </div>
              <span className="head-chip">
                <BookIcon />
                <strong>{availableLaws.length}</strong> tình huống đã biên soạn
              </span>
            </div>

            <div className="topics-grid">
              <div className="topic-list">
                {filterTopics.slice(1).map((item, index) => (
                  <button
                    type="button"
                    key={item.name}
                    className={topic === item.name ? "topic-card active" : "topic-card"}
                    onClick={() => {
                      setTopic(item.name);
                      scrollToResults();
                    }}
                  >
                    <span className={`topic-icon t${index + 1}`} aria-hidden="true">
                      <TopicIcon topic={item.name} />
                    </span>
                    <span className="topic-body">
                      <strong>
                        <span className="topic-index">0{index + 1}</span>
                        {item.name}
                      </strong>
                      <small>{item.detail}</small>
                    </span>
                    <span className="topic-go" aria-hidden="true">
                      <ArrowRightIcon />
                    </span>
                  </button>
                ))}
              </div>

              <aside className="memo-card" aria-labelledby="memo-title">
                <p className="memo-chip">
                  <BoltIcon /> Ghi nhớ nhanh
                </p>
                <h3 id="memo-title">Tuổi của bạn quyết định mức xử lý</h3>
                <div className="age-grid">
                  <div className="age-row">
                    <strong>
                      Dưới 14<small>tuổi</small>
                    </strong>
                    <span>Không bị xử phạt hành chính, chỉ nhắc nhở và giáo dục</span>
                  </div>
                  <div className="age-row">
                    <strong>
                      14–16<small>tuổi</small>
                    </strong>
                    <span>Chỉ bị xử phạt với lỗi cố ý và không áp dụng phạt tiền</span>
                  </div>
                  <div className="age-row">
                    <strong>
                      16–18<small>tuổi</small>
                    </strong>
                    <span>Có thể bị phạt tiền nhưng không quá một nửa mức người lớn</span>
                  </div>
                </div>
                <p className="memo-note">
                  <WarningIcon />
                  Mức áp dụng thực tế còn phụ thuộc hành vi, độ tuổi tại thời điểm
                  vi phạm và tình tiết cụ thể của từng vụ việc.
                </p>
              </aside>
            </div>
          </div>
        </section>

        <section className="lookup-section" id="tra-cuu">
          <div className="shell">
            <div className="section-head">
              <div>
                <span className="kicker-pill">
                  <SearchIcon /> Tra cứu theo tình huống
                </span>
                <h2>Điều bạn cần biết, ngay khi cần.</h2>
                <p className="lead">
                  Gõ nguyên câu hỏi đời thường hoặc từ viết tắt quen thuộc như
                  ATGT, BLHĐ — kết quả khớp nhất sẽ hiện lên trước.
                </p>
              </div>
              {filteredShowcases.length > 0 ? (
                <a className="head-chip" href="#tinh-huong">
                  <strong>{filteredLaws.length}</strong>
                  tình huống · hiển thị {Math.min(visibleLaws, filteredLaws.length)}
                  <ArrowRightIcon />
                </a>
              ) : (
                <span className="head-chip">
                  <strong>{filteredLaws.length}</strong> tình huống · hiển thị{" "}
                  {Math.min(visibleLaws, filteredLaws.length)}
                </span>
              )}
            </div>

            <div className="filter-bar" role="group" aria-label="Bộ lọc lĩnh vực">
              {filterTopics.map((item) => (
                <button
                  type="button"
                  key={item.name}
                  className={topic === item.name ? "active" : ""}
                  aria-pressed={topic === item.name}
                  onClick={() => setTopic(item.name)}
                >
                  <TopicIcon topic={item.name} />
                  {item.name}
                </button>
              ))}
            </div>

            {filteredLaws.length ? (
              <div className="situation-list">
                {filteredLaws.slice(0, visibleLaws).map((item) => {
                  const engagementId = managedLawId(item.id);
                  return (
                    <article className="situation-card" key={item.id}>
                      <header>
                        <span className="topic-chip" data-topic={item.topic}>
                          <TopicIcon topic={item.topic} />
                          {item.topic}
                        </span>
                        {engagementId !== null && (
                          <EngagementStat entityType="law" entityId={engagementId} />
                        )}
                      </header>
                      <h3>{item.title}</h3>
                      <ContentMedia
                        kind={item.mediaKind ?? "none"}
                        url={item.mediaUrl ?? ""}
                        imageAlt={`Ảnh minh họa tình huống: ${item.title}`}
                        videoTitle={`Video minh họa tình huống: ${item.title}`}
                        className="situation-media"
                      />
                      <SituationAnswer
                        remedy={item.remedy}
                        penalty={reviewedPenalty(item)}
                        legalBasis={reviewedLegalBasis(item)}
                        citationUrl={item.citation?.officialUrl}
                      />
                      <footer className="situation-actions">
                        <button
                          type="button"
                          className="situation-detail"
                          onClick={() => setSelectedLaw(item)}
                          aria-label={`Xem tình huống minh họa: ${item.title}`}
                        >
                          <PlayCircleIcon /> Xem tình huống minh họa
                        </button>
                      </footer>
                    </article>
                  );
                })}
                {filteredLaws.length > visibleLaws && (
                  <button
                    type="button"
                    className="lookup-more"
                    onClick={() =>
                      setVisibleLaws((current) => current + lookupPageSize)
                    }
                  >
                    Xem thêm tình huống
                    <small>
                      còn {filteredLaws.length - visibleLaws} thẻ nữa
                    </small>
                  </button>
                )}
              </div>
            ) : (
              <div className="empty-state">
                <i aria-hidden="true"><SearchIcon /></i>
                <h3>Chưa tìm thấy tình huống này</h3>
                <p>
                  Thử mô tả ngắn gọn hơn, ví dụ “bị bắt nạt”, “mũ bảo hiểm”, hoặc
                  gõ tắt “BLHĐ”, “ATGT”.
                </p>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => {
                    setQuery("");
                    setTopic("Tất cả");
                  }}
                >
                  Xem tất cả tình huống <ArrowRightIcon />
                </button>
              </div>
            )}
          </div>
        </section>

        <div className="ribbon dark" aria-hidden="true" />

        <section className="cases" id="tinh-huong">
          <div className="shell">
            <div className="section-head">
              <div>
                <span className="section-kicker">Góc cảnh báo</span>
                <h2>Đừng để một cú nhấp trở thành bài học đắt giá.</h2>
                <p className="lead">
                  Các tình huống dưới đây được biên soạn để giáo dục, giúp bạn
                  nhận diện rủi ro trước khi hành động.
                </p>
              </div>
            </div>
            <ShowcaseGallery
              state={visibleShowcaseState}
              showcases={filteredShowcases}
            />
          </div>
        </section>

        <GameZone />

        <section className="source-section" id="nguon">
          <div className="shell">
            <div className="source-grid">
              <div className="source-intro">
                <span className="section-kicker">Nguồn tham khảo</span>
                <h2>Đọc luật từ nguồn chính thống.</h2>
                <p>
                  Nội dung ở đây được diễn giải ngắn gọn để học tập, không thay
                  thế tư vấn pháp lý cho một vụ việc cụ thể.
                </p>
                <SiteQrCode />
              </div>
              <div className="source-list">
                {sources.map((source, index) => (
                  <a
                    key={source.label}
                    href={source.href}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <span className="source-index">0{index + 1}</span>
                    <span className="source-name">{source.label}</span>
                    <span className="topic-chip" data-topic={source.topic}>
                      {source.topic}
                    </span>
                    <span className="source-go" aria-hidden="true">
                      <ArrowUpRightIcon />
                    </span>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </section>

        <div className="shell">
          <section className="help-cta" aria-labelledby="help-title">
            <div className="help-grid">
              <div className="help-copy">
                <p className="help-kicker">Cần giúp ngay?</p>
                <h2 id="help-title">Khi tình huống vượt quá sức mình, hãy gọi.</h2>
                <p>
                  Ba đầu mối dưới đây tiếp nhận miễn phí, hoạt động cả ngoài giờ
                  hành chính và giữ kín thông tin người báo.
                </p>
                <button
                  type="button"
                  className="btn-gold"
                  onClick={() => setChatOpen(true)}
                >
                  <ChatIcon /> Hỏi trợ lý trước khi gọi
                </button>
              </div>
              <ul className="hotline-list">
                {helpHotlines.map((hotline) => (
                  <li className="hotline-card" key={hotline.code}>
                    <i aria-hidden="true">{hotline.code}</i>
                    <div>
                      <strong>{hotline.name}</strong>
                      <small>{hotline.note}</small>
                    </div>
                    <PhoneIcon aria-hidden="true" />
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </div>
      </main>

      <footer className="site-footer">
        <div className="shell">
          <div className="footer-grid">
            <div className="footer-about">
              <div className="footer-brand">
                <span className="brand-mark" aria-hidden="true">
                  <ScalesIcon />
                </span>
                <span className="brand-text">
                  <strong>{brandShortName}</strong>
                  <small>Tỉnh {brandLocality}</small>
                </span>
              </div>
              <p>
                Trang tra cứu dành cho học sinh, sinh viên và thầy cô: diễn giải
                quy định bằng ngôn ngữ dễ hiểu, luôn kèm điều luật để đối chiếu.
              </p>
              <div className="footer-social">
                <a href="#top" aria-label="Về đầu trang">
                  <ArrowUpRightIcon />
                </a>
                <a href="https://tongdai111.vn/" target="_blank" rel="noopener noreferrer" aria-label="Tổng đài 111">
                  <PhoneIcon />
                </a>
                <a href="mailto:hotro@tuyentruyenphapluat.edu.vn" aria-label="Gửi thư góp ý">
                  <MailIcon />
                </a>
              </div>
            </div>

            <div className="footer-col">
              <h3>Chủ đề</h3>
              <ul>
                {filterTopics.slice(1).map((item) => (
                  <li key={item.name}>
                    <a
                      href="#tra-cuu"
                      onClick={() => setTopic(item.name)}
                    >
                      {item.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div className="footer-col">
              <h3>Khám phá</h3>
              <ul>
                <li><a href="#tra-cuu">Tra cứu tình huống</a></li>
                <li><a href="#tinh-huong">Góc cảnh báo</a></li>
                <li><a href="#ren-luyen">Thử thách kiến thức</a></li>
                <li><a href="#nguon">Nguồn luật gốc</a></li>
              </ul>
            </div>

            <div className="footer-col">
              <h3>Đường dây nóng</h3>
              <ul>
                <li><a href="tel:111">111 · Bảo vệ trẻ em</a></li>
                <li><a href="tel:113">113 · Cảnh sát phản ứng nhanh</a></li>
                <li><a href="tel:156">156 · Báo lừa đảo trên mạng</a></li>
              </ul>
            </div>
          </div>

          <div className="footer-bottom">
            <p>Cập nhật nội dung: tháng 7/2026 · {brandName}</p>
            <nav aria-label="Thông tin pháp lý">
              <a href="/dieu-khoan">Điều khoản sử dụng</a>
              <a href="/dieu-khoan#rieng-tu">Quyền riêng tư</a>
              <a href="#nguon">Nguồn dữ liệu</a>
            </nav>
          </div>
        </div>
      </footer>

      <button
        type="button"
        className="floating-chat"
        onClick={() => setChatOpen(true)}
        aria-label="Mở trợ lý hỏi đáp pháp luật"
      >
        <span aria-hidden="true"><ChatIcon /></span>
        <b>Hỏi nhanh</b>
      </button>

      {selectedLaw && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setSelectedLaw(null)}>
          <section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" onMouseDown={(event) => event.stopPropagation()}>
            <button type="button" className="modal-close" onClick={() => setSelectedLaw(null)} aria-label="Đóng">
              <CloseIcon />
            </button>
            <span className="modal-topic">{selectedLaw.topic}</span>
            <h2 id="modal-title">{selectedLaw.title}</h2>
            <ContentMedia
              kind={selectedLaw.mediaKind ?? "none"}
              url={selectedLaw.mediaUrl ?? ""}
              imageAlt={`Ảnh minh họa tình huống: ${selectedLaw.title}`}
              videoTitle={`Video minh họa tình huống: ${selectedLaw.title}`}
            />
            <div className="modal-facts">
              <div>
                <span>Căn cứ</span>
                <strong>{reviewedLegalBasis(selectedLaw)}</strong>
                {selectedLaw.citation && (
                  <a
                    href={selectedLaw.citation.officialUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Mở nguồn chính thức
                  </a>
                )}
              </div>
              <div><span>Mức phạt tham khảo</span><strong>{reviewedPenalty(selectedLaw)}</strong></div>
            </div>
            <div className="story-box"><span>TÌNH HUỐNG MINH HỌA</span><p>{selectedLaw.caseStudy}</p></div>
            <div className="tag-row">{selectedLaw.tags.map((tag) => <span key={tag}>#{tag}</span>)}</div>
            <button
              className="modal-ask-ai"
              onClick={() => {
                const question = `${selectedLaw.title} thì bị xử lý thế nào?`;
                setSelectedLaw(null);
                setChatOpen(true);
                void submitChatQuestion(undefined, question);
              }}
            >
              Hỏi trợ lý về tình huống này <ChatIcon />
            </button>
            {managedLawId(selectedLaw.id) !== null && (
              <EngagementBar
                entityType="law"
                entityId={managedLawId(selectedLaw.id) as number}
                title={selectedLaw.title}
              />
            )}
            <p className="modal-note">Tình huống được biên soạn để giáo dục, không phải hồ sơ xử phạt có thật. Mức áp dụng thực tế phụ thuộc độ tuổi, chủ thể và tình tiết cụ thể.</p>
          </section>
        </div>
      )}

      {chatOpen && (
        <div className="chat-panel" role="dialog" aria-modal="true" aria-labelledby="chat-title">
          <div className="chat-head">
            <div><span>TRA CỨU • AN TOÀN</span><h2 id="chat-title">Trợ lý {brandShortName}</h2></div>
            <button type="button" onClick={() => setChatOpen(false)} aria-label="Đóng trợ lý">
              <CloseIcon />
            </button>
          </div>
          <div className="chat-body" aria-live="polite">
            <div className="chat-messages">
              {chatMessages.map((message, index) => {
                const sourceCopy = publicSourceUiCopy(
                  message.sourceKind,
                  Boolean(message.warning),
                );
                const originCopy = message.answerOrigin
                  ? answerOriginCopyOf(message.answerOrigin)
                  : null;
                return (
                <div key={`${message.role}-${index}`} className={`chat-message ${message.role}`}>
                  {originCopy && (
                    <p
                      className="chat-origin"
                      data-origin={message.answerOrigin}
                      title={originCopy.detail}
                    >
                      <SparkleIcon />
                      <span>Nguồn trả lời: {originCopy.label}</span>
                    </p>
                  )}
                  {message.warning && (
                    <p className="chat-warning" role="note">
                      <strong>
                        {sourceCopy.warningTitle}
                      </strong>
                      <span>{message.warning}</span>
                    </p>
                  )}
                  {message.sections ? (
                    <div className="chat-answer-sections">
                      {message.sections.map((section) => (
                        <section
                          key={section.kind}
                          className={`chat-answer-section chat-answer-section-${section.kind.replaceAll("_", "-")}`}
                          data-kind={section.kind}
                        >
                          <h3>{chatAnswerSectionTitle(section.kind)}</h3>
                          {section.paragraphs.map((paragraph, paragraphIndex) => (
                            <p key={`${section.kind}-p-${paragraphIndex}`}>
                              {paragraph}
                            </p>
                          ))}
                          {section.bullets.length > 0 && (
                            <ul>
                              {section.bullets.map((bullet, bulletIndex) => (
                                <li key={`${section.kind}-b-${bulletIndex}`}>
                                  {bullet}
                                </li>
                              ))}
                            </ul>
                          )}
                        </section>
                      ))}
                    </div>
                  ) : (
                    <p>{message.content}</p>
                  )}
                  {message.sources && (
                    <div className="chat-source-group">
                      <h3>
                        {sourceCopy.groupTitle}
                      </h3>
                      <ul className="chat-sources">
                        {message.sources.map((source) => (
                          <li key={source.url}>
                            <span>
                              {source.title || sourceCopy.fallbackTitle}
                            </span>
                            <small>{new URL(source.url).hostname}</small>
                            <a
                              href={source.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label={`${sourceCopy.openAriaPrefix}: ${source.title || sourceCopy.fallbackTitle}`}
                            >
                              {sourceCopy.openAction}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {message.followUps && index === chatMessages.length - 1 && (
                    <div className="chat-follow-ups">
                      <h3>Bạn có thể hỏi tiếp</h3>
                      <ul>
                        {message.followUps.map((followUp) => (
                          <li key={followUp}>
                            <button
                              type="button"
                              disabled={isChatLoading}
                              onClick={() =>
                                void submitChatQuestion(undefined, followUp)
                              }
                            >
                              {followUp}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                );
              })}
              {isChatLoading && <div className="chat-message assistant typing">Đang tìm hiểu<span>•••</span></div>}
            </div>
            {chatMessages.length === 1 && (
              <div className="chat-suggestions">
                {["Em 15 tuổi đi xe 50cc được không?", "Đăng lại tin sai có bị phạt không?"].map((question) => (
                  <button key={question} onClick={() => void submitChatQuestion(undefined, question)}>{question}</button>
                ))}
              </div>
            )}
            <form className="chat-form" onSubmit={(event) => void submitChatQuestion(event)}>
              <label htmlFor="chat-question" className="sr-only">Nhập câu hỏi pháp luật</label>
              <input
                id="chat-question"
                value={chatInput}
                onChange={(event) => setChatInput(event.target.value)}
                placeholder="Nhập câu hỏi của bạn…"
                maxLength={600}
                disabled={isChatLoading}
              />
              <button type="submit" disabled={isChatLoading || !chatInput.trim()} aria-label="Gửi câu hỏi">
                <SendIcon />
              </button>
            </form>
          </div>
          <p>Nội dung chỉ để học tập, không thay thế tư vấn pháp lý.</p>
        </div>
      )}
    </>
  );
}

// Provider bọc ngoài để mọi phần của trang dùng chung bộ đếm tương tác.
export default function Home() {
  return (
    <EngagementProvider>
      <HomeContent />
    </EngagementProvider>
  );
}
