import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("soan-don page integrates SiteHeader, SiteFooter, 2-column layout, and security banner", () => {
  const content = fs.readFileSync("app/tro-giup-phap-ly/soan-don/page.tsx", "utf8");
  assert.ok(content.includes("SiteHeader"));
  assert.ok(content.includes("SiteFooter"));
  assert.ok(content.includes("ComplaintDocumentPreview"));
  assert.ok(content.includes("CccdQrScanner"));
  assert.ok(content.includes("SubmissionGuidanceModal"));
  assert.ok(content.includes("Cam kết bảo mật"));
});

test("tro-giup-phap-ly main page links to soan-don page", () => {
  const content = fs.readFileSync("app/tro-giup-phap-ly/page.tsx", "utf8");
  assert.ok(content.includes("/tro-giup-phap-ly/soan-don"));
});
