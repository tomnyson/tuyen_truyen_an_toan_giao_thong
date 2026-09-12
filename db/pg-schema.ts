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

// Game hóa (US-035, US-036). Ngân hàng câu hỏi, kịch bản nhập vai và cấu hình
// quy đổi huy hiệu đều là dữ liệu quản lý được qua CMS.
export const quizQuestions = pgTable("quiz_questions", {
  id: serial("id").primaryKey(),
  topic: text("topic").notNull(),
  prompt: text("prompt").notNull(),
  // Danh sách đáp án lưu dạng chuỗi JSON, cùng quy ước với cột `tags`.
  options: text("options").notNull(),
  correctIndex: integer("correct_index").notNull().default(0),
  explanation: text("explanation").notNull(),
  legalBasis: text("legal_basis").notNull(),
  sourceUrl: text("source_url").notNull().default(""),
  points: integer("points").notNull().default(10),
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

export const roleplayScenarios = pgTable("roleplay_scenarios", {
  id: serial("id").primaryKey(),
  topic: text("topic").notNull(),
  title: text("title").notNull(),
  intro: text("intro").notNull(),
  startKey: text("start_key").notNull(),
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

export const roleplayNodes = pgTable(
  "roleplay_nodes",
  {
    scenarioId: integer("scenario_id")
      .notNull()
      .references(() => roleplayScenarios.id, { onDelete: "cascade" }),
    nodeKey: text("node_key").notNull(),
    kind: text("kind", { enum: ["step", "outcome"] })
      .notNull()
      .default("step"),
    text: text("text").notNull(),
    choices: text("choices").notNull().default("[]"),
    consequence: text("consequence").notNull().default(""),
    legalBasis: text("legal_basis").notNull().default(""),
    sourceUrl: text("source_url").notNull().default(""),
    outcomeKind: text("outcome_kind", {
      enum: ["safe", "risky", "harmful"],
    }),
    points: integer("points").notNull().default(1),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(now())::text`),
  },
  (table) => [
    primaryKey({
      name: "roleplay_nodes_pk",
      columns: [table.scenarioId, table.nodeKey],
    }),
  ],
);

export const gameBadges = pgTable("game_badges", {
  code: text("code").primaryKey(),
  name: text("name").notNull(),
  icon: text("icon").notNull().default("★"),
  description: text("description").notNull().default(""),
  thresholdPoints: integer("threshold_points").notNull(),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(now())::text`),
});

// Tiến độ người chơi: khóa là hash một chiều của token ngẫu nhiên do trình
// duyệt tự sinh — không có định danh cá nhân nào trong bảng này.
export const gameProgress = pgTable("game_progress", {
  playerKey: text("player_key").primaryKey(),
  points: integer("points").notNull().default(0),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(now())::text`),
});

export const gameAwards = pgTable("game_awards", {
  awardKey: text("award_key").primaryKey(),
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

// Cơ quan tiếp nhận theo thẩm quyền (US-039, DEC-022). CHECK thật nằm ở
// db/pg-bootstrap.ts.
export const referralAuthorities = pgTable("referral_authorities", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  level: text("level", {
    enum: ["truong", "xa_phuong", "huyen", "tinh", "trung_uong"],
  }).notNull(),
  topics: text("topics").notNull().default("[]"),
  scope: text("scope").notNull().default(""),
  address: text("address").notNull().default(""),
  phone: text("phone").notNull().default(""),
  hotline: text("hotline").notNull().default(""),
  note: text("note").notNull().default(""),
  status: text("status", { enum: ["draft", "published"] })
    .notNull()
    .default("draft"),
  createdBy: text("created_by").notNull(),
  reviewedBy: text("reviewed_by"),
  reviewedAt: text("reviewed_at"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(now())::text`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(now())::text`),
});

// Chủ đề / lĩnh vực nội dung pháp luật (US-047, DEC-028).
// CHECK thật nằm ở db/pg-bootstrap.ts.
export const contentTopics = pgTable("content_topics", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  icon: text("icon").notNull().default("◉"),
  detail: text("detail").notNull().default(""),
  abbreviations: text("abbreviations").notNull().default("[]"),
  keywords: text("keywords").notNull().default("[]"),
  situations: text("situations").notNull().default("[]"),
  displayOrder: integer("display_order").notNull().default(0),
  status: text("status", { enum: ["draft", "published", "archived"] })
    .notNull()
    .default("published"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(now())::text`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(now())::text`),
});

// Kho văn bản pháp luật tra cứu (US-049).
// CHECK constraints và ràng buộc chính xác nằm ở db/pg-bootstrap.ts.
export const legalDocuments = pgTable("legal_documents", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  documentNumber: text("document_number").notNull(),
  documentType: text("document_type", {
    enum: ["luat", "nghi_dinh", "thong_tu", "quyet_dinh", "van_ban_hop_nhat", "khac"],
  })
    .notNull()
    .default("nghi_dinh"),
  topic: text("topic").notNull(),
  issuingAuthority: text("issuing_authority").notNull(),
  officialUrl: text("official_url").notNull(),
  summary: text("summary").notNull().default(""),
  effectivityStatus: text("effectivity_status", {
    enum: ["in_force", "expired", "superseded", "draft"],
  })
    .notNull()
    .default("in_force"),
  status: text("status", { enum: ["draft", "published", "archived"] })
    .notNull()
    .default("published"),
  linkStatus: text("link_status", {
    enum: ["ok", "broken", "redirect", "timeout", "unchecked"],
  })
    .notNull()
    .default("unchecked"),
  httpStatus: integer("http_status"),
  lastCheckedAt: text("last_checked_at"),
  displayOrder: integer("display_order").notNull().default(0),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(now())::text`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(now())::text`),
});

// Tài khoản quản trị & biên tập viên (US-050).
export const adminAccounts = pgTable("admin_accounts", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  fullName: text("full_name").notNull(),
  passwordHash: text("password_hash").notNull(),
  role: text("role", { enum: ["admin", "editor", "viewer"] })
    .notNull()
    .default("editor"),
  allowedTopics: text("allowed_topics").notNull().default("[]"),
  status: text("status", { enum: ["active", "disabled"] })
    .notNull()
    .default("active"),
  lastLoginAt: text("last_login_at"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(now())::text`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(now())::text`),
});

// Nhật ký kiểm toán hệ thống (Audit Logs) (US-050).
export const systemAuditLogs = pgTable("system_audit_logs", {
  id: serial("id").primaryKey(),
  actor: text("actor").notNull(),
  actorRole: text("actor_role").notNull().default("editor"),
  action: text("action").notNull(),
  targetType: text("target_type").notNull(),
  targetId: text("target_id").notNull().default(""),
  details: text("details").notNull().default(""),
  ipAddress: text("ip_address"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(now())::text`),
});



