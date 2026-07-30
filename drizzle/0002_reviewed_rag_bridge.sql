ALTER TABLE `legal_entries`
ADD COLUMN `review_status` text DEFAULT 'legacy_unverified' NOT NULL
CHECK (`review_status` IN ('legacy_unverified', 'four_eyes_verified'));
--> statement-breakpoint
ALTER TABLE `legal_entries` ADD COLUMN `created_by` text;
--> statement-breakpoint
ALTER TABLE `legal_entries` ADD COLUMN `reviewed_by` text;
--> statement-breakpoint
ALTER TABLE `legal_entries` ADD COLUMN `reviewed_at` text;
--> statement-breakpoint
ALTER TABLE `legal_provisions` ADD COLUMN `revision_id` text;
--> statement-breakpoint
ALTER TABLE `legal_provisions` ADD COLUMN `checksum_version` text;
--> statement-breakpoint
ALTER TABLE `legal_provisions` ADD COLUMN `checksum_sha256` text;
--> statement-breakpoint
ALTER TABLE `legal_provisions`
ADD COLUMN `effectivity_status` text DEFAULT 'unknown' NOT NULL
CHECK (`effectivity_status` IN (
	'unknown', 'in_force', 'partially_in_force', 'superseded', 'expired'
));
--> statement-breakpoint
ALTER TABLE `legal_provisions` ADD COLUMN `effective_from` text;
--> statement-breakpoint
ALTER TABLE `legal_provisions` ADD COLUMN `effective_to` text;
--> statement-breakpoint
ALTER TABLE `legal_entry_citations`
ADD COLUMN `review_status` text DEFAULT 'legacy_unverified' NOT NULL
CHECK (`review_status` IN ('legacy_unverified', 'four_eyes_verified'));
--> statement-breakpoint
ALTER TABLE `legal_entry_citations` ADD COLUMN `created_by` text;
--> statement-breakpoint
ALTER TABLE `legal_entry_citations` ADD COLUMN `reviewed_by` text;
--> statement-breakpoint
ALTER TABLE `legal_entry_citations` ADD COLUMN `reviewed_at` text;
--> statement-breakpoint
ALTER TABLE `legal_entry_citations` ADD COLUMN `cited_revision_id` text;
--> statement-breakpoint
ALTER TABLE `legal_entry_citations` ADD COLUMN `cited_checksum_version` text;
--> statement-breakpoint
ALTER TABLE `legal_entry_citations` ADD COLUMN `cited_checksum_sha256` text;
--> statement-breakpoint
CREATE UNIQUE INDEX `legal_provisions_revision_id_unique`
ON `legal_provisions` (`revision_id`)
WHERE `revision_id` IS NOT NULL;
--> statement-breakpoint
CREATE TRIGGER `legal_entries_review_insert_check`
BEFORE INSERT ON `legal_entries`
WHEN (
	NEW.`review_status` = 'legacy_unverified'
	AND (NEW.`reviewed_by` IS NOT NULL OR NEW.`reviewed_at` IS NOT NULL)
) OR (
	NEW.`review_status` = 'four_eyes_verified'
	AND (
		NEW.`status` != 'published'
		OR NEW.`created_by` IS NULL
		OR length(trim(NEW.`created_by`)) = 0
		OR NEW.`reviewed_by` IS NULL
		OR length(trim(NEW.`reviewed_by`)) = 0
		OR NEW.`reviewed_at` IS NULL
		OR NEW.`reviewed_by` = NEW.`created_by`
	)
)
BEGIN
	SELECT RAISE(ABORT, 'invalid legal entry review metadata');
END;
--> statement-breakpoint
CREATE TRIGGER `legal_entries_review_update_check`
BEFORE UPDATE ON `legal_entries`
WHEN (
	NEW.`review_status` = 'legacy_unverified'
	AND (NEW.`reviewed_by` IS NOT NULL OR NEW.`reviewed_at` IS NOT NULL)
) OR (
	NEW.`review_status` = 'four_eyes_verified'
	AND (
		NEW.`status` != 'published'
		OR NEW.`created_by` IS NULL
		OR length(trim(NEW.`created_by`)) = 0
		OR NEW.`reviewed_by` IS NULL
		OR length(trim(NEW.`reviewed_by`)) = 0
		OR NEW.`reviewed_at` IS NULL
		OR NEW.`reviewed_by` = NEW.`created_by`
	)
)
BEGIN
	SELECT RAISE(ABORT, 'invalid legal entry review metadata');
END;
--> statement-breakpoint
CREATE TRIGGER `legal_entries_created_by_immutable`
BEFORE UPDATE OF `created_by` ON `legal_entries`
WHEN OLD.`created_by` IS NOT NULL AND NEW.`created_by` IS NOT OLD.`created_by`
BEGIN
	SELECT RAISE(ABORT, 'legal entry created_by is immutable');
END;
--> statement-breakpoint
CREATE TRIGGER `legal_entries_material_change_invalidates_review`
AFTER UPDATE OF
	`topic`, `icon`, `title`, `legal_basis`, `penalty`, `remedy`, `case_study`,
	`tags`
ON `legal_entries`
WHEN (
	NEW.`topic` IS NOT OLD.`topic`
	OR NEW.`icon` IS NOT OLD.`icon`
	OR NEW.`title` IS NOT OLD.`title`
	OR NEW.`legal_basis` IS NOT OLD.`legal_basis`
	OR NEW.`penalty` IS NOT OLD.`penalty`
	OR NEW.`remedy` IS NOT OLD.`remedy`
	OR NEW.`case_study` IS NOT OLD.`case_study`
	OR NEW.`tags` IS NOT OLD.`tags`
)
BEGIN
	UPDATE `legal_entries`
	SET `review_status` = 'legacy_unverified',
		`reviewed_by` = NULL,
		`reviewed_at` = NULL,
		`updated_at` = CURRENT_TIMESTAMP
	WHERE `id` = NEW.`id`
		AND `review_status` = 'four_eyes_verified';

	UPDATE `legal_entry_citations`
	SET `review_status` = 'legacy_unverified',
		`reviewed_by` = NULL,
		`reviewed_at` = NULL
	WHERE `legal_entry_id` = NEW.`id`;
END;
--> statement-breakpoint
CREATE TRIGGER `legal_provisions_rag_metadata_insert_check`
BEFORE INSERT ON `legal_provisions`
WHEN
	NEW.`effectivity_status` NOT IN (
		'unknown', 'in_force', 'partially_in_force', 'superseded', 'expired'
	)
	OR (
		NEW.`effective_to` IS NOT NULL
		AND (
			NEW.`effective_from` IS NULL
			OR NEW.`effective_to` < NEW.`effective_from`
		)
	)
	OR NOT (
		(
			NEW.`revision_id` IS NULL
			AND NEW.`checksum_version` IS NULL
			AND NEW.`checksum_sha256` IS NULL
		) OR (
			NEW.`revision_id` IS NOT NULL
			AND length(NEW.`revision_id`) BETWEEN 1 AND 128
			AND substr(NEW.`revision_id`, 1, 1) GLOB '[A-Za-z0-9]'
			AND NEW.`revision_id` NOT GLOB '*[^A-Za-z0-9._:-]*'
			AND NEW.`checksum_version` = 'provision-sha256-v1'
			AND length(NEW.`checksum_sha256`) = 64
			AND NEW.`checksum_sha256` = lower(NEW.`checksum_sha256`)
			AND NEW.`checksum_sha256` NOT GLOB '*[^0-9a-f]*'
		)
	)
	OR (
		NEW.`status` = 'published'
		AND (
			NEW.`revision_id` IS NULL
			OR NEW.`checksum_version` != 'provision-sha256-v1'
			OR NEW.`checksum_sha256` IS NULL
			OR NEW.`effectivity_status` != 'in_force'
			OR NEW.`effective_from` IS NULL
		)
	)
BEGIN
	SELECT RAISE(ABORT, 'invalid provision revision or effectivity metadata');
END;
--> statement-breakpoint
CREATE TRIGGER `legal_provisions_rag_metadata_update_check`
BEFORE UPDATE ON `legal_provisions`
WHEN
	NEW.`effectivity_status` NOT IN (
		'unknown', 'in_force', 'partially_in_force', 'superseded', 'expired'
	)
	OR (
		NEW.`effective_to` IS NOT NULL
		AND (
			NEW.`effective_from` IS NULL
			OR NEW.`effective_to` < NEW.`effective_from`
		)
	)
	OR NOT (
		(
			NEW.`revision_id` IS NULL
			AND NEW.`checksum_version` IS NULL
			AND NEW.`checksum_sha256` IS NULL
		) OR (
			NEW.`revision_id` IS NOT NULL
			AND length(NEW.`revision_id`) BETWEEN 1 AND 128
			AND substr(NEW.`revision_id`, 1, 1) GLOB '[A-Za-z0-9]'
			AND NEW.`revision_id` NOT GLOB '*[^A-Za-z0-9._:-]*'
			AND NEW.`checksum_version` = 'provision-sha256-v1'
			AND length(NEW.`checksum_sha256`) = 64
			AND NEW.`checksum_sha256` = lower(NEW.`checksum_sha256`)
			AND NEW.`checksum_sha256` NOT GLOB '*[^0-9a-f]*'
		)
	)
	OR (
		NEW.`status` = 'published'
		AND (
			OLD.`status` != 'published'
			OR NEW.`revision_id` IS NOT OLD.`revision_id`
			OR NEW.`checksum_version` IS NOT OLD.`checksum_version`
			OR NEW.`checksum_sha256` IS NOT OLD.`checksum_sha256`
			OR NEW.`effectivity_status` IS NOT OLD.`effectivity_status`
			OR NEW.`effective_from` IS NOT OLD.`effective_from`
			OR NEW.`effective_to` IS NOT OLD.`effective_to`
		)
		AND (
			NEW.`revision_id` IS NULL
			OR NEW.`checksum_version` != 'provision-sha256-v1'
			OR NEW.`checksum_sha256` IS NULL
			OR NEW.`effectivity_status` != 'in_force'
			OR NEW.`effective_from` IS NULL
		)
	)
BEGIN
	SELECT RAISE(ABORT, 'invalid provision revision or effectivity metadata');
END;
--> statement-breakpoint
CREATE TRIGGER `legal_provisions_revision_immutable`
BEFORE UPDATE OF
	`source_id`, `article`, `clause`, `point`, `original_text`,
	`simplified_text`, `revision_id`, `checksum_version`, `checksum_sha256`,
	`effectivity_status`, `effective_from`, `effective_to`
ON `legal_provisions`
WHEN OLD.`revision_id` IS NOT NULL AND (
	NEW.`source_id` IS NOT OLD.`source_id`
	OR NEW.`article` IS NOT OLD.`article`
	OR NEW.`clause` IS NOT OLD.`clause`
	OR NEW.`point` IS NOT OLD.`point`
	OR NEW.`original_text` IS NOT OLD.`original_text`
	OR NEW.`simplified_text` IS NOT OLD.`simplified_text`
	OR NEW.`revision_id` IS NOT OLD.`revision_id`
	OR NEW.`checksum_version` IS NOT OLD.`checksum_version`
	OR NEW.`checksum_sha256` IS NOT OLD.`checksum_sha256`
	OR NEW.`effectivity_status` IS NOT OLD.`effectivity_status`
	OR NEW.`effective_from` IS NOT OLD.`effective_from`
	OR NEW.`effective_to` IS NOT OLD.`effective_to`
)
BEGIN
	SELECT RAISE(ABORT, 'provision revision is immutable');
END;
--> statement-breakpoint
CREATE TRIGGER `legal_entry_citations_relation_immutable`
BEFORE UPDATE OF `legal_entry_id`, `provision_id` ON `legal_entry_citations`
WHEN
	NEW.`legal_entry_id` IS NOT OLD.`legal_entry_id`
	OR NEW.`provision_id` IS NOT OLD.`provision_id`
BEGIN
	SELECT RAISE(ABORT, 'citation relation is immutable');
END;
--> statement-breakpoint
CREATE TRIGGER `legal_entry_citations_created_by_immutable`
BEFORE UPDATE OF `created_by` ON `legal_entry_citations`
WHEN OLD.`created_by` IS NOT NULL AND NEW.`created_by` IS NOT OLD.`created_by`
BEGIN
	SELECT RAISE(ABORT, 'citation created_by is immutable');
END;
--> statement-breakpoint
CREATE TRIGGER `legal_entry_citations_review_insert_check`
BEFORE INSERT ON `legal_entry_citations`
WHEN (
	NEW.`review_status` = 'legacy_unverified'
	AND (NEW.`reviewed_by` IS NOT NULL OR NEW.`reviewed_at` IS NOT NULL)
) OR (
	NEW.`review_status` = 'four_eyes_verified'
	AND (
		NEW.`created_by` IS NULL
		OR length(trim(NEW.`created_by`)) = 0
		OR NEW.`reviewed_by` IS NULL
		OR length(trim(NEW.`reviewed_by`)) = 0
		OR NEW.`reviewed_at` IS NULL
		OR NEW.`reviewed_by` = NEW.`created_by`
		OR NEW.`cited_revision_id` IS NULL
		OR NEW.`cited_checksum_version` != 'provision-sha256-v1'
		OR NEW.`cited_checksum_sha256` IS NULL
		OR NOT EXISTS (
			SELECT 1
			FROM `legal_entries` AS `entry`
			INNER JOIN `legal_provisions` AS `provision`
				ON `provision`.`id` = NEW.`provision_id`
			INNER JOIN `legal_sources` AS `source`
				ON `source`.`id` = `provision`.`source_id`
			WHERE `entry`.`id` = NEW.`legal_entry_id`
				AND `entry`.`status` = 'published'
				AND `entry`.`review_status` = 'four_eyes_verified'
				AND `provision`.`status` = 'published'
				AND `provision`.`revision_id` = NEW.`cited_revision_id`
				AND `provision`.`checksum_version` = NEW.`cited_checksum_version`
				AND `provision`.`checksum_sha256` = NEW.`cited_checksum_sha256`
				AND `provision`.`effectivity_status` = 'in_force'
				AND `source`.`status` = 'in_force'
		)
	)
)
BEGIN
	SELECT RAISE(ABORT, 'invalid citation review or revision binding');
END;
--> statement-breakpoint
CREATE TRIGGER `legal_entry_citations_review_update_check`
BEFORE UPDATE ON `legal_entry_citations`
WHEN (
	NEW.`review_status` = 'legacy_unverified'
	AND (NEW.`reviewed_by` IS NOT NULL OR NEW.`reviewed_at` IS NOT NULL)
) OR (
	NEW.`review_status` = 'four_eyes_verified'
	AND (
		NEW.`created_by` IS NULL
		OR length(trim(NEW.`created_by`)) = 0
		OR NEW.`reviewed_by` IS NULL
		OR length(trim(NEW.`reviewed_by`)) = 0
		OR NEW.`reviewed_at` IS NULL
		OR NEW.`reviewed_by` = NEW.`created_by`
		OR NEW.`cited_revision_id` IS NULL
		OR NEW.`cited_checksum_version` != 'provision-sha256-v1'
		OR NEW.`cited_checksum_sha256` IS NULL
		OR NOT EXISTS (
			SELECT 1
			FROM `legal_entries` AS `entry`
			INNER JOIN `legal_provisions` AS `provision`
				ON `provision`.`id` = NEW.`provision_id`
			INNER JOIN `legal_sources` AS `source`
				ON `source`.`id` = `provision`.`source_id`
			WHERE `entry`.`id` = NEW.`legal_entry_id`
				AND `entry`.`status` = 'published'
				AND `entry`.`review_status` = 'four_eyes_verified'
				AND `provision`.`status` = 'published'
				AND `provision`.`revision_id` = NEW.`cited_revision_id`
				AND `provision`.`checksum_version` = NEW.`cited_checksum_version`
				AND `provision`.`checksum_sha256` = NEW.`cited_checksum_sha256`
				AND `provision`.`effectivity_status` = 'in_force'
				AND `source`.`status` = 'in_force'
		)
	)
)
BEGIN
	SELECT RAISE(ABORT, 'invalid citation review or revision binding');
END;
--> statement-breakpoint
CREATE TRIGGER `legal_entry_citations_binding_change_invalidates_review`
AFTER UPDATE OF
	`cited_revision_id`, `cited_checksum_version`, `cited_checksum_sha256`
ON `legal_entry_citations`
WHEN OLD.`review_status` = 'four_eyes_verified' AND (
	NEW.`cited_revision_id` IS NOT OLD.`cited_revision_id`
	OR NEW.`cited_checksum_version` IS NOT OLD.`cited_checksum_version`
	OR NEW.`cited_checksum_sha256` IS NOT OLD.`cited_checksum_sha256`
)
BEGIN
	UPDATE `legal_entry_citations`
	SET `review_status` = 'legacy_unverified',
		`reviewed_by` = NULL,
		`reviewed_at` = NULL
	WHERE `legal_entry_id` = NEW.`legal_entry_id`
		AND `provision_id` = NEW.`provision_id`;
END;
--> statement-breakpoint
CREATE TRIGGER `legal_provisions_state_invalidates_citations`
AFTER UPDATE OF `status`, `reviewed_by`, `reviewed_at` ON `legal_provisions`
WHEN OLD.`status` = 'published' AND (
	NEW.`status` != 'published'
	OR NEW.`reviewed_by` IS NULL
	OR NEW.`reviewed_at` IS NULL
)
BEGIN
	UPDATE `legal_entry_citations`
	SET `review_status` = 'legacy_unverified',
		`reviewed_by` = NULL,
		`reviewed_at` = NULL
	WHERE `provision_id` = NEW.`id`;
END;
--> statement-breakpoint
CREATE TRIGGER `legal_sources_material_change_invalidates_rag`
AFTER UPDATE OF
	`document_number`, `title`, `official_url`, `official_host`,
	`effective_from`, `effective_to`, `status`, `last_verified_at`, `verified_by`
ON `legal_sources`
WHEN
	NEW.`document_number` IS NOT OLD.`document_number`
	OR NEW.`title` IS NOT OLD.`title`
	OR NEW.`official_url` IS NOT OLD.`official_url`
	OR NEW.`official_host` IS NOT OLD.`official_host`
	OR NEW.`effective_from` IS NOT OLD.`effective_from`
	OR NEW.`effective_to` IS NOT OLD.`effective_to`
	OR NEW.`status` IS NOT OLD.`status`
	OR NEW.`last_verified_at` IS NOT OLD.`last_verified_at`
	OR NEW.`verified_by` IS NOT OLD.`verified_by`
BEGIN
	UPDATE `legal_entry_citations`
	SET `review_status` = 'legacy_unverified',
		`reviewed_by` = NULL,
		`reviewed_at` = NULL
	WHERE `provision_id` IN (
		SELECT `id`
		FROM `legal_provisions`
		WHERE `source_id` = NEW.`id`
	);

	UPDATE `legal_provisions`
	SET `status` = 'pending_review',
		`reviewed_by` = NULL,
		`reviewed_at` = NULL,
		`updated_at` = CURRENT_TIMESTAMP
	WHERE `source_id` = NEW.`id`
		AND `status` = 'published';
END;
