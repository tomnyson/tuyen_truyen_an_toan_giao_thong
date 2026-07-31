import { desc, eq } from "drizzle-orm";
import { getInitializedDb } from "@/db";
import { legalEntries, showcases } from "@/db/pg-schema";
import { createPublicContentHandler } from "@/lib/public-showcase";

export const GET = createPublicContentHandler(async () => {
  const db = await getInitializedDb();
  const [laws, caseStudies] = await Promise.all([
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
  ]);
  return { laws, showcases: caseStudies };
});
