import { and, desc, eq, isNotNull } from "drizzle-orm";
import { getInitializedDb } from "@/db";
import {
  legalEntries,
  legalEntryCitations,
  legalProvisions,
  legalSources,
  showcases,
} from "@/db/pg-schema";
import { createPublicContentHandler } from "@/lib/public-showcase";

export const GET = createPublicContentHandler(async () => {
  const db = await getInitializedDb();
  const [laws, caseStudies, citationRows] = await Promise.all([
    db
      .select()
      .from(legalEntries)
      .where(eq(legalEntries.status, "published"))
      .orderBy(desc(legalEntries.updatedAt), desc(legalEntries.id)),
    db
      .select()
      .from(showcases)
      .where(eq(showcases.status, "published"))
      .orderBy(desc(showcases.updatedAt), desc(showcases.id)),
    // Chỉ citation đã duyệt bốn mắt, provision published, nguồn in_force đã
    // xác minh và checksum còn khớp — cùng tiêu chí với chat (legal-chat.ts).
    db
      .select({
        legalEntryId: legalEntryCitations.legalEntryId,
        documentNumber: legalSources.documentNumber,
        title: legalSources.title,
        issuedAt: legalSources.issuedAt,
        article: legalProvisions.article,
        clause: legalProvisions.clause,
        point: legalProvisions.point,
        effectiveFrom: legalProvisions.effectiveFrom,
        lastVerifiedAt: legalSources.lastVerifiedAt,
        officialUrl: legalSources.officialUrl,
        displayOrder: legalEntryCitations.displayOrder,
      })
      .from(legalEntryCitations)
      .innerJoin(
        legalProvisions,
        eq(legalEntryCitations.provisionId, legalProvisions.id),
      )
      .innerJoin(legalSources, eq(legalProvisions.sourceId, legalSources.id))
      .where(
        and(
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
      .orderBy(legalEntryCitations.displayOrder),
  ]);
  const citationsByEntry = new Map<number, typeof citationRows>();
  for (const row of citationRows) {
    const bucket = citationsByEntry.get(row.legalEntryId) ?? [];
    bucket.push(row);
    citationsByEntry.set(row.legalEntryId, bucket);
  }
  return {
    laws: laws.map((entry) => ({
      ...entry,
      citations: citationsByEntry.get(entry.id) ?? [],
    })),
    showcases: caseStudies,
  };
});
