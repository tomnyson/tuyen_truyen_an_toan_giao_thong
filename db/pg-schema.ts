// Schema PostgreSQL (Neon) cho tầng nội dung pháp lý — giai đoạn A của
// cuộc chuyển D1 → Neon (docs/superpowers/specs/2026-07-31-neon-postgres-design.md).
// Tên bảng/cột giữ nguyên bản SQLite để consumer Drizzle không đổi query.
// DDL thật (kèm CHECK + trigger plpgsql) nằm ở db/pg-bootstrap.ts; schema
// này chỉ phục vụ query builder và suy luận kiểu.
import { sql } from "drizzle-orm";
import {
  integer,
  pgTable,
  primaryKey,
  serial,
  text,
} from "drizzle-orm/pg-core";

export const legalSources = pgTable("legal_sources", {
  id: serial("id").primaryKey(),
  documentNumber: text("document_number").notNull(),
  title: text("title").notNull(),
  officialUrl: text("official_url").notNull(),
  officialHost: text("official_host").notNull(),
  issuedAt: text("issued_at"),
  effectiveFrom: text("effective_from"),
  effectiveTo: text("effective_to"),
  status: text("status", {
    enum: ["draft", "in_force", "expired", "superseded"],
  })
    .notNull()
    .default("draft"),
  createdBy: text("created_by").notNull(),
  lastVerifiedAt: text("last_verified_at"),
  verifiedBy: text("verified_by"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(now())::text`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(now())::text`),
});

export const legalProvisions = pgTable("legal_provisions", {
  id: serial("id").primaryKey(),
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
  })
    .notNull()
    .default("draft"),
  createdBy: text("created_by").notNull(),
  reviewedBy: text("reviewed_by"),
  reviewedAt: text("reviewed_at"),
  revisionId: text("revision_id"),
  checksumVersion: text("checksum_version"),
  checksumSha256: text("checksum_sha256"),
  effectivityStatus: text("effectivity_status", {
    enum: ["unknown", "in_force", "partially_in_force", "superseded", "expired"],
  })
    .notNull()
    .default("unknown"),
  effectiveFrom: text("effective_from"),
  effectiveTo: text("effective_to"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(now())::text`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(now())::text`),
});

export const legalEntries = pgTable("legal_entries", {
  id: serial("id").primaryKey(),
  topic: text("topic").notNull(),
  icon: text("icon").notNull().default("§"),
  title: text("title").notNull(),
  legalBasis: text("legal_basis").notNull(),
  penalty: text("penalty").notNull(),
  remedy: text("remedy").notNull(),
  caseStudy: text("case_study").notNull(),
  tags: text("tags").notNull().default("[]"),
  // Ảnh/video minh họa tình huống (US-030); rỗng nghĩa là chưa có media.
  mediaUrl: text("media_url").notNull().default(""),
  status: text("status", { enum: ["draft", "published"] })
    .notNull()
    .default("draft"),
  reviewStatus: text("review_status", {
    enum: ["legacy_unverified", "four_eyes_verified"],
  })
    .notNull()
    .default("legacy_unverified"),
  createdBy: text("created_by"),
  reviewedBy: text("reviewed_by"),
  reviewedAt: text("reviewed_at"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(now())::text`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(now())::text`),
});

export const showcases = pgTable("showcases", {
  id: serial("id").primaryKey(),
  topic: text("topic").notNull(),
  title: text("title").notNull(),
  summary: text("summary").notNull(),
  sourceUrl: text("source_url").notNull().default(""),
  mediaUrl: text("media_url").notNull().default(""),
  status: text("status", { enum: ["draft", "published"] })
    .notNull()
    .default("draft"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(now())::text`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(now())::text`),
});

// Bộ đếm tương tác công khai (US-033, US-034). Bảng chỉ chứa số đếm, không
// chứa bất kỳ định danh người dùng nào.
export const contentEngagement = pgTable(
  "content_engagement",
  {
    entityType: text("entity_type", { enum: ["law", "showcase"] }).notNull(),
    entityId: integer("entity_id").notNull(),
    viewCount: integer("view_count").notNull().default(0),
    favoriteCount: integer("favorite_count").notNull().default(0),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`(now())::text`),
  },
  (table) => [
    primaryKey({
      name: "content_engagement_pk",
      columns: [table.entityType, table.entityId],
    }),
  ],
);

// Khóa chống đếm trùng: SHA-256 của (nội dung + loại tương tác + mốc ngày +
// token ngẫu nhiên do trình duyệt tự sinh). Không suy ngược ra người dùng.
export const contentEngagementMarks = pgTable("content_engagement_marks", {
  markKey: text("mark_key").primaryKey(),
  expiresAt: integer("expires_at"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(now())::text`),
});

export const legalEntryCitations = pgTable(
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
    })
      .notNull()
      .default("legacy_unverified"),
    createdBy: text("created_by"),
    reviewedBy: text("reviewed_by"),
    reviewedAt: text("reviewed_at"),
    citedRevisionId: text("cited_revision_id"),
    citedChecksumVersion: text("cited_checksum_version"),
    citedChecksumSha256: text("cited_checksum_sha256"),
    createdAt: text("created_at")
    .notNull()
    .default(sql`(now())::text`),
  },
  (table) => [
    primaryKey({
      name: "legal_entry_citations_pk",
      columns: [table.legalEntryId, table.provisionId],
    }),
  ],
);
