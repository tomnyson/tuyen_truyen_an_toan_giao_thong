import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { registerHooks } from "node:module";
import test from "node:test";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/")) {
      return {
        shortCircuit: true,
        url: new URL(
          specifier.endsWith(".json")
            ? `../${specifier.slice(2)}`
            : `../${specifier.slice(2)}.ts`,
          import.meta.url,
        ).href,
      };
    }
    if (
      specifier.startsWith(".") &&
      !specifier.match(/\.[a-z]+$/i) &&
      context.parentURL?.endsWith(".ts")
    ) {
      return nextResolve(`${specifier}.ts`, context);
    }
    return nextResolve(specifier, context);
  },
});

const {
  createLocalIngestionPlan,
  localIngestionInternalsForTesting,
  LocalIngestionError,
  localIngestionSchemaVersion,
} = await import("../lib/ingestion-local.ts");

const sample = JSON.parse(
  await readFile(
    new URL(
      "../fixtures/source-registry/vbpl-nd168.sample.json",
      import.meta.url,
    ),
    "utf8",
  ),
);
const canary =
  "CANARY-secret=sk-test-private url=https://user:pass@127.0.0.1/private?token=hidden";
const sampleRef = "fixtures/source-registry/vbpl-nd168.sample.json";

function request(overrides = {}) {
  return {
    mode: "local_fixture",
    providerKey: "vbpl_national",
    sampleRef,
    createdBy: "editor-local-spike",
    ...overrides,
  };
}

async function expectCode(promise, code) {
  await assert.rejects(promise, (error) => {
    assert.ok(error instanceof LocalIngestionError);
    assert.equal(error.code, code);
    assert.equal(error.message, "Local ingestion request rejected.");
    assert.deepEqual(JSON.parse(JSON.stringify(error)), {
      code,
      message: "Local ingestion request rejected.",
    });
    assert.doesNotMatch(
      `${error}\n${JSON.stringify(error)}`,
      /CANARY|sk-test|user:pass|token=hidden/,
    );
    return true;
  });
}

test("loads the committed fixture and creates only a deeply frozen draft plan", async () => {
  const input = request();
  const before = structuredClone(input);
  let fetchCalls = 0;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    fetchCalls += 1;
    throw new Error("network must not be called");
  };

  try {
    const plan = await createLocalIngestionPlan(input);
    assert.equal(fetchCalls, 0);
    assert.deepEqual(input, before);
    assert.equal(plan.schemaVersion, localIngestionSchemaVersion);
    assert.equal(plan.mode, "local_fixture");
    assert.equal(plan.policyVersion, localIngestionSchemaVersion);
    assert.equal(
      plan.idempotency.encoding,
      "canonical-fixture-length-prefixed-utf8-v2",
    );
    assert.deepEqual(plan.registry, {
      providerKey: "vbpl_national",
      sampleRef,
      trustClass: "official",
      readiness: "yellow",
      decision: "conditional_go",
    });
    assert.equal(plan.candidateStatus, "draft");
    assert.equal(plan.persistence, "none");
    assert.equal(plan.rawSnapshotRef, null);
    assert.equal(plan.draft.legalSource.status, "draft");
    assert.equal(plan.draft.legalSource.verifiedBy, null);
    assert.equal(plan.draft.legalProvision.status, "draft");
    assert.equal(plan.draft.legalProvision.reviewedBy, null);
    assert.equal(plan.draft.provenance.contentChecksum, sample.contentChecksum);
    assert.ok(Object.isFrozen(plan));
    assert.ok(Object.isFrozen(plan.registry));
    assert.ok(Object.isFrozen(plan.idempotency));
    assert.ok(Object.isFrozen(plan.draft));
    assert.ok(Object.isFrozen(plan.draft.legalSource));
    assert.ok(Object.isFrozen(plan.draft.legalProvision));
    assert.ok(Object.isFrozen(plan.draft.provenance));
    assert.throws(() => {
      plan.draft.legalSource.status = "published";
    }, TypeError);
    assert.equal(plan.draft.legalSource.status, "draft");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("snapshots the exact public request before the first await", async () => {
  const input = request();
  const pending = createLocalIngestionPlan(input);
  input.providerKey = "government_gazette_rss";
  input.sampleRef = "fixtures/forged.json";
  input.createdBy = "mutated-after-call";

  const plan = await pending;
  assert.equal(plan.registry.providerKey, "vbpl_national");
  assert.equal(plan.registry.sampleRef, sampleRef);
  assert.equal(plan.draft.legalSource.createdBy, "editor-local-spike");
  assert.equal(plan.draft.legalProvision.createdBy, "editor-local-spike");
});

test("derives deterministic identity from every canonical fixture field", async () => {
  const first = await createLocalIngestionPlan(request());
  const second = await createLocalIngestionPlan(
    request({ createdBy: "different-local-editor" }),
  );
  const expected = await localIngestionInternalsForTesting.idempotencyKey(
    "vbpl_national",
    sampleRef,
    sample,
  );

  assert.equal(first.idempotency.key, second.idempotency.key);
  assert.equal(first.idempotency.key, expected);
  assert.match(first.idempotency.key, /^local-fixture-sha256-v2:[a-f0-9]{64}$/);

  const metadataMutations = [
    (fixture) => {
      fixture.providerKey = "other_provider";
    },
    (fixture) => {
      fixture.upstreamId = "173921";
    },
    (fixture) => {
      fixture.canonicalUrl += "&version=2";
    },
    (fixture) => {
      fixture.metadataUrl += "&version=2";
    },
    (fixture) => {
      fixture.fetchedAt = "2026-07-31T00:00:01.000Z";
    },
    (fixture) => {
      fixture.contentChecksum = "a".repeat(64);
    },
    (fixture) => {
      fixture.documentNumber = "168/2024/NĐ-CP-revision";
    },
    (fixture) => {
      fixture.title += " (bản metadata khác)";
    },
    (fixture) => {
      fixture.issuedAt = null;
    },
    (fixture) => {
      fixture.effectiveFrom = null;
    },
    (fixture) => {
      fixture.provision.sourceAnchor = "Điều 53 khoản 1 bản khác";
    },
    (fixture) => {
      fixture.provision.article = "54";
    },
    (fixture) => {
      fixture.provision.clause = null;
    },
    (fixture) => {
      fixture.provision.point = "a";
    },
    (fixture) => {
      fixture.provision.simplifiedText += " Metadata diễn giải khác.";
    },
  ];

  for (const mutate of metadataMutations) {
    const changed = structuredClone(sample);
    mutate(changed);
    assert.equal(changed.provision.originalText, sample.provision.originalText);
    assert.notEqual(
      await localIngestionInternalsForTesting.idempotencyKey(
        "vbpl_national",
        sampleRef,
        changed,
      ),
      expected,
    );
  }
});

test("captures fixture identity bytes before its hashing await", async () => {
  const mutable = structuredClone(sample);
  const pending = localIngestionInternalsForTesting.idempotencyKey(
    "vbpl_national",
    sampleRef,
    mutable,
  );
  mutable.title = "mutated after hashing started";

  assert.equal(
    await pending,
    await localIngestionInternalsForTesting.idempotencyKey(
      "vbpl_national",
      sampleRef,
      sample,
    ),
  );
});

test("rejects caller fixture plus policy, secret, registry and URL overrides", async () => {
  for (const extra of [
    { fixture: structuredClone(sample) },
    { allowedHosts: ["evil.example"] },
    { baseUrl: "https://evil.example/" },
    { credential: canary },
    { registryRecord: { providerKey: "vbpl_national", readiness: "green" } },
    { quota: 1 },
  ]) {
    await expectCode(
      createLocalIngestionPlan({ ...request(), ...extra }),
      "INVALID_REQUEST",
    );
  }
});

test("rejects production mode, ineligible providers and sampleRef mismatch", async () => {
  await expectCode(
    createLocalIngestionPlan(request({ mode: "production" })),
    "UNSUPPORTED_MODE",
  );
  await expectCode(
    createLocalIngestionPlan(
      request({
        providerKey: "government_gazette_rss",
        sampleRef: "fixtures/forged.json",
      }),
    ),
    "SOURCE_NOT_ELIGIBLE",
  );
  await expectCode(
    createLocalIngestionPlan(
      request({ sampleRef: "fixtures/source-registry/other.json" }),
    ),
    "SAMPLE_REF_MISMATCH",
  );
});

test("rejects malformed public requests with stable redacted errors", async () => {
  for (const malformed of [
    null,
    [],
    {},
    request({ createdBy: "" }),
    request({ providerKey: "VBPL_NATIONAL" }),
  ]) {
    await expectCode(createLocalIngestionPlan(malformed), "INVALID_REQUEST");
  }
});
