import { desc, eq } from "drizzle-orm";
import { getInitializedDb } from "@/db";
import { legalEntries, showcases } from "@/db/schema";
import { hasBlockedLegalBasis } from "@/lib/legal-content";

export async function GET() {
  try {
    const db = await getInitializedDb();
    const [laws, caseStudies] = await Promise.all([
      db.select().from(legalEntries).where(eq(legalEntries.status, "published")).orderBy(desc(legalEntries.updatedAt)),
      db.select().from(showcases).where(eq(showcases.status, "published")).orderBy(desc(showcases.updatedAt)),
    ]);
    return Response.json({
      laws: laws.filter((entry) => !hasBlockedLegalBasis(entry.legalBasis)),
      showcases: caseStudies,
    });
  } catch {
    return Response.json({ laws: [], showcases: [] });
  }
}
