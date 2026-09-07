import { hasBlockedLegalBasis } from "@/lib/legal-content";
import {
  resolveShowcaseMedia,
  type ShowcaseMediaKind,
} from "@/lib/showcase-media";
import { isContentTopic } from "@/lib/topics";

// `sourceUrl` rỗng nghĩa là tình huống chưa gắn nguồn chính thức đã duyệt —
// thẻ vẫn hiển thị, chỉ không có link "Nguồn chính thức". Trước đây record
// kiểu này bị loại im lặng khỏi API (bug #4 của bản điều chỉnh 2026-09-05).
export type PublicShowcase = Readonly<{
  id: number;
  topic: string;
  title: string;
  summary: string;
  sourceUrl: string;
  mediaUrl: string;
  mediaKind: ShowcaseMediaKind;
}>;

export type ShowcaseRecord = {
  id: number;
  topic: string;
  title: string;
  summary: string;
  sourceUrl: string;
  mediaUrl?: string;
  status: string;
};

export type PublicLawRecord = {
  legalBasis: string;
  [key: string]: unknown;
};

export type PublicContentRows = {
  laws: PublicLawRecord[];
  showcases: ShowcaseRecord[];
};

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function boundedTrimmedString(value: unknown, maximumLength: number) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.length <= maximumLength ? trimmed : null;
}

export function isExactDec004SourceUrl(value: string) {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    const approvedAuthority =
      host === "vbpl.vn" ||
      host === "vbpl.moj.gov.vn" ||
      host === "chinhphu.vn" ||
      host === 'youtube.com' ||
      host === "www.youtube.com" ||
      host.endsWith(".chinhphu.vn");
    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      !url.port &&
      approvedAuthority
    );
  } catch {
    return false;
  }
}

function projectPublicShowcase(value: unknown): PublicShowcase | null {
  if (!isPlainRecord(value) || value.status !== "published") return null;
  const topic = boundedTrimmedString(value.topic, 80);
  const title = boundedTrimmedString(value.title, 300);
  const summary = boundedTrimmedString(value.summary, 10_000);
  if (
    !Number.isSafeInteger(value.id) ||
    (value.id as number) <= 0 ||
    !topic ||
    !isContentTopic(topic) ||
    !title ||
    !summary
  ) {
    return null;
  }

  const rawSourceUrl = boundedTrimmedString(value.sourceUrl, 2_048);
  // Chỉ URL thuộc thẩm quyền DEC-004 mới được trình bày là nguồn chính thức.
  const sourceUrl =
    rawSourceUrl && isExactDec004SourceUrl(rawSourceUrl) ? rawSourceUrl : "";
  // Dữ liệu cũ để link YouTube/ảnh trong ô "nguồn": cứu về đúng vai trò media
  // minh họa thay vì loại bỏ cả tình huống.
  const media = resolveShowcaseMedia(
    boundedTrimmedString(value.mediaUrl, 2_048) ??
      (sourceUrl ? "" : (rawSourceUrl ?? "")),
  );

  return Object.freeze({
    id: value.id as number,
    topic,
    title,
    summary,
    sourceUrl,
    mediaUrl: media.kind === "none" ? "" : media.embedUrl,
    mediaKind: media.kind,
  });
}

export function projectPublishedShowcases(
  rows: readonly unknown[],
): PublicShowcase[] {
  const ids = new Set<number>();
  const result: PublicShowcase[] = [];
  for (const row of rows) {
    const item = projectPublicShowcase(row);
    if (!item || ids.has(item.id)) continue;
    ids.add(item.id);
    result.push(item);
  }
  return result;
}

export function parsePublicShowcases(value: unknown): PublicShowcase[] | null {
  if (!Array.isArray(value)) return null;
  const rows = value.map((item) => {
    if (!isPlainRecord(item)) return item;
    const keys = Object.keys(item);
    if (
      keys.length !== 7 ||
      !keys.every((key) =>
        [
          "id",
          "topic",
          "title",
          "summary",
          "sourceUrl",
          "mediaUrl",
          "mediaKind",
        ].includes(key),
      )
    ) {
      return null;
    }
    return { ...item, status: "published" };
  });
  const projected = projectPublishedShowcases(rows);
  return projected.length === value.length ? projected : null;
}

export function createPublicContentHandler(
  loadRows: () => Promise<PublicContentRows>,
) {
  return async function publicContent() {
    try {
      const rows = await loadRows();
      return Response.json({
        laws: rows.laws.filter(
          (entry) => !hasBlockedLegalBasis(entry.legalBasis),
        ),
        showcases: projectPublishedShowcases(rows.showcases),
      });
    } catch {
      return Response.json(
        { error: "CONTENT_DEPENDENCY_UNAVAILABLE" },
        {
          status: 503,
          headers: {
            "Cache-Control": "no-store",
          },
        },
      );
    }
  };
}
