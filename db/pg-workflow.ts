// DDL PostgreSQL cho workflow biên tập (editorial_*) và web search
// candidates — port 1:1 từ drizzle/0005_web_search_candidate_workflow.sql
// và phần editorial của drizzle/0006. Mỗi phần tử một statement, idempotent.
// json_valid/json_type của SQLite thay bằng helper plpgsql (Neon là PG15,
// chưa có IS JSON).

const helperStatements = [
  `CREATE OR REPLACE FUNCTION app_is_json(value text)
   RETURNS boolean AS $$
   BEGIN
     PERFORM value::jsonb;
     RETURN true;
   EXCEPTION WHEN others THEN
     RETURN false;
   END $$ LANGUAGE plpgsql IMMUTABLE`,
  `CREATE OR REPLACE FUNCTION app_is_json_object(value text)
   RETURNS boolean AS $$
   BEGIN
     RETURN jsonb_typeof(value::jsonb) = 'object';
   EXCEPTION WHEN others THEN
     RETURN false;
   END $$ LANGUAGE plpgsql IMMUTABLE`,
];

const editorialTables = [
  `CREATE TABLE IF NOT EXISTS editorial_principals (
  id text PRIMARY KEY,
  external_subject text,
  display_name text NOT NULL,
  status text DEFAULT 'active' NOT NULL,
  created_at text DEFAULT (now())::text NOT NULL,
  updated_at text DEFAULT (now())::text NOT NULL,
  CONSTRAINT editorial_principals_id_check
    CHECK (length(trim(id)) BETWEEN 1 AND 128),
  CONSTRAINT editorial_principals_display_name_check
    CHECK (length(trim(display_name)) BETWEEN 1 AND 200),
  CONSTRAINT editorial_principals_status_check
    CHECK (status IN ('active', 'disabled'))
)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS editorial_principals_external_subject_unique
   ON editorial_principals (external_subject) WHERE external_subject IS NOT NULL`,
  `CREATE TABLE IF NOT EXISTS editorial_role_grants (
  id text PRIMARY KEY,
  principal_id text NOT NULL REFERENCES editorial_principals(id) ON DELETE RESTRICT,
  role text NOT NULL,
  granted_by_principal_id text NOT NULL REFERENCES editorial_principals(id) ON DELETE RESTRICT,
  granted_at text DEFAULT (now())::text NOT NULL,
  revoked_by_principal_id text REFERENCES editorial_principals(id) ON DELETE RESTRICT,
  revoked_at text,
  CONSTRAINT editorial_role_grants_role_check
    CHECK (role IN ('editor', 'reviewer', 'admin')),
  CONSTRAINT editorial_role_grants_revocation_check
    CHECK ((revoked_at IS NULL AND revoked_by_principal_id IS NULL)
      OR revoked_by_principal_id IS NOT NULL)
)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS editorial_role_grants_active_unique
   ON editorial_role_grants (principal_id, role) WHERE revoked_at IS NULL`,
  `CREATE INDEX IF NOT EXISTS editorial_role_grants_principal_idx
   ON editorial_role_grants (principal_id)`,
  `CREATE TABLE IF NOT EXISTS editorial_subjects (
  id text PRIMARY KEY,
  entity_type text NOT NULL,
  entity_key text NOT NULL,
  created_by_principal_id text NOT NULL REFERENCES editorial_principals(id) ON DELETE RESTRICT,
  lifecycle_status text DEFAULT 'draft' NOT NULL,
  current_revision_id text,
  optimistic_version integer DEFAULT 0 NOT NULL,
  created_at text DEFAULT (now())::text NOT NULL,
  updated_at text DEFAULT (now())::text NOT NULL,
  CONSTRAINT editorial_subjects_identity_check
    CHECK (length(trim(id)) BETWEEN 1 AND 128
      AND length(trim(entity_type)) BETWEEN 1 AND 64
      AND length(trim(entity_key)) BETWEEN 1 AND 256),
  CONSTRAINT editorial_subjects_lifecycle_check
    CHECK (lifecycle_status IN ('draft', 'pending_review', 'published', 'archived')),
  CONSTRAINT editorial_subjects_optimistic_version_check
    CHECK (optimistic_version >= 0)
)`,
  `CREATE TABLE IF NOT EXISTS editorial_revisions (
  id text PRIMARY KEY,
  subject_id text NOT NULL REFERENCES editorial_subjects(id) ON DELETE RESTRICT,
  version integer NOT NULL,
  canonical_snapshot_json text NOT NULL,
  checksum_version text DEFAULT 'editorial-sha256-v1' NOT NULL,
  snapshot_sha256 text NOT NULL,
  created_by_principal_id text NOT NULL REFERENCES editorial_principals(id) ON DELETE RESTRICT,
  created_at text DEFAULT (now())::text NOT NULL,
  CONSTRAINT editorial_revisions_version_check CHECK (version > 0),
  CONSTRAINT editorial_revisions_snapshot_check
    CHECK (app_is_json_object(canonical_snapshot_json)
      AND length(canonical_snapshot_json) BETWEEN 2 AND 262144
      AND checksum_version = 'editorial-sha256-v1'
      AND snapshot_sha256 ~ '^[0-9a-f]{64}$')
)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS editorial_revisions_subject_version_unique
   ON editorial_revisions (subject_id, version)`,
  `CREATE INDEX IF NOT EXISTS editorial_revisions_subject_idx
   ON editorial_revisions (subject_id)`,
  `CREATE TABLE IF NOT EXISTS editorial_review_requests (
  id text PRIMARY KEY,
  operation_id text NOT NULL,
  subject_id text NOT NULL REFERENCES editorial_subjects(id) ON DELETE RESTRICT,
  revision_id text NOT NULL REFERENCES editorial_revisions(id) ON DELETE RESTRICT,
  submitted_by_principal_id text NOT NULL REFERENCES editorial_principals(id) ON DELETE RESTRICT,
  status text DEFAULT 'open' NOT NULL,
  submitted_at text DEFAULT (now())::text NOT NULL,
  decided_at text,
  CONSTRAINT editorial_review_requests_status_check
    CHECK (status IN ('open', 'approved', 'rejected', 'cancelled')),
  CONSTRAINT editorial_review_requests_operation_check
    CHECK (length(trim(operation_id)) BETWEEN 1 AND 128),
  CONSTRAINT editorial_review_requests_decision_time_check
    CHECK ((status = 'open' AND decided_at IS NULL)
      OR (status IN ('approved', 'rejected') AND decided_at IS NOT NULL)
      OR status = 'cancelled')
)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS editorial_review_requests_operation_unique
   ON editorial_review_requests (operation_id)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS editorial_review_requests_subject_revision_unique
   ON editorial_review_requests (subject_id, revision_id)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS editorial_review_requests_open_subject_unique
   ON editorial_review_requests (subject_id) WHERE status = 'open'`,
  `CREATE INDEX IF NOT EXISTS editorial_review_requests_revision_idx
   ON editorial_review_requests (revision_id)`,
  `CREATE TABLE IF NOT EXISTS editorial_review_decisions (
  id text PRIMARY KEY,
  operation_id text NOT NULL,
  review_request_id text NOT NULL REFERENCES editorial_review_requests(id) ON DELETE RESTRICT,
  revision_id text NOT NULL REFERENCES editorial_revisions(id) ON DELETE RESTRICT,
  reviewer_principal_id text NOT NULL REFERENCES editorial_principals(id) ON DELETE RESTRICT,
  decision text NOT NULL,
  reason text,
  decided_at text,
  CONSTRAINT editorial_review_decisions_value_check
    CHECK (decision IN ('approve', 'reject')),
  CONSTRAINT editorial_review_decisions_operation_check
    CHECK (length(trim(operation_id)) BETWEEN 1 AND 128),
  CONSTRAINT editorial_review_decisions_reject_reason_check
    CHECK ((reason IS NULL OR length(trim(reason)) BETWEEN 1 AND 2000)
      AND (decision != 'reject'
        OR (reason IS NOT NULL AND length(trim(reason)) > 0)))
)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS editorial_review_decisions_operation_unique
   ON editorial_review_decisions (operation_id)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS editorial_review_decisions_request_unique
   ON editorial_review_decisions (review_request_id)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS editorial_review_decisions_revision_unique
   ON editorial_review_decisions (revision_id)`,
  `CREATE TABLE IF NOT EXISTS editorial_audit_events (
  id text PRIMARY KEY,
  operation_id text NOT NULL,
  actor_principal_id text NOT NULL REFERENCES editorial_principals(id) ON DELETE RESTRICT,
  actor_role text NOT NULL,
  subject_id text REFERENCES editorial_subjects(id) ON DELETE RESTRICT,
  revision_id text REFERENCES editorial_revisions(id) ON DELETE RESTRICT,
  review_request_id text REFERENCES editorial_review_requests(id) ON DELETE RESTRICT,
  action text NOT NULL,
  before_state_json text,
  after_state_json text,
  before_hash text,
  after_hash text,
  metadata_json text,
  occurred_at text DEFAULT (now())::text NOT NULL,
  CONSTRAINT editorial_audit_events_identity_check
    CHECK (length(trim(id)) BETWEEN 1 AND 160
      AND length(trim(operation_id)) BETWEEN 1 AND 128
      AND action IN ('review_submitted', 'review_approved', 'review_rejected')),
  CONSTRAINT editorial_audit_events_role_check
    CHECK (actor_role IN ('editor', 'reviewer', 'admin')),
  CONSTRAINT editorial_audit_events_json_check
    CHECK ((before_state_json IS NULL
        OR (length(before_state_json) <= 65536 AND app_is_json(before_state_json)))
      AND (after_state_json IS NULL
        OR (length(after_state_json) <= 65536 AND app_is_json(after_state_json)))
      AND (metadata_json IS NULL
        OR (length(metadata_json) <= 65536 AND app_is_json(metadata_json)))),
  CONSTRAINT editorial_audit_events_hash_pair_check
    CHECK ((before_hash IS NULL AND after_hash IS NULL)
      OR (before_hash ~ '^[0-9a-f]{64}$' AND after_hash ~ '^[0-9a-f]{64}$'))
)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS editorial_audit_events_operation_unique
   ON editorial_audit_events (operation_id)`,
  `CREATE INDEX IF NOT EXISTS editorial_audit_events_subject_idx
   ON editorial_audit_events (subject_id)`,
];

const webSearchTables = [
  `CREATE TABLE IF NOT EXISTS web_search_candidates (
  id text PRIMARY KEY,
  request_id text NOT NULL,
  content_sha256 text NOT NULL,
  initial_answer_text text NOT NULL,
  provider_model text NOT NULL,
  policy_version text NOT NULL,
  input_tokens integer,
  output_tokens integer,
  total_tokens integer,
  lifecycle_status text NOT NULL DEFAULT 'draft',
  current_revision_id text,
  editor_principal_id text REFERENCES editorial_principals(id) ON DELETE RESTRICT,
  submitted_at text,
  reviewer_principal_id text REFERENCES editorial_principals(id) ON DELETE RESTRICT,
  reviewed_at text,
  review_reason text,
  optimistic_version integer NOT NULL DEFAULT 0,
  created_at text NOT NULL DEFAULT (now())::text,
  updated_at text NOT NULL DEFAULT (now())::text,
  CONSTRAINT web_search_candidates_request_unique UNIQUE (request_id),
  CONSTRAINT web_search_candidates_content_hash_check
    CHECK (content_sha256 ~ '^[0-9a-f]{64}$'),
  CONSTRAINT web_search_candidates_text_check
    CHECK (length(trim(initial_answer_text)) BETWEEN 1 AND 20000
      AND length(trim(provider_model)) BETWEEN 1 AND 100
      AND length(trim(policy_version)) BETWEEN 1 AND 64),
  CONSTRAINT web_search_candidates_usage_check
    CHECK ((input_tokens IS NULL OR input_tokens >= 0)
      AND (output_tokens IS NULL OR output_tokens >= 0)
      AND (total_tokens IS NULL OR total_tokens >= 0)),
  CONSTRAINT web_search_candidates_lifecycle_check
    CHECK (lifecycle_status IN (
      'draft', 'pending_review', 'published', 'rejected', 'archived'
    )),
  CONSTRAINT web_search_candidates_version_check
    CHECK (optimistic_version >= 0),
  CONSTRAINT web_search_candidates_reason_check
    CHECK (review_reason IS NULL
      OR length(trim(review_reason)) BETWEEN 1 AND 2000),
  CONSTRAINT web_search_candidates_state_check
    CHECK ((lifecycle_status = 'draft'
        AND reviewer_principal_id IS NULL
        AND reviewed_at IS NULL
        AND review_reason IS NULL)
      OR (lifecycle_status = 'pending_review'
        AND current_revision_id IS NOT NULL
        AND editor_principal_id IS NOT NULL
        AND submitted_at IS NOT NULL
        AND reviewer_principal_id IS NULL
        AND reviewed_at IS NULL
        AND review_reason IS NULL)
      OR (lifecycle_status IN ('published', 'archived')
        AND current_revision_id IS NOT NULL
        AND editor_principal_id IS NOT NULL
        AND submitted_at IS NOT NULL
        AND reviewer_principal_id IS NOT NULL
        AND reviewed_at IS NOT NULL
        AND reviewer_principal_id != editor_principal_id
        AND review_reason IS NULL)
      OR (lifecycle_status = 'rejected'
        AND current_revision_id IS NOT NULL
        AND editor_principal_id IS NOT NULL
        AND submitted_at IS NOT NULL
        AND reviewer_principal_id IS NOT NULL
        AND reviewed_at IS NOT NULL
        AND reviewer_principal_id != editor_principal_id
        AND review_reason IS NOT NULL))
)`,
  `CREATE INDEX IF NOT EXISTS web_search_candidates_status_updated_idx
   ON web_search_candidates (lifecycle_status, updated_at DESC)`,
  `CREATE INDEX IF NOT EXISTS web_search_candidates_content_hash_idx
   ON web_search_candidates (content_sha256)`,
  `CREATE TABLE IF NOT EXISTS web_search_candidate_sources (
  candidate_id text NOT NULL REFERENCES web_search_candidates(id) ON DELETE RESTRICT,
  display_order integer NOT NULL,
  title text NOT NULL,
  official_url text NOT NULL,
  official_host text NOT NULL,
  url_sha256 text NOT NULL,
  created_at text NOT NULL DEFAULT (now())::text,
  PRIMARY KEY (candidate_id, display_order),
  CONSTRAINT web_search_candidate_sources_url_unique
    UNIQUE (candidate_id, official_url),
  CONSTRAINT web_search_candidate_sources_value_check
    CHECK (display_order >= 0
      AND length(trim(title)) BETWEEN 1 AND 240
      AND lower(official_url) LIKE 'https://%'
      AND url_sha256 ~ '^[0-9a-f]{64}$'),
  CONSTRAINT web_search_candidate_sources_host_check
    CHECK (lower(official_host) IN ('vbpl.vn', 'vbpl.moj.gov.vn', 'chinhphu.vn')
      OR lower(official_host) LIKE '%.chinhphu.vn')
)`,
  `CREATE INDEX IF NOT EXISTS web_search_candidate_sources_candidate_idx
   ON web_search_candidate_sources (candidate_id, display_order)`,
  `CREATE TABLE IF NOT EXISTS web_search_candidate_revisions (
  id text PRIMARY KEY,
  candidate_id text NOT NULL REFERENCES web_search_candidates(id) ON DELETE RESTRICT,
  version integer NOT NULL,
  canonical_snapshot_json text NOT NULL,
  snapshot_sha256 text NOT NULL,
  created_by_principal_id text NOT NULL REFERENCES editorial_principals(id) ON DELETE RESTRICT,
  created_at text NOT NULL DEFAULT (now())::text,
  CONSTRAINT web_search_candidate_revisions_version_unique
    UNIQUE (candidate_id, version),
  CONSTRAINT web_search_candidate_revisions_value_check
    CHECK (version > 0
      AND app_is_json_object(canonical_snapshot_json)
      AND length(canonical_snapshot_json) BETWEEN 2 AND 262144
      AND snapshot_sha256 ~ '^[0-9a-f]{64}$')
)`,
  `CREATE INDEX IF NOT EXISTS web_search_candidate_revisions_candidate_idx
   ON web_search_candidate_revisions (candidate_id, version DESC)`,
  `CREATE TABLE IF NOT EXISTS web_search_candidate_events (
  id text PRIMARY KEY,
  operation_id text NOT NULL,
  candidate_id text NOT NULL REFERENCES web_search_candidates(id) ON DELETE RESTRICT,
  revision_id text REFERENCES web_search_candidate_revisions(id) ON DELETE RESTRICT,
  actor_principal_id text REFERENCES editorial_principals(id) ON DELETE RESTRICT,
  actor_role text NOT NULL,
  action text NOT NULL,
  reason text,
  metadata_json text,
  occurred_at text NOT NULL DEFAULT (now())::text,
  CONSTRAINT web_search_candidate_events_operation_unique UNIQUE (operation_id),
  CONSTRAINT web_search_candidate_events_actor_check
    CHECK (actor_role IN ('system', 'editor', 'reviewer', 'admin')
      AND ((actor_role = 'system' AND actor_principal_id IS NULL)
        OR (actor_role != 'system' AND actor_principal_id IS NOT NULL))),
  CONSTRAINT web_search_candidate_events_action_check
    CHECK (action IN (
      'draft_persisted', 'revision_created', 'review_submitted',
      'review_approved', 'review_rejected', 'archived'
    )),
  CONSTRAINT web_search_candidate_events_reason_check
    CHECK (reason IS NULL OR length(trim(reason)) BETWEEN 1 AND 2000),
  CONSTRAINT web_search_candidate_events_metadata_check
    CHECK (metadata_json IS NULL
      OR (length(metadata_json) <= 8192 AND app_is_json(metadata_json)))
)`,
  `CREATE INDEX IF NOT EXISTS web_search_candidate_events_candidate_idx
   ON web_search_candidate_events (candidate_id, occurred_at DESC)`,
  `CREATE TABLE IF NOT EXISTS web_search_budget_days (
  day_start integer PRIMARY KEY,
  reserved_tokens integer NOT NULL DEFAULT 0,
  actual_tokens integer NOT NULL DEFAULT 0,
  request_count integer NOT NULL DEFAULT 0,
  expires_at integer NOT NULL,
  updated_at text NOT NULL DEFAULT (now())::text,
  CONSTRAINT web_search_budget_days_value_check
    CHECK (day_start >= 0
      AND reserved_tokens >= 0
      AND actual_tokens >= 0
      AND request_count >= 0
      AND expires_at > day_start)
)`,
  `CREATE INDEX IF NOT EXISTS web_search_budget_days_expiry_idx
   ON web_search_budget_days (expires_at)`,
];

const workflowTriggers = [
  `CREATE OR REPLACE FUNCTION web_search_candidates_intake_immutable_fn()
   RETURNS trigger AS $$
   BEGIN
     IF NEW.id IS DISTINCT FROM OLD.id
        OR NEW.request_id IS DISTINCT FROM OLD.request_id
        OR NEW.content_sha256 IS DISTINCT FROM OLD.content_sha256
        OR NEW.initial_answer_text IS DISTINCT FROM OLD.initial_answer_text
        OR NEW.provider_model IS DISTINCT FROM OLD.provider_model
        OR NEW.policy_version IS DISTINCT FROM OLD.policy_version
        OR NEW.input_tokens IS DISTINCT FROM OLD.input_tokens
        OR NEW.output_tokens IS DISTINCT FROM OLD.output_tokens
        OR NEW.total_tokens IS DISTINCT FROM OLD.total_tokens
        OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
       RAISE EXCEPTION 'web search candidate intake is immutable';
     END IF;
     RETURN NEW;
   END $$ LANGUAGE plpgsql`,
  `CREATE OR REPLACE TRIGGER web_search_candidates_intake_immutable
   BEFORE UPDATE ON web_search_candidates
   FOR EACH ROW EXECUTE FUNCTION web_search_candidates_intake_immutable_fn()`,

  `CREATE OR REPLACE FUNCTION app_forbid_row_fn()
   RETURNS trigger AS $$
   BEGIN
     RAISE EXCEPTION '%', TG_ARGV[0];
     RETURN NULL;
   END $$ LANGUAGE plpgsql`,
  `CREATE OR REPLACE TRIGGER web_search_candidates_no_delete
   BEFORE DELETE ON web_search_candidates
   FOR EACH ROW EXECUTE FUNCTION app_forbid_row_fn('web search candidate cannot be deleted')`,
  `CREATE OR REPLACE TRIGGER web_search_candidate_revisions_no_update
   BEFORE UPDATE ON web_search_candidate_revisions
   FOR EACH ROW EXECUTE FUNCTION app_forbid_row_fn('web search candidate revision is immutable')`,
  `CREATE OR REPLACE TRIGGER web_search_candidate_revisions_no_delete
   BEFORE DELETE ON web_search_candidate_revisions
   FOR EACH ROW EXECUTE FUNCTION app_forbid_row_fn('web search candidate revision is immutable')`,
  `CREATE OR REPLACE TRIGGER web_search_candidate_sources_no_update
   BEFORE UPDATE ON web_search_candidate_sources
   FOR EACH ROW EXECUTE FUNCTION app_forbid_row_fn('web search candidate source is immutable')`,
  `CREATE OR REPLACE TRIGGER web_search_candidate_sources_no_delete
   BEFORE DELETE ON web_search_candidate_sources
   FOR EACH ROW EXECUTE FUNCTION app_forbid_row_fn('web search candidate source is immutable')`,
  `CREATE OR REPLACE TRIGGER web_search_candidate_events_no_update
   BEFORE UPDATE ON web_search_candidate_events
   FOR EACH ROW EXECUTE FUNCTION app_forbid_row_fn('web search candidate event is immutable')`,
  `CREATE OR REPLACE TRIGGER web_search_candidate_events_no_delete
   BEFORE DELETE ON web_search_candidate_events
   FOR EACH ROW EXECUTE FUNCTION app_forbid_row_fn('web search candidate event is immutable')`,

  `CREATE OR REPLACE FUNCTION web_search_candidates_transition_check_fn()
   RETURNS trigger AS $$
   BEGIN
     IF NEW.lifecycle_status != OLD.lifecycle_status
        AND NOT (
          (OLD.lifecycle_status = 'draft' AND NEW.lifecycle_status = 'pending_review')
          OR (OLD.lifecycle_status = 'pending_review' AND NEW.lifecycle_status IN ('published', 'rejected'))
          OR (OLD.lifecycle_status = 'rejected' AND NEW.lifecycle_status = 'draft')
          OR (OLD.lifecycle_status = 'published' AND NEW.lifecycle_status = 'archived')
        ) THEN
       RAISE EXCEPTION 'invalid web search candidate transition';
     END IF;
     RETURN NEW;
   END $$ LANGUAGE plpgsql`,
  `CREATE OR REPLACE TRIGGER web_search_candidates_transition_check
   BEFORE UPDATE OF lifecycle_status ON web_search_candidates
   FOR EACH ROW EXECUTE FUNCTION web_search_candidates_transition_check_fn()`,

  `CREATE OR REPLACE FUNCTION web_search_candidates_revision_binding_check_fn()
   RETURNS trigger AS $$
   BEGIN
     IF NEW.current_revision_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM web_search_candidate_revisions r
          WHERE r.id = NEW.current_revision_id
            AND r.candidate_id = NEW.id
        ) THEN
       RAISE EXCEPTION 'candidate revision does not belong to candidate';
     END IF;
     RETURN NEW;
   END $$ LANGUAGE plpgsql`,
  `CREATE OR REPLACE TRIGGER web_search_candidates_revision_binding_check
   BEFORE UPDATE OF current_revision_id ON web_search_candidates
   FOR EACH ROW EXECUTE FUNCTION web_search_candidates_revision_binding_check_fn()`,

  `CREATE OR REPLACE FUNCTION web_search_candidate_revisions_insert_check_fn()
   RETURNS trigger AS $$
   BEGIN
     IF NOT EXISTS (
          SELECT 1 FROM web_search_candidates c
          WHERE c.id = NEW.candidate_id
            AND c.lifecycle_status IN ('draft', 'rejected')
        )
        OR NOT EXISTS (
          SELECT 1
          FROM editorial_principals p
          JOIN editorial_role_grants g ON g.principal_id = p.id
          WHERE p.id = NEW.created_by_principal_id
            AND p.status = 'active'
            AND g.revoked_at IS NULL
            AND g.role IN ('editor', 'admin')
        ) THEN
       RAISE EXCEPTION 'active editor role required for candidate revision';
     END IF;
     RETURN NEW;
   END $$ LANGUAGE plpgsql`,
  `CREATE OR REPLACE TRIGGER web_search_candidate_revisions_insert_check
   BEFORE INSERT ON web_search_candidate_revisions
   FOR EACH ROW EXECUTE FUNCTION web_search_candidate_revisions_insert_check_fn()`,

  `CREATE OR REPLACE FUNCTION web_search_candidates_submit_check_fn()
   RETURNS trigger AS $$
   BEGIN
     IF NEW.lifecycle_status = 'pending_review'
        AND (
          NOT EXISTS (
            SELECT 1 FROM web_search_candidate_revisions r
            WHERE r.id = NEW.current_revision_id
              AND r.candidate_id = NEW.id
              AND r.created_by_principal_id = NEW.editor_principal_id
          )
          OR NOT EXISTS (
            SELECT 1
            FROM editorial_principals p
            JOIN editorial_role_grants g ON g.principal_id = p.id
            WHERE p.id = NEW.editor_principal_id
              AND p.status = 'active'
              AND g.revoked_at IS NULL
              AND g.role IN ('editor', 'admin')
          )
        ) THEN
       RAISE EXCEPTION 'active revision editor required for submission';
     END IF;
     RETURN NEW;
   END $$ LANGUAGE plpgsql`,
  `CREATE OR REPLACE TRIGGER web_search_candidates_submit_check
   BEFORE UPDATE OF lifecycle_status ON web_search_candidates
   FOR EACH ROW EXECUTE FUNCTION web_search_candidates_submit_check_fn()`,

  `CREATE OR REPLACE FUNCTION web_search_candidates_review_check_fn()
   RETURNS trigger AS $$
   BEGIN
     IF NEW.lifecycle_status IN ('published', 'rejected')
        AND (
          NEW.reviewer_principal_id = NEW.editor_principal_id
          OR NOT EXISTS (
            SELECT 1
            FROM editorial_principals p
            JOIN editorial_role_grants g ON g.principal_id = p.id
            WHERE p.id = NEW.reviewer_principal_id
              AND p.status = 'active'
              AND g.revoked_at IS NULL
              AND g.role IN ('reviewer', 'admin')
          )
        ) THEN
       RAISE EXCEPTION 'independent active reviewer required';
     END IF;
     RETURN NEW;
   END $$ LANGUAGE plpgsql`,
  `CREATE OR REPLACE TRIGGER web_search_candidates_review_check
   BEFORE UPDATE OF lifecycle_status ON web_search_candidates
   FOR EACH ROW EXECUTE FUNCTION web_search_candidates_review_check_fn()`,

  `CREATE OR REPLACE FUNCTION web_search_candidate_events_insert_check_fn()
   RETURNS trigger AS $$
   BEGIN
     IF (NEW.action = 'draft_persisted' AND NEW.actor_role != 'system')
        OR (NEW.action IN ('revision_created', 'review_submitted')
          AND NEW.actor_role NOT IN ('editor', 'admin'))
        OR (NEW.action IN ('review_approved', 'review_rejected')
          AND NEW.actor_role NOT IN ('reviewer', 'admin'))
        OR (NEW.action = 'review_rejected'
          AND (NEW.reason IS NULL OR length(trim(NEW.reason)) = 0)) THEN
       RAISE EXCEPTION 'invalid web search candidate audit event';
     END IF;
     RETURN NEW;
   END $$ LANGUAGE plpgsql`,
  `CREATE OR REPLACE TRIGGER web_search_candidate_events_insert_check
   BEFORE INSERT ON web_search_candidate_events
   FOR EACH ROW EXECUTE FUNCTION web_search_candidate_events_insert_check_fn()`,
];

export const pgWorkflowStatements: readonly string[] = [
  ...helperStatements,
  ...editorialTables,
  ...webSearchTables,
  ...workflowTriggers,
];
