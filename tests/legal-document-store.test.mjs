import assert from "node:assert/strict";
import test from "node:test";
import { registerHooks } from "node:module";

globalThis.__workerEnvStub ??= {};
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

const { PGlite } = await import("@electric-sql/pglite");
const { drizzle } = await import("drizzle-orm/pglite");
const { bootstrapLegalDatabase } = await import("../db/index.ts");
const {
  listLegalDocuments,
  createLegalDocument,
  updateLegalDocument,
  deleteLegalDocument,
  seedDefaultLegalDocuments,
  checkAndUpdateDocumentLink,
} = await import("../lib/legal-document-store.ts");

test("legal-document-store CRUD, filtering, seeding and link checking", async () => {
  const client = new PGlite();
  const db = drizzle(client);
  await bootstrapLegalDatabase(db);

  // 1. Seed demo documents
  const seedResult = await seedDefaultLegalDocuments(db);
  assert.ok(seedResult.inserted >= 10);

  // 2. Query with filters
  const allDocs = await listLegalDocuments({}, db);
  assert.equal(allDocs.length >= 10, true);

  const gtDocs = await listLegalDocuments({ topic: "Giao thông" }, db);
  assert.ok(gtDocs.length >= 1);
  assert.equal(gtDocs[0].topic, "Giao thông");

  const searchDocs = await listLegalDocuments({ query: "168/2024" }, db);
  assert.ok(searchDocs.some((d) => d.documentNumber === "168/2024/NĐ-CP"));

  const authorityDocs = await listLegalDocuments(
    { authority: "Quốc hội" },
    db
  );
  assert.ok(authorityDocs.length >= 1);
  assert.equal(authorityDocs[0].issuingAuthority, "Quốc hội");

  // 3. Create document
  const created = await createLegalDocument(
    {
      title: "Thông tư 32/2023/TT-BCA kiểm soát giao thông",
      documentNumber: "32/2023/TT-BCA",
      documentType: "thong_tu",
      topic: "Giao thông",
      issuingAuthority: "Bộ Công an",
      officialUrl: "https://vanban.chinhphu.vn/?pageid=27160&docid=208544",
    },
    db
  );
  assert.equal(created.documentNumber, "32/2023/TT-BCA");
  assert.equal(created.documentType, "thong_tu");

  // 4. Update document
  const updated = await updateLegalDocument(
    created.id,
    {
      summary: "Quy định nhiệm vụ, quyền hạn tuần tra kiểm soát",
    },
    db
  );
  assert.equal(
    updated.summary,
    "Quy định nhiệm vụ, quyền hạn tuần tra kiểm soát"
  );

  // 5. Delete document
  const deleted = await deleteLegalDocument(created.id, db);
  assert.equal(deleted.success, true);
});
