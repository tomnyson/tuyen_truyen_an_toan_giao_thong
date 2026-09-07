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

// Các mạng xã hội phổ biến với người học ở Việt Nam. Mỗi kênh chỉ là một liên
// kết web-intent nên chạy được cả trên máy tính lẫn điện thoại, không cần SDK.
export type ShareChannelId = "facebook" | "zalo" | "x" | "telegram" | "email";

export type ShareChannel = Readonly<{
  id: ShareChannelId;
  label: string;
  mark: string;
  href: string;
}>;

export function shareChannels(target: ShareTarget): readonly ShareChannel[] {
  // Không có URL thật thì mọi web-intent đều dẫn về trang trống.
  if (target.url.length === 0) return Object.freeze([]);
  const url = encodeURIComponent(target.url);
  const text = encodeURIComponent(target.text);
  const subject = encodeURIComponent(target.title);
  return Object.freeze([
    Object.freeze({
      id: "facebook" as const,
      label: "Facebook",
      mark: "f",
      href: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
    }),
    Object.freeze({
      id: "zalo" as const,
      label: "Zalo",
      mark: "Z",
      href: `https://sp.zalo.me/plugins/share?url=${url}`,
    }),
    Object.freeze({
      id: "x" as const,
      label: "X (Twitter)",
      mark: "X",
      href: `https://x.com/intent/post?url=${url}&text=${text}`,
    }),
    Object.freeze({
      id: "telegram" as const,
      label: "Telegram",
      mark: "✈",
      href: `https://t.me/share/url?url=${url}&text=${text}`,
    }),
    Object.freeze({
      id: "email" as const,
      label: "Email",
      mark: "✉",
      href: `mailto:?subject=${subject}&body=${text}%0A%0A${url}`,
    }),
  ]);
}

export function shareOpenMessage(label: string): string {
  return `Đã mở ${label} để đăng nội dung.`;
}
