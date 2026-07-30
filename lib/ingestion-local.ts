import {
  mapOfficialSampleToDraft,
  sourceRegistry,
  type DraftSourceMapping,
  type OfficialDocumentSample,
} from "@/lib/source-registry";
import vbplNd168Sample from "@/fixtures/source-registry/vbpl-nd168.sample.json" with {
  type: "json",
};

export const localIngestionSchemaVersion = "ingestion-local-v2";

export type LocalIngestionErrorCode =
  | "INVALID_REQUEST"
  | "UNSUPPORTED_MODE"
  | "SOURCE_NOT_ELIGIBLE"
  | "SAMPLE_REF_MISMATCH"
  | "INVALID_FIXTURE"
  | "FIXTURE_TOO_LARGE"
  | "FIXTURE_REJECTED";

export class LocalIngestionError extends Error {
  readonly code: LocalIngestionErrorCode;

  constructor(code: LocalIngestionErrorCode) {
    super("Local ingestion request rejected.");
    this.name = "LocalIngestionError";
    this.code = code;
  }

  toJSON() {
    return { code: this.code, message: this.message };
  }
}

export type LocalFixtureIngestionRequest = {
  mode: "local_fixture";
  providerKey: string;
  sampleRef: string;
  createdBy: string;
};

type DeepReadonly<T> = T extends (...args: never[]) => unknown
  ? T
  : T extends readonly (infer Item)[]
    ? readonly DeepReadonly<Item>[]
    : T extends object
      ? { readonly [Key in keyof T]: DeepReadonly<T[Key]> }
      : T;

export type LocalIngestionPlan = Readonly<{
  schemaVersion: typeof localIngestionSchemaVersion;
  mode: "local_fixture";
  policyVersion: typeof localIngestionSchemaVersion;
  idempotency: Readonly<{
    algorithm: "SHA-256";
    encoding: "canonical-fixture-length-prefixed-utf8-v2";
    key: string;
  }>;
  registry: Readonly<{
    providerKey: string;
    sampleRef: string;
    trustClass: "official";
    readiness: "yellow";
    decision: "conditional_go";
  }>;
  candidateStatus: "draft";
  persistence: "none";
  rawSnapshotRef: null;
  draft: DeepReadonly<DraftSourceMapping>;
}>;

const requestKeys = [
  "createdBy",
  "mode",
  "providerKey",
  "sampleRef",
] as const;
const fixtureKeys = [
  "canonicalUrl",
  "contentChecksum",
  "documentNumber",
  "effectiveFrom",
  "fetchedAt",
  "issuedAt",
  "metadataUrl",
  "providerKey",
  "provision",
  "title",
  "upstreamId",
] as const;
const provisionKeys = [
  "article",
  "clause",
  "originalText",
  "point",
  "simplifiedText",
  "sourceAnchor",
] as const;
const actorPattern = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$/;
const providerPattern = /^[a-z0-9]+(?:_[a-z0-9]+)*$/;
const checksumPattern = /^[a-f0-9]{64}$/;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const instantPattern =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const maxFixtureBytes = 64 * 1024;
const encoder = new TextEncoder();
const trustedFixtureManifest = Object.freeze([
  Object.freeze({
    providerKey: "vbpl_national",
    sampleRef: "fixtures/source-registry/vbpl-nd168.sample.json",
    fixture: vbplNd168Sample as unknown,
  }),
]);

function reject(code: LocalIngestionErrorCode): never {
  throw new LocalIngestionError(code);
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function hasExactKeys(
  value: Record<string, unknown>,
  expected: readonly string[],
) {
  const keys = Object.keys(value).sort();
  return (
    keys.length === expected.length &&
    keys.every((key, index) => key === expected[index])
  );
}

function isBoundedString(
  value: unknown,
  maximumBytes: number,
  allowEmpty = false,
): value is string {
  return (
    typeof value === "string" &&
    (allowEmpty || value.trim().length > 0) &&
    encoder.encode(value).length <= maximumBytes
  );
}

function isNullableBoundedString(
  value: unknown,
  maximumBytes: number,
): value is string | null {
  return value === null || isBoundedString(value, maximumBytes);
}

function isNullableDate(value: unknown) {
  return value === null || (typeof value === "string" && datePattern.test(value));
}

function parseExactRequest(value: unknown): LocalFixtureIngestionRequest {
  if (!isPlainRecord(value) || !hasExactKeys(value, requestKeys)) {
    reject("INVALID_REQUEST");
  }
  if (value.mode !== "local_fixture") {
    reject("UNSUPPORTED_MODE");
  }
  if (
    !isBoundedString(value.providerKey, 64) ||
    !providerPattern.test(value.providerKey) ||
    !isBoundedString(value.sampleRef, 256) ||
    !isBoundedString(value.createdBy, 64) ||
    !actorPattern.test(value.createdBy)
  ) {
    reject("INVALID_REQUEST");
  }
  return Object.freeze({
    mode: value.mode,
    providerKey: value.providerKey,
    sampleRef: value.sampleRef,
    createdBy: value.createdBy,
  });
}

function validateFixtureShape(
  fixture: Record<string, unknown>,
): asserts fixture is OfficialDocumentSample & Record<string, unknown> {
  if (!hasExactKeys(fixture, fixtureKeys)) {
    reject("INVALID_FIXTURE");
  }
  if (!isPlainRecord(fixture.provision)) {
    reject("INVALID_FIXTURE");
  }
  const provision = fixture.provision;
  if (!hasExactKeys(provision, provisionKeys)) {
    reject("INVALID_FIXTURE");
  }

  let serialized: string;
  try {
    serialized = JSON.stringify(fixture);
  } catch {
    reject("INVALID_FIXTURE");
  }
  if (encoder.encode(serialized).length > maxFixtureBytes) {
    reject("FIXTURE_TOO_LARGE");
  }

  if (
    !isBoundedString(fixture.providerKey, 64) ||
    !providerPattern.test(fixture.providerKey) ||
    !isBoundedString(fixture.upstreamId, 128) ||
    !isBoundedString(fixture.canonicalUrl, 2_048) ||
    !isBoundedString(fixture.metadataUrl, 2_048) ||
    !isBoundedString(fixture.fetchedAt, 32) ||
    !instantPattern.test(fixture.fetchedAt) ||
    !isBoundedString(fixture.contentChecksum, 64) ||
    !checksumPattern.test(fixture.contentChecksum) ||
    !isBoundedString(fixture.documentNumber, 256) ||
    !isBoundedString(fixture.title, 1_024) ||
    !isNullableDate(fixture.issuedAt) ||
    !isNullableDate(fixture.effectiveFrom) ||
    !isBoundedString(provision.sourceAnchor, 512) ||
    !isNullableBoundedString(provision.article, 64) ||
    !isNullableBoundedString(provision.clause, 64) ||
    !isNullableBoundedString(provision.point, 64) ||
    !isBoundedString(provision.originalText, 48 * 1024) ||
    !isBoundedString(provision.simplifiedText, 12 * 1024)
  ) {
    reject("INVALID_FIXTURE");
  }
}

function encodeLengthPrefixed(parts: readonly string[]) {
  const encoded = parts.map((part) => encoder.encode(part));
  const totalLength = encoded.reduce((total, part) => total + 4 + part.length, 0);
  const output = new Uint8Array(totalLength);
  const view = new DataView(output.buffer);
  let offset = 0;
  for (const part of encoded) {
    view.setUint32(offset, part.length, false);
    offset += 4;
    output.set(part, offset);
    offset += part.length;
  }
  return output;
}

function canonicalNullable(value: string | null) {
  return value === null ? "null" : `string:${value}`;
}

function canonicalFixtureParts(
  providerKey: string,
  sampleRef: string,
  fixture: OfficialDocumentSample,
) {
  return [
    "schemaVersion",
    localIngestionSchemaVersion,
    "providerKey",
    providerKey,
    "sampleRef",
    sampleRef,
    "fixture.providerKey",
    fixture.providerKey,
    "fixture.upstreamId",
    fixture.upstreamId,
    "fixture.canonicalUrl",
    fixture.canonicalUrl,
    "fixture.metadataUrl",
    fixture.metadataUrl,
    "fixture.fetchedAt",
    fixture.fetchedAt,
    "fixture.contentChecksum",
    fixture.contentChecksum,
    "fixture.documentNumber",
    fixture.documentNumber,
    "fixture.title",
    fixture.title,
    "fixture.issuedAt",
    canonicalNullable(fixture.issuedAt),
    "fixture.effectiveFrom",
    canonicalNullable(fixture.effectiveFrom),
    "fixture.provision.sourceAnchor",
    fixture.provision.sourceAnchor,
    "fixture.provision.article",
    canonicalNullable(fixture.provision.article),
    "fixture.provision.clause",
    canonicalNullable(fixture.provision.clause),
    "fixture.provision.point",
    canonicalNullable(fixture.provision.point),
    "fixture.provision.originalText",
    fixture.provision.originalText,
    "fixture.provision.simplifiedText",
    fixture.provision.simplifiedText,
  ] as const;
}

async function idempotencyKey(
  providerKey: string,
  sampleRef: string,
  fixture: OfficialDocumentSample,
) {
  // Capture all plan-defining fixture fields before the first await.
  const payload = encodeLengthPrefixed(
    canonicalFixtureParts(providerKey, sampleRef, fixture),
  );
  const digest = await crypto.subtle.digest(
    "SHA-256",
    payload,
  );
  const hex = Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
  return `local-fixture-sha256-v2:${hex}`;
}

function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) {
    return value;
  }
  for (const child of Object.values(value as Record<string, unknown>)) {
    deepFreeze(child);
  }
  return Object.freeze(value);
}

function snapshotTrustedFixture(value: unknown): OfficialDocumentSample {
  if (!isPlainRecord(value)) {
    reject("INVALID_FIXTURE");
  }
  validateFixtureShape(value);

  // Copy every primitive and nested field synchronously. The snapshot shares
  // no mutable object with the imported JSON module.
  return deepFreeze({
    providerKey: value.providerKey,
    upstreamId: value.upstreamId,
    canonicalUrl: value.canonicalUrl,
    metadataUrl: value.metadataUrl,
    fetchedAt: value.fetchedAt,
    contentChecksum: value.contentChecksum,
    documentNumber: value.documentNumber,
    title: value.title,
    issuedAt: value.issuedAt,
    effectiveFrom: value.effectiveFrom,
    provision: {
      sourceAnchor: value.provision.sourceAnchor,
      article: value.provision.article,
      clause: value.provision.clause,
      point: value.provision.point,
      originalText: value.provision.originalText,
      simplifiedText: value.provision.simplifiedText,
    },
  });
}

function loadTrustedFixture(providerKey: string, sampleRef: string) {
  const entry = trustedFixtureManifest.find(
    (candidate) =>
      candidate.providerKey === providerKey &&
      candidate.sampleRef === sampleRef,
  );
  if (!entry) {
    reject("FIXTURE_REJECTED");
  }
  return snapshotTrustedFixture(entry.fixture);
}

export const localIngestionInternalsForTesting = Object.freeze({
  idempotencyKey,
});

async function buildLocalIngestionPlan(
  input: unknown,
): Promise<LocalIngestionPlan> {
  const request = parseExactRequest(input);

  const registry = sourceRegistry.find(
    ({ providerKey }) => providerKey === request.providerKey,
  );
  if (
    !registry ||
    registry.trustClass !== "official" ||
    registry.readiness !== "yellow" ||
    registry.decision !== "conditional_go" ||
    registry.sampleRef === null
  ) {
    reject("SOURCE_NOT_ELIGIBLE");
  }
  if (request.sampleRef !== registry.sampleRef) {
    reject("SAMPLE_REF_MISMATCH");
  }
  const registrySnapshot = Object.freeze({
    providerKey: registry.providerKey,
    sampleRef: registry.sampleRef,
    trustClass: "official" as const,
    readiness: "yellow" as const,
    decision: "conditional_go" as const,
  });
  const fixture = loadTrustedFixture(
    registrySnapshot.providerKey,
    registrySnapshot.sampleRef,
  );
  if (fixture.providerKey !== registrySnapshot.providerKey) {
    reject("INVALID_FIXTURE");
  }

  // Public input and committed fixture data are immutable snapshots now. No
  // caller-owned object survives across the first await.
  let draft: DraftSourceMapping;
  try {
    draft = await mapOfficialSampleToDraft(
      fixture,
      registry,
      request.createdBy,
    );
  } catch {
    reject("FIXTURE_REJECTED");
  }
  if (
    draft.legalSource.status !== "draft" ||
    draft.legalProvision.status !== "draft" ||
    draft.legalSource.verifiedBy !== null ||
    draft.legalProvision.reviewedBy !== null
  ) {
    reject("FIXTURE_REJECTED");
  }

  const key = await idempotencyKey(
    registrySnapshot.providerKey,
    registrySnapshot.sampleRef,
    fixture,
  );
  return deepFreeze({
    schemaVersion: localIngestionSchemaVersion,
    mode: "local_fixture",
    policyVersion: localIngestionSchemaVersion,
    idempotency: {
      algorithm: "SHA-256",
      encoding: "canonical-fixture-length-prefixed-utf8-v2",
      key,
    },
    registry: registrySnapshot,
    candidateStatus: "draft",
    persistence: "none",
    rawSnapshotRef: null,
    draft,
  });
}

export async function createLocalIngestionPlan(
  input: unknown,
): Promise<LocalIngestionPlan> {
  try {
    return await buildLocalIngestionPlan(input);
  } catch (error) {
    if (error instanceof LocalIngestionError) {
      throw error;
    }
    reject("INVALID_REQUEST");
  }
}
