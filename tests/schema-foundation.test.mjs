import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

const repositoryRoot = new URL("../", import.meta.url);
const [
  schema,
  baselineMigration,
  migration,
  readinessMigration,
  bootstrap,
  journalText,
  sitesPlugin,
  hostingText,
] = await Promise.all([
  readFile(new URL("db/schema.ts", repositoryRoot), "utf8"),
  readFile(new URL("drizzle/0000_groovy_cerise.sql", repositoryRoot), "utf8"),
  readFile(new URL("drizzle/0001_citation_foundation.sql", repositoryRoot), "utf8"),
  readFile(new URL("drizzle/0002_reviewed_rag_bridge.sql", repositoryRoot), "utf8"),
  readFile(new URL("db/index.ts", repositoryRoot), "utf8"),
  readFile(new URL("drizzle/meta/_journal.json", repositoryRoot), "utf8"),
  readFile(new URL("build/sites-vite-plugin.ts", repositoryRoot), "utf8"),
  readFile(new URL(".openai/hosting.json", repositoryRoot), "utf8"),
]);
const journal = JSON.parse(journalText);
const hosting = JSON.parse(hostingText);

const expectedTables = [
  "legal_sources",
  "legal_provisions",
  "legal_entry_citations",
];
const triggerNames = [
  "legal_provisions_created_by_immutable",
  "legal_provisions_published_source_insert_check",
  "legal_provisions_published_source_update_check",
  "legal_sources_created_by_immutable",
  "legal_sources_invalidate_published_provisions",
];

function createDatabase() {
  const database = new DatabaseSync(":memory:");
  database.exec("PRAGMA foreign_keys = ON");
  database.exec(baselineMigration);
  database.exec(migration);
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

function createReadyDatabase() {
  const database = createDatabase();
  database.exec(readinessMigration);
  return database;
}

function withReadyDatabase(run) {
  const database = createReadyDatabase();
  try {
    run(database);
  } finally {
    database.close();
  }
}

test("declares the citation foundation in Drizzle and bootstrap DDL", () => {
  for (const table of expectedTables) {
    assert.match(schema, new RegExp(`sqliteTable\\(\\s*[\"']${table}[\"']`));
    assert.match(
      bootstrap,
      new RegExp(`CREATE TABLE IF NOT EXISTS ${table}\\b`, "i"),
    );
    assert.match(
      migration,
      new RegExp('CREATE TABLE IF NOT EXISTS [`"]' + table + '[`"]', "i"),
    );
  }

  for (const trigger of triggerNames) {
    assert.match(migration, new RegExp(`CREATE TRIGGER IF NOT EXISTS [\`"]${trigger}`));
    assert.match(bootstrap, new RegExp(`CREATE TRIGGER IF NOT EXISTS ${trigger}`));
  }

  assert.match(schema, /createdBy: text\("created_by"\)\.notNull\(\)/);
  assert.match(schema, /officialHost: text\("official_host"\)\.notNull\(\)/);
  assert.match(schema, /verifiedBy} != \$\{table\.createdBy}/);
  assert.match(schema, /reviewedBy} != \$\{table\.createdBy}/);

  for (const marker of [
    /[`"]?created_by[`"]?\s+text\s+NOT NULL/i,
    /[`"]?verified_by[`"]?\s*!=\s*[`"]?created_by[`"]?/i,
    /[`"]?reviewed_by[`"]?\s*!=\s*[`"]?created_by[`"]?/i,
    /legal_sources_official_host_format_check/i,
    /legal_sources_official_host_allowlist_check/i,
    /legal_sources_url_authority_check/i,
    /legal_entry_citations_display_order_check/i,
    /legal source created_by is immutable/i,
    /legal provision created_by is immutable/i,
    /published provision requires an in-force verified source/i,
  ]) {
    assert.match(migration, marker);
    assert.match(bootstrap, marker);
  }
});

test("migration links entries to structured provisions and sources", () => {
  assert.match(
    migration,
    /FOREIGN KEY \(`source_id`\) REFERENCES `legal_sources`\(`id`\)/i,
  );
  assert.match(
    migration,
    /FOREIGN KEY \(`legal_entry_id`\) REFERENCES `legal_entries`\(`id`\)/i,
  );
  assert.match(
    migration,
    /FOREIGN KEY \(`provision_id`\) REFERENCES `legal_provisions`\(`id`\)/i,
  );
  assert.match(
    migration,
    /PRIMARY KEY \(`legal_entry_id`, `provision_id`\)/i,
  );
});

test("migration enforces review, allowlist and source-validity foundations", () => {
  assert.match(migration, /legal_sources_document_number_unique/i);
  assert.match(migration, /legal_sources_official_url_unique/i);
  assert.match(migration, /lower\(`official_url`\) LIKE 'https:\/\/%'/i);
  assert.match(migration, /`official_host` text NOT NULL/i);
  assert.match(migration, /legal_sources_url_authority_check/i);
  assert.match(migration, /vbpl\.vn/);
  assert.match(migration, /vbpl\.moj\.gov\.vn/);
  assert.match(migration, /\?\\?\*?\.chinhphu\.vn|chinhphu\.vn/);
  assert.match(migration, /`verified_by` != `created_by`/i);
  assert.match(migration, /`reviewed_by` != `created_by`/i);
  assert.match(migration, /display_order` >= 0/i);
});

test("Sites build packages migration inputs but does not prove execution", () => {
  assert.equal(hosting.d1, "DB");
  assert.match(sitesPlugin, /resolve\(root,\s*"drizzle"\)/);
  assert.match(
    sitesPlugin,
    /cp\(drizzleSource,\s*resolve\(outputDirectory,\s*"drizzle"\)/s,
  );
  assert.equal(journal.entries[2]?.tag, "0002_reviewed_rag_bridge");
  assert.equal(
    journal.entries.at(-1)?.tag,
    "0006_petite_lady_deathstrike",
  );
  assert.match(migration, /CREATE TABLE IF NOT EXISTS `legal_sources`/);
  assert.match(readinessMigration, /ALTER TABLE `legal_entries`/);
});

test("citation foundation migration contains no legal-content seed", () => {
  assert.doesNotMatch(migration, /\bINSERT\s+INTO\b/i);
  assert.doesNotMatch(migration, /131\/2013|341\/2025/i);
});

test("migration journal records citation foundation after baseline", () => {
  assert.deepEqual(
    journal.entries.map(({ idx, version, tag, breakpoints }) => ({
      idx,
      version,
      tag,
      breakpoints,
    })),
    [
      {
        idx: 0,
        version: "6",
        tag: "0000_groovy_cerise",
        breakpoints: true,
      },
      {
        idx: 1,
        version: "6",
        tag: "0001_citation_foundation",
        breakpoints: true,
      },
      {
        idx: 2,
        version: "6",
        tag: "0002_reviewed_rag_bridge",
        breakpoints: true,
      },
      {
        idx: 3,
        version: "6",
        tag: "0003_editorial_trust_primitives",
        breakpoints: true,
      },
      {
        idx: 4,
        version: "6",
        tag: "0004_rate_limit_v1",
        breakpoints: true,
      },
      {
        idx: 5,
        version: "6",
        tag: "0005_web_search_candidate_workflow",
        breakpoints: true,
      },
      {
        idx: 6,
        version: "6",
        tag: "0006_petite_lady_deathstrike",
        breakpoints: true,
      },
    ],
  );
});

test(
  "migration is executable and idempotent",
  () => withDatabase((database) => {
    database.exec(migration);
    const integrity = database.prepare("PRAGMA integrity_check").get();
    assert.equal(integrity.integrity_check, "ok");
    assert.deepEqual(database.prepare("PRAGMA foreign_key_check").all(), []);

    const triggers = database.prepare(
      "SELECT name FROM sqlite_master WHERE type = 'trigger' ORDER BY name",
    ).all().map((row) => row.name);
    assert.deepEqual(triggers, triggerNames);
  }),
);

test(
  "non-draft sources require an exact approved official domain",
  () => withDatabase((database) => {
    database.exec(`
      INSERT INTO legal_sources (
        document_number, title, official_url, official_host, status, created_by
      ) VALUES (
        'DRAFT-EXTERNAL', 'Draft external', 'https://example.org/draft',
        'example.org', 'draft', 'editor-a'
      )
    `);

    assert.throws(
      () => database.exec(`
        INSERT INTO legal_sources (
          document_number, title, official_url, official_host, status, created_by
        ) VALUES (
          'DRAFT-HTTP', 'Draft HTTP', 'http://vbpl.vn/insecure', 'vbpl.vn',
          'draft', 'editor-a'
        )
      `),
      /legal_sources_https_url_check/,
    );

    for (const host of ["VBPL.VN", "vbpl..vn", "vbpl_vn"]) {
      assert.throws(
        () => database.prepare(`
          INSERT INTO legal_sources (
            document_number, title, official_url, official_host, status,
            created_by
          ) VALUES (?, 'Invalid host', ?, ?, 'draft', 'editor-a')
        `).run(`INVALID-HOST-${host}`, `https://${host}`, host),
        /legal_sources_official_host_format_check/,
      );
    }

    for (const [url, host] of [
      ["https://example.org/source", "example.org"],
      ["https://vbpl.vn.evil.example/source", "vbpl.vn.evil.example"],
      ["https://chinhphu.vn.evil.example/source", "chinhphu.vn.evil.example"],
      ["https://evil.example/path.chinhphu.vn/source", "evil.example"],
      ["https://evil.example?.chinhphu.vn/path", "evil.example"],
      ["https://evil.example#.chinhphu.vn/path", "evil.example"],
    ]) {
      assert.throws(
        () => database.prepare(`
          INSERT INTO legal_sources (
            document_number, title, official_url, official_host, status,
            created_by
          ) VALUES (?, 'Rejected source', ?, ?, 'expired', 'editor-a')
        `).run(`REJECTED-${url}`, url, host),
        /legal_sources_official_host_allowlist_check/,
      );
    }

    for (const [url, host] of [
      ["https://evil.example?.chinhphu.vn/path", "foo.chinhphu.vn"],
      ["https://evil.example#.chinhphu.vn/path", "foo.chinhphu.vn"],
      ["https://vbpl.vn/source", "chinhphu.vn"],
    ]) {
      assert.throws(
        () => database.prepare(`
          INSERT INTO legal_sources (
            document_number, title, official_url, official_host, status,
            created_by
          ) VALUES (?, 'Mismatched source', ?, ?, 'draft', 'editor-a')
        `).run(`MISMATCH-${url}-${host}`, url, host),
        /legal_sources_url_authority_check/,
      );
    }

    const approvedUrls = [
      ["https://vbpl.vn/source/1", "vbpl.vn"],
      ["https://vbpl.moj.gov.vn/source/2", "vbpl.moj.gov.vn"],
      ["https://chinhphu.vn?item=3", "chinhphu.vn"],
      ["https://chinhphu.vn#section-4", "chinhphu.vn"],
      [
        "https://xaydungchinhsach.chinhphu.vn/source/5?view=full",
        "xaydungchinhsach.chinhphu.vn",
      ],
    ];
    approvedUrls.forEach(([url, host], index) => {
      database.prepare(`
        INSERT INTO legal_sources (
          document_number, title, official_url, official_host, status,
          created_by
        ) VALUES (?, 'Approved source', ?, ?, 'expired', 'editor-a')
      `).run(`APPROVED-${index}`, url, host);
    });

    assert.equal(
      database.prepare(
        "SELECT count(*) AS count FROM legal_sources WHERE status = 'expired'",
      ).get().count,
      approvedUrls.length,
    );
  }),
);

test(
  "source and provision publication enforce four-eyes review",
  () => withDatabase((database) => {
    assert.throws(
      () => database.exec(`
        INSERT INTO legal_sources (
          document_number, title, official_url, official_host, effective_from, status,
          created_by, last_verified_at, verified_by
        ) VALUES (
          'SAME-VERIFIER', 'Same verifier', 'https://vbpl.vn/same-verifier',
          'vbpl.vn', '2026-01-01', 'in_force', 'reviewer-a',
          '2026-07-29T00:00:00Z', 'reviewer-a'
        )
      `),
      /legal_sources_in_force_verification_check/,
    );

    database.exec(`
      INSERT INTO legal_sources (
        document_number, title, official_url, official_host, effective_from, status,
        created_by, last_verified_at, verified_by
      ) VALUES (
        'VALID-SOURCE', 'Valid source', 'https://vbpl.vn/valid-source',
        'vbpl.vn', '2026-01-01', 'in_force', 'editor-a',
        '2026-07-29T00:00:00Z', 'reviewer-a'
      )
    `);

    assert.throws(
      () => database.exec(`
        INSERT INTO legal_provisions (
          source_id, original_text, simplified_text, status, created_by,
          reviewed_by, reviewed_at
        ) VALUES (
          (SELECT id FROM legal_sources WHERE document_number = 'VALID-SOURCE'),
          'Original', 'Simplified', 'published', 'reviewer-b', 'reviewer-b',
          '2026-07-29T00:00:00Z'
        )
      `),
      /legal_provisions_published_review_check/,
    );
  }),
);

test(
  "immutable creators prevent reassignment followed by self verification or review",
  () => withDatabase((database) => {
    database.exec(`
      INSERT INTO legal_sources (
        document_number, title, official_url, official_host, status, created_by
      ) VALUES (
        'IMMUTABLE-SOURCE', 'Immutable source',
        'https://vbpl.vn/immutable-source', 'vbpl.vn', 'draft', 'alice'
      )
    `);

    assert.throws(
      () => database.exec(`
        UPDATE legal_sources
        SET created_by = 'bob'
        WHERE document_number = 'IMMUTABLE-SOURCE'
      `),
      /legal source created_by is immutable/,
    );
    assert.equal(
      database.prepare(`
        SELECT created_by
        FROM legal_sources
        WHERE document_number = 'IMMUTABLE-SOURCE'
      `).get().created_by,
      "alice",
    );
    assert.throws(
      () => database.exec(`
        UPDATE legal_sources
        SET status = 'in_force',
            effective_from = '2026-01-01',
            last_verified_at = '2026-07-29T00:00:00Z',
            verified_by = 'alice'
        WHERE document_number = 'IMMUTABLE-SOURCE'
      `),
      /legal_sources_in_force_verification_check/,
    );

    database.exec(`
      INSERT INTO legal_sources (
        document_number, title, official_url, official_host, effective_from,
        status, created_by, last_verified_at, verified_by
      ) VALUES (
        'REVIEW-SOURCE', 'Review source', 'https://vbpl.vn/review-source',
        'vbpl.vn', '2026-01-01', 'in_force', 'carol',
        '2026-07-29T00:00:00Z', 'dave'
      );

      INSERT INTO legal_provisions (
        source_id, original_text, simplified_text, status, created_by
      ) VALUES (
        (SELECT id FROM legal_sources WHERE document_number = 'REVIEW-SOURCE'),
        'Immutable original', 'Immutable simplified', 'draft', 'alice'
      )
    `);

    assert.throws(
      () => database.exec(`
        UPDATE legal_provisions
        SET created_by = 'bob'
        WHERE original_text = 'Immutable original'
      `),
      /legal provision created_by is immutable/,
    );
    assert.equal(
      database.prepare(`
        SELECT created_by
        FROM legal_provisions
        WHERE original_text = 'Immutable original'
      `).get().created_by,
      "alice",
    );
    assert.throws(
      () => database.exec(`
        UPDATE legal_provisions
        SET status = 'published',
            reviewed_by = 'alice',
            reviewed_at = '2026-07-29T00:00:00Z'
        WHERE original_text = 'Immutable original'
      `),
      /legal_provisions_published_review_check/,
    );
  }),
);

test(
  "published provisions require an in-force verified source on insert and update",
  () => withDatabase((database) => {
    database.exec(`
      INSERT INTO legal_sources (
        document_number, title, official_url, official_host, status, created_by
      ) VALUES (
        'DRAFT-SOURCE', 'Draft source', 'https://example.org/draft-source',
        'example.org', 'draft', 'editor-a'
      )
    `);

    assert.throws(
      () => database.exec(`
        INSERT INTO legal_provisions (
          source_id, original_text, simplified_text, status, created_by,
          reviewed_by, reviewed_at
        ) VALUES (
          (SELECT id FROM legal_sources WHERE document_number = 'DRAFT-SOURCE'),
          'Original', 'Simplified', 'published', 'editor-b', 'reviewer-b',
          '2026-07-29T00:00:00Z'
        )
      `),
      /published provision requires an in-force verified source/,
    );

    database.exec(`
      INSERT INTO legal_provisions (
        source_id, original_text, simplified_text, status, created_by
      ) VALUES (
        (SELECT id FROM legal_sources WHERE document_number = 'DRAFT-SOURCE'),
        'Draft original', 'Draft simplified', 'draft', 'editor-b'
      )
    `);

    assert.throws(
      () => database.exec(`
        UPDATE legal_provisions
        SET status = 'published',
            reviewed_by = 'reviewer-b',
            reviewed_at = '2026-07-29T00:00:00Z'
        WHERE original_text = 'Draft original'
      `),
      /published provision requires an in-force verified source/,
    );
  }),
);

test(
  "invalidating a source returns dependent published provisions to review",
  () => withDatabase((database) => {
    database.exec(`
      INSERT INTO legal_sources (
        document_number, title, official_url, official_host, effective_from,
        status, created_by, last_verified_at, verified_by
      ) VALUES (
        'SOURCE-TO-EXPIRE', 'Source to expire',
        'https://vbpl.vn/source-to-expire', 'vbpl.vn', '2026-01-01',
        'in_force', 'editor-a', '2026-07-29T00:00:00Z', 'reviewer-a'
      );

      INSERT INTO legal_provisions (
        source_id, original_text, simplified_text, status, created_by,
        reviewed_by, reviewed_at, updated_at
      ) VALUES (
        (SELECT id FROM legal_sources WHERE document_number = 'SOURCE-TO-EXPIRE'),
        'Will expire', 'Will expire', 'published', 'editor-b', 'reviewer-b',
        '2026-07-29T00:00:00Z', '2000-01-01 00:00:00'
      );

      UPDATE legal_sources
      SET status = 'expired'
      WHERE document_number = 'SOURCE-TO-EXPIRE'
    `);

    const provision = database.prepare(`
      SELECT status, reviewed_by, reviewed_at, updated_at
      FROM legal_provisions
      WHERE original_text = 'Will expire'
    `).get();
    assert.equal(provision.status, "pending_review");
    assert.equal(provision.reviewed_by, null);
    assert.equal(provision.reviewed_at, null);
    assert.notEqual(provision.updated_at, "2000-01-01 00:00:00");
  }),
);

test(
  "valid reviewed source, provision and citation graph succeeds",
  () => withDatabase((database) => {
    database.exec(`
      INSERT INTO legal_entries (
        topic, title, legal_basis, penalty, remedy, case_study
      ) VALUES (
        'Giao thông', 'Schema graph', 'Pending structured migration', 'N/A',
        'N/A', 'N/A'
      );

      INSERT INTO legal_sources (
        document_number, title, official_url, official_host, effective_from, status,
        created_by, last_verified_at, verified_by
      ) VALUES (
        'GRAPH-SOURCE', 'Graph source',
        'https://xaydungchinhsach.chinhphu.vn/graph-source',
        'xaydungchinhsach.chinhphu.vn', '2026-01-01', 'in_force', 'editor-a',
        '2026-07-29T00:00:00Z', 'reviewer-a'
      );

      INSERT INTO legal_provisions (
        source_id, article, original_text, simplified_text, status, created_by,
        reviewed_by, reviewed_at
      ) VALUES (
        (SELECT id FROM legal_sources WHERE document_number = 'GRAPH-SOURCE'),
        'Điều test', 'Original', 'Simplified', 'published', 'editor-b',
        'reviewer-b', '2026-07-29T00:00:00Z'
      );

      INSERT INTO legal_entry_citations (
        legal_entry_id, provision_id, display_order
      ) VALUES (
        (SELECT id FROM legal_entries WHERE title = 'Schema graph'),
        (SELECT id FROM legal_provisions WHERE original_text = 'Original'),
        0
      )
    `);

    assert.equal(
      database.prepare("SELECT count(*) AS count FROM legal_entry_citations").get().count,
      1,
    );
    assert.deepEqual(database.prepare("PRAGMA foreign_key_check").all(), []);
  }),
);

test("reviewed RAG bridge preserves legacy rows and declares fresh-schema parity", () => {
  const database = createDatabase();
  try {
    database.exec(`
      INSERT INTO legal_entries (
        topic, title, legal_basis, penalty, remedy, case_study, status
      ) VALUES (
        'Giao thông', 'Legacy answer', 'Legacy only', 'N/A', 'N/A', 'N/A',
        'published'
      );
      INSERT INTO legal_sources (
        document_number, title, official_url, official_host, effective_from,
        status, created_by, last_verified_at, verified_by
      ) VALUES (
        'LEGACY-SOURCE', 'Legacy source', 'https://vbpl.vn/legacy-source',
        'vbpl.vn', '2026-01-01', 'in_force', 'source-editor',
        '2026-07-01T00:00:00Z', 'source-reviewer'
      );
      INSERT INTO legal_provisions (
        source_id, original_text, simplified_text, status, created_by,
        reviewed_by, reviewed_at
      ) VALUES (
        (SELECT id FROM legal_sources WHERE document_number = 'LEGACY-SOURCE'),
        'Legacy provision', 'Legacy provision', 'published',
        'provision-editor', 'provision-reviewer', '2026-07-01T00:00:00Z'
      );
      INSERT INTO legal_entry_citations (legal_entry_id, provision_id)
      VALUES (
        (SELECT id FROM legal_entries WHERE title = 'Legacy answer'),
        (SELECT id FROM legal_provisions WHERE original_text = 'Legacy provision')
      );
    `);

    database.exec(readinessMigration);
    assert.deepEqual(
      { ...database.prepare(`
        SELECT review_status, created_by, reviewed_by, reviewed_at
        FROM legal_entries WHERE title = 'Legacy answer'
      `).get() },
      {
        review_status: "legacy_unverified",
        created_by: null,
        reviewed_by: null,
        reviewed_at: null,
      },
    );
    assert.deepEqual(
      { ...database.prepare(`
        SELECT revision_id, checksum_version, checksum_sha256,
               effectivity_status, effective_from, effective_to
        FROM legal_provisions WHERE original_text = 'Legacy provision'
      `).get() },
      {
        revision_id: null,
        checksum_version: null,
        checksum_sha256: null,
        effectivity_status: "unknown",
        effective_from: null,
        effective_to: null,
      },
    );
    assert.equal(
      database.prepare(`
        SELECT review_status FROM legal_entry_citations
      `).get().review_status,
      "legacy_unverified",
    );
    assert.deepEqual(database.prepare("PRAGMA foreign_key_check").all(), []);
    assert.equal(
      database.prepare("PRAGMA integrity_check").get().integrity_check,
      "ok",
    );
  } finally {
    database.close();
  }

  for (const marker of [
    /reviewStatus: text\("review_status"/,
    /revisionId: text\("revision_id"\)/,
    /checksumVersion: text\("checksum_version"\)/,
    /checksumSha256: text\("checksum_sha256"\)/,
    /citedRevisionId: text\("cited_revision_id"\)/,
    /provision-sha256-v1/,
    /partially_in_force/,
  ]) {
    assert.match(schema, marker);
  }
  for (const marker of [
    /review_status text DEFAULT 'legacy_unverified'/,
    /revision_id text/,
    /checksum_version text/,
    /checksum_sha256 text/,
    /cited_revision_id text/,
    /provision-sha256-v1/,
    /partially_in_force/,
  ]) {
    assert.match(bootstrap, marker);
  }
  assert.doesNotMatch(readinessMigration, /\bINSERT\s+INTO\b/i);
});

test(
  "entry review requires four eyes and material changes invalidate it",
  () => withReadyDatabase((database) => {
    database.exec(`
      INSERT INTO legal_entries (
        topic, title, legal_basis, penalty, remedy, case_study, status,
        created_by
      ) VALUES (
        'Giao thông', 'Reviewed answer', 'Structured only', 'N/A', 'N/A',
        'N/A', 'published', 'entry-editor'
      )
    `);

    assert.throws(
      () => database.exec(`
        UPDATE legal_entries
        SET review_status = 'four_eyes_verified',
            reviewed_by = 'entry-editor',
            reviewed_at = '2026-07-31T00:00:00Z'
        WHERE title = 'Reviewed answer'
      `),
      /invalid legal entry review metadata/,
    );

    database.exec(`
      UPDATE legal_entries
      SET review_status = 'four_eyes_verified',
          reviewed_by = 'entry-reviewer',
          reviewed_at = '2026-07-31T00:00:00Z'
      WHERE title = 'Reviewed answer';
      UPDATE legal_entries
      SET title = title
      WHERE title = 'Reviewed answer';
    `);
    assert.equal(
      database.prepare(`
        SELECT review_status FROM legal_entries WHERE title = 'Reviewed answer'
      `).get().review_status,
      "four_eyes_verified",
    );

    database.exec(`
      UPDATE legal_entries
      SET title = 'Reviewed answer changed'
      WHERE title = 'Reviewed answer'
    `);
    assert.deepEqual(
      { ...database.prepare(`
        SELECT review_status, reviewed_by, reviewed_at
        FROM legal_entries WHERE title = 'Reviewed answer changed'
      `).get() },
      {
        review_status: "legacy_unverified",
        reviewed_by: null,
        reviewed_at: null,
      },
    );
    assert.throws(
      () => database.exec(`
        UPDATE legal_entries
        SET created_by = 'other-editor'
        WHERE title = 'Reviewed answer changed'
      `),
      /legal entry created_by is immutable/,
    );
  }),
);

test(
  "published provision revision metadata is complete, unique and immutable",
  () => withReadyDatabase((database) => {
    database.exec(`
      INSERT INTO legal_sources (
        document_number, title, official_url, official_host, effective_from,
        status, created_by, last_verified_at, verified_by
      ) VALUES (
        'READY-SOURCE', 'Ready source', 'https://vbpl.vn/ready-source',
        'vbpl.vn', '2026-01-01', 'in_force', 'source-editor',
        '2026-07-01T00:00:00Z', 'source-reviewer'
      )
    `);

    assert.throws(
      () => database.exec(`
        INSERT INTO legal_provisions (
          source_id, original_text, simplified_text, status, created_by,
          reviewed_by, reviewed_at
        ) VALUES (
          (SELECT id FROM legal_sources WHERE document_number = 'READY-SOURCE'),
          'Missing revision', 'Missing revision', 'published',
          'provision-editor', 'provision-reviewer', '2026-07-01T00:00:00Z'
        )
      `),
      /invalid provision revision or effectivity metadata/,
    );
    assert.throws(
      () => database.exec(`
        INSERT INTO legal_provisions (
          source_id, original_text, simplified_text, status, created_by,
          revision_id, checksum_version, checksum_sha256
        ) VALUES (
          (SELECT id FROM legal_sources WHERE document_number = 'READY-SOURCE'),
          'Malformed revision', 'Malformed revision', 'draft',
          'provision-editor', '-bad-revision', 'provision-sha256-v1',
          'cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc'
        )
      `),
      /invalid provision revision or effectivity metadata/,
    );

    database.exec(`
      INSERT INTO legal_provisions (
        source_id, original_text, simplified_text, status, created_by,
        reviewed_by, reviewed_at, revision_id, checksum_version,
        checksum_sha256, effectivity_status, effective_from
      ) VALUES (
        (SELECT id FROM legal_sources WHERE document_number = 'READY-SOURCE'),
        'Immutable provision', 'Immutable provision', 'published',
        'provision-editor', 'provision-reviewer', '2026-07-01T00:00:00Z',
        'ready-revision-1', 'provision-sha256-v1',
        'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        'in_force', '2026-01-01'
      )
    `);

    assert.throws(
      () => database.exec(`
        INSERT INTO legal_provisions (
          source_id, original_text, simplified_text, status, created_by,
          reviewed_by, reviewed_at, revision_id, checksum_version,
          checksum_sha256, effectivity_status, effective_from
        ) VALUES (
          (SELECT id FROM legal_sources WHERE document_number = 'READY-SOURCE'),
          'Duplicate revision', 'Duplicate revision', 'published',
          'other-editor', 'other-reviewer', '2026-07-01T00:00:00Z',
          'ready-revision-1', 'provision-sha256-v1',
          'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
          'in_force', '2026-01-01'
        )
      `),
      /UNIQUE constraint failed: legal_provisions\.revision_id/,
    );
    assert.throws(
      () => database.exec(`
        UPDATE legal_provisions
        SET original_text = 'Mutated in place'
        WHERE revision_id = 'ready-revision-1'
      `),
      /provision revision is immutable/,
    );
  }),
);

test(
  "citation verification binds the exact revision and source changes invalidate the graph",
  () => withReadyDatabase((database) => {
    const checksum =
      "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    database.exec(`
      INSERT INTO legal_entries (
        topic, title, legal_basis, penalty, remedy, case_study, status,
        review_status, created_by, reviewed_by, reviewed_at
      ) VALUES (
        'Giao thông', 'Ready answer', 'Structured only', 'N/A', 'N/A', 'N/A',
        'published', 'four_eyes_verified', 'entry-editor', 'entry-reviewer',
        '2026-07-31T00:00:00Z'
      );
      INSERT INTO legal_sources (
        document_number, title, official_url, official_host, effective_from,
        status, created_by, last_verified_at, verified_by
      ) VALUES (
        'BOUND-SOURCE', 'Bound source', 'https://vbpl.vn/bound-source',
        'vbpl.vn', '2026-01-01', 'in_force', 'source-editor',
        '2026-07-01T00:00:00Z', 'source-reviewer'
      );
      INSERT INTO legal_provisions (
        source_id, original_text, simplified_text, status, created_by,
        reviewed_by, reviewed_at, revision_id, checksum_version,
        checksum_sha256, effectivity_status, effective_from
      ) VALUES (
        (SELECT id FROM legal_sources WHERE document_number = 'BOUND-SOURCE'),
        'Bound provision', 'Bound provision', 'published', 'provision-editor',
        'provision-reviewer', '2026-07-01T00:00:00Z', 'bound-revision-1',
        'provision-sha256-v1', '${checksum}', 'in_force', '2026-01-01'
      );
    `);

    assert.throws(
      () => database.exec(`
        INSERT INTO legal_entry_citations (
          legal_entry_id, provision_id, review_status, created_by, reviewed_by,
          reviewed_at, cited_revision_id, cited_checksum_version,
          cited_checksum_sha256
        ) VALUES (
          (SELECT id FROM legal_entries WHERE title = 'Ready answer'),
          (SELECT id FROM legal_provisions WHERE revision_id = 'bound-revision-1'),
          'four_eyes_verified', 'citation-editor', 'citation-reviewer',
          '2026-07-31T00:00:00Z', 'stale-revision',
          'provision-sha256-v1', '${checksum}'
        )
      `),
      /invalid citation review or revision binding/,
    );

    database.exec(`
      INSERT INTO legal_entry_citations (
        legal_entry_id, provision_id, review_status, created_by, reviewed_by,
        reviewed_at, cited_revision_id, cited_checksum_version,
        cited_checksum_sha256
      ) VALUES (
        (SELECT id FROM legal_entries WHERE title = 'Ready answer'),
        (SELECT id FROM legal_provisions WHERE revision_id = 'bound-revision-1'),
        'four_eyes_verified', 'citation-editor', 'citation-reviewer',
        '2026-07-31T00:00:00Z', 'bound-revision-1',
        'provision-sha256-v1', '${checksum}'
      );
      UPDATE legal_entries
      SET review_status = 'legacy_unverified',
          reviewed_by = NULL,
          reviewed_at = NULL
      WHERE title = 'Ready answer';
      UPDATE legal_entries
      SET title = 'Ready answer corrected'
      WHERE title = 'Ready answer';
      UPDATE legal_entries
      SET review_status = 'four_eyes_verified',
          reviewed_by = 'entry-reviewer-2',
          reviewed_at = '2026-07-31T01:00:00Z'
      WHERE title = 'Ready answer corrected';
    `);
    assert.equal(
      database.prepare(`
        SELECT citation.review_status
        FROM legal_entry_citations AS citation
        INNER JOIN legal_entries AS entry
          ON entry.id = citation.legal_entry_id
        WHERE entry.title = 'Ready answer corrected'
      `).get().review_status,
      "legacy_unverified",
    );

    database.exec(`
      UPDATE legal_entry_citations
      SET review_status = 'four_eyes_verified',
          reviewed_by = 'citation-reviewer-2',
          reviewed_at = '2026-07-31T01:00:00Z'
      WHERE legal_entry_id = (
        SELECT id FROM legal_entries WHERE title = 'Ready answer corrected'
      );
      UPDATE legal_sources
      SET title = 'Bound source corrected'
      WHERE document_number = 'BOUND-SOURCE';
    `);

    assert.deepEqual(
      { ...database.prepare(`
        SELECT provision.status AS provision_status,
               provision.reviewed_by AS provision_reviewer,
               citation.review_status AS citation_review_status,
               citation.reviewed_by AS citation_reviewer
        FROM legal_provisions AS provision
        INNER JOIN legal_entry_citations AS citation
          ON citation.provision_id = provision.id
        WHERE provision.revision_id = 'bound-revision-1'
      `).get() },
      {
        provision_status: "pending_review",
        provision_reviewer: null,
        citation_review_status: "legacy_unverified",
        citation_reviewer: null,
      },
    );
  }),
);
