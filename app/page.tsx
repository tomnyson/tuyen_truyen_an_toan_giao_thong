"use client";

import { useMemo, useState } from "react";

type Topic = "Tất cả" | "Giao thông" | "Mạng xã hội" | "Sở hữu trí tuệ";

type LawItem = {
  id: number;
  topic: Exclude<Topic, "Tất cả">;
  icon: string;
  title: string;
  legal: string;
  penalty: string;
  remedy: string;
  caseStudy: string;
  tags: string[];
};

const topics: { name: Topic; icon: string; detail: string }[] = [
  { name: "Tất cả", icon: "⌕", detail: "Mọi chủ đề" },
  { name: "Giao thông", icon: "◉", detail: "Xe điện & xe máy" },
  { name: "Mạng xã hội", icon: "@", detail: "Ứng xử trên mạng" },
  { name: "Sở hữu trí tuệ", icon: "©", detail: "Bản quyền & đạo văn" },
];

const laws: LawItem[] = [
  {
    id: 1,
    topic: "Giao thông",
    icon: "◉",
    title: "Không đội mũ bảo hiểm khi đi xe máy, xe máy điện",
    legal: "Điểm h khoản 2 Điều 7 Nghị định 168/2024/NĐ-CP",
    penalty: "400.000 – 600.000đ",
    remedy: "Chấp hành quyết định xử phạt; trang bị và cài quai mũ đúng quy cách.",
    caseStudy:
      "Minh, 16 tuổi, đi xe máy điện tới trường nhưng để mũ trong cốp. Khi được kiểm tra, Minh mới hiểu việc có mũ mà không đội vẫn là vi phạm.",
    tags: ["xemaydien", "mu-baohiem", "antoan"],
  },
  {
    id: 2,
    topic: "Giao thông",
    icon: "⚑",
    title: "Chưa đủ tuổi điều khiển xe từ 50 cm³ trở lên",
    legal: "Điều 18 Nghị định 168/2024/NĐ-CP",
    penalty: "Cảnh cáo hoặc xử phạt theo độ tuổi và loại xe",
    remedy: "Dừng điều khiển phương tiện không phù hợp; phụ huynh không giao xe.",
    caseStudy:
      "Lan 15 tuổi mượn xe 110 cm³ của anh để đi học thêm. Cả người điều khiển và người giao xe đều có thể phát sinh trách nhiệm.",
    tags: ["duoi18", "xemay", "phuhuynh"],
  },
  {
    id: 3,
    topic: "Mạng xã hội",
    icon: "@",
    title: "Đăng thông tin sai sự thật, xúc phạm người khác",
    legal: "Điểm a khoản 1 Điều 101 Nghị định 15/2020/NĐ-CP",
    penalty: "5 – 10 triệu đồng đối với cá nhân*",
    remedy: "Buộc gỡ bỏ thông tin sai sự thật hoặc gây nhầm lẫn.",
    caseStudy:
      "Sau khi bất mãn vì điểm số, một học sinh đăng bài quy kết giáo viên gian lận nhưng không có bằng chứng. Bài đăng bị yêu cầu gỡ và học sinh phải xin lỗi.",
    tags: ["facebook", "tinsai", "dan-du"],
  },
  {
    id: 4,
    topic: "Mạng xã hội",
    icon: "□",
    title: "Phát tán hình ảnh riêng tư của bạn học",
    legal: "Điểm e khoản 3 Điều 102 Nghị định 15/2020/NĐ-CP",
    penalty: "Có thể bị xử phạt hành chính và áp dụng biện pháp khác",
    remedy: "Gỡ nội dung, ngừng chia sẻ và khắc phục hậu quả cho người bị ảnh hưởng.",
    caseStudy:
      "Một ảnh chụp riêng tư bị chuyển tiếp trong nhóm lớp. Dù không phải người chụp, người tiếp tục phát tán vẫn có thể phải chịu trách nhiệm.",
    tags: ["quyenriengtu", "zalo", "baolucmang"],
  },
  {
    id: 5,
    topic: "Sở hữu trí tuệ",
    icon: "©",
    title: "Sao chép tác phẩm trái phép, đạo văn",
    legal: "Khoản 1 Điều 18 Nghị định 131/2013/NĐ-CP",
    penalty: "15 – 35 triệu đồng",
    remedy: "Buộc dỡ bỏ bản sao vi phạm hoặc tiêu hủy tang vật theo quy định.",
    caseStudy:
      "Bài dự thi khoa học sao chép phần lớn nội dung từ một nghiên cứu trên mạng. Nhóm bị hủy kết quả và phải thực hiện lại quy trình trích dẫn.",
    tags: ["daovan", "banquyen", "bailuan"],
  },
  {
    id: 6,
    topic: "Sở hữu trí tuệ",
    icon: "⌘",
    title: "Cố ý vô hiệu biện pháp bảo vệ phần mềm",
    legal: "Điều 35 Nghị định 131/2013/NĐ-CP",
    penalty: "Có thể bị phạt tiền tùy hành vi và chủ thể",
    remedy: "Gỡ bỏ bản sao vi phạm; chấm dứt công cụ hoặc biện pháp xâm phạm.",
    caseStudy:
      "Một máy tính phòng thực hành cài phần mềm crack rồi nhiễm mã độc. Ngoài rủi ro bản quyền, toàn bộ dữ liệu học tập có thể bị khóa hoặc đánh cắp.",
    tags: ["phanmem", "crack", "malware"],
  },
];

const sources = [
  {
    label: "Nghị định 168/2024/NĐ-CP",
    href: "https://xaydungchinhsach.chinhphu.vn/toan-van-nghi-dinh-168-2024-nd-cp-quy-dinh-xu-phat-vi-pham-hanh-chinh-ve-trat-tu-atgt-duong-bo-119241231164556785.htm",
  },
  {
    label: "Luật Xử lý vi phạm hành chính",
    href: "https://vbpl.moj.gov.vn/FileData/TW/Lists/vbpq/Attachments/147301/tvHienThiToanVan_31.VBHN.VPQH.1.pdf",
  },
  {
    label: "Nghị định 131/2013/NĐ-CP",
    href: "https://vbpl.vn/FileData/TW/Lists/vbpq/Attachments/32506/VanBanGoc_131_2013_N%C4%90-CP.pdf",
  },
];

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .toLowerCase();
}

export default function Home() {
  const [topic, setTopic] = useState<Topic>("Tất cả");
  const [query, setQuery] = useState("");
  const [activeItem, setActiveItem] = useState<LawItem | null>(null);
  const [chatOpen, setChatOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    return laws.filter((item) => {
      const matchesTopic = topic === "Tất cả" || item.topic === topic;
      const haystack = normalize(
        [item.title, item.legal, item.topic, item.tags.join(" ")].join(" "),
      );
      return matchesTopic && (!q || haystack.includes(q));
    });
  }, [query, topic]);

  function scrollToResults() {
    document.getElementById("tra-cuu")?.scrollIntoView({ behavior: "smooth" });
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
          <p>{filtered.length} kết quả phù hợp</p>
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

        {filtered.length ? (
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
                {filtered.map((item) => (
                  <tr key={item.id}>
                    <td><span className="row-icon">{item.icon}</span><strong>{item.title}</strong></td>
                    <td>{item.legal}</td>
                    <td><span className="penalty">{item.penalty}</span></td>
                    <td>{item.remedy}</td>
                    <td><button className="detail-button" onClick={() => setActiveItem(item)} aria-label={`Xem tình huống: ${item.title}`}>→</button></td>
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
          <button onClick={() => setActiveItem(laws[2])}>Xem tình huống mạng xã hội <span>→</span></button>
        </div>
        <div className="case-cards">
          <article className="case-card yellow">
            <div className="case-meta"><span>MẠNG XÃ HỘI</span><span>3 PHÚT ĐỌC</span></div>
            <div className="message-bubbles" aria-hidden="true"><i></i><i></i><i></i></div>
            <h3>Chia sẻ lại tin sai: “Em chỉ đăng lại” có miễn trách nhiệm?</h3>
            <div className="tag-row"><span>#facebook</span><span>#tinsai</span></div>
          </article>
          <article className="case-card mint">
            <div className="case-meta"><span>BẢN QUYỀN</span><span>4 PHÚT ĐỌC</span></div>
            <div className="paper-stack" aria-hidden="true"><i>A+</i><i>≠</i></div>
            <h3>Sao chép bài luận: một điểm cao có đáng để đánh đổi?</h3>
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

      {activeItem && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setActiveItem(null)}>
          <section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" onMouseDown={(event) => event.stopPropagation()}>
            <button className="modal-close" onClick={() => setActiveItem(null)} aria-label="Đóng">×</button>
            <span className="modal-topic">{activeItem.topic}</span>
            <h2 id="modal-title">{activeItem.title}</h2>
            <div className="modal-facts">
              <div><span>Căn cứ</span><strong>{activeItem.legal}</strong></div>
              <div><span>Mức phạt tham khảo</span><strong>{activeItem.penalty}</strong></div>
            </div>
            <div className="story-box"><span>TÌNH HUỐNG MINH HỌA</span><p>{activeItem.caseStudy}</p></div>
            <div className="tag-row">{activeItem.tags.map((tag) => <span key={tag}>#{tag}</span>)}</div>
            <p className="modal-note">Tình huống được biên soạn để giáo dục, không phải hồ sơ xử phạt có thật. Mức áp dụng thực tế phụ thuộc độ tuổi, chủ thể và tình tiết cụ thể.</p>
          </section>
        </div>
      )}

      {chatOpen && (
        <div className="chat-panel" role="dialog" aria-modal="true" aria-labelledby="chat-title">
          <div className="chat-head">
            <div><span>THỬ NGHIỆM</span><h2 id="chat-title">Trợ lý Luật Học Đường</h2></div>
            <button onClick={() => setChatOpen(false)} aria-label="Đóng trợ lý">×</button>
          </div>
          <div className="chat-body">
            <div className="bot-message">Chào bạn! Hãy chọn một câu hỏi mẫu để bắt đầu tra cứu.</div>
            {["Em 15 tuổi đi xe 50cc được không?", "Đăng lại tin sai có bị phạt không?", "Dùng ảnh trên mạng trong bài thuyết trình?"] .map((question) => (
              <button key={question} onClick={() => { setQuery(question.includes("tin sai") ? "tin sai" : question.includes("ảnh") ? "bản quyền" : "dưới 18"); setChatOpen(false); scrollToResults(); }}>{question}</button>
            ))}
          </div>
          <p>Trợ lý chỉ hỗ trợ tìm nội dung, không đưa ra tư vấn pháp lý cá nhân.</p>
        </div>
      )}
    </main>
  );
}
