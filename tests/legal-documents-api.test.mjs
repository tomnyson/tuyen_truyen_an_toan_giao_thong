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
const { bootstrapLegalDatabase } = await import("../db/index.ts");
const { seedDefaultLegalDocuments } = await import(
  "../lib/legal-document-store.ts"
);
const { createAdminSession, adminCookieName } = await import("../lib/admin-auth.ts");

const client = new PGlite();
const db = drizzle(client);
await bootstrapLegalDatabase(db);
await seedDefaultLegalDocuments(db);

// Inject db vào runtime
const { GET: publicGet } = await import("../app/api/legal-documents/route.ts");
const {
  GET: adminGet,
  POST: adminPost,
  PUT: adminPut,
  DELETE: adminDelete,
} = await import("../app/admin/api/legal-documents/route.ts");
const { POST: adminCheckLinkPost } = await import(
  "../app/admin/api/legal-documents/check-link/route.ts"
);

test("Public GET /api/legal-documents returns 200 with documents array", async () => {
  const req = new Request("http://localhost:3000/api/legal-documents?topic=Giao%20thông");
  const res = await publicGet(req, { db });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(Array.isArray(data.documents));
  assert.ok(data.documents.length >= 1);
});

test("Admin endpoints require authentication", async () => {
  const req = new Request("http://localhost:3000/admin/api/legal-documents");
  const res = await adminGet(req, { db });
  assert.equal(res.status, 401);

  const postReq = new Request("http://localhost:3000/admin/api/legal-documents", {
    method: "POST",
    body: JSON.stringify({ title: "Test" }),
  });
  const postRes = await adminPost(postReq, { db });
  assert.equal(postRes.status, 401);
});

test("Admin GET and POST with valid session", async () => {
  const session = await createAdminSession("admin");
  assert.ok(session);
  const cookie = `${adminCookieName}=${session.token}`;

  const getReq = new Request("http://localhost:3000/admin/api/legal-documents", {
    headers: { cookie },
  });
  const getRes = await adminGet(getReq, { db });
  assert.equal(getRes.status, 200);
  const data = await getRes.json();
  assert.ok(Array.isArray(data.documents));

  // Admin POST create
  const postReq = new Request("http://localhost:3000/admin/api/legal-documents", {
    method: "POST",
    headers: {
      cookie,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title: "Luật Giao thông thử nghiệm",
      documentNumber: "99/2026/QH15",
      documentType: "luat",
      topic: "Giao thông",
      issuingAuthority: "Quốc hội",
      officialUrl: "https://vanban.chinhphu.vn/?pageid=27160&docid=210543",
      summary: "Tài liệu kiểm thử",
    }),
  });
  const postRes = await adminPost(postReq, { db });
  assert.equal(postRes.status, 201);
  const created = await postRes.json();
  assert.equal(created.document.documentNumber, "99/2026/QH15");

  // Admin PUT update
  const putReq = new Request("http://localhost:3000/admin/api/legal-documents", {
    method: "PUT",
    headers: {
      cookie,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      id: created.document.id,
      summary: "Tóm tắt đã cập nhật",
    }),
  });
  const putRes = await adminPut(putReq, { db });
  assert.equal(putRes.status, 200);

  // Admin Check-Link single
  const checkReq = new Request("http://localhost:3000/admin/api/legal-documents/check-link", {
    method: "POST",
    headers: {
      cookie,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      documentId: created.document.id,
    }),
  });
  const checkRes = await adminCheckLinkPost(checkReq, { db });
  assert.equal(checkRes.status, 200);
  const checkData = await checkRes.json();
  assert.ok(checkData.document);
  assert.ok(checkData.result);

  // Admin DELETE
  const deleteReq = new Request(
    `http://localhost:3000/admin/api/legal-documents?id=${created.document.id}`,
    {
      method: "DELETE",
      headers: { cookie },
    }
  );
  const deleteRes = await adminDelete(deleteReq, { db });
  assert.equal(deleteRes.status, 200);
});
