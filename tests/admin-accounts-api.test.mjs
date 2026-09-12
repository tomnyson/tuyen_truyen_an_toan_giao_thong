import assert from "node:assert/strict";
import test from "node:test";
import { registerHooks } from "node:module";

process.env.ADMIN_SESSION_SECRET = "test-admin-session-secret-at-least-32-characters-long";
process.env.ADMIN_USERNAME = "admin";
process.env.ADMIN_PASSWORD = "test-password-1234";

globalThis.__workerEnvStub = {
  ADMIN_SESSION_SECRET: "test-admin-session-secret-at-least-32-characters-long",
  ADMIN_USERNAME: "admin",
  ADMIN_PASSWORD: "test-password-1234",
};

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

const { createAdminSession, adminCookieName } = await import("../lib/admin-auth.ts");
const { createAdminAccount } = await import("../lib/account-store.ts");
const { GET: getAccounts, POST: postAccount, PUT: putAccount, DELETE: deleteAccount } =
  await import("../app/admin/api/accounts/route.ts");
const { GET: getAuditLogs } = await import("../app/admin/api/audit-logs/route.ts");

test("Accounts API requires authentication and admin role", async () => {
  // 1. Unauthenticated
  const unauthReq = new Request("http://localhost:3000/admin/api/accounts", {
    method: "GET",
  });
  const unauthRes = await getAccounts(unauthReq);
  assert.equal(unauthRes.status, 401);

  // 2. Editor role (unauthorized for account management)
  const editor = await createAdminAccount({
    username: `editor_${Date.now()}`,
    fullName: "Biên tập viên",
    password: "Password123@",
    role: "editor",
    allowedTopics: ["Giao thông"],
  });
  const editorSession = await createAdminSession(editor.username);
  const editorReq = new Request("http://localhost:3000/admin/api/accounts", {
    method: "GET",
    headers: {
      cookie: `${adminCookieName}=${editorSession.token}`,
    },
  });
  const editorRes = await getAccounts(editorReq);
  assert.equal(editorRes.status, 403);
});

test("Accounts and Audit Logs API full CRUD for admin", async () => {
  const adminSession = await createAdminSession("admin");
  const headers = {
    cookie: `${adminCookieName}=${adminSession.token}`,
    "content-type": "application/json",
  };

  // 1. GET accounts
  const listReq = new Request("http://localhost:3000/admin/api/accounts", {
    method: "GET",
    headers,
  });
  const listRes = await getAccounts(listReq);
  assert.equal(listRes.status, 200);
  const accountsData = await listRes.json();
  assert.ok(Array.isArray(accountsData.accounts));

  // 2. POST create account
  const newUsername = `user_${Date.now()}`;
  const createReq = new Request("http://localhost:3000/admin/api/accounts", {
    method: "POST",
    headers,
    body: JSON.stringify({
      username: newUsername,
      fullName: "Nguyễn Văn A",
      password: "PasswordSafe2026@",
      role: "editor",
      allowedTopics: ["Giao thông", "An ninh trật tự"],
    }),
  });
  const createRes = await postAccount(createReq);
  assert.equal(createRes.status, 201);
  const created = await createRes.json();
  assert.equal(created.account.username, newUsername);
  assert.deepEqual(created.account.allowedTopics, ["Giao thông", "An ninh trật tự"]);

  // 3. PUT update account
  const updateReq = new Request("http://localhost:3000/admin/api/accounts", {
    method: "PUT",
    headers,
    body: JSON.stringify({
      id: created.account.id,
      fullName: "Nguyễn Văn A (Cập nhật)",
      allowedTopics: ["*"],
    }),
  });
  const updateRes = await putAccount(updateReq);
  assert.equal(updateRes.status, 200);
  const updated = await updateRes.json();
  assert.equal(updated.account.fullName, "Nguyễn Văn A (Cập nhật)");
  assert.deepEqual(updated.account.allowedTopics, ["*"]);

  // 4. GET audit logs contains CREATE and UPDATE events
  const auditReq = new Request("http://localhost:3000/admin/api/audit-logs?limit=20", {
    method: "GET",
    headers,
  });
  const auditRes = await getAuditLogs(auditReq);
  assert.equal(auditRes.status, 200);
  const auditData = await auditRes.json();
  assert.ok(auditData.logs.length >= 2);
  assert.ok(auditData.logs.some((l) => l.action === "CREATE_ACCOUNT"));
  assert.ok(auditData.logs.some((l) => l.action === "UPDATE_ACCOUNT"));

  // 5. DELETE account
  const deleteReq = new Request("http://localhost:3000/admin/api/accounts", {
    method: "DELETE",
    headers,
    body: JSON.stringify({ id: created.account.id }),
  });
  const deleteRes = await deleteAccount(deleteReq);
  assert.equal(deleteRes.status, 200);
  const deleted = await deleteRes.json();
  assert.equal(deleted.ok, true);
});
