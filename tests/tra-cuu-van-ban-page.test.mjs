import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

test("TraCuuVanBanPage exists as dedicated page with metadata and LegalDocumentLookup", () => {
  const code = readFileSync("app/tra-cuu-van-ban/page.tsx", "utf8");
  assert.equal(code.includes("export default function TraCuuVanBanPage"), true);
  assert.equal(code.includes("export const metadata"), true);
  assert.equal(code.includes("LegalDocumentLookup"), true);
  assert.equal(code.includes('href="/"'), true);
  assert.equal(code.includes("Kho văn bản tra cứu & học tập"), true);
});

test("Homepage links to dedicated /tra-cuu-van-ban page in nav, source section and footer", () => {
  const homeCode = readFileSync("app/page.tsx", "utf8");
  assert.equal(homeCode.includes('href="/tra-cuu-van-ban"'), true);
  // Có ít nhất 3 liên kết dẫn tới trang tra cứu văn bản (nav, section #nguon, footer)
  const count = homeCode.split('href="/tra-cuu-van-ban"').length - 1;
  assert.ok(count >= 3, `Phải có ít nhất 3 liên kết đến /tra-cuu-van-ban (hiện có ${count})`);
});

test("Homepage line count remains strictly below 990 lines limit", () => {
  const homeCode = readFileSync("app/page.tsx", "utf8");
  const lineCount = homeCode.split("\n").length;
  assert.ok(lineCount < 990, `app/page.tsx line count ${lineCount} exceeds 990`);
});
