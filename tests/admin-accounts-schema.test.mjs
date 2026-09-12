import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

test("pg-schema defines adminAccounts and systemAuditLogs tables", () => {
  const schemaCode = readFileSync("db/pg-schema.ts", "utf8");
  assert.equal(schemaCode.includes("export const adminAccounts = pgTable("), true);
  assert.equal(schemaCode.includes("export const systemAuditLogs = pgTable("), true);
  assert.equal(schemaCode.includes("allowedTopics"), true);
  assert.equal(schemaCode.includes("actorRole"), true);
});

test("pg-bootstrap includes tables creation and bumped version", () => {
  const bootstrapCode = readFileSync("db/pg-bootstrap.ts", "utf8");
  assert.equal(bootstrapCode.includes("createAdminAccountsTable"), true);
  assert.equal(bootstrapCode.includes("createSystemAuditLogsTable"), true);
  assert.equal(bootstrapCode.includes("2026-09-13-rbac-and-audit-v1"), true);
});
