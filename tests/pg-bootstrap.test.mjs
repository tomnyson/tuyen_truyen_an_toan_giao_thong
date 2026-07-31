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

const client = new PGlite();
const db = drizzle(client);

const STAMP = "2026-07-31T00:00:00.000Z";
const CHECKSUM = "a".repeat(64);

// drizzle bọc lỗi Postgres vào error.cause — gom cả chuỗi cause để so khớp.
function rejectsWith(pattern) {
  return (error) => {
    let message = "";
    for (let e = error; e; e = e.cause) message += `${e.message}\n`;
    assert.match(message, pattern);
    return true;
  };
}

test("bootstrap ap duoc va idempotent", async () => {
  await bootstrapLegalDatabase(db);
  await bootstrapLegalDatabase(db); // lần 2 không được lỗi
  const tables = await db.execute(sql.raw(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public' ORDER BY table_name`,
  ));
  const names = tables.rows.map((row) => row.table_name);
  for (const expected of [
    "legal_sources",
    "legal_provisions",
    "legal_entries",
    "legal_entry_citations",
    "showcases",
  ]) {
    assert.ok(names.includes(expected), `thieu bang ${expected}`);
  }
});

test("do thi bon mat hop le duoc chap nhan", async () => {
  await db.execute(sql.raw(`
    INSERT INTO legal_sources (
      document_number, title, official_url, official_host, issued_at,
      effective_from, status, created_by, last_verified_at, verified_by
    ) VALUES (
      '168/2024/NĐ-CP', 'Nghị định 168', 'https://vanban.chinhphu.vn/?docid=1',
      'vanban.chinhphu.vn', '2024-12-26', '2025-01-01', 'in_force',
      'seed-editor', '${STAMP}', 'seed-reviewer'
    )`));
  await db.execute(sql.raw(`
    INSERT INTO legal_provisions (
      source_id, article, clause, point, original_text, simplified_text,
      status, created_by, reviewed_by, reviewed_at, revision_id,
      checksum_version, checksum_sha256, effectivity_status, effective_from
    ) VALUES (
      1, '7', '2', 'h', 'goc', 'don gian', 'published', 'seed-editor',
      'seed-reviewer', '${STAMP}', 'seed-rev-1', 'provision-sha256-v1',
      '${CHECKSUM}', 'in_force', '2025-01-01'
    )`));
  await db.execute(sql.raw(`
    INSERT INTO legal_entries (
      topic, icon, title, legal_basis, penalty, remedy, case_study, tags,
      status, review_status, created_by, reviewed_by, reviewed_at
    ) VALUES (
      'Giao thông', '◉', 'Mũ bảo hiểm', 'Điều 7', 'phạt', 'đội mũ', 'vd',
      '["giao-thong"]', 'published', 'four_eyes_verified', 'seed-editor',
      'seed-reviewer', '${STAMP}'
    )`));
  await db.execute(sql.raw(`
    INSERT INTO legal_entry_citations (
      legal_entry_id, provision_id, display_order, review_status,
      created_by, reviewed_by, reviewed_at, cited_revision_id,
      cited_checksum_version, cited_checksum_sha256
    ) VALUES (
      1, 1, 0, 'four_eyes_verified', 'seed-editor', 'seed-reviewer',
      '${STAMP}', 'seed-rev-1', 'provision-sha256-v1', '${CHECKSUM}'
    )`));
  const count = await db.execute(
    sql.raw("SELECT count(*) AS n FROM legal_entry_citations"),
  );
  assert.equal(Number(count.rows[0].n), 1);
});

test("trigger chan entry bon mat tu duyet chinh minh", async () => {
  await assert.rejects(
    db.execute(sql.raw(`
      INSERT INTO legal_entries (
        topic, icon, title, legal_basis, penalty, remedy, case_study, tags,
        status, review_status, created_by, reviewed_by, reviewed_at
      ) VALUES (
        'Giao thông', '◉', 'Tự duyệt', 'x', 'x', 'x', 'x', '[]',
        'published', 'four_eyes_verified', 'cung-mot-nguoi',
        'cung-mot-nguoi', '${STAMP}'
      )`)),
    rejectsWith(/invalid legal entry review metadata|four_eyes/),
  );
});

test("trigger chan provision published tren source chua xac minh", async () => {
  await db.execute(sql.raw(`
    INSERT INTO legal_sources (
      document_number, title, official_url, official_host, status, created_by
    ) VALUES (
      'draft-doc', 'Nguồn nháp', 'https://vanban.chinhphu.vn/?docid=2',
      'vanban.chinhphu.vn', 'draft', 'seed-editor'
    )`));
  await assert.rejects(
    db.execute(sql.raw(`
      INSERT INTO legal_provisions (
        source_id, original_text, simplified_text, status, created_by,
        reviewed_by, reviewed_at, revision_id, checksum_version,
        checksum_sha256, effectivity_status, effective_from
      ) VALUES (
        2, 'goc', 'don gian', 'published', 'seed-editor', 'seed-reviewer',
        '${STAMP}', 'seed-rev-2', 'provision-sha256-v1', '${CHECKSUM}',
        'in_force', '2025-01-01'
      )`)),
    rejectsWith(/published provision requires an in-force verified source/),
  );
});

test("trigger chan sua noi dung provision da co revision", async () => {
  await assert.rejects(
    db.execute(sql.raw(
      "UPDATE legal_provisions SET original_text = 'sua lai' WHERE id = 1",
    )),
    rejectsWith(/provision revision is immutable/),
  );
});

test("doi source het hieu luc thi provision published bi thu hoi", async () => {
  await db.execute(sql.raw(
    "UPDATE legal_sources SET status = 'expired', effective_to = '2026-01-01' WHERE id = 1",
  ));
  const provision = await db.execute(sql.raw(
    "SELECT status, reviewed_by FROM legal_provisions WHERE id = 1",
  ));
  assert.equal(provision.rows[0].status, "pending_review");
  assert.equal(provision.rows[0].reviewed_by, null);
  const citation = await db.execute(sql.raw(
    "SELECT review_status FROM legal_entry_citations WHERE provision_id = 1",
  ));
  assert.equal(citation.rows[0].review_status, "legacy_unverified");
});
