"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  laws,
  normalizeVietnamese,
  sources,
  topics,
  type LawItem,
  type Topic,
} from "@/lib/legal-content";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
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
  }>;
  showcases?: Array<{
    id: number;
    topic: string;
    title: string;
    summary: string;
    sourceUrl: string;
  }>;
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
  content: "Chào bạn! Mình là trợ lý AI Luật Học Đường. Bạn có thể hỏi về giao thông, mạng xã hội hoặc bản quyền nhé.",
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
  const [managedShowcases, setManagedShowcases] = useState<NonNullable<PublishedContent["showcases"]>>([]);

  useEffect(() => {
    fetch("/api/content")
      .then((response) => response.json() as Promise<PublishedContent>)
      .then((content) => {
        setManagedLaws((content.laws ?? []).map((item) => ({
          id: 100_000 + item.id,
          topic: item.topic,
          icon: item.icon,
          title: item.title,
          legal: item.legalBasis,
          penalty: item.penalty,
          remedy: item.remedy,
          caseStudy: item.caseStudy,
          tags: parseTags(item.tags),
        })));
        setManagedShowcases(content.showcases ?? []);
      })
      .catch(() => {
        // Nội dung nền bên dưới vẫn hoạt động nếu kho quản trị tạm thời gián đoạn.
      });
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
      const data = (await response.json()) as { answer?: string; error?: string };
      setChatMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: data.answer ?? data.error ?? "Mình chưa thể trả lời lúc này. Bạn thử lại sau nhé.",
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
            {['mũ bảo hiểm', 'đạo văn', 'tin sai sự thật'].map((suggestion) => (
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
                  <th>Khắc phục</th>
                  <th><span className="sr-only">Xem chi tiết</span></th>
                </tr>
              </thead>
              <tbody>
                {filteredLaws.map((item) => (
                  <tr key={item.id}>
                    <td><span className="row-icon">{item.icon}</span><strong>{item.title}</strong></td>
                    <td>{item.legal}</td>
                    <td><span className="penalty">{item.penalty}</span></td>
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
            <p>Thử một từ khóa ngắn hơn như “mũ bảo hiểm”, “Facebook” hoặc “đạo văn”.</p>
            <button onClick={() => { setQuery(""); setTopic("Tất cả"); }}>Xem tất cả</button>
          </div>
        )}
      </section>

      <section className="cases" id="tinh-huong">
        <div className="case-intro">
          <span className="section-kicker light">GÓC CẢNH BÁO</span>
          <h2>Đừng để một cú nhấp trở thành bài học đắt giá.</h2>
          <p>Các tình huống dưới đây được biên soạn để giáo dục, giúp bạn nhận diện rủi ro trước khi hành động.</p>
          <button onClick={() => setSelectedLaw(availableLaws.find((item) => item.topic === "Mạng xã hội") ?? laws[2])}>Xem tình huống mạng xã hội <span>→</span></button>
        </div>
        <div className="case-cards">
          <article className="case-card yellow">
            <div className="case-meta"><span>MẠNG XÃ HỘI</span><span>3 PHÚT ĐỌC</span></div>
            <div className="message-bubbles" aria-hidden="true"><i></i><i></i><i></i></div>
            <h3>{managedShowcases[0]?.title ?? "Chia sẻ lại tin sai: “Em chỉ đăng lại” có miễn trách nhiệm?"}</h3>
            <div className="tag-row"><span>#facebook</span><span>#tinsai</span></div>
          </article>
          <article className="case-card mint">
            <div className="case-meta"><span>BẢN QUYỀN</span><span>4 PHÚT ĐỌC</span></div>
            <div className="paper-stack" aria-hidden="true"><i>A+</i><i>≠</i></div>
            <h3>{managedShowcases[1]?.title ?? "Sao chép bài luận: một điểm cao có đáng để đánh đổi?"}</h3>
            <div className="tag-row"><span>#daovan</span><span>#bailuan</span></div>
          </article>
        </div>
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
              <div><span>Căn cứ</span><strong>{selectedLaw.legal}</strong></div>
              <div><span>Mức phạt tham khảo</span><strong>{selectedLaw.penalty}</strong></div>
            </div>
            <div className="story-box"><span>TÌNH HUỐNG MINH HỌA</span><p>{selectedLaw.caseStudy}</p></div>
            <div className="tag-row">{selectedLaw.tags.map((tag) => <span key={tag}>#{tag}</span>)}</div>
            <p className="modal-note">Tình huống được biên soạn để giáo dục, không phải hồ sơ xử phạt có thật. Mức áp dụng thực tế phụ thuộc độ tuổi, chủ thể và tình tiết cụ thể.</p>
          </section>
        </div>
      )}

      {chatOpen && (
        <div className="chat-panel" role="dialog" aria-modal="true" aria-labelledby="chat-title">
          <div className="chat-head">
            <div><span>AI • ĐANG HOẠT ĐỘNG</span><h2 id="chat-title">Trợ lý Luật Học Đường</h2></div>
            <button onClick={() => setChatOpen(false)} aria-label="Đóng trợ lý">×</button>
          </div>
          <div className="chat-body" aria-live="polite">
            <div className="chat-messages">
              {chatMessages.map((message, index) => (
                <div key={`${message.role}-${index}`} className={`chat-message ${message.role}`}>
                  {message.content}
                </div>
              ))}
              {isChatLoading && <div className="chat-message assistant typing">Đang tìm hiểu<span>•••</span></div>}
            </div>
            {chatMessages.length === 1 && (
              <div className="chat-suggestions">
                {["Em 15 tuổi đi xe 50cc được không?", "Đăng lại tin sai có bị phạt không?", "Dùng ảnh trên mạng trong bài thuyết trình?"].map((question) => (
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
          <p>AI có thể nhầm lẫn. Nội dung chỉ để học tập, không thay thế tư vấn pháp lý.</p>
        </div>
      )}
    </main>
  );
}
