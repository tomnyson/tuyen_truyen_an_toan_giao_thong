import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";

globalThis.__knowledgeChatWorkerEnv = {};
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "cloudflare:workers") {
      return {
        shortCircuit: true,
        url: "data:text/javascript,export const env = globalThis.__knowledgeChatWorkerEnv",
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

const { routeQuestionToTopic, minimumRouteScore } = await import(
  "../lib/knowledge-router.ts"
);
const { findCuratedAnswer, findLibraryAnswer } = await import(
  "../lib/legal-chat.ts"
);
const { answerOrigins, answerOriginCopyOf, parseAnswerOrigin } = await import(
  "../lib/answer-origin.ts"
);
const { createChatHandler } = await import("../app/api/chat/route.ts");

const allowed = { allowed: true, status: 200, retryAfter: 0 };

function chatRequest(question) {
  return new Request("https://example.test/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ messages: [{ role: "user", content: question }] }),
  });
}

function sectionKinds(answer) {
  return answer.sections.map((section) => section.kind);
}

test("cau hoi doi thuc duoc dinh tuyen ve dung linh vuc", () => {
  assert.equal(
    routeQuestionToTopic("Bị nhóm bạn cô lập và đe dọa thì báo cho ai?")?.topic,
    "Bạo lực học đường",
  );
  assert.equal(
    routeQuestionToTopic("Bị rủ tụ tập đua xe ban đêm thì từ chối thế nào?")
      ?.topic,
    "An ninh trật tự",
  );
  assert.equal(
    routeQuestionToTopic("Không đội mũ bảo hiểm bị xử lý thế nào?")?.topic,
    "Giao thông",
  );
  // Gõ tắt một từ vẫn đủ mạnh để định tuyến.
  assert.equal(routeQuestionToTopic("ATGT")?.topic, "Giao thông");
  assert.equal(routeQuestionToTopic("BLHĐ")?.topic, "Bạo lực học đường");
  assert.ok(routeQuestionToTopic("ATGT").score >= minimumRouteScore);
});

test("cau hoi ngoai pham vi khong bi keo vao kho noi bo", () => {
  for (const question of [
    "Em ký hợp đồng làm thêm cuối tuần có được không?",
    "Em muốn xin visa du học Nhật thì cần gì?",
    "Thủ tục đăng ký kết hôn ra sao?",
    "   ",
  ]) {
    assert.equal(routeQuestionToTopic(question), null, question);
    assert.equal(findLibraryAnswer(question), null, question);
  }
});

test("kho noi bo tra loi linh vuc chua co can cu ma khong bia dan chung", () => {
  const answer = findLibraryAnswer(
    "Bị nhóm bạn cô lập và đe dọa trong trường thì báo cho ai?",
  );
  assert.ok(answer);
  const kinds = sectionKinds(answer);
  // Chưa có citation/sanction đã duyệt thì tuyệt đối không dựng hai khối này.
  assert.ok(!kinds.includes("legal_basis"));
  assert.ok(!kinds.includes("sanctions"));
  assert.equal(answer.sources, undefined);
  assert.deepEqual(kinds, ["summary", "examples", "next_steps", "limitations"]);
  const limitations = answer.sections.at(-1).paragraphs.join(" ");
  assert.match(limitations, /Đang kiểm chứng căn cứ hiện hành/);
  assert.match(limitations, /Chưa công bố mức tham khảo/);
  assert.doesNotMatch(answer.answer, /Nghị định|Điều \d/);
});

test("kho noi bo giu nguyen can cu da duyet bon mat", () => {
  const answer = findLibraryAnswer(
    "Chở ba bạn đi học không đội mũ bảo hiểm có bị phạt không?",
  );
  assert.ok(answer);
  const kinds = sectionKinds(answer);
  assert.ok(kinds.includes("legal_basis"));
  assert.ok(kinds.includes("sanctions"));
  // Thứ tự khối luôn theo bảng CHAT_ANSWER_SECTION_KINDS.
  assert.deepEqual(kinds, [...kinds].sort((left, right) =>
    ["summary", "details", "examples", "legal_basis", "sanctions", "legal_remedies", "next_steps", "limitations"].indexOf(left) -
    ["summary", "details", "examples", "legal_basis", "sanctions", "legal_remedies", "next_steps", "limitations"].indexOf(right),
  ));
  assert.equal(answer.sources.length, 1);
  assert.match(answer.sources[0].url, /^https:\/\//);
});

test("curated fallback ve kho noi bo cho linh vuc moi", () => {
  const answer = findCuratedAnswer(
    "Bị rủ mang hung khí và tụ tập đua xe thì làm sao?",
  );
  assert.ok(answer);
  assert.match(answer.answer, /An ninh trật tự/);
  assert.doesNotMatch(answer.answer, /131\/2013|341\/2025/);
});

test("nhan nguon tra loi hop le va tu choi gia tri la", () => {
  assert.deepEqual(
    [...answerOrigins],
    ["library", "grounded_library", "reviewed_web", "live_web"],
  );
  assert.equal(answerOriginCopyOf("library").label, "Kho nội dung của cổng");
  assert.match(answerOriginCopyOf("live_web").detail, /đối chiếu với văn bản gốc/);
  assert.equal(parseAnswerOrigin("library"), "library");
  assert.equal(parseAnswerOrigin("internal"), null);
  assert.equal(parseAnswerOrigin(null), null);
});

test("kho noi bo khop thi khong goi bat ky tra cuu ngoai nao", async () => {
  let externalCalls = 0;
  const countExternal = () => {
    externalCalls += 1;
    return null;
  };
  const chat = createChatHandler({
    limiter: () => ({ consumeChat: async () => allowed }),
    telemetry: { emit() {} },
    managedAnswer: async () => null,
    reviewedWebAnswer: async () => countExternal(),
    webSearch: async () => countExternal(),
    referenceWebSearch: async () => countExternal(),
  });
  const response = await chat(
    chatRequest("Bị nhóm bạn cô lập và đe dọa trong trường thì báo cho ai?"),
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.mode, "knowledge");
  assert.equal(body.answerOrigin, "library");
  assert.equal(externalCalls, 0);
});

test("kho noi bo khong khop moi chuyen sang nguon ngoai da duyet", async () => {
  const chat = createChatHandler({
    limiter: () => ({ consumeChat: async () => allowed }),
    telemetry: { emit() {} },
    managedAnswer: async () => null,
    curatedAnswer: () => null,
    reviewedWebAnswer: async () => ({
      answer: "Kết luận: Hãy mở nguồn chính thức và kiểm tra trường hợp cụ thể.",
      sources: [{ title: "Nguồn Chính phủ", url: "https://vbpl.vn/document" }],
      citations: [],
      candidateId: "44444444-4444-4444-8444-444444444444",
      policyVersion: "reviewed-web-candidate-v1",
    }),
  });
  const response = await chat(chatRequest("Nội dung đã duyệt là gì?"));
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.mode, "knowledge");
  assert.equal(body.answerOrigin, "reviewed_web");
});

test("cau ngoai pham vi van fail-closed khi khong co fallback", async () => {
  const chat = createChatHandler({
    limiter: () => ({ consumeChat: async () => allowed }),
    telemetry: { emit() {} },
    managedAnswer: async () => null,
    reviewedWebAnswer: async () => null,
  });
  const response = await chat(
    chatRequest("Em ký hợp đồng làm thêm cuối tuần có được không?"),
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.mode, "unavailable");
  assert.equal(body.answerOrigin, undefined);
  assert.match(body.answer, /chưa có trong dữ liệu/);
});
