CREATE TABLE `editorial_audit_events` (
	`id` text PRIMARY KEY NOT NULL,
	`operation_id` text NOT NULL,
	`actor_principal_id` text NOT NULL,
	`actor_role` text NOT NULL,
	`subject_id` text,
	`revision_id` text,
	`review_request_id` text,
	`action` text NOT NULL,
	`before_state_json` text,
	`after_state_json` text,
	`before_hash` text,
	`after_hash` text,
	`metadata_json` text,
	`occurred_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`actor_principal_id`) REFERENCES `editorial_principals`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`subject_id`) REFERENCES `editorial_subjects`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`revision_id`) REFERENCES `editorial_revisions`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`review_request_id`) REFERENCES `editorial_review_requests`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "editorial_audit_events_identity_check" CHECK(length(trim("editorial_audit_events"."id")) between 1 and 160
        and length(trim("editorial_audit_events"."operation_id")) between 1 and 128
        and "editorial_audit_events"."action" in (
          'review_submitted', 'review_approved', 'review_rejected'
        )),
	CONSTRAINT "editorial_audit_events_role_check" CHECK("editorial_audit_events"."actor_role" in ('editor', 'reviewer', 'admin')),
	CONSTRAINT "editorial_audit_events_json_check" CHECK((
          "editorial_audit_events"."before_state_json" is null
          or (
            length("editorial_audit_events"."before_state_json") <= 65536
            and json_valid("editorial_audit_events"."before_state_json")
          )
        )
        and (
          "editorial_audit_events"."after_state_json" is null
          or (
            length("editorial_audit_events"."after_state_json") <= 65536
            and json_valid("editorial_audit_events"."after_state_json")
          )
        )
        and (
          "editorial_audit_events"."metadata_json" is null
          or (
            length("editorial_audit_events"."metadata_json") <= 65536
            and json_valid("editorial_audit_events"."metadata_json")
          )
        )),
	CONSTRAINT "editorial_audit_events_hash_pair_check" CHECK(("editorial_audit_events"."before_hash" is null and "editorial_audit_events"."after_hash" is null)
        or (
          "editorial_audit_events"."before_hash" is not null
          and "editorial_audit_events"."after_hash" is not null
          and length("editorial_audit_events"."before_hash") = 64
          and "editorial_audit_events"."before_hash" = lower("editorial_audit_events"."before_hash")
          and "editorial_audit_events"."before_hash" not glob '*[^0-9a-f]*'
          and length("editorial_audit_events"."after_hash") = 64
          and "editorial_audit_events"."after_hash" = lower("editorial_audit_events"."after_hash")
          and "editorial_audit_events"."after_hash" not glob '*[^0-9a-f]*'
        ))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `editorial_audit_events_operation_unique` ON `editorial_audit_events` (`operation_id`);--> statement-breakpoint
CREATE INDEX `editorial_audit_events_subject_idx` ON `editorial_audit_events` (`subject_id`);--> statement-breakpoint
CREATE TABLE `editorial_principals` (
	`id` text PRIMARY KEY NOT NULL,
	`external_subject` text,
	`display_name` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "editorial_principals_id_check" CHECK(length(trim("editorial_principals"."id")) between 1 and 128),
	CONSTRAINT "editorial_principals_display_name_check" CHECK(length(trim("editorial_principals"."display_name")) between 1 and 200),
	CONSTRAINT "editorial_principals_status_check" CHECK("editorial_principals"."status" in ('active', 'disabled'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `editorial_principals_external_subject_unique` ON `editorial_principals` (`external_subject`) WHERE "editorial_principals"."external_subject" is not null;--> statement-breakpoint
CREATE TABLE `editorial_review_decisions` (
	`id` text PRIMARY KEY NOT NULL,
	`operation_id` text NOT NULL,
	`review_request_id` text NOT NULL,
	`revision_id` text NOT NULL,
	`reviewer_principal_id` text NOT NULL,
	`decision` text NOT NULL,
	`reason` text,
	`decided_at` text,
	FOREIGN KEY (`review_request_id`) REFERENCES `editorial_review_requests`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`revision_id`) REFERENCES `editorial_revisions`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`reviewer_principal_id`) REFERENCES `editorial_principals`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "editorial_review_decisions_value_check" CHECK("editorial_review_decisions"."decision" in ('approve', 'reject')),
	CONSTRAINT "editorial_review_decisions_operation_check" CHECK(length(trim("editorial_review_decisions"."operation_id")) between 1 and 128),
	CONSTRAINT "editorial_review_decisions_reject_reason_check" CHECK(("editorial_review_decisions"."reason" is null or length(trim("editorial_review_decisions"."reason")) between 1 and 2000)
        and (
          "editorial_review_decisions"."decision" != 'reject'
          or ("editorial_review_decisions"."reason" is not null and length(trim("editorial_review_decisions"."reason")) > 0)
        ))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `editorial_review_decisions_operation_unique` ON `editorial_review_decisions` (`operation_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `editorial_review_decisions_request_unique` ON `editorial_review_decisions` (`review_request_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `editorial_review_decisions_revision_unique` ON `editorial_review_decisions` (`revision_id`);--> statement-breakpoint
CREATE TABLE `editorial_review_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`operation_id` text NOT NULL,
	`subject_id` text NOT NULL,
	`revision_id` text NOT NULL,
	`submitted_by_principal_id` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`submitted_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`decided_at` text,
	FOREIGN KEY (`subject_id`) REFERENCES `editorial_subjects`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`revision_id`) REFERENCES `editorial_revisions`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`submitted_by_principal_id`) REFERENCES `editorial_principals`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "editorial_review_requests_status_check" CHECK("editorial_review_requests"."status" in ('open', 'approved', 'rejected', 'cancelled')),
	CONSTRAINT "editorial_review_requests_operation_check" CHECK(length(trim("editorial_review_requests"."operation_id")) between 1 and 128),
	CONSTRAINT "editorial_review_requests_decision_time_check" CHECK(("editorial_review_requests"."status" = 'open' and "editorial_review_requests"."decided_at" is null)
        or ("editorial_review_requests"."status" in ('approved', 'rejected') and "editorial_review_requests"."decided_at" is not null)
        or "editorial_review_requests"."status" = 'cancelled')
);
--> statement-breakpoint
CREATE UNIQUE INDEX `editorial_review_requests_operation_unique` ON `editorial_review_requests` (`operation_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `editorial_review_requests_subject_revision_unique` ON `editorial_review_requests` (`subject_id`,`revision_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `editorial_review_requests_open_subject_unique` ON `editorial_review_requests` (`subject_id`) WHERE "editorial_review_requests"."status" = 'open';--> statement-breakpoint
CREATE INDEX `editorial_review_requests_revision_idx` ON `editorial_review_requests` (`revision_id`);--> statement-breakpoint
CREATE TABLE `editorial_revisions` (
	`id` text PRIMARY KEY NOT NULL,
	`subject_id` text NOT NULL,
	`version` integer NOT NULL,
	`canonical_snapshot_json` text NOT NULL,
	`checksum_version` text DEFAULT 'editorial-sha256-v1' NOT NULL,
	`snapshot_sha256` text NOT NULL,
	`created_by_principal_id` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`subject_id`) REFERENCES `editorial_subjects`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`created_by_principal_id`) REFERENCES `editorial_principals`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "editorial_revisions_version_check" CHECK("editorial_revisions"."version" > 0),
	CONSTRAINT "editorial_revisions_snapshot_check" CHECK(json_valid("editorial_revisions"."canonical_snapshot_json")
        and json_type("editorial_revisions"."canonical_snapshot_json") = 'object'
        and length("editorial_revisions"."canonical_snapshot_json") between 2 and 262144
        and "editorial_revisions"."checksum_version" = 'editorial-sha256-v1'
        and length("editorial_revisions"."snapshot_sha256") = 64
        and "editorial_revisions"."snapshot_sha256" = lower("editorial_revisions"."snapshot_sha256")
        and "editorial_revisions"."snapshot_sha256" not glob '*[^0-9a-f]*')
);
--> statement-breakpoint
CREATE UNIQUE INDEX `editorial_revisions_subject_version_unique` ON `editorial_revisions` (`subject_id`,`version`);--> statement-breakpoint
CREATE INDEX `editorial_revisions_subject_idx` ON `editorial_revisions` (`subject_id`);--> statement-breakpoint
CREATE TABLE `editorial_role_grants` (
	`id` text PRIMARY KEY NOT NULL,
	`principal_id` text NOT NULL,
	`role` text NOT NULL,
	`granted_by_principal_id` text NOT NULL,
	`granted_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`revoked_by_principal_id` text,
	`revoked_at` text,
	FOREIGN KEY (`principal_id`) REFERENCES `editorial_principals`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`granted_by_principal_id`) REFERENCES `editorial_principals`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`revoked_by_principal_id`) REFERENCES `editorial_principals`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "editorial_role_grants_role_check" CHECK("editorial_role_grants"."role" in ('editor', 'reviewer', 'admin')),
	CONSTRAINT "editorial_role_grants_revocation_check" CHECK(("editorial_role_grants"."revoked_at" is null and "editorial_role_grants"."revoked_by_principal_id" is null)
        or "editorial_role_grants"."revoked_by_principal_id" is not null)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `editorial_role_grants_active_unique` ON `editorial_role_grants` (`principal_id`,`role`) WHERE "editorial_role_grants"."revoked_at" is null;--> statement-breakpoint
CREATE INDEX `editorial_role_grants_principal_idx` ON `editorial_role_grants` (`principal_id`);--> statement-breakpoint
CREATE TABLE `editorial_subjects` (
	`id` text PRIMARY KEY NOT NULL,
	`entity_type` text NOT NULL,
	`entity_key` text NOT NULL,
	`created_by_principal_id` text NOT NULL,
	`lifecycle_status` text DEFAULT 'draft' NOT NULL,
	`current_revision_id` text,
	`optimistic_version` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`created_by_principal_id`) REFERENCES `editorial_principals`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "editorial_subjects_identity_check" CHECK(length(trim("editorial_subjects"."id")) between 1 and 128
        and length(trim("editorial_subjects"."entity_type")) between 1 and 64
        and length(trim("editorial_subjects"."entity_key")) between 1 and 256),
	CONSTRAINT "editorial_subjects_lifecycle_check" CHECK("editorial_subjects"."lifecycle_status" in ('draft', 'pending_review', 'published', 'archived')),
	CONSTRAINT "editorial_subjects_optimistic_version_check" CHECK("editorial_subjects"."optimistic_version" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `editorial_subjects_entity_unique` ON `editorial_subjects` (`entity_type`,`entity_key`);--> statement-breakpoint
CREATE INDEX `editorial_subjects_current_revision_idx` ON `editorial_subjects` (`current_revision_id`);--> statement-breakpoint
CREATE TABLE `legal_entry_citations` (
	`legal_entry_id` integer NOT NULL,
	`provision_id` integer NOT NULL,
	`display_order` integer DEFAULT 0 NOT NULL,
	`review_status` text DEFAULT 'legacy_unverified' NOT NULL,
	`created_by` text,
	`reviewed_by` text,
	`reviewed_at` text,
	`cited_revision_id` text,
	`cited_checksum_version` text,
	`cited_checksum_sha256` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY(`legal_entry_id`, `provision_id`),
	FOREIGN KEY (`legal_entry_id`) REFERENCES `legal_entries`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`provision_id`) REFERENCES `legal_provisions`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "legal_entry_citations_display_order_check" CHECK("legal_entry_citations"."display_order" >= 0),
	CONSTRAINT "legal_entry_citations_review_status_check" CHECK("legal_entry_citations"."review_status" in ('legacy_unverified', 'four_eyes_verified')),
	CONSTRAINT "legal_entry_citations_four_eyes_review_check" CHECK("legal_entry_citations"."review_status" != 'four_eyes_verified' or (
        "legal_entry_citations"."created_by" is not null
        and "legal_entry_citations"."reviewed_by" is not null
        and "legal_entry_citations"."reviewed_at" is not null
        and "legal_entry_citations"."reviewed_by" != "legal_entry_citations"."created_by"
        and "legal_entry_citations"."cited_revision_id" is not null
        and "legal_entry_citations"."cited_checksum_version" = 'provision-sha256-v1'
        and "legal_entry_citations"."cited_checksum_sha256" is not null
      ))
);
--> statement-breakpoint
CREATE INDEX `legal_entry_citations_provision_id_idx` ON `legal_entry_citations` (`provision_id`);--> statement-breakpoint
CREATE TABLE `legal_provisions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`source_id` integer NOT NULL,
	`article` text,
	`clause` text,
	`point` text,
	`original_text` text NOT NULL,
	`simplified_text` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`created_by` text NOT NULL,
	`reviewed_by` text,
	`reviewed_at` text,
	`revision_id` text,
	`checksum_version` text,
	`checksum_sha256` text,
	`effectivity_status` text DEFAULT 'unknown' NOT NULL,
	`effective_from` text,
	`effective_to` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`source_id`) REFERENCES `legal_sources`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "legal_provisions_status_check" CHECK("legal_provisions"."status" in ('draft', 'pending_review', 'published', 'archived')),
	CONSTRAINT "legal_provisions_published_review_check" CHECK("legal_provisions"."status" != 'published' or (
        "legal_provisions"."reviewed_by" is not null
        and "legal_provisions"."reviewed_at" is not null
        and "legal_provisions"."reviewed_by" != "legal_provisions"."created_by"
      )),
	CONSTRAINT "legal_provisions_effectivity_status_check" CHECK("legal_provisions"."effectivity_status" in (
        'unknown', 'in_force', 'partially_in_force', 'superseded', 'expired'
      )),
	CONSTRAINT "legal_provisions_effectivity_window_check" CHECK("legal_provisions"."effective_to" is null
        or "legal_provisions"."effective_from" is not null
        and "legal_provisions"."effective_to" >= "legal_provisions"."effective_from"),
	CONSTRAINT "legal_provisions_revision_metadata_check" CHECK((
        "legal_provisions"."revision_id" is null
        and "legal_provisions"."checksum_version" is null
        and "legal_provisions"."checksum_sha256" is null
      ) or (
        "legal_provisions"."revision_id" is not null
        and length("legal_provisions"."revision_id") between 1 and 128
        and substr("legal_provisions"."revision_id", 1, 1) glob '[A-Za-z0-9]'
        and "legal_provisions"."revision_id" not glob '*[^A-Za-z0-9._:-]*'
        and "legal_provisions"."checksum_version" = 'provision-sha256-v1'
        and length("legal_provisions"."checksum_sha256") = 64
        and "legal_provisions"."checksum_sha256" = lower("legal_provisions"."checksum_sha256")
        and "legal_provisions"."checksum_sha256" not glob '*[^0-9a-f]*'
      )),
	CONSTRAINT "legal_provisions_published_readiness_check" CHECK("legal_provisions"."status" != 'published' or (
        "legal_provisions"."revision_id" is not null
        and "legal_provisions"."checksum_version" = 'provision-sha256-v1'
        and "legal_provisions"."checksum_sha256" is not null
        and "legal_provisions"."effectivity_status" = 'in_force'
        and "legal_provisions"."effective_from" is not null
      ))
);
--> statement-breakpoint
CREATE INDEX `legal_provisions_source_id_idx` ON `legal_provisions` (`source_id`);--> statement-breakpoint
CREATE INDEX `legal_provisions_status_idx` ON `legal_provisions` (`status`);--> statement-breakpoint
CREATE UNIQUE INDEX `legal_provisions_revision_id_unique` ON `legal_provisions` (`revision_id`) WHERE "legal_provisions"."revision_id" is not null;--> statement-breakpoint
CREATE TABLE `legal_sources` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`document_number` text NOT NULL,
	`title` text NOT NULL,
	`official_url` text NOT NULL,
	`official_host` text NOT NULL,
	`issued_at` text,
	`effective_from` text,
	`effective_to` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`created_by` text NOT NULL,
	`last_verified_at` text,
	`verified_by` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "legal_sources_status_check" CHECK("legal_sources"."status" in ('draft', 'in_force', 'expired', 'superseded')),
	CONSTRAINT "legal_sources_https_url_check" CHECK(lower("legal_sources"."official_url") like 'https://%'),
	CONSTRAINT "legal_sources_official_host_format_check" CHECK("legal_sources"."official_host" = lower("legal_sources"."official_host")
        and length("legal_sources"."official_host") > 0
        and "legal_sources"."official_host" not glob '*[^a-z0-9.-]*'
        and "legal_sources"."official_host" not like '%..%'
        and "legal_sources"."official_host" not like '.%'
        and "legal_sources"."official_host" not like '%.'),
	CONSTRAINT "legal_sources_official_host_allowlist_check" CHECK("legal_sources"."status" = 'draft' or (
        "legal_sources"."official_host" in ('vbpl.vn', 'vbpl.moj.gov.vn', 'chinhphu.vn')
        or "legal_sources"."official_host" like '%.chinhphu.vn'
      )),
	CONSTRAINT "legal_sources_url_authority_check" CHECK(lower("legal_sources"."official_url") = 'https://' || "legal_sources"."official_host"
        or lower("legal_sources"."official_url") like 'https://' || "legal_sources"."official_host" || '/%'
        or lower("legal_sources"."official_url") like 'https://' || "legal_sources"."official_host" || '?%'
        or lower("legal_sources"."official_url") like 'https://' || "legal_sources"."official_host" || '#%'),
	CONSTRAINT "legal_sources_effectivity_check" CHECK("legal_sources"."effective_to" is null or "legal_sources"."effective_from" is null or "legal_sources"."effective_to" >= "legal_sources"."effective_from"),
	CONSTRAINT "legal_sources_in_force_verification_check" CHECK("legal_sources"."status" != 'in_force' or (
        "legal_sources"."effective_from" is not null
        and "legal_sources"."last_verified_at" is not null
        and "legal_sources"."verified_by" is not null
        and "legal_sources"."verified_by" != "legal_sources"."created_by"
      ))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `legal_sources_document_number_unique` ON `legal_sources` (`document_number`);--> statement-breakpoint
CREATE UNIQUE INDEX `legal_sources_official_url_unique` ON `legal_sources` (`official_url`);--> statement-breakpoint
CREATE INDEX `legal_sources_status_idx` ON `legal_sources` (`status`);--> statement-breakpoint
CREATE TABLE `rate_limit_buckets` (
	`scope` text NOT NULL,
	`key_hash` text NOT NULL,
	`window_start` integer NOT NULL,
	`request_count` integer DEFAULT 1 NOT NULL,
	`expires_at` integer NOT NULL,
	PRIMARY KEY(`scope`, `key_hash`, `window_start`),
	CONSTRAINT "rate_limit_buckets_scope_check" CHECK("rate_limit_buckets"."scope" in (
        'login-client-15m-v1',
        'login-account-60m-v1',
        'login-pair-attempt-15m-v1',
        'chat-client-60s-v1',
        'chat-client-day-v1'
      )),
	CONSTRAINT "rate_limit_buckets_key_hash_check" CHECK(length("rate_limit_buckets"."key_hash") = 64
        and "rate_limit_buckets"."key_hash" = lower("rate_limit_buckets"."key_hash")
        and "rate_limit_buckets"."key_hash" not glob '*[^0-9a-f]*'),
	CONSTRAINT "rate_limit_buckets_window_check" CHECK("rate_limit_buckets"."window_start" >= 0
        and "rate_limit_buckets"."request_count" >= 1
        and "rate_limit_buckets"."expires_at" > "rate_limit_buckets"."window_start")
);
--> statement-breakpoint
CREATE INDEX `rate_limit_buckets_expiry_idx` ON `rate_limit_buckets` (`expires_at`);--> statement-breakpoint
CREATE TABLE `rate_limit_penalties` (
	`scope` text NOT NULL,
	`key_hash` text NOT NULL,
	`window_start` integer NOT NULL,
	`consecutive_failures` integer DEFAULT 1 NOT NULL,
	`blocked_until` integer DEFAULT 0 NOT NULL,
	`state_version` text NOT NULL,
	`expires_at` integer NOT NULL,
	PRIMARY KEY(`scope`, `key_hash`),
	CONSTRAINT "rate_limit_penalties_scope_check" CHECK("rate_limit_penalties"."scope" = 'login-pair-penalty-15m-v1'),
	CONSTRAINT "rate_limit_penalties_key_hash_check" CHECK(length("rate_limit_penalties"."key_hash") = 64
        and "rate_limit_penalties"."key_hash" = lower("rate_limit_penalties"."key_hash")
        and "rate_limit_penalties"."key_hash" not glob '*[^0-9a-f]*'),
	CONSTRAINT "rate_limit_penalties_state_check" CHECK("rate_limit_penalties"."window_start" >= 0
        and "rate_limit_penalties"."consecutive_failures" >= 0
        and "rate_limit_penalties"."blocked_until" >= 0
        and length("rate_limit_penalties"."state_version") = 32
        and "rate_limit_penalties"."state_version" = lower("rate_limit_penalties"."state_version")
        and "rate_limit_penalties"."state_version" not glob '*[^0-9a-f]*'
        and "rate_limit_penalties"."expires_at" > "rate_limit_penalties"."window_start")
);
--> statement-breakpoint
CREATE INDEX `rate_limit_penalties_expiry_idx` ON `rate_limit_penalties` (`expires_at`);--> statement-breakpoint
CREATE TABLE `web_search_budget_days` (
	`day_start` integer PRIMARY KEY NOT NULL,
	`reserved_tokens` integer DEFAULT 0 NOT NULL,
	`actual_tokens` integer DEFAULT 0 NOT NULL,
	`request_count` integer DEFAULT 0 NOT NULL,
	`expires_at` integer NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `web_search_budget_days_expiry_idx` ON `web_search_budget_days` (`expires_at`);--> statement-breakpoint
CREATE TABLE `web_search_candidate_events` (
	`id` text PRIMARY KEY NOT NULL,
	`operation_id` text NOT NULL,
	`candidate_id` text NOT NULL,
	`revision_id` text,
	`actor_principal_id` text,
	`actor_role` text NOT NULL,
	`action` text NOT NULL,
	`reason` text,
	`metadata_json` text,
	`occurred_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`candidate_id`) REFERENCES `web_search_candidates`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`revision_id`) REFERENCES `web_search_candidate_revisions`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`actor_principal_id`) REFERENCES `editorial_principals`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `web_search_candidate_events_operation_unique` ON `web_search_candidate_events` (`operation_id`);--> statement-breakpoint
CREATE INDEX `web_search_candidate_events_candidate_idx` ON `web_search_candidate_events` (`candidate_id`,`occurred_at`);--> statement-breakpoint
CREATE TABLE `web_search_candidate_revisions` (
	`id` text PRIMARY KEY NOT NULL,
	`candidate_id` text NOT NULL,
	`version` integer NOT NULL,
	`canonical_snapshot_json` text NOT NULL,
	`snapshot_sha256` text NOT NULL,
	`created_by_principal_id` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`candidate_id`) REFERENCES `web_search_candidates`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`created_by_principal_id`) REFERENCES `editorial_principals`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `web_search_candidate_revisions_version_unique` ON `web_search_candidate_revisions` (`candidate_id`,`version`);--> statement-breakpoint
CREATE INDEX `web_search_candidate_revisions_candidate_idx` ON `web_search_candidate_revisions` (`candidate_id`,`version`);--> statement-breakpoint
CREATE TABLE `web_search_candidate_sources` (
	`candidate_id` text NOT NULL,
	`display_order` integer NOT NULL,
	`title` text NOT NULL,
	`official_url` text NOT NULL,
	`official_host` text NOT NULL,
	`url_sha256` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY(`candidate_id`, `display_order`),
	FOREIGN KEY (`candidate_id`) REFERENCES `web_search_candidates`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `web_search_candidate_sources_url_unique` ON `web_search_candidate_sources` (`candidate_id`,`official_url`);--> statement-breakpoint
CREATE INDEX `web_search_candidate_sources_candidate_idx` ON `web_search_candidate_sources` (`candidate_id`,`display_order`);--> statement-breakpoint
CREATE TABLE `web_search_candidates` (
	`id` text PRIMARY KEY NOT NULL,
	`request_id` text NOT NULL,
	`content_sha256` text NOT NULL,
	`initial_answer_text` text NOT NULL,
	`provider_model` text NOT NULL,
	`policy_version` text NOT NULL,
	`input_tokens` integer,
	`output_tokens` integer,
	`total_tokens` integer,
	`lifecycle_status` text DEFAULT 'draft' NOT NULL,
	`current_revision_id` text,
	`editor_principal_id` text,
	`submitted_at` text,
	`reviewer_principal_id` text,
	`reviewed_at` text,
	`review_reason` text,
	`optimistic_version` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`editor_principal_id`) REFERENCES `editorial_principals`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`reviewer_principal_id`) REFERENCES `editorial_principals`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `web_search_candidates_request_unique` ON `web_search_candidates` (`request_id`);--> statement-breakpoint
CREATE INDEX `web_search_candidates_status_updated_idx` ON `web_search_candidates` (`lifecycle_status`,`updated_at`);--> statement-breakpoint
CREATE INDEX `web_search_candidates_content_hash_idx` ON `web_search_candidates` (`content_sha256`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_legal_entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`topic` text NOT NULL,
	`icon` text DEFAULT '§' NOT NULL,
	`title` text NOT NULL,
	`legal_basis` text NOT NULL,
	`penalty` text NOT NULL,
	`remedy` text NOT NULL,
	`case_study` text NOT NULL,
	`tags` text DEFAULT '[]' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`review_status` text DEFAULT 'legacy_unverified' NOT NULL,
	`created_by` text,
	`reviewed_by` text,
	`reviewed_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "legal_entries_status_check" CHECK("__new_legal_entries"."status" in ('draft', 'published')),
	CONSTRAINT "legal_entries_review_status_check" CHECK("__new_legal_entries"."review_status" in ('legacy_unverified', 'four_eyes_verified')),
	CONSTRAINT "legal_entries_four_eyes_review_check" CHECK("__new_legal_entries"."review_status" != 'four_eyes_verified' or (
        "__new_legal_entries"."status" = 'published'
        and "__new_legal_entries"."created_by" is not null
        and "__new_legal_entries"."reviewed_by" is not null
        and "__new_legal_entries"."reviewed_at" is not null
        and "__new_legal_entries"."reviewed_by" != "__new_legal_entries"."created_by"
      ))
);
--> statement-breakpoint
INSERT INTO `__new_legal_entries`("id", "topic", "icon", "title", "legal_basis", "penalty", "remedy", "case_study", "tags", "status", "review_status", "created_by", "reviewed_by", "reviewed_at", "created_at", "updated_at") SELECT "id", "topic", "icon", "title", "legal_basis", "penalty", "remedy", "case_study", "tags", "status", "review_status", "created_by", "reviewed_by", "reviewed_at", "created_at", "updated_at" FROM `legal_entries`;--> statement-breakpoint
DROP TABLE `legal_entries`;--> statement-breakpoint
ALTER TABLE `__new_legal_entries` RENAME TO `legal_entries`;--> statement-breakpoint
PRAGMA foreign_keys=ON;