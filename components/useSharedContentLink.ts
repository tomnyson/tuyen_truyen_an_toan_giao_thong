"use client";

// Cầu nối giữa liên kết chia sẻ (lib/deep-link) và các hộp thoại nội dung:
// mở link là thấy ngay nội dung, và nội dung đang mở luôn hiện trên thanh địa
// chỉ để tải lại hay sao chép URL vẫn đúng chỗ.
import { useEffect, useRef, useState } from "react";
import {
  readSharedEntity,
  sharedEntityQuery,
  type SharedEntity,
} from "@/lib/deep-link";
import type { EngagementEntityType } from "@/lib/engagement";

// Query của trang được đọc đúng một lần ở lần render đầu trên trình duyệt và
// giữ nguyên sau đó: nội dung thường tải xong muộn hơn, còn hộp thoại thì ghi
// đè thanh địa chỉ ngay khi mở.
export function useSharedContentId(type: EngagementEntityType): number | null {
  const [shared] = useState<SharedEntity | null>(() =>
    typeof window === "undefined"
      ? null
      : readSharedEntity(window.location.search),
  );
  return shared?.type === type ? shared.id : null;
}

export function useSharedContentUrl(
  type: EngagementEntityType,
  openId: number | null,
): void {
  const hasOpenedRef = useRef(false);

  useEffect(() => {
    if (openId !== null) hasOpenedRef.current = true;
    // Khi người dùng chưa mở nội dung nào thì không đụng vào thanh địa chỉ:
    // tham số của liên kết chia sẻ vừa mở phải còn nguyên cho tới lúc đọc.
    if (!hasOpenedRef.current) return;
    const query = openId === null ? "" : sharedEntityQuery({ type, id: openId });
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${query}`,
    );
  }, [openId, type]);
}
