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

test("AccountManager binds onChange to checkbox and avoids double-invocation bug", () => {
  const accountCode = readFileSync("app/admin/AccountManager.tsx", "utf8");

  // Checkbox must use onChange, not noop with label onClick
  assert.equal(accountCode.includes('onChange={() => handleToggleTopic(topic)}'), true);
  assert.equal(accountCode.includes('onClick={() => handleToggleTopic(topic)}'), false);

  // Must not have pointer-events-none on the checkbox input
  assert.equal(accountCode.includes('pointer-events-none'), false);

  // Must have cursor-pointer on input for interactive feedback
  assert.equal(accountCode.includes('cursor-pointer'), true);
});

test("Topic toggle logic handles wildcard expansion and selection normalization", () => {
  const topics = [
    "Giao thông",
    "Mạng xã hội",
    "Bạo lực học đường",
    "An ninh trật tự",
    "Sở hữu trí tuệ",
    "Chuyên đề phòng chống ma túy",
    "Chuyên đề an ninh trật tự trường học",
    "Chuyên đề game và không gian mạng",
    "Tài chính - tín dụng đen",
    "Phòng chống tệ nạn xã hội",
  ];

  // Pure logic replica from AccountManager
  const toggleTopic = (currentAllowed, topic) => {
    const list = currentAllowed.includes("*") ? [...topics] : currentAllowed;
    const has = list.includes(topic);
    if (has) {
      return list.filter((t) => t !== topic);
    }
    const next = [...list, topic];
    if (topics.every((t) => next.includes(t))) {
      return ["*"];
    }
    return next;
  };

  // 1. Unchecking 1 topic from "*" produces remaining 9
  const withoutGt = toggleTopic(["*"], "Giao thông");
  assert.equal(withoutGt.length, 9);
  assert.equal(withoutGt.includes("Giao thông"), false);
  assert.equal(withoutGt.includes("Mạng xã hội"), true);

  // 2. Checking back "Giao thông" normalizes back to ["*"]
  const backToAll = toggleTopic(withoutGt, "Giao thông");
  assert.deepEqual(backToAll, ["*"]);

  // 3. Adding topic to single-item list
  const twoTopics = toggleTopic(["Giao thông"], "Mạng xã hội");
  assert.deepEqual(twoTopics, ["Giao thông", "Mạng xã hội"]);

  // 4. Removing topic from list
  const oneTopic = toggleTopic(twoTopics, "Giao thông");
  assert.deepEqual(oneTopic, ["Mạng xã hội"]);
});
