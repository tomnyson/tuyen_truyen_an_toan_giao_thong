CREATE TABLE `referral_authorities` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`level` text NOT NULL,
	`topics` text DEFAULT '[]' NOT NULL,
	`scope` text DEFAULT '' NOT NULL,
	`address` text DEFAULT '' NOT NULL,
	`phone` text DEFAULT '' NOT NULL,
	`hotline` text DEFAULT '' NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`created_by` text NOT NULL,
	`reviewed_by` text,
	`reviewed_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "referral_authorities_level_check" CHECK("referral_authorities"."level" in ('truong', 'xa_phuong', 'huyen', 'tinh', 'trung_uong')),
	CONSTRAINT "referral_authorities_status_check" CHECK("referral_authorities"."status" in ('draft', 'published')),
	CONSTRAINT "referral_authorities_name_check" CHECK(length(trim("referral_authorities"."name")) between 1 and 200),
	CONSTRAINT "referral_authorities_topics_json_check" CHECK(json_valid("referral_authorities"."topics")
        and json_type("referral_authorities"."topics") = 'array'
        and length("referral_authorities"."topics") <= 512),
	CONSTRAINT "referral_authorities_contact_length_check" CHECK(length("referral_authorities"."phone") <= 40
        and length("referral_authorities"."hotline") <= 40
        and length("referral_authorities"."address") <= 300
        and length("referral_authorities"."scope") <= 200
        and length("referral_authorities"."note") <= 300),
	CONSTRAINT "referral_authorities_four_eyes_check" CHECK("referral_authorities"."status" != 'published' or (
        "referral_authorities"."reviewed_by" is not null
        and "referral_authorities"."reviewed_at" is not null
        and "referral_authorities"."reviewed_by" != "referral_authorities"."created_by"
      ))
);
--> statement-breakpoint
CREATE INDEX `referral_authorities_status_level_idx` ON `referral_authorities` (`status`,`level`);
