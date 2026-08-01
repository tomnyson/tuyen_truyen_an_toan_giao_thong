import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { register } from "tsx/esm/api";

const unregisterTsx = register();
const {
  AI_SHADOW_POLICY_VERSION,
  readAiShadowConfig,
  runAiShadowBatch,
} = await import("../lib/ai-shadow.ts");

test.after(async () => {
  await unregisterTsx();
});

const fixture = JSON.parse(
  await readFile(
    new URL("../fixtures/ai-shadow/cases.v1.json", import.meta.url),
    "utf8",
  ),
);

function completedResponse(init) {
  const request = JSON.parse(init.body);
  const providerInput = JSON.parse(
    request.input[0].content[0].text,
  );
  const evidenceId = providerInput.evidence[0].evidenceId;
  const composition = {
    conclusion: {
      text: "Evidence kỹ thuật yêu cầu hệ thống giữ đúng giới hạn.",
      evidenceIds: [evidenceId],
    },
    explanation: [],
    examples: [],
    recommendedActions: [],
    warnings: [],
  };
  return new Response(
    JSON.stringify({
      id: "response-must-not-leak",
      status: "completed",
      model: request.model,
      output: [
        {
          type: "message",
          role: "assistant",
          status: "completed",
          content: [
            {
              type: "output_text",
              text: JSON.stringify(composition),
            },
          ],
        },
      ],
      usage: {
        input_tokens: 11,
        output_tokens: 7,
        total_tokens: 18,
      },
    }),
    { status: 200 },
  );
}

test("shadow flag is exact, defaults disabled and ignores the adapter flag", () => {
  assert.deepEqual(readAiShadowConfig({}), {
    enabled: false,
    apiKey: undefined,
    model: undefined,
    timeoutMs: 10_000,
    maxCases: 5,
    requestQuota: 5,
  });
  assert.equal(
    readAiShadowConfig({
      AI_SHADOW_ENABLED: "TRUE",
      AI_REPHRASE_ENABLED: "true",
      OPENAI_API_KEY: "present",
    }).enabled,
    false,
  );
  assert.equal(
    readAiShadowConfig({ AI_SHADOW_ENABLED: "true" }).enabled,
    true,
  );
});

test("disabled shadow never calls provider and returns content-free aggregate", async () => {
  let calls = 0;
  const result = await runAiShadowBatch(
    readAiShadowConfig({
      OPENAI_API_KEY: "key-must-not-leak",
      AI_REPHRASE_ENABLED: "true",
    }),
    fixture,
    {
      fetch: async () => {
        calls += 1;
        throw new Error("must not run");
      },
    },
  );

  assert.equal(calls, 0);
  assert.equal(result.outcome, "DISABLED");
  assert.equal(result.attempted, 0);
  assert.equal(result.policyVersion, AI_SHADOW_POLICY_VERSION);
  const serialized = JSON.stringify(result);
  assert.doesNotMatch(serialized, /key-must-not-leak|bằng chứng|evidence text/i);
});

test("valid fixture runs once per selected case, discards output and aggregates usage", async () => {
  let calls = 0;
  const requests = [];
  const result = await runAiShadowBatch(
    readAiShadowConfig({
      AI_SHADOW_ENABLED: "true",
      OPENAI_API_KEY: "test-secret",
      OPENAI_MODEL: " gpt-5.4-mini-2026-03-17 ",
      AI_SHADOW_MAX_CASES: "2",
      AI_PROVIDER_MAX_REQUESTS_PER_MINUTE: "1",
    }),
    fixture,
    {
      fetch: async (_url, init) => {
        calls += 1;
        requests.push(JSON.parse(init.body));
        return completedResponse(init);
      },
    },
  );

  assert.equal(calls, 1);
  assert.equal(result.outcome, "COMPLETED");
  assert.equal(
    result.requestedModel,
    "gpt-5.4-mini-2026-03-17",
  );
  assert.deepEqual(result.observedModels, [
    "gpt-5.4-mini-2026-03-17",
  ]);
  assert.equal(result.availableCases, 2);
  assert.equal(result.attempted, 1);
  assert.equal(result.succeeded, 1);
  assert.equal(result.failed, 0);
  assert.equal(result.skippedByLimit, 1);
  assert.equal(result.inputTokens, 11);
  assert.equal(result.outputTokens, 7);
  assert.equal(result.totalTokens, 18);
  assert.deepEqual(result.failures, {});
  assert.equal(requests[0].store, false);
  assert.equal("tools" in requests[0], false);
  const serialized = JSON.stringify(result);
  assert.doesNotMatch(
    serialized,
    /response-must-not-leak|Evidence kỹ thuật|test-secret/,
  );
});

test("unsupported model or invalid numeric policy makes no outbound call", async () => {
  for (const overrides of [
    { OPENAI_MODEL: "gpt-5.6-sol" },
    { OPENAI_MODEL: "gpt-5.4-mini-latest" },
    { AI_SHADOW_MAX_CASES: "0" },
    { AI_PROVIDER_MAX_REQUESTS_PER_MINUTE: "601" },
  ]) {
    let calls = 0;
    const result = await runAiShadowBatch(
      readAiShadowConfig({
        AI_SHADOW_ENABLED: "true",
        OPENAI_API_KEY: "test-secret",
        ...overrides,
      }),
      fixture,
      {
        fetch: async () => {
          calls += 1;
          throw new Error("must not run");
        },
      },
    );
    assert.equal(result.outcome, "INVALID_CONFIG");
    assert.equal(calls, 0);
  }
});

test("the documented RPM configuration is valid while the batch cap stays bounded", async () => {
  let calls = 0;
  const result = await runAiShadowBatch(
    readAiShadowConfig({
      AI_SHADOW_ENABLED: "true",
      OPENAI_API_KEY: "test-secret",
      AI_SHADOW_MAX_CASES: "20",
      AI_PROVIDER_MAX_REQUESTS_PER_MINUTE: "30",
    }),
    fixture,
    {
      fetch: async (_url, init) => {
        calls += 1;
        return completedResponse(init);
      },
    },
  );

  assert.equal(result.outcome, "COMPLETED");
  assert.equal(calls, fixture.cases.length);
  assert.equal(result.attempted, fixture.cases.length);
});

test("tampered or malformed reviewed fixture fails before provider call", async () => {
  for (const invalidFixture of [
    { ...structuredClone(fixture), payloadSha256: "0".repeat(64) },
    {
      ...structuredClone(fixture),
      reviewedBy: fixture.createdBy,
    },
    {
      ...structuredClone(fixture),
      cases: [
        structuredClone(fixture.cases[0]),
        structuredClone(fixture.cases[0]),
      ],
    },
  ]) {
    let calls = 0;
    const result = await runAiShadowBatch(
      readAiShadowConfig({
        AI_SHADOW_ENABLED: "true",
        OPENAI_API_KEY: "test-secret",
      }),
      invalidFixture,
      {
        fetch: async () => {
          calls += 1;
          throw new Error("must not run");
        },
      },
    );
    assert.equal(result.outcome, "INVALID_FIXTURE");
    assert.equal(calls, 0);
  }
});

test("batch snapshots config and fixture before the checksum await", async () => {
  const mutableFixture = structuredClone(fixture);
  const mutableConfig = {
    ...readAiShadowConfig({
      AI_SHADOW_ENABLED: "true",
      OPENAI_API_KEY: "test-secret",
      OPENAI_MODEL: "gpt-5.4-mini",
      AI_SHADOW_MAX_CASES: "1",
      AI_PROVIDER_MAX_REQUESTS_PER_MINUTE: "1",
    }),
  };
  let providerQuestion;
  const pending = runAiShadowBatch(
    mutableConfig,
    mutableFixture,
    {
      fetch: async (_url, init) => {
        const request = JSON.parse(init.body);
        providerQuestion = JSON.parse(
          request.input[0].content[0].text,
        ).question;
        return completedResponse(init);
      },
    },
  );

  mutableConfig.model = "gpt-5.6-sol";
  mutableConfig.apiKey = "";
  mutableFixture.cases[0].question = "Mutation after invocation";
  mutableFixture.payloadSha256 = "0".repeat(64);

  const result = await pending;
  assert.equal(result.outcome, "COMPLETED");
  assert.equal(result.succeeded, 1);
  assert.equal(
    providerQuestion,
    fixture.cases[0].question,
  );
});

test("provider failures are counted without persisting body, output or error", async () => {
  const result = await runAiShadowBatch(
    readAiShadowConfig({
      AI_SHADOW_ENABLED: "true",
      OPENAI_API_KEY: "test-secret",
      AI_SHADOW_MAX_CASES: "1",
      AI_PROVIDER_MAX_REQUESTS_PER_MINUTE: "1",
    }),
    fixture,
    {
      fetch: async () =>
        new Response("provider-secret-body", { status: 500 }),
    },
  );

  assert.equal(result.outcome, "COMPLETED");
  assert.equal(result.attempted, 1);
  assert.equal(result.failed, 1);
  assert.deepEqual(result.failures, { PROVIDER_ERROR: 1 });
  assert.doesNotMatch(
    JSON.stringify(result),
    /provider-secret-body|test-secret/,
  );
});

test("offline shadow runner remains disconnected from the public chat route", async () => {
  const chatRoute = await readFile(
    new URL("../app/api/chat/route.ts", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(
    chatRoute,
    /ai-shadow|runAiShadowBatch|shadow-openai-evidence/,
  );
});
