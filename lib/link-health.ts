import { laws } from "./legal-content";
import type { LinkStatus } from "./link-checker";

export type LinkSourceType =
  | "legal_source"
  | "showcase_source"
  | "showcase_media"
  | "static_baseline"
  | "authority";

export type LinkHealthItem = Readonly<{
  id: string;
  url: string;
  sourceType: LinkSourceType;
  sourceId: number | string;
  sourceTitle: string;
  field: string;
  lastStatus: LinkStatus;
  lastCheckedAt?: string;
  statusCode?: number;
  redirectUrl?: string;
  responseTimeMs?: number;
  error?: string;
}>;

export type LinkHealthSummary = Readonly<{
  total: number;
  ok: number;
  redirect: number;
  broken: number;
  timeout: number;
  unchecked: number;
  lastScannedAt?: string;
}>;

// Trích xuất links từ static baseline và DB (nếu có DB client truyền vào)
export async function extractSystemLinks(dbClient?: unknown): Promise<LinkHealthItem[]> {
  const extracted: LinkHealthItem[] = [];
  const seenUrls = new Set<string>();

  function addLink(
    url: string | null | undefined,
    sourceType: LinkSourceType,
    sourceId: number | string,
    sourceTitle: string,
    field: string,
  ) {
    if (!url || typeof url !== "string") return;
    const cleanUrl = url.trim();
    if (!cleanUrl.startsWith("http://") && !cleanUrl.startsWith("https://")) return;

    const key = `${sourceType}:${sourceId}:${cleanUrl}`;
    if (seenUrls.has(key)) return;
    seenUrls.add(key);

    extracted.push({
      id: key,
      url: cleanUrl,
      sourceType,
      sourceId,
      sourceTitle: sourceTitle.slice(0, 160),
      field,
      lastStatus: "unchecked",
    });
  }

  // 1. Static baseline trong legal-content
  for (const law of laws) {
    if (law.citation?.officialUrl) {
      addLink(
        law.citation.officialUrl,
        "static_baseline",
        law.id,
        law.title,
        "citation.officialUrl",
      );
    }
  }

  // 2. Database records nếu có dbClient
  if (dbClient && typeof (dbClient as { query?: unknown }).query === "function") {
    try {
      const client = dbClient as {
        query: (sql: string) => Promise<{ rows: Array<Record<string, unknown>> }>;
      };

      // Quản lý showcases
      const showcaseRes = await client.query(
        "SELECT id, title, source_url, media_url FROM showcases",
      );
      for (const row of showcaseRes.rows ?? []) {
        if (row.source_url) {
          addLink(row.source_url as string, "showcase_source", row.id as number, row.title as string, "sourceUrl");
        }
        if (row.media_url) {
          addLink(row.media_url as string, "showcase_media", row.id as number, row.title as string, "mediaUrl");
        }
      }

      // Quản lý legal_sources
      const sourceRes = await client.query(
        "SELECT id, title, official_url FROM legal_sources",
      );
      for (const row of sourceRes.rows ?? []) {
        if (row.official_url) {
          addLink(row.official_url as string, "legal_source", row.id as number, row.title as string, "officialUrl");
        }
      }
    } catch {
      // Nếu query database lỗi (vd database offline), giữ nguyên danh sách static baseline an toàn
    }
  }

  return extracted;
}

export function computeLinkSummary(
  links: readonly LinkHealthItem[],
  lastScannedAt?: string,
): LinkHealthSummary {
  let ok = 0;
  let redirect = 0;
  let broken = 0;
  let timeout = 0;
  let unchecked = 0;

  for (const item of links) {
    switch (item.lastStatus) {
      case "ok":
        ok++;
        break;
      case "redirect":
        redirect++;
        break;
      case "broken":
      case "blocked_ssrf":
      case "ssl_error":
      case "network_error":
        broken++;
        break;
      case "timeout":
        timeout++;
        break;
      default:
        unchecked++;
        break;
    }
  }

  return {
    total: links.length,
    ok,
    redirect,
    broken,
    timeout,
    unchecked,
    lastScannedAt,
  };
}
