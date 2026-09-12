import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { registerHooks } from "node:module";
import { DatabaseSync } from "node:sqlite";
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

const repositoryRoot = new URL("../", import.meta.url);
const [schemaSource, pgSchemaSource, migration, journalText] =
  await Promise.all([
    readFile(new URL("db/schema.ts", repositoryRoot), "utf8"),
    readFile(new URL("db/pg-schema.ts", repositoryRoot), "utf8"),
    readFile(
      new URL("drizzle/0007_referral_authorities.sql", repositoryRoot),
      "utf8",
    ),
    readFile(new URL("drizzle/meta/_journal.json", repositoryRoot), "utf8"),
  ]);
const journal = JSON.parse(journalText);
const { PGlite } = await import("@electric-sql/pglite");
const { drizzle } = await import("drizzle-orm/pglite");
const { sql } = await import("drizzle-orm");
const { bootstrapLegalDatabase } = await import("../db/index.ts");
const { pgSchemaVersion } = await import("../db/pg-bootstrap.ts");

test("ca hai schema deu khai bao bang co quan", () => {
  assert.match(schemaSource, /sqliteTable\(\s*\n?\s*"referral_authorities"/);
  assert.match(pgSchemaSource, /pgTable\("referral_authorities"/);
});

test("migration duoc ghi vao journal dung thu tu, khong xoa gi", () => {
  const entry = journal.entries.at(-1);
  assert.equal(entry.idx, 7);
  assert.equal(entry.tag, "0007_referral_authorities");
  assert.doesNotMatch(migration, /DROP\s+TABLE/i);
  assert.doesNotMatch(migration, /DROP\s+COLUMN/i);
  // Migration chỉ tạo schema; dữ liệu cơ quan phải đi qua quy trình duyệt.
  assert.doesNotMatch(migration, /INSERT\s+INTO/i);
});

test("phien ban schema pg da duoc tang", () => {
  assert.equal(pgSchemaVersion, "2026-09-12-referral-authorities-v1");
});

test("sqlite chan cap sai, trang thai sai va topics khong phai json", () => {
  const db = new DatabaseSync(":memory:");
  db.exec(migration);
  const insert = (values) =>
    db.exec(
      `INSERT INTO referral_authorities
       (name, level, topics, scope, address, phone, hotline, note, status, created_by)
       VALUES (${values})`,
    );

  insert(
    `'Công an xã A', 'xa_phuong', '["An ninh trật tự"]', 'Xã A', '', '', '', '', 'draft', 'editor-1'`,
  );
  assert.throws(() =>
    insert(
      `'Sai cấp', 'quan_huyen', '[]', '', '', '', '', '', 'draft', 'editor-1'`,
    ),
  );
  assert.throws(() =>
    insert(`'Sai trạng thái', 'tinh', '[]', '', '', '', '', '', 'live', 'editor-1'`),
  );
  assert.throws(() =>
    insert(`'Topics sai', 'tinh', 'khong-phai-json', '', '', '', '', '', 'draft', 'editor-1'`),
  );
  assert.throws(() =>
    insert(`'   ', 'tinh', '[]', '', '', '', '', '', 'draft', 'editor-1'`),
  );
});

test("sqlite chi cho published khi da duyet boi nguoi khac", () => {
  const db = new DatabaseSync(":memory:");
  db.exec(migration);
  // Thiếu người duyệt.
  assert.throws(() =>
    db.exec(
      `INSERT INTO referral_authorities
       (name, level, topics, status, created_by)
       VALUES ('Sở Tư pháp', 'tinh', '[]', 'published', 'editor-1')`,
    ),
  );
  // Tự duyệt bài của mình.
  assert.throws(() =>
    db.exec(
      `INSERT INTO referral_authorities
       (name, level, topics, status, created_by, reviewed_by, reviewed_at)
       VALUES ('Sở Tư pháp', 'tinh', '[]', 'published', 'editor-1', 'editor-1', '2026-09-12')`,
    ),
  );
  db.exec(
    `INSERT INTO referral_authorities
     (name, level, topics, status, created_by, reviewed_by, reviewed_at)
     VALUES ('Sở Tư pháp', 'tinh', '[]', 'published', 'editor-1', 'reviewer-1', '2026-09-12')`,
  );
  const row = db
    .prepare(`SELECT status, level FROM referral_authorities`)
    .get();
  assert.equal(row.status, "published");
  assert.equal(row.level, "tinh");
});

test("bootstrap postgres tao bang va giu dung rang buoc", async () => {
  const client = new PGlite();
  const db = drizzle(client);
  await bootstrapLegalDatabase(db);
  // Idempotent: chạy lần hai không được lỗi.
  await bootstrapLegalDatabase(db);

  await db.execute(
    sql.raw(
      `INSERT INTO referral_authorities (name, level, topics, status, created_by)
       VALUES ('Công an phường B', 'xa_phuong', '["An ninh trật tự"]', 'draft', 'editor-1')`,
    ),
  );
  await assert.rejects(() =>
    db.execute(
      sql.raw(
        `INSERT INTO referral_authorities (name, level, topics, status, created_by)
         VALUES ('Sai cấp', 'quan_huyen', '[]', 'draft', 'editor-1')`,
      ),
    ),
  );
  await assert.rejects(() =>
    db.execute(
      sql.raw(
        `INSERT INTO referral_authorities (name, level, topics, status, created_by)
         VALUES ('Chua duyet', 'tinh', '[]', 'published', 'editor-1')`,
      ),
    ),
  );
  await client.close();
});
