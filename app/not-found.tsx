// Trang 404 riêng: giữ nhận diện và mở sẵn các lối đi thường dùng thay vì
// để người đọc rơi vào ngõ cụt.
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeftIcon, ScalesIcon, SearchIcon } from "@/components/icons";
import { brandDisplayName, brandName, brandTagline } from "@/lib/brand";

export const metadata: Metadata = {
  title: `Không tìm thấy trang | ${brandName}`,
};

const shortcuts = [
  { href: "/#chu-de", label: "Chủ đề pháp luật" },
  { href: "/#tra-cuu", label: "Tra cứu tình huống" },
  { href: "/#tinh-huong", label: "Góc cảnh báo" },
  { href: "/#ren-luyen", label: "Thử thách" },
  { href: "/#nguon", label: "Nguồn chính thống" },
];

export default function NotFound() {
  return (
    <div className="detail-page">
      <header className="detail-head">
        <Link className="detail-brand" href="/">
          <span className="brand-mark">
            <ScalesIcon />
          </span>
          <span>
            <strong>{brandDisplayName}</strong>
            <small>{brandTagline}</small>
          </span>
        </Link>
        <Link className="detail-back" href="/">
          <ArrowLeftIcon /> Về trang tra cứu
        </Link>
      </header>

      <main>
        <article className="detail-card notfound-card">
          <span className="notfound-code" aria-hidden="true">
            <SearchIcon />
          </span>
          <p className="section-kicker">Lỗi 404</p>
          <h1>Không tìm thấy trang này</h1>
          <p>
            Đường dẫn có thể đã đổi, hoặc nội dung được gỡ sau khi văn bản pháp
            luật thay đổi. Chọn một mục bên dưới để tiếp tục tra cứu.
          </p>
          <div className="notfound-actions">
            <Link className="btn-primary" href="/#tra-cuu">
              <SearchIcon /> Tra cứu tình huống
            </Link>
            <Link className="btn-gold" href="/">
              Về trang chủ
            </Link>
          </div>
          <nav className="notfound-links" aria-label="Lối tắt tới các mục chính">
            {shortcuts.map((shortcut) => (
              <Link key={shortcut.href} href={shortcut.href}>
                {shortcut.label}
              </Link>
            ))}
          </nav>
        </article>
      </main>

      <footer className="detail-foot">
        <p>{brandTagline}</p>
      </footer>
    </div>
  );
}
