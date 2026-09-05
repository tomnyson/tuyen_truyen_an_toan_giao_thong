// Chia sẻ nội dung (US-034). Tách khỏi component để kiểm thử được: Web Share
// API là ưu tiên, sao chép liên kết là phương án dự phòng.
import { brandName } from "./brand";

export type ShareTarget = Readonly<{
  title: string;
  text: string;
  url: string;
}>;

export type ShareOutcome = "shared" | "copied" | "cancelled" | "unavailable";

export type ShareDeps = Readonly<{
  share?: (target: ShareTarget) => Promise<void>;
  copy?: (value: string) => Promise<void>;
}>;

export function buildShareTarget(title: string, siteUrl: string): ShareTarget {
  const trimmed = title.trim();
  return Object.freeze({
    title: trimmed.length > 0 ? trimmed : brandName,
    text: trimmed.length > 0 ? `${trimmed} — ${brandName}` : brandName,
    url: siteUrl,
  });
}

function isAbort(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

export async function shareTarget(
  target: ShareTarget,
  deps: ShareDeps,
): Promise<ShareOutcome> {
  if (deps.share) {
    try {
      await deps.share(target);
      return "shared";
    } catch (error) {
      // Người dùng đóng bảng chia sẻ là hành vi bình thường, không phải lỗi.
      if (isAbort(error)) return "cancelled";
    }
  }
  if (deps.copy && target.url.length > 0) {
    try {
      await deps.copy(target.url);
      return "copied";
    } catch {
      return "unavailable";
    }
  }
  return "unavailable";
}

export function shareOutcomeMessage(outcome: ShareOutcome): string {
  if (outcome === "shared") return "Đã mở bảng chia sẻ.";
  if (outcome === "copied") return "Đã sao chép liên kết vào bộ nhớ tạm.";
  if (outcome === "cancelled") return "";
  return "Trình duyệt không hỗ trợ chia sẻ. Hãy sao chép liên kết trên thanh địa chỉ.";
}
