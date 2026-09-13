import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";

globalThis.__workerEnvStub ??= {
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

const { GET: getPublicTopics } = await import("../app/api/topics/route.ts");
const {
  GET: getAdminTopics,
  POST: postAdminTopics,
  PUT: putAdminTopics,
  DELETE: deleteAdminTopics,
} = await import("../app/admin/api/topics/route.ts");
const { createAdminSession, adminCookieName } = await import("../lib/admin-auth.ts");

test("Public GET /api/topics returns 200 with topics array", async () => {
  const req = new Request("http://localhost/api/topics");
  const res = await getPublicTopics(req);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(Array.isArray(data.topics), true);
  assert.equal(data.topics.length >= 5, true);
});

test("Admin endpoints require authentication", async () => {
  const unauthReq = new Request("http://localhost/admin/api/topics");
  const getRes = await getAdminTopics(unauthReq);
  assert.equal(getRes.status, 401);

  const postRes = await postAdminTopics(unauthReq);
  assert.equal(postRes.status, 401);

  const putRes = await putAdminTopics(unauthReq);
  assert.equal(putRes.status, 401);

  const delRes = await deleteAdminTopics(unauthReq);
  assert.equal(delRes.status, 401);
});

test("Admin GET returns topics with valid session", async () => {
  const session = await createAdminSession("admin");
  assert.ok(session);
  const req = new Request("http://localhost/admin/api/topics", {
    headers: {
      cookie: `${adminCookieName}=${session.token}`,
    },
  });
  const res = await getAdminTopics(req);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(Array.isArray(data.topics), true);
});

test("Admin POST validates payload", async () => {
  const session = await createAdminSession("admin");
  assert.ok(session);
  const req = new Request("http://localhost/admin/api/topics", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      cookie: `${adminCookieName}=${session.token}`,
    },
    body: JSON.stringify({}),
  });
  const res = await postAdminTopics(req);
  // Thiếu DB hoặc thiếu name trả về 400
  assert.equal(res.status, 400);
});

test("Admin PUT validates topic id", async () => {
  const session = await createAdminSession("admin");
  assert.ok(session);
  const req = new Request("http://localhost/admin/api/topics", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      cookie: `${adminCookieName}=${session.token}`,
    },
    body: JSON.stringify({ name: "Không có ID" }),
  });
  const res = await putAdminTopics(req);
  assert.equal(res.status, 400);
});

test("Admin DELETE validates topic id", async () => {
  const session = await createAdminSession("admin");
  assert.ok(session);
  const req = new Request("http://localhost/admin/api/topics", {
    method: "DELETE",
    headers: {
      cookie: `${adminCookieName}=${session.token}`,
    },
  });
  const res = await deleteAdminTopics(req);
  assert.equal(res.status, 400);
});

