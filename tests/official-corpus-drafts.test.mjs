import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { registerHooks } from "node:module";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (
      specifier.startsWith(".") &&
      !specifier.match(/\.[a-z]+$/i) &&
      context.parentURL?.endsWith(".ts")
    ) {
      return nextResolve(`${specifier}.ts`, context);
    }
    return nextResolve(specifier, context);
  },
});

const {
  importOfficialCorpusDrafts,
  normalizeOfficialCorpusDraftPacket,
  OFFICIAL_CORPUS_IMPORT_POLICY_VERSION,
} = await import("../lib/official-corpus-drafts.ts");
const { classifyChatTopicScope } = await import(
  "../lib/chat-topic-scope.ts"
);
const { isOfficialGovernmentHost } = await import(
  "../lib/official-source-url.ts"
);

const packet = JSON.parse(
  await readFile(
    new URL(
      "../fixtures/rag/official-corpus-drafts.v1.json",
      import.meta.url,
    ),
    "utf8",
  ),
);
const migrationNames = [
  "0000_groovy_cerise.sql",
  "0001_citation_foundation.sql",
  "0002_reviewed_rag_bridge.sql",
  "0003_editorial_trust_primitives.sql",
  "0004_rate_limit_v1.sql",
  "0005_web_search_candidate_workflow.sql",
];
const migrations = await Promise.all(
  migrationNames.map((name) =>
    readFile(new URL(`../drizzle/${name}`, import.meta.url), "utf8"),
  ),
);

class Prepared {
  constructor(database, sql, values = []) {
    this.database = database;
    this.sql = sql;
    this.values = values;
  }

  bind(...values) {
    return new Prepared(this.database, this.sql, values);
  }

  execute() {
    return {
      success: true,
      results: this.database.prepare(this.sql).all(...this.values),
    };
  }
}

class D1Adapter {
  constructor(database) {
    this.database = database;
  }

  prepare(sql) {
    return new Prepared(this.database, sql);
  }

  async batch(statements) {
    this.database.exec("BEGIN IMMEDIATE");
    try {
      const results = statements.map((statement) => statement.execute());
      this.database.exec("COMMIT");
      return results;
    } catch (error) {
      this.database.exec("ROLLBACK");
      throw error;
    }
  }
}

function createDatabase() {
  const database = new DatabaseSync(":memory:");
  database.exec("PRAGMA foreign_keys = ON");
  for (const migration of migrations) database.exec(migration);
  return database;
}

function clone(value) {
  return structuredClone(value);
}

test("official corpus packet is complete, current and official-only", () => {
  const normalized = normalizeOfficialCorpusDraftPacket(packet);
  assert.ok(normalized);
  assert.equal(normalized.records.length, 7);
  assert.deepEqual(
    new Set(normalized.records.map((record) => record.topic)),
    new Set(["traffic", "online_safety", "copyright"]),
  );
  for (const record of normalized.records) {
    for (const citation of record.proposedSnapshot.citations) {
      assert.equal(isOfficialGovernmentHost(new URL(citation.url).hostname), true);
      assert.equal(citation.lastVerifiedAt, "2026-07-31");
      if (citation.kind === "legal_instrument") {
        assert.match(citation.documentNumber, /\S/);
        assert.match(citation.issuedAt, /^\d{4}-\d{2}-\d{2}$/);
        assert.match(citation.effectiveFrom, /^\d{4}-\d{2}-\d{2}$/);
        assert.doesNotMatch(citation.article ?? "", /^Điều\s/);
        assert.doesNotMatch(citation.clause ?? "", /^Khoản\s/);
        assert.doesNotMatch(citation.point ?? "", /^Điểm\s/);
      } else {
        assert.match(citation.publisher, /\S/);
        assert.match(citation.publishedAt, /^\d{4}-\d{2}-\d{2}$/);
      }
    }
    if (record.topic === "copyright") {
      assert.ok(
        record.proposedSnapshot.tags.some((tag) =>
          ["bản quyền", "quyền tác giả", "copyright"].includes(
            tag.toLocaleLowerCase("vi"),
          ),
        ),
      );
    }
  }
  const social = normalized.records.find(
    (record) =>
      record.intentKey === "online_safety.false_or_insulting_content",
  );
  assert.equal(
    social.proposedSnapshot.citations[0].documentNumber,
    "174/2026/NĐ-CP",
  );
  assert.equal(
    social.proposedSnapshot.citations[0].effectiveFrom,
    "2026-07-01",
  );
  const account = normalized.records.find(
    (record) => record.intentKey === "online_safety.account_compromise",
  );
  assert.equal(account.recordKind, "official_guidance");
  assert.equal(account.proposedSnapshot.citations[0].kind, "official_guidance");
  assert.doesNotMatch(
    social.proposedSnapshot.answer,
    /Điều 101|Nghị định 15\/2020|5[–-]10 triệu/i,
  );
});

test("every committed question and alias enters its contracted topic gate", () => {
  for (const record of packet.records) {
    for (const question of [record.canonicalQuestion, ...record.aliases]) {
      assert.deepEqual(classifyChatTopicScope(question), {
        inScope: true,
        topic: record.topic,
        policyVersion: "chat-topic-scope-v1",
      });
    }
  }
});

test("broad everyday phrases do not create false topic matches", () => {
  const cases = [
    "Cho tôi xem xe máy Honda nào đẹp",
    "Xe máy nào tốt cho học sinh?",
    "Xe máy kẹp điện thoại loại nào tốt?",
    "Dùng nhạc gì để tập thể dục?",
    "Dùng ảnh nào để học toán tốt hơn?",
  ];
  for (const question of cases) {
    assert.deepEqual(classifyChatTopicScope(question), {
      inScope: false,
      topic: null,
      policyVersion: "chat-topic-scope-v1",
    });
  }
  for (const question of [
    "Hãy trích bài học kinh nghiệm từ vụ tai nạn giao thông",
    "trích bài học từ vụ vượt đèn đỏ",
  ]) {
    assert.deepEqual(classifyChatTopicScope(question), {
      inScope: true,
      topic: "traffic",
      policyVersion: "chat-topic-scope-v1",
    });
  }
});

test("packet rejects a non-official source or the superseded social citation", () => {
  const nonOfficial = clone(packet);
  nonOfficial.records[0].proposedSnapshot.citations[0].url =
    "https://thuvienphapluat.vn/example";
  assert.equal(normalizeOfficialCorpusDraftPacket(nonOfficial), null);

  const superseded = clone(packet);
  const social = superseded.records.find(
    (record) =>
      record.intentKey === "online_safety.false_or_insulting_content",
  );
  social.proposedSnapshot.citations[0].documentNumber = "15/2020/NĐ-CP";
  social.proposedSnapshot.citations[0].article = "Điều 101";
  social.proposedSnapshot.citations[0].effectiveFrom = "2020-04-15";
  assert.equal(normalizeOfficialCorpusDraftPacket(superseded), null);

  const appendedOldCitation = clone(packet);
  appendedOldCitation.records.find(
    (record) =>
      record.intentKey === "online_safety.false_or_insulting_content",
  ).proposedSnapshot.citations.push({
    kind: "legal_instrument",
    title: "Nghị định 15/2020/NĐ-CP",
    url: "https://congbao.chinhphu.vn/van-ban/nghi-dinh-so-15-2020-nd-cp-30936.htm",
    documentNumber: "15/2020/NĐ-CP",
    article: "101",
    issuedAt: "2020-02-03",
    effectiveFrom: "2020-04-15",
    lastVerifiedAt: "2026-07-31",
  });
  assert.equal(normalizeOfficialCorpusDraftPacket(appendedOldCitation), null);

  const oldAmount = clone(packet);
  oldAmount.records.find(
    (record) =>
      record.intentKey === "online_safety.false_or_insulting_content",
  ).proposedSnapshot.answer = "Mức phạt cá nhân là 5 - 10 triệu đồng.";
  assert.equal(normalizeOfficialCorpusDraftPacket(oldAmount), null);
});

test("packet rejects extra fields and an intent/topic swap", () => {
  for (const mutate of [
    (value) => {
      value.rawQuestion = "dữ liệu người dùng";
    },
    (value) => {
      value.records[0].conversation = ["không được lưu"];
    },
    (value) => {
      value.records[0].proposedSnapshot.extra = true;
    },
    (value) => {
      value.records[0].proposedSnapshot.citations[0].rawText = "không hợp lệ";
    },
    (value) => {
      value.records[0].topic = "copyright";
      value.records[0].proposedSnapshot.topic = "Sở hữu trí tuệ";
    },
  ]) {
    const changed = clone(packet);
    mutate(changed);
    assert.equal(normalizeOfficialCorpusDraftPacket(changed), null);
  }
});

test("import is idempotent and creates only immutable draft intake", async () => {
  const database = createDatabase();
  const db = new D1Adapter(database);
  try {
    const first = await importOfficialCorpusDrafts(packet, { db });
    assert.deepEqual(
      {
        ok: first.ok,
        created: first.created,
        skipped: first.skipped,
        bound: first.bound,
      },
      { ok: true, created: 7, skipped: 0, bound: 0 },
    );
    assert.deepEqual(
      database
        .prepare(`
          SELECT lifecycle_status, count(*) AS count
          FROM web_search_candidates
          GROUP BY lifecycle_status
        `)
        .all()
        .map((row) => ({ ...row })),
      [{ lifecycle_status: "draft", count: 7 }],
    );
    assert.equal(
      database
        .prepare(`
          SELECT count(*) AS count
          FROM web_search_candidates
          WHERE policy_version = ?
            AND current_revision_id IS NULL
            AND editor_principal_id IS NULL
            AND reviewer_principal_id IS NULL
        `)
        .get(OFFICIAL_CORPUS_IMPORT_POLICY_VERSION).count,
      7,
    );
    assert.equal(
      database.prepare("SELECT count(*) AS count FROM web_search_candidate_sources").get()
        .count,
      11,
    );
    assert.equal(
      database
        .prepare(`
          SELECT count(*) AS count
          FROM web_search_candidate_events
          WHERE actor_role = 'system' AND action = 'draft_persisted'
        `)
        .get().count,
      7,
    );
    assert.equal(
      database
        .prepare("SELECT count(*) AS count FROM web_search_candidate_revisions")
        .get().count,
      0,
    );
    assert.equal(
      database
        .prepare("SELECT count(*) AS count FROM editorial_principals")
        .get().count,
      0,
    );
    const metadata = database
      .prepare(`
        SELECT metadata_json
        FROM web_search_candidate_events
        WHERE candidate_id = ?
      `)
      .get("a9d6f3e2-7331-4cb0-8db5-0d745b06c001").metadata_json;
    assert.ok(metadata.length <= 8_192);
    const parsedMetadata = JSON.parse(metadata);
    assert.equal(parsedMetadata.publicationEligible, true);
    assert.match(parsedMetadata.recordSha256, /^[0-9a-f]{64}$/);
    assert.ok(
      parsedMetadata.intakeDraft.tags.includes("đi xe máy tống 3"),
    );
    assert.equal("canonicalQuestion" in parsedMetadata, false);

    const guidanceMetadata = JSON.parse(
      database
        .prepare(`
          SELECT metadata_json
          FROM web_search_candidate_events
          WHERE candidate_id = ?
        `)
        .get("a9d6f3e2-7331-4cb0-8db5-0d745b06c004").metadata_json,
    );
    assert.equal(guidanceMetadata.publicationEligible, false);
    assert.equal(
      guidanceMetadata.intakeDraft.citations[0].kind,
      "official_guidance",
    );

    const second = await importOfficialCorpusDrafts(packet, { db });
    assert.deepEqual(
      {
        ok: second.ok,
        created: second.created,
        skipped: second.skipped,
        bound: second.bound,
      },
      { ok: true, created: 0, skipped: 7, bound: 0 },
    );
    assert.equal(
      database.prepare("SELECT count(*) AS count FROM web_search_candidates").get()
        .count,
      7,
    );
  } finally {
    database.close();
  }
});

test("same deterministic IDs with changed structured content fail closed", async () => {
  const database = createDatabase();
  const db = new D1Adapter(database);
  try {
    assert.equal((await importOfficialCorpusDrafts(packet, { db })).ok, true);
    const mutations = [
      (record) => {
        record.proposedSnapshot.answer += " Nội dung bị thay đổi.";
      },
      (record) => {
        record.proposedSnapshot.title += " sửa";
      },
      (record) => {
        record.proposedSnapshot.tags[0] += " sửa";
      },
      (record) => {
        record.canonicalQuestion += " sửa";
      },
      (record) => {
        record.aliases[0] += " sửa";
      },
      (record) => {
        record.reviewNotes += " sửa";
      },
      (record) => {
        record.proposedSnapshot.citations[0].article = "99";
      },
    ];
    for (const mutate of mutations) {
      const changed = clone(packet);
      mutate(changed.records[0]);
      assert.deepEqual(await importOfficialCorpusDrafts(changed, { db }), {
        ok: false,
        reason: "conflict",
      });
    }
    assert.equal(
      database.prepare("SELECT count(*) AS count FROM web_search_candidates").get()
        .count,
      7,
    );
  } finally {
    database.close();
  }
});

test("idempotency requires the immutable audit binding", async () => {
  const database = createDatabase();
  const db = new D1Adapter(database);
  try {
    assert.equal((await importOfficialCorpusDrafts(packet, { db })).ok, true);
    database.exec("DROP TRIGGER web_search_candidate_events_no_delete");
    database
      .prepare("DELETE FROM web_search_candidate_events WHERE candidate_id = ?")
      .run("a9d6f3e2-7331-4cb0-8db5-0d745b06c001");
    assert.deepEqual(await importOfficialCorpusDrafts(packet, { db }), {
      ok: false,
      reason: "conflict",
    });
  } finally {
    database.close();
  }
});

test("known legacy local intake receives a full-record binding once", async () => {
  const database = createDatabase();
  const db = new D1Adapter(database);
  const record = packet.records[0];
  try {
    const url = record.proposedSnapshot.citations[0].url;
    const urlHash = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(url),
    );
    const hash = [...new Uint8Array(urlHash)]
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
    database
      .prepare(`
        INSERT INTO web_search_candidates (
          id, request_id, content_sha256, initial_answer_text,
          provider_model, policy_version, lifecycle_status
        ) VALUES (?, ?, ?, ?, 'official-corpus-draft-v1',
                  'official-corpus-import-v1', 'draft')
      `)
      .run(
        record.candidateId,
        record.requestId,
        "e14003a28151b343a78f2febf5c44773f3098818fdcf78b78dfd4acacb036a46",
        "Cần làm rõ “tống 3” là tổng cộng ba người hay người lái chở theo ba người. Nếu xe có một người lái và chở thêm hai người, mức phạt tham khảo là 400.000–600.000 đồng, trừ trường hợp chở người bệnh đi cấp cứu, trẻ em dưới 12 tuổi, người già yếu hoặc người khuyết tật, hoặc áp giải người vi phạm pháp luật. Nếu người lái chở theo từ ba người trở lên, mức phạt tham khảo là 600.000–800.000 đồng. Cách xử lý an toàn là dừng chở quá số người và bố trí thêm phương tiện phù hợp.",
      );
    database
      .prepare(`
        INSERT INTO web_search_candidate_sources (
          candidate_id, display_order, title, official_url,
          official_host, url_sha256
        ) VALUES (?, 0, ?, ?, 'congbao.chinhphu.vn', ?)
      `)
      .run(
        record.candidateId,
        record.proposedSnapshot.citations[0].title,
        url,
        hash,
      );
    database
      .prepare(`
        INSERT INTO web_search_candidate_events (
          id, operation_id, candidate_id, actor_role, action, metadata_json
        ) VALUES (?, ?, ?, 'system', 'draft_persisted', ?)
      `)
      .run(
        `b${record.candidateId.slice(1)}`,
        `official-corpus:${record.requestId}`,
        record.candidateId,
        JSON.stringify({
          packetId: packet.packetId,
          intentKey: record.intentKey,
          sourceCount: 1,
        }),
      );

    const upgraded = await importOfficialCorpusDrafts(packet, { db });
    assert.deepEqual(
      {
        ok: upgraded.ok,
        created: upgraded.created,
        skipped: upgraded.skipped,
        bound: upgraded.bound,
      },
      { ok: true, created: 6, skipped: 1, bound: 1 },
    );
    assert.equal(
      database
        .prepare(`
          SELECT count(*) AS count
          FROM web_search_candidate_events
          WHERE candidate_id = ?
        `)
        .get(record.candidateId).count,
      2,
    );
    const rerun = await importOfficialCorpusDrafts(packet, { db });
    assert.deepEqual(
      {
        ok: rerun.ok,
        created: rerun.created,
        skipped: rerun.skipped,
        bound: rerun.bound,
      },
      { ok: true, created: 0, skipped: 7, bound: 0 },
    );
  } finally {
    database.close();
  }
});
