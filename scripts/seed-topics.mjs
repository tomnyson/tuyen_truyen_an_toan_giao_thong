import { pathToFileURL } from "node:url";
import { registerHooks } from "node:module";
import { sql, eq, and } from "drizzle-orm";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "cloudflare:workers") {
      return {
        shortCircuit: true,
        url: "data:text/javascript,globalThis.__workerEnvStub ??= {}; export const env = globalThis.__workerEnvStub;",
      };
    }
    if (specifier === "@/db") {
      return {
        shortCircuit: true,
        url: new URL("../db/index.ts", import.meta.url).href,
      };
    }
    if (specifier.startsWith("@/")) {
      const suffix = specifier.endsWith(".json") ? "" : ".ts";
      return {
        shortCircuit: true,
        url: new URL(`../${specifier.slice(2)}${suffix}`, import.meta.url).href,
      };
    }
    if (
      specifier.startsWith(".") &&
      !/\.[a-z]+$/i.test(specifier) &&
      context.parentURL?.endsWith(".ts")
    ) {
      return nextResolve(`${specifier}.ts`, context);
    }
    return nextResolve(specifier, context);
  },
});

const { contentTopics: baselineTopics } = await import("../lib/topics.ts");
const {
  contentTopics: contentTopicsTable,
  legalSources,
  legalProvisions,
  legalEntries,
  legalEntryCitations,
} = await import("../db/pg-schema.ts");
const { computeProvisionChecksum, PROVISION_CHECKSUM_VERSION } = await import(
  "../lib/legal-evidence-retriever.ts"
);
const { demoSituations } = await import("../db/seeds/demo-situations.mjs");

const SEED_EDITOR = "seed-editor";
const SEED_REVIEWER = "seed-reviewer";

export async function seedTopicsToDatabase(db) {
  let count = 0;
  for (let i = 0; i < baselineTopics.length; i++) {
    const topic = baselineTopics[i];
    await db
      .insert(contentTopicsTable)
      .values({
        name: topic.name,
        icon: topic.icon,
        detail: topic.detail,
        abbreviations: JSON.stringify(Array.from(topic.abbreviations || [])),
        keywords: JSON.stringify(Array.from(topic.keywords || [])),
        situations: JSON.stringify(Array.from(topic.situations || [])),
        displayOrder: (i + 1) * 10,
        status: "published",
        createdAt: sql`(now())::text`,
        updatedAt: sql`(now())::text`,
      })
      .onConflictDoUpdate({
        target: contentTopicsTable.name,
        set: {
          icon: topic.icon,
          detail: topic.detail,
          abbreviations: JSON.stringify(Array.from(topic.abbreviations || [])),
          keywords: JSON.stringify(Array.from(topic.keywords || [])),
          situations: JSON.stringify(Array.from(topic.situations || [])),
          displayOrder: (i + 1) * 10,
          status: "published",
          updatedAt: sql`(now())::text`,
        },
      });
    count++;
  }
  return { seededCount: count };
}

export async function seedDemoSituationsToDatabase(db) {
  const stamp = new Date().toISOString();
  let situationCount = 0;

  // 1. Gom các nguồn luật duy nhất
  const sourceMap = new Map();
  for (const item of demoSituations) {
    if (!sourceMap.has(item.source.documentNumber)) {
      sourceMap.set(item.source.documentNumber, item.source);
    }
  }

  // 2. Chèn nguồn văn bản (legal_sources) nếu chưa có
  for (const src of sourceMap.values()) {
    const host = new URL(src.officialUrl).hostname.toLowerCase();
    const existing = await db
      .select()
      .from(legalSources)
      .where(eq(legalSources.documentNumber, src.documentNumber));

    if (!existing || existing.length === 0) {
      await db.insert(legalSources).values({
        documentNumber: src.documentNumber,
        title: src.title,
        officialUrl: src.officialUrl,
        officialHost: host,
        issuedAt: src.issuedAt,
        effectiveFrom: src.effectiveFrom,
        status: "in_force",
        createdBy: SEED_EDITOR,
        lastVerifiedAt: stamp,
        verifiedBy: SEED_REVIEWER,
        createdAt: stamp,
        updatedAt: stamp,
      });
    }
  }

  // 3. Chèn điều khoản (legal_provisions), tình huống (legal_entries), trích dẫn (legal_entry_citations)
  for (const item of demoSituations) {
    const { source, provision } = item;
    const revisionId = `seed-${item.slug}-v1`;
    const effectiveFrom = provision.effectiveFrom ?? source.effectiveFrom;

    // Lấy sourceId
    const [sourceRow] = await db
      .select({ id: legalSources.id })
      .from(legalSources)
      .where(eq(legalSources.documentNumber, source.documentNumber));

    if (!sourceRow) continue;

    // Tính checksum
    const checksum = await computeProvisionChecksum({
      source: {
        documentNumber: source.documentNumber,
        officialUrl: source.officialUrl,
      },
      provision: {
        revisionId,
        checksumVersion: PROVISION_CHECKSUM_VERSION,
        article: provision.article ?? null,
        clause: provision.clause ?? null,
        point: provision.point ?? null,
        originalText: provision.originalText,
        simplifiedText: provision.simplifiedText,
        effectivityStatus: "in_force",
        effectiveFrom,
        effectiveTo: null,
      },
    });

    // Điều khoản (legal_provisions)
    let [provisionRow] = await db
      .select({ id: legalProvisions.id })
      .from(legalProvisions)
      .where(eq(legalProvisions.revisionId, revisionId));

    if (!provisionRow) {
      const [insertedProvision] = await db
        .insert(legalProvisions)
        .values({
          sourceId: sourceRow.id,
          article: provision.article ?? null,
          clause: provision.clause ?? null,
          point: provision.point ?? null,
          originalText: provision.originalText,
          simplifiedText: provision.simplifiedText,
          status: "published",
          createdBy: SEED_EDITOR,
          reviewedBy: SEED_REVIEWER,
          reviewedAt: stamp,
          revisionId,
          checksumVersion: PROVISION_CHECKSUM_VERSION,
          checksumSha256: checksum,
          effectivityStatus: "in_force",
          effectiveFrom,
          createdAt: stamp,
          updatedAt: stamp,
        })
        .returning({ id: legalProvisions.id });
      provisionRow = insertedProvision;
    }

    // Tình huống câu hỏi (legal_entries)
    let [entryRow] = await db
      .select({ id: legalEntries.id })
      .from(legalEntries)
      .where(
        and(
          eq(legalEntries.topic, item.topic),
          eq(legalEntries.title, item.title)
        )
      );

    if (!entryRow) {
      const [insertedEntry] = await db
        .insert(legalEntries)
        .values({
          topic: item.topic,
          icon: item.icon,
          title: item.title,
          legalBasis: item.legalBasis,
          penalty: item.penalty,
          remedy: item.remedy,
          caseStudy: item.caseStudy,
          tags: JSON.stringify(item.tags || []),
          status: "published",
          reviewStatus: "four_eyes_verified",
          createdBy: SEED_EDITOR,
          reviewedBy: SEED_REVIEWER,
          reviewedAt: stamp,
          createdAt: stamp,
          updatedAt: stamp,
        })
        .returning({ id: legalEntries.id });
      entryRow = insertedEntry;
      situationCount++;
    }

    // Liên kết trích dẫn (legal_entry_citations)
    if (entryRow && provisionRow) {
      const [citationRow] = await db
        .select()
        .from(legalEntryCitations)
        .where(
          and(
            eq(legalEntryCitations.legalEntryId, entryRow.id),
            eq(legalEntryCitations.provisionId, provisionRow.id)
          )
        );

      if (!citationRow) {
        await db.insert(legalEntryCitations).values({
          legalEntryId: entryRow.id,
          provisionId: provisionRow.id,
          displayOrder: 0,
          reviewStatus: "four_eyes_verified",
          createdBy: SEED_EDITOR,
          reviewedBy: SEED_REVIEWER,
          reviewedAt: stamp,
          citedRevisionId: revisionId,
          citedChecksumVersion: PROVISION_CHECKSUM_VERSION,
          citedChecksumSha256: checksum,
          createdAt: stamp,
        });
      }
    }
  }

  return { seededSituationsCount: situationCount };
}

// Chạy trực tiếp từ CLI
const isDirectRun =
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("Thieu DATABASE_URL. Chay: npm run seed:topics");
    process.exit(1);
  }

  const { neon } = await import("@neondatabase/serverless");
  const { drizzle } = await import("drizzle-orm/neon-http");
  const { bootstrapLegalDatabase } = await import("../db/index.ts");

  console.log("Dang ket noi database va kiem tra bootstrap...");
  const sqlClient = neon(url);
  const db = drizzle(sqlClient);

  await bootstrapLegalDatabase(db);
  const { seededCount } = await seedTopicsToDatabase(db);
  console.log(`✓ Da seed thanh cong ${seededCount} chu de vao database.`);

  console.log("Dang kiem tra va seed cac tinh huong / cau hoi mau cho cac chu de...");
  const { seededSituationsCount } = await seedDemoSituationsToDatabase(db);
  console.log(`✓ Da seed thanh cong ${seededSituationsCount} tinh huong mau vao database.`);

  console.log("Dang kiem tra va seed kho van ban phap luat mau...");
  const { seedDefaultLegalDocuments } = await import("../lib/legal-document-store.ts");
  const docResult = await seedDefaultLegalDocuments(db);
  console.log(`✓ Da seed kho van ban phap luat: ${docResult.inserted} them moi, ${docResult.updated} cap nhat.`);
}
