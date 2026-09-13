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
  assert.ok(content.includes("h-[740px]"));
});

test("tro-giup-phap-ly main page links to soan-don page", () => {
  const content = fs.readFileSync("app/tro-giup-phap-ly/page.tsx", "utf8");
  assert.ok(content.includes("/tro-giup-phap-ly/soan-don"));
});

test("soan-don page enforces Stitch light/warm-cream theme without dark mode background overrides", () => {
  const pageContent = fs.readFileSync("app/tro-giup-phap-ly/soan-don/page.tsx", "utf8");
  const docContent = fs.readFileSync("components/ComplaintDocumentPreview.tsx", "utf8");
  const modalContent = fs.readFileSync("components/SubmissionGuidanceModal.tsx", "utf8");
  const scannerContent = fs.readFileSync("components/CccdQrScanner.tsx", "utf8");
  assert.ok(!pageContent.includes("dark:bg-stone-900"));
  assert.ok(!pageContent.includes("dark:bg-stone-950"));
  assert.ok(!docContent.includes("dark:bg-stone-900"));
  assert.ok(!docContent.includes("dark:bg-stone-950"));
  assert.ok(!modalContent.includes("dark:bg-stone-900"));
  assert.ok(!modalContent.includes("dark:bg-stone-800"));
  assert.ok(!scannerContent.includes("dark:bg-stone-900"));
});
