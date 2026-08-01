import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { registerHooks } from "node:module";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

const workerEnv = {};
globalThis.__webCandidateWorkerEnv = workerEnv;

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "cloudflare:workers") {
      return {
        shortCircuit: true,
        url: "data:text/javascript,export const env = globalThis.__webCandidateWorkerEnv",
      };
    }
    if (specifier.startsWith("@/")) {
      return {
        shortCircuit: true,
        url: new URL(`../${specifier.slice(2)}.ts`, import.meta.url).href,
      };
    }
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
  findReviewedWebCandidate,
  listWebSearchCandidates,
  normalizeReviewedCandidateSnapshot,
  persistWebSearchCandidate,
  reserveWebSearchBudget,
  reviewedCandidateMatchesChatTopic,
  resolveEditorialActor,
  saveWebSearchCandidateRevision,
  settleWebSearchBudget,
  transitionWebSearchCandidate,
} = await import("../lib/web-search-candidates.ts");
const { adminCookieName, createAdminSession } = await import(
  "../lib/admin-auth.ts"
);
const candidateRoute = await import(
  "../app/admin/api/web-search-candidates/route.ts"
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
const candidateMigration = migrations.at(-1);

test("copyright scope requires a reviewed copyright subtype, not broad intellectual property", () => {
  const base = {
    topic: "Sở hữu trí tuệ",
    title: "Nội dung",
    answer: "Nội dung",
    citations: [],
  };
  assert.equal(
    reviewedCandidateMatchesChatTopic(
      { ...base, tags: ["sáng chế", "nhãn hiệu"] },
      "copyright",
    ),
    false,
  );
  assert.equal(
    reviewedCandidateMatchesChatTopic(
      { ...base, tags: ["Bản quyền học đường"] },
      "copyright",
    ),
    true,
  );
});

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
    const statement = this.database.prepare(this.sql);
    const results = statement.all(...this.values);
    return { success: true, results };
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
  database.exec(`
    INSERT INTO editorial_principals (id, display_name) VALUES
      ('admin-a', 'Admin A'),
      ('editor-a', 'Editor A'),
      ('reviewer-a', 'Reviewer A');
    INSERT INTO editorial_role_grants (
      id, principal_id, role, granted_by_principal_id
    ) VALUES
      ('admin-grant', 'admin-a', 'admin', 'admin-a'),
      ('editor-grant', 'editor-a', 'editor', 'admin-a'),
      ('reviewer-grant', 'reviewer-a', 'reviewer', 'admin-a');
  `);
  return database;
}

function uuidSequence() {
  let value = 1;
  return () => `00000000-0000-4000-8000-${String(value++).padStart(12, "0")}`;
}

function validSearchResult() {
  return {
    ok: true,
    sourceKind: "official",
    answer:
      "Khi đi xe máy, học sinh phải đội mũ bảo hiểm và cài quai đúng cách.",
    warning: "Chưa kiểm duyệt",
    model: "gpt-5.4-mini-2026-03-17",
    sources: [
      {
        title: "Văn bản Chính phủ về mũ bảo hiểm",
        url: "https://vanban.chinhphu.vn/quy-dinh-mu-bao-hiem",
      },
    ],
    usage: { inputTokens: 8000, outputTokens: 200, totalTokens: 8200 },
  };
}

function validSnapshot() {
  return {
    topic: "Giao thông",
    title: "Đội mũ bảo hiểm khi đi xe máy",
    answer:
      "Khi đi xe máy, học sinh phải đội mũ bảo hiểm và cài quai đúng cách.",
    tags: ["mũ bảo hiểm", "xe máy"],
    citations: [
      {
        title: "Văn bản Chính phủ về mũ bảo hiểm",
        url: "https://vanban.chinhphu.vn/quy-dinh-mu-bao-hiem",
        documentNumber: "NĐ-TEST/2026",
        article: "Điều 1",
        issuedAt: "2025-12-01",
        effectiveFrom: "2026-01-01",
        lastVerifiedAt: "2026-07-31",
      },
    ],
  };
}

test("legacy reviewed snapshots stay retrievable while new revisions require issuedAt", () => {
  const legacy = validSnapshot();
  delete legacy.citations[0].issuedAt;
  assert.ok(normalizeReviewedCandidateSnapshot(legacy));
  assert.equal(
    normalizeReviewedCandidateSnapshot(legacy, undefined, {
      requireIssuedAt: true,
    }),
    null,
  );
});

test("0005 is idempotent, append-only and contains no raw-question field", () => {
  const database = createDatabase();
  try {
    database.exec(candidateMigration);
    assert.equal(database.prepare("PRAGMA integrity_check").get().integrity_check, "ok");
    const tableSql = database.prepare(`
      SELECT group_concat(sql, ' ') AS sql FROM sqlite_master
      WHERE name LIKE 'web_search_%'
    `).get().sql;
    assert.doesNotMatch(tableSql, /raw_question|question_text|messages/i);
    assert.match(tableSql, /web_search_candidates_no_delete/i);
    assert.match(tableSql, /independent active reviewer required/i);
  } finally {
    database.close();
  }
});

test("web result persists as draft, passes four-eyes and enters reviewed retrieval", async () => {
  const database = createDatabase();
  const db = new D1Adapter(database);
  const randomUUID = uuidSequence();
  Object.assign(workerEnv, {
    DB: db,
    AI_WEB_SEARCH_DAILY_TOKEN_BUDGET: "500000",
    AI_WEB_SEARCH_RESERVATION_TOKENS: "12000",
  });
  try {
    const reservation = await reserveWebSearchBudget({
      db,
      now: () => Date.UTC(2026, 6, 31),
    });
    assert.deepEqual(reservation, {
      dayStart: Math.floor(Date.UTC(2026, 6, 31) / 1000 / 86400) * 86400,
      reservedTokens: 12000,
    });
    assert.equal(
      await settleWebSearchBudget(reservation, 8200, { db }),
      true,
    );

    const candidateId = await persistWebSearchCandidate(
      "11111111-1111-4111-8111-111111111111",
      validSearchResult(),
      "traffic",
      { db, randomUUID },
    );
    assert.ok(candidateId);
    const stored = database.prepare(`
      SELECT lifecycle_status, initial_answer_text, current_revision_id
      FROM web_search_candidates WHERE id = ?
    `).get(candidateId);
    assert.equal(stored.lifecycle_status, "draft");
    assert.equal(stored.current_revision_id, null);
    assert.match(stored.initial_answer_text, /mũ bảo hiểm/);

    const editor = await resolveEditorialActor("editor-a", "editor", { db });
    const reviewer = await resolveEditorialActor("reviewer-a", "reviewer", { db });
    assert.deepEqual(editor.roles, ["editor"]);
    assert.deepEqual(reviewer.roles, ["reviewer"]);

    const revision = await saveWebSearchCandidateRevision(
      editor,
      candidateId,
      0,
      validSnapshot(),
      { db, randomUUID },
    );
    assert.equal(revision.optimisticVersion, 1);
    assert.equal(
      await transitionWebSearchCandidate(
        editor,
        candidateId,
        1,
        "submit",
        undefined,
        { db, randomUUID },
      ).then((value) => value.optimisticVersion),
      2,
    );
    assert.equal(
      await transitionWebSearchCandidate(
        editor,
        candidateId,
        2,
        "approve",
        undefined,
        { db, randomUUID },
      ),
      null,
    );
    assert.equal(
      await transitionWebSearchCandidate(
        reviewer,
        candidateId,
        2,
        "approve",
        undefined,
        { db, randomUUID },
      ).then((value) => value.optimisticVersion),
      3,
    );

    const reviewed = await findReviewedWebCandidate(
      "Học sinh đi xe máy có phải đội mũ bảo hiểm không?",
      { db, now: () => Date.UTC(2026, 6, 31) },
    );
    assert.equal(reviewed.candidateId, candidateId);
    assert.deepEqual(reviewed.sources, [
      {
        title: "Văn bản Chính phủ về mũ bảo hiểm",
        url: "https://vanban.chinhphu.vn/quy-dinh-mu-bao-hiem",
      },
    ]);
    assert.equal(
      await findReviewedWebCandidate(
        "Học sinh đi xe máy có phải đội mũ bảo hiểm không?",
        "copyright",
        { db, now: () => Date.UTC(2026, 6, 31) },
      ),
      null,
    );

    const listed = await listWebSearchCandidates({ db });
    assert.equal(listed.candidates.length, 1);
    assert.equal(listed.revisions.length, 1);
    assert.equal(listed.events.length, 4);

    await transitionWebSearchCandidate(
      reviewer,
      candidateId,
      3,
      "archive",
      undefined,
      { db, randomUUID },
    );
    assert.equal(
      await findReviewedWebCandidate("đội mũ bảo hiểm xe máy", {
        db,
        now: () => Date.UTC(2026, 6, 31),
      }),
      null,
    );
    assert.throws(
      () =>
        database.prepare(
          "DELETE FROM web_search_candidates WHERE id = ?",
        ).run(candidateId),
      /cannot be deleted/,
    );
  } finally {
    database.close();
    for (const key of Object.keys(workerEnv)) delete workerEnv[key];
  }
});

test("revision rejects a URL not present in immutable intake sources", async () => {
  const database = createDatabase();
  const db = new D1Adapter(database);
  const randomUUID = uuidSequence();
  try {
    const candidateId = await persistWebSearchCandidate(
      "22222222-2222-4222-8222-222222222222",
      validSearchResult(),
      "traffic",
      { db, randomUUID },
    );
    const editor = await resolveEditorialActor("editor-a", "editor", { db });
    const snapshot = validSnapshot();
    snapshot.citations[0].url = "https://vbpl.vn/another-document";
    assert.equal(
      await saveWebSearchCandidateRevision(
        editor,
        candidateId,
        0,
        snapshot,
        { db, randomUUID },
      ),
      null,
    );
  } finally {
    database.close();
  }
});

test("candidate persistence rejects reference results even with an official-looking URL", async () => {
  const database = createDatabase();
  const db = new D1Adapter(database);
  try {
    assert.equal(
      await persistWebSearchCandidate(
        "22222222-2222-4222-8222-222222222222",
        {
          ...validSearchResult(),
          sourceKind: "reference",
        },
        "traffic",
        { db, randomUUID: uuidSequence() },
      ),
      null,
    );
    assert.equal(
      database.prepare("SELECT COUNT(*) AS count FROM web_search_candidates").get()
        .count,
      0,
    );
  } finally {
    database.close();
  }
});

test("authenticated API enforces editor-to-independent-reviewer workflow", async () => {
  const database = createDatabase();
  const db = new D1Adapter(database);
  const randomUUID = uuidSequence();
  Object.assign(workerEnv, {
    DB: db,
    ADMIN_ACCOUNTS_JSON: JSON.stringify([
      {
        username: "editor",
        passwordHash: "test-hash-editor",
        principalId: "editor-a",
      },
      {
        username: "reviewer",
        passwordHash: "test-hash-reviewer",
        principalId: "reviewer-a",
      },
    ]),
    ADMIN_SESSION_SECRET: "test-session-secret-at-least-32-characters",
  });
  try {
    const candidateId = await persistWebSearchCandidate(
      "33333333-3333-4333-8333-333333333333",
      validSearchResult(),
      "traffic",
      { db, randomUUID },
    );
    const editorSession = await createAdminSession("editor");
    const reviewerSession = await createAdminSession("reviewer");
    const request = (token, body) =>
      new Request(
        "https://example.test/admin/api/web-search-candidates",
        {
          method: body ? "PATCH" : "GET",
          headers: {
            cookie: `${adminCookieName}=${encodeURIComponent(token)}`,
            origin: "https://example.test",
            ...(body ? { "content-type": "application/json" } : {}),
          },
          body: body ? JSON.stringify(body) : undefined,
        },
      );

    const listResponse = await candidateRoute.GET(
      request(editorSession.token),
    );
    assert.equal(listResponse.status, 200);
    const listed = await listResponse.json();
    assert.deepEqual(listed.actor.roles, ["editor"]);
    assert.equal(listed.candidates[0].status, "draft");

    const saveResponse = await candidateRoute.PATCH(
      request(editorSession.token, {
        action: "save_revision",
        candidateId,
        expectedVersion: 0,
        snapshot: validSnapshot(),
      }),
    );
    assert.equal(saveResponse.status, 200);
    const submitResponse = await candidateRoute.PATCH(
      request(editorSession.token, {
        action: "submit",
        candidateId,
        expectedVersion: 1,
      }),
    );
    assert.equal(submitResponse.status, 200);
    const selfApprove = await candidateRoute.PATCH(
      request(editorSession.token, {
        action: "approve",
        candidateId,
        expectedVersion: 2,
      }),
    );
    assert.equal(selfApprove.status, 409);

    const approveResponse = await candidateRoute.PATCH(
      request(reviewerSession.token, {
        action: "approve",
        candidateId,
        expectedVersion: 2,
      }),
    );
    assert.equal(approveResponse.status, 200);
    assert.equal(
      database.prepare(`
        SELECT lifecycle_status FROM web_search_candidates WHERE id = ?
      `).get(candidateId).lifecycle_status,
      "published",
    );

    const spoofedActor = await candidateRoute.PATCH(
      request(reviewerSession.token, {
        action: "archive",
        candidateId,
        expectedVersion: 3,
        principalId: "admin-a",
      }),
    );
    assert.equal(spoofedActor.status, 400);
  } finally {
    database.close();
    for (const key of Object.keys(workerEnv)) delete workerEnv[key];
  }
});
