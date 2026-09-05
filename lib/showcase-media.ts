// Media minh họa cho tình huống cảnh báo (yêu cầu #2/#4 của bản điều chỉnh
// 2026-09-05). Media KHÔNG phải nguồn pháp lý: nó chỉ để trực quan hóa. Vì
// vậy allowlist ở đây tách hẳn khỏi `isExactDec004SourceUrl` — nới host cho
// video/ảnh nhưng vẫn chặn mọi thứ không render được an toàn.

export type ShowcaseMediaKind = "none" | "youtube" | "image";

export type ShowcaseMedia = Readonly<{
  kind: ShowcaseMediaKind;
  url: string;
  embedUrl: string;
}>;

const emptyMedia: ShowcaseMedia = Object.freeze({
  kind: "none",
  url: "",
  embedUrl: "",
});

// Bao gồm cả host no-cookie: DTO công khai mang URL embed đã chuẩn hóa và
// client parse lại chính URL đó, nên vòng chuẩn hóa phải idempotent.
const youtubeHosts = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "youtu.be",
  "www.youtu.be",
  "youtube-nocookie.com",
  "www.youtube-nocookie.com",
]);

const imageExtensions = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif"];

// ID video YouTube: 11 ký tự base64url. Ràng buộc chặt để không bao giờ nội
// suy chuỗi tùy ý vào src của iframe.
const youtubeIdPattern = /^[A-Za-z0-9_-]{11}$/;

function parseHttpsUrl(value: string): URL | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.port) {
      return null;
    }
    return url;
  } catch {
    return null;
  }
}

export function youtubeVideoId(value: string): string | null {
  const url = parseHttpsUrl(value);
  if (!url) return null;
  const host = url.hostname.toLowerCase();
  if (!youtubeHosts.has(host)) return null;

  const segments = url.pathname.split("/").filter(Boolean);
  // youtu.be/<id>
  if (host.endsWith("youtu.be")) {
    const candidate = segments[0] ?? "";
    return youtubeIdPattern.test(candidate) ? candidate : null;
  }
  // youtube.com/watch?v=<id>
  if (segments.length === 1 && segments[0] === "watch") {
    const candidate = url.searchParams.get("v") ?? "";
    return youtubeIdPattern.test(candidate) ? candidate : null;
  }
  // youtube.com/shorts/<id> và youtube.com/embed/<id>
  if (
    segments.length === 2 &&
    (segments[0] === "shorts" || segments[0] === "embed") &&
    youtubeIdPattern.test(segments[1])
  ) {
    return segments[1];
  }
  return null;
}

function isImageUrl(value: string): boolean {
  const url = parseHttpsUrl(value);
  if (!url) return false;
  const path = url.pathname.toLowerCase();
  return imageExtensions.some((extension) => path.endsWith(extension));
}

// Chuẩn hóa URL người biên tập dán vào thành media render được. Trả về
// `kind: "none"` cho mọi giá trị không nhận dạng được — tình huống vẫn hiển
// thị, chỉ là không kèm minh họa.
export function resolveShowcaseMedia(value: unknown): ShowcaseMedia {
  if (typeof value !== "string") return emptyMedia;
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > 2_048) return emptyMedia;

  const videoId = youtubeVideoId(trimmed);
  if (videoId) {
    return Object.freeze({
      kind: "youtube" as const,
      url: trimmed,
      embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}`,
    });
  }
  if (isImageUrl(trimmed)) {
    return Object.freeze({
      kind: "image" as const,
      url: trimmed,
      embedUrl: trimmed,
    });
  }
  return emptyMedia;
}

export function isSupportedShowcaseMediaUrl(value: string): boolean {
  return resolveShowcaseMedia(value).kind !== "none";
}

// Ảnh xem trước cho thẻ tình huống. Card dùng <img> thay vì <iframe> để
// không tải N player YouTube cùng lúc; iframe chỉ xuất hiện trong modal.
export function showcaseMediaPreviewUrl(
  kind: ShowcaseMediaKind,
  embedUrl: string,
): string {
  if (kind === "image") return embedUrl;
  if (kind !== "youtube") return "";
  const videoId = youtubeVideoId(embedUrl);
  return videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : "";
}
