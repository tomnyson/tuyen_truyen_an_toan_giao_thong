// Đọc một nội dung đã xuất bản để dựng trang chi tiết có Open Graph riêng
// (US-034). Tiêu chí duyệt giống hệt `/api/content`: chỉ citation bốn mắt,
// provision published, nguồn in_force còn khớp checksum mới được coi là căn cứ.
import { and, eq, isNotNull } from "drizzle-orm";
import { getInitializedDb } from "@/db";
import {
  legalEntries,
  legalEntryCitations,
  legalProvisions,
  legalSources,
  showcases,
} from "@/db/pg-schema";
import { hasBlockedLegalBasis } from "./legal-content";
import {
  projectPublishedShowcases,
  type PublicShowcase,
} from "./public-showcase";
import { resolveShowcaseMedia, type ShowcaseMediaKind } from "./showcase-media";

export type LawCitation = Readonly<{
  documentNumber: string;
  title: string;
  article: string;
  clause: string;
  point: string;
  effectiveFrom: string;
  lastVerifiedAt: string;
  officialUrl: string;
}>;

export type LawDetail = Readonly<{
  id: number;
  topic: string;
  icon: string;
  title: string;
  legalBasis: string;
  penalty: string;
  remedy: string;
  caseStudy: string;
  tags: readonly string[];
  mediaUrl: string;
  mediaKind: ShowcaseMediaKind;
  citation: LawCitation | null;
}>;

export type ShowcaseDetail = PublicShowcase;

function parseTags(value: string): readonly string[] {
  try {
    const tags = JSON.parse(value) as unknown;
    if (!Array.isArray(tags)) return [];
    return tags.filter((tag): tag is string => typeof tag === "string");
  } catch {
    return [];
  }
}

export async function loadLawDetail(id: number): Promise<LawDetail | null> {
  const db = await getInitializedDb();
  const [entry] = await db
    .select()
    .from(legalEntries)
    .where(and(eq(legalEntries.id, id), eq(legalEntries.status, "published")))
    .limit(1);
  // Entry bị chặn căn cứ (ND 131/2013 đã hết hiệu lực) không được công bố ở bất
  // kỳ đâu, kể cả trang chi tiết.
  if (!entry || hasBlockedLegalBasis(entry.legalBasis)) return null;

  const citations = await db
    .select({
      documentNumber: legalSources.documentNumber,
      title: legalSources.title,
      article: legalProvisions.article,
      clause: legalProvisions.clause,
      point: legalProvisions.point,
      effectiveFrom: legalProvisions.effectiveFrom,
      lastVerifiedAt: legalSources.lastVerifiedAt,
      officialUrl: legalSources.officialUrl,
    })
    .from(legalEntryCitations)
    .innerJoin(
      legalProvisions,
      eq(legalEntryCitations.provisionId, legalProvisions.id),
    )
    .innerJoin(legalSources, eq(legalProvisions.sourceId, legalSources.id))
    .where(
      and(
        eq(legalEntryCitations.legalEntryId, id),
        eq(legalEntryCitations.reviewStatus, "four_eyes_verified"),
        eq(legalProvisions.status, "published"),
        eq(legalSources.status, "in_force"),
        isNotNull(legalSources.lastVerifiedAt),
        isNotNull(legalSources.verifiedBy),
        eq(
          legalEntryCitations.citedChecksumSha256,
          legalProvisions.checksumSha256,
        ),
      ),
    )
    .orderBy(legalEntryCitations.displayOrder)
    .limit(1);

  const first = citations[0];
  const media = resolveShowcaseMedia(entry.mediaUrl);
  return Object.freeze({
    id: entry.id,
    topic: entry.topic,
    icon: entry.icon,
    title: entry.title,
    legalBasis: entry.legalBasis,
    penalty: entry.penalty,
    remedy: entry.remedy,
    caseStudy: entry.caseStudy,
    tags: parseTags(entry.tags),
    mediaUrl: media.kind === "none" ? "" : media.embedUrl,
    mediaKind: media.kind,
    citation: first
      ? Object.freeze({
          documentNumber: first.documentNumber,
          title: first.title,
          article: first.article ?? "",
          clause: first.clause ?? "",
          point: first.point ?? "",
          effectiveFrom: first.effectiveFrom ?? "",
          lastVerifiedAt: first.lastVerifiedAt ?? "",
          officialUrl: first.officialUrl,
        })
      : null,
  });
}

export async function loadShowcaseDetail(
  id: number,
): Promise<ShowcaseDetail | null> {
  const db = await getInitializedDb();
  const [row] = await db
    .select()
    .from(showcases)
    .where(and(eq(showcases.id, id), eq(showcases.status, "published")))
    .limit(1);
  if (!row) return null;
  // Đi qua đúng bộ lọc của API công khai: topic hợp lệ, nguồn thuộc thẩm quyền
  // DEC-004, media qua allowlist.
  const [projected] = projectPublishedShowcases([row]);
  return projected ?? null;
}
