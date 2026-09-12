import test from "node:test";
import assert from "node:assert/strict";
import {
  getCanonicalDomain,
  resolveCanonicalSiteUrl,
  buildCanonicalPermalink,
  buildSituationPermalink,
  buildDocumentPermalink,
  checkDomainHealth,
} from "../lib/canonical-url.ts";

test("getCanonicalDomain chuan hoa domain va bo dau gach cheo cuoi", () => {
  assert.equal(getCanonicalDomain("https://luathocduong.edu.vn/"), "https://luathocduong.edu.vn");
  assert.equal(getCanonicalDomain("http://luathocduong.edu.vn"), "http://luathocduong.edu.vn");
  assert.equal(getCanonicalDomain("   https://luathocduong.edu.vn   "), "https://luathocduong.edu.vn");
  assert.equal(getCanonicalDomain("not-a-valid-url"), "");
  assert.equal(getCanonicalDomain(""), "");
  assert.equal(getCanonicalDomain(undefined), "");
});

test("resolveCanonicalSiteUrl uu tien ten mien cau hinh roi moi den fallback origin", () => {
  const configured = "https://luathocduong.edu.vn";
  const previewOrigin = "https://tuyentruyen-preview-123.vercel.app";

  // Khi co domain cau hinh, luon lay domain cau hinh de QR code khong bi het han
  assert.equal(resolveCanonicalSiteUrl(configured, previewOrigin), "https://luathocduong.edu.vn");
  // Khi khong co domain cau hinh, fallback ve preview origin
  assert.equal(resolveCanonicalSiteUrl("", previewOrigin), "https://tuyentruyen-preview-123.vercel.app");
  // Khi ca 2 deu khong hop le thi tra ve rong
  assert.equal(resolveCanonicalSiteUrl("", ""), "");
});

test("buildCanonicalPermalink tao duong dan vinh vien chuan", () => {
  const base = "https://luathocduong.edu.vn";
  assert.equal(buildCanonicalPermalink("/tro-giup-phap-ly", base), "https://luathocduong.edu.vn/tro-giup-phap-ly");
  assert.equal(buildCanonicalPermalink("van-ban", base), "https://luathocduong.edu.vn/van-ban");
});

test("buildSituationPermalink tao permalink tinh huong chuan hoa", () => {
  const link = buildSituationPermalink("Giao thông", 1, "https://luathocduong.edu.vn");
  assert.ok(link.includes("id=1") || link.includes("#tinh-huong-1"));
  assert.ok(link.startsWith("https://luathocduong.edu.vn"));
});

test("buildDocumentPermalink tao permalink van ban chuan hoa", () => {
  const link = buildDocumentPermalink(12, "https://luathocduong.edu.vn");
  assert.equal(link, "https://luathocduong.edu.vn/van-ban/12");
});

test("checkDomainHealth bao cao chua cau hinh neu truyen rong", async () => {
  const result = await checkDomainHealth("");
  assert.equal(result.isConfigured, false);
  assert.equal(result.reachable, false);
});
