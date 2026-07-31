import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { register } from "tsx/esm/api";

const unregisterTsx = register();
const {
  CATALOG_RESOLVER_POLICY_VERSION,
  SUPPRESSION_SNAPSHOT_SCHEMA_VERSION,
  createPublicCatalogHttpResponse,
  createPublicCatalogResponse,
  createReviewedSuppressionSnapshot,
  isContentKey,
  resolveCatalog,
} = await import("../lib/catalog-resolver.ts");

test.after(async () => {
  await unregisterTsx();
});

const fixture = JSON.parse(
  await readFile(
    new URL("../fixtures/catalog/static-catalog.v1.json", import.meta.url),
    "utf8",
  ),
);
const staticCatalogVersion = fixture.staticCatalogVersion;
const requiredSuppressionSnapshotVersion = "reviewed-suppressions-v1";
const asOf = "2026-07-31T12:00:00Z";

function clone(value) {
  return structuredClone(value);
}

function managedLaw(overrides = {}) {
  return {
    entityType: "law",
    contentKey: "law:helmet-road-safety",
    topic: "Giao thông",
    displayOrder: 20,
    eligibility: "eligible",
    status: "published",
    icon: "◉",
    title: "Managed: Đội mũ bảo hiểm",
    legalBasis: "Căn cứ managed đã duyệt",
    penalty: "Mức xử lý managed",
    remedy: "Đội mũ đúng quy cách.",
    caseStudy: "Tình huống managed.",
    tags: ["managed"],
    ...overrides,
  };
}

function managedShowcase(overrides = {}) {
  return {
    entityType: "showcase",
    contentKey: "showcase:managed-only",
    topic: "Sở hữu trí tuệ",
    displayOrder: 5,
    eligibility: "eligible",
    status: "published",
    title: "Managed-only showcase",
    summary: "Nội dung managed-only hợp lệ.",
    sourceUrl: "https://vbpl.vn/nguon-managed",
    ...overrides,
  };
}

function reviewedSuppression(contentKey, overrides = {}) {
  return {
    contentKey,
    entityType: contentKey.startsWith("law:") ? "law" : "showcase",
    revisionId: "suppression-revision-1",
    reason: "Nội dung đã được retire qua review.",
    createdBy: "editor-1",
    reviewedBy: "reviewer-2",
    reviewedAt: "2026-07-31T10:00:00Z",
    decision: "approved",
    resolverPolicyVersion: CATALOG_RESOLVER_POLICY_VERSION,
    staticCatalogVersion,
    ...overrides,
  };
}

async function fallbackSnapshot(suppressions = [], overrides = {}) {
  return createReviewedSuppressionSnapshot({
    schemaVersion: SUPPRESSION_SNAPSHOT_SCHEMA_VERSION,
    snapshotVersion: requiredSuppressionSnapshotVersion,
    resolverPolicyVersion: CATALOG_RESOLVER_POLICY_VERSION,
    staticCatalogVersion,
    createdBy: "snapshot-editor",
    reviewedBy: "snapshot-reviewer",
    reviewedAt: "2026-07-31T10:30:00Z",
    expiresAt: "2026-08-31T00:00:00Z",
    suppressions,
    ...overrides,
  });
}

function input(dependency, overrides = {}) {
  return {
    staticCatalogVersion,
    requiredSuppressionSnapshotVersion,
    asOf,
    staticRecords: clone(fixture.records),
    dependency,
    ...overrides,
  };
}

test("contentKey validation enforces entity prefix, ASCII slug and length", () => {
  assert.equal(isContentKey("law:helmet-road-safety", "law"), true);
  assert.equal(isContentKey("showcase:sharing-warning", "showcase"), true);
  for (const key of [
    "law:Helmet",
    "law:đi-xe",
    "law:two--hyphens",
    "law:trailing-",
    "showcase:wrong",
    `law:${"a".repeat(93)}`,
  ]) {
    assert.equal(isContentKey(key, "law"), false, key);
  }
});

test("available_empty is a ready static overlay, not a degraded or empty fallback", async () => {
  const result = await resolveCatalog(
    input({
      state: "available_empty",
      records: [],
      suppressions: [],
    }),
  );

  assert.equal(result.outcome, "resolved");
  assert.equal(result.dataState, "ready");
  assert.deepEqual(
    result.laws.map((item) => item.contentKey),
    ["law:helmet-road-safety", "law:social-information"],
  );
  assert.deepEqual(
    result.showcases.map((item) => item.contentKey),
    ["showcase:sharing-warning"],
  );
  assert.equal(
    [...result.laws, ...result.showcases].some((item) =>
      item.contentKey.includes("blocked-static") ||
      item.contentKey.includes("stale-warning"),
    ),
    false,
  );
});

test("available_records supports managed override and managed-only content", async () => {
  const result = await resolveCatalog(
    input({
      state: "available_records",
      records: [managedShowcase(), managedLaw()],
      suppressions: [],
    }),
  );

  assert.equal(result.outcome, "resolved");
  assert.equal(result.dataState, "ready");
  assert.equal(
    result.laws.find(
      (item) => item.contentKey === "law:helmet-road-safety",
    )?.title,
    "Managed: Đội mũ bảo hiểm",
  );
  assert.ok(
    result.showcases.some(
      (item) => item.contentKey === "showcase:managed-only",
    ),
  );
});

test("draft and pending review never hide or override static content", async () => {
  for (const status of ["draft", "pending_review"]) {
    const result = await resolveCatalog(
      input({
        state: "available_records",
        records: [managedLaw({ status, title: `Không render ${status}` })],
        suppressions: [],
      }),
    );
    assert.equal(
      result.laws.find(
        (item) => item.contentKey === "law:helmet-road-safety",
      )?.title,
      "Đội mũ bảo hiểm",
    );
  }
});

test("blocked, stale or invalidated draft/pending records require tombstones and stay hidden", async () => {
  for (const status of ["draft", "pending_review"]) {
    for (const eligibility of ["blocked", "stale", "invalidated"]) {
      const record = managedLaw({ status, eligibility });
      const missingTombstone = await resolveCatalog(
        input({
          state: "available_records",
          records: [record],
          suppressions: [],
        }),
      );
      assert.equal(missingTombstone.outcome, "failed_closed");
      assert.equal(
        missingTombstone.issues[0].code,
        "MISSING_SUPPRESSION_TOMBSTONE",
      );

      const suppressed = await resolveCatalog(
        input({
          state: "available_records",
          records: [record],
          suppressions: [
            reviewedSuppression("law:helmet-road-safety"),
          ],
        }),
      );
      assert.equal(suppressed.outcome, "resolved");
      assert.equal(
        suppressed.laws.some(
          (item) => item.contentKey === "law:helmet-road-safety",
        ),
        false,
      );
    }
  }
});

test("archived or invalidated managed content requires a matching tombstone to prevent outage resurrection", async () => {
  const suppressed = await resolveCatalog(
    input({
      state: "available_records",
      records: [managedLaw()],
      suppressions: [
        reviewedSuppression("law:helmet-road-safety"),
      ],
    }),
  );
  assert.equal(
    suppressed.laws.some(
      (item) => item.contentKey === "law:helmet-road-safety",
    ),
    false,
  );

  for (const record of [
    managedLaw({ status: "archived" }),
    managedLaw({ eligibility: "invalidated" }),
  ]) {
    const missingTombstone = await resolveCatalog(
      input({
        state: "available_records",
        records: [record],
        suppressions: [],
      }),
    );
    assert.equal(missingTombstone.outcome, "failed_closed");
    assert.equal(
      missingTombstone.issues[0].code,
      "MISSING_SUPPRESSION_TOMBSTONE",
    );

    const result = await resolveCatalog(
      input({
        state: "available_records",
        records: [record],
        suppressions: [
          reviewedSuppression("law:helmet-road-safety"),
        ],
      }),
    );
    assert.equal(result.outcome, "resolved");
    assert.equal(
      result.laws.some(
        (item) => item.contentKey === "law:helmet-road-safety",
      ),
      false,
    );
  }
});

test("invalid or same-actor-label suppressions fail closed with a stable reason", async () => {
  const result = await resolveCatalog(
    input({
      state: "available_empty",
      records: [],
      suppressions: [
        reviewedSuppression("law:helmet-road-safety", {
          reviewedBy: "editor-1",
        }),
      ],
    }),
  );

  assert.equal(result.outcome, "failed_closed");
  assert.deepEqual(result.laws, []);
  assert.deepEqual(result.showcases, []);
  assert.deepEqual(result.issues, [
    {
      code: "INVALID_SUPPRESSION",
      contentKey: "law:helmet-road-safety",
    },
  ]);
});

test("duplicate static or managed keys fail closed instead of choosing first or newest", async () => {
  const duplicateStatic = clone(fixture.records);
  duplicateStatic.push({
    ...clone(fixture.records[0]),
    title: "Duplicate static",
  });
  const staticResult = await resolveCatalog(
    input(
      { state: "available_empty", records: [], suppressions: [] },
      { staticRecords: duplicateStatic },
    ),
  );
  assert.equal(staticResult.outcome, "failed_closed");
  assert.equal(staticResult.issues[0].code, "DUPLICATE_STATIC_KEY");

  const managedResult = await resolveCatalog(
    input({
      state: "available_records",
      records: [
        managedLaw({ title: "Older", updatedAt: "2025-01-01" }),
        managedLaw({ title: "Newer", updatedAt: "2026-01-01" }),
      ],
      suppressions: [],
    }),
  );
  assert.equal(managedResult.outcome, "failed_closed");
  assert.equal(managedResult.issues[0].code, "DUPLICATE_MANAGED_KEY");
  assert.deepEqual(managedResult.laws, []);
});

test("invalid managed key fails closed and valid managed-only key is not an orphan", async () => {
  const invalid = await resolveCatalog(
    input({
      state: "available_records",
      records: [
        managedShowcase({
          contentKey: "law:wrong-entity",
        }),
      ],
      suppressions: [],
    }),
  );
  assert.equal(invalid.outcome, "failed_closed");
  assert.equal(invalid.issues[0].code, "INVALID_MANAGED_RECORD");

  const managedOnly = await resolveCatalog(
    input({
      state: "available_records",
      records: [managedShowcase()],
      suppressions: [],
    }),
  );
  assert.equal(managedOnly.outcome, "resolved");
  assert.equal(managedOnly.issues.length, 0);
});

test("backfill mapping reports true orphan and collision without rejecting managed-only records", async () => {
  const records = [managedLaw(), managedShowcase()];
  const orphan = await resolveCatalog(
    input(
      {
        state: "available_records",
        records,
        suppressions: [],
      },
      {
        backfillMappings: [
          {
            entityType: "law",
            legacyContentKey: "law:social-information",
            targetContentKey: "law:missing-target",
          },
        ],
      },
    ),
  );
  assert.equal(orphan.outcome, "failed_closed");
  assert.equal(orphan.issues[0].code, "BACKFILL_ORPHAN");

  const collision = await resolveCatalog(
    input(
      {
        state: "available_records",
        records,
        suppressions: [],
      },
      {
        backfillMappings: [
          {
            entityType: "law",
            legacyContentKey: "law:helmet-road-safety",
            targetContentKey: "law:helmet-road-safety",
          },
          {
            entityType: "law",
            legacyContentKey: "law:helmet-road-safety",
            targetContentKey: "law:helmet-road-safety",
          },
        ],
      },
    ),
  );
  assert.equal(collision.outcome, "failed_closed");
  assert.equal(
    collision.issues.some((item) => item.code === "BACKFILL_COLLISION"),
    true,
  );

  const manyLegacyToOneTarget = await resolveCatalog(
    input(
      {
        state: "available_records",
        records,
        suppressions: [],
      },
      {
        backfillMappings: [
          {
            entityType: "law",
            legacyContentKey: "law:helmet-road-safety",
            targetContentKey: "law:helmet-road-safety",
          },
          {
            entityType: "law",
            legacyContentKey: "law:social-information",
            targetContentKey: "law:helmet-road-safety",
          },
        ],
      },
    ),
  );
  assert.equal(manyLegacyToOneTarget.outcome, "failed_closed");
  assert.equal(
    manyLegacyToOneTarget.issues.some(
      (item) => item.code === "BACKFILL_COLLISION",
    ),
    true,
  );
});

test("unavailable uses an integrity-checked distinct-actor-label snapshot without resurrecting static records", async () => {
  const snapshot = await fallbackSnapshot([
    reviewedSuppression("law:helmet-road-safety"),
  ]);
  const result = await resolveCatalog(
    input(
      { state: "unavailable", reason: "query_failed" },
      { fallbackSuppressionSnapshot: snapshot },
    ),
  );

  assert.equal(result.outcome, "resolved");
  assert.equal(result.dataState, "degraded");
  assert.deepEqual(
    result.laws.map((item) => item.contentKey),
    ["law:social-information"],
  );
  assert.deepEqual(
    result.showcases.map((item) => item.contentKey),
    ["showcase:sharing-warning"],
  );
});

test("missing, stale, version, catalog or hash-mismatched fallback snapshot returns empty degraded", async () => {
  const valid = await fallbackSnapshot();
  const candidates = [
    null,
    { ...clone(valid), expiresAt: "2026-07-01T00:00:00Z" },
    { ...clone(valid), expiresAt: asOf },
    { ...clone(valid), snapshotVersion: "wrong-version" },
    { ...clone(valid), staticCatalogVersion: "wrong-catalog" },
    { ...clone(valid), payloadSha256: "0".repeat(64) },
    { ...clone(valid), reviewedBy: valid.createdBy },
  ];

  for (const fallbackSuppressionSnapshot of candidates) {
    const result = await resolveCatalog(
      input(
        { state: "unavailable", reason: "query_failed" },
        { fallbackSuppressionSnapshot },
      ),
    );
    assert.equal(result.dataState, "degraded");
    assert.equal(result.outcome, "failed_closed");
    assert.deepEqual(result.laws, []);
    assert.deepEqual(result.showcases, []);
    assert.equal(
      result.issues[0].code,
      "INVALID_FALLBACK_SNAPSHOT",
    );
  }
});

test("ordering is deterministic by topic, displayOrder and contentKey, never updatedAt or input order", async () => {
  const records = [
    managedShowcase({
      contentKey: "showcase:z-last-key",
      topic: "Giao thông",
      displayOrder: 2,
      updatedAt: "2099-01-01",
    }),
    managedShowcase({
      contentKey: "showcase:a-first-key",
      topic: "Giao thông",
      displayOrder: 2,
      updatedAt: "2000-01-01",
    }),
    managedShowcase({
      contentKey: "showcase:social",
      topic: "Mạng xã hội",
      displayOrder: 0,
    }),
  ];
  const left = await resolveCatalog(
    input({
      state: "available_records",
      records,
      suppressions: [],
    }),
  );
  const right = await resolveCatalog(
    input({
      state: "available_records",
      records: [...records].reverse(),
      suppressions: [],
    }),
  );

  assert.deepEqual(left.showcases, right.showcases);
  assert.deepEqual(
    left.showcases
      .filter((item) => item.contentKey.includes("first-key") ||
        item.contentKey.includes("last-key"))
      .map((item) => item.contentKey),
    ["showcase:a-first-key", "showcase:z-last-key"],
  );
});

test("resolver snapshots input, does not mutate caller data and freezes output", async () => {
  const records = [managedLaw()];
  const staticRecords = clone(fixture.records);
  const originalRecords = clone(records);
  const originalStatic = clone(staticRecords);
  const resolution = resolveCatalog(
    input(
      {
        state: "available_records",
        records,
        suppressions: [],
      },
      { staticRecords },
    ),
  );
  records[0].title = "Mutation after invocation";
  staticRecords.reverse();
  const result = await resolution;

  assert.equal(
    result.laws.find(
      (item) => item.contentKey === "law:helmet-road-safety",
    )?.title,
    originalRecords[0].title,
  );
  assert.deepEqual(clone(fixture.records), originalStatic);
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.laws), true);
  assert.equal(Object.isFrozen(result.laws[0]), true);
});

test("unavailable state cannot be mutated across the async hash boundary", async () => {
  const dependency = { state: "unavailable", reason: "query_failed" };
  const resolution = resolveCatalog(
    input(dependency, {
      fallbackSuppressionSnapshot: await fallbackSnapshot(),
    }),
  );
  dependency.state = "available_empty";
  dependency.records = [];
  dependency.suppressions = [];
  const result = await resolution;

  assert.equal(result.dataState, "degraded");
  assert.equal(result.outcome, "resolved");
});

test("resolver snapshots asOf, versions and fallback fields before the hash boundary", async () => {
  const fallbackSuppressionSnapshot = clone(
    await fallbackSnapshot([
      reviewedSuppression("law:helmet-road-safety"),
    ]),
  );
  const resolverInput = input(
    { state: "unavailable", reason: "query_failed" },
    { fallbackSuppressionSnapshot },
  );
  const resolution = resolveCatalog(resolverInput);

  resolverInput.asOf = "2026-09-30T00:00:00Z";
  resolverInput.staticCatalogVersion = "mutated-catalog-version";
  resolverInput.requiredSuppressionSnapshotVersion =
    "mutated-snapshot-version";
  fallbackSuppressionSnapshot.expiresAt = "2026-07-01T00:00:00Z";
  fallbackSuppressionSnapshot.snapshotVersion = "mutated-fallback";
  fallbackSuppressionSnapshot.payloadSha256 = "0".repeat(64);

  const result = await resolution;
  assert.equal(result.outcome, "resolved");
  assert.equal(result.dataState, "degraded");
  assert.equal(
    result.laws.some(
      (item) => item.contentKey === "law:helmet-road-safety",
    ),
    false,
  );
});

test("degraded response factory is exact HTTP 200/no-store and never leaks dependency reason or issues", async () => {
  const result = await resolveCatalog(
    input(
      { state: "unavailable", reason: "schema_unavailable" },
      { fallbackSuppressionSnapshot: await fallbackSnapshot() },
    ),
  );
  const dto = createPublicCatalogResponse(result);
  const response = createPublicCatalogHttpResponse(
    result,
    "11111111-1111-4111-8111-111111111111",
  );
  const body = await response.json();

  assert.deepEqual(Object.keys(dto), [
    "dataState",
    "resolverPolicyVersion",
    "laws",
    "showcases",
  ]);
  assert.deepEqual(body, dto);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(
    response.headers.get("x-request-id"),
    "11111111-1111-4111-8111-111111111111",
  );
  assert.equal("issues" in body, false);
  assert.equal(JSON.stringify(body).includes("schema_unavailable"), false);
});

test("failed-closed duplicate managed data is always public degraded and no-store", async () => {
  const result = await resolveCatalog(
    input({
      state: "available_records",
      records: [managedLaw(), managedLaw()],
      suppressions: [],
    }),
  );
  assert.equal(result.outcome, "failed_closed");
  assert.equal(result.dataState, "ready");

  const dto = createPublicCatalogResponse(result);
  const response = createPublicCatalogHttpResponse(
    result,
    "22222222-2222-4222-8222-222222222222",
  );
  const body = await response.json();

  assert.equal(dto.dataState, "degraded");
  assert.equal(body.dataState, "degraded");
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal("issues" in body, false);
  assert.equal(JSON.stringify(body).includes("DUPLICATE_MANAGED_KEY"), false);
});

test("invalid discriminated dependency snapshots fail closed", async () => {
  for (const dependency of [
    { state: "unknown_state" },
    { state: "available_records", records: [], suppressions: [] },
    {
      state: "available_empty",
      records: [managedLaw()],
      suppressions: [],
    },
    { state: "unavailable", reason: "raw-database-error" },
  ]) {
    const result = await resolveCatalog(input(dependency));
    assert.equal(result.outcome, "failed_closed");
    assert.deepEqual(result.laws, []);
    assert.deepEqual(result.showcases, []);
  }
});

test("malformed records and mappings return stable failed_closed instead of throwing", async () => {
  const cases = [
    input(
      { state: "available_empty", records: [], suppressions: [] },
      { staticRecords: [null] },
    ),
    input({
      state: "available_records",
      records: [null],
      suppressions: [],
    }),
    input(
      {
        state: "available_records",
        records: [managedLaw()],
        suppressions: [],
      },
      { backfillMappings: [null] },
    ),
  ];
  for (const value of cases) {
    const result = await resolveCatalog(value);
    assert.equal(result.outcome, "failed_closed");
    assert.deepEqual(result.laws, []);
    assert.deepEqual(result.showcases, []);
  }
});
