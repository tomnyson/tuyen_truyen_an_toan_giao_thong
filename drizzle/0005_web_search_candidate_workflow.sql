PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS `web_search_candidates` (
  `id` text PRIMARY KEY NOT NULL,
  `request_id` text NOT NULL,
  `content_sha256` text NOT NULL,
  `initial_answer_text` text NOT NULL,
  `provider_model` text NOT NULL,
  `policy_version` text NOT NULL,
  `input_tokens` integer,
  `output_tokens` integer,
  `total_tokens` integer,
  `lifecycle_status` text NOT NULL DEFAULT 'draft',
  `current_revision_id` text,
  `editor_principal_id` text REFERENCES `editorial_principals`(`id`) ON DELETE restrict,
  `submitted_at` text,
  `reviewer_principal_id` text REFERENCES `editorial_principals`(`id`) ON DELETE restrict,
  `reviewed_at` text,
  `review_reason` text,
  `optimistic_version` integer NOT NULL DEFAULT 0,
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `web_search_candidates_request_unique` UNIQUE(`request_id`),
  CONSTRAINT `web_search_candidates_content_hash_check` CHECK(
    length(`content_sha256`) = 64
    AND `content_sha256` = lower(`content_sha256`)
    AND `content_sha256` NOT GLOB '*[^0-9a-f]*'
  ),
  CONSTRAINT `web_search_candidates_text_check` CHECK(
    length(trim(`initial_answer_text`)) BETWEEN 1 AND 20000
    AND length(trim(`provider_model`)) BETWEEN 1 AND 100
    AND length(trim(`policy_version`)) BETWEEN 1 AND 64
  ),
  CONSTRAINT `web_search_candidates_usage_check` CHECK(
    (`input_tokens` IS NULL OR `input_tokens` >= 0)
    AND (`output_tokens` IS NULL OR `output_tokens` >= 0)
    AND (`total_tokens` IS NULL OR `total_tokens` >= 0)
  ),
  CONSTRAINT `web_search_candidates_lifecycle_check` CHECK(
    `lifecycle_status` IN (
      'draft', 'pending_review', 'published', 'rejected', 'archived'
    )
  ),
  CONSTRAINT `web_search_candidates_version_check` CHECK(
    `optimistic_version` >= 0
  ),
  CONSTRAINT `web_search_candidates_reason_check` CHECK(
    `review_reason` IS NULL
    OR length(trim(`review_reason`)) BETWEEN 1 AND 2000
  ),
  CONSTRAINT `web_search_candidates_state_check` CHECK(
    (
      `lifecycle_status` = 'draft'
      AND `reviewer_principal_id` IS NULL
      AND `reviewed_at` IS NULL
      AND `review_reason` IS NULL
    )
    OR (
      `lifecycle_status` = 'pending_review'
      AND `current_revision_id` IS NOT NULL
      AND `editor_principal_id` IS NOT NULL
      AND `submitted_at` IS NOT NULL
      AND `reviewer_principal_id` IS NULL
      AND `reviewed_at` IS NULL
      AND `review_reason` IS NULL
    )
    OR (
      `lifecycle_status` IN ('published', 'archived')
      AND `current_revision_id` IS NOT NULL
      AND `editor_principal_id` IS NOT NULL
      AND `submitted_at` IS NOT NULL
      AND `reviewer_principal_id` IS NOT NULL
      AND `reviewed_at` IS NOT NULL
      AND `reviewer_principal_id` != `editor_principal_id`
      AND `review_reason` IS NULL
    )
    OR (
      `lifecycle_status` = 'rejected'
      AND `current_revision_id` IS NOT NULL
      AND `editor_principal_id` IS NOT NULL
      AND `submitted_at` IS NOT NULL
      AND `reviewer_principal_id` IS NOT NULL
      AND `reviewed_at` IS NOT NULL
      AND `reviewer_principal_id` != `editor_principal_id`
      AND `review_reason` IS NOT NULL
    )
  )
);

CREATE INDEX IF NOT EXISTS `web_search_candidates_status_updated_idx`
  ON `web_search_candidates` (`lifecycle_status`, `updated_at` DESC);
CREATE INDEX IF NOT EXISTS `web_search_candidates_content_hash_idx`
  ON `web_search_candidates` (`content_sha256`);

CREATE TABLE IF NOT EXISTS `web_search_candidate_sources` (
  `candidate_id` text NOT NULL REFERENCES `web_search_candidates`(`id`) ON DELETE restrict,
  `display_order` integer NOT NULL,
  `title` text NOT NULL,
  `official_url` text NOT NULL,
  `official_host` text NOT NULL,
  `url_sha256` text NOT NULL,
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`candidate_id`, `display_order`),
  CONSTRAINT `web_search_candidate_sources_url_unique`
    UNIQUE(`candidate_id`, `official_url`),
  CONSTRAINT `web_search_candidate_sources_value_check` CHECK(
    `display_order` >= 0
    AND length(trim(`title`)) BETWEEN 1 AND 240
    AND lower(`official_url`) LIKE 'https://%'
    AND length(`url_sha256`) = 64
    AND `url_sha256` = lower(`url_sha256`)
    AND `url_sha256` NOT GLOB '*[^0-9a-f]*'
  ),
  CONSTRAINT `web_search_candidate_sources_host_check` CHECK(
    lower(`official_host`) IN ('vbpl.vn', 'vbpl.moj.gov.vn', 'chinhphu.vn')
    OR lower(`official_host`) LIKE '%.chinhphu.vn'
  )
);

CREATE INDEX IF NOT EXISTS `web_search_candidate_sources_candidate_idx`
  ON `web_search_candidate_sources` (`candidate_id`, `display_order`);

CREATE TABLE IF NOT EXISTS `web_search_candidate_revisions` (
  `id` text PRIMARY KEY NOT NULL,
  `candidate_id` text NOT NULL REFERENCES `web_search_candidates`(`id`) ON DELETE restrict,
  `version` integer NOT NULL,
  `canonical_snapshot_json` text NOT NULL,
  `snapshot_sha256` text NOT NULL,
  `created_by_principal_id` text NOT NULL REFERENCES `editorial_principals`(`id`) ON DELETE restrict,
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `web_search_candidate_revisions_version_unique`
    UNIQUE(`candidate_id`, `version`),
  CONSTRAINT `web_search_candidate_revisions_value_check` CHECK(
    `version` > 0
    AND json_valid(`canonical_snapshot_json`)
    AND json_type(`canonical_snapshot_json`) = 'object'
    AND length(`canonical_snapshot_json`) BETWEEN 2 AND 262144
    AND length(`snapshot_sha256`) = 64
    AND `snapshot_sha256` = lower(`snapshot_sha256`)
    AND `snapshot_sha256` NOT GLOB '*[^0-9a-f]*'
  )
);

CREATE INDEX IF NOT EXISTS `web_search_candidate_revisions_candidate_idx`
  ON `web_search_candidate_revisions` (`candidate_id`, `version` DESC);

CREATE TABLE IF NOT EXISTS `web_search_candidate_events` (
  `id` text PRIMARY KEY NOT NULL,
  `operation_id` text NOT NULL,
  `candidate_id` text NOT NULL REFERENCES `web_search_candidates`(`id`) ON DELETE restrict,
  `revision_id` text REFERENCES `web_search_candidate_revisions`(`id`) ON DELETE restrict,
  `actor_principal_id` text REFERENCES `editorial_principals`(`id`) ON DELETE restrict,
  `actor_role` text NOT NULL,
  `action` text NOT NULL,
  `reason` text,
  `metadata_json` text,
  `occurred_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `web_search_candidate_events_operation_unique` UNIQUE(`operation_id`),
  CONSTRAINT `web_search_candidate_events_actor_check` CHECK(
    `actor_role` IN ('system', 'editor', 'reviewer', 'admin')
    AND (
      (`actor_role` = 'system' AND `actor_principal_id` IS NULL)
      OR (`actor_role` != 'system' AND `actor_principal_id` IS NOT NULL)
    )
  ),
  CONSTRAINT `web_search_candidate_events_action_check` CHECK(
    `action` IN (
      'draft_persisted', 'revision_created', 'review_submitted',
      'review_approved', 'review_rejected', 'archived'
    )
  ),
  CONSTRAINT `web_search_candidate_events_reason_check` CHECK(
    `reason` IS NULL OR length(trim(`reason`)) BETWEEN 1 AND 2000
  ),
  CONSTRAINT `web_search_candidate_events_metadata_check` CHECK(
    `metadata_json` IS NULL
    OR (
      length(`metadata_json`) <= 8192
      AND json_valid(`metadata_json`)
    )
  )
);

CREATE INDEX IF NOT EXISTS `web_search_candidate_events_candidate_idx`
  ON `web_search_candidate_events` (`candidate_id`, `occurred_at` DESC);

CREATE TABLE IF NOT EXISTS `web_search_budget_days` (
  `day_start` integer PRIMARY KEY NOT NULL,
  `reserved_tokens` integer NOT NULL DEFAULT 0,
  `actual_tokens` integer NOT NULL DEFAULT 0,
  `request_count` integer NOT NULL DEFAULT 0,
  `expires_at` integer NOT NULL,
  `updated_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `web_search_budget_days_value_check` CHECK(
    `day_start` >= 0
    AND `reserved_tokens` >= 0
    AND `actual_tokens` >= 0
    AND `request_count` >= 0
    AND `expires_at` > `day_start`
  )
);

CREATE INDEX IF NOT EXISTS `web_search_budget_days_expiry_idx`
  ON `web_search_budget_days` (`expires_at`);

CREATE TRIGGER IF NOT EXISTS `web_search_candidates_intake_immutable`
BEFORE UPDATE ON `web_search_candidates`
WHEN
  NEW.`id` IS NOT OLD.`id`
  OR NEW.`request_id` IS NOT OLD.`request_id`
  OR NEW.`content_sha256` IS NOT OLD.`content_sha256`
  OR NEW.`initial_answer_text` IS NOT OLD.`initial_answer_text`
  OR NEW.`provider_model` IS NOT OLD.`provider_model`
  OR NEW.`policy_version` IS NOT OLD.`policy_version`
  OR NEW.`input_tokens` IS NOT OLD.`input_tokens`
  OR NEW.`output_tokens` IS NOT OLD.`output_tokens`
  OR NEW.`total_tokens` IS NOT OLD.`total_tokens`
  OR NEW.`created_at` IS NOT OLD.`created_at`
BEGIN
  SELECT RAISE(ABORT, 'web search candidate intake is immutable');
END;

CREATE TRIGGER IF NOT EXISTS `web_search_candidates_no_delete`
BEFORE DELETE ON `web_search_candidates`
BEGIN
  SELECT RAISE(ABORT, 'web search candidate cannot be deleted');
END;

CREATE TRIGGER IF NOT EXISTS `web_search_candidates_transition_check`
BEFORE UPDATE OF `lifecycle_status` ON `web_search_candidates`
WHEN NEW.`lifecycle_status` != OLD.`lifecycle_status`
  AND NOT (
    (OLD.`lifecycle_status` = 'draft' AND NEW.`lifecycle_status` = 'pending_review')
    OR (OLD.`lifecycle_status` = 'pending_review' AND NEW.`lifecycle_status` IN ('published', 'rejected'))
    OR (OLD.`lifecycle_status` = 'rejected' AND NEW.`lifecycle_status` = 'draft')
    OR (OLD.`lifecycle_status` = 'published' AND NEW.`lifecycle_status` = 'archived')
  )
BEGIN
  SELECT RAISE(ABORT, 'invalid web search candidate transition');
END;

CREATE TRIGGER IF NOT EXISTS `web_search_candidates_revision_binding_check`
BEFORE UPDATE OF `current_revision_id` ON `web_search_candidates`
WHEN NEW.`current_revision_id` IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM `web_search_candidate_revisions` r
    WHERE r.`id` = NEW.`current_revision_id`
      AND r.`candidate_id` = NEW.`id`
  )
BEGIN
  SELECT RAISE(ABORT, 'candidate revision does not belong to candidate');
END;

CREATE TRIGGER IF NOT EXISTS `web_search_candidate_revisions_insert_check`
BEFORE INSERT ON `web_search_candidate_revisions`
WHEN
  NOT EXISTS (
    SELECT 1
    FROM `web_search_candidates` c
    WHERE c.`id` = NEW.`candidate_id`
      AND c.`lifecycle_status` IN ('draft', 'rejected')
  )
  OR NOT EXISTS (
    SELECT 1
    FROM `editorial_principals` p
    JOIN `editorial_role_grants` g ON g.`principal_id` = p.`id`
    WHERE p.`id` = NEW.`created_by_principal_id`
      AND p.`status` = 'active'
      AND g.`revoked_at` IS NULL
      AND g.`role` IN ('editor', 'admin')
  )
BEGIN
  SELECT RAISE(ABORT, 'active editor role required for candidate revision');
END;

CREATE TRIGGER IF NOT EXISTS `web_search_candidate_revisions_no_update`
BEFORE UPDATE ON `web_search_candidate_revisions`
BEGIN
  SELECT RAISE(ABORT, 'web search candidate revision is immutable');
END;

CREATE TRIGGER IF NOT EXISTS `web_search_candidate_revisions_no_delete`
BEFORE DELETE ON `web_search_candidate_revisions`
BEGIN
  SELECT RAISE(ABORT, 'web search candidate revision is immutable');
END;

CREATE TRIGGER IF NOT EXISTS `web_search_candidate_sources_no_update`
BEFORE UPDATE ON `web_search_candidate_sources`
BEGIN
  SELECT RAISE(ABORT, 'web search candidate source is immutable');
END;

CREATE TRIGGER IF NOT EXISTS `web_search_candidate_sources_no_delete`
BEFORE DELETE ON `web_search_candidate_sources`
BEGIN
  SELECT RAISE(ABORT, 'web search candidate source is immutable');
END;

CREATE TRIGGER IF NOT EXISTS `web_search_candidates_submit_check`
BEFORE UPDATE OF `lifecycle_status` ON `web_search_candidates`
WHEN NEW.`lifecycle_status` = 'pending_review'
  AND (
    NOT EXISTS (
      SELECT 1
      FROM `web_search_candidate_revisions` r
      WHERE r.`id` = NEW.`current_revision_id`
        AND r.`candidate_id` = NEW.`id`
        AND r.`created_by_principal_id` = NEW.`editor_principal_id`
    )
    OR NOT EXISTS (
      SELECT 1
      FROM `editorial_principals` p
      JOIN `editorial_role_grants` g ON g.`principal_id` = p.`id`
      WHERE p.`id` = NEW.`editor_principal_id`
        AND p.`status` = 'active'
        AND g.`revoked_at` IS NULL
        AND g.`role` IN ('editor', 'admin')
    )
  )
BEGIN
  SELECT RAISE(ABORT, 'active revision editor required for submission');
END;

CREATE TRIGGER IF NOT EXISTS `web_search_candidates_review_check`
BEFORE UPDATE OF `lifecycle_status` ON `web_search_candidates`
WHEN NEW.`lifecycle_status` IN ('published', 'rejected')
  AND (
    NEW.`reviewer_principal_id` = NEW.`editor_principal_id`
    OR NOT EXISTS (
      SELECT 1
      FROM `editorial_principals` p
      JOIN `editorial_role_grants` g ON g.`principal_id` = p.`id`
      WHERE p.`id` = NEW.`reviewer_principal_id`
        AND p.`status` = 'active'
        AND g.`revoked_at` IS NULL
        AND g.`role` IN ('reviewer', 'admin')
    )
  )
BEGIN
  SELECT RAISE(ABORT, 'independent active reviewer required');
END;

CREATE TRIGGER IF NOT EXISTS `web_search_candidate_events_insert_check`
BEFORE INSERT ON `web_search_candidate_events`
WHEN
  (NEW.`action` = 'draft_persisted' AND NEW.`actor_role` != 'system')
  OR (
    NEW.`action` IN ('revision_created', 'review_submitted')
    AND NEW.`actor_role` NOT IN ('editor', 'admin')
  )
  OR (
    NEW.`action` IN ('review_approved', 'review_rejected')
    AND NEW.`actor_role` NOT IN ('reviewer', 'admin')
  )
  OR (
    NEW.`action` = 'review_rejected'
    AND (NEW.`reason` IS NULL OR length(trim(NEW.`reason`)) = 0)
  )
BEGIN
  SELECT RAISE(ABORT, 'invalid web search candidate audit event');
END;

CREATE TRIGGER IF NOT EXISTS `web_search_candidate_events_no_update`
BEFORE UPDATE ON `web_search_candidate_events`
BEGIN
  SELECT RAISE(ABORT, 'web search candidate event is immutable');
END;

CREATE TRIGGER IF NOT EXISTS `web_search_candidate_events_no_delete`
BEFORE DELETE ON `web_search_candidate_events`
BEGIN
  SELECT RAISE(ABORT, 'web search candidate event is immutable');
END;
