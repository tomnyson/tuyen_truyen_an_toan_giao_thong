import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { legalEntries, showcases } from "@/db/schema";

export async function GET() {
  try {
    const db = getDb();
    const [laws, caseStudies] = await Promise.all([
      db.select().from(legalEntries).where(eq(legalEntries.status, "published")).orderBy(desc(legalEntries.updatedAt)),
      db.select().from(showcases).where(eq(showcases.status, "published")).orderBy(desc(showcases.updatedAt)),
    ]);
    return Response.json({ laws, showcases: caseStudies });
  } catch {
    return Response.json({ laws: [], showcases: [] });
  }
}
