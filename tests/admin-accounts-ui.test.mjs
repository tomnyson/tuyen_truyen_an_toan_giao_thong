import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

test("AccountManager and AuditLogManager components exist and export valid components", () => {
  const accountCode = readFileSync("app/admin/AccountManager.tsx", "utf8");
  assert.equal(accountCode.includes("export function AccountManager"), true);
  assert.equal(accountCode.includes("Phân quyền chuyên mục"), true);
  assert.equal(accountCode.includes("allowedTopics"), true);

  const auditCode = readFileSync("app/admin/AuditLogManager.tsx", "utf8");
  assert.equal(auditCode.includes("export function AuditLogManager"), true);
  assert.equal(auditCode.includes("Lịch sử hệ thống"), true);
});

test("AdminDashboard integrates AccountManager and AuditLogManager tabs", () => {
  const dashCode = readFileSync("app/admin/AdminDashboard.tsx", "utf8");
  assert.equal(dashCode.includes("AccountManager"), true);
  assert.equal(dashCode.includes("AuditLogManager"), true);
  assert.equal(dashCode.includes('tab === "accounts"'), true);
  assert.equal(dashCode.includes('tab === "audit_logs"'), true);
});
