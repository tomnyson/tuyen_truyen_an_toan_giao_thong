import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";

globalThis.__webSearchWorkerEnv = {};
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "cloudflare:workers") {
      return {
        shortCircuit: true,
        url: "data:text/javascript,export const env = globalThis.__webSearchWorkerEnv",
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
  WEB_SEARCH_DOMAINS,
  canonicalOfficialSourceUrl,
  readOpenAiWebSearchConfig,
  sanitizeWebSearchQuestion,
  searchAllowedLegalSources,
} = await import("../lib/openai-web-search.ts");
const { parseOfficialSourceLinks } = await import(
  "../lib/official-source-url.ts"
);
const { createChatHandler } = await import("../app/api/chat/route.ts");

function providerResponse({
  url = "https://vanban.chinhphu.vn/?pageid=27160&docid=123#section",
  title = "Văn bản Chính phủ",
  annotations,
  model = "gpt-5.4-mini",
  text = "Theo nguồn Chính phủ, quy định này cần được kiểm tra theo trường hợp cụ thể.",
  overrides = {},
} = {}) {
  return new Response(
    JSON.stringify({
      id: "resp_web_test",
      status: "completed",
      model,
      output: [
        {
          type: "web_search_call",
          status: "completed",
          action: {
            type: "search",
            sources: [
              { type: "url", url },
              {
                type: "url",
                url: "https://thuvienphapluat.vn/discovery-only",
              },
            ],
          },
        },
        {
          type: "message",
          role: "assistant",
          status: "completed",
          content: [
            {
              type: "output_text",
              text,
              annotations:
                annotations ??
                [
                  {
                    type: "url_citation",
                    url,
                    title,
                    start_index: 0,
                    end_index: 18,
                  },
                ],
            },
          ],
        },
      ],
      usage: {
        input_tokens: 80,
        output_tokens: 40,
        total_tokens: 120,
      },
      ...overrides,
    }),
    {
      status: 200,
      headers: { "content-type": "application/json" },
    },
  );
}

test("reads the web-search flag strictly and never exposes key defaults", () => {
  assert.deepEqual(
    readOpenAiWebSearchConfig({
      AI_WEB_SEARCH_ENABLED: "true",
      OPENAI_API_KEY: "fake-secret",
      OPENAI_MODEL: "",
      AI_PROVIDER_TIMEOUT_MS: "2500",
    }),
    {
      enabled: true,
      apiKey: "fake-secret",
      model: "",
      timeoutMs: 2500,
    },
  );
  assert.equal(
    readOpenAiWebSearchConfig({ AI_WEB_SEARCH_ENABLED: "TRUE" }).enabled,
    false,
  );
});

test("redacts contact details and URLs before provider search", () => {
  const sanitized = sanitizeWebSearchQuestion(
    "  Liên hệ Test@Example.com, 0912 345 678 hoặc https://evil.test/a\nđể hỏi luật ",
  );
  assert.equal(
    sanitized,
    "Liên hệ [email đã ẩn], [số điện thoại đã ẩn] hoặc [đường dẫn đã ẩn] để hỏi luật",
  );
  assert.doesNotMatch(sanitized, /example\.com|0912|evil\.test/i);
});

test("accepts and canonicalizes only exact official HTTPS authorities", () => {
  assert.equal(
    canonicalOfficialSourceUrl(
      "https://vanban.chinhphu.vn/?pageid=1&docid=2#fragment",
    ),
    "https://vanban.chinhphu.vn/?pageid=1&docid=2",
  );
  for (const invalid of [
    "http://vbpl.vn/document",
    "https://vbpl.vn.evil.test/document",
    "https://evil.test/vbpl.vn/document",
    "https://user@vbpl.vn/document",
    "https://vbpl.vn:8443/document",
    "https://thuvienphapluat.vn/document",
  ]) {
    assert.equal(canonicalOfficialSourceUrl(invalid), null);
  }
});

test("the UI source parser keeps only deduplicated official links", () => {
  assert.deepEqual(
    parseOfficialSourceLinks([
      {
        title: "  Văn bản Chính phủ  ",
        url: "https://vanban.chinhphu.vn/document#fragment",
      },
      {
        title: "Bản trùng",
        url: "https://vanban.chinhphu.vn/document",
      },
      {
        title: "Discovery only",
        url: "https://thuvienphapluat.vn/document",
      },
      {
        title: "Giả mạo",
        url: "https://vbpl.vn.evil.test/document",
      },
    ]),
    [
      {
        title: "Văn bản Chính phủ",
        url: "https://vanban.chinhphu.vn/document",
      },
    ],
  );
});

test("sends a required, store-false, server-allowlisted search and returns official citations", async () => {
  let requestBody;
  const result = await searchAllowedLegalSources(
    {
      enabled: true,
      apiKey: "fake-secret",
      model: "gpt-5.4-mini",
      timeoutMs: 1_000,
    },
    "Số điện thoại 0912 345 678 hỏi quy định này thế nào?",
    {
      fetch: async (_url, init) => {
        requestBody = JSON.parse(init.body);
        return providerResponse();
      },
    },
  );

  assert.equal(result.ok, true);
  assert.deepEqual(requestBody.tools, [
    {
      type: "web_search",
      search_context_size: "low",
      filters: { allowed_domains: WEB_SEARCH_DOMAINS },
    },
  ]);
  assert.equal(requestBody.tool_choice, "required");
  assert.equal(requestBody.store, false);
  assert.deepEqual(requestBody.include, [
    "web_search_call.action.sources",
  ]);
  assert.doesNotMatch(requestBody.input, /0912 345 678/);
  assert.deepEqual(result.sources, [
    {
      title: "Văn bản Chính phủ",
      url: "https://vanban.chinhphu.vn/?pageid=27160&docid=123",
    },
  ]);
  assert.equal(result.usage.totalTokens, 120);
});

test("fails closed when final citation is discovery-only or authority is deceptive", async () => {
  for (const [url, code] of [
    [
      "https://thuvienphapluat.vn/van-ban/giao-thong",
      "UNTRUSTED_CITATION",
    ],
    ["https://vbpl.vn.evil.test/document", "UNTRUSTED_CITATION"],
    ["https://evil.test/path/vbpl.vn", "UNTRUSTED_CITATION"],
  ]) {
    const result = await searchAllowedLegalSources(
      { enabled: true, apiKey: "fake-secret" },
      "Quy định này là gì?",
      { fetch: async () => providerResponse({ url }) },
    );
    assert.deepEqual(result, { ok: false, code });
  }
});

test("fails closed when the final answer has no official citation", async () => {
  const result = await searchAllowedLegalSources(
    { enabled: true, apiKey: "fake-secret" },
    "Quy định này là gì?",
    { fetch: async () => providerResponse({ annotations: [] }) },
  );
  assert.deepEqual(result, {
    ok: false,
    code: "MISSING_OFFICIAL_CITATION",
  });
});

test("flag-off, missing key and unknown model do not call the provider", async () => {
  let calls = 0;
  const fetch = async () => {
    calls += 1;
    return providerResponse();
  };
  assert.deepEqual(
    await searchAllowedLegalSources(
      { enabled: false, apiKey: "fake-secret" },
      "Câu hỏi?",
      { fetch },
    ),
    { ok: false, code: "DISABLED" },
  );
  assert.deepEqual(
    await searchAllowedLegalSources(
      { enabled: true },
      "Câu hỏi?",
      { fetch },
    ),
    { ok: false, code: "MISSING_API_KEY" },
  );
  assert.deepEqual(
    await searchAllowedLegalSources(
      { enabled: true, apiKey: "fake-secret", model: "unknown" },
      "Câu hỏi?",
      { fetch },
    ),
    { ok: false, code: "INVALID_CONFIG" },
  );
  assert.equal(calls, 0);
});

test("provider timeout fails closed", async () => {
  const result = await searchAllowedLegalSources(
    { enabled: true, apiKey: "fake-secret", timeoutMs: 5 },
    "Câu hỏi?",
    {
      fetch: async (_url, init) =>
        new Promise((_resolve, reject) => {
          init.signal.addEventListener(
            "abort",
            () => reject(new DOMException("Aborted", "AbortError")),
            { once: true },
          );
        }),
    },
  );
  assert.deepEqual(result, { ok: false, code: "PROVIDER_TIMEOUT" });
});

test("HTTP, refusal, malformed, oversized and model mismatch all fail closed", async () => {
  const oversized = "x".repeat(1_000_001);
  const cases = [
    {
      expected: "PROVIDER_ERROR",
      response: new Response("upstream unavailable", { status: 503 }),
    },
    {
      expected: "PROVIDER_REFUSAL",
      response: providerResponse({
        overrides: {
          output: [
            {
              type: "message",
              role: "assistant",
              content: [{ type: "refusal", refusal: "cannot answer" }],
            },
          ],
        },
      }),
    },
    {
      expected: "INVALID_OUTPUT",
      response: new Response("{not-json", { status: 200 }),
    },
    {
      expected: "PROVIDER_ERROR",
      response: new Response(oversized, { status: 200 }),
    },
    {
      expected: "INVALID_OUTPUT",
      response: providerResponse({ model: "unreviewed-model" }),
    },
  ];

  for (const item of cases) {
    const result = await searchAllowedLegalSources(
      { enabled: true, apiKey: "fake-secret" },
      "Câu hỏi?",
      { fetch: async () => item.response },
    );
    assert.deepEqual(result, { ok: false, code: item.expected });
  }
});

const allowed = {
  allowed: true,
  status: 200,
  retryAfter: 0,
};

function chatRequest(question) {
  return new Request("https://example.test/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      messages: [{ role: "user", content: question }],
    }),
  });
}

test("chat remains curated-first and does not search on a local match", async () => {
  let webCalls = 0;
  const chat = createChatHandler({
    limiter: () => ({ consumeChat: async () => allowed }),
    telemetry: { emit() {} },
    managedAnswer: async () => "Câu trả lời đã duyệt.",
    curatedAnswer: () => null,
    webSearch: async () => {
      webCalls += 1;
      return { ok: false, code: "PROVIDER_ERROR" };
    },
  });
  const response = await chat(chatRequest("Em cần đội mũ bảo hiểm không?"));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    answer: "Câu trả lời đã duyệt.",
    mode: "knowledge",
  });
  assert.equal(webCalls, 0);
});

test("chat uses guarded web search only after retrieval no-match", async () => {
  let webCalls = 0;
  let persisted = 0;
  Object.assign(globalThis.__webSearchWorkerEnv, {
    AI_WEB_SEARCH_ENABLED: "true",
    OPENAI_API_KEY: "test-key",
    OPENAI_MODEL: "gpt-5.4-mini",
  });
  const chat = createChatHandler({
    limiter: () => ({ consumeChat: async () => allowed }),
    telemetry: { emit() {} },
    managedAnswer: async () => null,
    curatedAnswer: () => null,
    reviewedWebAnswer: async () => null,
    reserveWebBudget: async () => ({
      dayStart: 1,
      reservedTokens: 12_000,
    }),
    settleWebBudget: async () => true,
    persistWebCandidate: async () => {
      persisted += 1;
      return "33333333-3333-4333-8333-333333333333";
    },
    webSearch: async (_config, question) => {
      webCalls += 1;
      assert.equal(question, "Một quy định mới là gì?");
      return {
        ok: true,
        answer: "Kết quả tra cứu có căn cứ Chính phủ.",
        warning: "Chưa kiểm duyệt.",
        sources: [
          {
            title: "Nguồn Chính phủ",
            url: "https://vbpl.vn/document",
          },
        ],
        model: "gpt-5.4-mini",
        usage: {
          inputTokens: 1,
          outputTokens: 1,
          totalTokens: 2,
        },
      };
    },
  });
  const response = await chat(chatRequest("Một quy định mới là gì?"));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(await response.json(), {
    answer: "Kết quả tra cứu có căn cứ Chính phủ.",
    mode: "web_search",
    warning: "Chưa kiểm duyệt.",
    sources: [
      {
        title: "Nguồn Chính phủ",
        url: "https://vbpl.vn/document",
      },
    ],
  });
  assert.equal(webCalls, 1);
  assert.equal(persisted, 1);
  for (const key of Object.keys(globalThis.__webSearchWorkerEnv)) {
    delete globalThis.__webSearchWorkerEnv[key];
  }
});

test("chat fails closed when a successful web result cannot be persisted", async () => {
  Object.assign(globalThis.__webSearchWorkerEnv, {
    AI_WEB_SEARCH_ENABLED: "true",
    OPENAI_API_KEY: "test-key",
    OPENAI_MODEL: "gpt-5.4-mini",
  });
  const chat = createChatHandler({
    limiter: () => ({ consumeChat: async () => allowed }),
    telemetry: { emit() {} },
    managedAnswer: async () => null,
    curatedAnswer: () => null,
    reviewedWebAnswer: async () => null,
    reserveWebBudget: async () => ({
      dayStart: 1,
      reservedTokens: 12_000,
    }),
    settleWebBudget: async () => true,
    persistWebCandidate: async () => null,
    webSearch: async () => ({
      ok: true,
      answer: "Có nguồn nhưng D1 đang lỗi.",
      warning: "Chưa kiểm duyệt.",
      sources: [{ title: "Nguồn", url: "https://vbpl.vn/document" }],
      model: "gpt-5.4-mini",
      usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
    }),
  });
  const response = await chat(chatRequest("Quy định mới?"));
  assert.equal(response.status, 200);
  assert.equal((await response.json()).mode, "unavailable");
  for (const key of Object.keys(globalThis.__webSearchWorkerEnv)) {
    delete globalThis.__webSearchWorkerEnv[key];
  }
});
