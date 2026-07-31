import {
  composeEvidenceAnswer,
  resolveOpenAiModel,
  type EvidenceCompositionRequest,
  type OpenAiComposerFailureCode,
  type SupportedOpenAiModel,
} from "@/lib/openai-evidence";

export const AI_SHADOW_POLICY_VERSION = "ai-shadow-local-v1";
export const AI_SHADOW_FIXTURE_SCHEMA_VERSION =
  "ai-shadow-fixture-v1";

const DEFAULT_MAX_CASES = 5;
const MAX_CASES_PER_RUN = 20;
const DEFAULT_REQUEST_QUOTA = 5;
const MAX_CONFIGURED_REQUESTS_PER_MINUTE = 600;
const EVIDENCE_KEYS = new Set([
  "evidenceId",
  "sourceId",
  "provisionId",
  "provisionStatus",
  "sourceStatus",
  "freshnessStatus",
  "provisionCreatedBy",
  "provisionReviewedBy",
  "provisionReviewedAt",
  "sourceCreatedBy",
  "sourceVerifiedBy",
  "sourceLastVerifiedAt",
  "freshnessPolicyVersion",
  "text",
  "allowedClaims",
]);

export type AiShadowFixture = Readonly<{
  schemaVersion: typeof AI_SHADOW_FIXTURE_SCHEMA_VERSION;
  fixtureVersion: string;
  purpose: "synthetic_technical_shadow";
  createdBy: string;
  reviewedBy: string;
  reviewedAt: string;
  cases: readonly Readonly<
    EvidenceCompositionRequest & {
      caseId: string;
    }
  >[];
  payloadSha256: string;
}>;

export type AiShadowConfig = Readonly<{
  enabled: boolean;
  apiKey?: string;
  model?: string;
  timeoutMs?: number;
  maxCases: number;
  requestQuota: number;
}>;

export type AiShadowBatchOutcome =
  | "DISABLED"
  | "INVALID_CONFIG"
  | "INVALID_FIXTURE"
  | "COMPLETED";

export type AiShadowAggregate = Readonly<{
  policyVersion: typeof AI_SHADOW_POLICY_VERSION;
  fixtureVersion: string | null;
  outcome: AiShadowBatchOutcome;
  requestedModel: SupportedOpenAiModel | null;
  observedModels: readonly SupportedOpenAiModel[];
  availableCases: number;
  attempted: number;
  succeeded: number;
  failed: number;
  skippedByLimit: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  failures: Readonly<Partial<Record<OpenAiComposerFailureCode, number>>>;
}>;

type ShadowDependencies = Readonly<{
  fetch?: typeof fetch;
}>;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function isBoundedText(value: unknown, maximum: number): value is string {
  return (
    typeof value === "string" &&
    value === value.trim() &&
    value.length > 0 &&
    value.length <= maximum
  );
}

function isIsoTimestamp(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value) &&
    Number.isFinite(Date.parse(value))
  );
}

function readBoundedInteger(
  value: unknown,
  fallback: number,
  maximum: number,
) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 && parsed <= maximum
    ? parsed
    : Number.NaN;
}

export function readAiShadowConfig(
  runtimeEnv: Record<string, unknown>,
): AiShadowConfig {
  return Object.freeze({
    enabled: runtimeEnv.AI_SHADOW_ENABLED === "true",
    apiKey:
      typeof runtimeEnv.OPENAI_API_KEY === "string"
        ? runtimeEnv.OPENAI_API_KEY
        : undefined,
    model:
      typeof runtimeEnv.OPENAI_MODEL === "string"
        ? runtimeEnv.OPENAI_MODEL
        : undefined,
    timeoutMs: readBoundedInteger(
      runtimeEnv.AI_PROVIDER_TIMEOUT_MS,
      10_000,
      30_000,
    ),
    maxCases: readBoundedInteger(
      runtimeEnv.AI_SHADOW_MAX_CASES,
      DEFAULT_MAX_CASES,
      MAX_CASES_PER_RUN,
    ),
    requestQuota: readBoundedInteger(
      runtimeEnv.AI_PROVIDER_MAX_REQUESTS_PER_MINUTE,
      DEFAULT_REQUEST_QUOTA,
      MAX_CONFIGURED_REQUESTS_PER_MINUTE,
    ),
  });
}

function canonicalEvidence(evidence: Record<string, unknown>) {
  return [
    evidence.evidenceId,
    evidence.sourceId,
    evidence.provisionId,
    evidence.provisionStatus,
    evidence.sourceStatus,
    evidence.freshnessStatus,
    evidence.provisionCreatedBy,
    evidence.provisionReviewedBy,
    evidence.provisionReviewedAt,
    evidence.sourceCreatedBy,
    evidence.sourceVerifiedBy,
    evidence.sourceLastVerifiedAt,
    evidence.freshnessPolicyVersion,
    evidence.text,
    evidence.allowedClaims,
  ];
}

function canonicalFixturePayload(fixture: Record<string, unknown>) {
  const cases = Array.isArray(fixture.cases)
    ? fixture.cases.map((shadowCase) => {
        if (!isPlainObject(shadowCase)) return null;
        return [
          shadowCase.caseId,
          shadowCase.question,
          Array.isArray(shadowCase.evidence)
            ? shadowCase.evidence.map((evidence) =>
                isPlainObject(evidence)
                  ? canonicalEvidence(evidence)
                  : null,
              )
            : null,
        ];
      })
    : null;
  return JSON.stringify([
    fixture.schemaVersion,
    fixture.fixtureVersion,
    fixture.purpose,
    fixture.createdBy,
    fixture.reviewedBy,
    fixture.reviewedAt,
    cases,
  ]);
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

async function validateFixture(value: unknown): Promise<boolean> {
  if (
    !isPlainObject(value) ||
    Object.keys(value).length !== 8 ||
    value.schemaVersion !== AI_SHADOW_FIXTURE_SCHEMA_VERSION ||
    !isBoundedText(value.fixtureVersion, 64) ||
    value.purpose !== "synthetic_technical_shadow" ||
    !isBoundedText(value.createdBy, 128) ||
    !isBoundedText(value.reviewedBy, 128) ||
    value.createdBy === value.reviewedBy ||
    !isIsoTimestamp(value.reviewedAt) ||
    !Array.isArray(value.cases) ||
    value.cases.length === 0 ||
    value.cases.length > MAX_CASES_PER_RUN ||
    typeof value.payloadSha256 !== "string" ||
    !/^[0-9a-f]{64}$/.test(value.payloadSha256)
  ) {
    return false;
  }

  const caseIds = new Set<string>();
  for (const shadowCase of value.cases) {
    if (
      !isPlainObject(shadowCase) ||
      Object.keys(shadowCase).length !== 3 ||
      !isBoundedText(shadowCase.caseId, 128) ||
      !/^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(shadowCase.caseId) ||
      caseIds.has(shadowCase.caseId) ||
      typeof shadowCase.question !== "string" ||
      !Array.isArray(shadowCase.evidence)
    ) {
      return false;
    }
    if (
      shadowCase.evidence.some(
        (evidence) =>
          !isPlainObject(evidence) ||
          Object.keys(evidence).length !== EVIDENCE_KEYS.size ||
          Object.keys(evidence).some(
            (key) => !EVIDENCE_KEYS.has(key),
          ),
      )
    ) {
      return false;
    }
    caseIds.add(shadowCase.caseId);
  }

  return (
    (await sha256(canonicalFixturePayload(value))) ===
    value.payloadSha256
  );
}

function aggregate(
  fields: Omit<AiShadowAggregate, "policyVersion" | "failures"> & {
    failures?: Partial<Record<OpenAiComposerFailureCode, number>>;
  },
): AiShadowAggregate {
  return Object.freeze({
    policyVersion: AI_SHADOW_POLICY_VERSION,
    ...fields,
    observedModels: Object.freeze([...fields.observedModels]),
    failures: Object.freeze({ ...(fields.failures ?? {}) }),
  });
}

function zeroAggregate(
  outcome: Exclude<AiShadowBatchOutcome, "COMPLETED">,
  fixtureVersion: string | null,
  requestedModel: SupportedOpenAiModel | null,
  availableCases = 0,
) {
  return aggregate({
    fixtureVersion,
    outcome,
    requestedModel,
    observedModels: [],
    availableCases,
    attempted: 0,
    succeeded: 0,
    failed: 0,
    skippedByLimit: availableCases,
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
  });
}

export async function runAiShadowBatch(
  configInput: AiShadowConfig,
  fixtureInput: unknown,
  dependencies: ShadowDependencies = {},
): Promise<AiShadowAggregate> {
  let config: AiShadowConfig;
  let fixture: unknown;
  try {
    config = Object.freeze({ ...configInput });
    fixture = structuredClone(fixtureInput);
  } catch {
    return zeroAggregate("INVALID_FIXTURE", null, null);
  }

  const fixtureObject = isPlainObject(fixture) ? fixture : {};
  const fixtureVersion =
    typeof fixtureObject.fixtureVersion === "string" &&
    /^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$/.test(
      fixtureObject.fixtureVersion,
    )
      ? fixtureObject.fixtureVersion
      : null;
  const availableCases = Array.isArray(fixtureObject.cases)
    ? fixtureObject.cases.length
    : 0;

  if (!config.enabled) {
    return zeroAggregate(
      "DISABLED",
      fixtureVersion,
      null,
      availableCases,
    );
  }

  const model = resolveOpenAiModel(config.model);
  if (
    !model ||
    typeof config.apiKey !== "string" ||
    config.apiKey.trim().length === 0 ||
    !Number.isInteger(config.timeoutMs) ||
    Number(config.timeoutMs) <= 0 ||
    Number(config.timeoutMs) > 30_000 ||
    !Number.isInteger(config.maxCases) ||
    config.maxCases <= 0 ||
    config.maxCases > MAX_CASES_PER_RUN ||
    !Number.isInteger(config.requestQuota) ||
    config.requestQuota <= 0 ||
    config.requestQuota > MAX_CONFIGURED_REQUESTS_PER_MINUTE
  ) {
    return zeroAggregate(
      "INVALID_CONFIG",
      fixtureVersion,
      model,
      availableCases,
    );
  }

  if (!(await validateFixture(fixture))) {
    return zeroAggregate(
      "INVALID_FIXTURE",
      fixtureVersion,
      model,
      availableCases,
    );
  }

  const trustedFixture = fixture as AiShadowFixture;
  const selectedCases = trustedFixture.cases.slice(
    0,
    Math.min(config.maxCases, config.requestQuota),
  );
  const failures: Partial<Record<OpenAiComposerFailureCode, number>> =
    {};
  let succeeded = 0;
  let inputTokens = 0;
  let outputTokens = 0;
  let totalTokens = 0;
  const observedModels = new Set<SupportedOpenAiModel>();

  for (const shadowCase of selectedCases) {
    const result = await composeEvidenceAnswer(
      {
        enabled: true,
        apiKey: config.apiKey,
        model,
        timeoutMs: config.timeoutMs,
      },
      {
        question: shadowCase.question,
        evidence: [...shadowCase.evidence],
      },
      { fetch: dependencies.fetch },
    );
    if (!result.ok) {
      failures[result.code] = (failures[result.code] ?? 0) + 1;
      continue;
    }
    succeeded += 1;
    observedModels.add(result.model as SupportedOpenAiModel);
    inputTokens += result.usage.inputTokens ?? 0;
    outputTokens += result.usage.outputTokens ?? 0;
    totalTokens += result.usage.totalTokens ?? 0;
    // The validated composition is intentionally discarded.
  }

  return aggregate({
    fixtureVersion: trustedFixture.fixtureVersion,
    outcome: "COMPLETED",
    requestedModel: model,
    observedModels: [...observedModels].sort(),
    availableCases,
    attempted: selectedCases.length,
    succeeded,
    failed: selectedCases.length - succeeded,
    skippedByLimit: availableCases - selectedCases.length,
    inputTokens,
    outputTokens,
    totalTokens,
    failures,
  });
}
