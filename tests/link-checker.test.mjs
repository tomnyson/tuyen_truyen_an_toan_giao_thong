import test from "node:test";
import assert from "node:assert/strict";
import { register } from "tsx/esm/api";

const unregisterTsx = register();

const { isSafeUrlToCheck, checkSingleLink, batchCheckLinks } = await import(
  "../lib/link-checker.ts"
);
const { extractSystemLinks, computeLinkSummary } = await import(
  "../lib/link-health.ts"
);

test.after(async () => {
  await unregisterTsx();
});

test("isSafeUrlToCheck chan cac dia chi IP noi bo (SSRF guard)", () => {
  // Cac dia chi cam truy cap
  assert.equal(isSafeUrlToCheck("http://localhost:3000").safe, false);
  assert.equal(isSafeUrlToCheck("http://127.0.0.1:8080").safe, false);
  assert.equal(isSafeUrlToCheck("http://10.0.0.1/admin").safe, false);
  assert.equal(isSafeUrlToCheck("http://192.168.1.1").safe, false);
  assert.equal(isSafeUrlToCheck("http://172.16.0.5").safe, false);
  assert.equal(isSafeUrlToCheck("http://169.254.169.254/latest/meta-data/").safe, false);
  assert.equal(isSafeUrlToCheck("ftp://example.com").safe, false);
  assert.equal(isSafeUrlToCheck("javascript:alert(1)").safe, false);

  // Cac dia chi hop le
  assert.equal(isSafeUrlToCheck("https://vbpl.vn").safe, true);
  assert.equal(isSafeUrlToCheck("https://chinhphu.vn").safe, true);
  assert.equal(isSafeUrlToCheck("https://youtube.com/watch?v=123").safe, true);
});

test("checkSingleLink phan loai blocked_ssrf cho dia chi cam", async () => {
  const result = await checkSingleLink("http://127.0.0.1:9999");
  assert.equal(result.status, "blocked_ssrf");
  assert.ok(result.error);
});

test("batchCheckLinks gioi han concurrency va xu ly dung danh sach", async () => {
  const items = [
    { id: "1", url: "https://vbpl.vn" },
    { id: "2", url: "http://127.0.0.1:80" },
  ];
  const results = await batchCheckLinks(items, 2);
  assert.equal(results.length, 2);
  const item2 = results.find((r) => r.id === "2");
  assert.ok(item2);
  assert.equal(item2.checkResult.status, "blocked_ssrf");
});

test("extractSystemLinks gom duoc cac lien ket tu du lieu nen static", async () => {
  const links = await extractSystemLinks(null);
  assert.ok(links.length > 0);
  const helmetLink = links.find((l) => l.url.includes("vbpl.vn"));
  assert.ok(helmetLink, "Phai tim thay link vbpl tu citation mu bao hiem");
  assert.equal(helmetLink.sourceType, "static_baseline");
});

test("computeLinkSummary tinh toan chinh xac cac trang thai", () => {
  const mockLinks = [
    { id: "1", url: "https://a.vn", sourceType: "static_baseline", sourceId: 1, sourceTitle: "A", field: "url", lastStatus: "ok" },
    { id: "2", url: "https://b.vn", sourceType: "static_baseline", sourceId: 2, sourceTitle: "B", field: "url", lastStatus: "redirect" },
    { id: "3", url: "https://c.vn", sourceType: "static_baseline", sourceId: 3, sourceTitle: "C", field: "url", lastStatus: "broken" },
    { id: "4", url: "https://d.vn", sourceType: "static_baseline", sourceId: 4, sourceTitle: "D", field: "url", lastStatus: "timeout" },
    { id: "5", url: "https://e.vn", sourceType: "static_baseline", sourceId: 5, sourceTitle: "E", field: "url", lastStatus: "unchecked" },
  ];
  const summary = computeLinkSummary(mockLinks, "2026-09-12T10:00:00Z");
  assert.equal(summary.total, 5);
  assert.equal(summary.ok, 1);
  assert.equal(summary.redirect, 1);
  assert.equal(summary.broken, 1);
  assert.equal(summary.timeout, 1);
  assert.equal(summary.unchecked, 1);
  assert.equal(summary.lastScannedAt, "2026-09-12T10:00:00Z");
});
