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

const { PGlite } = await import("@electric-sql/pglite");
const { drizzle } = await import("drizzle-orm/pglite");
const { bootstrapLegalDatabase, setTestDb } = await import("../db/index.ts");
const { createAdminSession, adminCookieName } = await import("../lib/admin-auth.ts");
const { POST: postAccount } = await import("../app/admin/api/accounts/route.ts");
const { POST: postContent } = await import("../app/admin/api/content/route.ts");
const { GET: getAuditLogs } = await import("../app/admin/api/audit-logs/route.ts");

test("RBAC and System Audit Logs E2E flow", async () => {
  const client = new PGlite();
  const db = drizzle(client);
  await bootstrapLegalDatabase(db);
  setTestDb(db);

  // 1. Admin login session
  const adminSession = await createAdminSession("admin");
  const adminHeaders = {
    cookie: `${adminCookieName}=${adminSession.token}`,
    "content-type": "application/json",
    origin: "http://localhost:3000",
  };

  // 2. Admin tạo tài khoản biên tập viên chỉ cấp quyền cho 2 chuyên mục: "Giao thông" và "Mạng xã hội"
  const editorUsername = `editor_e2e_${Date.now()}`;
  const createAccountReq = new Request("http://localhost:3000/admin/api/accounts", {
    method: "POST",
    headers: adminHeaders,
    body: JSON.stringify({
      username: editorUsername,
      fullName: "Biên tập viên E2E",
      password: "EditorPassword2026@",
      role: "editor",
      allowedTopics: ["Giao thông", "Mạng xã hội"],
    }),
  });
  const createAccountRes = await postAccount(createAccountReq);
  assert.equal(createAccountRes.status, 201);
  const { account } = await createAccountRes.json();
  assert.equal(account.username, editorUsername);
  assert.deepEqual(account.allowedTopics, ["Giao thông", "Mạng xã hội"]);

  // 3. Biên tập viên đăng nhập
  const editorSession = await createAdminSession(editorUsername);
  const editorHeaders = {
    cookie: `${adminCookieName}=${editorSession.token}`,
    "content-type": "application/json",
    origin: "http://localhost:3000",
  };

  // 4. Biên tập viên tạo bài học luật chuyên mục "Giao thông" -> Thành công 201
  const allowedLawReq = new Request("http://localhost:3000/admin/api/content", {
    method: "POST",
    headers: editorHeaders,
    body: JSON.stringify({
      entity: "law",
      topic: "Giao thông",
      icon: "🚗",
      title: "Quy định tốc độ xe gắn máy",
      legalBasis: "Luật Trật tự an toàn giao thông đường bộ 2024",
      penalty: "Phạt tiền từ 200.000 đến 400.000 đồng",
      remedy: "Tuân thủ tốc độ tối đa theo quy định",
      caseStudy: "Học sinh điều khiển xe gắn máy chạy quá tốc độ",
      tags: "toc-do,giao-thong",
      status: "draft",
    }),
  });
  const allowedLawRes = await postContent(allowedLawReq);
  assert.equal(allowedLawRes.status, 201);
  const createdLawData = await allowedLawRes.json();
  assert.ok(createdLawData.item.id);

  // 5. Biên tập viên tạo bài học luật chuyên mục "Bạo lực học đường" (không được cấp quyền) -> Bị chặn 403
  const forbiddenLawReq = new Request("http://localhost:3000/admin/api/content", {
    method: "POST",
    headers: editorHeaders,
    body: JSON.stringify({
      entity: "law",
      topic: "Bạo lực học đường",
      icon: "⚠️",
      title: "Quy định về hành vi bạo lực học đường",
      legalBasis: "Nghị định 80/2017/NĐ-CP",
      penalty: "Kỷ luật theo nội quy và xử phạt hành chính",
      remedy: "Thực hiện cam kết không tái phạm",
      caseStudy: "Học sinh tham gia xô xát",
      tags: "bao-luc",
      status: "draft",
    }),
  });
  const forbiddenLawRes = await postContent(forbiddenLawReq);
  assert.equal(forbiddenLawRes.status, 403);
  const forbiddenData = await forbiddenLawRes.json();
  assert.match(forbiddenData.error, /không có quyền/);

  // 6. Admin kiểm tra Audit Logs -> Phải có đầy đủ log CREATE_ACCOUNT và CREATE_LAW
  const auditReq = new Request("http://localhost:3000/admin/api/audit-logs?limit=50", {
    method: "GET",
    headers: adminHeaders,
  });
  const auditRes = await getAuditLogs(auditReq);
  assert.equal(auditRes.status, 200);
  const { logs } = await auditRes.json();
  assert.ok(logs.some((l) => l.action === "CREATE_ACCOUNT" && l.targetId === editorUsername));
  assert.ok(logs.some((l) => l.action === "CREATE_LAW" && l.actor === editorUsername));
});
