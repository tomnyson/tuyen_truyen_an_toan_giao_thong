import Link from "next/link";
import {
  ScalesIcon,
  ArrowUpRightIcon,
  PhoneIcon,
  MailIcon,
} from "@/components/icons";
import { brandLocality, brandName, brandShortName } from "@/lib/brand";

const DEFAULT_TOPICS = [
  "Giao thông",
  "Mạng xã hội",
  "Bạo lực học đường",
  "An ninh trật tự",
  "Sở hữu trí tuệ",
];

export function SiteFooter() {
  return (
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
              <a
                href="https://tongdai111.vn/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Tổng đài 111"
              >
                <PhoneIcon />
              </a>
              <a
                href="mailto:hotro@tuyentruyenphapluat.edu.vn"
                aria-label="Gửi thư góp ý"
              >
                <MailIcon />
              </a>
            </div>
          </div>

          <div className="footer-col">
            <h3>Chủ đề</h3>
            <ul>
              {DEFAULT_TOPICS.map((topic) => (
                <li key={topic}>
                  <Link href="/#chu-de">{topic}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="footer-col">
            <h3>Khám phá</h3>
            <ul>
              <li>
                <Link href="/#tra-cuu">Tra cứu tình huống</Link>
              </li>
              <li>
                <Link href="/#tinh-huong">Góc cảnh báo</Link>
              </li>
              <li>
                <Link href="/#ren-luyen">Thử thách kiến thức</Link>
              </li>
              <li>
                <Link href="/tra-cuu-van-ban">Kho văn bản pháp luật</Link>
              </li>
              <li>
                <Link href="/tro-giup-phap-ly">Trợ giúp pháp lý</Link>
              </li>
              <li>
                <Link href="/#nguon">Nguồn luật gốc</Link>
              </li>
            </ul>
          </div>

          <div className="footer-col">
            <h3>Đường dây nóng</h3>
            <ul>
              <li>
                <a href="tel:111">111 · Bảo vệ trẻ em</a>
              </li>
              <li>
                <a href="tel:113">113 · Cảnh sát phản ứng nhanh</a>
              </li>
              <li>
                <a href="tel:156">156 · Báo lừa đảo trên mạng</a>
              </li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <p>Cập nhật nội dung: năm 2026 · {brandName}</p>
          <nav aria-label="Thông tin pháp lý">
            <Link href="/dieu-khoan">Điều khoản sử dụng</Link>
            <Link href="/dieu-khoan#rieng-tu">Quyền riêng tư</Link>
            <Link href="/#nguon">Nguồn dữ liệu</Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
