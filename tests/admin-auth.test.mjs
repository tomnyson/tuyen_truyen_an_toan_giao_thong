import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";

const workerEnv = {};
globalThis.__adminAuthTestEnv = workerEnv;

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "cloudflare:workers") {
      return {
        shortCircuit: true,
        url: "data:text/javascript,export const env = globalThis.__adminAuthTestEnv",
      };
    }
    if (specifier.startsWith("@/")) {
      return {
        shortCircuit: true,
        url: new URL(`../${specifier.slice(2)}.ts`, import.meta.url).href,
      };
    }
    return nextResolve(specifier, context);
  },
});

const { createAdminPasswordHash, verifyAdminPassword } = await import("../lib/password-hash.ts");
const { createAdminSession, validateAdminCredentials, verifyAdminSession } =
  await import("../lib/admin-auth.ts");
const { createLoginHandler } = await import("../app/admin/api/login/route.ts");
const allowedDecision = {
  allowed: true,
  status: 200,
  retryAfter: 0,
  resetToken: { windowStart: 0, stateVersion: "" },
};
const login = createLoginHandler({
  limiter: () => ({
    beforeLogin: async () => allowedDecision,
    recordLoginFailure: async () => allowedDecision,
    resetLoginPair: async () => allowedDecision,
  }),
});

const password = "test-admin-password-strong";
const fixedSalt = Uint8Array.from({ length: 16 }, (_, index) => index);
const validHash = await createAdminPasswordHash(password, fixedSalt);
const validConfig = {
  ADMIN_USERNAME: "admin",
  ADMIN_PASSWORD_HASH: validHash,
  ADMIN_SESSION_SECRET: "test-session-secret-at-least-32-characters-long",
};

function setWorkerEnv(values) {
  for (const key of Object.keys(workerEnv)) delete workerEnv[key];
  Object.assign(workerEnv, values);
}

test("verifies a versioned salted password hash and rejects a wrong password", async () => {
  assert.equal(await verifyAdminPassword(password, validHash), true);
  assert.equal(await verifyAdminPassword("wrong-password", validHash), false);
});

test("fails closed for malformed, weak-version or non-canonical hashes", async () => {
  for (const malformedHash of [
    "",
    "v2$pbkdf2-sha256$600000$AAECAwQFBgcICQoLDA0ODw$invalid",
    "v1$pbkdf2-sha256$1$AAECAwQFBgcICQoLDA0ODw$invalid",
    "v1$pbkdf2-sha256$600000$AAECAwQFBgcICQoLDA0ODw",
    "v1$pbkdf2-sha256$600000$AAECAwQFBgcICQoLDA0ODw$invalid$extra",
    "v1$pbkdf2-sha256$600000$not+base64url$invalid",
    "v1$pbkdf2-sha256$600000$AA$invalid",
  ]) {
    assert.equal(await verifyAdminPassword(password, malformedHash), false, malformedHash);
  }
});

test("credential validation requires complete hash-based server configuration", async () => {
  setWorkerEnv(validConfig);
  assert.equal(await validateAdminCredentials("admin", password), true);
  assert.equal(await validateAdminCredentials("other-admin", password), false);
  assert.equal(await validateAdminCredentials("admin", "wrong-password"), false);

  for (const incompleteConfig of [
    { ...validConfig, ADMIN_USERNAME: "" },
    { ...validConfig, ADMIN_PASSWORD_HASH: "" },
    { ...validConfig, ADMIN_PASSWORD_HASH: "malformed" },
    { ...validConfig, ADMIN_SESSION_SECRET: "too-short" },
  ]) {
    setWorkerEnv(incompleteConfig);
    assert.equal(await validateAdminCredentials("admin", password), false);
  }
});

test("legacy plaintext ADMIN_PASSWORD is ignored", async () => {
  setWorkerEnv({
    ADMIN_USERNAME: "admin",
    ADMIN_PASSWORD: password,
    ADMIN_SESSION_SECRET: validConfig.ADMIN_SESSION_SECRET,
  });
  assert.equal(await validateAdminCredentials("admin", password), false);
});

test("login route creates a signed session only for the hashed credential", async () => {
  setWorkerEnv(validConfig);
  const validResponse = await login(
    new Request("https://example.test/admin/api/login", {
      method: "POST",
      headers: { "content-type": "application/json", origin: "https://example.test" },
      body: JSON.stringify({ username: "admin", password }),
    }),
  );
  assert.equal(validResponse.status, 200);
  assert.match(validResponse.headers.get("set-cookie") ?? "", /law_school_admin=/);

  const invalidResponse = await login(
    new Request("https://example.test/admin/api/login", {
      method: "POST",
      headers: { "content-type": "application/json", origin: "https://example.test" },
      body: JSON.stringify({ username: "admin", password: "wrong-password" }),
    }),
  );
  assert.equal(invalidResponse.status, 401);
  assert.equal(invalidResponse.headers.get("set-cookie"), null);
});

test("session verification regresses closed after session-secret rotation", async () => {
  setWorkerEnv(validConfig);
  const session = await createAdminSession();
  assert.equal(await verifyAdminSession(session.token), true);

  workerEnv.ADMIN_SESSION_SECRET = "rotated-session-secret-at-least-32-characters";
  assert.equal(await verifyAdminSession(session.token), false);
});
