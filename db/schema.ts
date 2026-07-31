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

export const editorialPrincipals = sqliteTable(
  "editorial_principals",
  {
    id: text("id").primaryKey(),
    externalSubject: text("external_subject"),
    displayName: text("display_name").notNull(),
    status: text("status", { enum: ["active", "disabled"] })
      .notNull()
      .default("active"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("editorial_principals_external_subject_unique")
      .on(table.externalSubject)
      .where(sql`${table.externalSubject} is not null`),
    check(
      "editorial_principals_id_check",
      sql`length(trim(${table.id})) between 1 and 128`,
    ),
    check(
      "editorial_principals_display_name_check",
      sql`length(trim(${table.displayName})) between 1 and 200`,
    ),
    check(
      "editorial_principals_status_check",
      sql`${table.status} in ('active', 'disabled')`,
    ),
  ],
);

export const editorialRoleGrants = sqliteTable(
  "editorial_role_grants",
  {
    id: text("id").primaryKey(),
    principalId: text("principal_id")
      .notNull()
      .references(() => editorialPrincipals.id, { onDelete: "restrict" }),
    role: text("role", { enum: ["editor", "reviewer", "admin"] }).notNull(),
    grantedByPrincipalId: text("granted_by_principal_id")
      .notNull()
      .references(() => editorialPrincipals.id, { onDelete: "restrict" }),
    grantedAt: text("granted_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    revokedByPrincipalId: text("revoked_by_principal_id").references(
      () => editorialPrincipals.id,
      { onDelete: "restrict" },
    ),
    revokedAt: text("revoked_at"),
  },
  (table) => [
    uniqueIndex("editorial_role_grants_active_unique")
      .on(table.principalId, table.role)
      .where(sql`${table.revokedAt} is null`),
    index("editorial_role_grants_principal_idx").on(table.principalId),
    check(
      "editorial_role_grants_role_check",
      sql`${table.role} in ('editor', 'reviewer', 'admin')`,
    ),
    check(
      "editorial_role_grants_revocation_check",
      sql`(${table.revokedAt} is null and ${table.revokedByPrincipalId} is null)
        or ${table.revokedByPrincipalId} is not null`,
    ),
  ],
);

export const editorialSubjects = sqliteTable(
  "editorial_subjects",
  {
    id: text("id").primaryKey(),
    entityType: text("entity_type").notNull(),
    entityKey: text("entity_key").notNull(),
    createdByPrincipalId: text("created_by_principal_id")
      .notNull()
      .references(() => editorialPrincipals.id, { onDelete: "restrict" }),
    lifecycleStatus: text("lifecycle_status", {
      enum: ["draft", "pending_review", "published", "archived"],
    }).notNull().default("draft"),
    currentRevisionId: text("current_revision_id"),
    optimisticVersion: integer("optimistic_version").notNull().default(0),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("editorial_subjects_entity_unique").on(
      table.entityType,
      table.entityKey,
    ),
    index("editorial_subjects_current_revision_idx").on(table.currentRevisionId),
    check(
      "editorial_subjects_identity_check",
      sql`length(trim(${table.id})) between 1 and 128
        and length(trim(${table.entityType})) between 1 and 64
        and length(trim(${table.entityKey})) between 1 and 256`,
    ),
    check(
      "editorial_subjects_lifecycle_check",
      sql`${table.lifecycleStatus} in ('draft', 'pending_review', 'published', 'archived')`,
    ),
    check(
      "editorial_subjects_optimistic_version_check",
      sql`${table.optimisticVersion} >= 0`,
    ),
  ],
);

export const editorialRevisions = sqliteTable(
  "editorial_revisions",
  {
    id: text("id").primaryKey(),
    subjectId: text("subject_id")
      .notNull()
      .references(() => editorialSubjects.id, { onDelete: "restrict" }),
    version: integer("version").notNull(),
    canonicalSnapshotJson: text("canonical_snapshot_json").notNull(),
    checksumVersion: text("checksum_version")
      .notNull()
      .default("editorial-sha256-v1"),
    snapshotSha256: text("snapshot_sha256").notNull(),
    createdByPrincipalId: text("created_by_principal_id")
      .notNull()
      .references(() => editorialPrincipals.id, { onDelete: "restrict" }),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("editorial_revisions_subject_version_unique").on(
      table.subjectId,
      table.version,
    ),
    index("editorial_revisions_subject_idx").on(table.subjectId),
    check("editorial_revisions_version_check", sql`${table.version} > 0`),
    check(
      "editorial_revisions_snapshot_check",
      sql`json_valid(${table.canonicalSnapshotJson})
        and json_type(${table.canonicalSnapshotJson}) = 'object'
        and length(${table.canonicalSnapshotJson}) between 2 and 262144
        and ${table.checksumVersion} = 'editorial-sha256-v1'
        and length(${table.snapshotSha256}) = 64
        and ${table.snapshotSha256} = lower(${table.snapshotSha256})
        and ${table.snapshotSha256} not glob '*[^0-9a-f]*'`,
    ),
  ],
);

export const editorialReviewRequests = sqliteTable(
  "editorial_review_requests",
  {
    id: text("id").primaryKey(),
    operationId: text("operation_id").notNull(),
    subjectId: text("subject_id")
      .notNull()
      .references(() => editorialSubjects.id, { onDelete: "restrict" }),
    revisionId: text("revision_id")
      .notNull()
      .references(() => editorialRevisions.id, { onDelete: "restrict" }),
    submittedByPrincipalId: text("submitted_by_principal_id")
      .notNull()
      .references(() => editorialPrincipals.id, { onDelete: "restrict" }),
    status: text("status", {
      enum: ["open", "approved", "rejected", "cancelled"],
    }).notNull().default("open"),
    submittedAt: text("submitted_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    decidedAt: text("decided_at"),
  },
  (table) => [
    uniqueIndex("editorial_review_requests_operation_unique").on(
      table.operationId,
    ),
    uniqueIndex("editorial_review_requests_subject_revision_unique").on(
      table.subjectId,
      table.revisionId,
    ),
    uniqueIndex("editorial_review_requests_open_subject_unique")
      .on(table.subjectId)
      .where(sql`${table.status} = 'open'`),
    index("editorial_review_requests_revision_idx").on(table.revisionId),
    check(
      "editorial_review_requests_status_check",
      sql`${table.status} in ('open', 'approved', 'rejected', 'cancelled')`,
    ),
    check(
      "editorial_review_requests_operation_check",
      sql`length(trim(${table.operationId})) between 1 and 128`,
    ),
    check(
      "editorial_review_requests_decision_time_check",
      sql`(${table.status} = 'open' and ${table.decidedAt} is null)
        or (${table.status} in ('approved', 'rejected') and ${table.decidedAt} is not null)
        or ${table.status} = 'cancelled'`,
    ),
  ],
);

export const editorialReviewDecisions = sqliteTable(
  "editorial_review_decisions",
  {
    id: text("id").primaryKey(),
    operationId: text("operation_id").notNull(),
    reviewRequestId: text("review_request_id")
      .notNull()
      .references(() => editorialReviewRequests.id, { onDelete: "restrict" }),
    revisionId: text("revision_id")
      .notNull()
      .references(() => editorialRevisions.id, { onDelete: "restrict" }),
    reviewerPrincipalId: text("reviewer_principal_id")
      .notNull()
      .references(() => editorialPrincipals.id, { onDelete: "restrict" }),
    decision: text("decision", { enum: ["approve", "reject"] }).notNull(),
    reason: text("reason"),
    decidedAt: text("decided_at"),
  },
  (table) => [
    uniqueIndex("editorial_review_decisions_operation_unique").on(
      table.operationId,
    ),
    uniqueIndex("editorial_review_decisions_request_unique").on(
      table.reviewRequestId,
    ),
    uniqueIndex("editorial_review_decisions_revision_unique").on(
      table.revisionId,
    ),
    check(
      "editorial_review_decisions_value_check",
      sql`${table.decision} in ('approve', 'reject')`,
    ),
    check(
      "editorial_review_decisions_operation_check",
      sql`length(trim(${table.operationId})) between 1 and 128`,
    ),
    check(
      "editorial_review_decisions_reject_reason_check",
      sql`(${table.reason} is null or length(trim(${table.reason})) between 1 and 2000)
        and (
          ${table.decision} != 'reject'
          or (${table.reason} is not null and length(trim(${table.reason})) > 0)
        )`,
    ),
  ],
);

export const editorialAuditEvents = sqliteTable(
  "editorial_audit_events",
  {
    id: text("id").primaryKey(),
    operationId: text("operation_id").notNull(),
    actorPrincipalId: text("actor_principal_id")
      .notNull()
      .references(() => editorialPrincipals.id, { onDelete: "restrict" }),
    actorRole: text("actor_role", {
      enum: ["editor", "reviewer", "admin"],
    }).notNull(),
    subjectId: text("subject_id").references(() => editorialSubjects.id, {
      onDelete: "restrict",
    }),
    revisionId: text("revision_id").references(() => editorialRevisions.id, {
      onDelete: "restrict",
    }),
    reviewRequestId: text("review_request_id").references(
      () => editorialReviewRequests.id,
      { onDelete: "restrict" },
    ),
    action: text("action").notNull(),
    beforeStateJson: text("before_state_json"),
    afterStateJson: text("after_state_json"),
    beforeHash: text("before_hash"),
    afterHash: text("after_hash"),
    metadataJson: text("metadata_json"),
    occurredAt: text("occurred_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("editorial_audit_events_operation_unique").on(table.operationId),
    index("editorial_audit_events_subject_idx").on(table.subjectId),
    check(
      "editorial_audit_events_identity_check",
      sql`length(trim(${table.id})) between 1 and 160
        and length(trim(${table.operationId})) between 1 and 128
        and ${table.action} in (
          'review_submitted', 'review_approved', 'review_rejected'
        )`,
    ),
    check(
      "editorial_audit_events_role_check",
      sql`${table.actorRole} in ('editor', 'reviewer', 'admin')`,
    ),
    check(
      "editorial_audit_events_json_check",
      sql`(
          ${table.beforeStateJson} is null
          or (
            length(${table.beforeStateJson}) <= 65536
            and json_valid(${table.beforeStateJson})
          )
        )
        and (
          ${table.afterStateJson} is null
          or (
            length(${table.afterStateJson}) <= 65536
            and json_valid(${table.afterStateJson})
          )
        )
        and (
          ${table.metadataJson} is null
          or (
            length(${table.metadataJson}) <= 65536
            and json_valid(${table.metadataJson})
          )
        )`,
    ),
    check(
      "editorial_audit_events_hash_pair_check",
      sql`(${table.beforeHash} is null and ${table.afterHash} is null)
        or (
          ${table.beforeHash} is not null
          and ${table.afterHash} is not null
          and length(${table.beforeHash}) = 64
          and ${table.beforeHash} = lower(${table.beforeHash})
          and ${table.beforeHash} not glob '*[^0-9a-f]*'
          and length(${table.afterHash}) = 64
          and ${table.afterHash} = lower(${table.afterHash})
          and ${table.afterHash} not glob '*[^0-9a-f]*'
        )`,
    ),
  ],
);

export const rateLimitBuckets = sqliteTable(
  "rate_limit_buckets",
  {
    scope: text("scope", {
      enum: [
        "login-client-15m-v1",
        "login-account-60m-v1",
        "login-pair-attempt-15m-v1",
        "chat-client-60s-v1",
        "chat-client-day-v1",
      ],
    }).notNull(),
    keyHash: text("key_hash").notNull(),
    windowStart: integer("window_start").notNull(),
    requestCount: integer("request_count").notNull().default(1),
    expiresAt: integer("expires_at").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.scope, table.keyHash, table.windowStart] }),
    index("rate_limit_buckets_expiry_idx").on(table.expiresAt),
    check(
      "rate_limit_buckets_scope_check",
      sql`${table.scope} in (
        'login-client-15m-v1',
        'login-account-60m-v1',
        'login-pair-attempt-15m-v1',
        'chat-client-60s-v1',
        'chat-client-day-v1'
      )`,
    ),
    check(
      "rate_limit_buckets_key_hash_check",
      sql`length(${table.keyHash}) = 64
        and ${table.keyHash} = lower(${table.keyHash})
        and ${table.keyHash} not glob '*[^0-9a-f]*'`,
    ),
    check(
      "rate_limit_buckets_window_check",
      sql`${table.windowStart} >= 0
        and ${table.requestCount} >= 1
        and ${table.expiresAt} > ${table.windowStart}`,
    ),
  ],
);

export const rateLimitPenalties = sqliteTable(
  "rate_limit_penalties",
  {
    scope: text("scope", { enum: ["login-pair-penalty-15m-v1"] }).notNull(),
    keyHash: text("key_hash").notNull(),
    windowStart: integer("window_start").notNull(),
    consecutiveFailures: integer("consecutive_failures").notNull().default(1),
    blockedUntil: integer("blocked_until").notNull().default(0),
    stateVersion: text("state_version").notNull(),
    expiresAt: integer("expires_at").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.scope, table.keyHash] }),
    index("rate_limit_penalties_expiry_idx").on(table.expiresAt),
    check(
      "rate_limit_penalties_scope_check",
      sql`${table.scope} = 'login-pair-penalty-15m-v1'`,
    ),
    check(
      "rate_limit_penalties_key_hash_check",
      sql`length(${table.keyHash}) = 64
        and ${table.keyHash} = lower(${table.keyHash})
        and ${table.keyHash} not glob '*[^0-9a-f]*'`,
    ),
    check(
      "rate_limit_penalties_state_check",
      sql`${table.windowStart} >= 0
        and ${table.consecutiveFailures} >= 0
        and ${table.blockedUntil} >= 0
        and length(${table.stateVersion}) = 32
        and ${table.stateVersion} = lower(${table.stateVersion})
        and ${table.stateVersion} not glob '*[^0-9a-f]*'
        and ${table.expiresAt} > ${table.windowStart}`,
    ),
  ],
);

export const webSearchCandidates = sqliteTable(
  "web_search_candidates",
  {
    id: text("id").primaryKey(),
    requestId: text("request_id").notNull(),
    contentSha256: text("content_sha256").notNull(),
    initialAnswerText: text("initial_answer_text").notNull(),
    providerModel: text("provider_model").notNull(),
    policyVersion: text("policy_version").notNull(),
    inputTokens: integer("input_tokens"),
    outputTokens: integer("output_tokens"),
    totalTokens: integer("total_tokens"),
    lifecycleStatus: text("lifecycle_status", {
      enum: ["draft", "pending_review", "published", "rejected", "archived"],
    }).notNull().default("draft"),
    currentRevisionId: text("current_revision_id"),
    editorPrincipalId: text("editor_principal_id").references(
      () => editorialPrincipals.id,
      { onDelete: "restrict" },
    ),
    submittedAt: text("submitted_at"),
    reviewerPrincipalId: text("reviewer_principal_id").references(
      () => editorialPrincipals.id,
      { onDelete: "restrict" },
    ),
    reviewedAt: text("reviewed_at"),
    reviewReason: text("review_reason"),
    optimisticVersion: integer("optimistic_version").notNull().default(0),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("web_search_candidates_request_unique").on(table.requestId),
    index("web_search_candidates_status_updated_idx").on(
      table.lifecycleStatus,
      table.updatedAt,
    ),
    index("web_search_candidates_content_hash_idx").on(table.contentSha256),
  ],
);

export const webSearchCandidateSources = sqliteTable(
  "web_search_candidate_sources",
  {
    candidateId: text("candidate_id")
      .notNull()
      .references(() => webSearchCandidates.id, { onDelete: "restrict" }),
    displayOrder: integer("display_order").notNull(),
    title: text("title").notNull(),
    officialUrl: text("official_url").notNull(),
    officialHost: text("official_host").notNull(),
    urlSha256: text("url_sha256").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    primaryKey({ columns: [table.candidateId, table.displayOrder] }),
    uniqueIndex("web_search_candidate_sources_url_unique").on(
      table.candidateId,
      table.officialUrl,
    ),
    index("web_search_candidate_sources_candidate_idx").on(
      table.candidateId,
      table.displayOrder,
    ),
  ],
);

export const webSearchCandidateRevisions = sqliteTable(
  "web_search_candidate_revisions",
  {
    id: text("id").primaryKey(),
    candidateId: text("candidate_id")
      .notNull()
      .references(() => webSearchCandidates.id, { onDelete: "restrict" }),
    version: integer("version").notNull(),
    canonicalSnapshotJson: text("canonical_snapshot_json").notNull(),
    snapshotSha256: text("snapshot_sha256").notNull(),
    createdByPrincipalId: text("created_by_principal_id")
      .notNull()
      .references(() => editorialPrincipals.id, { onDelete: "restrict" }),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("web_search_candidate_revisions_version_unique").on(
      table.candidateId,
      table.version,
    ),
    index("web_search_candidate_revisions_candidate_idx").on(
      table.candidateId,
      table.version,
    ),
  ],
);

export const webSearchCandidateEvents = sqliteTable(
  "web_search_candidate_events",
  {
    id: text("id").primaryKey(),
    operationId: text("operation_id").notNull(),
    candidateId: text("candidate_id")
      .notNull()
      .references(() => webSearchCandidates.id, { onDelete: "restrict" }),
    revisionId: text("revision_id").references(
      () => webSearchCandidateRevisions.id,
      { onDelete: "restrict" },
    ),
    actorPrincipalId: text("actor_principal_id").references(
      () => editorialPrincipals.id,
      { onDelete: "restrict" },
    ),
    actorRole: text("actor_role", {
      enum: ["system", "editor", "reviewer", "admin"],
    }).notNull(),
    action: text("action").notNull(),
    reason: text("reason"),
    metadataJson: text("metadata_json"),
    occurredAt: text("occurred_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("web_search_candidate_events_operation_unique").on(
      table.operationId,
    ),
    index("web_search_candidate_events_candidate_idx").on(
      table.candidateId,
      table.occurredAt,
    ),
  ],
);

export const webSearchBudgetDays = sqliteTable(
  "web_search_budget_days",
  {
    dayStart: integer("day_start").primaryKey(),
    reservedTokens: integer("reserved_tokens").notNull().default(0),
    actualTokens: integer("actual_tokens").notNull().default(0),
    requestCount: integer("request_count").notNull().default(0),
    expiresAt: integer("expires_at").notNull(),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("web_search_budget_days_expiry_idx").on(table.expiresAt),
  ],
);
