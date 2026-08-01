import { isExactDec004SourceUrl } from "@/lib/public-showcase";

export const CATALOG_RESOLVER_POLICY_VERSION = "catalog-resolver-v1";
export const SUPPRESSION_SNAPSHOT_SCHEMA_VERSION =
  "catalog-suppression-snapshot-v1";

const CONTENT_KEY_PATTERN =
  /^(law|showcase):[a-z0-9]+(?:-[a-z0-9]+)*$/;
const TOPICS = ["Giao thông", "Mạng xã hội", "Sở hữu trí tuệ"] as const;
const TOPIC_ORDER = new Map(TOPICS.map((topic, index) => [topic, index]));

export type CatalogTopic = (typeof TOPICS)[number];
export type LawContentKey = `law:${string}`;
export type ShowcaseContentKey = `showcase:${string}`;
export type ContentKey = LawContentKey | ShowcaseContentKey;
export type CatalogEntityType = "law" | "showcase";
export type CatalogEligibility =
  | "eligible"
  | "blocked"
  | "stale"
  | "invalidated";
export type ManagedCatalogStatus =
  | "draft"
  | "pending_review"
  | "published"
  | "archived";

type CatalogRecordBase = Readonly<{
  contentKey: string;
  topic: string;
  displayOrder: number;
  eligibility: CatalogEligibility;
}>;

export type StaticCatalogLaw = CatalogRecordBase &
  Readonly<{
    entityType: "law";
    icon: string;
    title: string;
    legalBasis: string;
    penalty: string;
    remedy: string;
    caseStudy: string;
    tags: readonly string[];
  }>;

export type StaticCatalogShowcase = CatalogRecordBase &
  Readonly<{
    entityType: "showcase";
    title: string;
    summary: string;
    sourceUrl: string;
  }>;

export type StaticCatalogRecord =
  | StaticCatalogLaw
  | StaticCatalogShowcase;

export type ManagedCatalogRecord = (
  | Omit<StaticCatalogLaw, "eligibility">
  | Omit<StaticCatalogShowcase, "eligibility">
) &
  Readonly<{
    status: ManagedCatalogStatus;
    eligibility: CatalogEligibility;
  }>;

export type ReviewedSuppression = Readonly<{
  contentKey: string;
  entityType: CatalogEntityType;
  revisionId: string;
  reason: string;
  createdBy: string;
  reviewedBy: string;
  reviewedAt: string;
  decision: "approved";
  resolverPolicyVersion: string;
  staticCatalogVersion: string;
}>;

export type CatalogDependencySnapshot =
  | Readonly<{
      state: "available_records";
      records: readonly ManagedCatalogRecord[];
      suppressions: readonly ReviewedSuppression[];
    }>
  | Readonly<{
      state: "available_empty";
      records: readonly [];
      suppressions: readonly ReviewedSuppression[];
    }>
  | Readonly<{
      state: "unavailable";
      reason:
        | "missing_binding"
        | "schema_unavailable"
        | "query_failed"
        | "invalid_snapshot";
    }>;

export type ReviewedSuppressionSnapshot = Readonly<{
  schemaVersion: typeof SUPPRESSION_SNAPSHOT_SCHEMA_VERSION;
  snapshotVersion: string;
  resolverPolicyVersion: string;
  staticCatalogVersion: string;
  createdBy: string;
  reviewedBy: string;
  reviewedAt: string;
  expiresAt: string;
  suppressions: readonly ReviewedSuppression[];
  payloadSha256: string;
}>;

export type BackfillMapping = Readonly<{
  entityType: CatalogEntityType;
  legacyContentKey: string;
  targetContentKey: string;
}>;

export type PublicLaw = Readonly<{
  contentKey: LawContentKey;
  topic: CatalogTopic;
  icon: string;
  title: string;
  legalBasis: string;
  penalty: string;
  remedy: string;
  caseStudy: string;
  tags: readonly string[];
}>;

export type PublicShowcase = Readonly<{
  contentKey: ShowcaseContentKey;
  topic: CatalogTopic;
  title: string;
  summary: string;
  sourceUrl: string;
}>;

export type CatalogIssueCode =
  | "INVALID_STATIC_RECORD"
  | "INVALID_MANAGED_RECORD"
  | "DUPLICATE_STATIC_KEY"
  | "DUPLICATE_MANAGED_KEY"
  | "INVALID_SUPPRESSION"
  | "DUPLICATE_SUPPRESSION"
  | "MISSING_SUPPRESSION_TOMBSTONE"
  | "BACKFILL_COLLISION"
  | "BACKFILL_ORPHAN"
  | "INVALID_FALLBACK_SNAPSHOT";

export type CatalogIssue = Readonly<{
  code: CatalogIssueCode;
  contentKey?: string;
}>;

export type ResolvedCatalog = Readonly<{
  outcome: "resolved" | "failed_closed";
  dataState: "ready" | "degraded";
  resolverPolicyVersion: typeof CATALOG_RESOLVER_POLICY_VERSION;
  laws: readonly PublicLaw[];
  showcases: readonly PublicShowcase[];
  issues: readonly CatalogIssue[];
}>;

export type PublicCatalogResponse = Readonly<{
  dataState: "ready" | "degraded";
  resolverPolicyVersion: string;
  laws: readonly PublicLaw[];
  showcases: readonly PublicShowcase[];
}>;

export type CatalogResolverInput = Readonly<{
  staticCatalogVersion: string;
  requiredSuppressionSnapshotVersion: string;
  asOf: string;
  staticRecords: readonly StaticCatalogRecord[];
  dependency: CatalogDependencySnapshot;
  fallbackSuppressionSnapshot?: ReviewedSuppressionSnapshot | null;
  backfillMappings?: readonly BackfillMapping[];
}>;

type ProjectedLaw = PublicLaw & Readonly<{ displayOrder: number }>;
type ProjectedShowcase = PublicShowcase &
  Readonly<{ displayOrder: number }>;
type ProjectedRecord = ProjectedLaw | ProjectedShowcase;

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function isBoundedText(
  value: unknown,
  maximumLength: number,
): value is string {
  return (
    typeof value === "string" &&
    value === value.trim() &&
    value.length > 0 &&
    value.length <= maximumLength
  );
}

function isIsoTimestamp(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value) &&
    Number.isFinite(Date.parse(value))
  );
}

function expectedEntity(contentKey: string): CatalogEntityType | null {
  if (!isContentKey(contentKey)) return null;
  return contentKey.startsWith("law:") ? "law" : "showcase";
}

export function isContentKey(
  value: unknown,
  entityType?: CatalogEntityType,
): value is ContentKey {
  return (
    typeof value === "string" &&
    value.length <= 96 &&
    CONTENT_KEY_PATTERN.test(value) &&
    (!entityType || value.startsWith(`${entityType}:`))
  );
}

function validateCommonRecord(
  value: unknown,
  entityType: CatalogEntityType,
) {
  if (!isPlainRecord(value)) return false;
  return (
    value.entityType === entityType &&
    isContentKey(value.contentKey, entityType) &&
    TOPIC_ORDER.has(value.topic as CatalogTopic) &&
    Number.isSafeInteger(value.displayOrder) &&
    (value.displayOrder as number) >= 0 &&
    (value.displayOrder as number) <= 1_000_000 &&
    ["eligible", "blocked", "stale", "invalidated"].includes(
      value.eligibility as string,
    )
  );
}

function projectRecord(value: unknown): ProjectedRecord | null {
  if (!isPlainRecord(value)) return null;
  if (value.entityType === "law") {
    if (
      !validateCommonRecord(value, "law") ||
      !isBoundedText(value.icon, 8) ||
      !isBoundedText(value.title, 300) ||
      !isBoundedText(value.legalBasis, 1_000) ||
      !isBoundedText(value.penalty, 1_000) ||
      !isBoundedText(value.remedy, 2_500) ||
      !isBoundedText(value.caseStudy, 10_000) ||
      !Array.isArray(value.tags) ||
      value.tags.length > 24 ||
      !value.tags.every((tag) => isBoundedText(tag, 80))
    ) {
      return null;
    }
    return Object.freeze({
      contentKey: value.contentKey as LawContentKey,
      topic: value.topic as CatalogTopic,
      displayOrder: value.displayOrder as number,
      icon: value.icon,
      title: value.title,
      legalBasis: value.legalBasis,
      penalty: value.penalty,
      remedy: value.remedy,
      caseStudy: value.caseStudy,
      tags: Object.freeze([...value.tags]),
    });
  }
  if (
    value.entityType !== "showcase" ||
    !validateCommonRecord(value, "showcase") ||
    !isBoundedText(value.title, 300) ||
    !isBoundedText(value.summary, 10_000) ||
    !isBoundedText(value.sourceUrl, 2_048) ||
    !isExactDec004SourceUrl(value.sourceUrl)
  ) {
    return null;
  }
  return Object.freeze({
    contentKey: value.contentKey as ShowcaseContentKey,
    topic: value.topic as CatalogTopic,
    displayOrder: value.displayOrder as number,
    title: value.title,
    summary: value.summary,
    sourceUrl: value.sourceUrl,
  });
}

function publicRecord(record: ProjectedRecord): PublicLaw | PublicShowcase {
  if (record.contentKey.startsWith("law:")) {
    const law = record as ProjectedLaw;
    return Object.freeze({
      contentKey: law.contentKey,
      topic: law.topic,
      icon: law.icon,
      title: law.title,
      legalBasis: law.legalBasis,
      penalty: law.penalty,
      remedy: law.remedy,
      caseStudy: law.caseStudy,
      tags: law.tags,
    });
  }
  const showcase = record as ProjectedShowcase;
  return Object.freeze({
    contentKey: showcase.contentKey,
    topic: showcase.topic,
    title: showcase.title,
    summary: showcase.summary,
    sourceUrl: showcase.sourceUrl,
  });
}

function compareRecords(left: ProjectedRecord, right: ProjectedRecord) {
  return (
    (TOPIC_ORDER.get(left.topic) ?? Number.MAX_SAFE_INTEGER) -
      (TOPIC_ORDER.get(right.topic) ?? Number.MAX_SAFE_INTEGER) ||
    left.displayOrder - right.displayOrder ||
    left.contentKey.localeCompare(right.contentKey)
  );
}

function issue(code: CatalogIssueCode, contentKey?: string): CatalogIssue {
  return Object.freeze(contentKey ? { code, contentKey } : { code });
}

function failedClosed(
  dataState: "ready" | "degraded",
  issues: readonly CatalogIssue[],
): ResolvedCatalog {
  return Object.freeze({
    outcome: "failed_closed",
    dataState,
    resolverPolicyVersion: CATALOG_RESOLVER_POLICY_VERSION,
    laws: Object.freeze([]),
    showcases: Object.freeze([]),
    issues: Object.freeze([...issues]),
  });
}

function resolved(
  dataState: "ready" | "degraded",
  records: readonly ProjectedRecord[],
): ResolvedCatalog {
  const ordered = [...records].sort(compareRecords);
  return Object.freeze({
    outcome: "resolved",
    dataState,
    resolverPolicyVersion: CATALOG_RESOLVER_POLICY_VERSION,
    laws: Object.freeze(
      ordered
        .filter((record) => record.contentKey.startsWith("law:"))
        .map((record) => publicRecord(record) as PublicLaw),
    ),
    showcases: Object.freeze(
      ordered
        .filter((record) => record.contentKey.startsWith("showcase:"))
        .map((record) => publicRecord(record) as PublicShowcase),
    ),
    issues: Object.freeze([]),
  });
}

function validateSuppression(
  value: unknown,
  staticCatalogVersion: string,
  asOf: string,
): value is ReviewedSuppression {
  if (!isPlainRecord(value)) return false;
  return (
    isContentKey(value.contentKey) &&
    (value.entityType === "law" || value.entityType === "showcase") &&
    expectedEntity(value.contentKey) === value.entityType &&
    isBoundedText(value.revisionId, 128) &&
    /^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(value.revisionId) &&
    isBoundedText(value.reason, 1_000) &&
    isBoundedText(value.createdBy, 128) &&
    isBoundedText(value.reviewedBy, 128) &&
    value.createdBy !== value.reviewedBy &&
    isIsoTimestamp(value.reviewedAt) &&
    Date.parse(value.reviewedAt) <= Date.parse(asOf) &&
    value.decision === "approved" &&
    value.resolverPolicyVersion === CATALOG_RESOLVER_POLICY_VERSION &&
    value.staticCatalogVersion === staticCatalogVersion
  );
}

function validateSuppressions(
  values: readonly unknown[],
  staticCatalogVersion: string,
  asOf: string,
) {
  const issues: CatalogIssue[] = [];
  const keys = new Set<string>();
  const suppressions: ReviewedSuppression[] = [];
  for (const value of values) {
    if (!validateSuppression(value, staticCatalogVersion, asOf)) {
      issues.push(
        issue(
          "INVALID_SUPPRESSION",
          isPlainRecord(value) && typeof value.contentKey === "string"
            ? value.contentKey
            : undefined,
        ),
      );
      continue;
    }
    if (keys.has(value.contentKey)) {
      issues.push(issue("DUPLICATE_SUPPRESSION", value.contentKey));
      continue;
    }
    keys.add(value.contentKey);
    suppressions.push(Object.freeze({ ...value }));
  }
  return {
    issues,
    suppressions,
  };
}

function canonicalSuppressionSnapshotPayload(
  snapshot: Omit<ReviewedSuppressionSnapshot, "payloadSha256">,
) {
  const suppressions = [...snapshot.suppressions]
    .map((suppression) => [
      suppression.contentKey,
      suppression.entityType,
      suppression.revisionId,
      suppression.reason,
      suppression.createdBy,
      suppression.reviewedBy,
      suppression.reviewedAt,
      suppression.decision,
      suppression.resolverPolicyVersion,
      suppression.staticCatalogVersion,
    ])
    .sort((left, right) => String(left[0]).localeCompare(String(right[0])));
  return JSON.stringify([
    snapshot.schemaVersion,
    snapshot.snapshotVersion,
    snapshot.resolverPolicyVersion,
    snapshot.staticCatalogVersion,
    snapshot.createdBy,
    snapshot.reviewedBy,
    snapshot.reviewedAt,
    snapshot.expiresAt,
    suppressions,
  ]);
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

export async function createReviewedSuppressionSnapshot(
  value: Omit<ReviewedSuppressionSnapshot, "payloadSha256">,
): Promise<ReviewedSuppressionSnapshot> {
  const suppressions = Object.freeze(
    value.suppressions.map((suppression) =>
      Object.freeze({
        ...suppression,
      }),
    ),
  );
  const snapshot = Object.freeze({
    ...value,
    suppressions,
  });
  return Object.freeze({
    ...snapshot,
    payloadSha256: await sha256(
      canonicalSuppressionSnapshotPayload(snapshot),
    ),
  });
}

async function validateFallbackSnapshot(
  value: unknown,
  staticCatalogVersion: string,
  requiredSuppressionSnapshotVersion: string,
  asOf: string,
) {
  if (
    !isPlainRecord(value) ||
    value.schemaVersion !== SUPPRESSION_SNAPSHOT_SCHEMA_VERSION ||
    value.snapshotVersion !== requiredSuppressionSnapshotVersion ||
    value.resolverPolicyVersion !== CATALOG_RESOLVER_POLICY_VERSION ||
    value.staticCatalogVersion !== staticCatalogVersion ||
    !isBoundedText(value.createdBy, 128) ||
    !isBoundedText(value.reviewedBy, 128) ||
    value.createdBy === value.reviewedBy ||
    !isIsoTimestamp(value.reviewedAt) ||
    !isIsoTimestamp(value.expiresAt) ||
    Date.parse(value.reviewedAt) > Date.parse(asOf) ||
    Date.parse(value.expiresAt) <= Date.parse(asOf) ||
    !Array.isArray(value.suppressions) ||
    typeof value.payloadSha256 !== "string" ||
    !/^[0-9a-f]{64}$/.test(value.payloadSha256)
  ) {
    return null;
  }
  const validated = validateSuppressions(
    value.suppressions,
    staticCatalogVersion,
    asOf,
  );
  if (validated.issues.length > 0) return null;
  const payload = {
    schemaVersion: value.schemaVersion,
    snapshotVersion: value.snapshotVersion,
    resolverPolicyVersion: value.resolverPolicyVersion,
    staticCatalogVersion: value.staticCatalogVersion,
    createdBy: value.createdBy,
    reviewedBy: value.reviewedBy,
    reviewedAt: value.reviewedAt,
    expiresAt: value.expiresAt,
    suppressions: value.suppressions,
  } satisfies Omit<ReviewedSuppressionSnapshot, "payloadSha256">;
  const expectedHash = await sha256(
    canonicalSuppressionSnapshotPayload(payload),
  );
  return expectedHash === value.payloadSha256 ? validated.suppressions : null;
}

function snapshotFallbackSuppressionSnapshot(value: unknown): unknown {
  if (!isPlainRecord(value)) return value;
  const suppressions = Array.isArray(value.suppressions)
    ? Object.freeze(
        value.suppressions.map((suppression) =>
          isPlainRecord(suppression)
            ? Object.freeze({ ...suppression })
            : suppression,
        ),
      )
    : value.suppressions;
  return Object.freeze({
    schemaVersion: value.schemaVersion,
    snapshotVersion: value.snapshotVersion,
    resolverPolicyVersion: value.resolverPolicyVersion,
    staticCatalogVersion: value.staticCatalogVersion,
    createdBy: value.createdBy,
    reviewedBy: value.reviewedBy,
    reviewedAt: value.reviewedAt,
    expiresAt: value.expiresAt,
    suppressions,
    payloadSha256: value.payloadSha256,
  });
}

function validateBackfillMappings(
  mappings: readonly unknown[],
  staticRecords: readonly StaticCatalogRecord[],
  managedRecords: readonly ManagedCatalogRecord[],
) {
  const issues: CatalogIssue[] = [];
  const mappedLegacyKeys = new Set<string>();
  const mappedTargetKeys = new Set<string>();
  const staticByKey = new Map<string, StaticCatalogRecord>();
  for (const record of staticRecords) {
    if (isPlainRecord(record) && typeof record.contentKey === "string") {
      staticByKey.set(record.contentKey, record as StaticCatalogRecord);
    }
  }
  const managedByKey = new Map<string, ManagedCatalogRecord>();
  for (const record of managedRecords) {
    if (isPlainRecord(record) && typeof record.contentKey === "string") {
      managedByKey.set(record.contentKey, record as ManagedCatalogRecord);
    }
  }
  for (const mapping of mappings) {
    if (
      !isPlainRecord(mapping) ||
      (mapping.entityType !== "law" &&
        mapping.entityType !== "showcase") ||
      typeof mapping.legacyContentKey !== "string" ||
      typeof mapping.targetContentKey !== "string"
    ) {
      issues.push(issue("BACKFILL_ORPHAN"));
      continue;
    }
    if (
      mappedLegacyKeys.has(mapping.legacyContentKey) ||
      mappedTargetKeys.has(mapping.targetContentKey)
    ) {
      issues.push(issue("BACKFILL_COLLISION", mapping.legacyContentKey));
      continue;
    }
    mappedLegacyKeys.add(mapping.legacyContentKey);
    mappedTargetKeys.add(mapping.targetContentKey);
    const legacy = staticByKey.get(mapping.legacyContentKey);
    const target = managedByKey.get(mapping.targetContentKey);
    if (
      !isContentKey(mapping.legacyContentKey, mapping.entityType) ||
      !isContentKey(mapping.targetContentKey, mapping.entityType) ||
      !legacy ||
      !target ||
      legacy.entityType !== mapping.entityType ||
      target.entityType !== mapping.entityType
    ) {
      issues.push(issue("BACKFILL_ORPHAN", mapping.legacyContentKey));
    }
  }
  return issues;
}

function validateStaticRecords(records: readonly unknown[]) {
  const issues: CatalogIssue[] = [];
  const keys = new Set<string>();
  const projected: ProjectedRecord[] = [];
  for (const record of records) {
    const contentKey =
      isPlainRecord(record) && typeof record.contentKey === "string"
        ? record.contentKey
        : undefined;
    if (contentKey && keys.has(contentKey)) {
      issues.push(issue("DUPLICATE_STATIC_KEY", contentKey));
      continue;
    }
    if (contentKey) keys.add(contentKey);
    const item = projectRecord(record);
    if (!item) {
      issues.push(issue("INVALID_STATIC_RECORD", contentKey));
      continue;
    }
    if (
      isPlainRecord(record) &&
      record.eligibility === "eligible"
    ) {
      projected.push(item);
    }
  }
  return { issues, projected };
}

function validateManagedRecords(
  records: readonly unknown[],
  suppressionKeys: ReadonlySet<string>,
) {
  const issues: CatalogIssue[] = [];
  const keys = new Set<string>();
  const projected = new Map<string, ProjectedRecord>();
  const hiddenKeys = new Set<string>();
  for (const record of records) {
    const contentKey =
      isPlainRecord(record) && typeof record.contentKey === "string"
        ? record.contentKey
        : undefined;
    if (contentKey && keys.has(contentKey)) {
      issues.push(issue("DUPLICATE_MANAGED_KEY", contentKey));
      continue;
    }
    if (contentKey) keys.add(contentKey);
    if (
      !isPlainRecord(record) ||
      !["draft", "pending_review", "published", "archived"].includes(
        record.status as string,
      )
    ) {
      issues.push(issue("INVALID_MANAGED_RECORD", contentKey));
      continue;
    }
    const item = projectRecord(record);
    if (!item) {
      issues.push(issue("INVALID_MANAGED_RECORD", contentKey));
      continue;
    }
    if (
      record.status === "archived" ||
      record.eligibility !== "eligible"
    ) {
      if (!suppressionKeys.has(item.contentKey)) {
        issues.push(
          issue("MISSING_SUPPRESSION_TOMBSTONE", item.contentKey),
        );
        continue;
      }
      hiddenKeys.add(item.contentKey);
      continue;
    }
    if (
      record.status === "published" &&
      record.eligibility === "eligible"
    ) {
      projected.set(item.contentKey, item);
    }
  }
  return { hiddenKeys, issues, projected };
}

export async function resolveCatalog(
  input: CatalogResolverInput,
): Promise<ResolvedCatalog> {
  const staticCatalogVersion = input.staticCatalogVersion;
  const requiredSuppressionSnapshotVersion =
    input.requiredSuppressionSnapshotVersion;
  const asOf = input.asOf;
  const fallbackSuppressionSnapshot =
    snapshotFallbackSuppressionSnapshot(
      input.fallbackSuppressionSnapshot,
    );
  const dependencyObject: Record<string, unknown> = isPlainRecord(
    input.dependency,
  )
    ? input.dependency
    : {};
  const dependencyState =
    typeof dependencyObject.state === "string"
      ? dependencyObject.state
      : undefined;
  const dependencyRecords = Array.isArray(dependencyObject.records)
    ? [...dependencyObject.records]
    : null;
  const dependencySuppressions = Array.isArray(
    dependencyObject.suppressions,
  )
    ? [...dependencyObject.suppressions]
    : null;
  const dependencyReason =
    typeof dependencyObject.reason === "string"
      ? dependencyObject.reason
      : undefined;
  const staticRecords = Array.isArray(input.staticRecords)
    ? [...input.staticRecords]
    : null;
  const backfillMappings = Array.isArray(input.backfillMappings)
    ? [...input.backfillMappings]
    : [];
  if (
    !["available_records", "available_empty", "unavailable"].includes(
      dependencyState ?? "",
    )
  ) {
    return failedClosed("ready", [issue("INVALID_MANAGED_RECORD")]);
  }
  const asOfMs = Date.parse(asOf);
  if (
    !isBoundedText(staticCatalogVersion, 128) ||
    !isBoundedText(requiredSuppressionSnapshotVersion, 128) ||
    !isIsoTimestamp(asOf) ||
    !Number.isFinite(asOfMs)
  ) {
    return failedClosed(
      dependencyState === "unavailable" ? "degraded" : "ready",
      [issue("INVALID_STATIC_RECORD")],
    );
  }

  if (!staticRecords) {
    return failedClosed(
      dependencyState === "unavailable" ? "degraded" : "ready",
      [issue("INVALID_STATIC_RECORD")],
    );
  }
  const staticValidation = validateStaticRecords(staticRecords);
  if (staticValidation.issues.length > 0) {
    return failedClosed(
      dependencyState === "unavailable" ? "degraded" : "ready",
      staticValidation.issues,
    );
  }

  if (
    (dependencyState === "available_records" &&
      (!dependencyRecords ||
        dependencyRecords.length === 0 ||
        !dependencySuppressions)) ||
    (dependencyState === "available_empty" &&
      (!dependencyRecords ||
        dependencyRecords.length !== 0 ||
        !dependencySuppressions)) ||
    (dependencyState === "unavailable" &&
      ![
        "missing_binding",
        "schema_unavailable",
        "query_failed",
        "invalid_snapshot",
      ].includes(dependencyReason ?? ""))
  ) {
    return failedClosed(
      dependencyState === "unavailable" ? "degraded" : "ready",
      [issue("INVALID_MANAGED_RECORD")],
    );
  }

  let suppressionValues: readonly ReviewedSuppression[];
  if (dependencyState === "unavailable") {
    const fallbackSuppressions = await validateFallbackSnapshot(
      fallbackSuppressionSnapshot,
      staticCatalogVersion,
      requiredSuppressionSnapshotVersion,
      asOf,
    );
    if (!fallbackSuppressions) {
      return failedClosed("degraded", [
        issue("INVALID_FALLBACK_SNAPSHOT"),
      ]);
    }
    suppressionValues = fallbackSuppressions;
  } else {
    suppressionValues = dependencySuppressions!;
  }

  const suppressionValidation = validateSuppressions(
    suppressionValues,
    staticCatalogVersion,
    asOf,
  );
  if (suppressionValidation.issues.length > 0) {
    return failedClosed(
      dependencyState === "unavailable" ? "degraded" : "ready",
      suppressionValidation.issues,
    );
  }

  const hiddenKeys = new Set(
    suppressionValidation.suppressions.map(
      (suppression) => suppression.contentKey,
    ),
  );
  const records = new Map<string, ProjectedRecord>(
    staticValidation.projected
      .filter((record) => !hiddenKeys.has(record.contentKey))
      .map((record) => [record.contentKey, record]),
  );

  if (dependencyState === "available_records") {
    const managedValidation = validateManagedRecords(
      dependencyRecords!,
      hiddenKeys,
    );
    const backfillIssues = validateBackfillMappings(
      backfillMappings,
      staticRecords,
      dependencyRecords!,
    );
    const issues = [...managedValidation.issues, ...backfillIssues];
    if (issues.length > 0) return failedClosed("ready", issues);
    for (const key of managedValidation.hiddenKeys) {
      records.delete(key);
    }
    for (const [key, record] of managedValidation.projected) {
      if (!hiddenKeys.has(key)) records.set(key, record);
    }
  } else if (backfillMappings.length > 0) {
    return failedClosed(
      dependencyState === "unavailable" ? "degraded" : "ready",
      backfillMappings.map((mapping) =>
        issue(
          "BACKFILL_ORPHAN",
          isPlainRecord(mapping) &&
            typeof mapping.legacyContentKey === "string"
            ? mapping.legacyContentKey
            : undefined,
        ),
      ),
    );
  }

  return resolved(
    dependencyState === "unavailable" ? "degraded" : "ready",
    [...records.values()],
  );
}

export function createPublicCatalogResponse(
  catalog: ResolvedCatalog,
): PublicCatalogResponse {
  return Object.freeze({
    dataState:
      catalog.outcome === "failed_closed"
        ? "degraded"
        : catalog.dataState,
    resolverPolicyVersion: catalog.resolverPolicyVersion,
    laws: catalog.laws,
    showcases: catalog.showcases,
  });
}

export function createPublicCatalogHttpResponse(
  catalog: ResolvedCatalog,
  requestId: string,
) {
  const publicCatalog = createPublicCatalogResponse(catalog);
  const headers = new Headers({
    "Content-Type": "application/json; charset=utf-8",
    "X-Request-ID": requestId,
  });
  if (publicCatalog.dataState === "degraded") {
    headers.set("Cache-Control", "no-store");
  }
  return new Response(
    JSON.stringify(publicCatalog),
    {
      status: 200,
      headers,
    },
  );
}
