import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";

// Chỉ đặt ADMIN_USERNAME + ADMIN_PASSWORD — không hash, không session secret.
const workerEnv = (globalThis.__workerEnvStub ??= {});
Object.assign(workerEnv, {
  ADMIN_USERNAME: "tabletkindfire@gmail.com",
  ADMIN_PASSWORD: "Admin123@2026",
});

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
  createAdminSession,
  validateAdminCredentials,
  verifyAdminSession,
} = await import("../lib/admin-auth.ts");

test("dang nhap bang ADMIN_PASSWORD thuan, khong can hash va secret", async () => {
  assert.equal(
    await validateAdminCredentials("tabletkindfire@gmail.com", "Admin123@2026"),
    true,
  );
});

test("sai mat khau hoac sai username thi tu choi", async () => {
  assert.equal(
    await validateAdminCredentials("tabletkindfire@gmail.com", "sai-mat-khau"),
    false,
  );
  assert.equal(
    await validateAdminCredentials("ai-do-khac", "Admin123@2026"),
    false,
  );
});

test("phien ky bang secret tu sinh van tao va xac minh duoc", async () => {
  const session = await createAdminSession("tabletkindfire@gmail.com");
  assert.ok(session.token.startsWith("v2."));
  assert.equal(await verifyAdminSession(session.token), true);
  assert.equal(await verifyAdminSession(session.token.slice(0, -2) + "xx"), false);
});
