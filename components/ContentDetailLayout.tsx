// Khung trang chi tiết cho liên kết chia sẻ (US-034): người tới từ Facebook,
// Zalo… thấy ngay nội dung, kèm lối quay lại trang tra cứu đầy đủ.
import Link from "next/link";
import type { ReactNode } from "react";
import { brandDisplayName, brandTagline } from "@/lib/brand";
import { ArrowLeftIcon, ScalesIcon } from "./icons";

export type ContentDetailLayoutProps = Readonly<{
  kicker: string;
  topic: string;
  children: ReactNode;
}>;

export function ContentDetailLayout({
  kicker,
  topic,
  children,
}: ContentDetailLayoutProps) {
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
        <article className="detail-card">
          <p className="detail-kicker">
            <span className="section-kicker">{kicker}</span>
            <span className="modal-topic">{topic}</span>
          </p>
          {children}
        </article>
      </main>
      <footer className="detail-foot">
        <p>Hiểu luật dễ dàng • Ứng xử an toàn</p>
      </footer>
    </div>
  );
}
