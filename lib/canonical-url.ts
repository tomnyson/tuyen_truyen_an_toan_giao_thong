// Module quan ly ten mien co dinh va duong dan vinh vien (US-046, DEC-026).
// Giup QR code va cac lien ket chia se giu nguyen gia tri lau dai, tranh viec
// phai in lai ma QR hoac cap lai link moi dinh ky khi doi server/preview deployment.

export type DomainHealthResult = Readonly<{
  configuredUrl: string;
  normalizedOrigin: string;
  isConfigured: boolean;
  isHttps: boolean;
  reachable: boolean;
  statusCode?: number;
  responseTimeMs?: number;
  error?: string;
}>;

export function getCanonicalDomain(configured?: string): string {
  const raw = (configured ?? process.env.NEXT_PUBLIC_SITE_URL ?? process.env.CANONICAL_DOMAIN ?? "").trim();
  if (!raw) return "";
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return "";
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return "";
  }
}

export function resolveCanonicalSiteUrl(configured?: string, fallbackOrigin?: string): string {
  const canonical = getCanonicalDomain(configured);
  if (canonical) return canonical;
  if (!fallbackOrigin) return "";
  try {
    const parsed = new URL(fallbackOrigin.trim());
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return `${parsed.protocol}//${parsed.host}`;
    }
  } catch {
    // fallback khong hop le
  }
  return "";
}

export function buildCanonicalPermalink(path: string, configured?: string): string {
  const domain = resolveCanonicalSiteUrl(configured);
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return domain ? `${domain}${cleanPath}` : cleanPath;
}

export function buildSituationPermalink(topic: string, id: number | string, configured?: string): string {
  const encodedTopic = encodeURIComponent(topic);
  return buildCanonicalPermalink(`/?topic=${encodedTopic}&id=${id}#tinh-huong-${id}`, configured);
}

export function buildDocumentPermalink(id: number | string, configured?: string): string {
  return buildCanonicalPermalink(`/van-ban/${id}`, configured);
}

export async function checkDomainHealth(
  domainUrl?: string,
  timeoutMs = 5000,
): Promise<DomainHealthResult> {
  const target = getCanonicalDomain(domainUrl);
  if (!target) {
    return {
      configuredUrl: domainUrl ?? "",
      normalizedOrigin: "",
      isConfigured: false,
      isHttps: false,
      reachable: false,
      error: "Tên miền chưa được cấu hình hoặc sai định dạng URL.",
    };
  }

  const isHttps = target.startsWith("https://");
  const startTime = Date.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(target, {
      method: "HEAD",
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": "LuatHocDuong-DomainHealthChecker/1.0",
      },
    });
    clearTimeout(timeoutId);
    return {
      configuredUrl: target,
      normalizedOrigin: target,
      isConfigured: true,
      isHttps,
      reachable: response.ok || response.status < 500,
      statusCode: response.status,
      responseTimeMs: Date.now() - startTime,
    };
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    const errorMsg = err instanceof Error ? err.message : "Không thể kết nối đến tên miền";
    return {
      configuredUrl: target,
      normalizedOrigin: target,
      isConfigured: true,
      isHttps,
      reachable: false,
      responseTimeMs: Date.now() - startTime,
      error: errorMsg,
    };
  }
}
