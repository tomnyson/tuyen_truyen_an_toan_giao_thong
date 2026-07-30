import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

const repositoryRoot = new URL("../", import.meta.url);
const [
  schema,
  baselineMigration,
  migration,
  bootstrap,
  journalText,
  sitesPlugin,
  hostingText,
] = await Promise.all([
  readFile(new URL("db/schema.ts", repositoryRoot), "utf8"),
  readFile(new URL("drizzle/0000_groovy_cerise.sql", repositoryRoot), "utf8"),
  readFile(new URL("drizzle/0001_citation_foundation.sql", repositoryRoot), "utf8"),
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
  assert.equal(journal.entries.at(-1)?.tag, "0001_citation_foundation");
  assert.match(migration, /CREATE TABLE IF NOT EXISTS `legal_sources`/);
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
