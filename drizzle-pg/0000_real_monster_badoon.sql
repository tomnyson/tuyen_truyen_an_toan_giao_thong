CREATE TABLE "legal_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"topic" text NOT NULL,
	"icon" text DEFAULT '§' NOT NULL,
	"title" text NOT NULL,
	"legal_basis" text NOT NULL,
	"penalty" text NOT NULL,
	"remedy" text NOT NULL,
	"case_study" text NOT NULL,
	"tags" text DEFAULT '[]' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"review_status" text DEFAULT 'legacy_unverified' NOT NULL,
	"created_by" text,
	"reviewed_by" text,
	"reviewed_at" text,
	"created_at" text DEFAULT (now())::text NOT NULL,
	"updated_at" text DEFAULT (now())::text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "legal_entry_citations" (
	"legal_entry_id" integer NOT NULL,
	"provision_id" integer NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"review_status" text DEFAULT 'legacy_unverified' NOT NULL,
	"created_by" text,
	"reviewed_by" text,
	"reviewed_at" text,
	"cited_revision_id" text,
	"cited_checksum_version" text,
	"cited_checksum_sha256" text,
	"created_at" text DEFAULT (now())::text NOT NULL,
	CONSTRAINT "legal_entry_citations_pk" PRIMARY KEY("legal_entry_id","provision_id")
);
--> statement-breakpoint
CREATE TABLE "legal_provisions" (
	"id" serial PRIMARY KEY NOT NULL,
	"source_id" integer NOT NULL,
	"article" text,
	"clause" text,
	"point" text,
	"original_text" text NOT NULL,
	"simplified_text" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_by" text NOT NULL,
	"reviewed_by" text,
	"reviewed_at" text,
	"revision_id" text,
	"checksum_version" text,
	"checksum_sha256" text,
	"effectivity_status" text DEFAULT 'unknown' NOT NULL,
	"effective_from" text,
	"effective_to" text,
	"created_at" text DEFAULT (now())::text NOT NULL,
	"updated_at" text DEFAULT (now())::text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "legal_sources" (
	"id" serial PRIMARY KEY NOT NULL,
	"document_number" text NOT NULL,
	"title" text NOT NULL,
	"official_url" text NOT NULL,
	"official_host" text NOT NULL,
	"issued_at" text,
	"effective_from" text,
	"effective_to" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_by" text NOT NULL,
	"last_verified_at" text,
	"verified_by" text,
	"created_at" text DEFAULT (now())::text NOT NULL,
	"updated_at" text DEFAULT (now())::text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "showcases" (
	"id" serial PRIMARY KEY NOT NULL,
	"topic" text NOT NULL,
	"title" text NOT NULL,
	"summary" text NOT NULL,
	"source_url" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_at" text DEFAULT (now())::text NOT NULL,
	"updated_at" text DEFAULT (now())::text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "legal_entry_citations" ADD CONSTRAINT "legal_entry_citations_legal_entry_id_legal_entries_id_fk" FOREIGN KEY ("legal_entry_id") REFERENCES "public"."legal_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "legal_entry_citations" ADD CONSTRAINT "legal_entry_citations_provision_id_legal_provisions_id_fk" FOREIGN KEY ("provision_id") REFERENCES "public"."legal_provisions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "legal_provisions" ADD CONSTRAINT "legal_provisions_source_id_legal_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."legal_sources"("id") ON DELETE restrict ON UPDATE no action;