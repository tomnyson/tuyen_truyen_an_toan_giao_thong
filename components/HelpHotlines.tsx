"use client";

// Băng đường dây nóng ở trang chủ (US-039). Trước đây ba đầu mối bị hardcode
// trong app/page.tsx; giờ lấy từ /api/co-quan để bộ phận nghiệp vụ cập nhật
// được mà không phải sửa mã. Dữ liệu dự phòng hiển thị ngay từ lần vẽ đầu nên
// băng này không bao giờ trống. Hiển thị nguyên cả chuỗi trả về (không lọc
// theo cấp) để không mất đầu mối 113 ở cấp xã/phường đang có hôm nay.

import { useEffect, useState } from "react";

import {
  buildReferralChain,
  fallbackReferralAuthorities,
  type ReferralStep,
} from "@/lib/authority-referral";
import { PhoneIcon } from "@/components/icons";

const fallbackSteps = buildReferralChain(fallbackReferralAuthorities, null);

export function HelpHotlines() {
  const [steps, setSteps] = useState<readonly ReferralStep[]>(fallbackSteps);

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const response = await fetch("/api/co-quan", {
          signal: controller.signal,
        });
        if (!response.ok) return;
        const payload = (await response.json()) as {
          chain?: readonly ReferralStep[];
        };
        if (Array.isArray(payload.chain) && payload.chain.length > 0) {
          setSteps(payload.chain);
        }
      } catch {
        // Giữ nguyên danh sách dự phòng — băng trợ giúp không được trống.
      }
    })();
    return () => controller.abort();
  }, []);

  return (
    <ul className="hotline-list">
      {steps.map((step) => (
        <li className="hotline-card" key={step.authority.id}>
          <i aria-hidden="true">{step.badge}</i>
          <div>
            <strong>{step.authority.name}</strong>
            <small>{step.authority.note || step.levelLabel}</small>
          </div>
          <PhoneIcon aria-hidden="true" />
        </li>
      ))}
    </ul>
  );
}
