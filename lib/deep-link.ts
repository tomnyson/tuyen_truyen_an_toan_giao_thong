// Liên kết chia sẻ trỏ thẳng tới nội dung (US-034): người nhận mở link là thấy
// ngay điều luật hoặc tình huống đó, không phải tự tìm lại trên trang chủ.
import type { EngagementEntityType } from "./engagement";

export type SharedEntity = Readonly<{
  type: EngagementEntityType;
  id: number;
}>;

// Tên tham số bằng tiếng Việt không dấu để link dễ đọc khi dán lên mạng xã hội.
const paramNames: Readonly<Record<EngagementEntityType, string>> = Object.freeze(
  {
    law: "dieu-luat",
    showcase: "tinh-huong",
  },
);

// Điều luật đứng trước để một query có cả hai vẫn cho kết quả xác định.
const lookupOrder: readonly EngagementEntityType[] = Object.freeze([
  "law",
  "showcase",
]);

function isContentId(value: number): boolean {
  return Number.isInteger(value) && value > 0;
}

export function sharedEntityQuery(entity: SharedEntity): string {
  return `?${paramNames[entity.type]}=${entity.id}`;
}

// Trang chi tiết có route server riêng nên trình thu thập của Facebook/Zalo đọc
// được thẻ Open Graph đúng nội dung — query `?dieu-luat=` vẫn được giữ để các
// liên kết đã chia sẻ trước đây không hỏng.
export function contentPath(entity: SharedEntity): string {
  return `/${paramNames[entity.type]}/${entity.id}`;
}

export function contentShareUrl(siteUrl: string, entity: SharedEntity): string {
  if (siteUrl.length === 0 || !isContentId(entity.id)) return "";
  let url: URL;
  try {
    // Đường dẫn tuyệt đối nên mọi query, hash hay path của người đang xem đều bị
    // bỏ: link chia sẻ không mang theo bộ lọc hay tham số quảng cáo.
    url = new URL(contentPath(entity), siteUrl);
  } catch {
    return "";
  }
  return url.toString();
}

export function readSharedEntity(search: string): SharedEntity | null {
  const params = new URLSearchParams(
    search.startsWith("?") ? search.slice(1) : search,
  );
  for (const type of lookupOrder) {
    const raw = params.get(paramNames[type]);
    if (raw === null) continue;
    const id = Number(raw);
    if (isContentId(id)) return Object.freeze({ type, id });
  }
  return null;
}
