import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { PGlite } from "@electric-sql/pglite";
import test from "node:test";

globalThis.__rateLimitWorkerEnv = {};
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "cloudflare:workers") {
      return {
        shortCircuit: true,
        url: "data:text/javascript,export const env = globalThis.__rateLimitWorkerEnv",
      };
    }
    if (specifier.startsWith("@/")) {
      return {
        shortCircuit: true,
        url: new URL(
          specifier === "@/db" ? "../db/index.ts" : `../${specifier.slice(2)}.ts`,
          import.meta.url,
        ).href,
      };
    }
    if (specifier === "next/server") {
      return nextResolve("next/server.js", context);
    }
    if (
      specifier.startsWith(".") &&
      !specifier.match(/\.[a-z]+$/i) &&
      context.parentURL?.endsWith(".ts")
    ) {
      return nextResolve(`${specifier}.ts`, context);
    }
    return nextResolve(specifier, context);
  },
});

const {
  createRateLimiter,
  normalizeClientIp,
  rateLimitPolicyVersion,
} = await import("../lib/rate-limit.ts");
const { createLoginHandler } = await import("../app/admin/api/login/route.ts");
const { createChatHandler } = await import("../app/api/chat/route.ts");

const { pgRateLimitStatements } = await import("../db/pg-bootstrap.ts");
const secret = "rate-limit-test-secret-at-least-32-bytes";

class PgD1 {
  constructor() {
    this.pg = new PGlite();
  }

  async migrate() {
    for (const statement of pgRateLimitStatements) {
      await this.pg.query(statement);
    }
  }

  prepare(query) {
    return {
      query,
      values: [],
      bind(...values) {
        return { ...this, values };
      },
    };
  }

  async batch(statements) {
    return this.pg.transaction(async (tx) => {
      const results = [];
      for (const { query, values } of statements) {
        const result = await tx.query(query, values);
        results.push({ success: true, results: result.rows });
      }
      return results;
    });
  }

  async all(query, params = []) {
    return (await this.pg.query(query, params)).rows;
  }

  async get(query, params = []) {
    return (await this.pg.query(query, params)).rows[0];
  }

  async run(query, params = []) {
    await this.pg.query(query, params);
  }

  async close() {
    await this.pg.close();
  }
}

function request(ip = "203.0.113.10", extraHeaders = {}) {
  return new Request("https://example.test/api", {
    headers: {
      "cf-connecting-ip": ip,
      "cf-ray": "test-ray-HAN",
      ...extraHeaders,
    },
  });
}

async function setup(startMs = Date.UTC(2026, 6, 31, 12, 0, 0)) {
  const database = new PgD1();
  await database.migrate();
  let currentMs = startMs;
  const events = [];
  const limiter = createRateLimiter({
    database,
    secret,
    now: () => currentMs,
    telemetry: (event) => events.push(event),
  });
  return {
    database,
    events,
    limiter,
    advance(milliseconds) {
      currentMs += milliseconds;
    },
    setTime(milliseconds) {
      currentMs = milliseconds;
    },
  };
}

test("DDL rate limit idempotent va chan key hash tho", async () => {
  const database = new PgD1();
  await database.migrate();
  await database.migrate();

  const tables = await database.all(`
    SELECT table_name AS name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name LIKE 'rate_limit_%'
    ORDER BY table_name
  `);
  assert.deepEqual(tables.map(({ name }) => name), [
    "rate_limit_buckets",
    "rate_limit_penalties",
  ]);
  await assert.rejects(database.run(`
    INSERT INTO rate_limit_buckets
      (scope, key_hash, window_start, request_count, expires_at)
    VALUES ('chat-client-60s-v1', 'raw-ip', 0, 1, 60)
  `), /check|constraint/i);
  await database.close();
});

test("normalizes IPv4 and IPv6 /64 while ignoring spoofable X-Forwarded-For", async () => {
  assert.equal(normalizeClientIp("203.0.113.010"), "203.0.113.10");
  assert.equal(
    normalizeClientIp("2001:db8:abcd:12::1"),
    normalizeClientIp("2001:0db8:abcd:0012:ffff::2"),
  );
  assert.notEqual(
    normalizeClientIp("2001:db8:abcd:12::1"),
    normalizeClientIp("2001:db8:abcd:13::1"),
  );

  const { database, limiter } = await setup();
  const noTrustedIdentity = new Request("https://example.test/api", {
    headers: { "x-forwarded-for": "203.0.113.10" },
  });
  assert.deepEqual(await limiter.consumeChat(noTrustedIdentity), {
    allowed: false,
    status: 503,
    retryAfter: 5,
  });
  database.close();
});

test("chap nhan header do Vercel dat khi khong di qua Cloudflare", async () => {
  const { database, limiter } = await setup();
  const viaVercel = new Request("https://example.test/api", {
    headers: { "x-vercel-forwarded-for": "203.0.113.77" },
  });
  assert.equal((await limiter.consumeChat(viaVercel)).allowed, true);
  const viaRealIp = new Request("https://example.test/api", {
    headers: { "x-real-ip": "203.0.113.78" },
  });
  assert.equal((await limiter.beforeLogin(viaRealIp, "admin")).allowed, true);
  database.close();
});

test("stores only scope-separated HMAC keys, never raw client or username", async () => {
  const { database, limiter } = await setup();
  const incoming = request("2001:db8:abcd:12::99");
  assert.equal((await limiter.beforeLogin(incoming, " Admin User ")).allowed, true);
  assert.equal((await limiter.recordLoginFailure(incoming, " Admin User ")).allowed, true);

  const state = JSON.stringify({
    buckets: await database.all("SELECT * FROM rate_limit_buckets"),
    penalties: await database.all("SELECT * FROM rate_limit_penalties"),
  });
  assert.doesNotMatch(state, /2001:db8|Admin User|admin user/i);
  for (const { key_hash: keyHash } of await database.all(`
      SELECT key_hash FROM rate_limit_buckets
      UNION ALL
      SELECT key_hash FROM rate_limit_penalties
    `)) {
    assert.match(keyHash, /^[0-9a-f]{64}$/);
  }
  const distinctHashes = (await database.get(`
      SELECT count(DISTINCT key_hash) AS count FROM (
        SELECT key_hash FROM rate_limit_buckets
        UNION ALL
        SELECT key_hash FROM rate_limit_penalties
      ) AS hashes
    `)).count;
  assert.equal(Number(distinctHashes), 4);
  database.close();
});

test("chat enforces minute threshold ±1, rollover and UTC daily quota", async () => {
  const minuteState = await setup();
  for (let attempt = 1; attempt <= 20; attempt += 1) {
    assert.equal((await minuteState.limiter.consumeChat(request())).allowed, true);
  }
  const denied = await minuteState.limiter.consumeChat(request());
  assert.equal(denied.status, 429);
  assert.equal(denied.retryAfter, 60);
  minuteState.advance(60_000);
  assert.equal((await minuteState.limiter.consumeChat(request())).allowed, true);
  minuteState.database.close();

  const dailyState = await setup(Date.UTC(2026, 6, 31, 0, 0, 0));
  assert.equal((await dailyState.limiter.consumeChat(request())).allowed, true);
  await dailyState.database.run(`
    UPDATE rate_limit_buckets
    SET request_count = 199
    WHERE scope = 'chat-client-day-v1'
  `);
  dailyState.advance(61_000);
  assert.equal((await dailyState.limiter.consumeChat(request())).allowed, true);
  const dailyDenied = await dailyState.limiter.consumeChat(request());
  assert.equal(dailyDenied.status, 429);
  assert.ok(dailyDenied.retryAfter > 86_000);
  dailyState.setTime(Date.UTC(2026, 7, 1, 0, 0, 0));
  assert.equal((await dailyState.limiter.consumeChat(request())).allowed, true);
  dailyState.database.close();
});

test("login applies pair backoff, resets consecutive failures and preserves quotas", async () => {
  const state = await setup();
  const incoming = request();
  for (let failure = 1; failure <= 2; failure += 1) {
    assert.equal((await state.limiter.beforeLogin(incoming, "admin")).allowed, true);
    assert.equal((await state.limiter.recordLoginFailure(incoming, "admin")).allowed, true);
  }
  const third = await state.limiter.recordLoginFailure(incoming, "admin");
  assert.equal(third.status, 429);
  assert.equal(third.retryAfter, 2);
  assert.equal((await state.limiter.beforeLogin(incoming, "admin")).status, 429);

  state.advance(2_000);
  assert.equal((await state.limiter.beforeLogin(incoming, "admin")).allowed, true);
  const fourth = await state.limiter.recordLoginFailure(incoming, "admin");
  assert.equal(fourth.retryAfter, 4);
  state.advance(4_000);
  const successfulPreflight = await state.limiter.beforeLogin(incoming, "admin");
  assert.equal(successfulPreflight.allowed, true);
  assert.equal(
    (
      await state.limiter.resetLoginPair(
        incoming,
        "admin",
        successfulPreflight.resetToken,
      )
    ).allowed,
    true,
  );
  assert.equal((await state.limiter.recordLoginFailure(incoming, "admin")).allowed, true);

  const clientAttempts = await databaseCount(
    state.database,
    "login-client-15m-v1",
  );
  const accountFailures = await databaseCount(
    state.database,
    "login-account-60m-v1",
  );
  assert.equal(clientAttempts, 5);
  assert.equal(accountFailures, 5);
  state.database.close();
});

async function databaseCount(database, scope) {
  const row = await database.get(
    "SELECT request_count FROM rate_limit_buckets WHERE scope = $1",
    [scope],
  );
  return Number(row?.request_count ?? 0);
}

test("fifth pair failure blocks to rollover and state-version CAS prevents ABA reset", async () => {
  const state = await setup();
  const incoming = request();
  for (let failure = 1; failure <= 5; failure += 1) {
    const preflight = await state.limiter.beforeLogin(incoming, "admin");
    assert.equal(preflight.allowed, true);
    const decision = await state.limiter.recordLoginFailure(incoming, "admin");
    if (failure === 3) {
      assert.equal(decision.retryAfter, 2);
      state.advance(2_000);
    } else if (failure === 4) {
      assert.equal(decision.retryAfter, 4);
      state.advance(4_000);
    } else if (failure === 5) {
      assert.equal(decision.status, 429);
      assert.ok(decision.retryAfter > 890);
    }
  }
  state.advance(15 * 60_000);
  assert.equal((await state.limiter.beforeLogin(incoming, "admin")).allowed, true);
  state.database.close();

  const raceState = await setup();
  await raceState.limiter.recordLoginFailure(incoming, "admin");
  const stalePreflight = await raceState.limiter.beforeLogin(incoming, "admin");
  const staleVersion = stalePreflight.resetToken.stateVersion;
  await raceState.limiter.resetLoginPair(
    incoming,
    "admin",
    stalePreflight.resetToken,
  );
  const resetVersion = (await raceState.database.get(
    "SELECT state_version FROM rate_limit_penalties",
  )).state_version;
  await raceState.limiter.recordLoginFailure(incoming, "admin");
  const failureVersion = (await raceState.database.get(
    "SELECT state_version FROM rate_limit_penalties",
  )).state_version;
  assert.notEqual(resetVersion, staleVersion);
  assert.notEqual(failureVersion, resetVersion);
  assert.equal(
    (
      await raceState.limiter.resetLoginPair(
        incoming,
        "admin",
        stalePreflight.resetToken,
      )
    ).allowed,
    true,
  );
  assert.equal(
    Number((await raceState.database.get(
      "SELECT consecutive_failures FROM rate_limit_penalties",
    )).consecutive_failures),
    1,
  );
  raceState.database.close();
});

test("isolates pair/client keys and enforces shared account attempt quota", async () => {
  const state = await setup();
  for (let index = 1; index <= 20; index += 1) {
    const incoming = request(`198.51.100.${index}`);
    assert.equal((await state.limiter.beforeLogin(incoming, "ADMIN")).allowed, true);
    const failure = await state.limiter.recordLoginFailure(incoming, "admin");
    assert.equal(failure.status, 200);
  }
  const accountDenied = await state.limiter.beforeLogin(
    request("198.51.100.200"),
    "  Admin  ",
  );
  assert.equal(accountDenied.status, 429);

  const otherAccount = await state.limiter.beforeLogin(
    request("198.51.100.200"),
    "another-admin",
  );
  assert.equal(otherAccount.allowed, true);
  state.database.close();
});

test("login client attempt quota is atomic under concurrent requests", async () => {
  const state = await setup();
  const decisions = await Promise.all(
    Array.from({ length: 25 }, (_, index) =>
      state.limiter.beforeLogin(request(), `unique-user-${index}`),
    ),
  );
  assert.equal(decisions.filter(({ allowed }) => allowed).length, 20);
  assert.equal(decisions.filter(({ status }) => status === 429).length, 5);
  assert.equal(await databaseCount(state.database, "login-client-15m-v1"), 21);
  state.database.close();
});

test("account reservation caps credential validation across more than 20 client IPs", async () => {
  const state = await setup();
  let validationCalls = 0;
  const login = createLoginHandler({
    limiter: () => state.limiter,
    telemetry: { emit() {} },
    validateCredentials: async () => {
      validationCalls += 1;
      return false;
    },
  });
  const responses = await Promise.all(
    Array.from({ length: 25 }, (_, index) =>
      login(new Request("https://example.test/admin/api/login", {
        method: "POST",
        headers: {
          "cf-connecting-ip": `198.51.100.${index + 1}`,
          "content-type": "application/json",
          origin: "https://example.test",
        },
        body: JSON.stringify({ username: "admin", password: "wrong" }),
      })),
    ),
  );
  assert.equal(validationCalls, 20);
  assert.equal(responses.filter(({ status }) => status === 401).length, 20);
  assert.equal(responses.filter(({ status }) => status === 429).length, 5);
  state.database.close();
});

test("pair-attempt reservation caps same client and username validation at five", async () => {
  const state = await setup();
  let validationCalls = 0;
  const login = createLoginHandler({
    limiter: () => state.limiter,
    telemetry: { emit() {} },
    validateCredentials: async () => {
      validationCalls += 1;
      return false;
    },
  });
  const responses = await Promise.all(
    Array.from({ length: 20 }, () =>
      login(new Request("https://example.test/admin/api/login", {
        method: "POST",
        headers: {
          "cf-connecting-ip": "198.51.100.10",
          "content-type": "application/json",
          origin: "https://example.test",
        },
        body: JSON.stringify({ username: "admin", password: "wrong" }),
      })),
    ),
  );
  assert.equal(validationCalls, 5);
  assert.equal(responses.filter(({ status }) => status === 401).length, 2);
  assert.equal(responses.filter(({ status }) => status === 429).length, 18);
  state.database.close();
});

test("chat multi-bucket batch is atomic under concurrent requests", async () => {
  const state = await setup();
  const decisions = await Promise.all(
    Array.from({ length: 25 }, () => state.limiter.consumeChat(request())),
  );
  assert.equal(decisions.filter(({ allowed }) => allowed).length, 20);
  assert.equal(decisions.filter(({ status }) => status === 429).length, 5);
  assert.equal(await databaseCount(state.database, "chat-client-60s-v1"), 21);
  assert.equal(await databaseCount(state.database, "chat-client-day-v1"), 25);
  state.database.close();
});

test("fails closed for missing secret, missing D1 and D1 batch failure", async () => {
  const state = await setup();
  const withoutSecret = createRateLimiter({ database: state.database, secret: "" });
  assert.equal((await withoutSecret.consumeChat(request())).status, 503);
  const withoutDatabase = createRateLimiter({ secret });
  assert.equal((await withoutDatabase.consumeChat(request())).status, 503);

  const failedDatabase = {
    prepare(query) {
      return { query, bind() { return this; } };
    },
    async batch() {
      throw new Error("D1 unavailable");
    },
  };
  const unavailable = createRateLimiter({ database: failedDatabase, secret });
  assert.equal((await unavailable.beforeLogin(request(), "admin")).status, 503);
  state.database.close();
});

test("fails closed when any D1 batch item reports success false, including reset", async () => {
  const base = new PgD1();
  await base.migrate();
  let failedResultIndex = -1;
  const database = {
    prepare: (query) => base.prepare(query),
    async batch(statements) {
      const result = await base.batch(statements);
      if (failedResultIndex >= 0) result[failedResultIndex].success = false;
      return result;
    },
  };
  const limiter = createRateLimiter({ database, secret });
  const incoming = request();
  failedResultIndex = 0;
  assert.equal((await limiter.beforeLogin(incoming, "cleanup-failure")).status, 503);
  failedResultIndex = -1;
  const preflight = await limiter.beforeLogin(incoming, "admin");
  assert.equal(preflight.allowed, true);
  failedResultIndex = 2;
  const reset = await limiter.resetLoginPair(
    incoming,
    "admin",
    preflight.resetToken,
  );
  assert.equal(reset.status, 503);
  base.close();
});

test("bounded cleanup removes expired rows and telemetry exposes only allowlisted fields", async () => {
  const state = await setup();
  const expiredHash = "a".repeat(64);
  await state.database.run(`
    INSERT INTO rate_limit_buckets
      (scope, key_hash, window_start, request_count, expires_at)
    VALUES ('chat-client-60s-v1', $1, 1, 1, 2)
  `, [expiredHash]);
  await state.limiter.consumeChat(request());
  assert.equal(
    Number((await state.database.get(
      "SELECT count(*) AS count FROM rate_limit_buckets WHERE key_hash = $1",
      [expiredHash],
    )).count),
    0,
  );

  for (const event of state.events) {
    assert.deepEqual(Object.keys(event).sort(), [
      "outcome",
      "policyVersion",
      "requestId",
      "retryAfter",
      "scope",
    ]);
    assert.equal(event.policyVersion, rateLimitPolicyVersion);
    assert.doesNotMatch(JSON.stringify(event), /203\\.0\\.113|[0-9a-f]{64}/i);
  }
  state.database.close();
});

test("429/503 route guards do not invoke auth, retrieval or provider-adjacent logic", async () => {
  let authCalls = 0;
  let sessionCalls = 0;
  const denied = { allowed: false, status: 429, retryAfter: 7 };
  const login = createLoginHandler({
    limiter: () => ({
      beforeLogin: async () => denied,
      recordLoginFailure: async () => denied,
      resetLoginPair: async () => denied,
    }),
    validateCredentials: async () => {
      authCalls += 1;
      return true;
    },
    createSession: async () => {
      sessionCalls += 1;
      return { token: "not-created", maxAge: 1 };
    },
  });
  const loginResponse = await login(new Request(
    "https://example.test/admin/api/login",
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "https://example.test",
      },
      body: JSON.stringify({ username: "admin", password: "secret" }),
    },
  ));
  assert.equal(loginResponse.status, 429);
  assert.equal(loginResponse.headers.get("retry-after"), "7");
  assert.equal(loginResponse.headers.get("cache-control"), "no-store");
  assert.equal(authCalls, 0);
  assert.equal(sessionCalls, 0);

  let retrievalCalls = 0;
  const chat = createChatHandler({
    limiter: () => ({ consumeChat: async () => ({
      allowed: false,
      status: 503,
      retryAfter: 5,
    }) }),
    managedAnswer: async () => {
      retrievalCalls += 1;
      return "must not run";
    },
    curatedAnswer: () => {
      retrievalCalls += 1;
      return "must not run";
    },
  });
  const chatResponse = await chat(new Request("https://example.test/api/chat", {
    method: "POST",
    body: JSON.stringify({ messages: [{ role: "user", content: "question" }] }),
  }));
  assert.equal(chatResponse.status, 503);
  assert.equal(chatResponse.headers.get("retry-after"), "5");
  assert.equal(retrievalCalls, 0);
});
