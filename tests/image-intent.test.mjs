import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";

globalThis.__imageIntentWorkerEnv = {};
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "cloudflare:workers") {
      return {
        shortCircuit: true,
        url: "data:text/javascript,export const env = globalThis.__imageIntentWorkerEnv",
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
  classifyImageIntent,
  imageIntentPolicyVersion,
  privacySafetyGuidance,
} = await import("../lib/image-intent.ts");
const { createChatHandler } = await import("../app/api/chat/route.ts");

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

function handler(overrides = {}) {
  return createChatHandler({
    limiter: () => ({ consumeChat: async () => allowed }),
    telemetry: { emit() {} },
    ...overrides,
  });
}

for (const [question, intent, expectedReasons] of [
  [
    "Ảnh riêng tư của em bị phát tán mà chưa đồng ý",
    "privacy_safety",
    ["non_consensual_sharing", "sensitive_image"],
  ],
  [
    "Anh rieng tu cua em bi phat tan ma chua dong y",
    "privacy_safety",
    ["non_consensual_sharing", "sensitive_image"],
  ],
  [
    "Ảnh nhạy cảm bị gửi vào nhóm lớp",
    "privacy_safety",
    [
      "non_consensual_sharing",
      "sensitive_image",
      "peer_or_group_context",
    ],
  ],
  [
    "Ảnh của bạn học bị chuyển tiếp trong nhóm lớp",
    "privacy_safety",
    ["non_consensual_sharing", "peer_or_group_context"],
  ],
  [
    "Em muốn xin phép tác giả sử dụng ảnh cho bài học",
    "copyright",
    ["authorship", "license_or_permission"],
  ],
  [
    "Can ghi nguon va giay phep cho hinh anh nhu the nao?",
    "copyright",
    ["license_or_permission", "attribution"],
  ],
  [
    "Em chưa xin phép tác giả sử dụng ảnh cho bài học",
    "copyright",
    ["authorship", "license_or_permission"],
  ],
  ["hình ảnh", "unknown", ["ambiguous"]],
]) {
  test(`classifies image intent: ${question}`, () => {
    const decision = classifyImageIntent(question);
    assert.equal(decision.intent, intent);
    assert.deepEqual(decision.reasons, expectedReasons);
    assert.equal(decision.policyVersion, imageIntentPolicyVersion);
    assert.ok(Object.isFrozen(decision));
    assert.ok(Object.isFrozen(decision.reasons));
  });
}

test("privacy signals take precedence over copyright in mixed-risk questions", () => {
  const decision = classifyImageIntent(
    "Ảnh riêng tư của bạn học bị đăng lại; em có cần xin phép tác giả và ghi nguồn không?",
  );
  assert.equal(decision.intent, "privacy_safety");
  assert.ok(decision.reasons.includes("non_consensual_sharing"));
  assert.ok(decision.reasons.includes("sensitive_image"));
  assert.ok(decision.reasons.includes("peer_or_group_context"));
  assert.ok(decision.reasons.includes("authorship"));
  assert.ok(decision.reasons.includes("license_or_permission"));
  assert.ok(decision.reasons.includes("attribution"));
});

for (const question of [
  "Việc này ảnh hưởng sức khỏe thế nào?",
  "Em xin phép lái xe được không?",
  "Có cần ghi nguồn nước trong bài không?",
  "Từ ghép hìnhảnh không phải phrase hợp lệ",
  "Chuỗi bảnquyền không có token boundary",
]) {
  test(`does not classify substring or unanchored traps: ${question}`, () => {
    assert.deepEqual(classifyImageIntent(question), {
      intent: "unknown",
      reasons: [],
      policyVersion: imageIntentPolicyVersion,
    });
  });
}

test("privacy route bypasses competing managed content and returns safe actions", async () => {
  let managedCalls = 0;
  let curatedCalls = 0;
  const chat = handler({
    managedAnswer: async () => {
      managedCalls += 1;
      return "WRONG_MANAGED_COPYRIGHT";
    },
    curatedAnswer: () => {
      curatedCalls += 1;
      return "WRONG_CURATED_COPYRIGHT";
    },
  });
  const response = await chat(
    chatRequest("Ảnh nhạy cảm của bạn học đang bị phát tán trong nhóm lớp"),
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.mode, "knowledge");
  assert.equal(body.answer, privacySafetyGuidance.answer);
  assert.equal(managedCalls, 0);
  assert.equal(curatedCalls, 0);
  assert.match(body.answer, /dừng chia sẻ/i);
  assert.match(body.answer, /không phát tán/i);
  assert.match(body.answer, /lưu bằng chứng/i);
  assert.match(body.answer, /phụ huynh/i);
  assert.match(body.answer, /giáo viên/i);
  assert.match(body.answer, /cơ quan phù hợp/i);
  assert.match(body.answer, /không cần cung cấp hình ảnh, họ tên, trường hoặc lớp/i);
  assert.doesNotMatch(body.answer, /WRONG_|gửi ảnh cho hệ thống|tải ảnh lên/i);
});

test("copyright fails closed before untagged managed or curated weak matches", async () => {
  let managedCalls = 0;
  let curatedCalls = 0;
  const chat = handler({
    managedAnswer: async () => {
      managedCalls += 1;
      return "WRONG_PRIVACY_ANSWER";
    },
    curatedAnswer: () => {
      curatedCalls += 1;
      return "WRONG_COPYRIGHT_ANSWER";
    },
  });
  const response = await chat(
    chatRequest("Em xin phép tác giả dùng ảnh và ghi nguồn thế nào?"),
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.mode, "unavailable");
  assert.equal(managedCalls, 0);
  assert.equal(curatedCalls, 0);
  assert.doesNotMatch(body.answer, /WRONG_/);
});

test("ambiguous generic image question fails closed instead of guessing", async () => {
  let managedCalls = 0;
  const chat = handler({
    managedAnswer: async () => {
      managedCalls += 1;
      return "WRONG_GUESS";
    },
  });
  const response = await chat(chatRequest("Cho em hỏi về hình ảnh"));
  const body = await response.json();

  assert.equal(body.mode, "unavailable");
  assert.equal(managedCalls, 0);
  assert.doesNotMatch(body.answer, /WRONG_GUESS/);
});

test("non-image questions preserve the existing managed then curated flow", async () => {
  let managedCalls = 0;
  const chat = handler({
    managedAnswer: async () => {
      managedCalls += 1;
      return null;
    },
    curatedAnswer: () => "Câu trả lời giao thông hiện có",
  });
  const response = await chat(
    chatRequest("Không đội mũ bảo hiểm bị phạt thế nào?"),
  );
  const body = await response.json();

  assert.equal(body.mode, "knowledge");
  assert.equal(body.answer, "Câu trả lời giao thông hiện có");
  assert.equal(managedCalls, 1);
});
