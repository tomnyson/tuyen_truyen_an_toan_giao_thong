import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

test("LegalDocumentManager component exports valid component with required features", () => {
  const code = readFileSync("app/admin/LegalDocumentManager.tsx", "utf8");
  assert.equal(code.includes("export function LegalDocumentManager"), true);
  assert.equal(code.includes("/admin/api/legal-documents"), true);
  assert.equal(code.includes("/admin/api/legal-documents/check-link"), true);
  assert.equal(code.includes("check_all"), true);
  assert.equal(code.includes("seed_default"), true);
  assert.equal(code.includes("200 OK"), true);
  assert.equal(code.includes("Lỗi / 404"), true);
  assert.equal(code.includes("Kiểm tra toàn bộ link"), true);
  assert.equal(code.includes("Kiểm tra link ngay"), true);
  assert.equal(code.includes("officialUrl"), true);
});

test("AdminDashboard integrates LegalDocumentManager under 'documents' tab", () => {
  const code = readFileSync("app/admin/AdminDashboard.tsx", "utf8");
  assert.equal(code.includes("LegalDocumentManager"), true);
  assert.equal(code.includes("Kho văn bản pháp luật"), true);
  assert.equal(code.includes('tab === "documents"'), true);
});
