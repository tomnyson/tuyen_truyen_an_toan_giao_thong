import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";

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
const { pgSchemaVersion } = await import("../db/pg-bootstrap.ts");

test("content_topics table is created by bootstrap and enforces checks", async () => {
  const client = new PGlite();
  const db = drizzle(client);

  await bootstrapLegalDatabase(db);

  assert.match(
    pgSchemaVersion,
    /^(2026-09-12-(content-topics|legal-documents)-v1|2026-09-13-rbac-and-audit-v1)$/,
  );

  // Kiểm tra bảng tồn tại
  const tableCheck = await db.execute(
    sql.raw("SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'content_topics') AS exists")
  );
  assert.equal(tableCheck.rows[0].exists, true);

  // Thử insert hợp lệ
  await db.execute(
    sql.raw(`
      INSERT INTO content_topics (name, icon, detail, abbreviations, keywords, situations, display_order, status)
      VALUES ('Chủ đề test', '★', 'Mô tả test', '["test"]', '["tu khoa"]', '["cau hoi?"]', 1, 'published')
    `)
  );

  const res = await db.execute(sql.raw("SELECT name, icon FROM content_topics WHERE name = 'Chủ đề test'"));
  assert.equal(res.rows[0].name, "Chủ đề test");
  assert.equal(res.rows[0].icon, "★");

  // Kiểm tra ràng buộc unique name
  await assert.rejects(
    async () => {
      await db.execute(
        sql.raw(`
          INSERT INTO content_topics (name, icon, detail)
          VALUES ('Chủ đề test', '★', 'Trùng tên')
        `)
      );
    },
    (err) => /duplicate key|unique/i.test(String(err)) || /duplicate key|unique/i.test(String(err?.cause))
  );

  // Kiểm tra ràng buộc JSON array cho keywords
  await assert.rejects(
    async () => {
      await db.execute(
        sql.raw(`
          INSERT INTO content_topics (name, keywords)
          VALUES ('Chủ đề sai JSON', 'khong phai json')
        `)
      );
    }
  );

  // Kiểm tra ràng buộc status hợp lệ
  await assert.rejects(
    async () => {
      await db.execute(
        sql.raw(`
          INSERT INTO content_topics (name, status)
          VALUES ('Chủ đề sai status', 'invalid_status')
        `)
      );
    }
  );
});
