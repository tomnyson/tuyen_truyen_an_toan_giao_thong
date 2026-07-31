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
    review_status text DEFAULT 'legacy_unverified' NOT NULL,
    created_by text,
    reviewed_by text,
    reviewed_at text,
    created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at text DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT legal_entries_status_check
      CHECK (status IN ('draft', 'published')),
    CONSTRAINT legal_entries_review_status_check
      CHECK (review_status IN ('legacy_unverified', 'four_eyes_verified')),
    CONSTRAINT legal_entries_four_eyes_review_check
      CHECK (review_status != 'four_eyes_verified' OR (
        status = 'published'
        AND created_by IS NOT NULL
        AND reviewed_by IS NOT NULL
        AND reviewed_at IS NOT NULL
        AND reviewed_by != created_by
      ))
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
    revision_id text,
    checksum_version text,
    checksum_sha256 text,
    effectivity_status text DEFAULT 'unknown' NOT NULL,
    effective_from text,
    effective_to text,
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
      )),
    CONSTRAINT legal_provisions_effectivity_status_check
      CHECK (effectivity_status IN (
        'unknown', 'in_force', 'partially_in_force', 'superseded', 'expired'
      )),
    CONSTRAINT legal_provisions_effectivity_window_check
      CHECK (
        effective_to IS NULL
        OR effective_from IS NOT NULL AND effective_to >= effective_from
      ),
    CONSTRAINT legal_provisions_revision_metadata_check
      CHECK (
        (
          revision_id IS NULL
          AND checksum_version IS NULL
          AND checksum_sha256 IS NULL
        ) OR (
          revision_id IS NOT NULL
          AND length(revision_id) BETWEEN 1 AND 128
          AND substr(revision_id, 1, 1) GLOB '[A-Za-z0-9]'
          AND revision_id NOT GLOB '*[^A-Za-z0-9._:-]*'
          AND checksum_version = 'provision-sha256-v1'
          AND length(checksum_sha256) = 64
          AND checksum_sha256 = lower(checksum_sha256)
          AND checksum_sha256 NOT GLOB '*[^0-9a-f]*'
        )
      ),
    CONSTRAINT legal_provisions_published_readiness_check
      CHECK (status != 'published' OR (
        revision_id IS NOT NULL
        AND checksum_version = 'provision-sha256-v1'
        AND checksum_sha256 IS NOT NULL
        AND effectivity_status = 'in_force'
        AND effective_from IS NOT NULL
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

const createLegalProvisionsRevisionIndex = `
  CREATE UNIQUE INDEX IF NOT EXISTS legal_provisions_revision_id_unique
  ON legal_provisions (revision_id)
  WHERE revision_id IS NOT NULL
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

const createLegalEntriesCreatedByImmutableTrigger = `
  CREATE TRIGGER IF NOT EXISTS legal_entries_created_by_immutable
  BEFORE UPDATE OF created_by ON legal_entries
  WHEN OLD.created_by IS NOT NULL AND NEW.created_by IS NOT OLD.created_by
  BEGIN
    SELECT RAISE(ABORT, 'legal entry created_by is immutable');
  END
`;

const createLegalEntriesReviewInsertTrigger = `
  CREATE TRIGGER IF NOT EXISTS legal_entries_review_insert_check
  BEFORE INSERT ON legal_entries
  WHEN (
    NEW.review_status = 'legacy_unverified'
    AND (NEW.reviewed_by IS NOT NULL OR NEW.reviewed_at IS NOT NULL)
  ) OR (
    NEW.review_status = 'four_eyes_verified'
    AND (
      NEW.status != 'published'
      OR NEW.created_by IS NULL
      OR length(trim(NEW.created_by)) = 0
      OR NEW.reviewed_by IS NULL
      OR length(trim(NEW.reviewed_by)) = 0
      OR NEW.reviewed_at IS NULL
      OR NEW.reviewed_by = NEW.created_by
    )
  )
  BEGIN
    SELECT RAISE(ABORT, 'invalid legal entry review metadata');
  END
`;

const createLegalEntriesReviewUpdateTrigger = `
  CREATE TRIGGER IF NOT EXISTS legal_entries_review_update_check
  BEFORE UPDATE ON legal_entries
  WHEN (
    NEW.review_status = 'legacy_unverified'
    AND (NEW.reviewed_by IS NOT NULL OR NEW.reviewed_at IS NOT NULL)
  ) OR (
    NEW.review_status = 'four_eyes_verified'
    AND (
      NEW.status != 'published'
      OR NEW.created_by IS NULL
      OR length(trim(NEW.created_by)) = 0
      OR NEW.reviewed_by IS NULL
      OR length(trim(NEW.reviewed_by)) = 0
      OR NEW.reviewed_at IS NULL
      OR NEW.reviewed_by = NEW.created_by
    )
  )
  BEGIN
    SELECT RAISE(ABORT, 'invalid legal entry review metadata');
  END
`;

const createLegalEntriesMaterialInvalidationTrigger = `
  CREATE TRIGGER IF NOT EXISTS legal_entries_material_change_invalidates_review
  AFTER UPDATE OF topic, icon, title, legal_basis, penalty, remedy, case_study, tags
  ON legal_entries
  WHEN (
    NEW.topic IS NOT OLD.topic
    OR NEW.icon IS NOT OLD.icon
    OR NEW.title IS NOT OLD.title
    OR NEW.legal_basis IS NOT OLD.legal_basis
    OR NEW.penalty IS NOT OLD.penalty
    OR NEW.remedy IS NOT OLD.remedy
    OR NEW.case_study IS NOT OLD.case_study
    OR NEW.tags IS NOT OLD.tags
  )
  BEGIN
    UPDATE legal_entries
    SET review_status = 'legacy_unverified',
        reviewed_by = NULL,
        reviewed_at = NULL,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.id
      AND review_status = 'four_eyes_verified';

    UPDATE legal_entry_citations
    SET review_status = 'legacy_unverified',
        reviewed_by = NULL,
        reviewed_at = NULL
    WHERE legal_entry_id = NEW.id;
  END
`;

const createLegalProvisionsRevisionImmutableTrigger = `
  CREATE TRIGGER IF NOT EXISTS legal_provisions_revision_immutable
  BEFORE UPDATE OF source_id, article, clause, point, original_text,
    simplified_text, revision_id, checksum_version, checksum_sha256,
    effectivity_status, effective_from, effective_to
  ON legal_provisions
  WHEN OLD.revision_id IS NOT NULL AND (
    NEW.source_id IS NOT OLD.source_id
    OR NEW.article IS NOT OLD.article
    OR NEW.clause IS NOT OLD.clause
    OR NEW.point IS NOT OLD.point
    OR NEW.original_text IS NOT OLD.original_text
    OR NEW.simplified_text IS NOT OLD.simplified_text
    OR NEW.revision_id IS NOT OLD.revision_id
    OR NEW.checksum_version IS NOT OLD.checksum_version
    OR NEW.checksum_sha256 IS NOT OLD.checksum_sha256
    OR NEW.effectivity_status IS NOT OLD.effectivity_status
    OR NEW.effective_from IS NOT OLD.effective_from
    OR NEW.effective_to IS NOT OLD.effective_to
  )
  BEGIN
    SELECT RAISE(ABORT, 'provision revision is immutable');
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
    review_status text DEFAULT 'legacy_unverified' NOT NULL,
    created_by text,
    reviewed_by text,
    reviewed_at text,
    cited_revision_id text,
    cited_checksum_version text,
    cited_checksum_sha256 text,
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
      CHECK (display_order >= 0),
    CONSTRAINT legal_entry_citations_review_status_check
      CHECK (review_status IN ('legacy_unverified', 'four_eyes_verified')),
    CONSTRAINT legal_entry_citations_four_eyes_review_check
      CHECK (review_status != 'four_eyes_verified' OR (
        created_by IS NOT NULL
        AND reviewed_by IS NOT NULL
        AND reviewed_at IS NOT NULL
        AND reviewed_by != created_by
        AND cited_revision_id IS NOT NULL
        AND cited_checksum_version = 'provision-sha256-v1'
        AND cited_checksum_sha256 IS NOT NULL
      ))
  )
`;

const createLegalEntryCitationsProvisionIndex = `
  CREATE INDEX IF NOT EXISTS legal_entry_citations_provision_id_idx
  ON legal_entry_citations (provision_id)
`;

const createLegalEntryCitationsRelationImmutableTrigger = `
  CREATE TRIGGER IF NOT EXISTS legal_entry_citations_relation_immutable
  BEFORE UPDATE OF legal_entry_id, provision_id ON legal_entry_citations
  WHEN
    NEW.legal_entry_id IS NOT OLD.legal_entry_id
    OR NEW.provision_id IS NOT OLD.provision_id
  BEGIN
    SELECT RAISE(ABORT, 'citation relation is immutable');
  END
`;

const createLegalEntryCitationsCreatedByImmutableTrigger = `
  CREATE TRIGGER IF NOT EXISTS legal_entry_citations_created_by_immutable
  BEFORE UPDATE OF created_by ON legal_entry_citations
  WHEN OLD.created_by IS NOT NULL AND NEW.created_by IS NOT OLD.created_by
  BEGIN
    SELECT RAISE(ABORT, 'citation created_by is immutable');
  END
`;

const createLegalEntryCitationsReviewInsertTrigger = `
  CREATE TRIGGER IF NOT EXISTS legal_entry_citations_review_insert_check
  BEFORE INSERT ON legal_entry_citations
  WHEN (
    NEW.review_status = 'legacy_unverified'
    AND (NEW.reviewed_by IS NOT NULL OR NEW.reviewed_at IS NOT NULL)
  ) OR (
    NEW.review_status = 'four_eyes_verified'
    AND (
      NEW.created_by IS NULL
      OR length(trim(NEW.created_by)) = 0
      OR NEW.reviewed_by IS NULL
      OR length(trim(NEW.reviewed_by)) = 0
      OR NEW.reviewed_at IS NULL
      OR NEW.reviewed_by = NEW.created_by
      OR NEW.cited_revision_id IS NULL
      OR NEW.cited_checksum_version != 'provision-sha256-v1'
      OR NEW.cited_checksum_sha256 IS NULL
      OR NOT EXISTS (
        SELECT 1
        FROM legal_entries AS entry
        INNER JOIN legal_provisions AS provision
          ON provision.id = NEW.provision_id
        INNER JOIN legal_sources AS source
          ON source.id = provision.source_id
        WHERE entry.id = NEW.legal_entry_id
          AND entry.status = 'published'
          AND entry.review_status = 'four_eyes_verified'
          AND provision.status = 'published'
          AND provision.revision_id = NEW.cited_revision_id
          AND provision.checksum_version = NEW.cited_checksum_version
          AND provision.checksum_sha256 = NEW.cited_checksum_sha256
          AND provision.effectivity_status = 'in_force'
          AND source.status = 'in_force'
      )
    )
  )
  BEGIN
    SELECT RAISE(ABORT, 'invalid citation review or revision binding');
  END
`;

const createLegalEntryCitationsReviewUpdateTrigger = `
  CREATE TRIGGER IF NOT EXISTS legal_entry_citations_review_update_check
  BEFORE UPDATE ON legal_entry_citations
  WHEN (
    NEW.review_status = 'legacy_unverified'
    AND (NEW.reviewed_by IS NOT NULL OR NEW.reviewed_at IS NOT NULL)
  ) OR (
    NEW.review_status = 'four_eyes_verified'
    AND (
      NEW.created_by IS NULL
      OR length(trim(NEW.created_by)) = 0
      OR NEW.reviewed_by IS NULL
      OR length(trim(NEW.reviewed_by)) = 0
      OR NEW.reviewed_at IS NULL
      OR NEW.reviewed_by = NEW.created_by
      OR NEW.cited_revision_id IS NULL
      OR NEW.cited_checksum_version != 'provision-sha256-v1'
      OR NEW.cited_checksum_sha256 IS NULL
      OR NOT EXISTS (
        SELECT 1
        FROM legal_entries AS entry
        INNER JOIN legal_provisions AS provision
          ON provision.id = NEW.provision_id
        INNER JOIN legal_sources AS source
          ON source.id = provision.source_id
        WHERE entry.id = NEW.legal_entry_id
          AND entry.status = 'published'
          AND entry.review_status = 'four_eyes_verified'
          AND provision.status = 'published'
          AND provision.revision_id = NEW.cited_revision_id
          AND provision.checksum_version = NEW.cited_checksum_version
          AND provision.checksum_sha256 = NEW.cited_checksum_sha256
          AND provision.effectivity_status = 'in_force'
          AND source.status = 'in_force'
      )
    )
  )
  BEGIN
    SELECT RAISE(ABORT, 'invalid citation review or revision binding');
  END
`;

const createLegalEntryCitationsBindingInvalidationTrigger = `
  CREATE TRIGGER IF NOT EXISTS legal_entry_citations_binding_change_invalidates_review
  AFTER UPDATE OF cited_revision_id, cited_checksum_version, cited_checksum_sha256
  ON legal_entry_citations
  WHEN OLD.review_status = 'four_eyes_verified' AND (
    NEW.cited_revision_id IS NOT OLD.cited_revision_id
    OR NEW.cited_checksum_version IS NOT OLD.cited_checksum_version
    OR NEW.cited_checksum_sha256 IS NOT OLD.cited_checksum_sha256
  )
  BEGIN
    UPDATE legal_entry_citations
    SET review_status = 'legacy_unverified',
        reviewed_by = NULL,
        reviewed_at = NULL
    WHERE legal_entry_id = NEW.legal_entry_id
      AND provision_id = NEW.provision_id;
  END
`;

const createLegalProvisionsCitationInvalidationTrigger = `
  CREATE TRIGGER IF NOT EXISTS legal_provisions_state_invalidates_citations
  AFTER UPDATE OF status, reviewed_by, reviewed_at ON legal_provisions
  WHEN OLD.status = 'published' AND (
    NEW.status != 'published'
    OR NEW.reviewed_by IS NULL
    OR NEW.reviewed_at IS NULL
  )
  BEGIN
    UPDATE legal_entry_citations
    SET review_status = 'legacy_unverified',
        reviewed_by = NULL,
        reviewed_at = NULL
    WHERE provision_id = NEW.id;
  END
`;

const createLegalSourcesRagInvalidationTrigger = `
  CREATE TRIGGER IF NOT EXISTS legal_sources_material_change_invalidates_rag
  AFTER UPDATE OF document_number, title, official_url, official_host,
    effective_from, effective_to, status, last_verified_at, verified_by
  ON legal_sources
  WHEN
    NEW.document_number IS NOT OLD.document_number
    OR NEW.title IS NOT OLD.title
    OR NEW.official_url IS NOT OLD.official_url
    OR NEW.official_host IS NOT OLD.official_host
    OR NEW.effective_from IS NOT OLD.effective_from
    OR NEW.effective_to IS NOT OLD.effective_to
    OR NEW.status IS NOT OLD.status
    OR NEW.last_verified_at IS NOT OLD.last_verified_at
    OR NEW.verified_by IS NOT OLD.verified_by
  BEGIN
    UPDATE legal_entry_citations
    SET review_status = 'legacy_unverified',
        reviewed_by = NULL,
        reviewed_at = NULL
    WHERE provision_id IN (
      SELECT id FROM legal_provisions WHERE source_id = NEW.id
    );

    UPDATE legal_provisions
    SET status = 'pending_review',
        reviewed_by = NULL,
        reviewed_at = NULL,
        updated_at = CURRENT_TIMESTAMP
    WHERE source_id = NEW.id
      AND status = 'published';
  END
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
    d1.prepare(createLegalProvisionsRevisionIndex),
    d1.prepare(createLegalSourcesCreatedByImmutableTrigger),
    d1.prepare(createLegalEntriesCreatedByImmutableTrigger),
    d1.prepare(createLegalEntriesReviewInsertTrigger),
    d1.prepare(createLegalEntriesReviewUpdateTrigger),
    d1.prepare(createLegalProvisionsCreatedByImmutableTrigger),
    d1.prepare(createLegalProvisionsRevisionImmutableTrigger),
    d1.prepare(createLegalProvisionsPublishedSourceInsertTrigger),
    d1.prepare(createLegalProvisionsPublishedSourceUpdateTrigger),
    d1.prepare(createLegalSourcesInvalidateProvisionsTrigger),
    d1.prepare(createLegalEntryCitationsTable),
    d1.prepare(createLegalEntryCitationsProvisionIndex),
    d1.prepare(createLegalEntriesMaterialInvalidationTrigger),
    d1.prepare(createLegalEntryCitationsRelationImmutableTrigger),
    d1.prepare(createLegalEntryCitationsCreatedByImmutableTrigger),
    d1.prepare(createLegalEntryCitationsReviewInsertTrigger),
    d1.prepare(createLegalEntryCitationsReviewUpdateTrigger),
    d1.prepare(createLegalEntryCitationsBindingInvalidationTrigger),
    d1.prepare(createLegalProvisionsCitationInvalidationTrigger),
    d1.prepare(createLegalSourcesRagInvalidationTrigger),
  ]).catch((error) => {
    schemaInitialization = null;
    throw error;
  });
  await schemaInitialization;

  return drizzle(d1, { schema });
}
