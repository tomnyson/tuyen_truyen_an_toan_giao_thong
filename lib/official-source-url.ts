export type OfficialSourceLink = {
  title: string;
  url: string;
};

export type PublicSourceKind = "official" | "reference";

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function isOfficialGovernmentHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return (
    host === "vbpl.vn" ||
    host === "vbpl.moj.gov.vn" ||
    host === "chinhphu.vn" ||
    host.endsWith(".chinhphu.vn")
  );
}

export function isReferenceSourceHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return (
    host === "thuvienphapluat.vn" ||
    host.endsWith(".thuvienphapluat.vn")
  );
}

function canonicalSourceUrl(
  value: unknown,
  acceptsHost: (hostname: string) => boolean,
): string | null {
  if (!isNonEmptyString(value) || value.length > 2_048) return null;
  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.port ||
      !acceptsHost(url.hostname)
    ) {
      return null;
    }
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

export function canonicalOfficialSourceUrl(value: unknown): string | null {
  return canonicalSourceUrl(value, isOfficialGovernmentHost);
}

export function canonicalReferenceSourceUrl(value: unknown): string | null {
  return canonicalSourceUrl(value, isReferenceSourceHost);
}

function parseSourceLinks(
  value: unknown,
  canonicalize: (value: unknown) => string | null,
  maximum = 8,
): OfficialSourceLink[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const parsed: OfficialSourceLink[] = [];
  for (const item of value) {
    if (
      typeof item !== "object" ||
      item === null ||
      !isNonEmptyString((item as OfficialSourceLink).title)
    ) {
      continue;
    }
    const url = canonicalize((item as OfficialSourceLink).url);
    if (!url || seen.has(url)) continue;
    seen.add(url);
    parsed.push({
      title: (item as OfficialSourceLink).title.trim().slice(0, 240),
      url,
    });
    if (parsed.length >= maximum) break;
  }
  return parsed;
}

export function parseOfficialSourceLinks(
  value: unknown,
  maximum = 8,
): OfficialSourceLink[] {
  return parseSourceLinks(value, canonicalOfficialSourceUrl, maximum);
}

export function parseReferenceSourceLinks(
  value: unknown,
  maximum = 8,
): OfficialSourceLink[] {
  return parseSourceLinks(value, canonicalReferenceSourceUrl, maximum);
}
