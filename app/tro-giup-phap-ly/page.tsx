// Vỏ server cho mục trợ giúp pháp lý (US-039). Phần tĩnh render ở server để
// trình thu thập và người dùng thấy ngay đầu mối; phần hỏi đáp là client.

import type { Metadata } from "next";
import Link from "next/link";

import { LegalAidConsult } from "@/components/LegalAidConsult";
import { brandLocality, brandName } from "@/lib/brand";

export const metadata: Metadata = {
  title: `Trợ giúp pháp lý | ${brandName}`,
  description: `Mô tả tình huống để biết nên gửi đơn, trình báo hoặc nhờ hỗ trợ ở đâu tại ${brandLocality}.`,
};

export default function LegalAidPage() {
  return (
    <main className="shell legal-aid-page">
      <p className="legal-aid-kicker">Trợ giúp pháp lý</p>
      <h1>Không biết gửi đơn ở đâu? Bắt đầu từ đây.</h1>
      <p className="legal-aid-lead">
        Mô tả tình huống của bạn, cổng sẽ chỉ ra cơ quan có thẩm quyền tiếp
        nhận theo thứ tự từ gần đến xa. Thông tin cơ quan do bộ phận nghiệp vụ
        nhập và duyệt, không do trợ lý tự sinh ra.
      </p>

      <LegalAidConsult />

      <p className="legal-aid-back">
        <Link href="/">← Về trang chủ</Link>
      </p>
    </main>
  );
}
