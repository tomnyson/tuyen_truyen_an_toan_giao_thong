import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const legalEntries = sqliteTable(
  "legal_entries",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    topic: text("topic").notNull(),
    icon: text("icon").notNull().default("§"),
    title: text("title").notNull(),
    legalBasis: text("legal_basis").notNull(),
    penalty: text("penalty").notNull(),
    remedy: text("remedy").notNull(),
    caseStudy: text("case_study").notNull(),
    tags: text("tags").notNull().default("[]"),
    status: text("status", { enum: ["draft", "published"] })
      .notNull()
      .default("draft"),
    reviewStatus: text("review_status", {
      enum: ["legacy_unverified", "four_eyes_verified"],
    }).notNull().default("legacy_unverified"),
    createdBy: text("created_by"),
    reviewedBy: text("reviewed_by"),
    reviewedAt: text("reviewed_at"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    check(
      "legal_entries_status_check",
      sql`${table.status} in ('draft', 'published')`,
    ),
    check(
      "legal_entries_review_status_check",
      sql`${table.reviewStatus} in ('legacy_unverified', 'four_eyes_verified')`,
    ),
    check(
      "legal_entries_four_eyes_review_check",
      sql`${table.reviewStatus} != 'four_eyes_verified' or (
        ${table.status} = 'published'
        and ${table.createdBy} is not null
        and ${table.reviewedBy} is not null
        and ${table.reviewedAt} is not null
        and ${table.reviewedBy} != ${table.createdBy}
      )`,
    ),
  ],
);

export const showcases = sqliteTable("showcases", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  topic: text("topic").notNull(),
  title: text("title").notNull(),
  summary: text("summary").notNull(),
  sourceUrl: text("source_url").notNull().default(""),
  status: text("status", { enum: ["draft", "published"] }).notNull().default("draft"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const legalSources = sqliteTable(
  "legal_sources",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    documentNumber: text("document_number").notNull(),
    title: text("title").notNull(),
    officialUrl: text("official_url").notNull(),
    officialHost: text("official_host").notNull(),
    issuedAt: text("issued_at"),
    effectiveFrom: text("effective_from"),
    effectiveTo: text("effective_to"),
    status: text("status", {
      enum: ["draft", "in_force", "expired", "superseded"],
    }).notNull().default("draft"),
    createdBy: text("created_by").notNull(),
    lastVerifiedAt: text("last_verified_at"),
    verifiedBy: text("verified_by"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("legal_sources_document_number_unique").on(table.documentNumber),
    uniqueIndex("legal_sources_official_url_unique").on(table.officialUrl),
    index("legal_sources_status_idx").on(table.status),
    check(
      "legal_sources_status_check",
      sql`${table.status} in ('draft', 'in_force', 'expired', 'superseded')`,
    ),
    check(
      "legal_sources_https_url_check",
      sql`lower(${table.officialUrl}) like 'https://%'`,
    ),
    check(
      "legal_sources_official_host_format_check",
      sql`${table.officialHost} = lower(${table.officialHost})
        and length(${table.officialHost}) > 0
        and ${table.officialHost} not glob '*[^a-z0-9.-]*'
        and ${table.officialHost} not like '%..%'
        and ${table.officialHost} not like '.%'
        and ${table.officialHost} not like '%.'`,
    ),
    check(
      "legal_sources_official_host_allowlist_check",
      sql`${table.status} = 'draft' or (
        ${table.officialHost} in ('vbpl.vn', 'vbpl.moj.gov.vn', 'chinhphu.vn')
        or ${table.officialHost} like '%.chinhphu.vn'
      )`,
    ),
    check(
      "legal_sources_url_authority_check",
      sql`lower(${table.officialUrl}) = 'https://' || ${table.officialHost}
        or lower(${table.officialUrl}) like 'https://' || ${table.officialHost} || '/%'
        or lower(${table.officialUrl}) like 'https://' || ${table.officialHost} || '?%'
        or lower(${table.officialUrl}) like 'https://' || ${table.officialHost} || '#%'`,
    ),
    check(
      "legal_sources_effectivity_check",
      sql`${table.effectiveTo} is null or ${table.effectiveFrom} is null or ${table.effectiveTo} >= ${table.effectiveFrom}`,
    ),
    check(
      "legal_sources_in_force_verification_check",
      sql`${table.status} != 'in_force' or (
        ${table.effectiveFrom} is not null
        and ${table.lastVerifiedAt} is not null
        and ${table.verifiedBy} is not null
        and ${table.verifiedBy} != ${table.createdBy}
      )`,
    ),
  ],
);

export const legalProvisions = sqliteTable(
  "legal_provisions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    sourceId: integer("source_id")
      .notNull()
      .references(() => legalSources.id, { onDelete: "restrict" }),
    article: text("article"),
    clause: text("clause"),
    point: text("point"),
    originalText: text("original_text").notNull(),
    simplifiedText: text("simplified_text").notNull(),
    status: text("status", {
      enum: ["draft", "pending_review", "published", "archived"],
    }).notNull().default("draft"),
    createdBy: text("created_by").notNull(),
    reviewedBy: text("reviewed_by"),
    reviewedAt: text("reviewed_at"),
    revisionId: text("revision_id"),
    checksumVersion: text("checksum_version"),
    checksumSha256: text("checksum_sha256"),
    effectivityStatus: text("effectivity_status", {
      enum: [
        "unknown",
        "in_force",
        "partially_in_force",
        "superseded",
        "expired",
      ],
    }).notNull().default("unknown"),
    effectiveFrom: text("effective_from"),
    effectiveTo: text("effective_to"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("legal_provisions_source_id_idx").on(table.sourceId),
    index("legal_provisions_status_idx").on(table.status),
    uniqueIndex("legal_provisions_revision_id_unique")
      .on(table.revisionId)
      .where(sql`${table.revisionId} is not null`),
    check(
      "legal_provisions_status_check",
      sql`${table.status} in ('draft', 'pending_review', 'published', 'archived')`,
    ),
    check(
      "legal_provisions_published_review_check",
      sql`${table.status} != 'published' or (
        ${table.reviewedBy} is not null
        and ${table.reviewedAt} is not null
        and ${table.reviewedBy} != ${table.createdBy}
      )`,
    ),
    check(
      "legal_provisions_effectivity_status_check",
      sql`${table.effectivityStatus} in (
        'unknown', 'in_force', 'partially_in_force', 'superseded', 'expired'
      )`,
    ),
    check(
      "legal_provisions_effectivity_window_check",
      sql`${table.effectiveTo} is null
        or ${table.effectiveFrom} is not null
        and ${table.effectiveTo} >= ${table.effectiveFrom}`,
    ),
    check(
      "legal_provisions_revision_metadata_check",
      sql`(
        ${table.revisionId} is null
        and ${table.checksumVersion} is null
        and ${table.checksumSha256} is null
      ) or (
        ${table.revisionId} is not null
        and length(${table.revisionId}) between 1 and 128
        and substr(${table.revisionId}, 1, 1) glob '[A-Za-z0-9]'
        and ${table.revisionId} not glob '*[^A-Za-z0-9._:-]*'
        and ${table.checksumVersion} = 'provision-sha256-v1'
        and length(${table.checksumSha256}) = 64
        and ${table.checksumSha256} = lower(${table.checksumSha256})
        and ${table.checksumSha256} not glob '*[^0-9a-f]*'
      )`,
    ),
    check(
      "legal_provisions_published_readiness_check",
      sql`${table.status} != 'published' or (
        ${table.revisionId} is not null
        and ${table.checksumVersion} = 'provision-sha256-v1'
        and ${table.checksumSha256} is not null
        and ${table.effectivityStatus} = 'in_force'
        and ${table.effectiveFrom} is not null
      )`,
    ),
  ],
);

export const legalEntryCitations = sqliteTable(
  "legal_entry_citations",
  {
    legalEntryId: integer("legal_entry_id")
      .notNull()
      .references(() => legalEntries.id, { onDelete: "cascade" }),
    provisionId: integer("provision_id")
      .notNull()
      .references(() => legalProvisions.id, { onDelete: "restrict" }),
    displayOrder: integer("display_order").notNull().default(0),
    reviewStatus: text("review_status", {
      enum: ["legacy_unverified", "four_eyes_verified"],
    }).notNull().default("legacy_unverified"),
    createdBy: text("created_by"),
    reviewedBy: text("reviewed_by"),
    reviewedAt: text("reviewed_at"),
    citedRevisionId: text("cited_revision_id"),
    citedChecksumVersion: text("cited_checksum_version"),
    citedChecksumSha256: text("cited_checksum_sha256"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    primaryKey({
      name: "legal_entry_citations_pk",
      columns: [table.legalEntryId, table.provisionId],
    }),
    index("legal_entry_citations_provision_id_idx").on(table.provisionId),
    check(
      "legal_entry_citations_display_order_check",
      sql`${table.displayOrder} >= 0`,
    ),
    check(
      "legal_entry_citations_review_status_check",
      sql`${table.reviewStatus} in ('legacy_unverified', 'four_eyes_verified')`,
    ),
    check(
      "legal_entry_citations_four_eyes_review_check",
      sql`${table.reviewStatus} != 'four_eyes_verified' or (
        ${table.createdBy} is not null
        and ${table.reviewedBy} is not null
        and ${table.reviewedAt} is not null
        and ${table.reviewedBy} != ${table.createdBy}
        and ${table.citedRevisionId} is not null
        and ${table.citedChecksumVersion} = 'provision-sha256-v1'
        and ${table.citedChecksumSha256} is not null
      )`,
    ),
  ],
);
