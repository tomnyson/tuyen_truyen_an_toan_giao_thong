// Thẻ Open Graph cho từng nội dung (US-034). Trình thu thập của Facebook, Zalo
// hay Telegram không chạy JavaScript, nên tiêu đề/mô tả phải được dựng sẵn ở
// server. Tách khỏi route để kiểm thử được phần thuần logic.
import { brandDescription, brandName } from "./brand";

const maxDescriptionLength = 200;

export function contentMetaTitle(title: string): string {
  const trimmed = title.trim();
  return trimmed.length > 0 ? `${trimmed} | ${brandName}` : brandName;
}

export function contentMetaDescription(parts: readonly string[]): string {
  const joined = parts
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .join(" · ");
  if (joined.length === 0) return brandDescription;
  if (joined.length <= maxDescriptionLength) return joined;
  return `${joined.slice(0, maxDescriptionLength - 1).trimEnd()}…`;
}

// Ảnh chia sẻ nằm cùng host đang phục vụ request, giống cách `app/layout.tsx`
// dựng metadata cho trang chủ.
export function socialImageUrl(host: string, protocol: string | null): string {
  const scheme =
    protocol ?? (host.startsWith("localhost") ? "http" : "https");
  return `${scheme}://${host}/og.png`;
}

export function parseContentRouteId(value: string | undefined): number | null {
  if (value === undefined || !/^[0-9]+$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}
