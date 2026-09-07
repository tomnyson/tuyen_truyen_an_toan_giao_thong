import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { registerHooks } from "node:module";
import test from "node:test";

globalThis.__groundedWorkerEnv = {};
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "cloudflare:workers") {
      return {
        shortCircuit: true,
        url: "data:text/javascript,export const env = globalThis.__groundedWorkerEnv",
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
  GROUNDED_ANSWER_POLICY_VERSION,
  findGroundedAnswer,
  readGroundedChatConfig,
  renderGroundedSections,
  suggestFollowUps,
} = await import("../lib/grounded-answer.ts");
const { parseChatFollowUps } = await import(
  "../lib/chat-answer-presentation.ts"
);
const { createChatHandler } = await import("../app/api/chat/route.ts");

const enabledEnv = {
  AI_GROUNDED_CHAT_ENABLED: "true",
  AI_REPHRASE_ENABLED: "true",
  OPENAI_API_KEY: "test-key-not-a-real-secret",
};

const evidence = {
  record: {
    evidenceId: "e1-p10",
    sourceId: 5,
    provisionId: 10,
    provisionStatus: "published",
    sourceStatus: "in_force",
    freshnessStatus: "valid",
    provisionCreatedBy: "editor-a",
    provisionReviewedBy: "reviewer-b",
    provisionReviewedAt: "2026-08-01T02:00:00Z",
    sourceCreatedBy: "editor-a",
    sourceVerifiedBy: "reviewer-c",
    sourceLastVerifiedAt: "2026-08-20T02:00:00Z",
    freshnessPolicyVersion: "chat-evidence-freshness-v1",
    text: "Người điều khiển xe máy điện phải đội mũ bảo hiểm và cài quai đúng quy cách.",
    allowedClaims: ["Phải đội mũ bảo hiểm khi đi xe máy điện."],
  },
  entryId: 1,
  entryTopic: "Giao thông",
  score: 4,
  penalty: "Phạt tiền từ 400.000 đồng đến 600.000 đồng.",
  remedy: "Đội mũ bảo hiểm đạt chuẩn và cài quai đúng quy cách.",
  citation: {
    title: "Nghị định xử phạt vi phạm hành chính lĩnh vực giao thông",
    documentNumber: "168/2024/NĐ-CP",
    issuedAt: "2024-12-26",
    article: "7",
    clause: "2",
    point: "a",
    effectiveFrom: "2025-01-01",
    lastVerifiedAt: "2026-08-20",
  },
  sourceLink: {
    title: "168/2024/NĐ-CP — Nghị định xử phạt vi phạm hành chính lĩnh vực giao thông",
    url: "https://vanban.chinhphu.vn/nghi-dinh-168-2024",
  },
};

const composition = {
  conclusion: {
    text: "Đi xe máy điện mà không đội mũ bảo hiểm là hành vi bị xử phạt hành chính.",
    evidenceIds: ["e1-p10"],
  },
  explanation: [
    {
      text: "Quy định yêu cầu người điều khiển xe máy điện đội mũ bảo hiểm và cài quai đúng quy cách.",
      evidenceIds: ["e1-p10"],
    },
  ],
  examples: [
    {
      title: "Đi học bằng xe máy điện",
      scenario: "Bạn chở em đi học và cả hai đều không đội mũ bảo hiểm.",
      outcome: "Cả người điều khiển và người ngồi sau đều có thể bị xử phạt.",
      evidenceIds: ["e1-p10"],
    },
  ],
  recommendedActions: [
    {
      text: "Luôn mang mũ bảo hiểm đạt chuẩn và cài quai trước khi khởi hành.",
      evidenceIds: ["e1-p10"],
    },
  ],
  warnings: [
    {
      text: "Mức xử lý cụ thể còn tùy tình tiết và độ tuổi của người vi phạm.",
      evidenceIds: ["e1-p10"],
    },
  ],
};

function composedOk() {
  return {
    ok: true,
    composition,
    model: "gpt-5.4-mini-2026-03-17",
    usage: { inputTokens: 120, outputTokens: 90 },
  };
}

const messages = [
  { role: "user", content: "Đi xe máy điện không đội mũ bảo hiểm bị phạt bao nhiêu?" },
];

function chatRequest(question) {
  return new Request("https://portal.test/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages: [{ role: "user", content: question }] }),
  });
}

const allowed = { allowed: true, status: 200, retryAfter: 0 };

test("phien ban chinh sach nhanh co kiem chung duoc ghim", () => {
  assert.equal(GROUNDED_ANSWER_POLICY_VERSION, "grounded-chat-v1");
});

test("mac dinh cho doi ngan hon nhieu so voi bo soan ngoai tuyen", () => {
  assert.deepEqual(readGroundedChatConfig({}), {
    enabled: false,
    timeoutMs: 2_500,
  });
  assert.equal(
    readGroundedChatConfig({ ...enabledEnv, AI_GROUNDED_TIMEOUT_MS: 1_800 })
      .timeoutMs,
    1_800,
  );
  assert.equal(
    readGroundedChatConfig({ ...enabledEnv, AI_GROUNDED_TIMEOUT_MS: 60_000 })
      .timeoutMs,
    2_500,
  );
});

test("co bat ca hai o khoa moi goi nha cung cap", async () => {
  let calls = 0;
  const compose = async () => {
    calls += 1;
    return composedOk();
  };

  assert.deepEqual(
    await findGroundedAnswer(messages, {
      compose,
      shortlist: async () => [evidence],
      runtimeEnv: { AI_REPHRASE_ENABLED: "true", OPENAI_API_KEY: "k" },
    }),
    { ok: false, code: "SURFACE_DISABLED" },
  );
  assert.deepEqual(
    await findGroundedAnswer(messages, {
      compose,
      shortlist: async () => [evidence],
      runtimeEnv: { AI_GROUNDED_CHAT_ENABLED: "true" },
    }),
    { ok: false, code: "DISABLED" },
  );
  assert.equal(calls, 0);
});

test("co khoa tat thi khong cham toi du lieu", async () => {
  let loaded = 0;
  const result = await findGroundedAnswer(messages, {
    shortlist: async () => {
      loaded += 1;
      return [evidence];
    },
    compose: async () => composedOk(),
    runtimeEnv: {},
  });

  assert.deepEqual(result, { ok: false, code: "SURFACE_DISABLED" });
  assert.equal(loaded, 0);
});

test("khong co evidence thi khong goi nha cung cap", async () => {
  let calls = 0;
  const result = await findGroundedAnswer(messages, {
    shortlist: async () => [],
    compose: async () => {
      calls += 1;
      return composedOk();
    },
    runtimeEnv: enabledEnv,
  });

  assert.deepEqual(result, { ok: false, code: "NO_EVIDENCE" });
  assert.equal(calls, 0);
});

test("cau hoi noi tiep duoc ghep truoc khi lay du lieu va soan", async () => {
  let askedQuestion = null;
  let composedQuestion = null;
  const result = await findGroundedAnswer(
    [
      { role: "user", content: "Em 15 tuổi đi xe máy điện được không?" },
      { role: "assistant", content: "..." },
      { role: "user", content: "Vậy phạt bao nhiêu?" },
    ],
    {
      shortlist: async (question) => {
        askedQuestion = question;
        return [evidence];
      },
      compose: async (_config, request) => {
        composedQuestion = request.question;
        return composedOk();
      },
      runtimeEnv: enabledEnv,
    },
  );

  assert.equal(result.ok, true);
  assert.match(askedQuestion, /xe máy điện/);
  assert.match(askedQuestion, /phạt bao nhiêu/);
  assert.equal(composedQuestion, askedQuestion);
});

test("chi mot lan goi nha cung cap cho mot cau hoi", async () => {
  let calls = 0;
  const result = await findGroundedAnswer(messages, {
    shortlist: async () => [evidence],
    compose: async () => {
      calls += 1;
      return composedOk();
    },
    runtimeEnv: enabledEnv,
  });

  assert.equal(calls, 1);
  assert.equal(result.ok, true);
  assert.equal(result.answer.shortlistSize, 1);
  assert.equal(result.answer.citedEvidenceCount, 1);
  assert.equal(result.answer.model, "gpt-5.4-mini-2026-03-17");
  assert.equal(result.answer.inputTokens, 120);
  assert.equal(result.answer.outputTokens, 90);
  assert.equal(
    result.answer.freshnessPolicyVersion,
    "chat-evidence-freshness-v1",
  );
});

test("muc phat va can cu duoc dung lai tu du lieu chu khong tu mo hinh", async () => {
  const result = await findGroundedAnswer(messages, {
    shortlist: async () => [evidence],
    compose: async () => composedOk(),
    runtimeEnv: enabledEnv,
  });

  assert.equal(result.ok, true);
  const kinds = result.answer.sections.map((section) => section.kind);
  assert.deepEqual(kinds, [
    "summary",
    "details",
    "examples",
    "legal_basis",
    "sanctions",
    "next_steps",
    "limitations",
  ]);

  const sanctions = result.answer.sections.find(
    (section) => section.kind === "sanctions",
  );
  assert.deepEqual(sanctions.paragraphs, [evidence.penalty]);

  const legalBasis = result.answer.sections.find(
    (section) => section.kind === "legal_basis",
  );
  assert.ok(
    [...legalBasis.paragraphs, ...legalBasis.bullets].some((item) =>
      item.includes("168/2024/NĐ-CP"),
    ),
  );

  // Mọi chữ số hiển thị đều phải đến từ dữ liệu đã duyệt, không từ phần văn mô
  // hình viết ra.
  const modelProse = [
    ...result.answer.sections
      .filter((section) =>
        ["summary", "details", "examples"].includes(section.kind),
      )
      .flatMap((section) => [...section.paragraphs, ...section.bullets]),
  ].join(" ");
  assert.doesNotMatch(modelProse, /\d/);

  assert.deepEqual(result.answer.sources, [evidence.sourceLink]);
});

test("mo hinh khong trich dan evidence nao thi khong hien thi cau tra loi", async () => {
  const result = await findGroundedAnswer(messages, {
    shortlist: async () => [evidence],
    compose: async () => ({
      ...composedOk(),
      composition: {
        ...composition,
        conclusion: { text: composition.conclusion.text, evidenceIds: [] },
        explanation: [],
        examples: [],
        recommendedActions: [],
        warnings: [],
      },
    }),
    runtimeEnv: enabledEnv,
  });

  assert.deepEqual(result, { ok: false, code: "EMPTY_COMPOSITION" });
});

test("bo soan that bai thi tra ma loi de route di tiep", async () => {
  const result = await findGroundedAnswer(messages, {
    shortlist: async () => [evidence],
    compose: async () => ({ ok: false, code: "PROVIDER_TIMEOUT" }),
    runtimeEnv: enabledEnv,
  });

  assert.deepEqual(result, { ok: false, code: "PROVIDER_TIMEOUT" });
});

test("goi y hoi tiep do server dung, khong chua chu so va toi da ba y", () => {
  const followUps = suggestFollowUps([evidence]);

  assert.ok(followUps.length > 0);
  assert.ok(followUps.length <= 3);
  // Gợi ý là câu mẫu do server viết sẵn (nên mới được phép nhắc tới tuổi bằng
  // chữ số, điều mà văn bản do mô hình sinh ra bị cấm).
  assert.ok(followUps.every((text) => text.length <= 120));
  assert.deepEqual(parseChatFollowUps(followUps), followUps);
  assert.deepEqual(suggestFollowUps([]), []);
});

test("phia client bo qua goi y sai dinh dang", () => {
  assert.deepEqual(parseChatFollowUps("khong phai mang"), []);
  assert.deepEqual(parseChatFollowUps([1, null, "  "]), []);
  assert.deepEqual(parseChatFollowUps(["a".repeat(200)]), []);
  assert.deepEqual(parseChatFollowUps(["A", "A", "B", "C", "D"]), [
    "A",
    "B",
    "C",
  ]);
});

test("khong co ket luan thi khong dung duoc phan hien thi nao", () => {
  assert.deepEqual(
    renderGroundedSections(
      { ...composition, conclusion: { text: "   ", evidenceIds: ["e1-p10"] } },
      [evidence],
    ),
    [],
  );
});

test("route uu tien nhanh co kiem chung truoc kho trich nguyen van", async () => {
  let libraryCalls = 0;
  const chat = createChatHandler({
    limiter: () => ({ consumeChat: async () => allowed }),
    telemetry: { emit() {} },
    groundedAnswer: async () => ({
      ok: true,
      answer: {
        answer: "Kết luận: phải đội mũ bảo hiểm.",
        sections: [
          { kind: "summary", paragraphs: ["Phải đội mũ bảo hiểm."], bullets: [] },
        ],
        sources: [evidence.sourceLink],
        followUps: ["Bố mẹ em có phải chịu trách nhiệm cùng không?"],
        shortlistSize: 3,
        citedEvidenceCount: 1,
        model: "gpt-5.4-mini-2026-03-17",
        inputTokens: 120,
        outputTokens: 90,
        freshnessPolicyVersion: "chat-evidence-freshness-v1",
      },
    }),
    managedAnswer: async () => {
      libraryCalls += 1;
      return null;
    },
  });
  const response = await chat(
    chatRequest("Đi xe máy điện không đội mũ bảo hiểm bị phạt bao nhiêu?"),
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.mode, "knowledge");
  assert.equal(body.answerOrigin, "grounded_library");
  assert.deepEqual(body.followUps, [
    "Bố mẹ em có phải chịu trách nhiệm cùng không?",
  ]);
  assert.equal(libraryCalls, 0);
});

test("nhanh co kiem chung that bai thi cascade cu van tra loi", async () => {
  const emitted = [];
  const chat = createChatHandler({
    limiter: () => ({ consumeChat: async () => allowed }),
    telemetry: {
      emit(event) {
        emitted.push(event);
      },
    },
    groundedAnswer: async () => ({ ok: false, code: "PROVIDER_TIMEOUT" }),
    managedAnswer: async () => null,
  });
  const response = await chat(
    chatRequest("Bị nhóm bạn cô lập và đe dọa trong trường thì báo cho ai?"),
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.answerOrigin, "library");
  // Mã lỗi phải qua được `versionPattern` của telemetry (không có gạch dưới).
  assert.equal(emitted.at(-1).groundedCode, "provider-timeout");
});

test("cau hoi ban quyen van dung ngoai nhanh co kiem chung", async () => {
  let groundedCalls = 0;
  const chat = createChatHandler({
    limiter: () => ({ consumeChat: async () => allowed }),
    telemetry: { emit() {} },
    imageIntent: () => ({
      intent: "copyright",
      reasons: [],
      policyVersion: "image-intent-v1",
    }),
    groundedAnswer: async () => {
      groundedCalls += 1;
      return { ok: false, code: "NO_EVIDENCE" };
    },
    reviewedWebAnswer: async () => null,
  });
  await chat(chatRequest("Dùng ảnh trên mạng cho bài thuyết trình có sao không?"));

  assert.equal(groundedCalls, 0);
});

test("route chi cham toi bo soan qua dung mot module", async () => {
  const chatRoute = await readFile(
    new URL("../app/api/chat/route.ts", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(chatRoute, /openai-evidence|composeEvidenceAnswer/);
  assert.match(chatRoute, /@\/lib\/grounded-answer/);
});
