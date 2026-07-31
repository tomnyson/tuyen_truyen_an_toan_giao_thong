import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";

// scripts/seed-d1.mjs đăng ký hook trỏ cloudflare:workers tới
// globalThis.__workerEnvStub (hook đăng ký sau chạy trước) — test dùng chung
// object đó để gắn binding DB giả.
const workerEnv = (globalThis.__workerEnvStub ??= {});
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "cloudflare:workers") {
      return {
        shortCircuit: true,
        url: "data:text/javascript,globalThis.__workerEnvStub ??= {}; export const env = globalThis.__workerEnvStub;",
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

const { buildSeedSql, validateSeedContent } = await import(
  "../scripts/seed-d1.mjs"
);
const seedContent = (await import("../db/seeds/seed-content.v1.mjs")).default;
const { computeProvisionChecksum, PROVISION_CHECKSUM_VERSION } = await import(
  "../lib/legal-evidence-retriever.ts"
);
const { getInitializedDb } = await import("../db/index.ts");

function d1Adapter(sqlite) {
  return {
    prepare(query) {
      const bound = [];
      const statement = {
        bind(...values) {
          bound.push(...values);
          return statement;
        },
        _exec() {
          if (/^\s*select/i.test(query)) {
            return { success: true, results: sqlite.prepare(query).all(...bound) };
          }
          sqlite.prepare(query).run(...bound);
          return { success: true, results: [] };
        },
      };
      return statement;
    },
    async batch(statements) {
      return statements.map((statement) => statement._exec());
    },
  };
}

// getInitializedDb cache promise bootstrap ở mức module — chỉ bootstrap được
// MỘT DB mỗi tiến trình test, nên toàn bộ test dùng chung sqlite này.
const sqlite = new DatabaseSync(":memory:");
workerEnv.DB = d1Adapter(sqlite);
await getInitializedDb();

const FIXED_NOW = () => new Date("2026-07-31T00:00:00Z");

test("noi dung seed hop le va du 27 tinh huong, 9 moi chu de", () => {
  assert.deepEqual(validateSeedContent(seedContent), []);
  assert.equal(seedContent.situations.length, 27);
  const perTopic = new Map();
  for (const situation of seedContent.situations) {
    perTopic.set(situation.topic, (perTopic.get(situation.topic) ?? 0) + 1);
  }
  assert.deepEqual([...perTopic.values()], [9, 9, 9]);
});

test("validate chan noi dung xau", () => {
  const bad = {
    seedContentVersion: "seed-content-v1",
    situations: [
      {
        ...seedContent.situations[0],
        slug: "bad-blocklist",
        legalBasis: "Nghị định 131/2013/NĐ-CP",
      },
      {
        ...seedContent.situations[1],
        slug: "bad-host",
        source: {
          ...seedContent.situations[1].source,
          officialUrl: "https://thuvienphapluat.vn/x",
        },
      },
      { ...seedContent.situations[2], slug: "bad-topic", topic: "Khác" },
    ],
  };
  const errors = validateSeedContent(bad);
  assert.equal(errors.length, 3);
});

test("seed ap duoc, dung so luong, idempotent", async () => {
  const sql = await buildSeedSql(seedContent, { now: FIXED_NOW });
  sqlite.exec(sql);
  sqlite.exec(sql); // lần 2 không được nhân đôi
  const count = (table) =>
    sqlite.prepare(`SELECT count(*) AS n FROM ${table}`).get().n;
  assert.equal(count("legal_entries"), 27);
  assert.equal(count("legal_entry_citations"), 27);
  assert.equal(count("legal_provisions"), 27);
  const uniqueDocs = new Set(
    seedContent.situations.map((situation) => situation.source.documentNumber),
  );
  assert.equal(count("legal_sources"), uniqueDocs.size);
  assert.equal(
    sqlite
      .prepare(
        "SELECT count(*) AS n FROM legal_entries WHERE status='published' AND review_status='four_eyes_verified'",
      )
      .get().n,
    27,
  );
  assert.equal(
    sqlite.prepare("PRAGMA integrity_check").get().integrity_check,
    "ok",
  );
  assert.equal(sqlite.prepare("PRAGMA foreign_key_check").all().length, 0);
  const helmet = sqlite
    .prepare("SELECT title FROM legal_entries WHERE title LIKE '%mũ bảo hiểm%'")
    .all();
  assert.ok(helmet.length >= 1);
});

test("checksum khop computeProvisionChecksum cua app", async () => {
  // chạy sau test idempotent, dùng chung DB đã seed
  const rows = sqlite
    .prepare(
      `SELECT p.article, p.clause, p.point, p.original_text, p.simplified_text,
              p.revision_id, p.checksum_version, p.checksum_sha256,
              p.effectivity_status, p.effective_from, p.effective_to,
              s.document_number, s.official_url,
              c.cited_checksum_sha256, c.cited_revision_id
       FROM legal_provisions p
       JOIN legal_sources s ON s.id = p.source_id
       JOIN legal_entry_citations c ON c.provision_id = p.id`,
    )
    .all();
  assert.equal(rows.length, 27);
  for (const row of rows) {
    assert.equal(row.checksum_version, PROVISION_CHECKSUM_VERSION);
    const expected = await computeProvisionChecksum({
      source: {
        documentNumber: row.document_number,
        officialUrl: row.official_url,
      },
      provision: {
        revisionId: row.revision_id,
        checksumVersion: row.checksum_version,
        article: row.article,
        clause: row.clause,
        point: row.point,
        originalText: row.original_text,
        simplifiedText: row.simplified_text,
        effectivityStatus: row.effectivity_status,
        effectiveFrom: row.effective_from,
        effectiveTo: row.effective_to,
      },
    });
    assert.equal(row.checksum_sha256, expected);
    assert.equal(row.cited_checksum_sha256, expected);
    assert.equal(row.cited_revision_id, row.revision_id);
  }
});
