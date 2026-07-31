CREATE TABLE IF NOT EXISTS `editorial_principals` (
	`id` text PRIMARY KEY NOT NULL,
	`external_subject` text,
	`display_name` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT `editorial_principals_id_check`
		CHECK (length(trim(`id`)) BETWEEN 1 AND 128),
	CONSTRAINT `editorial_principals_display_name_check`
		CHECK (length(trim(`display_name`)) BETWEEN 1 AND 200),
	CONSTRAINT `editorial_principals_status_check`
		CHECK (`status` IN ('active', 'disabled'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `editorial_principals_external_subject_unique`
ON `editorial_principals` (`external_subject`)
WHERE `external_subject` IS NOT NULL;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `editorial_principals_external_subject_immutable`
BEFORE UPDATE OF `external_subject` ON `editorial_principals`
WHEN OLD.`external_subject` IS NOT NULL
	AND NEW.`external_subject` IS NOT OLD.`external_subject`
BEGIN
	SELECT RAISE(ABORT, 'editorial principal external subject is immutable');
END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `editorial_principals_identity_immutable`
BEFORE UPDATE OF `id`, `created_at` ON `editorial_principals`
WHEN NEW.`id` IS NOT OLD.`id` OR NEW.`created_at` IS NOT OLD.`created_at`
BEGIN
	SELECT RAISE(ABORT, 'editorial principal identity is immutable');
END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `editorial_principals_delete_immutable`
BEFORE DELETE ON `editorial_principals`
BEGIN
	SELECT RAISE(ABORT, 'editorial principal is immutable');
END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `editorial_principals_disabled_one_way`
BEFORE UPDATE OF `status` ON `editorial_principals`
WHEN OLD.`status` = 'disabled' AND NEW.`status` != 'disabled'
BEGIN
	SELECT RAISE(ABORT, 'disabled editorial principal cannot be re-enabled');
END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `editorial_principals_last_admin_guard`
BEFORE UPDATE OF `status` ON `editorial_principals`
WHEN OLD.`status` = 'active'
	AND NEW.`status` = 'disabled'
	AND EXISTS (
		SELECT 1 FROM `editorial_role_grants`
		WHERE `principal_id` = OLD.`id`
			AND `role` = 'admin'
			AND `revoked_at` IS NULL
	)
	AND NOT EXISTS (
		SELECT 1
		FROM `editorial_role_grants` AS `other_admin`
		INNER JOIN `editorial_principals` AS `other_principal`
			ON `other_principal`.`id` = `other_admin`.`principal_id`
			AND `other_principal`.`status` = 'active'
		WHERE `other_admin`.`role` = 'admin'
			AND `other_admin`.`revoked_at` IS NULL
			AND `other_admin`.`principal_id` != OLD.`id`
	)
BEGIN
	SELECT RAISE(ABORT, 'cannot disable the last active editorial admin');
END;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `editorial_role_grants` (
	`id` text PRIMARY KEY NOT NULL,
	`principal_id` text NOT NULL,
	`role` text NOT NULL,
	`granted_by_principal_id` text NOT NULL,
	`granted_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`revoked_by_principal_id` text,
	`revoked_at` text,
	CONSTRAINT `editorial_role_grants_principal_fk`
		FOREIGN KEY (`principal_id`) REFERENCES `editorial_principals`(`id`)
		ON UPDATE NO ACTION ON DELETE RESTRICT,
	CONSTRAINT `editorial_role_grants_grantor_fk`
		FOREIGN KEY (`granted_by_principal_id`) REFERENCES `editorial_principals`(`id`)
		ON UPDATE NO ACTION ON DELETE RESTRICT,
	CONSTRAINT `editorial_role_grants_revoker_fk`
		FOREIGN KEY (`revoked_by_principal_id`) REFERENCES `editorial_principals`(`id`)
		ON UPDATE NO ACTION ON DELETE RESTRICT,
	CONSTRAINT `editorial_role_grants_role_check`
		CHECK (`role` IN ('editor', 'reviewer', 'admin')),
	CONSTRAINT `editorial_role_grants_revocation_check`
		CHECK (
			(`revoked_at` IS NULL AND `revoked_by_principal_id` IS NULL)
			OR `revoked_by_principal_id` IS NOT NULL
		)
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `editorial_role_grants_active_unique`
ON `editorial_role_grants` (`principal_id`, `role`)
WHERE `revoked_at` IS NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `editorial_role_grants_principal_idx`
ON `editorial_role_grants` (`principal_id`);
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `editorial_role_grants_insert_check`
BEFORE INSERT ON `editorial_role_grants`
WHEN
	NEW.`revoked_by_principal_id` IS NOT NULL
	OR NEW.`revoked_at` IS NOT NULL
	OR NOT EXISTS (
		SELECT 1 FROM `editorial_principals`
		WHERE `id` = NEW.`principal_id` AND `status` = 'active'
	)
	OR NOT (
		(
			NOT EXISTS (SELECT 1 FROM `editorial_role_grants`)
			AND NEW.`role` = 'admin'
			AND NEW.`principal_id` = NEW.`granted_by_principal_id`
		)
		OR (
			EXISTS (
				SELECT 1
				FROM `editorial_principals` AS `grantor`
				INNER JOIN `editorial_role_grants` AS `admin_grant`
					ON `admin_grant`.`principal_id` = `grantor`.`id`
					AND `admin_grant`.`role` = 'admin'
					AND `admin_grant`.`revoked_at` IS NULL
				WHERE `grantor`.`id` = NEW.`granted_by_principal_id`
					AND `grantor`.`status` = 'active'
			)
		)
	)
BEGIN
	SELECT RAISE(ABORT, 'editorial role grant requires an active admin grantor');
END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `editorial_role_grants_identity_immutable`
BEFORE UPDATE OF `id`, `principal_id`, `role`, `granted_by_principal_id`, `granted_at`
ON `editorial_role_grants`
WHEN
	NEW.`id` IS NOT OLD.`id`
	OR NEW.`principal_id` IS NOT OLD.`principal_id`
	OR NEW.`role` IS NOT OLD.`role`
	OR NEW.`granted_by_principal_id` IS NOT OLD.`granted_by_principal_id`
	OR NEW.`granted_at` IS NOT OLD.`granted_at`
BEGIN
	SELECT RAISE(ABORT, 'editorial role grant identity is immutable');
END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `editorial_role_grants_revoke_check`
BEFORE UPDATE OF `revoked_by_principal_id`, `revoked_at`
ON `editorial_role_grants`
WHEN NOT (
	(
		OLD.`revoked_by_principal_id` IS NULL
		AND OLD.`revoked_at` IS NULL
		AND NEW.`revoked_by_principal_id` IS NOT NULL
		AND NEW.`revoked_at` IS NULL
		AND (
			OLD.`role` != 'admin'
			OR EXISTS (
				SELECT 1
				FROM `editorial_role_grants` AS `other_admin`
				INNER JOIN `editorial_principals` AS `other_principal`
					ON `other_principal`.`id` = `other_admin`.`principal_id`
					AND `other_principal`.`status` = 'active'
				WHERE `other_admin`.`role` = 'admin'
					AND `other_admin`.`revoked_at` IS NULL
					AND `other_admin`.`id` != OLD.`id`
			)
		)
		AND EXISTS (
			SELECT 1
			FROM `editorial_principals` AS `revoker`
			INNER JOIN `editorial_role_grants` AS `admin_grant`
				ON `admin_grant`.`principal_id` = `revoker`.`id`
				AND `admin_grant`.`role` = 'admin'
				AND `admin_grant`.`revoked_at` IS NULL
			WHERE `revoker`.`id` = NEW.`revoked_by_principal_id`
				AND `revoker`.`status` = 'active'
		)
	)
	OR (
		OLD.`revoked_by_principal_id` IS NOT NULL
		AND OLD.`revoked_at` IS NULL
		AND NEW.`revoked_by_principal_id` = OLD.`revoked_by_principal_id`
		AND NEW.`revoked_at` = CURRENT_TIMESTAMP
	)
)
BEGIN
	SELECT RAISE(ABORT, 'editorial role grant revocation is invalid');
END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `editorial_role_grants_set_revoked_at`
AFTER UPDATE OF `revoked_by_principal_id` ON `editorial_role_grants`
WHEN OLD.`revoked_by_principal_id` IS NULL
	AND OLD.`revoked_at` IS NULL
	AND NEW.`revoked_by_principal_id` IS NOT NULL
	AND NEW.`revoked_at` IS NULL
BEGIN
	UPDATE `editorial_role_grants`
	SET `revoked_at` = CURRENT_TIMESTAMP
	WHERE `id` = NEW.`id`;
END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `editorial_role_grants_delete_immutable`
BEFORE DELETE ON `editorial_role_grants`
BEGIN
	SELECT RAISE(ABORT, 'editorial role grant is immutable');
END;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `editorial_subjects` (
	`id` text PRIMARY KEY NOT NULL,
	`entity_type` text NOT NULL,
	`entity_key` text NOT NULL,
	`created_by_principal_id` text NOT NULL,
	`lifecycle_status` text DEFAULT 'draft' NOT NULL,
	`current_revision_id` text,
	`optimistic_version` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT `editorial_subjects_creator_fk`
		FOREIGN KEY (`created_by_principal_id`) REFERENCES `editorial_principals`(`id`)
		ON UPDATE NO ACTION ON DELETE RESTRICT,
	CONSTRAINT `editorial_subjects_identity_check`
		CHECK (
			length(trim(`id`)) BETWEEN 1 AND 128
			AND length(trim(`entity_type`)) BETWEEN 1 AND 64
			AND length(trim(`entity_key`)) BETWEEN 1 AND 256
		),
	CONSTRAINT `editorial_subjects_lifecycle_check`
		CHECK (`lifecycle_status` IN ('draft', 'pending_review', 'published', 'archived')),
	CONSTRAINT `editorial_subjects_optimistic_version_check`
		CHECK (`optimistic_version` >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `editorial_subjects_entity_unique`
ON `editorial_subjects` (`entity_type`, `entity_key`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `editorial_subjects_current_revision_idx`
ON `editorial_subjects` (`current_revision_id`);
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `editorial_subjects_insert_check`
BEFORE INSERT ON `editorial_subjects`
WHEN
	NEW.`lifecycle_status` != 'draft'
	OR NEW.`current_revision_id` IS NOT NULL
	OR NEW.`optimistic_version` != 0
	OR NOT EXISTS (
		SELECT 1
		FROM `editorial_principals` AS `creator`
		WHERE `creator`.`id` = NEW.`created_by_principal_id`
			AND `creator`.`status` = 'active'
			AND EXISTS (
				SELECT 1
				FROM `editorial_role_grants` AS `grant`
				WHERE `grant`.`principal_id` = `creator`.`id`
					AND `grant`.`role` IN ('editor', 'admin')
					AND `grant`.`revoked_at` IS NULL
			)
	)
BEGIN
	SELECT RAISE(ABORT, 'editorial subject requires an active editor creator');
END;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `editorial_revisions` (
	`id` text PRIMARY KEY NOT NULL,
	`subject_id` text NOT NULL,
	`version` integer NOT NULL,
	`canonical_snapshot_json` text NOT NULL,
	`checksum_version` text DEFAULT 'editorial-sha256-v1' NOT NULL,
	`snapshot_sha256` text NOT NULL,
	`created_by_principal_id` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT `editorial_revisions_subject_fk`
		FOREIGN KEY (`subject_id`) REFERENCES `editorial_subjects`(`id`)
		ON UPDATE NO ACTION ON DELETE RESTRICT,
	CONSTRAINT `editorial_revisions_creator_fk`
		FOREIGN KEY (`created_by_principal_id`) REFERENCES `editorial_principals`(`id`)
		ON UPDATE NO ACTION ON DELETE RESTRICT,
	CONSTRAINT `editorial_revisions_version_check`
		CHECK (`version` > 0),
	CONSTRAINT `editorial_revisions_snapshot_check`
		CHECK (
			json_valid(`canonical_snapshot_json`)
			AND json_type(`canonical_snapshot_json`) = 'object'
			AND length(`canonical_snapshot_json`) BETWEEN 2 AND 262144
			AND `checksum_version` = 'editorial-sha256-v1'
			AND length(`snapshot_sha256`) = 64
			AND `snapshot_sha256` = lower(`snapshot_sha256`)
			AND `snapshot_sha256` NOT GLOB '*[^0-9a-f]*'
		)
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `editorial_revisions_subject_version_unique`
ON `editorial_revisions` (`subject_id`, `version`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `editorial_revisions_subject_idx`
ON `editorial_revisions` (`subject_id`);
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `editorial_revisions_insert_check`
BEFORE INSERT ON `editorial_revisions`
WHEN NOT EXISTS (
	SELECT 1
	FROM `editorial_subjects` AS `subject`
	INNER JOIN `editorial_principals` AS `creator`
		ON `creator`.`id` = NEW.`created_by_principal_id`
		AND `creator`.`status` = 'active'
	WHERE `subject`.`id` = NEW.`subject_id`
		AND `subject`.`lifecycle_status` = 'draft'
		AND NEW.`created_by_principal_id` = `subject`.`created_by_principal_id`
		AND NEW.`version` = (
			SELECT COALESCE(MAX(`existing`.`version`), 0) + 1
			FROM `editorial_revisions` AS `existing`
			WHERE `existing`.`subject_id` = NEW.`subject_id`
		)
		AND NOT EXISTS (
			SELECT 1 FROM `editorial_review_requests`
			WHERE `subject_id` = NEW.`subject_id` AND `status` = 'open'
		)
		AND EXISTS (
			SELECT 1 FROM `editorial_role_grants`
			WHERE `principal_id` = NEW.`created_by_principal_id`
				AND `role` IN ('editor', 'admin')
				AND `revoked_at` IS NULL
		)
)
BEGIN
	SELECT RAISE(ABORT, 'editorial revision requires the active subject creator');
END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `editorial_subjects_current_revision_insert_check`
BEFORE INSERT ON `editorial_subjects`
WHEN NEW.`current_revision_id` IS NOT NULL
	AND NOT EXISTS (
		SELECT 1 FROM `editorial_revisions`
		WHERE `id` = NEW.`current_revision_id`
			AND `subject_id` = NEW.`id`
	)
BEGIN
	SELECT RAISE(ABORT, 'editorial subject current revision is invalid');
END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `editorial_subjects_identity_immutable`
BEFORE UPDATE OF `id`, `entity_type`, `entity_key`,
	`created_by_principal_id`, `created_at`
ON `editorial_subjects`
WHEN
	NEW.`id` IS NOT OLD.`id`
	OR NEW.`entity_type` IS NOT OLD.`entity_type`
	OR NEW.`entity_key` IS NOT OLD.`entity_key`
	OR NEW.`created_by_principal_id` IS NOT OLD.`created_by_principal_id`
	OR NEW.`created_at` IS NOT OLD.`created_at`
BEGIN
	SELECT RAISE(ABORT, 'editorial subject identity is immutable');
END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `editorial_subjects_current_revision_update_check`
BEFORE UPDATE OF `current_revision_id` ON `editorial_subjects`
WHEN NEW.`current_revision_id` IS NOT NULL
	AND NOT EXISTS (
		SELECT 1 FROM `editorial_revisions`
		WHERE `id` = NEW.`current_revision_id`
			AND `subject_id` = NEW.`id`
	)
BEGIN
	SELECT RAISE(ABORT, 'editorial subject current revision is invalid');
END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `editorial_subjects_state_transition_check`
BEFORE UPDATE OF `lifecycle_status`, `current_revision_id`, `optimistic_version`
ON `editorial_subjects`
WHEN (
	NEW.`lifecycle_status` IS NOT OLD.`lifecycle_status`
	OR NEW.`current_revision_id` IS NOT OLD.`current_revision_id`
	OR NEW.`optimistic_version` IS NOT OLD.`optimistic_version`
) AND NOT (
	(
		OLD.`lifecycle_status` = 'draft'
		AND NEW.`lifecycle_status` = 'draft'
		AND NEW.`current_revision_id` IS NOT OLD.`current_revision_id`
		AND NEW.`current_revision_id` IS NOT NULL
		AND NEW.`optimistic_version` = OLD.`optimistic_version` + 1
		AND EXISTS (
			SELECT 1 FROM `editorial_revisions`
			WHERE `id` = NEW.`current_revision_id`
				AND `subject_id` = OLD.`id`
		)
		AND NOT EXISTS (
			SELECT 1 FROM `editorial_review_requests`
			WHERE `subject_id` = OLD.`id` AND `status` = 'open'
		)
	)
	OR (
		OLD.`lifecycle_status` = 'draft'
		AND NEW.`lifecycle_status` = 'pending_review'
		AND NEW.`current_revision_id` IS OLD.`current_revision_id`
		AND NEW.`optimistic_version` = OLD.`optimistic_version` + 1
		AND EXISTS (
			SELECT 1 FROM `editorial_review_requests`
			WHERE `subject_id` = OLD.`id`
				AND `revision_id` = OLD.`current_revision_id`
				AND `status` = 'open'
		)
	)
	OR (
		OLD.`lifecycle_status` = 'pending_review'
		AND NEW.`lifecycle_status` IN ('published', 'draft')
		AND NEW.`current_revision_id` IS OLD.`current_revision_id`
		AND NEW.`optimistic_version` = OLD.`optimistic_version` + 1
		AND EXISTS (
			SELECT 1
			FROM `editorial_review_requests` AS `request`
			INNER JOIN `editorial_review_decisions` AS `decision`
				ON `decision`.`review_request_id` = `request`.`id`
				AND `decision`.`revision_id` = `request`.`revision_id`
			WHERE `request`.`subject_id` = OLD.`id`
				AND `request`.`revision_id` = OLD.`current_revision_id`
				AND (
					(
						`request`.`status` = 'approved'
						AND `decision`.`decision` = 'approve'
						AND NEW.`lifecycle_status` = 'published'
					)
					OR (
						`request`.`status` = 'rejected'
						AND `decision`.`decision` = 'reject'
						AND NEW.`lifecycle_status` = 'draft'
					)
				)
		)
	)
)
BEGIN
	SELECT RAISE(ABORT, 'invalid editorial subject state transition');
END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `editorial_revisions_update_immutable`
BEFORE UPDATE ON `editorial_revisions`
BEGIN
	SELECT RAISE(ABORT, 'editorial revision is immutable');
END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `editorial_revisions_delete_immutable`
BEFORE DELETE ON `editorial_revisions`
BEGIN
	SELECT RAISE(ABORT, 'editorial revision is immutable');
END;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `editorial_review_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`operation_id` text NOT NULL,
	`subject_id` text NOT NULL,
	`revision_id` text NOT NULL,
	`submitted_by_principal_id` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`submitted_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`decided_at` text,
	CONSTRAINT `editorial_review_requests_subject_fk`
		FOREIGN KEY (`subject_id`) REFERENCES `editorial_subjects`(`id`)
		ON UPDATE NO ACTION ON DELETE RESTRICT,
	CONSTRAINT `editorial_review_requests_revision_fk`
		FOREIGN KEY (`revision_id`) REFERENCES `editorial_revisions`(`id`)
		ON UPDATE NO ACTION ON DELETE RESTRICT,
	CONSTRAINT `editorial_review_requests_submitter_fk`
		FOREIGN KEY (`submitted_by_principal_id`) REFERENCES `editorial_principals`(`id`)
		ON UPDATE NO ACTION ON DELETE RESTRICT,
	CONSTRAINT `editorial_review_requests_status_check`
		CHECK (`status` IN ('open', 'approved', 'rejected', 'cancelled')),
	CONSTRAINT `editorial_review_requests_operation_check`
		CHECK (length(trim(`operation_id`)) BETWEEN 1 AND 128),
	CONSTRAINT `editorial_review_requests_decision_time_check`
		CHECK (
			(`status` = 'open' AND `decided_at` IS NULL)
			OR (`status` IN ('approved', 'rejected') AND `decided_at` IS NOT NULL)
			OR `status` = 'cancelled'
		)
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `editorial_review_requests_operation_unique`
ON `editorial_review_requests` (`operation_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `editorial_review_requests_subject_revision_unique`
ON `editorial_review_requests` (`subject_id`, `revision_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `editorial_review_requests_open_subject_unique`
ON `editorial_review_requests` (`subject_id`)
WHERE `status` = 'open';
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `editorial_review_requests_revision_idx`
ON `editorial_review_requests` (`revision_id`);
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `editorial_review_requests_insert_check`
BEFORE INSERT ON `editorial_review_requests`
WHEN
	NEW.`status` != 'open'
	OR NEW.`decided_at` IS NOT NULL
	OR NOT EXISTS (
		SELECT 1
		FROM `editorial_subjects` AS `subject`
		INNER JOIN `editorial_revisions` AS `revision`
			ON `revision`.`id` = NEW.`revision_id`
			AND `revision`.`subject_id` = `subject`.`id`
		INNER JOIN `editorial_principals` AS `submitter`
			ON `submitter`.`id` = NEW.`submitted_by_principal_id`
			AND `submitter`.`status` = 'active'
		WHERE `subject`.`id` = NEW.`subject_id`
			AND `subject`.`lifecycle_status` = 'draft'
			AND `subject`.`current_revision_id` = NEW.`revision_id`
			AND NEW.`submitted_by_principal_id` = `subject`.`created_by_principal_id`
			AND EXISTS (
				SELECT 1
				FROM `editorial_role_grants` AS `grant`
				WHERE `grant`.`principal_id` = NEW.`submitted_by_principal_id`
					AND `grant`.`role` IN ('editor', 'admin')
					AND `grant`.`revoked_at` IS NULL
			)
	)
BEGIN
	SELECT RAISE(ABORT, 'review request must bind the current subject revision');
END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `editorial_review_requests_binding_immutable`
BEFORE UPDATE OF `operation_id`, `subject_id`, `revision_id`,
	`submitted_by_principal_id`, `submitted_at`
ON `editorial_review_requests`
WHEN
	NEW.`operation_id` IS NOT OLD.`operation_id`
	OR NEW.`subject_id` IS NOT OLD.`subject_id`
	OR NEW.`revision_id` IS NOT OLD.`revision_id`
	OR NEW.`submitted_by_principal_id` IS NOT OLD.`submitted_by_principal_id`
	OR NEW.`submitted_at` IS NOT OLD.`submitted_at`
BEGIN
	SELECT RAISE(ABORT, 'editorial review request binding is immutable');
END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `editorial_review_requests_status_transition_check`
BEFORE UPDATE OF `status`, `decided_at` ON `editorial_review_requests`
WHEN NOT (
	(
		OLD.`status` = 'open'
		AND NEW.`status` IN ('approved', 'rejected')
		AND NEW.`decided_at` IS NOT NULL
		AND EXISTS (
			SELECT 1
			FROM `editorial_review_decisions`
			WHERE `review_request_id` = OLD.`id`
				AND (
					(`decision` = 'approve' AND NEW.`status` = 'approved')
					OR (`decision` = 'reject' AND NEW.`status` = 'rejected')
				)
		)
	)
)
BEGIN
	SELECT RAISE(ABORT, 'invalid editorial review request transition');
END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `editorial_review_requests_apply_state_and_audit`
AFTER INSERT ON `editorial_review_requests`
BEGIN
	UPDATE `editorial_subjects`
	SET `lifecycle_status` = 'pending_review',
		`optimistic_version` = `optimistic_version` + 1,
		`updated_at` = CURRENT_TIMESTAMP
	WHERE `id` = NEW.`subject_id`
		AND `lifecycle_status` = 'draft'
		AND `current_revision_id` = NEW.`revision_id`;

	INSERT INTO `editorial_audit_events` (
		`id`, `operation_id`, `actor_principal_id`, `actor_role`,
		`subject_id`, `revision_id`, `review_request_id`, `action`,
		`before_state_json`, `after_state_json`, `metadata_json`
	) VALUES (
		'review-request:' || NEW.`id`,
		NEW.`operation_id`,
		NEW.`submitted_by_principal_id`,
		CASE
			WHEN EXISTS (
				SELECT 1 FROM `editorial_role_grants`
				WHERE `principal_id` = NEW.`submitted_by_principal_id`
					AND `role` = 'admin'
					AND `revoked_at` IS NULL
			) THEN 'admin'
			ELSE 'editor'
		END,
		NEW.`subject_id`,
		NEW.`revision_id`,
		NEW.`id`,
		'review_submitted',
		json_object('lifecycleStatus', 'draft'),
		json_object('lifecycleStatus', 'pending_review'),
		json_object('requestStatus', 'open')
	);
END;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `editorial_review_decisions` (
	`id` text PRIMARY KEY NOT NULL,
	`operation_id` text NOT NULL,
	`review_request_id` text NOT NULL,
	`revision_id` text NOT NULL,
	`reviewer_principal_id` text NOT NULL,
	`decision` text NOT NULL,
	`reason` text,
	`decided_at` text,
	CONSTRAINT `editorial_review_decisions_request_fk`
		FOREIGN KEY (`review_request_id`) REFERENCES `editorial_review_requests`(`id`)
		ON UPDATE NO ACTION ON DELETE RESTRICT,
	CONSTRAINT `editorial_review_decisions_revision_fk`
		FOREIGN KEY (`revision_id`) REFERENCES `editorial_revisions`(`id`)
		ON UPDATE NO ACTION ON DELETE RESTRICT,
	CONSTRAINT `editorial_review_decisions_reviewer_fk`
		FOREIGN KEY (`reviewer_principal_id`) REFERENCES `editorial_principals`(`id`)
		ON UPDATE NO ACTION ON DELETE RESTRICT,
	CONSTRAINT `editorial_review_decisions_value_check`
		CHECK (`decision` IN ('approve', 'reject')),
	CONSTRAINT `editorial_review_decisions_operation_check`
		CHECK (length(trim(`operation_id`)) BETWEEN 1 AND 128),
	CONSTRAINT `editorial_review_decisions_reject_reason_check`
		CHECK (
			(`reason` IS NULL OR length(trim(`reason`)) BETWEEN 1 AND 2000)
			AND (
				`decision` != 'reject'
				OR (`reason` IS NOT NULL AND length(trim(`reason`)) > 0)
			)
		)
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `editorial_review_decisions_operation_unique`
ON `editorial_review_decisions` (`operation_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `editorial_review_decisions_request_unique`
ON `editorial_review_decisions` (`review_request_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `editorial_review_decisions_revision_unique`
ON `editorial_review_decisions` (`revision_id`);
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `editorial_review_decisions_insert_check`
BEFORE INSERT ON `editorial_review_decisions`
WHEN
	NEW.`decided_at` IS NOT NULL
	OR NOT EXISTS (
		SELECT 1
		FROM `editorial_review_requests` AS `request`
		INNER JOIN `editorial_subjects` AS `subject`
			ON `subject`.`id` = `request`.`subject_id`
		INNER JOIN `editorial_revisions` AS `revision`
			ON `revision`.`id` = `request`.`revision_id`
			AND `revision`.`subject_id` = `subject`.`id`
		INNER JOIN `editorial_principals` AS `reviewer`
			ON `reviewer`.`id` = NEW.`reviewer_principal_id`
			AND `reviewer`.`status` = 'active'
		WHERE `request`.`id` = NEW.`review_request_id`
			AND `request`.`status` = 'open'
			AND `request`.`revision_id` = NEW.`revision_id`
			AND `subject`.`lifecycle_status` = 'pending_review'
			AND `subject`.`current_revision_id` = `request`.`revision_id`
			AND NEW.`reviewer_principal_id` != `subject`.`created_by_principal_id`
			AND NEW.`reviewer_principal_id` != `revision`.`created_by_principal_id`
			AND NEW.`reviewer_principal_id` != `request`.`submitted_by_principal_id`
			AND EXISTS (
				SELECT 1
				FROM `editorial_role_grants` AS `grant`
				WHERE `grant`.`principal_id` = NEW.`reviewer_principal_id`
					AND `grant`.`role` IN ('reviewer', 'admin')
					AND `grant`.`revoked_at` IS NULL
			)
	)
BEGIN
	SELECT RAISE(ABORT, 'review decision requires an active independent reviewer');
END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `editorial_review_decisions_set_database_time`
AFTER INSERT ON `editorial_review_decisions`
BEGIN
	UPDATE `editorial_review_decisions`
	SET `decided_at` = CURRENT_TIMESTAMP
	WHERE `id` = NEW.`id`;

	UPDATE `editorial_review_requests`
	SET `status` = CASE NEW.`decision`
			WHEN 'approve' THEN 'approved'
			ELSE 'rejected'
		END,
		`decided_at` = CURRENT_TIMESTAMP
	WHERE `id` = NEW.`review_request_id`
		AND `status` = 'open';

	UPDATE `editorial_subjects`
	SET `lifecycle_status` = CASE NEW.`decision`
			WHEN 'approve' THEN 'published'
			ELSE 'draft'
		END,
		`optimistic_version` = `optimistic_version` + 1,
		`updated_at` = CURRENT_TIMESTAMP
	WHERE `id` = (
			SELECT `subject_id`
			FROM `editorial_review_requests`
			WHERE `id` = NEW.`review_request_id`
		)
		AND `lifecycle_status` = 'pending_review'
		AND `current_revision_id` = NEW.`revision_id`;

	INSERT INTO `editorial_audit_events` (
		`id`, `operation_id`, `actor_principal_id`, `actor_role`,
		`subject_id`, `revision_id`, `review_request_id`, `action`,
		`before_state_json`, `after_state_json`, `metadata_json`
	)
	SELECT
		'review-decision:' || NEW.`id`,
		NEW.`operation_id`,
		NEW.`reviewer_principal_id`,
		CASE
			WHEN EXISTS (
				SELECT 1 FROM `editorial_role_grants`
				WHERE `principal_id` = NEW.`reviewer_principal_id`
					AND `role` = 'admin'
					AND `revoked_at` IS NULL
			) THEN 'admin'
			ELSE 'reviewer'
		END,
		`request`.`subject_id`,
		NEW.`revision_id`,
		NEW.`review_request_id`,
		CASE NEW.`decision`
			WHEN 'approve' THEN 'review_approved'
			ELSE 'review_rejected'
		END,
		json_object('lifecycleStatus', 'pending_review', 'requestStatus', 'open'),
		json_object(
			'lifecycleStatus',
			CASE NEW.`decision` WHEN 'approve' THEN 'published' ELSE 'draft' END,
			'requestStatus',
			CASE NEW.`decision` WHEN 'approve' THEN 'approved' ELSE 'rejected' END
		),
		json_object('decision', NEW.`decision`)
	FROM `editorial_review_requests` AS `request`
	WHERE `request`.`id` = NEW.`review_request_id`;
END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `editorial_review_decisions_update_immutable`
BEFORE UPDATE ON `editorial_review_decisions`
WHEN
	OLD.`decided_at` IS NOT NULL
	OR NEW.`id` IS NOT OLD.`id`
	OR NEW.`operation_id` IS NOT OLD.`operation_id`
	OR NEW.`review_request_id` IS NOT OLD.`review_request_id`
	OR NEW.`revision_id` IS NOT OLD.`revision_id`
	OR NEW.`reviewer_principal_id` IS NOT OLD.`reviewer_principal_id`
	OR NEW.`decision` IS NOT OLD.`decision`
	OR NEW.`reason` IS NOT OLD.`reason`
	OR NEW.`decided_at` IS NULL
BEGIN
	SELECT RAISE(ABORT, 'editorial review decision is immutable');
END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `editorial_review_decisions_delete_immutable`
BEFORE DELETE ON `editorial_review_decisions`
BEGIN
	SELECT RAISE(ABORT, 'editorial review decision is immutable');
END;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `editorial_audit_events` (
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
	CONSTRAINT `editorial_audit_events_actor_fk`
		FOREIGN KEY (`actor_principal_id`) REFERENCES `editorial_principals`(`id`)
		ON UPDATE NO ACTION ON DELETE RESTRICT,
	CONSTRAINT `editorial_audit_events_subject_fk`
		FOREIGN KEY (`subject_id`) REFERENCES `editorial_subjects`(`id`)
		ON UPDATE NO ACTION ON DELETE RESTRICT,
	CONSTRAINT `editorial_audit_events_revision_fk`
		FOREIGN KEY (`revision_id`) REFERENCES `editorial_revisions`(`id`)
		ON UPDATE NO ACTION ON DELETE RESTRICT,
	CONSTRAINT `editorial_audit_events_request_fk`
		FOREIGN KEY (`review_request_id`) REFERENCES `editorial_review_requests`(`id`)
		ON UPDATE NO ACTION ON DELETE RESTRICT,
	CONSTRAINT `editorial_audit_events_identity_check`
		CHECK (
			length(trim(`id`)) BETWEEN 1 AND 160
			AND
			length(trim(`operation_id`)) BETWEEN 1 AND 128
			AND `action` IN (
				'review_submitted', 'review_approved', 'review_rejected'
			)
		),
	CONSTRAINT `editorial_audit_events_role_check`
		CHECK (`actor_role` IN ('editor', 'reviewer', 'admin')),
	CONSTRAINT `editorial_audit_events_json_check`
		CHECK (
			(
				`before_state_json` IS NULL
				OR (
					length(`before_state_json`) <= 65536
					AND json_valid(`before_state_json`)
				)
			)
			AND (
				`after_state_json` IS NULL
				OR (
					length(`after_state_json`) <= 65536
					AND json_valid(`after_state_json`)
				)
			)
			AND (
				`metadata_json` IS NULL
				OR (
					length(`metadata_json`) <= 65536
					AND json_valid(`metadata_json`)
				)
			)
		),
	CONSTRAINT `editorial_audit_events_hash_pair_check`
		CHECK (
			(`before_hash` IS NULL AND `after_hash` IS NULL)
			OR (
				`before_hash` IS NOT NULL
				AND `after_hash` IS NOT NULL
				AND length(`before_hash`) = 64
				AND `before_hash` = lower(`before_hash`)
				AND `before_hash` NOT GLOB '*[^0-9a-f]*'
				AND length(`after_hash`) = 64
				AND `after_hash` = lower(`after_hash`)
				AND `after_hash` NOT GLOB '*[^0-9a-f]*'
			)
		)
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `editorial_audit_events_operation_unique`
ON `editorial_audit_events` (`operation_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `editorial_audit_events_subject_idx`
ON `editorial_audit_events` (`subject_id`);
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `editorial_audit_events_insert_check`
BEFORE INSERT ON `editorial_audit_events`
WHEN
	NOT EXISTS (
		SELECT 1
		FROM `editorial_principals` AS `actor`
		INNER JOIN `editorial_role_grants` AS `grant`
			ON `grant`.`principal_id` = `actor`.`id`
			AND `grant`.`role` = NEW.`actor_role`
			AND `grant`.`revoked_at` IS NULL
		WHERE `actor`.`id` = NEW.`actor_principal_id`
			AND `actor`.`status` = 'active'
	)
	OR NOT (
		(
			NEW.`action` = 'review_submitted'
			AND EXISTS (
				SELECT 1
				FROM `editorial_review_requests` AS `request`
				WHERE `request`.`id` = NEW.`review_request_id`
					AND `request`.`operation_id` = NEW.`operation_id`
					AND `request`.`submitted_by_principal_id` = NEW.`actor_principal_id`
					AND `request`.`subject_id` = NEW.`subject_id`
					AND `request`.`revision_id` = NEW.`revision_id`
					AND `request`.`status` = 'open'
					AND NEW.`actor_role` IN ('editor', 'admin')
			)
		)
		OR (
			NEW.`action` IN ('review_approved', 'review_rejected')
			AND EXISTS (
				SELECT 1
				FROM `editorial_review_decisions` AS `decision`
				INNER JOIN `editorial_review_requests` AS `request`
					ON `request`.`id` = `decision`.`review_request_id`
				WHERE `decision`.`operation_id` = NEW.`operation_id`
					AND `decision`.`reviewer_principal_id` = NEW.`actor_principal_id`
					AND `decision`.`revision_id` = NEW.`revision_id`
					AND `request`.`id` = NEW.`review_request_id`
					AND `request`.`subject_id` = NEW.`subject_id`
					AND `request`.`revision_id` = NEW.`revision_id`
					AND NEW.`actor_role` IN ('reviewer', 'admin')
					AND (
						(
							`decision`.`decision` = 'approve'
							AND NEW.`action` = 'review_approved'
							AND `request`.`status` = 'approved'
						)
						OR (
							`decision`.`decision` = 'reject'
							AND NEW.`action` = 'review_rejected'
							AND `request`.`status` = 'rejected'
						)
					)
			)
		)
	)
BEGIN
	SELECT RAISE(ABORT, 'editorial audit event does not match workflow state');
END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `editorial_audit_events_update_immutable`
BEFORE UPDATE ON `editorial_audit_events`
BEGIN
	SELECT RAISE(ABORT, 'editorial audit event is immutable');
END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `editorial_audit_events_delete_immutable`
BEFORE DELETE ON `editorial_audit_events`
BEGIN
	SELECT RAISE(ABORT, 'editorial audit event is immutable');
END;
