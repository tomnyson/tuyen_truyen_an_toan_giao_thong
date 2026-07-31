import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";

globalThis.__telemetryWorkerEnv = {};
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "cloudflare:workers") {
      return {
        shortCircuit: true,
        url: "data:text/javascript,export const env = globalThis.__telemetryWorkerEnv",
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
  createTelemetry,
  httpOutcome,
  telemetrySchemaVersion,
} = await import("../lib/telemetry.ts");
const { createRateLimiter } = await import("../lib/rate-limit.ts");
const { createObservableWorker } = await import("../lib/worker-observability.ts");
const { createLoginHandler } = await import("../app/admin/api/login/route.ts");
const { createChatHandler } = await import("../app/api/chat/route.ts");

const spoofedRequestId = "11111111-1111-4111-8111-111111111111";
const canary =
  "CANARY-password=Secret123 username=student@example.test ip=203.0.113.99 question=private";

function captureTelemetry() {
  const serialized = [];
  const telemetry = createTelemetry({
    now: () => Date.UTC(2026, 6, 31, 12, 0, 0),
    sink: (event) => serialized.push(event),
  });
  return {
    telemetry,
    serialized,
    events() {
      return serialized.map((event) => JSON.parse(event));
    },
  };
}

function allowedLimiter() {
  const allowed = {
    allowed: true,
    status: 200,
    retryAfter: 0,
    resetToken: { windowStart: 0, stateVersion: "" },
  };
  return {
    beforeLogin: async () => allowed,
    consumeChat: async () => allowed,
    recordLoginFailure: async () => allowed,
    resetLoginPair: async () => allowed,
  };
}

function loginRequest({
  origin = "https://example.test",
  username = "admin",
  password = "password-canary",
} = {}) {
  return new Request("https://example.test/admin/api/login?token=must-not-log", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin,
      "x-request-id": "not-a-trusted-id",
    },
    body: JSON.stringify({ username, password }),
  });
}

function chatRequest(messages) {
  return new Request("https://example.test/api/chat?question=must-not-log", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: "session=must-not-log",
    },
    body: JSON.stringify({ messages }),
  });
}

test("telemetry-v1 serializes only exact bounded allowlisted fields", () => {
  const capture = captureTelemetry();
  capture.telemetry.emit({
    event: "chat.completed",
    requestId: spoofedRequestId,
    route: "api.chat",
    method: "POST",
    status: 200,
    outcome: "knowledge",
    durationMs: 12.34567,
    mode: "knowledge",
    policyVersion: "policy-v1",
    rankingVersion: "rank-v1",
    freshnessVersion: "fresh-v1",
    retrievedRecordIds: [
      ...Array.from({ length: 25 }, (_, index) => `record-${index}`),
      "record-1",
      "invalid id",
    ],
    citationIds: ["citation-1", "citation-1", "bad/id"],
    providerOutcome: "success",
    providerLatencyMs: 7.5,
    providerModel: "model-v1",
    providerRequestCount: 2,
    providerInputTokens: 123,
    providerOutputTokens: 45,
    question: canary,
    headers: { authorization: canary },
    exception: new Error(canary),
    unknown: canary,
  });

  const [event] = capture.events();
  assert.deepEqual(Object.keys(event).sort(), [
    "citationIds",
    "durationMs",
    "event",
    "freshnessVersion",
    "method",
    "mode",
    "outcome",
    "policyVersion",
    "providerInputTokens",
    "providerLatencyMs",
    "providerModel",
    "providerOutcome",
    "providerOutputTokens",
    "providerRequestCount",
    "rankingVersion",
    "requestId",
    "retrievedRecordIds",
    "route",
    "schemaVersion",
    "status",
    "timestamp",
  ]);
  assert.equal(event.schemaVersion, telemetrySchemaVersion);
  assert.equal(event.durationMs, 12.346);
  assert.equal(event.retrievedRecordIds.length, 20);
  assert.deepEqual(event.citationIds, ["citation-1"]);
  assert.doesNotMatch(capture.serialized[0], /CANARY|Secret123|student@|203\\.0\\.113|must-not-log/);
});

test("invalid required fields are rejected and optional bounds are dropped", () => {
  const capture = captureTelemetry();
  capture.telemetry.emit({
    event: "unknown.event",
    requestId: spoofedRequestId,
    route: "api.chat",
    method: "POST",
    status: 200,
    outcome: "success",
    durationMs: 1,
  });
  assert.equal(capture.events().length, 0);

  capture.telemetry.emit({
    event: "http.response_ready",
    requestId: spoofedRequestId,
    route: "api.other",
    method: "GET",
    status: 200,
    outcome: "success",
    durationMs: 1,
    providerModel: canary,
    providerRequestCount: 5,
    providerInputTokens: 99_000_000,
    retrievedRecordIds: [canary],
  });
  const [event] = capture.events();
  assert.equal(event.providerModel, undefined);
  assert.equal(event.providerRequestCount, undefined);
  assert.equal(event.providerInputTokens, undefined);
  assert.equal(event.retrievedRecordIds, undefined);
  assert.doesNotMatch(JSON.stringify(event), /CANARY|Secret123/);
});

test("stable HTTP error mapping never includes exception details", () => {
  assert.equal(httpOutcome(200), "success");
  assert.equal(httpOutcome(302), "redirect");
  assert.equal(httpOutcome(400), "invalid_request");
  assert.equal(httpOutcome(401), "invalid_credentials");
  assert.equal(httpOutcome(403), "forbidden");
  assert.equal(httpOutcome(429), "rate_limited");
  assert.equal(httpOutcome(500), "internal_error");
  assert.equal(httpOutcome(503), "dependency_error");
});

test("outer Worker overwrites client IDs and emits http.response_ready", async () => {
  const capture = captureTelemetry();
  const seenRequestIds = [];
  let clock = 100;
  const worker = createObservableWorker({
    telemetry: capture.telemetry,
    now: () => clock++,
    handler: {
      async fetch(request) {
        seenRequestIds.push(request.headers.get("x-request-id"));
        return Response.json({ ok: true }, { status: 201 });
      },
    },
  });

  const responses = await Promise.all([
    worker.fetch(
      new Request("https://example.test/api/one?secret=one", {
        headers: { "x-request-id": spoofedRequestId },
      }),
      {},
      {},
    ),
    worker.fetch(
      new Request("https://example.test/api/two?secret=two", {
        headers: { "x-request-id": spoofedRequestId },
      }),
      {},
      {},
    ),
  ]);

  const responseIds = responses.map((response) => response.headers.get("x-request-id"));
  assert.equal(new Set(responseIds).size, 2);
  assert.deepEqual(seenRequestIds, responseIds);
  assert.ok(responseIds.every((id) => id !== spoofedRequestId));
  assert.deepEqual(
    capture.events().map(({ event, requestId, status }) => ({ event, requestId, status })),
    responseIds.map((requestId) => ({
      event: "http.response_ready",
      requestId,
      status: 201,
    })),
  );
  assert.doesNotMatch(capture.serialized.join(""), /secret=|\/api\/one|\/api\/two/);
});

test("rate-limit telemetry reuses only the outer Worker UUID, never cf-ray", async () => {
  const capture = captureTelemetry();
  const rateLimitEvents = [];
  const limiter = createRateLimiter({
    secret: "rate-limit-test-secret-at-least-32-bytes",
    telemetry: (event) => rateLimitEvents.push(event),
  });
  const chat = createChatHandler({
    limiter: () => limiter,
    telemetry: capture.telemetry,
  });
  const worker = createObservableWorker({
    handler: { fetch: chat },
    telemetry: capture.telemetry,
  });
  const response = await worker.fetch(
    new Request("https://example.test/api/chat", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "cf-connecting-ip": "203.0.113.99",
        "cf-ray": canary,
        "x-request-id": spoofedRequestId,
      },
      body: JSON.stringify({ messages: [] }),
    }),
    {},
    {},
  );
  const outerRequestId = response.headers.get("x-request-id");

  assert.equal(response.status, 503);
  assert.notEqual(outerRequestId, spoofedRequestId);
  assert.equal(rateLimitEvents[0].requestId, outerRequestId);
  assert.ok(
    capture.events().every(({ requestId }) => requestId === outerRequestId),
  );
  assert.doesNotMatch(
    JSON.stringify([...rateLimitEvents, ...capture.events()]),
    /CANARY|203\.0\.113\.99/,
  );

  const fallbackEvents = [];
  const fallbackLimiter = createRateLimiter({
    secret: "rate-limit-test-secret-at-least-32-bytes",
    telemetry: (event) => fallbackEvents.push(event),
  });
  const untrusted = new Request("https://example.test/api/chat", {
    headers: {
      "cf-connecting-ip": "203.0.113.99",
      "cf-ray": "client-ray-must-not-be-used",
      "x-request-id": "client-controlled",
    },
  });
  await fallbackLimiter.consumeChat(untrusted);
  assert.match(
    fallbackEvents[0].requestId,
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  );
  assert.notEqual(fallbackEvents[0].requestId, "client-controlled");
  assert.notEqual(fallbackEvents[0].requestId, "client-ray-must-not-be-used");
});

test("outer Worker maps thrown errors to safe 500 without logging message or stack", async () => {
  const capture = captureTelemetry();
  const worker = createObservableWorker({
    telemetry: capture.telemetry,
    handler: {
      async fetch() {
        throw new Error(canary);
      },
    },
  });
  const response = await worker.fetch(
    new Request("https://example.test/api/chat"),
    {},
    {},
  );
  assert.equal(response.status, 500);
  assert.match(response.headers.get("x-request-id") ?? "", /^[0-9a-f-]{36}$/i);
  assert.equal(capture.events()[0].outcome, "internal_error");
  assert.doesNotMatch(capture.serialized[0], /CANARY|Secret123|stack|message/);
});

test("outer and chat events share the trusted ID without fabricated retrieval/citation IDs", async () => {
  const capture = captureTelemetry();
  const chat = createChatHandler({
    limiter: allowedLimiter,
    telemetry: capture.telemetry,
    now: () => 100,
    managedAnswer: async () => null,
    curatedAnswer: () => "Safe curated answer",
  });
  const worker = createObservableWorker({
    telemetry: capture.telemetry,
    now: () => 100,
    handler: { fetch: chat },
  });
  const response = await worker.fetch(
    new Request("https://example.test/api/chat", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-request-id": spoofedRequestId,
      },
      body: JSON.stringify({
        messages: [{ role: "user", content: canary }],
      }),
    }),
    {},
    {},
  );
  assert.equal(response.status, 200);
  const events = capture.events();
  assert.deepEqual(events.map(({ event }) => event), [
    "chat.completed",
    "http.response_ready",
  ]);
  assert.equal(new Set(events.map(({ requestId }) => requestId)).size, 1);
  assert.equal(events[0].requestId, response.headers.get("x-request-id"));
  assert.equal(events[0].retrievedRecordIds, undefined);
  assert.equal(events[0].citationIds, undefined);
  assert.doesNotMatch(capture.serialized.join(""), /CANARY|Secret123|student@/);
});

test("chat distinguishes retrieval no-match from a generic unavailable failure", async () => {
  const capture = captureTelemetry();
  const noMatch = createChatHandler({
    limiter: allowedLimiter,
    telemetry: capture.telemetry,
    managedAnswer: async () => null,
    curatedAnswer: () => null,
  });
  const response = await noMatch(
    chatRequest([{ role: "user", content: canary }]),
  );

  assert.equal(response.status, 200);
  assert.deepEqual(
    capture.events().map(({ outcome, mode }) => ({ outcome, mode })),
    [{ outcome: "retrieval_no_match", mode: "unavailable" }],
  );
  assert.doesNotMatch(capture.serialized[0], /CANARY|Secret123|student@/);
});

test("chat.completed covers 200, 400, 429 and 503 without request payloads", async () => {
  const capture = captureTelemetry();
  const knowledge = createChatHandler({
    limiter: allowedLimiter,
    telemetry: capture.telemetry,
    managedAnswer: async () => null,
    curatedAnswer: () => "Known answer",
  });
  const invalid = createChatHandler({
    limiter: allowedLimiter,
    telemetry: capture.telemetry,
  });
  const limited = createChatHandler({
    telemetry: capture.telemetry,
    limiter: () => ({
      consumeChat: async () => ({ allowed: false, status: 429, retryAfter: 7 }),
    }),
  });
  const unavailable = createChatHandler({
    telemetry: capture.telemetry,
    limiter: () => ({
      consumeChat: async () => ({ allowed: false, status: 503, retryAfter: 5 }),
    }),
  });

  const responses = await Promise.all([
    knowledge(chatRequest([{ role: "user", content: canary }])),
    invalid(chatRequest([])),
    limited(chatRequest([{ role: "user", content: canary }])),
    unavailable(chatRequest([{ role: "user", content: canary }])),
  ]);
  assert.deepEqual(responses.map(({ status }) => status), [200, 400, 429, 503]);
  assert.deepEqual(
    capture.events().map(({ status }) => status).sort((left, right) => left - right),
    [200, 400, 429, 503],
  );
  assert.ok(responses.every((response) => response.headers.has("x-request-id")));
  assert.doesNotMatch(capture.serialized.join(""), /CANARY|Secret123|student@|must-not-log/);
});

test("rejecting chat limiter emits one dependency event plus one outer response-ready event", async () => {
  const capture = captureTelemetry();
  const chat = createChatHandler({
    telemetry: capture.telemetry,
    limiter: () => ({
      consumeChat: async () => {
        throw new Error(canary);
      },
    }),
  });
  const worker = createObservableWorker({
    telemetry: capture.telemetry,
    handler: { fetch: chat },
  });
  const response = await worker.fetch(
    chatRequest([{ role: "user", content: canary }]),
    {},
    {},
  );
  const events = capture.events();

  assert.equal(response.status, 503);
  assert.deepEqual(
    events.map(({ event, status, outcome }) => ({ event, status, outcome })),
    [
      {
        event: "chat.completed",
        status: 503,
        outcome: "dependency_error",
      },
      {
        event: "http.response_ready",
        status: 503,
        outcome: "dependency_error",
      },
    ],
  );
  assert.equal(new Set(events.map(({ requestId }) => requestId)).size, 1);
  assert.equal(events[0].requestId, response.headers.get("x-request-id"));
  assert.doesNotMatch(capture.serialized.join(""), /CANARY|Secret123|student@/);
});

test("auth.login covers 200, 401, 403, 429 and 503 without credential or identity data", async () => {
  const capture = captureTelemetry();
  const successful = createLoginHandler({
    limiter: allowedLimiter,
    telemetry: capture.telemetry,
    validateCredentials: async () => true,
    createSession: async () => ({ token: "session-canary", maxAge: 60 }),
  });
  const rejected = createLoginHandler({
    limiter: allowedLimiter,
    telemetry: capture.telemetry,
    validateCredentials: async () => false,
  });
  const limited = createLoginHandler({
    telemetry: capture.telemetry,
    limiter: () => ({
      ...allowedLimiter(),
      beforeLogin: async () => ({ allowed: false, status: 429, retryAfter: 7 }),
    }),
  });
  const dependencyFailure = createLoginHandler({
    telemetry: capture.telemetry,
    limiter: () => ({
      ...allowedLimiter(),
      beforeLogin: async () => ({ allowed: false, status: 503, retryAfter: 5 }),
    }),
  });

  const responses = [
    await successful(loginRequest()),
    await rejected(loginRequest({ username: "student@example.test", password: canary })),
    await successful(loginRequest({ origin: "https://evil.example" })),
    await limited(loginRequest()),
    await dependencyFailure(loginRequest()),
  ];
  assert.deepEqual(responses.map(({ status }) => status), [200, 401, 403, 429, 503]);
  assert.deepEqual(capture.events().map(({ outcome }) => outcome), [
    "authenticated",
    "invalid_credentials",
    "forbidden",
    "rate_limited",
    "dependency_error",
  ]);
  assert.doesNotMatch(
    capture.serialized.join(""),
    /CANARY|Secret123|student@|password-canary|session-canary|evil\\.example/,
  );
});

test("synchronous sink failure never changes HTTP results", async () => {
  const throwingTelemetry = createTelemetry({
    sink() {
      throw new Error(canary);
    },
  });
  const chatThrowing = createChatHandler({
    limiter: allowedLimiter,
    telemetry: throwingTelemetry,
    managedAnswer: async () => null,
    curatedAnswer: () => "answer",
  });
  assert.equal(
    (await chatThrowing(chatRequest([{ role: "user", content: canary }]))).status,
    200,
  );
});
