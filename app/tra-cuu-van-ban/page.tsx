import type { Metadata } from "next";
import Link from "next/link";
import { BookIcon } from "@/components/icons";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { LegalDocumentLookup } from "@/components/LegalDocumentLookup";
import { brandLocality, brandName } from "@/lib/brand";

export const metadata: Metadata = {
  title: `Kho văn bản tra cứu & học tập | ${brandName}`,
  description: `Xây dựng kho luật, nghị định, thông tư phục vụ học tập - nghiên cứu cho học sinh, sinh viên tại ${brandLocality}; tìm kiếm theo từ khóa, lĩnh vực, cơ quan ban hành dẫn link chính thống từ Chính phủ.`,
};

export default function TraCuuVanBanPage() {
  return (
    <div className="legal-lookup-page-wrapper min-h-screen flex flex-col justify-between">
      {/* Giữ nguyên header chuẩn của hệ thống kèm menu điều hướng */}
      <SiteHeader currentPath="/tra-cuu-van-ban" />

      {/* Nội dung trang chuyên đề đặt trong shell container chuẩn của website */}
      <main id="noi-dung" className="shell flex-1 py-8 space-y-6">
        {/* Đường dẫn điều hướng breadcrumb */}
        <nav className="text-xs text-[var(--ink-mute)] flex items-center gap-2" aria-label="Đường dẫn trang">
          <Link href="/" className="hover:text-[var(--brick)] transition-colors">
            Trang chủ
          </Link>
          <span aria-hidden="true">/</span>
          <span className="text-[var(--ink)] font-semibold" aria-current="page">
            Kho văn bản tra cứu &amp; học tập
          </span>
        </nav>

        {/* Tiêu đề & Giới thiệu chuyên đề */}
        <div className="legal-page-header">
          <div>
            <span className="legal-kicker-badge">
              <BookIcon />
              <span>Kho Văn Bản Quy Phạm Pháp Luật</span>
            </span>
          </div>
          <h1 className="legal-page-title">
            Kho văn bản tra cứu &amp; học tập
          </h1>
          <p className="legal-page-desc">
            Hệ thống tổng hợp và dẫn nguồn trực tiếp từ Cổng Thông tin điện tử Chính phủ (vanban.chinhphu.vn) và Cơ sở dữ liệu quốc gia về văn bản quy phạm pháp luật (vbpl.vn). Phục vụ nhu cầu tra cứu, học tập, nghiên cứu và trang bị kiến thức pháp luật cho học sinh, sinh viên.
          </p>
        </div>

        {/* Component tra cứu tương tác */}
        <LegalDocumentLookup showHeader={false} containerClassName="mt-2 mb-8" />
      </main>

      {/* Giữ nguyên footer chuẩn 4 cột của website */}
      <SiteFooter />
    </div>
  );
}
