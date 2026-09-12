import assert from "node:assert/strict";
import test from "node:test";
import { registerHooks } from "node:module";

globalThis.__workerEnvStub ??= {};
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "cloudflare:workers") {
      return {
        shortCircuit: true,
        url: "data:text/javascript,globalThis.__workerEnvStub ??= {}; export const env = globalThis.__workerEnvStub;",
      };
    }
    if (specifier === "@/db") {
      return {
        shortCircuit: true,
        url: new URL("../db/index.ts", import.meta.url).href,
      };
    }
    if (specifier.startsWith("@/")) {
      const suffix = specifier.endsWith(".json") ? "" : ".ts";
      return {
        shortCircuit: true,
        url: new URL(`../${specifier.slice(2)}${suffix}`, import.meta.url).href,
      };
    }
    if (
      specifier.startsWith(".") &&
      !/\.[a-z]+$/i.test(specifier) &&
      context.parentURL?.endsWith(".ts")
    ) {
      return nextResolve(`${specifier}.ts`, context);
    }
    return nextResolve(specifier, context);
  },
});

const {
  canAccessTopic,
  listAdminAccounts,
  createAdminAccount,
  updateAdminAccount,
  deleteAdminAccount,
} = await import("../lib/account-store.ts");
const {
  recordAuditEvent,
  queryAuditLogs,
} = await import("../lib/audit-log-store.ts");

test("canAccessTopic allows admin everything and editors only allowed topics", () => {
  const admin = { role: "admin", allowedTopics: [] };
  assert.equal(canAccessTopic(admin, "Giao thông"), true);
  assert.equal(canAccessTopic(admin, "Bất kỳ chủ đề nào"), true);

  const editor = { role: "editor", allowedTopics: ["Giao thông", "Mạng xã hội"] };
  assert.equal(canAccessTopic(editor, "Giao thông"), true);
  assert.equal(canAccessTopic(editor, "Mạng xã hội"), true);
  assert.equal(canAccessTopic(editor, "Bạo lực học đường"), false);

  const superEditor = { role: "editor", allowedTopics: ["*"] };
  assert.equal(canAccessTopic(superEditor, "Bạo lực học đường"), true);
});

test("account-store provides CRUD operations", async () => {
  const newAccount = await createAdminAccount({
    username: `test_editor_${Date.now()}`,
    fullName: "Biên tập viên thử nghiệm",
    password: "Password123@",
    role: "editor",
    allowedTopics: ["Giao thông"],
    status: "active",
  });
  assert.ok(newAccount.id);
  assert.equal(newAccount.role, "editor");
  assert.deepEqual(newAccount.allowedTopics, ["Giao thông"]);

  const updated = await updateAdminAccount(newAccount.id, {
    fullName: "Tên đã cập nhật",
    allowedTopics: ["Giao thông", "Mạng xã hội"],
  });
  assert.equal(updated.fullName, "Tên đã cập nhật");
  assert.equal(updated.allowedTopics.length, 2);

  const deleted = await deleteAdminAccount(newAccount.id);
  assert.equal(deleted, true);
});

test("audit-log-store records and queries audit events", async () => {
  await recordAuditEvent({
    actor: "admin_test",
    actorRole: "admin",
    action: "TEST_ACTION",
    targetType: "topic",
    targetId: "Giao thông",
    details: "Thao tác kiểm thử ghi log",
  });

  const results = await queryAuditLogs({ action: "TEST_ACTION", limit: 10 });
  assert.ok(results.logs.length >= 1);
  const found = results.logs.find((l) => l.action === "TEST_ACTION");
  assert.ok(found);
  assert.equal(found.actor, "admin_test");
});
