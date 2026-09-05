// Đếm lượt xem (US-033) và đánh dấu "Nội dung này ý nghĩa" + chia sẻ (US-034).
//
// Nguyên tắc riêng tư: server KHÔNG lưu IP, user-agent hay bất kỳ định danh cá
// nhân nào. Trình duyệt tự sinh một token ngẫu nhiên vô nghĩa (`clientId`) lưu
// trong localStorage; server chỉ lưu SHA-256 của token đó ghép với nội dung và
// mốc thời gian, đủ để chống đếm trùng nhưng không truy ngược ra người dùng.

export const engagementEntityTypes = ["law", "showcase"] as const;

export type EngagementEntityType = (typeof engagementEntityTypes)[number];

export type EngagementAction = "view" | "favorite" | "unfavorite";

export type EngagementCount = Readonly<{
  entityType: EngagementEntityType;
  entityId: number;
  viewCount: number;
  favoriteCount: number;
}>;

export type EngagementRequest = Readonly<{
  entityType: EngagementEntityType;
  entityId: number;
  action: EngagementAction;
  clientId: string;
}>;

const engagementActions = new Set<string>(["view", "favorite", "unfavorite"]);

const clientIdPattern = /^[0-9a-f]{32}$/;
const dayMs = 24 * 60 * 60 * 1000;

export function isEngagementEntityType(
  value: unknown,
): value is EngagementEntityType {
  return (
    typeof value === "string" &&
    (engagementEntityTypes as readonly string[]).includes(value)
  );
}

export function isEngagementClientId(value: unknown): value is string {
  return typeof value === "string" && clientIdPattern.test(value);
}

export function createEngagementClientId(
  randomBytes: (size: number) => Uint8Array,
): string {
  return Array.from(randomBytes(16), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

function isEngagementEntityId(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) > 0;
}

export function parseEngagementRequest(
  value: unknown,
): EngagementRequest | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }
  const body = value as Record<string, unknown>;
  if (
    !isEngagementEntityType(body.entityType) ||
    !isEngagementEntityId(body.entityId) ||
    !isEngagementClientId(body.clientId) ||
    typeof body.action !== "string" ||
    !engagementActions.has(body.action)
  ) {
    return null;
  }
  return Object.freeze({
    entityType: body.entityType,
    entityId: body.entityId,
    action: body.action as EngagementAction,
    clientId: body.clientId,
  });
}

export function engagementDayBucket(nowMs: number): number {
  return Math.floor(nowMs / dayMs);
}

// Chuỗi nguồn của khóa chống trùng. Lượt yêu thích không gắn mốc ngày vì trạng
// thái bật/tắt phải bền theo trình duyệt; lượt xem gắn mốc ngày để hôm sau mở
// lại vẫn được tính thêm một lượt.
export function engagementMarkInput(
  request: EngagementRequest,
  dayBucket: number,
): string {
  const isView = request.action === "view";
  return [
    "engagement-v1",
    request.entityType,
    String(request.entityId),
    isView ? "view" : "favorite",
    isView ? String(dayBucket) : "permanent",
    request.clientId,
  ].join(" ");
}

export async function engagementMarkKey(input: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(input),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

function boundedCount(value: unknown): number {
  const count = Number(value);
  return Number.isSafeInteger(count) && count >= 0 ? count : 0;
}

export function projectEngagementCounts(
  rows: readonly unknown[],
): EngagementCount[] {
  const seen = new Set<string>();
  const result: EngagementCount[] = [];
  for (const row of rows) {
    if (typeof row !== "object" || row === null) continue;
    const record = row as Record<string, unknown>;
    if (
      !isEngagementEntityType(record.entityType) ||
      !isEngagementEntityId(record.entityId)
    ) {
      continue;
    }
    const key = engagementCountKey(record.entityType, record.entityId);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(
      Object.freeze({
        entityType: record.entityType,
        entityId: record.entityId,
        viewCount: boundedCount(record.viewCount),
        favoriteCount: boundedCount(record.favoriteCount),
      }),
    );
  }
  return result;
}

// Guard phía client: chỉ nhận đúng DTO server phát ra, không nhận field thừa.
export function parseEngagementCounts(
  value: unknown,
): EngagementCount[] | null {
  if (!Array.isArray(value)) return null;
  const allowed = ["entityType", "entityId", "viewCount", "favoriteCount"];
  for (const item of value) {
    if (typeof item !== "object" || item === null || Array.isArray(item)) {
      return null;
    }
    const keys = Object.keys(item);
    if (keys.length !== 4 || !keys.every((key) => allowed.includes(key))) {
      return null;
    }
  }
  const projected = projectEngagementCounts(value);
  return projected.length === value.length ? projected : null;
}

export function engagementCountKey(
  entityType: EngagementEntityType,
  entityId: number,
): string {
  return `${entityType}:${entityId}`;
}

export function toEngagementCountMap(
  counts: readonly EngagementCount[],
): ReadonlyMap<string, EngagementCount> {
  return new Map(
    counts.map((count) => [
      engagementCountKey(count.entityType, count.entityId),
      count,
    ]),
  );
}

// Cập nhật bất biến: trả về map mới thay vì sửa map đang có.
export function withEngagementCount(
  counts: ReadonlyMap<string, EngagementCount>,
  next: EngagementCount,
): ReadonlyMap<string, EngagementCount> {
  const merged = new Map(counts);
  merged.set(engagementCountKey(next.entityType, next.entityId), next);
  return merged;
}

// Hiển thị gọn cho UI: 1.2K thay vì 1234 để không phá vỡ layout thẻ.
export function formatEngagementCount(value: number): string {
  const count = boundedCount(value);
  if (count < 1_000) return String(count);
  if (count < 1_000_000) {
    const scaled = Math.floor(count / 100) / 10;
    return `${scaled.toFixed(scaled % 1 === 0 ? 0 : 1)}K`;
  }
  const scaled = Math.floor(count / 100_000) / 10;
  return `${scaled.toFixed(scaled % 1 === 0 ? 0 : 1)}M`;
}
