import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { registerHooks } from "node:module";
import test from "node:test";

globalThis.__topicScopeWorkerEnv = {};
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "cloudflare:workers") {
      return {
        shortCircuit: true,
        url: "data:text/javascript,export const env = globalThis.__topicScopeWorkerEnv",
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
  CHAT_TOPIC_SCOPE_POLICY_VERSION,
  IN_SCOPE_NO_MATCH_ANSWER,
  OUT_OF_SCOPE_ANSWER,
  classifyChatTopicScope,
} = await import("../lib/chat-topic-scope.ts");
const { createChatHandler } = await import("../app/api/chat/route.ts");
const { searchReferenceLegalSources } = await import(
  "../lib/openai-web-search.ts"
);
const pageSource = await readFile(
  new URL("../app/page.tsx", import.meta.url),
  "utf8",
);

const allowed = {
  allowed: true,
  status: 200,
  retryAfter: 0,
};

function request(question) {
  return new Request("https://example.test/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      messages: [{ role: "user", content: question }],
    }),
  });
}

for (const [question, topic] of [
  ["Đi xe máy tống 3 có an toàn không?", "traffic"],
  ["Khong doi mu bao hiem khi di xe may", "traffic"],
  ["Đi bộ qua đường thế nào cho an toàn?", "traffic"],
  ["Ngồi ô tô có cần thắt dây an toàn không?", "traffic"],
  ["Đăng thông tin sai sự thật trên mạng xã hội thì sao?", "online_safety"],
  ["Anh rieng tu bi phat tan trong nhom lop", "online_safety"],
  ["Dùng ảnh của tác giả khác có cần ghi nguồn không?", "copyright"],
  ["Dao van va ban quyen hoc duong", "copyright"],
  [
    "Đăng lại bài viết của người khác có vi phạm bản quyền không?",
    "copyright",
  ],
  ["Dùng nhạc của người khác trong video có sao không?", "copyright"],
  ["Em remix bài hát của bạn được không?", "copyright"],
  ["Có cần chú thích nguồn cho bức ảnh không?", "copyright"],
  ["Dẫn nguồn cho ảnh như thế nào?", "copyright"],
  ["Bạn nói xấu em trên mạng xã hội", "online_safety"],
  ["Tài khoản của em bị hack thì làm sao?", "online_safety"],
  ["Đi xe đạp trên đường có an toàn không?", "traffic"],
]) {
  test(`topic gate accepts ${topic}: ${question}`, () => {
    assert.deepEqual(classifyChatTopicScope(question), {
      inScope: true,
      topic,
      policyVersion: CHAT_TOPIC_SCOPE_POLICY_VERSION,
    });
  });
}

for (const question of [
  "Thời tiết hôm nay thế nào?",
  "Viết giúp em một đoạn code",
  "Cho em công thức nấu mì",
  "Hình ảnh",
  "Mạng",
  "Xe",
  "Bài này khó quá",
  "Tai nạn lao động có được bồi thường không?",
  "Facebook được thành lập năm nào?",
  "Tác phẩm Truyện Kiều kể về gì?",
  "Tốc độ internet của trường chậm quá",
  "Xe máy Honda nào đẹp?",
  "Sản phẩm xe máy Honda nào tốt?",
  "Em muốn mua quà cho ba",
  "Facebook có tin gì mới?",
  "Dùng code Python thế nào?",
  "Dùng video nào để học toán tốt hơn?",
  "Sử dụng code để học Python như thế nào?",
  "Đăng lại bài tập để hỏi bạn cách giải",
  "Dùng sách này học bài sao?",
  "Sáng chế có thuộc sở hữu trí tuệ không?",
  "Nhãn hiệu thuộc sở hữu trí tuệ như thế nào?",
  "Bí mật kinh doanh có phải sở hữu trí tuệ không?",
  "Sở hữu trí tuệ gồm những gì?",
]) {
  test(`topic gate rejects unrelated or generic question: ${question}`, () => {
    assert.deepEqual(classifyChatTopicScope(question), {
      inScope: false,
      topic: null,
      policyVersion: CHAT_TOPIC_SCOPE_POLICY_VERSION,
    });
  });
}

test("chat UI tells users the exact three supported areas", () => {
  assert.match(
    pageSource,
    /an toàn giao thông, ứng xử trên mạng hoặc bản quyền học đường/,
  );
  assert.match(
    pageSource,
    /Hỏi về giao thông, an toàn\/ứng xử trên mạng hoặc bản quyền/,
  );
});

test("privacy safety intent runs before the product scope rejection", async () => {
  let managed = 0;
  const chat = createChatHandler({
    limiter: () => ({ consumeChat: async () => allowed }),
    telemetry: { emit() {} },
    managedAnswer: async () => {
      managed += 1;
      return "WRONG";
    },
  });
  const body = await (
    await chat(request("Hình em bị gửi vào nhóm chat lớp"))
  ).json();
  assert.equal(body.mode, "knowledge");
  assert.match(body.answer, /dừng chia sẻ/i);
  assert.equal(managed, 0);
});

test("off-topic stops before retrieval, provider, budget and persistence", async () => {
  const calls = {
    managed: 0,
    curated: 0,
    reviewed: 0,
    reserve: 0,
    web: 0,
    reference: 0,
    persist: 0,
  };
  const chat = createChatHandler({
    limiter: () => ({ consumeChat: async () => allowed }),
    telemetry: { emit() {} },
    managedAnswer: async () => {
      calls.managed += 1;
      return "WRONG";
    },
    curatedAnswer: () => {
      calls.curated += 1;
      return "WRONG";
    },
    reviewedWebAnswer: async () => {
      calls.reviewed += 1;
      return null;
    },
    reserveWebBudget: async () => {
      calls.reserve += 1;
      return null;
    },
    webSearch: async () => {
      calls.web += 1;
      return { ok: false, code: "PROVIDER_ERROR" };
    },
    referenceWebSearch: async () => {
      calls.reference += 1;
      return { ok: false, code: "PROVIDER_ERROR" };
    },
    persistWebCandidate: async () => {
      calls.persist += 1;
      return null;
    },
  });

  const response = await chat(request("Dự báo thời tiết ngày mai"));
  const body = await response.json();

  assert.deepEqual(body, {
    answer: OUT_OF_SCOPE_ANSWER,
    mode: "unavailable",
  });
  assert.deepEqual(calls, {
    managed: 0,
    curated: 0,
    reviewed: 0,
    reserve: 0,
    web: 0,
    reference: 0,
    persist: 0,
  });
});

test("in-scope no-match is short and has no legal presentation fields", async () => {
  const chat = createChatHandler({
    limiter: () => ({ consumeChat: async () => allowed }),
    telemetry: { emit() {} },
    managedAnswer: async () => null,
    curatedAnswer: () => null,
    reviewedWebAnswer: async () => null,
  });

  const response = await chat(
    request("Đi xe máy trong tình huống chưa có dữ liệu thì sao?"),
  );
  const body = await response.json();
  assert.deepEqual(body, {
    answer: IN_SCOPE_NO_MATCH_ANSWER,
    mode: "unavailable",
  });
  assert.equal(body.sections, undefined);
  assert.equal(body.sources, undefined);
});

test("official-looking output with the wrong source kind is never persisted", async () => {
  let persisted = 0;
  Object.assign(globalThis.__topicScopeWorkerEnv, {
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
    reserveWebBudget: async () => ({ dayStart: 1, reservedTokens: 12_000 }),
    settleWebBudget: async () => true,
    persistWebCandidate: async () => {
      persisted += 1;
      return "33333333-3333-4333-8333-333333333333";
    },
    webSearch: async () => ({
      ok: true,
      sourceKind: "reference",
      answer: "Kết luận: Nội dung sai trust tier.",
      sections: [],
      warning: "Cảnh báo",
      sources: [{ title: "Nguồn", url: "https://vbpl.vn/document" }],
      model: "gpt-5.4-mini",
      usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
    }),
  });

  const body = await (await chat(request("Quy định giao thông mới?"))).json();
  assert.equal(body.mode, "unavailable");
  assert.equal(body.answer, IN_SCOPE_NO_MATCH_ANSWER);
  assert.equal(persisted, 0);
  for (const key of Object.keys(globalThis.__topicScopeWorkerEnv)) {
    delete globalThis.__topicScopeWorkerEnv[key];
  }
});

test("official output unrelated to the classified topic is never persisted", async () => {
  let persisted = 0;
  Object.assign(globalThis.__topicScopeWorkerEnv, {
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
    reserveWebBudget: async () => ({ dayStart: 1, reservedTokens: 12_000 }),
    settleWebBudget: async () => true,
    persistWebCandidate: async () => {
      persisted += 1;
      return "33333333-3333-4333-8333-333333333333";
    },
    webSearch: async () => ({
      ok: true,
      sourceKind: "official",
      answer: "Kết luận: Nội dung này chỉ nói về bản quyền tác phẩm.",
      sections: [],
      warning: "Cảnh báo",
      sources: [{ title: "Nguồn", url: "https://vbpl.vn/document" }],
      model: "gpt-5.4-mini",
      usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
    }),
  });

  const body = await (
    await chat(request("Đi xe máy tống 3 có an toàn không?"))
  ).json();
  assert.equal(body.mode, "unavailable");
  assert.equal(body.answer, IN_SCOPE_NO_MATCH_ANSWER);
  assert.equal(persisted, 0);
  for (const key of Object.keys(globalThis.__topicScopeWorkerEnv)) {
    delete globalThis.__topicScopeWorkerEnv[key];
  }
});

test("generic official answer cannot inherit topic validity from its source title", async () => {
  let persisted = 0;
  Object.assign(globalThis.__topicScopeWorkerEnv, {
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
    reserveWebBudget: async () => ({ dayStart: 1, reservedTokens: 12_000 }),
    settleWebBudget: async () => true,
    persistWebCandidate: async () => {
      persisted += 1;
      return "33333333-3333-4333-8333-333333333333";
    },
    webSearch: async () => ({
      ok: true,
      sourceKind: "official",
      answer: "Kết luận: Có nội dung liên quan đến tình huống bạn nêu.",
      sections: [],
      warning: "Cảnh báo",
      sources: [
        {
          title: "Quy định an toàn giao thông",
          url: "https://vbpl.vn/document",
        },
      ],
      model: "gpt-5.4-mini",
      usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
    }),
  });

  const body = await (
    await chat(request("Đi xe máy tống 3 có an toàn không?"))
  ).json();
  assert.equal(body.mode, "unavailable");
  assert.equal(persisted, 0);
  for (const key of Object.keys(globalThis.__topicScopeWorkerEnv)) {
    delete globalThis.__topicScopeWorkerEnv[key];
  }
});

test("official patent answer cannot be persisted for a copyright question", async () => {
  let persisted = 0;
  Object.assign(globalThis.__topicScopeWorkerEnv, {
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
    reserveWebBudget: async () => ({ dayStart: 1, reservedTokens: 12_000 }),
    settleWebBudget: async () => true,
    persistWebCandidate: async () => {
      persisted += 1;
      return "33333333-3333-4333-8333-333333333333";
    },
    webSearch: async () => ({
      ok: true,
      sourceKind: "official",
      answer:
        "Kết luận: Sáng chế và nhãn hiệu là các nội dung sở hữu trí tuệ.",
      sections: [],
      warning: "Cảnh báo",
      sources: [
        {
          title: "Văn bản về sở hữu trí tuệ",
          url: "https://vbpl.vn/document",
        },
      ],
      model: "gpt-5.4-mini",
      usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
    }),
  });

  const body = await (
    await chat(request("Bản quyền hình ảnh học đường cần lưu ý gì?"))
  ).json();
  assert.equal(body.mode, "unavailable");
  assert.equal(persisted, 0);
  for (const key of Object.keys(globalThis.__topicScopeWorkerEnv)) {
    delete globalThis.__topicScopeWorkerEnv[key];
  }
});

test("reference result is reduced, warned and never persisted", async () => {
  let persisted = 0;
  Object.assign(globalThis.__topicScopeWorkerEnv, {
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
    reserveWebBudget: async () => ({ dayStart: 1, reservedTokens: 12_000 }),
    settleWebBudget: async () => true,
    persistWebCandidate: async () => {
      persisted += 1;
      return "33333333-3333-4333-8333-333333333333";
    },
    webSearch: async () => ({
      ok: false,
      code: "MISSING_OFFICIAL_CITATION",
      model: "gpt-5.4-mini",
      usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
    }),
    referenceWebSearch: async () => ({
      ok: true,
      sourceKind: "reference",
      answer: [
        "Kết luận: Có thông tin tham khảo về việc chở người bằng xe máy.",
        "Giải thích: Nội dung giao thông này chưa được nguồn chính thức xác minh.",
        "Căn cứ pháp lý: PHẢI BỊ LOẠI.",
        "Mức phạt tham khảo: PHẢI BỊ LOẠI.",
        "Biện pháp khắc phục theo văn bản: PHẢI BỊ LOẠI.",
        "Bạn nên làm gì: Mở nguồn và hỏi giáo viên hoặc cơ quan phù hợp.",
        "Lưu ý: Cần xác minh lại bằng văn bản chính thức.",
      ].join("\n"),
      sections: [],
      warning:
        "Nguồn tham khảo ngoài, không phải nguồn chính thống; cần xác minh.",
      sources: [
        {
          title: "Nguồn tham khảo",
          url: "https://thuvienphapluat.vn/van-ban/giao-thong",
        },
      ],
      model: "gpt-5.4-mini",
      usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
    }),
  });

  const body = await (
    await chat(request("Đi xe máy tống 3 có an toàn không?"))
  ).json();
  assert.equal(body.mode, "web_search");
  assert.equal(body.sourceKind, "reference");
  assert.deepEqual(
    body.sections.map(({ kind }) => kind),
    ["summary", "details", "next_steps", "limitations"],
  );
  assert.doesNotMatch(body.answer, /PHẢI BỊ LOẠI/);
  assert.match(body.warning, /không phải nguồn chính thống/i);
  assert.match(body.warning, /xác minh/i);
  assert.equal(persisted, 0);
  for (const key of Object.keys(globalThis.__topicScopeWorkerEnv)) {
    delete globalThis.__topicScopeWorkerEnv[key];
  }
});

test("invalid successful reference response is recorded as invalid output", async () => {
  const events = [];
  Object.assign(globalThis.__topicScopeWorkerEnv, {
    AI_WEB_SEARCH_ENABLED: "true",
    OPENAI_API_KEY: "test-key",
    OPENAI_MODEL: "gpt-5.4-mini",
  });
  const chat = createChatHandler({
    limiter: () => ({ consumeChat: async () => allowed }),
    telemetry: { emit: (event) => events.push(event) },
    managedAnswer: async () => null,
    curatedAnswer: () => null,
    reviewedWebAnswer: async () => null,
    reserveWebBudget: async () => ({ dayStart: 1, reservedTokens: 12_000 }),
    settleWebBudget: async () => true,
    webSearch: async () => ({
      ok: false,
      code: "MISSING_OFFICIAL_CITATION",
      model: "gpt-5.4-mini",
      usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
    }),
    referenceWebSearch: async () => ({
      ok: true,
      sourceKind: "official",
      answer: "Kết luận: Thông tin giao thông sai trust tier.",
      sections: [],
      warning: "Cảnh báo",
      sources: [
        {
          title: "Nguồn",
          url: "https://thuvienphapluat.vn/van-ban/giao-thong",
        },
      ],
      model: "gpt-5.4-mini",
      usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
    }),
  });

  const body = await (
    await chat(request("Đi xe máy tống 3 có an toàn không?"))
  ).json();
  assert.equal(body.mode, "unavailable");
  assert.equal(events[0].providerOutcome, "invalid_output");
  for (const key of Object.keys(globalThis.__topicScopeWorkerEnv)) {
    delete globalThis.__topicScopeWorkerEnv[key];
  }
});

test("server-owned topic-neutral reference fallback remains displayable and non-persisted", async () => {
  let persisted = 0;
  const adapterResult = await searchReferenceLegalSources(
    { enabled: true, apiKey: "test-key", model: "gpt-5.4-mini" },
    "Đi xe máy tống 3 có an toàn không?",
    {
      fetch: async () =>
        new Response(
          JSON.stringify({
            id: "resp_reference_fallback",
            status: "completed",
            model: "gpt-5.4-mini",
            output: [
              {
                type: "message",
                role: "assistant",
                status: "completed",
                content: [
                  {
                    type: "output_text",
                    text: "Kết luận: Mức phạt là 400.000 đồng.",
                    annotations: [
                      {
                        type: "url_citation",
                        url: "https://thuvienphapluat.vn/van-ban/giao-thong",
                        title: "Nguồn tham khảo",
                        start_index: 0,
                        end_index: 10,
                      },
                    ],
                  },
                ],
              },
            ],
            usage: {
              input_tokens: 1,
              output_tokens: 1,
              total_tokens: 2,
            },
          }),
          {
            status: 200,
            headers: { "content-type": "application/json" },
          },
        ),
    },
  );
  assert.equal(adapterResult.ok, true);
  assert.equal(adapterResult.answerOrigin, "server_safe_fallback");
  Object.assign(globalThis.__topicScopeWorkerEnv, {
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
    reserveWebBudget: async () => ({ dayStart: 1, reservedTokens: 12_000 }),
    settleWebBudget: async () => true,
    persistWebCandidate: async () => {
      persisted += 1;
      return "33333333-3333-4333-8333-333333333333";
    },
    webSearch: async () => ({
      ok: false,
      code: "UNVERIFIED_LEGAL_CLAIM",
      model: "gpt-5.4-mini",
      usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
    }),
    referenceWebSearch: async () => adapterResult,
  });

  const body = await (
    await chat(request("Đi xe máy tống 3 có an toàn không?"))
  ).json();
  assert.equal(body.mode, "web_search");
  assert.equal(body.sourceKind, "reference");
  assert.equal(persisted, 0);
  for (const key of Object.keys(globalThis.__topicScopeWorkerEnv)) {
    delete globalThis.__topicScopeWorkerEnv[key];
  }
});
