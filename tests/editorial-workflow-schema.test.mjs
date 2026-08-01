import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

const repositoryRoot = new URL("../", import.meta.url);
const [
  baseline,
  citationMigration,
  reviewedGraphMigration,
  editorialMigration,
  drizzleSchema,
  bootstrap,
  journalText,
] =
  await Promise.all([
    readFile(new URL("drizzle/0000_groovy_cerise.sql", repositoryRoot), "utf8"),
    readFile(
      new URL("drizzle/0001_citation_foundation.sql", repositoryRoot),
      "utf8",
    ),
    readFile(
      new URL("drizzle/0002_reviewed_rag_bridge.sql", repositoryRoot),
      "utf8",
    ),
    readFile(
      new URL("drizzle/0003_editorial_trust_primitives.sql", repositoryRoot),
      "utf8",
    ),
    readFile(new URL("db/schema.ts", repositoryRoot), "utf8"),
    readFile(new URL("db/index.ts", repositoryRoot), "utf8"),
    readFile(new URL("drizzle/meta/_journal.json", repositoryRoot), "utf8"),
  ]);
const journal = JSON.parse(journalText);

const editorialTables = [
  "editorial_principals",
  "editorial_role_grants",
  "editorial_subjects",
  "editorial_revisions",
  "editorial_review_requests",
  "editorial_review_decisions",
  "editorial_audit_events",
];

function createBaselineDatabase() {
  const database = new DatabaseSync(":memory:");
  database.exec("PRAGMA foreign_keys = ON");
  database.exec(baseline);
  return database;
}

function createDatabase() {
  const database = createBaselineDatabase();
  database.exec(citationMigration);
  database.exec(reviewedGraphMigration);
  database.exec(editorialMigration);
  return database;
}

function withDatabase(run) {
  const database = createDatabase();
  try {
    run(database);
  } finally {
    database.close();
  }
}

function seedPrincipals(database) {
  database.exec(`
    INSERT INTO editorial_principals (id, display_name, status) VALUES
      ('admin-a', 'Admin A', 'active'),
      ('editor-a', 'Editor A', 'active'),
      ('editor-b', 'Editor B', 'active'),
      ('reviewer-a', 'Reviewer A', 'active'),
      ('reviewer-disabled', 'Reviewer Disabled', 'active'),
      ('reviewer-no-role', 'Reviewer No Role', 'active');

    INSERT INTO editorial_role_grants (
      id, principal_id, role, granted_by_principal_id
    ) VALUES
      ('grant-admin-a', 'admin-a', 'admin', 'admin-a'),
      ('grant-editor-a', 'editor-a', 'editor', 'admin-a'),
      ('grant-editor-b', 'editor-b', 'editor', 'admin-a'),
      ('grant-reviewer-a', 'reviewer-a', 'reviewer', 'admin-a'),
      (
        'grant-reviewer-disabled', 'reviewer-disabled', 'reviewer', 'admin-a'
      );

    UPDATE editorial_principals
    SET status = 'disabled'
    WHERE id = 'reviewer-disabled';
  `);
}

function seedDraft(database, suffix, {
  subjectCreator = "editor-a",
  revisionCreator = "editor-a",
} = {}) {
  const subjectId = `subject-${suffix}`;
  const revisionId = `revision-${suffix}-1`;

  database.prepare(`
    INSERT INTO editorial_subjects (
      id, entity_type, entity_key, created_by_principal_id
    ) VALUES (?, 'legal_entry', ?, ?)
  `).run(subjectId, `entry:${suffix}`, subjectCreator);

  database.prepare(`
    INSERT INTO editorial_revisions (
      id, subject_id, version, canonical_snapshot_json,
      snapshot_sha256, created_by_principal_id
    ) VALUES (?, ?, 1, ?, ?, ?)
  `).run(
    revisionId,
    subjectId,
    JSON.stringify({ title: `Draft ${suffix}` }),
    "a".repeat(64),
    revisionCreator,
  );

  database.prepare(`
    UPDATE editorial_subjects
    SET current_revision_id = ?,
        optimistic_version = optimistic_version + 1
    WHERE id = ?
  `).run(revisionId, subjectId);

  return { subjectId, revisionId };
}

function submit(database, suffix, subjectId, revisionId, submitter = "editor-a") {
  const requestId = `request-${suffix}`;
  database.prepare(`
    INSERT INTO editorial_review_requests (
      id, operation_id, subject_id, revision_id, submitted_by_principal_id
    ) VALUES (?, ?, ?, ?, ?)
  `).run(requestId, `operation-submit-${suffix}`, subjectId, revisionId, submitter);
  return requestId;
}

function decide(
  database,
  suffix,
  requestId,
  revisionId,
  decision = "approve",
  reviewer = "reviewer-a",
  reason = null,
) {
  database.prepare(`
    INSERT INTO editorial_review_decisions (
      id, operation_id, review_request_id, revision_id,
      reviewer_principal_id, decision, reason
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    `decision-${suffix}`,
    `operation-decision-${suffix}`,
    requestId,
    revisionId,
    reviewer,
    decision,
    reason,
  );
}

test("Drizzle and journal retain 0003 without runtime bootstrap activation", () => {
  for (const table of editorialTables) {
    assert.match(
      drizzleSchema,
      new RegExp(`sqliteTable\\(\\s*[\"']${table}[\"']`),
    );
    assert.match(
      editorialMigration,
      new RegExp(`CREATE TABLE IF NOT EXISTS [\`\"]${table}[\`\"]`, "i"),
    );
  }
  assert.equal(journal.entries[3]?.idx, 3);
  assert.equal(
    journal.entries[3]?.tag,
    "0003_editorial_trust_primitives",
  );
  assert.equal(journal.entries.at(-1)?.idx, 6);
  assert.equal(
    journal.entries.at(-1)?.tag,
    "0006_petite_lady_deathstrike",
  );
  assert.doesNotMatch(bootstrap, /0003_editorial_trust_primitives|editorialTrust/);
  for (const table of editorialTables) {
    assert.doesNotMatch(
      bootstrap,
      new RegExp(`CREATE TABLE IF NOT EXISTS ${table}\\b`, "i"),
    );
  }
  assert.doesNotMatch(
    editorialMigration,
    /\b(password|credential|session|api[_ -]?key|backfill|promot(?:e|ion))\b/i,
  );
  assert.doesNotMatch(editorialMigration, /\b(INSERT|UPDATE|DELETE)\s+`?legal_/i);
});

test("0000 to 0003 migration preserves legacy content and adds an empty sidecar", () => {
  const database = createBaselineDatabase();
  try {
    database.exec(`
      INSERT INTO legal_entries (
        topic, title, legal_basis, penalty, remedy, case_study, status
      ) VALUES (
        'traffic', 'Legacy entry', 'Legacy basis', 'Legacy penalty',
        'Legacy remedy', 'Legacy case', 'published'
      );
      INSERT INTO showcases (topic, title, summary, status)
      VALUES ('traffic', 'Legacy showcase', 'Legacy summary', 'published');
    `);
    const before = database.prepare(`
      SELECT topic, title, legal_basis, penalty, remedy, case_study, status
      FROM legal_entries
    `).get();

    database.exec(citationMigration);
    database.exec(reviewedGraphMigration);
    database.exec(editorialMigration);

    assert.deepEqual(
      database.prepare(`
        SELECT topic, title, legal_basis, penalty, remedy, case_study, status
        FROM legal_entries
      `).get(),
      before,
    );
    for (const table of editorialTables) {
      assert.equal(
        database.prepare(`SELECT count(*) AS count FROM ${table}`).get().count,
        0,
      );
    }
    assert.deepEqual(database.prepare("PRAGMA foreign_key_check").all(), []);
  } finally {
    database.close();
  }
});

test("0003 is expand-only and idempotent", () => withDatabase((database) => {
  database.exec(editorialMigration);
  const tables = database.prepare(`
    SELECT name FROM sqlite_master
    WHERE type = 'table' AND name LIKE 'editorial_%'
    ORDER BY name
  `).all().map(({ name }) => name);
  assert.deepEqual(tables, [...editorialTables].sort());
  assert.equal(database.prepare("PRAGMA integrity_check").get().integrity_check, "ok");
}));

test("principal and role administration is one-way and admin-gated", () =>
  withDatabase((database) => {
    database.exec(`
      INSERT INTO editorial_principals (id, display_name) VALUES
        ('bootstrap-admin', 'Bootstrap Admin'),
        ('plain-editor', 'Plain Editor');
    `);

    assert.throws(
      () => database.exec(`
        INSERT INTO editorial_role_grants (
          id, principal_id, role, granted_by_principal_id
        ) VALUES (
          'invalid-first-grant', 'plain-editor', 'editor', 'plain-editor'
        )
      `),
      /active admin grantor/,
    );

    database.exec(`
      INSERT INTO editorial_role_grants (
        id, principal_id, role, granted_by_principal_id
      ) VALUES (
        'bootstrap-admin-grant', 'bootstrap-admin', 'admin', 'bootstrap-admin'
      );
      INSERT INTO editorial_role_grants (
        id, principal_id, role, granted_by_principal_id
      ) VALUES (
        'plain-editor-grant', 'plain-editor', 'editor', 'bootstrap-admin'
      );
    `);

    assert.throws(
      () => database.exec(`
        INSERT INTO editorial_role_grants (
          id, principal_id, role, granted_by_principal_id
        ) VALUES (
          'editor-self-reviewer', 'plain-editor', 'reviewer', 'plain-editor'
        )
      `),
      /active admin grantor/,
    );

    database.exec(`
      UPDATE editorial_principals
      SET external_subject = 'idp:plain-editor'
      WHERE id = 'plain-editor';
    `);
    assert.throws(
      () => database.exec(`
        UPDATE editorial_principals
        SET external_subject = 'idp:rebound'
        WHERE id = 'plain-editor'
      `),
      /external subject is immutable/,
    );

    database.exec(`
      UPDATE editorial_principals
      SET status = 'disabled'
      WHERE id = 'plain-editor';
    `);
    assert.throws(
      () => database.exec(`
        UPDATE editorial_principals
        SET status = 'disabled'
        WHERE id = 'bootstrap-admin'
      `),
      /last active editorial admin/,
    );
    assert.throws(
      () => database.exec(`
        UPDATE editorial_principals
        SET status = 'active'
        WHERE id = 'plain-editor'
      `),
      /cannot be re-enabled/,
    );
    assert.throws(
      () => database.exec(`
        DELETE FROM editorial_principals WHERE id = 'plain-editor'
      `),
      /editorial principal is immutable/,
    );

    assert.throws(
      () => database.exec(`
        UPDATE editorial_role_grants
        SET principal_id = 'bootstrap-admin'
        WHERE id = 'plain-editor-grant'
      `),
      /role grant identity is immutable/,
    );

    database.exec(`
      UPDATE editorial_role_grants
      SET revoked_by_principal_id = 'bootstrap-admin'
      WHERE id = 'plain-editor-grant';
    `);
    assert.ok(
      database.prepare(`
        SELECT revoked_at FROM editorial_role_grants
        WHERE id = 'plain-editor-grant'
      `).get().revoked_at,
    );
    assert.throws(
      () => database.exec(`
        UPDATE editorial_role_grants
        SET revoked_by_principal_id = NULL, revoked_at = NULL
        WHERE id = 'plain-editor-grant'
      `),
      /role grant revocation is invalid/,
    );
    assert.throws(
      () => database.exec(`
        DELETE FROM editorial_role_grants WHERE id = 'plain-editor-grant'
      `),
      /role grant is immutable/,
    );
  }));

test("revision creation requires the active creator, contiguous version and draft state", () =>
  withDatabase((database) => {
    seedPrincipals(database);

    for (const [id, creator, lifecycle, optimisticVersion] of [
      ["subject-disabled-creator", "reviewer-disabled", "draft", 0],
      ["subject-no-role-creator", "reviewer-no-role", "draft", 0],
      ["subject-published-insert", "editor-a", "published", 0],
      ["subject-version-99", "editor-a", "draft", 99],
    ]) {
      assert.throws(
        () => database.prepare(`
          INSERT INTO editorial_subjects (
            id, entity_type, entity_key, created_by_principal_id,
            lifecycle_status, optimistic_version
          ) VALUES (?, 'legal_entry', ?, ?, ?, ?)
        `).run(id, `entry:${id}`, creator, lifecycle, optimisticVersion),
        /subject requires an active editor creator/,
      );
    }

    database.exec(`
      INSERT INTO editorial_subjects (
        id, entity_type, entity_key, created_by_principal_id
      ) VALUES ('subject-revision-guard', 'legal_entry', 'entry:guard', 'editor-a');
    `);

    assert.throws(
      () => database.prepare(`
        INSERT INTO editorial_revisions (
          id, subject_id, version, canonical_snapshot_json,
          snapshot_sha256, created_by_principal_id
        ) VALUES (
          'revision-skip', 'subject-revision-guard', 2, '{}', ?, 'editor-a'
        )
      `).run("a".repeat(64)),
      /requires the active subject creator/,
    );
    assert.throws(
      () => database.prepare(`
        INSERT INTO editorial_revisions (
          id, subject_id, version, canonical_snapshot_json,
          snapshot_sha256, created_by_principal_id
        ) VALUES (
          'revision-other-editor', 'subject-revision-guard', 1, '{}', ?, 'editor-b'
        )
      `).run("a".repeat(64)),
      /requires the active subject creator/,
    );

    database.prepare(`
      INSERT INTO editorial_revisions (
        id, subject_id, version, canonical_snapshot_json,
        snapshot_sha256, created_by_principal_id
      ) VALUES (
        'revision-guard-1', 'subject-revision-guard', 1, '{}', ?, 'editor-a'
      )
    `).run("a".repeat(64));

    assert.throws(
      () => database.exec(`
        UPDATE editorial_subjects
        SET current_revision_id = 'revision-guard-1'
        WHERE id = 'subject-revision-guard'
      `),
      /invalid editorial subject state transition/,
    );
    database.exec(`
      UPDATE editorial_subjects
      SET current_revision_id = 'revision-guard-1',
          optimistic_version = optimistic_version + 1
      WHERE id = 'subject-revision-guard';
    `);
    assert.throws(
      () => database.exec(`
        UPDATE editorial_subjects
        SET entity_key = 'entry:rebound'
        WHERE id = 'subject-revision-guard'
      `),
      /subject identity is immutable/,
    );
    assert.throws(
      () => database.exec(`
        UPDATE editorial_subjects
        SET lifecycle_status = 'published',
            optimistic_version = optimistic_version + 1
        WHERE id = 'subject-revision-guard'
      `),
      /invalid editorial subject state transition/,
    );
  }));

test("submit and approve atomically update state and create derived audit events", () =>
  withDatabase((database) => {
    seedPrincipals(database);
    const { subjectId, revisionId } = seedDraft(database, "approve");
    const requestId = submit(database, "approve", subjectId, revisionId);

    assert.deepEqual(
      { ...database.prepare(`
        SELECT lifecycle_status, optimistic_version
        FROM editorial_subjects WHERE id = ?
      `).get(subjectId) },
      { lifecycle_status: "pending_review", optimistic_version: 2 },
    );
    assert.deepEqual(
      { ...database.prepare(`
        SELECT action, actor_principal_id, actor_role
        FROM editorial_audit_events WHERE operation_id = ?
      `).get("operation-submit-approve") },
      {
        action: "review_submitted",
        actor_principal_id: "editor-a",
        actor_role: "editor",
      },
    );

    decide(database, "approve", requestId, revisionId);

    const request = database.prepare(`
      SELECT status, decided_at FROM editorial_review_requests WHERE id = ?
    `).get(requestId);
    assert.equal(request.status, "approved");
    assert.ok(request.decided_at);
    const decision = database.prepare(`
      SELECT decision, decided_at FROM editorial_review_decisions
      WHERE id = 'decision-approve'
    `).get();
    assert.equal(decision.decision, "approve");
    assert.ok(decision.decided_at);
    assert.deepEqual(
      { ...database.prepare(`
        SELECT lifecycle_status, optimistic_version
        FROM editorial_subjects WHERE id = ?
      `).get(subjectId) },
      { lifecycle_status: "published", optimistic_version: 3 },
    );
    assert.deepEqual(
      { ...database.prepare(`
        SELECT action, actor_principal_id, actor_role
        FROM editorial_audit_events WHERE operation_id = ?
      `).get("operation-decision-approve") },
      {
        action: "review_approved",
        actor_principal_id: "reviewer-a",
        actor_role: "reviewer",
      },
    );
    assert.equal(
      database.prepare("SELECT count(*) AS count FROM editorial_audit_events").get()
        .count,
      2,
    );
  }));

test("reject requires a reason and atomically returns the subject to draft", () =>
  withDatabase((database) => {
    seedPrincipals(database);
    const { subjectId, revisionId } = seedDraft(database, "reject");
    const requestId = submit(database, "reject", subjectId, revisionId);

    assert.throws(
      () => decide(database, "reject-empty", requestId, revisionId, "reject", "reviewer-a", " "),
      /editorial_review_decisions_reject_reason_check/,
    );
    assert.equal(
      database.prepare("SELECT count(*) AS count FROM editorial_review_decisions")
        .get().count,
      0,
    );

    decide(
      database,
      "reject",
      requestId,
      revisionId,
      "reject",
      "reviewer-a",
      "Cần kiểm tra lại mapping điều khoản",
    );
    assert.equal(
      database.prepare(`
        SELECT lifecycle_status FROM editorial_subjects WHERE id = ?
      `).get(subjectId).lifecycle_status,
      "draft",
    );
    assert.equal(
      database.prepare(`
        SELECT status FROM editorial_review_requests WHERE id = ?
      `).get(requestId).status,
      "rejected",
    );
    assert.equal(
      database.prepare(`
        SELECT action FROM editorial_audit_events
        WHERE operation_id = 'operation-decision-reject'
      `).get().action,
      "review_rejected",
    );
  }));

test("request submission requires draft/current revision and an active editor or admin", () =>
  withDatabase((database) => {
    seedPrincipals(database);
    const { subjectId, revisionId } = seedDraft(database, "request-guards");

    assert.throws(
      () => submit(
        database,
        "request-no-role",
        subjectId,
        revisionId,
        "reviewer-no-role",
      ),
      /review request must bind the current subject revision/,
    );
    assert.throws(
      () => submit(
        database,
        "request-other-editor",
        subjectId,
        revisionId,
        "editor-b",
      ),
      /review request must bind the current subject revision/,
    );
    assert.equal(
      database.prepare(`
        SELECT lifecycle_status, optimistic_version
        FROM editorial_subjects WHERE id = ?
      `).get(subjectId).lifecycle_status,
      "draft",
    );

    database.exec(`
      UPDATE editorial_principals SET status = 'disabled' WHERE id = 'editor-a';
    `);
    assert.throws(
      () => submit(database, "request-disabled", subjectId, revisionId),
      /review request must bind the current subject revision/,
    );
    assert.equal(
      database.prepare("SELECT count(*) AS count FROM editorial_review_requests")
        .get().count,
      0,
    );
  }));

test("self-review, pending revision swap, disabled and ungranted reviewers fail closed", () =>
  withDatabase((database) => {
    seedPrincipals(database);
    database.exec(`
      INSERT INTO editorial_role_grants (
        id, principal_id, role, granted_by_principal_id
      ) VALUES ('grant-editor-a-reviewer', 'editor-a', 'reviewer', 'admin-a');
    `);

    const selfDraft = seedDraft(database, "self");
    const selfRequest = submit(
      database,
      "self",
      selfDraft.subjectId,
      selfDraft.revisionId,
    );
    assert.throws(
      () => decide(
        database,
        "self",
        selfRequest,
        selfDraft.revisionId,
        "approve",
        "editor-a",
      ),
      /active independent reviewer/,
    );

    const staleDraft = seedDraft(database, "stale");
    database.prepare(`
      INSERT INTO editorial_revisions (
        id, subject_id, version, canonical_snapshot_json,
        snapshot_sha256, created_by_principal_id
      ) VALUES ('revision-stale-2', ?, 2, '{"title":"New"}', ?, 'editor-a')
    `).run(staleDraft.subjectId, "b".repeat(64));
    submit(database, "stale", staleDraft.subjectId, staleDraft.revisionId);
    assert.throws(
      () => database.prepare(`
        UPDATE editorial_subjects
        SET current_revision_id = 'revision-stale-2',
            optimistic_version = optimistic_version + 1
        WHERE id = ?
      `).run(staleDraft.subjectId),
      /invalid editorial subject state transition/,
    );
    assert.deepEqual(
      { ...database.prepare(`
        SELECT lifecycle_status, current_revision_id
        FROM editorial_subjects WHERE id = ?
      `).get(staleDraft.subjectId) },
      {
        lifecycle_status: "pending_review",
        current_revision_id: staleDraft.revisionId,
      },
    );

    const disabledDraft = seedDraft(database, "disabled");
    const disabledRequest = submit(
      database,
      "disabled",
      disabledDraft.subjectId,
      disabledDraft.revisionId,
    );
    assert.throws(
      () => decide(
        database,
        "disabled",
        disabledRequest,
        disabledDraft.revisionId,
        "approve",
        "reviewer-disabled",
      ),
      /active independent reviewer/,
    );

    const noRoleDraft = seedDraft(database, "no-role");
    const noRoleRequest = submit(
      database,
      "no-role",
      noRoleDraft.subjectId,
      noRoleDraft.revisionId,
    );
    assert.throws(
      () => decide(
        database,
        "no-role",
        noRoleRequest,
        noRoleDraft.revisionId,
        "approve",
        "reviewer-no-role",
      ),
      /active independent reviewer/,
    );
  }));

test("duplicate request, decision and operation IDs fail without partial state", () =>
  withDatabase((database) => {
    seedPrincipals(database);
    const draft = seedDraft(database, "duplicates");
    const requestId = submit(
      database,
      "duplicates",
      draft.subjectId,
      draft.revisionId,
    );

    assert.throws(
      () => database.prepare(`
        UPDATE editorial_review_requests
        SET status = 'cancelled'
        WHERE id = ?
      `).run(requestId),
      /invalid editorial review request transition/,
    );

    assert.throws(
      () => database.prepare(`
        INSERT INTO editorial_review_requests (
          id, operation_id, subject_id, revision_id, submitted_by_principal_id
        ) VALUES ('request-duplicate', 'operation-submit-duplicate',
          ?, ?, 'editor-a')
      `).run(draft.subjectId, draft.revisionId),
      /UNIQUE constraint failed|review request must bind the current subject revision/,
    );

    assert.throws(
      () => database.prepare(`
        INSERT INTO editorial_review_decisions (
          id, operation_id, review_request_id, revision_id,
          reviewer_principal_id, decision
        ) VALUES (
          'decision-operation-collision', 'operation-submit-duplicates',
          ?, ?, 'reviewer-a', 'approve'
        )
      `).run(requestId, draft.revisionId),
      /UNIQUE constraint failed/,
    );
    assert.equal(
      database.prepare("SELECT count(*) AS count FROM editorial_review_decisions")
        .get().count,
      0,
    );
    assert.deepEqual(
      { ...database.prepare(`
        SELECT status, decided_at FROM editorial_review_requests WHERE id = ?
      `).get(requestId) },
      { status: "open", decided_at: null },
    );
    assert.equal(
      database.prepare(`
        SELECT lifecycle_status FROM editorial_subjects WHERE id = ?
      `).get(draft.subjectId).lifecycle_status,
      "pending_review",
    );

    decide(database, "duplicates", requestId, draft.revisionId);
    assert.throws(
      () => database.prepare(`
        INSERT INTO editorial_review_decisions (
          id, operation_id, review_request_id, revision_id,
          reviewer_principal_id, decision
        ) VALUES (
          'decision-duplicate', 'operation-decision-duplicate',
          ?, ?, 'admin-a', 'approve'
        )
      `).run(requestId, draft.revisionId),
      /UNIQUE constraint failed|active independent reviewer/,
    );
    assert.equal(
      database.prepare("SELECT count(*) AS count FROM editorial_review_decisions")
        .get().count,
      1,
    );
  }));

test("published subjects cannot insert or swap to an unreviewed revision", () =>
  withDatabase((database) => {
    seedPrincipals(database);
    const draft = seedDraft(database, "published-swap");
    database.prepare(`
      INSERT INTO editorial_revisions (
        id, subject_id, version, canonical_snapshot_json,
        snapshot_sha256, created_by_principal_id
      ) VALUES (
        'revision-published-swap-2', ?, 2, '{"title":"Unreviewed"}', ?,
        'editor-a'
      )
    `).run(draft.subjectId, "b".repeat(64));
    const requestId = submit(
      database,
      "published-swap",
      draft.subjectId,
      draft.revisionId,
    );
    decide(database, "published-swap", requestId, draft.revisionId);

    assert.throws(
      () => database.prepare(`
        UPDATE editorial_subjects
        SET current_revision_id = 'revision-published-swap-2',
            optimistic_version = optimistic_version + 1
        WHERE id = ?
      `).run(draft.subjectId),
      /invalid editorial subject state transition/,
    );
    assert.throws(
      () => database.prepare(`
        INSERT INTO editorial_revisions (
          id, subject_id, version, canonical_snapshot_json,
          snapshot_sha256, created_by_principal_id
        ) VALUES (
          'revision-published-swap-3', ?, 3, '{"title":"Later"}', ?, 'editor-a'
        )
      `).run(draft.subjectId, "c".repeat(64)),
      /requires the active subject creator/,
    );
    assert.deepEqual(
      { ...database.prepare(`
        SELECT lifecycle_status, current_revision_id, optimistic_version
        FROM editorial_subjects WHERE id = ?
      `).get(draft.subjectId) },
      {
        lifecycle_status: "published",
        current_revision_id: draft.revisionId,
        optimistic_version: 3,
      },
    );
  }));

test("direct audit inserts cannot forge roles, cross-bind subjects or use one-sided hashes", () =>
  withDatabase((database) => {
    seedPrincipals(database);
    const source = seedDraft(database, "audit-source");
    const requestId = submit(
      database,
      "audit-source",
      source.subjectId,
      source.revisionId,
    );
    const other = seedDraft(database, "audit-other");

    assert.throws(
      () => database.prepare(`
        INSERT INTO editorial_audit_events (
          id, operation_id, actor_principal_id, actor_role,
          subject_id, revision_id, review_request_id, action
        ) VALUES (
          'forged-role', 'operation-submit-audit-source', 'editor-a', 'reviewer',
          ?, ?, ?, 'review_submitted'
        )
      `).run(source.subjectId, source.revisionId, requestId),
      /does not match workflow state/,
    );
    assert.throws(
      () => database.prepare(`
        INSERT INTO editorial_audit_events (
          id, operation_id, actor_principal_id, actor_role,
          subject_id, revision_id, review_request_id, action
        ) VALUES (
          'cross-bound', 'operation-submit-audit-source', 'editor-a', 'editor',
          ?, ?, ?, 'review_submitted'
        )
      `).run(other.subjectId, other.revisionId, requestId),
      /does not match workflow state/,
    );

    database.exec(`
      DROP TRIGGER editorial_audit_events_insert_check;
    `);
    assert.throws(
      () => database.prepare(`
        INSERT INTO editorial_audit_events (
          id, operation_id, actor_principal_id, actor_role, action,
          before_hash
        ) VALUES (
          'one-sided-hash', 'one-sided-hash-operation', 'editor-a', 'editor',
          'review_submitted', ?
        )
      `).run("a".repeat(64)),
      /editorial_audit_events_hash_pair_check/,
    );
  }));

test("revision, decision and audit history reject updates and deletes", () =>
  withDatabase((database) => {
    seedPrincipals(database);
    const draft = seedDraft(database, "immutable");
    const requestId = submit(
      database,
      "immutable",
      draft.subjectId,
      draft.revisionId,
    );
    decide(database, "immutable", requestId, draft.revisionId);

    assert.throws(
      () => database.exec(`
        UPDATE editorial_revisions
        SET canonical_snapshot_json = '{"changed":true}'
        WHERE id = 'revision-immutable-1'
      `),
      /editorial revision is immutable/,
    );
    assert.throws(
      () => database.exec(`
        DELETE FROM editorial_revisions WHERE id = 'revision-immutable-1'
      `),
      /editorial revision is immutable/,
    );
    assert.throws(
      () => database.exec(`
        UPDATE editorial_review_decisions
        SET reason = 'changed' WHERE id = 'decision-immutable'
      `),
      /editorial review decision is immutable/,
    );
    assert.throws(
      () => database.exec(`
        DELETE FROM editorial_review_decisions WHERE id = 'decision-immutable'
      `),
      /editorial review decision is immutable/,
    );
    assert.throws(
      () => database.exec(`
        UPDATE editorial_audit_events
        SET action = 'changed' WHERE operation_id = 'operation-submit-immutable'
      `),
      /editorial audit event is immutable/,
    );
    assert.throws(
      () => database.exec(`
        DELETE FROM editorial_audit_events
        WHERE operation_id = 'operation-submit-immutable'
      `),
      /editorial audit event is immutable/,
    );
  }));
