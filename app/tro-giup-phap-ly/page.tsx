// Vỏ server cho mục trợ giúp pháp lý (US-039). Phần tĩnh render ở server để
// trình thu thập và người dùng thấy ngay đầu mối; phần hỏi đáp là client.

import type { Metadata } from "next";
import Link from "next/link";

import { ShieldAlertIcon, PhoneIcon, CheckCircleIcon, ChatIcon } from "@/components/icons";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { LegalAidConsult } from "@/components/LegalAidConsult";
import { HelpHotlines } from "@/components/HelpHotlines";
import { brandLocality, brandName } from "@/lib/brand";

export const metadata: Metadata = {
  title: `Trợ giúp pháp lý & Chỉ dẫn gửi đơn | ${brandName}`,
  description: `Mô tả tình huống để biết nên gửi đơn, trình báo hoặc nhờ hỗ trợ ở đâu tại ${brandLocality}; chỉ dẫn cơ quan có thẩm quyền và đường dây nóng hỗ trợ HSSV.`,
};

export default function LegalAidPage() {
  return (
    <div className="legal-lookup-page-wrapper min-h-screen flex flex-col justify-between">
      {/* Giữ nguyên header chuẩn của hệ thống kèm menu điều hướng */}
      <SiteHeader currentPath="/tro-giup-phap-ly" />

      {/* Nội dung trang chuyên đề đặt trong shell container chuẩn của website */}
      <main id="noi-dung" className="shell flex-1 py-8 space-y-8">
        {/* Đường dẫn điều hướng breadcrumb */}
        <nav className="text-xs text-[var(--ink-mute)] flex items-center gap-2" aria-label="Đường dẫn trang">
          <Link href="/" className="hover:text-[var(--brick)] transition-colors">
            Trang chủ
          </Link>
          <span aria-hidden="true">/</span>
          <span className="text-[var(--ink)] font-semibold" aria-current="page">
            Trợ giúp pháp lý
          </span>
        </nav>

        {/* Tiêu đề & Giới thiệu chuyên đề */}
        <div className="legal-page-header">
          <div>
            <span className="legal-kicker-badge">
              <ShieldAlertIcon />
              <span>Chỉ Dẫn Thẩm Quyền &amp; Đầu Mối Tiếp Nhận</span>
            </span>
          </div>
          <h1 className="legal-page-title">
            Trợ giúp pháp lý &amp; Chỉ dẫn nơi gửi đơn
          </h1>
          <p className="legal-page-desc">
            Mô tả tình huống bạn hoặc bạn bè đang gặp phải. Cổng thông tin sẽ chỉ ra cơ quan, tổ chức có thẩm quyền tiếp nhận theo thứ tự từ gần đến xa (nhà trường, công an xã/phường, trung tâm trợ giúp pháp lý). Dữ liệu do bộ phận nghiệp vụ kiểm duyệt chính thức, bảo đảm an toàn và bảo mật thông tin.
          </p>
        </div>

        {/* Banner điều hướng: Soạn đơn tố giác tội phạm bằng AI */}
        <div className="p-5 rounded-2xl bg-gradient-to-r from-sky-900 to-indigo-900 text-white shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-400 text-slate-950 uppercase tracking-wider">
                Mới • AI Hỗ trợ
              </span>
              <span className="text-xs text-sky-200">Bảo mật 100% tại Client (Quét CCCD)</span>
            </div>
            <h2 className="text-base sm:text-lg font-bold">
              Soạn thảo Đơn tố giác tội phạm trực tuyến
            </h2>
            <p className="text-xs text-sky-100 max-w-2xl leading-relaxed">
              Trợ lý AI phỏng vấn nhẹ nhàng, quét thẻ CCCD tự động điền thông tin và xuất file Word (.docx) chuẩn mẫu gửi cơ quan Công an.
            </p>
          </div>
          <Link
            href="/tro-giup-phap-ly/soan-don"
            className="px-5 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold rounded-xl shadow-sm transition-all whitespace-nowrap flex items-center gap-2 shrink-0"
          >
            <span>Bắt đầu soạn đơn ngay</span>
            <span>→</span>
          </Link>
        </div>

        {/* Khối tương tác chính: Hỏi đáp & Gợi ý thẩm quyền */}
        <div className="legal-container-card">
          <LegalAidConsult />
        </div>

        {/* Khối quy trình 3 bước chỉ dẫn HSSV */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-[var(--paper)] border border-[var(--line-card)] shadow-xs flex flex-col justify-between">
            <div>
              <div className="w-8 h-8 rounded-full bg-[var(--gold-soft)] text-[var(--brick-deep)] font-extrabold flex items-center justify-center text-sm mb-3 border border-amber-300">
                1
              </div>
              <h3 className="font-bold text-sm text-[var(--ink)] mb-1.5">
                Giữ bình tĩnh &amp; Bảo lưu chứng cứ
              </h3>
              <p className="text-xs text-[var(--ink-soft)] leading-relaxed">
                Chụp ảnh màn hình tin nhắn đe dọa, ghi âm cuộc gọi, lưu vết bôi nhọ trên mạng xã hội, giữ lại đồ vật hoặc ghi nhớ nhân chứng có mặt.
              </p>
            </div>
            <span className="text-[11px] font-semibold text-[var(--brick-deep)] mt-4 pt-2 border-t border-[var(--line-card)]">
              Không tự ý xóa bằng chứng
            </span>
          </div>

          <div className="p-5 rounded-2xl bg-[var(--paper)] border border-[var(--line-card)] shadow-xs flex flex-col justify-between">
            <div>
              <div className="w-8 h-8 rounded-full bg-[var(--gold-soft)] text-[var(--brick-deep)] font-extrabold flex items-center justify-center text-sm mb-3 border border-amber-300">
                2
              </div>
              <h3 className="font-bold text-sm text-[var(--ink)] mb-1.5">
                Báo ngay đầu mối sở tại gần nhất
              </h3>
              <p className="text-xs text-[var(--ink-soft)] leading-relaxed">
                Liên hệ thầy cô chủ nhiệm, phòng tư vấn tâm lý học đường, ban giám hiệu nhà trường hoặc công an xã/phường nơi cư trú để can thiệp kịp thời.
              </p>
            </div>
            <span className="text-[11px] font-semibold text-[var(--brick-deep)] mt-4 pt-2 border-t border-[var(--line-card)]">
              Ưu tiên an toàn thể chất &amp; tâm lý
            </span>
          </div>

          <div className="p-5 rounded-2xl bg-[var(--paper)] border border-[var(--line-card)] shadow-xs flex flex-col justify-between">
            <div>
              <div className="w-8 h-8 rounded-full bg-[var(--gold-soft)] text-[var(--brick-deep)] font-extrabold flex items-center justify-center text-sm mb-3 border border-amber-300">
                3
              </div>
              <h3 className="font-bold text-sm text-[var(--ink)] mb-1.5">
                Đề nghị trợ giúp pháp lý Nhà nước
              </h3>
              <p className="text-xs text-[var(--ink-soft)] leading-relaxed">
                Khi vụ việc phức tạp, quyền lợi bị xâm hại nghiêm trọng hoặc cần luật sư bảo vệ, học sinh thuộc diện chính sách được trợ giúp pháp lý 100% miễn phí.
              </p>
            </div>
            <span className="text-[11px] font-semibold text-[var(--brick-deep)] mt-4 pt-2 border-t border-[var(--line-card)]">
              Miễn phí theo Luật Trợ giúp pháp lý
            </span>
          </div>
        </div>

        {/* Băng đường dây nóng khẩn cấp 24/7 đồng bộ với trang chủ */}
        <section className="help-cta !mt-2 !max-w-none shadow-md" aria-labelledby="help-title">
          <div className="help-grid">
            <div className="help-copy">
              <p className="help-kicker">Cần giúp ngay?</p>
              <h2 id="help-title">Khi tình huống vượt quá sức mình, hãy gọi.</h2>
              <p>
                Ba đầu mối dưới đây tiếp nhận miễn phí, hoạt động 24/7 cả ngoài giờ
                hành chính và bảo mật tuyệt đối thông tin người trình báo.
              </p>
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link
                  href="/"
                  className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-xs font-bold text-[#fff8ec] border border-white/20 transition-colors"
                >
                  ← Về trang chủ
                </Link>
                <Link href="/?chat=true" className="btn-gold !text-xs !py-2 !px-4 flex items-center gap-1.5">
                  <ChatIcon /> Hỏi trợ lý AI
                </Link>
              </div>
            </div>
            <HelpHotlines />
          </div>
        </section>
      </main>

      {/* Giữ nguyên footer chuẩn 4 cột của website */}
      <SiteFooter />
    </div>
  );
}
