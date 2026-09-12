// Khối "Gửi đến đâu" (US-039, DEC-022). Chỉ hiển thị dữ liệu đã duyệt được
// truyền vào; component này không gọi mô hình và không tự suy ra cơ quan nào.
// Không có "use client" và không dùng hook/API trình duyệt: được dựng cả từ
// trang server (app/tro-giup-phap-ly) lẫn từ HelpHotlines/LegalAidConsult ở
// phía client.

import type { ReferralStep } from "@/lib/authority-referral";

type ReferralChainProps = Readonly<{
  steps: readonly ReferralStep[];
  degraded: boolean;
}>;

// Chỉ dựng liên kết gọi khi huy hiệu thực sự là số máy.
function telHref(badge: string): string | null {
  const digits = badge.replace(/[\s.-]/g, "");
  return /^\+?\d{3,15}$/.test(digits) ? `tel:${digits}` : null;
}

export function ReferralChain({ steps, degraded }: ReferralChainProps) {
  if (steps.length === 0) return null;
  return (
    <section className="referral-chain" aria-labelledby="referral-title">
      <h3 id="referral-title">Gửi đến đâu</h3>
      <p className="referral-lead">
        Đi từ nơi gần nhất; nếu chưa được giải quyết thì chuyển lên cấp sau.
      </p>
      <ol>
        {steps.map((step) => {
          const href = telHref(step.badge);
          return (
            <li key={step.authority.id}>
              <span className="referral-order" aria-hidden="true">
                {step.order}
              </span>
              <div className="referral-body">
                <p className="referral-level">{step.levelLabel}</p>
                <strong>{step.authority.name}</strong>
                {step.authority.scope ? (
                  <small>{step.authority.scope}</small>
                ) : null}
                {step.authority.address ? (
                  <small>{step.authority.address}</small>
                ) : null}
                {step.authority.note ? (
                  <small>{step.authority.note}</small>
                ) : null}
              </div>
              {href ? (
                <a className="referral-badge" href={href}>
                  {step.badge}
                </a>
              ) : (
                <span className="referral-badge">{step.badge}</span>
              )}
            </li>
          );
        })}
      </ol>
      {degraded ? (
        <p className="referral-degraded" role="note">
          Đây là danh sách dự phòng. Đầu mối tại địa phương bạn chưa được duyệt
          nên chưa hiển thị đầy đủ.
        </p>
      ) : null}
    </section>
  );
}
