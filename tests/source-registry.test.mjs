import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  mapOfficialSampleToDraft,
  sourceRegistry,
  validateSourceRegistryRecord,
} from "../lib/source-registry.ts";

const sample = JSON.parse(
  await readFile(
    new URL(
      "../fixtures/source-registry/vbpl-nd168.sample.json",
      import.meta.url,
    ),
    "utf8",
  ),
);

test("registry records contain the required contract and no secret value", () => {
  assert.ok(sourceRegistry.length >= 3);

  for (const record of sourceRegistry) {
    assert.deepEqual(validateSourceRegistryRecord(record), []);
    assert.notEqual(record.authType, "api_key");
    assert.doesNotMatch(JSON.stringify(record), /\b(?:sk-|secret|bearer\s)[a-z0-9]/i);
  }
});

test("known sources remain non-green until terms and independent review exist", () => {
  for (const record of sourceRegistry) {
    assert.notEqual(record.readiness, "green");
  }
});

test("static registry rejects green even when caller supplies plausible actor IDs", () => {
  const record = {
    ...sourceRegistry[0],
    termsUrl: "https://vbpl.vn/terms-reviewed",
    licenseNote: "Reviewed terms permit the approved ingestion scope",
    decision: "go",
    readiness: "green",
    reviewedBy: "content-reviewer",
    reviewedAt: "2026-07-31T00:00:00.000Z",
  };

  assert.match(
    validateSourceRegistryRecord(record).join("\n"),
    /authenticated durable approval workflow/,
  );
});

test("official sample maps only to source/provision drafts with provenance", async () => {
  const registryRecord = sourceRegistry.find(
    ({ providerKey }) => providerKey === sample.providerKey,
  );
  assert.ok(registryRecord);

  const mapped = await mapOfficialSampleToDraft(
    sample,
    registryRecord,
    "editor-source-spike",
  );

  assert.equal(mapped.legalSource.status, "draft");
  assert.equal(mapped.legalSource.officialHost, "vbpl.vn");
  assert.equal(mapped.legalSource.lastVerifiedAt, null);
  assert.equal(mapped.legalSource.verifiedBy, null);
  assert.equal(mapped.legalProvision.status, "draft");
  assert.equal(mapped.legalProvision.reviewedBy, null);
  assert.equal(mapped.legalProvision.reviewedAt, null);
  assert.equal(mapped.provenance.upstreamId, "173920");
  assert.equal(mapped.provenance.sourceAnchor, "Điều 53 khoản 1");
  assert.match(mapped.provenance.contentChecksum, /^[a-f0-9]{64}$/);
});

test("sample mapping rejects an unregistered host", async () => {
  await assert.rejects(
    () =>
      mapOfficialSampleToDraft(
        { ...sample, canonicalUrl: "https://example.org/not-official" },
        sourceRegistry[0],
        "editor-source-spike",
      ),
    /allowlist/,
  );
});

test("sample mapping rejects a forged or discovery-only registry record", async () => {
  await assert.rejects(
    () =>
      mapOfficialSampleToDraft(
        sample,
        { ...sourceRegistry[0] },
        "editor-source-spike",
      ),
    /canonical static registry/,
  );
  await assert.rejects(
    () =>
      mapOfficialSampleToDraft(
        { ...sample, providerKey: "government_gazette_rss" },
        sourceRegistry[2],
        "editor-source-spike",
      ),
    /not approved/,
  );
});

test("registry rejects unsafe URLs and export hosts outside its allowlist", () => {
  assert.match(
    validateSourceRegistryRecord({
      ...sourceRegistry[0],
      baseUrl: "https://user@vbpl.vn/",
    }).join("\n"),
    /safe HTTPS/,
  );
  assert.match(
    validateSourceRegistryRecord({
      ...sourceRegistry[0],
      exportEndpoint: "https://vanban.chinhphu.vn/export",
    }).join("\n"),
    /explicitly allowed/,
  );
});

test("sample mapping rejects legal text that no longer matches its checksum", async () => {
  await assert.rejects(
    () =>
      mapOfficialSampleToDraft(
        {
          ...sample,
          provision: {
            ...sample.provision,
            originalText: "tampered legal text",
          },
        },
        sourceRegistry[0],
        "editor-source-spike",
      ),
    /checksum/,
  );
});
