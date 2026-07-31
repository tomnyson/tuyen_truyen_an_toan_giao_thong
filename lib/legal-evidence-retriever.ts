const MAX_QUERY_LENGTH = 600;
const MAX_QUERY_TERMS = 32;
const MAX_CANDIDATES = 500;
export const PROVISION_CHECKSUM_VERSION = "provision-sha256-v1";
const APPROVED_OFFICIAL_HOSTS = new Set([
  "vbpl.vn",
  "vbpl.moj.gov.vn",
  "chinhphu.vn",
]);

const ignoredTerms = new Set([
  "cho",
  "cua",
  "duoc",
  "khong",
  "nhung",
  "nhu",
  "the",
  "nao",
  "voi",
  "mot",
  "cac",
  "khi",
  "hay",
  "em",
  "toi",
]);

export type ReviewStatus = "four_eyes_verified" | "legacy_unverified";
export type ProvisionEffectivityStatus =
  | "unknown"
  | "in_force"
  | "partially_in_force"
  | "superseded"
  | "expired";

export type CandidateGraphRow = {
  answerSignal: {
    id: number;
    status: "draft" | "published";
    reviewStatus: ReviewStatus;
    createdBy: string | null;
    reviewedBy: string | null;
    reviewedAt: string | null;
    topic: string;
    title: string;
    tags: string;
    updatedAt: string;
  };
  citationLink: {
    legalEntryId: number;
    provisionId: number;
    reviewStatus: ReviewStatus;
    createdBy: string | null;
    reviewedBy: string | null;
    reviewedAt: string | null;
    citedRevisionId: string | null;
    citedChecksumVersion: string | null;
    citedChecksumSha256: string | null;
  };
  provision: {
    id: number;
    sourceId: number;
    status: "draft" | "pending_review" | "published" | "archived";
    article: string | null;
    clause: string | null;
    point: string | null;
    originalText: string;
    simplifiedText: string;
    createdBy: string;
    reviewedBy: string | null;
    reviewedAt: string | null;
    revisionId: string | null;
    checksumVersion: string | null;
    checksum: string | null;
    effectivityStatus: ProvisionEffectivityStatus;
    effectiveFrom: string | null;
    effectiveTo: string | null;
    updatedAt: string;
  };
  source: {
    id: number;
    status: "draft" | "in_force" | "expired" | "superseded";
    documentNumber: string;
    title: string;
    officialUrl: string;
    officialHost: string;
    effectiveFrom: string | null;
    effectiveTo: string | null;
    createdBy: string;
    verifiedBy: string | null;
    lastVerifiedAt: string | null;
    updatedAt: string;
  };
};

export type PolicyApproval = {
  pm: string;
  internalContentReviewer: string;
  approvedAt: string;
};

export type FreshnessPolicy = {
  version: string;
  approval: PolicyApproval;
  rules: Array<{
    officialHost: string;
    maxAgeDays: number;
  }>;
};

export type RankingPolicy = {
  version: string;
  approval: PolicyApproval;
  topK: number;
  minimumScore: number;
  minimumMatchedTerms: number;
  candidateLimit: number;
  weights: {
    title: number;
    tags: number;
    topic: number;
    simplifiedProvision: number;
    originalProvision: number;
    sourceTitle: number;
    documentNumber: number;
    exactTitlePhraseBonus: number;
  };
};

type EvaluationContext = {
  asOf: string;
  freshnessPolicy?: FreshnessPolicy;
  rankingPolicy?: RankingPolicy;
};

export type CandidateEligibilityReason =
  | "GRAPH_METADATA_INVALID"
  | "ANSWER_NOT_PUBLISHED"
  | "ANSWER_NOT_FOUR_EYES_REVIEWED"
  | "CITATION_RELATION_MISMATCH"
  | "CITATION_NOT_FOUR_EYES_REVIEWED"
  | "CITATION_REVISION_MISMATCH"
  | "PROVISION_NOT_PUBLISHED"
  | "PROVISION_NOT_FOUR_EYES_REVIEWED"
  | "PROVISION_REVISION_MISSING"
  | "PROVISION_EFFECTIVITY_UNVERIFIED"
  | "PROVISION_NOT_EFFECTIVE"
  | "SOURCE_RELATION_MISMATCH"
  | "SOURCE_NOT_IN_FORCE"
  | "SOURCE_NOT_FOUR_EYES_VERIFIED"
  | "SOURCE_URL_INVALID"
  | "SOURCE_NOT_EFFECTIVE"
  | "SOURCE_TIMESTAMP_INVALID"
  | "NO_FRESHNESS_RULE"
  | "SOURCE_STALE";

export type RankedProvisionCandidate = {
  candidateId: string;
  score: number;
  matchedTerms: string[];
  matchReasons: Array<{
    field: keyof RankingPolicy["weights"];
    terms: string[];
  }>;
  rankingSignal: {
    answerId: number;
    topic: string;
    title: string;
    updatedAt: string;
  };
  provision: {
    id: number;
    sourceId: number;
    revisionId: string;
    checksumVersion: string;
    checksum: string;
    article: string | null;
    clause: string | null;
    point: string | null;
    originalText: string;
    simplifiedText: string;
    effectiveFrom: string;
    effectiveTo: string | null;
    reviewedAt: string;
    updatedAt: string;
  };
  source: {
    id: number;
    documentNumber: string;
    title: string;
    officialUrl: string;
    officialHost: string;
    effectiveFrom: string;
    effectiveTo: string | null;
    lastVerifiedAt: string;
    updatedAt: string;
  };
};

export type RankedCandidateSet = {
  evaluatedAt: string;
  rankingPolicyVersion: string;
  freshnessPolicyVersion: string;
  candidates: RankedProvisionCandidate[];
};

export type CandidateUnavailableCode =
  | "INVALID_QUERY"
  | "MISSING_FRESHNESS_POLICY"
  | "INVALID_FRESHNESS_POLICY"
  | "MISSING_RANKING_POLICY"
  | "INVALID_RANKING_POLICY"
  | "CANDIDATE_SCAN_OVERFLOW"
  | "CANDIDATE_CONFLICT"
  | "NO_ELIGIBLE_CANDIDATES"
  | "BELOW_THRESHOLD"
  | "DEPENDENCY_ERROR";

export type CandidateRetrievalResult =
  | {
      status: "candidates";
      candidateSet: RankedCandidateSet;
    }
  | {
      status: "unavailable";
      code: CandidateUnavailableCode;
      diagnostics: {
        graphRowCount: number;
        eligibleCandidateCount: number;
      };
    };

type D1CandidateRow = {
  answer_id: number;
  answer_status: "draft" | "published";
  answer_topic: string;
  answer_title: string;
  answer_tags: string;
  answer_updated_at: string;
  answer_review_status: ReviewStatus;
  answer_created_by: string | null;
  answer_reviewed_by: string | null;
  answer_reviewed_at: string | null;
  citation_entry_id: number;
  citation_provision_id: number;
  citation_review_status: ReviewStatus;
  citation_created_by: string | null;
  citation_reviewed_by: string | null;
  citation_reviewed_at: string | null;
  citation_revision_id: string | null;
  citation_checksum_version: string | null;
  citation_checksum_sha256: string | null;
  provision_id: number;
  provision_source_id: number;
  provision_status: "draft" | "pending_review" | "published" | "archived";
  provision_article: string | null;
  provision_clause: string | null;
  provision_point: string | null;
  provision_original_text: string;
  provision_simplified_text: string;
  provision_created_by: string;
  provision_reviewed_by: string | null;
  provision_reviewed_at: string | null;
  provision_revision_id: string | null;
  provision_checksum_version: string | null;
  provision_checksum_sha256: string | null;
  provision_effectivity_status: ProvisionEffectivityStatus;
  provision_effective_from: string | null;
  provision_effective_to: string | null;
  provision_updated_at: string;
  source_id: number;
  source_status: "draft" | "in_force" | "expired" | "superseded";
  source_document_number: string;
  source_title: string;
  source_official_url: string;
  source_official_host: string;
  source_effective_from: string | null;
  source_effective_to: string | null;
  source_created_by: string;
  source_verified_by: string | null;
  source_last_verified_at: string | null;
  source_updated_at: string;
};

type D1QueryResult<T> = {
  results?: T[];
};

type D1BoundStatement = {
  all<T>(): Promise<D1QueryResult<T>>;
};

type D1Statement = {
  bind(...values: unknown[]): D1BoundStatement;
};

export type D1CandidateDatabase = {
  prepare(query: string): D1Statement;
};

export type CandidateRetrieverDependencies = {
  database: D1CandidateDatabase;
  freshnessPolicy: FreshnessPolicy;
  rankingPolicy: RankingPolicy;
  clock: () => string;
};

export const D1_CANDIDATE_GRAPH_SQL = `
SELECT
  entry.id AS answer_id,
  entry.status AS answer_status,
  entry.topic AS answer_topic,
  entry.title AS answer_title,
  entry.tags AS answer_tags,
  entry.updated_at AS answer_updated_at,
  entry.review_status AS answer_review_status,
  entry.created_by AS answer_created_by,
  entry.reviewed_by AS answer_reviewed_by,
  entry.reviewed_at AS answer_reviewed_at,
  citation.legal_entry_id AS citation_entry_id,
  citation.provision_id AS citation_provision_id,
  citation.review_status AS citation_review_status,
  citation.created_by AS citation_created_by,
  citation.reviewed_by AS citation_reviewed_by,
  citation.reviewed_at AS citation_reviewed_at,
  citation.cited_revision_id AS citation_revision_id,
  citation.cited_checksum_version AS citation_checksum_version,
  citation.cited_checksum_sha256 AS citation_checksum_sha256,
  provision.id AS provision_id,
  provision.source_id AS provision_source_id,
  provision.status AS provision_status,
  provision.article AS provision_article,
  provision.clause AS provision_clause,
  provision.point AS provision_point,
  provision.original_text AS provision_original_text,
  provision.simplified_text AS provision_simplified_text,
  provision.created_by AS provision_created_by,
  provision.reviewed_by AS provision_reviewed_by,
  provision.reviewed_at AS provision_reviewed_at,
  provision.revision_id AS provision_revision_id,
  provision.checksum_version AS provision_checksum_version,
  provision.checksum_sha256 AS provision_checksum_sha256,
  provision.effectivity_status AS provision_effectivity_status,
  provision.effective_from AS provision_effective_from,
  provision.effective_to AS provision_effective_to,
  provision.updated_at AS provision_updated_at,
  source.id AS source_id,
  source.status AS source_status,
  source.document_number AS source_document_number,
  source.title AS source_title,
  source.official_url AS source_official_url,
  source.official_host AS source_official_host,
  source.effective_from AS source_effective_from,
  source.effective_to AS source_effective_to,
  source.created_by AS source_created_by,
  source.verified_by AS source_verified_by,
  source.last_verified_at AS source_last_verified_at,
  source.updated_at AS source_updated_at
FROM legal_entry_citations AS citation
INNER JOIN legal_entries AS entry
  ON entry.id = citation.legal_entry_id
INNER JOIN legal_provisions AS provision
  ON provision.id = citation.provision_id
INNER JOIN legal_sources AS source
  ON source.id = provision.source_id
WHERE entry.status = 'published'
  AND provision.status = 'published'
  AND source.status = 'in_force'
ORDER BY entry.id ASC, provision.id ASC
LIMIT ?1
`.trim();

function unavailable(
  code: CandidateUnavailableCode,
  graphRowCount = 0,
  eligibleCandidateCount = 0,
): CandidateRetrievalResult {
  return {
    status: "unavailable",
    code,
    diagnostics: { graphRowCount, eligibleCandidateCount },
  };
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isBoundedString(value: unknown, maxLength: number): value is string {
  return isNonEmptyString(value) && value.length <= maxLength;
}

function isOptionalBoundedString(
  value: unknown,
  maxLength: number,
): value is string | null {
  return value === null || isBoundedString(value, maxLength);
}

function isPositiveInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) > 0;
}

function isSafeIntegerBetween(
  value: unknown,
  minimum: number,
  maximum: number,
): value is number {
  return (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value >= minimum &&
    value <= maximum
  );
}

function isStringArrayJson(value: string): boolean {
  if (value.length > 4_000) return false;
  try {
    const parsed: unknown = JSON.parse(value);
    return (
      Array.isArray(parsed) &&
      parsed.length <= 64 &&
      parsed.every(
        (item) => typeof item === "string" && item.length > 0 && item.length <= 128,
      )
    );
  } catch {
    return false;
  }
}

function parseUtcTime(value: unknown): number | null {
  if (typeof value !== "string") return null;
  const dateOnly = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const sqliteTimestamp = value.match(
    /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/,
  );
  const isoTimestamp = value.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{3}))?Z$/,
  );
  const match = dateOnly ?? sqliteTimestamp ?? isoTimestamp;
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4] ?? 0);
  const minute = Number(match[5] ?? 0);
  const second = Number(match[6] ?? 0);
  const millisecond = Number(match[7] ?? 0);
  if (year < 1970 || year > 9_999) return null;

  const parsed = Date.UTC(
    year,
    month - 1,
    day,
    hour,
    minute,
    second,
    millisecond,
  );
  const date = new Date(parsed);
  return date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day &&
    date.getUTCHours() === hour &&
    date.getUTCMinutes() === minute &&
    date.getUTCSeconds() === second &&
    date.getUTCMilliseconds() === millisecond
    ? parsed
    : null;
}

function parseEffectiveBoundary(
  value: string,
  boundary: "start" | "end",
): number | null {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return parseUtcTime(
      `${value}T${boundary === "start" ? "00:00:00.000" : "23:59:59.999"}Z`,
    );
  }
  return parseUtcTime(value);
}

function toIsoUtc(value: string): string {
  const parsed = parseUtcTime(value);
  return parsed === null ? value : new Date(parsed).toISOString();
}

function deepFreeze<T>(value: T, seen = new WeakSet<object>()): T {
  if (typeof value !== "object" || value === null || seen.has(value)) {
    return value;
  }
  seen.add(value);
  for (const child of Object.values(value)) {
    deepFreeze(child, seen);
  }
  return Object.freeze(value);
}

function isApprovedHost(host: string): boolean {
  return (
    APPROVED_OFFICIAL_HOSTS.has(host) ||
    (host.endsWith(".chinhphu.vn") && host.length > ".chinhphu.vn".length)
  );
}

function isValidOfficialUrl(officialUrl: string, officialHost: string): boolean {
  try {
    const url = new URL(officialUrl);
    return (
      officialHost === officialHost.toLowerCase() &&
      isApprovedHost(officialHost) &&
      url.protocol === "https:" &&
      url.hostname === officialHost &&
      url.username === "" &&
      url.password === "" &&
      url.port === ""
    );
  } catch {
    return false;
  }
}

function isApprovalValid(approval: unknown, asOfMs: number): boolean {
  if (!isRecord(approval)) return false;
  const approvedAt = parseUtcTime(approval.approvedAt);
  return (
    isBoundedString(approval.pm, 200) &&
    isBoundedString(approval.internalContentReviewer, 200) &&
    approval.pm !== approval.internalContentReviewer &&
    approvedAt !== null &&
    approvedAt <= asOfMs
  );
}

function isFreshnessPolicyValid(
  policy: unknown,
  asOfMs: number,
): policy is FreshnessPolicy {
  if (!isRecord(policy)) return false;
  if (
    !isBoundedString(policy.version, 128) ||
    !isApprovalValid(policy.approval, asOfMs) ||
    !Array.isArray(policy.rules) ||
    policy.rules.length === 0
  ) {
    return false;
  }

  const hosts = new Set<string>();
  return policy.rules.every((rule) => {
    if (
      !isRecord(rule) ||
      !isNonEmptyString(rule.officialHost) ||
      rule.officialHost !== rule.officialHost.toLowerCase() ||
      !isApprovedHost(rule.officialHost) ||
      hosts.has(rule.officialHost) ||
      !isSafeIntegerBetween(rule.maxAgeDays, 1, 3_650)
    ) {
      return false;
    }
    hosts.add(rule.officialHost);
    return true;
  });
}

function isRankingPolicyValid(
  policy: unknown,
  asOfMs: number,
): policy is RankingPolicy {
  if (
    !isRecord(policy) ||
    !isRecord(policy.weights)
  ) {
    return false;
  }
  const weightRecord = policy.weights;
  const expectedWeightKeys = [
    "title",
    "tags",
    "topic",
    "simplifiedProvision",
    "originalProvision",
    "sourceTitle",
    "documentNumber",
    "exactTitlePhraseBonus",
  ];
  if (
    Object.keys(weightRecord).length !== expectedWeightKeys.length ||
    expectedWeightKeys.some((key) => !(key in weightRecord))
  ) {
    return false;
  }
  const weights = Object.values(weightRecord);
  return (
    isBoundedString(policy.version, 128) &&
    isApprovalValid(policy.approval, asOfMs) &&
    isSafeIntegerBetween(policy.topK, 1, 8) &&
    isSafeIntegerBetween(policy.minimumScore, 1, 1_000_000) &&
    isSafeIntegerBetween(
      policy.minimumMatchedTerms,
      1,
      MAX_QUERY_TERMS,
    ) &&
    isSafeIntegerBetween(policy.candidateLimit, 1, MAX_CANDIDATES) &&
    weights.length === 8 &&
    weights.every(
      (weight) => isSafeIntegerBetween(weight, 0, 100),
    ) &&
    weights.some((weight) => weight > 0)
  );
}

export function normalizeRetrievalText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeChecksumText(value: string): string {
  return value.normalize("NFC").replace(/\r\n?/g, "\n");
}

export async function computeProvisionChecksum(
  candidate: Pick<CandidateGraphRow, "provision" | "source">,
): Promise<string> {
  if (
    !candidate.provision.revisionId ||
    candidate.provision.checksumVersion !== PROVISION_CHECKSUM_VERSION
  ) {
    throw new Error("provision checksum metadata is incomplete");
  }
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) throw new Error("Web Crypto is unavailable");

  const optionalText = (value: string | null) =>
    value === null ? null : normalizeChecksumText(value);
  const payload = JSON.stringify([
    PROVISION_CHECKSUM_VERSION,
    normalizeChecksumText(candidate.source.documentNumber),
    normalizeChecksumText(candidate.source.officialUrl),
    normalizeChecksumText(candidate.provision.revisionId),
    optionalText(candidate.provision.article),
    optionalText(candidate.provision.clause),
    optionalText(candidate.provision.point),
    normalizeChecksumText(candidate.provision.originalText),
    normalizeChecksumText(candidate.provision.simplifiedText),
    candidate.provision.effectivityStatus,
    normalizeChecksumText(candidate.provision.effectiveFrom ?? ""),
    optionalText(candidate.provision.effectiveTo),
  ]);
  const digest = await subtle.digest(
    "SHA-256",
    new TextEncoder().encode(payload),
  );
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function tokenizeRetrievalQuery(question: string): string[] {
  const terms = normalizeRetrievalText(question)
    .split(" ")
    .filter((term) => term.length >= 2 && !ignoredTerms.has(term));
  return [...new Set(terms)].slice(0, MAX_QUERY_TERMS);
}

function getPreflightFailure(
  question: string,
  context: EvaluationContext,
): CandidateUnavailableCode | null {
  if (!isRecord(context)) return "INVALID_QUERY";
  const asOfMs = parseUtcTime(context.asOf);
  if (
    !isNonEmptyString(question) ||
    question.trim().length > MAX_QUERY_LENGTH ||
    tokenizeRetrievalQuery(question).length === 0 ||
    asOfMs === null
  ) {
    return "INVALID_QUERY";
  }
  if (!context.freshnessPolicy) return "MISSING_FRESHNESS_POLICY";
  if (!isFreshnessPolicyValid(context.freshnessPolicy, asOfMs)) {
    return "INVALID_FRESHNESS_POLICY";
  }
  if (!context.rankingPolicy) return "MISSING_RANKING_POLICY";
  if (!isRankingPolicyValid(context.rankingPolicy, asOfMs)) {
    return "INVALID_RANKING_POLICY";
  }
  return null;
}

function hasValidFourEyesReview(
  reviewStatus: ReviewStatus,
  createdBy: string | null,
  reviewedBy: string | null,
  reviewedAt: string | null,
  asOfMs: number,
): boolean {
  const reviewedAtMs = reviewedAt ? parseUtcTime(reviewedAt) : null;
  return (
    reviewStatus === "four_eyes_verified" &&
    isNonEmptyString(createdBy) &&
    isNonEmptyString(reviewedBy) &&
    createdBy !== reviewedBy &&
    reviewedAtMs !== null &&
    reviewedAtMs <= asOfMs
  );
}

export function getCandidateEligibilityReason(
  candidate: CandidateGraphRow,
  freshnessPolicy: FreshnessPolicy,
  asOf: string,
): CandidateEligibilityReason | null {
  const asOfMs = parseUtcTime(asOf);
  if (asOfMs === null) return "SOURCE_TIMESTAMP_INVALID";
  const answerUpdatedAtMs = parseUtcTime(candidate.answerSignal.updatedAt);
  const provisionUpdatedAtMs = parseUtcTime(candidate.provision.updatedAt);
  const sourceUpdatedAtMs = parseUtcTime(candidate.source.updatedAt);

  if (
    !isPositiveInteger(candidate.answerSignal.id) ||
    !isPositiveInteger(candidate.citationLink.legalEntryId) ||
    !isPositiveInteger(candidate.citationLink.provisionId) ||
    !isPositiveInteger(candidate.provision.id) ||
    !isPositiveInteger(candidate.provision.sourceId) ||
    !isPositiveInteger(candidate.source.id) ||
    !isBoundedString(candidate.answerSignal.topic, 200) ||
    !isBoundedString(candidate.answerSignal.title, 500) ||
    !isStringArrayJson(candidate.answerSignal.tags) ||
    !isOptionalBoundedString(candidate.provision.article, 200) ||
    !isOptionalBoundedString(candidate.provision.clause, 200) ||
    !isOptionalBoundedString(candidate.provision.point, 200) ||
    !isBoundedString(candidate.provision.originalText, 20_000) ||
    !isBoundedString(candidate.provision.simplifiedText, 10_000) ||
    !isBoundedString(candidate.source.documentNumber, 500) ||
    !isBoundedString(candidate.source.title, 1_000) ||
    !isBoundedString(candidate.source.officialUrl, 2_000) ||
    !isBoundedString(candidate.source.officialHost, 253) ||
    answerUpdatedAtMs === null ||
    provisionUpdatedAtMs === null ||
    sourceUpdatedAtMs === null ||
    answerUpdatedAtMs > asOfMs ||
    provisionUpdatedAtMs > asOfMs ||
    sourceUpdatedAtMs > asOfMs
  ) {
    return "GRAPH_METADATA_INVALID";
  }

  if (candidate.answerSignal.status !== "published") {
    return "ANSWER_NOT_PUBLISHED";
  }
  if (
    !hasValidFourEyesReview(
      candidate.answerSignal.reviewStatus,
      candidate.answerSignal.createdBy,
      candidate.answerSignal.reviewedBy,
      candidate.answerSignal.reviewedAt,
      asOfMs,
    )
  ) {
    return "ANSWER_NOT_FOUR_EYES_REVIEWED";
  }
  if (
    candidate.citationLink.legalEntryId !== candidate.answerSignal.id ||
    candidate.citationLink.provisionId !== candidate.provision.id
  ) {
    return "CITATION_RELATION_MISMATCH";
  }
  if (
    !hasValidFourEyesReview(
      candidate.citationLink.reviewStatus,
      candidate.citationLink.createdBy,
      candidate.citationLink.reviewedBy,
      candidate.citationLink.reviewedAt,
      asOfMs,
    )
  ) {
    return "CITATION_NOT_FOUR_EYES_REVIEWED";
  }
  if (candidate.provision.status !== "published") {
    return "PROVISION_NOT_PUBLISHED";
  }
  if (
    !hasValidFourEyesReview(
      "four_eyes_verified",
      candidate.provision.createdBy,
      candidate.provision.reviewedBy,
      candidate.provision.reviewedAt,
      asOfMs,
    )
  ) {
    return "PROVISION_NOT_FOUR_EYES_REVIEWED";
  }
  if (
    !isNonEmptyString(candidate.provision.revisionId) ||
    !/^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/.test(
      candidate.provision.revisionId,
    ) ||
    candidate.provision.checksumVersion !== PROVISION_CHECKSUM_VERSION ||
    !isNonEmptyString(candidate.provision.checksum) ||
    !/^[a-f0-9]{64}$/.test(candidate.provision.checksum)
  ) {
    return "PROVISION_REVISION_MISSING";
  }
  if (
    candidate.citationLink.citedRevisionId !==
      candidate.provision.revisionId ||
    candidate.citationLink.citedChecksumVersion !==
      candidate.provision.checksumVersion ||
    candidate.citationLink.citedChecksumSha256 !== candidate.provision.checksum
  ) {
    return "CITATION_REVISION_MISMATCH";
  }
  if (
    candidate.provision.effectivityStatus !== "in_force" ||
    !candidate.provision.effectiveFrom
  ) {
    return "PROVISION_EFFECTIVITY_UNVERIFIED";
  }
  const provisionFromMs = parseEffectiveBoundary(
    candidate.provision.effectiveFrom,
    "start",
  );
  const provisionToMs = candidate.provision.effectiveTo
    ? parseEffectiveBoundary(candidate.provision.effectiveTo, "end")
    : null;
  if (
    provisionFromMs === null ||
    (candidate.provision.effectiveTo !== null && provisionToMs === null) ||
    provisionFromMs > asOfMs ||
    (provisionToMs !== null && provisionToMs < asOfMs)
  ) {
    return "PROVISION_NOT_EFFECTIVE";
  }
  if (candidate.provision.sourceId !== candidate.source.id) {
    return "SOURCE_RELATION_MISMATCH";
  }
  if (candidate.source.status !== "in_force") {
    return "SOURCE_NOT_IN_FORCE";
  }
  const verifiedAtMs = candidate.source.lastVerifiedAt
    ? parseUtcTime(candidate.source.lastVerifiedAt)
    : null;
  if (
    !isNonEmptyString(candidate.source.createdBy) ||
    !isNonEmptyString(candidate.source.verifiedBy) ||
    candidate.source.createdBy === candidate.source.verifiedBy
  ) {
    return "SOURCE_NOT_FOUR_EYES_VERIFIED";
  }
  if (verifiedAtMs === null || verifiedAtMs > asOfMs) {
    return "SOURCE_TIMESTAMP_INVALID";
  }
  if (
    !isValidOfficialUrl(
      candidate.source.officialUrl,
      candidate.source.officialHost,
    )
  ) {
    return "SOURCE_URL_INVALID";
  }

  const sourceFromMs = candidate.source.effectiveFrom
    ? parseEffectiveBoundary(candidate.source.effectiveFrom, "start")
    : null;
  const sourceToMs = candidate.source.effectiveTo
    ? parseEffectiveBoundary(candidate.source.effectiveTo, "end")
    : null;
  if (
    sourceFromMs === null ||
    (candidate.source.effectiveTo !== null && sourceToMs === null)
  ) {
    return "SOURCE_TIMESTAMP_INVALID";
  }
  if (
    sourceFromMs > asOfMs ||
    (sourceToMs !== null && sourceToMs < asOfMs)
  ) {
    return "SOURCE_NOT_EFFECTIVE";
  }

  const freshnessRule =
    freshnessPolicy.rules.find(
      (rule) => rule.officialHost === candidate.source.officialHost,
    ) ?? null;
  if (!freshnessRule) return "NO_FRESHNESS_RULE";

  const maxAgeMs = freshnessRule.maxAgeDays * 24 * 60 * 60 * 1_000;
  if (asOfMs - verifiedAtMs > maxAgeMs) return "SOURCE_STALE";
  return null;
}

function matchTerms(terms: string[], value: string): string[] {
  const normalized = ` ${normalizeRetrievalText(value)} `;
  return terms.filter((term) => normalized.includes(` ${term} `));
}

function rankCandidate(
  question: string,
  terms: string[],
  candidate: CandidateGraphRow,
  policy: RankingPolicy,
) {
  const fields: Array<{
    field: Exclude<
      keyof RankingPolicy["weights"],
      "exactTitlePhraseBonus"
    >;
    value: string;
  }> = [
    { field: "title", value: candidate.answerSignal.title },
    { field: "tags", value: candidate.answerSignal.tags },
    { field: "topic", value: candidate.answerSignal.topic },
    {
      field: "simplifiedProvision",
      value: candidate.provision.simplifiedText,
    },
    { field: "originalProvision", value: candidate.provision.originalText },
    { field: "sourceTitle", value: candidate.source.title },
    { field: "documentNumber", value: candidate.source.documentNumber },
  ];

  let score = 0;
  const reasons: RankedProvisionCandidate["matchReasons"] = [];
  const matched = new Set<string>();
  for (const item of fields) {
    const fieldTerms = matchTerms(terms, item.value);
    if (fieldTerms.length === 0) continue;
    score += fieldTerms.length * policy.weights[item.field];
    fieldTerms.forEach((term) => matched.add(term));
    reasons.push({ field: item.field, terms: fieldTerms });
  }

  const normalizedQuestion = normalizeRetrievalText(question);
  if (
    normalizedQuestion.length > 0 &&
    normalizeRetrievalText(candidate.answerSignal.title).includes(
      normalizedQuestion,
    )
  ) {
    score += policy.weights.exactTitlePhraseBonus;
    reasons.push({
      field: "exactTitlePhraseBonus",
      terms: [normalizedQuestion],
    });
  }

  return {
    candidate,
    score,
    matchedTerms: [...matched].sort(),
    reasons,
  };
}

function createCandidateId(candidate: CandidateGraphRow): string {
  return [
    "provision",
    candidate.provision.id,
    "source",
    candidate.source.id,
    "revision",
    candidate.provision.revisionId,
    "checksum",
    candidate.provision.checksum,
  ].join(":");
}

function createCanonicalGroupId(candidate: CandidateGraphRow): string {
  return [
    "provision",
    candidate.provision.id,
    "source",
    candidate.source.id,
    "revision",
    candidate.provision.revisionId,
  ].join(":");
}

function createCanonicalFingerprint(candidate: CandidateGraphRow): string {
  return JSON.stringify([
    candidate.provision.id,
    candidate.provision.sourceId,
    candidate.provision.status,
    candidate.provision.article,
    candidate.provision.clause,
    candidate.provision.point,
    candidate.provision.originalText,
    candidate.provision.simplifiedText,
    candidate.provision.createdBy,
    candidate.provision.reviewedBy,
    candidate.provision.reviewedAt,
    candidate.provision.revisionId,
    candidate.provision.checksumVersion,
    candidate.provision.checksum,
    candidate.provision.effectivityStatus,
    candidate.provision.effectiveFrom,
    candidate.provision.effectiveTo,
    candidate.provision.updatedAt,
    candidate.source.id,
    candidate.source.status,
    candidate.source.documentNumber,
    candidate.source.title,
    candidate.source.officialUrl,
    candidate.source.officialHost,
    candidate.source.effectiveFrom,
    candidate.source.effectiveTo,
    candidate.source.createdBy,
    candidate.source.verifiedBy,
    candidate.source.lastVerifiedAt,
    candidate.source.updatedAt,
  ]);
}

type RankedCandidateInternal = ReturnType<typeof rankCandidate>;

function compareRankedCandidates(
  left: RankedCandidateInternal,
  right: RankedCandidateInternal,
): number {
  return (
    right.score - left.score ||
    right.matchedTerms.length - left.matchedTerms.length ||
    left.candidate.answerSignal.id - right.candidate.answerSignal.id ||
    left.candidate.provision.id - right.candidate.provision.id
  );
}

function toRankedCandidate(
  ranked: RankedCandidateInternal,
): RankedProvisionCandidate {
  const { candidate } = ranked;
  return {
    candidateId: createCandidateId(candidate),
    score: ranked.score,
    matchedTerms: ranked.matchedTerms,
    matchReasons: ranked.reasons,
    rankingSignal: {
      answerId: candidate.answerSignal.id,
      topic: candidate.answerSignal.topic,
      title: candidate.answerSignal.title,
      updatedAt: candidate.answerSignal.updatedAt,
    },
    provision: {
      id: candidate.provision.id,
      sourceId: candidate.provision.sourceId,
      revisionId: candidate.provision.revisionId!,
      checksumVersion: candidate.provision.checksumVersion!,
      checksum: candidate.provision.checksum!,
      article: candidate.provision.article,
      clause: candidate.provision.clause,
      point: candidate.provision.point,
      originalText: candidate.provision.originalText,
      simplifiedText: candidate.provision.simplifiedText,
      effectiveFrom: candidate.provision.effectiveFrom!,
      effectiveTo: candidate.provision.effectiveTo,
      reviewedAt: toIsoUtc(candidate.provision.reviewedAt!),
      updatedAt: candidate.provision.updatedAt,
    },
    source: {
      id: candidate.source.id,
      documentNumber: candidate.source.documentNumber,
      title: candidate.source.title,
      officialUrl: candidate.source.officialUrl,
      officialHost: candidate.source.officialHost,
      effectiveFrom: candidate.source.effectiveFrom!,
      effectiveTo: candidate.source.effectiveTo,
      lastVerifiedAt: toIsoUtc(candidate.source.lastVerifiedAt!),
      updatedAt: candidate.source.updatedAt,
    },
  };
}

export async function rankProvisionCandidates(
  question: string,
  graphRows: CandidateGraphRow[],
  context: EvaluationContext,
): Promise<CandidateRetrievalResult> {
  const preflightFailure = getPreflightFailure(question, context);
  if (preflightFailure) {
    return unavailable(preflightFailure, graphRows.length, 0);
  }

  const freshnessPolicy = context.freshnessPolicy!;
  const rankingPolicy = context.rankingPolicy!;
  if (graphRows.length > rankingPolicy.candidateLimit) {
    return unavailable("CANDIDATE_SCAN_OVERFLOW", graphRows.length, 0);
  }
  const metadataEligible = graphRows.filter(
    (candidate) =>
      getCandidateEligibilityReason(
        candidate,
        freshnessPolicy,
        context.asOf,
      ) === null,
  );
  if (metadataEligible.length === 0) {
    return unavailable("NO_ELIGIBLE_CANDIDATES", graphRows.length, 0);
  }
  const eligible: CandidateGraphRow[] = [];
  try {
    for (const candidate of metadataEligible) {
      if (
        (await computeProvisionChecksum(candidate)) ===
        candidate.provision.checksum
      ) {
        eligible.push(candidate);
      }
    }
  } catch {
    return unavailable("DEPENDENCY_ERROR", graphRows.length, 0);
  }
  if (eligible.length === 0) {
    return unavailable("NO_ELIGIBLE_CANDIDATES", graphRows.length, 0);
  }

  const terms = tokenizeRetrievalQuery(question);
  const canonicalGroups = new Map<
    string,
    {
      fingerprint: string;
      rows: CandidateGraphRow[];
    }
  >();
  for (const candidate of eligible) {
    const groupId = createCanonicalGroupId(candidate);
    const fingerprint = createCanonicalFingerprint(candidate);
    const existing = canonicalGroups.get(groupId);
    if (!existing) {
      canonicalGroups.set(groupId, { fingerprint, rows: [candidate] });
      continue;
    }
    if (existing.fingerprint !== fingerprint) {
      return unavailable(
        "CANDIDATE_CONFLICT",
        graphRows.length,
        eligible.length,
      );
    }
    existing.rows.push(candidate);
  }

  const ranked = [...canonicalGroups.values()]
    .map((group) =>
      group.rows
        .map((candidate) =>
          rankCandidate(question, terms, candidate, rankingPolicy),
        )
        .sort(compareRankedCandidates)[0],
    )
    .filter(
      (item) =>
        item.score >= rankingPolicy.minimumScore &&
        item.matchedTerms.length >= rankingPolicy.minimumMatchedTerms,
    )
    .sort(compareRankedCandidates);

  if (ranked.length === 0) {
    return unavailable(
      "BELOW_THRESHOLD",
      graphRows.length,
      eligible.length,
    );
  }

  const selected = ranked.slice(0, rankingPolicy.topK);

  return {
    status: "candidates",
    candidateSet: {
      evaluatedAt: toIsoUtc(context.asOf),
      rankingPolicyVersion: rankingPolicy.version,
      freshnessPolicyVersion: freshnessPolicy.version,
      candidates: selected.map(toRankedCandidate),
    },
  };
}

function mapD1Row(row: D1CandidateRow): CandidateGraphRow {
  return {
    answerSignal: {
      id: row.answer_id,
      status: row.answer_status,
      reviewStatus: row.answer_review_status,
      createdBy: row.answer_created_by,
      reviewedBy: row.answer_reviewed_by,
      reviewedAt: row.answer_reviewed_at,
      topic: row.answer_topic,
      title: row.answer_title,
      tags: row.answer_tags,
      updatedAt: row.answer_updated_at,
    },
    citationLink: {
      legalEntryId: row.citation_entry_id,
      provisionId: row.citation_provision_id,
      reviewStatus: row.citation_review_status,
      createdBy: row.citation_created_by,
      reviewedBy: row.citation_reviewed_by,
      reviewedAt: row.citation_reviewed_at,
      citedRevisionId: row.citation_revision_id,
      citedChecksumVersion: row.citation_checksum_version,
      citedChecksumSha256: row.citation_checksum_sha256,
    },
    provision: {
      id: row.provision_id,
      sourceId: row.provision_source_id,
      status: row.provision_status,
      article: row.provision_article,
      clause: row.provision_clause,
      point: row.provision_point,
      originalText: row.provision_original_text,
      simplifiedText: row.provision_simplified_text,
      createdBy: row.provision_created_by,
      reviewedBy: row.provision_reviewed_by,
      reviewedAt: row.provision_reviewed_at,
      revisionId: row.provision_revision_id,
      checksumVersion: row.provision_checksum_version,
      checksum: row.provision_checksum_sha256,
      effectivityStatus: row.provision_effectivity_status,
      effectiveFrom: row.provision_effective_from,
      effectiveTo: row.provision_effective_to,
      updatedAt: row.provision_updated_at,
    },
    source: {
      id: row.source_id,
      status: row.source_status,
      documentNumber: row.source_document_number,
      title: row.source_title,
      officialUrl: row.source_official_url,
      officialHost: row.source_official_host,
      effectiveFrom: row.source_effective_from,
      effectiveTo: row.source_effective_to,
      createdBy: row.source_created_by,
      verifiedBy: row.source_verified_by,
      lastVerifiedAt: row.source_last_verified_at,
      updatedAt: row.source_updated_at,
    },
  };
}

export async function loadD1CandidateGraph(
  database: D1CandidateDatabase,
  candidateLimit: number,
): Promise<{
  rows: CandidateGraphRow[];
  overflow: boolean;
}> {
  if (
    !Number.isInteger(candidateLimit) ||
    candidateLimit <= 0 ||
    candidateLimit > MAX_CANDIDATES
  ) {
    throw new Error("invalid candidate limit");
  }
  const result = await database
    .prepare(D1_CANDIDATE_GRAPH_SQL)
    .bind(candidateLimit + 1)
    .all<D1CandidateRow>();
  if (!Array.isArray(result.results)) {
    throw new Error("invalid D1 candidate graph result");
  }
  return {
    rows: result.results.slice(0, candidateLimit).map(mapD1Row),
    overflow: result.results.length > candidateLimit,
  };
}

export function createProvisionCandidateRetriever(
  dependencies: CandidateRetrieverDependencies,
) {
  let freshnessPolicy: FreshnessPolicy | undefined;
  let rankingPolicy: RankingPolicy | undefined;
  try {
    freshnessPolicy = deepFreeze(structuredClone(dependencies.freshnessPolicy));
    rankingPolicy = deepFreeze(structuredClone(dependencies.rankingPolicy));
  } catch {
    // The retrieval call remains fail-closed if configuration cannot be copied.
  }

  return {
    async retrieve(question: string): Promise<CandidateRetrievalResult> {
      if (!freshnessPolicy || !rankingPolicy) {
        return unavailable("DEPENDENCY_ERROR");
      }
      let context: EvaluationContext;
      try {
        context = {
          asOf: dependencies.clock(),
          freshnessPolicy,
          rankingPolicy,
        };
      } catch {
        return unavailable("DEPENDENCY_ERROR");
      }
      const preflightFailure = getPreflightFailure(question, context);
      if (preflightFailure) return unavailable(preflightFailure);

      try {
        const graph = await loadD1CandidateGraph(
          dependencies.database,
          rankingPolicy.candidateLimit,
        );
        if (graph.overflow) {
          return unavailable(
            "CANDIDATE_SCAN_OVERFLOW",
            rankingPolicy.candidateLimit + 1,
            0,
          );
        }
        return rankProvisionCandidates(question, graph.rows, context);
      } catch {
        return unavailable("DEPENDENCY_ERROR");
      }
    },
  };
}
