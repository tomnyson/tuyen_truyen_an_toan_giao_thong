import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

const createLegalEntriesTable = `
  CREATE TABLE IF NOT EXISTS legal_entries (
    id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    topic text NOT NULL,
    icon text DEFAULT '§' NOT NULL,
    title text NOT NULL,
    legal_basis text NOT NULL,
    penalty text NOT NULL,
    remedy text NOT NULL,
    case_study text NOT NULL,
    tags text DEFAULT '[]' NOT NULL,
    status text DEFAULT 'draft' NOT NULL,
    created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at text DEFAULT CURRENT_TIMESTAMP NOT NULL
  )
`;

const createShowcasesTable = `
  CREATE TABLE IF NOT EXISTS showcases (
    id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    topic text NOT NULL,
    title text NOT NULL,
    summary text NOT NULL,
    source_url text DEFAULT '' NOT NULL,
    status text DEFAULT 'draft' NOT NULL,
    created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at text DEFAULT CURRENT_TIMESTAMP NOT NULL
  )
`;

// Versioned SQL migrations are the production source of truth. These
// idempotent statements only preserve the existing local/Sites bootstrap path.
const createLegalSourcesTable = `
  CREATE TABLE IF NOT EXISTS legal_sources (
    id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    document_number text NOT NULL,
    title text NOT NULL,
    official_url text NOT NULL,
    official_host text NOT NULL,
    issued_at text,
    effective_from text,
    effective_to text,
    status text DEFAULT 'draft' NOT NULL,
    created_by text NOT NULL,
    last_verified_at text,
    verified_by text,
    created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at text DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT legal_sources_status_check
      CHECK (status IN ('draft', 'in_force', 'expired', 'superseded')),
    CONSTRAINT legal_sources_https_url_check
      CHECK (lower(official_url) LIKE 'https://%'),
    CONSTRAINT legal_sources_official_host_format_check
      CHECK (
        official_host = lower(official_host)
        AND length(official_host) > 0
        AND official_host NOT GLOB '*[^a-z0-9.-]*'
        AND official_host NOT LIKE '%..%'
        AND official_host NOT LIKE '.%'
        AND official_host NOT LIKE '%.'
      ),
    CONSTRAINT legal_sources_official_host_allowlist_check
      CHECK (status = 'draft' OR (
        official_host IN ('vbpl.vn', 'vbpl.moj.gov.vn', 'chinhphu.vn')
        OR official_host LIKE '%.chinhphu.vn'
      )),
    CONSTRAINT legal_sources_url_authority_check
      CHECK (
        lower(official_url) = 'https://' || official_host
        OR lower(official_url) LIKE 'https://' || official_host || '/%'
        OR lower(official_url) LIKE 'https://' || official_host || '?%'
        OR lower(official_url) LIKE 'https://' || official_host || '#%'
      ),
    CONSTRAINT legal_sources_effectivity_check
      CHECK (effective_to IS NULL OR effective_from IS NULL OR effective_to >= effective_from),
    CONSTRAINT legal_sources_in_force_verification_check
      CHECK (status != 'in_force' OR (
        effective_from IS NOT NULL
        AND last_verified_at IS NOT NULL
        AND verified_by IS NOT NULL
        AND verified_by != created_by
      ))
  )
`;

const createLegalSourcesDocumentNumberIndex = `
  CREATE UNIQUE INDEX IF NOT EXISTS legal_sources_document_number_unique
  ON legal_sources (document_number)
`;

const createLegalSourcesOfficialUrlIndex = `
  CREATE UNIQUE INDEX IF NOT EXISTS legal_sources_official_url_unique
  ON legal_sources (official_url)
`;

const createLegalSourcesStatusIndex = `
  CREATE INDEX IF NOT EXISTS legal_sources_status_idx
  ON legal_sources (status)
`;

const createLegalProvisionsTable = `
  CREATE TABLE IF NOT EXISTS legal_provisions (
    id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    source_id integer NOT NULL,
    article text,
    clause text,
    point text,
    original_text text NOT NULL,
    simplified_text text NOT NULL,
    status text DEFAULT 'draft' NOT NULL,
    created_by text NOT NULL,
    reviewed_by text,
    reviewed_at text,
    created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at text DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT legal_provisions_source_id_legal_sources_id_fk
      FOREIGN KEY (source_id) REFERENCES legal_sources(id)
      ON UPDATE NO ACTION ON DELETE RESTRICT,
    CONSTRAINT legal_provisions_status_check
      CHECK (status IN ('draft', 'pending_review', 'published', 'archived')),
    CONSTRAINT legal_provisions_published_review_check
      CHECK (status != 'published' OR (
        reviewed_by IS NOT NULL
        AND reviewed_at IS NOT NULL
        AND reviewed_by != created_by
      ))
  )
`;

const createLegalProvisionsSourceIndex = `
  CREATE INDEX IF NOT EXISTS legal_provisions_source_id_idx
  ON legal_provisions (source_id)
`;

const createLegalProvisionsStatusIndex = `
  CREATE INDEX IF NOT EXISTS legal_provisions_status_idx
  ON legal_provisions (status)
`;

const createLegalSourcesCreatedByImmutableTrigger = `
  CREATE TRIGGER IF NOT EXISTS legal_sources_created_by_immutable
  BEFORE UPDATE OF created_by ON legal_sources
  WHEN NEW.created_by != OLD.created_by
  BEGIN
    SELECT RAISE(ABORT, 'legal source created_by is immutable');
  END
`;

const createLegalProvisionsCreatedByImmutableTrigger = `
  CREATE TRIGGER IF NOT EXISTS legal_provisions_created_by_immutable
  BEFORE UPDATE OF created_by ON legal_provisions
  WHEN NEW.created_by != OLD.created_by
  BEGIN
    SELECT RAISE(ABORT, 'legal provision created_by is immutable');
  END
`;

// SQLite cannot express this cross-table invariant with a CHECK constraint.
const createLegalProvisionsPublishedSourceInsertTrigger = `
  CREATE TRIGGER IF NOT EXISTS legal_provisions_published_source_insert_check
  BEFORE INSERT ON legal_provisions
  WHEN NEW.status = 'published' AND NOT EXISTS (
    SELECT 1
    FROM legal_sources
    WHERE id = NEW.source_id
      AND status = 'in_force'
      AND effective_from IS NOT NULL
      AND last_verified_at IS NOT NULL
      AND verified_by IS NOT NULL
      AND verified_by != created_by
  )
  BEGIN
    SELECT RAISE(ABORT, 'published provision requires an in-force verified source');
  END
`;

const createLegalProvisionsPublishedSourceUpdateTrigger = `
  CREATE TRIGGER IF NOT EXISTS legal_provisions_published_source_update_check
  BEFORE UPDATE ON legal_provisions
  WHEN NEW.status = 'published' AND NOT EXISTS (
    SELECT 1
    FROM legal_sources
    WHERE id = NEW.source_id
      AND status = 'in_force'
      AND effective_from IS NOT NULL
      AND last_verified_at IS NOT NULL
      AND verified_by IS NOT NULL
      AND verified_by != created_by
  )
  BEGIN
    SELECT RAISE(ABORT, 'published provision requires an in-force verified source');
  END
`;

const createLegalSourcesInvalidateProvisionsTrigger = `
  CREATE TRIGGER IF NOT EXISTS legal_sources_invalidate_published_provisions
  AFTER UPDATE ON legal_sources
  WHEN NOT (
    NEW.status = 'in_force'
    AND NEW.effective_from IS NOT NULL
    AND NEW.last_verified_at IS NOT NULL
    AND NEW.verified_by IS NOT NULL
    AND NEW.verified_by != NEW.created_by
  )
  BEGIN
    UPDATE legal_provisions
    SET status = 'pending_review',
        reviewed_by = NULL,
        reviewed_at = NULL,
        updated_at = CURRENT_TIMESTAMP
    WHERE source_id = NEW.id
      AND status = 'published';
  END
`;

const createLegalEntryCitationsTable = `
  CREATE TABLE IF NOT EXISTS legal_entry_citations (
    legal_entry_id integer NOT NULL,
    provision_id integer NOT NULL,
    display_order integer DEFAULT 0 NOT NULL,
    created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT legal_entry_citations_pk
      PRIMARY KEY (legal_entry_id, provision_id),
    CONSTRAINT legal_entry_citations_legal_entry_id_legal_entries_id_fk
      FOREIGN KEY (legal_entry_id) REFERENCES legal_entries(id)
      ON UPDATE NO ACTION ON DELETE CASCADE,
    CONSTRAINT legal_entry_citations_provision_id_legal_provisions_id_fk
      FOREIGN KEY (provision_id) REFERENCES legal_provisions(id)
      ON UPDATE NO ACTION ON DELETE RESTRICT,
    CONSTRAINT legal_entry_citations_display_order_check
      CHECK (display_order >= 0)
  )
`;

const createLegalEntryCitationsProvisionIndex = `
  CREATE INDEX IF NOT EXISTS legal_entry_citations_provision_id_idx
  ON legal_entry_citations (provision_id)
`;

let schemaInitialization: Promise<unknown> | null = null;

function requireD1() {
  if (!env.DB) {
    throw new Error(
      "Cloudflare D1 binding `DB` is unavailable. Set the `d1` field in .openai/hosting.json to `DB` or let your control plane inject the real binding values before using the database."
    );
  }

  return env.DB;
}

export function getDb() {
  return drizzle(requireD1(), { schema });
}

export async function getInitializedDb() {
  const d1 = requireD1();
  schemaInitialization ??= d1.batch([
    d1.prepare(createLegalEntriesTable),
    d1.prepare(createShowcasesTable),
    d1.prepare(createLegalSourcesTable),
    d1.prepare(createLegalSourcesDocumentNumberIndex),
    d1.prepare(createLegalSourcesOfficialUrlIndex),
    d1.prepare(createLegalSourcesStatusIndex),
    d1.prepare(createLegalProvisionsTable),
    d1.prepare(createLegalProvisionsSourceIndex),
    d1.prepare(createLegalProvisionsStatusIndex),
    d1.prepare(createLegalSourcesCreatedByImmutableTrigger),
    d1.prepare(createLegalProvisionsCreatedByImmutableTrigger),
    d1.prepare(createLegalProvisionsPublishedSourceInsertTrigger),
    d1.prepare(createLegalProvisionsPublishedSourceUpdateTrigger),
    d1.prepare(createLegalSourcesInvalidateProvisionsTrigger),
    d1.prepare(createLegalEntryCitationsTable),
    d1.prepare(createLegalEntryCitationsProvisionIndex),
  ]).catch((error) => {
    schemaInitialization = null;
    throw error;
  });
  await schemaInitialization;

  return drizzle(d1, { schema });
}
