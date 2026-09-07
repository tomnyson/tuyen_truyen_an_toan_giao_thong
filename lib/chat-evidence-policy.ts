// Chính sách tươi mới cho evidence được đưa vào bộ soạn có kiểm chứng của chat.
//
// Cố ý không dùng lại `FreshnessPolicy` của `legal-evidence-retriever.ts`:
// policy đó là dữ liệu được inject và hiện chỉ tồn tại trong seed/test, chưa có
// đường dây production. Ở đây quyết định chỉ cần vài vị từ, nên giữ thành hằng
// số nhỏ thay vì thêm một nguồn lỗi cấu hình.

export const CHAT_EVIDENCE_POLICY_VERSION = "chat-evidence-freshness-v1";

const DEFAULT_MAX_VERIFY_AGE_DAYS = 365;
const MIN_MAX_VERIFY_AGE_DAYS = 30;
const MAX_MAX_VERIFY_AGE_DAYS = 1_095;
const MS_PER_DAY = 86_400_000;

// Điều khoản chỉ còn hiệu lực một phần vẫn dùng được, nhưng phần cảnh báo trong
// câu trả lời phải nói rõ; các trạng thái còn lại thì không được trích.
const allowedEffectivityStatuses: ReadonlySet<string> = new Set([
  "in_force",
  "partially_in_force",
]);

export function readChatEvidenceMaxVerifyAgeDays(
  runtimeEnv: Record<string, unknown>,
): number {
  const raw = Number(runtimeEnv.CHAT_EVIDENCE_MAX_VERIFY_AGE_DAYS);
  return Number.isInteger(raw) &&
    raw >= MIN_MAX_VERIFY_AGE_DAYS &&
    raw <= MAX_MAX_VERIFY_AGE_DAYS
    ? raw
    : DEFAULT_MAX_VERIFY_AGE_DAYS;
}

function parseDateParts(value: unknown) {
  if (typeof value !== "string") return null;
  const match = value
    .trim()
    .match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}):(\d{2}))?/);
  if (!match) return null;
  const [, year, month, day, hour, minute, second] = match;
  const utc = Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour ?? "0"),
    Number(minute ?? "0"),
    Number(second ?? "0"),
  );
  if (!Number.isFinite(utc)) return null;
  // Chặn ngày không tồn tại (31/02) mà regex vẫn cho qua.
  const roundTrip = new Date(utc);
  if (
    roundTrip.getUTCFullYear() !== Number(year) ||
    roundTrip.getUTCMonth() !== Number(month) - 1 ||
    roundTrip.getUTCDate() !== Number(day)
  ) {
    return null;
  }
  return {
    date: `${year}-${month}-${day}`,
    time: `${hour ?? "00"}:${minute ?? "00"}:${second ?? "00"}`,
    epochMs: utc,
  };
}

// Dấu thời gian trong DB là `text` và có thể là ngày trần hoặc dạng Postgres
// `now()::text`. Bộ soạn chỉ nhận ISO datetime kết thúc bằng Z, nên bản ghi nào
// không chuẩn hoá được thì bị loại tại đây thay vì gửi lên rồi nhận
// INVALID_EVIDENCE.
export function toIsoDateTime(value: unknown): string | null {
  const parts = parseDateParts(value);
  return parts ? `${parts.date}T${parts.time}Z` : null;
}

// Phần trình bày căn cứ pháp lý cần ngày trần (`formatIsoDate` tách theo dấu -).
export function toIsoDate(value: unknown): string | null {
  return parseDateParts(value)?.date ?? null;
}

export function toEpochMs(value: unknown): number | null {
  return parseDateParts(value)?.epochMs ?? null;
}

export type EvidenceFreshnessInput = Readonly<{
  sourceStatus: string;
  sourceLastVerifiedAt: string | null;
  provisionStatus: string;
  provisionEffectivityStatus: string;
  provisionEffectiveFrom: string | null;
  provisionEffectiveTo: string | null;
  provisionChecksumSha256: string | null;
  citedChecksumSha256: string | null;
}>;

export type EvidenceFreshnessOptions = Readonly<{
  nowMs: number;
  maxVerifyAgeDays: number;
}>;

export function isEvidenceFresh(
  input: EvidenceFreshnessInput,
  options: EvidenceFreshnessOptions,
): boolean {
  if (input.sourceStatus !== "in_force") return false;
  if (input.provisionStatus !== "published") return false;
  if (!allowedEffectivityStatuses.has(input.provisionEffectivityStatus)) {
    return false;
  }

  // Trích dẫn phải khớp đúng bản văn đã được duyệt; lệch checksum nghĩa là điều
  // khoản đã đổi sau khi được trích.
  const checksum = input.provisionChecksumSha256?.trim() ?? "";
  if (checksum.length === 0) return false;
  if (checksum !== (input.citedChecksumSha256?.trim() ?? "")) return false;

  const verifiedAt = toEpochMs(input.sourceLastVerifiedAt);
  if (verifiedAt === null) return false;
  const age = options.nowMs - verifiedAt;
  if (age < 0 || age > options.maxVerifyAgeDays * MS_PER_DAY) return false;

  const effectiveFrom = toEpochMs(input.provisionEffectiveFrom);
  if (effectiveFrom === null || effectiveFrom > options.nowMs) return false;

  if (input.provisionEffectiveTo) {
    const effectiveTo = toEpochMs(input.provisionEffectiveTo);
    if (effectiveTo === null || effectiveTo < options.nowMs) return false;
  }

  return true;
}
