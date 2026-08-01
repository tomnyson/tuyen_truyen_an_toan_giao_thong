"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  ShowcaseGallery,
  type ShowcaseDataState,
} from "@/components/ShowcaseGallery";
import {
  chatAnswerSectionTitle,
  parseChatAnswerSections,
  type ChatAnswerSection,
} from "@/lib/chat-answer-presentation";
import {
  laws,
  normalizeVietnamese,
  sources,
  topics,
  type LawItem,
  type Topic,
} from "@/lib/legal-content";
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

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  warning?: string;
  sections?: ChatAnswerSection[];
  sources?: OfficialSourceLink[];
  sourceKind?: PublicSourceKind;
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

function reviewedLegalBasis(item: LawItem) {
  // Entry đã có citation bốn mắt: hiển thị đúng câu căn cứ do biên tập viên
  // soạn (bao quát cả Luật/Bộ luật/VBHN, không chỉ Nghị định).
  if (item.verified) return item.legal;
  if (!item.citation) return "Đang kiểm chứng căn cứ hiện hành";
  const provision = [
    item.citation.point ? `Điểm ${item.citation.point}` : "",
    `khoản ${item.citation.clause}`,
    `Điều ${item.citation.article}`,
  ]
    .filter(Boolean)
    .join(" ");
  return `${provision} Nghị định ${item.citation.documentNumber}`;
}

function reviewedPenalty(item: LawItem) {
  if (item.verified) return item.penalty;
  return item.reviewedSanction?.summary ?? "Chưa công bố mức tham khảo";
}

const initialChatMessage: ChatMessage = {
  role: "assistant",
  content: "Chào bạn! Mình là trợ lý tra cứu Luật Học Đường. Bạn có thể hỏi về giao thông hoặc an toàn trên mạng nhé.",
};

export default function Home() {
  const [topic, setTopic] = useState<Topic>("Tất cả");
  const [query, setQuery] = useState("");
  const [selectedLaw, setSelectedLaw] = useState<LawItem | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([initialChatMessage]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [managedLaws, setManagedLaws] = useState<LawItem[]>([]);
  const [managedShowcases, setManagedShowcases] = useState<PublicShowcase[]>([]);
  const [showcaseState, setShowcaseState] =
    useState<ShowcaseDataState>("loading");

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
        setManagedLaws((content.laws ?? []).map((item) => {
          const firstCitation = item.citations?.[0];
          const verified = (item.citations?.length ?? 0) > 0;
          return {
            id: 100_000 + item.id,
            topic: item.topic,
            icon: item.icon,
            title: item.title,
            legal: item.legalBasis,
            penalty: item.penalty,
            remedy: item.remedy,
            caseStudy: item.caseStudy,
            tags: parseTags(item.tags),
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
        }));
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
  }, []);

  const availableLaws = useMemo(() => [...managedLaws, ...laws], [managedLaws]);

  const filteredLaws = useMemo(() => {
    const q = normalizeVietnamese(query.trim());
    return availableLaws.filter((item) => {
      const matchesTopic = topic === "Tất cả" || item.topic === topic;
      const haystack = normalizeVietnamese(
        [item.title, item.legal, item.topic, item.tags.join(" ")].join(" "),
      );
      return matchesTopic && (!q || haystack.includes(q));
    });
  }, [availableLaws, query, topic]);

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
        sections?: unknown;
        sources?: unknown;
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
    <main>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="Luật Học Đường - Trang chủ">
          <span className="brand-mark">L</span>
          <span>LUẬT HỌC ĐƯỜNG</span>
        </a>
        <nav aria-label="Điều hướng chính">
          <a href="#tra-cuu">Tra cứu</a>
          <a href="#tinh-huong">Tình huống</a>
          <a href="#nguon">Nguồn luật</a>
        </nav>
        <button className="header-cta" onClick={() => setChatOpen(true)}>
          Hỏi trợ lý <span aria-hidden="true">↗</span>
        </button>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <div className="eyebrow"><span>●</span> CẨM NANG PHÁP LUẬT CHO HỌC SINH</div>
          <h1>
            Hiểu luật dễ dàng.<br />
            <span>Ứng xử an toàn.</span>
          </h1>
          <p>
            Tra cứu nhanh các quy định gần gũi với trường học — từ giao thông,
            mạng xã hội đến bản quyền — bằng ngôn ngữ dễ hiểu và tình huống thực tế.
          </p>
          <div className="hero-search" role="search">
            <label htmlFor="main-search">Bạn đang thắc mắc điều gì?</label>
            <div className="search-row">
              <span aria-hidden="true">⌕</span>
              <input
                id="main-search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && scrollToResults()}
                placeholder='Thử: “không đội mũ bảo hiểm”'
              />
              <button onClick={scrollToResults}>Tra cứu</button>
            </div>
          </div>
          <div className="quick-links">
            <span>Gợi ý:</span>
            {['mũ bảo hiểm', 'ảnh riêng tư', 'tin sai sự thật'].map((suggestion) => (
              <button key={suggestion} onClick={() => { setQuery(suggestion); scrollToResults(); }}>
                {suggestion}
              </button>
            ))}
          </div>
        </div>

        <aside className="hero-card" aria-label="Điều cần nhớ">
          <div className="card-topline"><span>GHI NHỚ NHANH</span><span>01</span></div>
          <div className="helmet-visual" aria-hidden="true">
            <span className="helmet-shell"></span>
            <span className="helmet-star">★</span>
          </div>
          <h2>Tuổi của bạn ảnh hưởng đến mức xử lý</h2>
          <div className="age-grid">
            <div><strong>14–16</strong><span>Không áp dụng phạt tiền</span></div>
            <div><strong>16–18</strong><span>Không quá ½ mức người lớn</span></div>
          </div>
          <p>* Việc xử lý còn tùy hành vi, độ tuổi chính xác và tình tiết cụ thể.</p>
        </aside>
      </section>

      <section className="topic-strip" aria-label="Chọn lĩnh vực">
        {topics.slice(1).map((item, index) => (
          <button
            key={item.name}
            className={topic === item.name ? "topic-card active" : "topic-card"}
            onClick={() => { setTopic(item.name); scrollToResults(); }}
          >
            <span className={`topic-icon t${index + 1}`}>{item.icon}</span>
            <span><strong>{item.name}</strong><small>{item.detail}</small></span>
            <b aria-hidden="true">↗</b>
          </button>
        ))}
      </section>

      <section className="lookup-section" id="tra-cuu">
        <div className="section-heading">
          <div>
            <span className="section-kicker">TRA CỨU THEO TÌNH HUỐNG</span>
            <h2>Điều bạn cần biết, ngay khi cần.</h2>
          </div>
          <p>{filteredLaws.length} kết quả phù hợp</p>
        </div>

        <div className="filter-bar" role="group" aria-label="Bộ lọc lĩnh vực">
          {topics.map((item) => (
            <button
              key={item.name}
              className={topic === item.name ? "active" : ""}
              onClick={() => setTopic(item.name)}
            >
              {item.name}
            </button>
          ))}
        </div>

        {filteredLaws.length ? (
          <div className="law-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Hành vi</th>
                  <th>Căn cứ pháp lý</th>
                  <th>Mức phạt tham khảo</th>
                  <th>Việc nên làm</th>
                  <th><span className="sr-only">Xem chi tiết</span></th>
                </tr>
              </thead>
              <tbody>
                {filteredLaws.map((item) => (
                  <tr key={item.id}>
                    <td><span className="row-icon">{item.icon}</span><strong>{item.title}</strong></td>
                    <td>{reviewedLegalBasis(item)}</td>
                    <td><span className="penalty">{reviewedPenalty(item)}</span></td>
                    <td>{item.remedy}</td>
                    <td><button className="detail-button" onClick={() => setSelectedLaw(item)} aria-label={`Xem tình huống: ${item.title}`}>→</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <span>⌕</span>
            <h3>Chưa tìm thấy tình huống này</h3>
            <p>Thử một từ khóa ngắn hơn như “mũ bảo hiểm”, “Facebook” hoặc “ảnh riêng tư”.</p>
            <button onClick={() => { setQuery(""); setTopic("Tất cả"); }}>Xem tất cả</button>
          </div>
        )}
      </section>

      <section className="cases" id="tinh-huong">
        <div className="case-intro">
          <span className="section-kicker light">GÓC CẢNH BÁO</span>
          <h2>Đừng để một cú nhấp trở thành bài học đắt giá.</h2>
          <p>Các tình huống dưới đây được biên soạn để giáo dục, giúp bạn nhận diện rủi ro trước khi hành động.</p>
        </div>
        <ShowcaseGallery
          state={showcaseState}
          showcases={managedShowcases}
        />
      </section>

      <section className="source-section" id="nguon">
        <div>
          <span className="section-kicker">NGUỒN THAM KHẢO</span>
          <h2>Đọc luật từ nguồn chính thống.</h2>
          <p>Nội dung được diễn giải ngắn gọn để học tập, không thay thế tư vấn pháp lý cho vụ việc cụ thể.</p>
        </div>
        <div className="source-list">
          {sources.map((source, index) => (
            <a key={source.label} href={source.href} target="_blank" rel="noreferrer">
              <span>0{index + 1}</span><strong>{source.label}</strong><b>↗</b>
            </a>
          ))}
        </div>
      </section>

      <footer>
        <div className="footer-brand"><span className="brand-mark">L</span><strong>LUẬT HỌC ĐƯỜNG</strong></div>
        <p>Hiểu luật dễ dàng • Ứng xử an toàn</p>
        <p>Cập nhật nội dung: 07/2026</p>
      </footer>

      <button className="floating-chat" onClick={() => setChatOpen(true)} aria-label="Mở trợ lý hỏi đáp">
        <span>?</span><b>Hỏi nhanh</b>
      </button>

      {selectedLaw && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setSelectedLaw(null)}>
          <section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" onMouseDown={(event) => event.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedLaw(null)} aria-label="Đóng">×</button>
            <span className="modal-topic">{selectedLaw.topic}</span>
            <h2 id="modal-title">{selectedLaw.title}</h2>
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
              Hỏi AI về tình huống này →
            </button>
            <p className="modal-note">Tình huống được biên soạn để giáo dục, không phải hồ sơ xử phạt có thật. Mức áp dụng thực tế phụ thuộc độ tuổi, chủ thể và tình tiết cụ thể.</p>
          </section>
        </div>
      )}

      {chatOpen && (
        <div className="chat-panel" role="dialog" aria-modal="true" aria-labelledby="chat-title">
          <div className="chat-head">
            <div><span>TRA CỨU • AN TOÀN</span><h2 id="chat-title">Trợ lý Luật Học Đường</h2></div>
            <button onClick={() => setChatOpen(false)} aria-label="Đóng trợ lý">×</button>
          </div>
          <div className="chat-body" aria-live="polite">
            <div className="chat-messages">
              {chatMessages.map((message, index) => {
                const sourceCopy = publicSourceUiCopy(
                  message.sourceKind,
                  Boolean(message.warning),
                );
                return (
                <div key={`${message.role}-${index}`} className={`chat-message ${message.role}`}>
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
              <button type="submit" disabled={isChatLoading || !chatInput.trim()} aria-label="Gửi câu hỏi">↑</button>
            </form>
          </div>
          <p>Nội dung chỉ để học tập, không thay thế tư vấn pháp lý.</p>
        </div>
      )}
    </main>
  );
}
