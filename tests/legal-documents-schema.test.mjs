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
const { sql } = await import("drizzle-orm");
const { bootstrapLegalDatabase } = await import("../db/index.ts");
const { legalDocuments } = await import("../db/pg-schema.ts");

test("legal_documents table is created by bootstrap and enforces constraints", async () => {
  const client = new PGlite();
  const db = drizzle(client);
  await bootstrapLegalDatabase(db);

  // Thêm văn bản hợp lệ
  await db.insert(legalDocuments).values({
    title: "Nghị định 168/2024/NĐ-CP về trật tự an toàn giao thông đường bộ",
    documentNumber: "168/2024/NĐ-CP",
    documentType: "nghi_dinh",
    topic: "Giao thông",
    issuingAuthority: "Chính phủ",
    officialUrl: "https://vanban.chinhphu.vn/?pageid=27160&docid=212167",
    summary: "Xử phạt vi phạm hành chính trong lĩnh vực đường bộ",
    effectivityStatus: "in_force",
    status: "published",
    linkStatus: "unchecked",
    displayOrder: 10,
  });

  const rows = await db.select().from(legalDocuments);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].documentNumber, "168/2024/NĐ-CP");
  assert.equal(rows[0].documentType, "nghi_dinh");
  assert.equal(rows[0].topic, "Giao thông");
  assert.equal(rows[0].linkStatus, "unchecked");

  // Kiểm tra ràng buộc documentType sai phải báo lỗi
  await assert.rejects(async () => {
    await db.execute(
      sql.raw(`INSERT INTO legal_documents (title, document_number, document_type, topic, issuing_authority, official_url)
               VALUES ('Test', '01/TEST', 'invalid_type', 'Giao thông', 'Chính phủ', 'https://chinhphu.vn')`)
    );
  });
});
