import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";

globalThis.__gameWorkerEnv ??= {};
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "cloudflare:workers") {
      return {
        shortCircuit: true,
        url: "data:text/javascript,globalThis.__gameWorkerEnv ??= {}; export const env = globalThis.__gameWorkerEnv;",
      };
    }
    if (specifier === "@/db") {
      return {
        shortCircuit: true,
        url: new URL("../db/index.ts", import.meta.url).href,
      };
    }
    if (specifier.startsWith("@/")) {
      return {
        shortCircuit: true,
        url: new URL(`../${specifier.slice(2)}.ts`, import.meta.url).href,
      };
    }
    if (specifier === "next/server") {
      return nextResolve("next/server.js", context);
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

const { createGameHandlers } = await import("../app/api/game/route.ts");
const { defaultBadges } = await import("../lib/gamification.ts");
const { quizQuestions } = await import("../lib/quiz-content.ts");
const { roleplayScenarios } = await import("../lib/roleplay-content.ts");

const clientId = "b".repeat(32);
const otherClientId = "c".repeat(32);

// Lấy phần chữ và tham số của câu lệnh drizzle để giả lập database bằng bộ nhớ.
function partsOf(query) {
  const chunks = query?.queryChunks ?? [];
  let text = "";
  const params = [];
  for (const chunk of chunks) {
    if (chunk && Array.isArray(chunk.value)) text += chunk.value.join("");
    else if (chunk && typeof chunk === "object" && "value" in chunk) {
      params.push(chunk.value);
    } else params.push(chunk);
  }
  return { text, params };
}

function fakeDb() {
  const points = new Map();
  const awards = new Set();
  return {
    points,
    awards,
    async execute(query) {
      const { text, params } = partsOf(query);
      if (text.includes("game_awards")) {
        const [awardKey, playerKey, amount] = params;
        const first = !awards.has(awardKey);
        if (first) {
          awards.add(awardKey);
          points.set(playerKey, (points.get(playerKey) ?? 0) + amount);
        }
        return { rows: [{ points: points.get(playerKey) ?? 0, awarded: first }] };
      }
      if (text.includes("FROM game_progress")) {
        return { rows: [{ points: points.get(params[0]) ?? 0 }] };
      }
      return { rows: [] };
    },
  };
}

function handlersWith(db, overrides = {}) {
  return createGameHandlers({
    loadDb: async () => {
      if (!db) throw new Error("database unavailable");
      return db;
    },
    loadQuestions: async () => quizQuestions,
    loadScenarios: async () => roleplayScenarios,
    loadBadges: async () => defaultBadges,
    ...overrides,
  });
}

function post(body) {
  return new Request("https://example.test/api/game", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const firstQuestion = quizQuestions[0];
const firstScenario = roleplayScenarios[0];
const firstOutcome = firstScenario.nodes.find((node) => node.kind === "outcome");

test("GET tra ve noi dung nhung khong lo dap an", async () => {
  const response = await handlersWith(fakeDb()).get();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  const body = await response.json();
  assert.equal(body.questions.length, quizQuestions.length);
  for (const question of body.questions) {
    assert.equal(question.correctIndex, undefined);
    assert.equal(question.explanation, undefined);
  }
  assert.equal(body.scenarios.length, roleplayScenarios.length);
  assert.ok(body.badges.length > 0);
  assert.equal(body.policyVersion, "gamification-v1");
});

test("GET van chay khi database chua san sang", async () => {
  const response = await createGameHandlers({
    loadDb: async () => {
      throw new Error("database unavailable");
    },
  }).get();
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.questions.length, quizQuestions.length);
});

test("tra loi dung duoc cong diem, tra loi lai khong cong them", async () => {
  const db = fakeDb();
  const handlers = handlersWith(db);
  const first = await handlers.post(
    post({
      kind: "quiz-answer",
      clientId,
      questionId: firstQuestion.id,
      choiceIndex: firstQuestion.correctIndex,
    }),
  );
  const firstBody = await first.json();
  assert.equal(first.status, 200);
  assert.equal(firstBody.grade.correct, true);
  assert.equal(firstBody.grade.awardedPoints, firstQuestion.points);
  assert.equal(firstBody.grade.explanation, firstQuestion.explanation);
  assert.equal(firstBody.grade.legalBasis, firstQuestion.legalBasis);
  assert.equal(firstBody.grade.progress.points, firstQuestion.points);

  const again = await handlers.post(
    post({
      kind: "quiz-answer",
      clientId,
      questionId: firstQuestion.id,
      choiceIndex: firstQuestion.correctIndex,
    }),
  );
  const againBody = await again.json();
  assert.equal(againBody.grade.awardedPoints, 0);
  assert.equal(againBody.grade.progress.points, firstQuestion.points);
});

test("tra loi sai khong cong diem nhung van co giai thich va can cu", async () => {
  const db = fakeDb();
  const wrongIndex = firstQuestion.correctIndex === 0 ? 1 : 0;
  const response = await handlersWith(db).post(
    post({
      kind: "quiz-answer",
      clientId,
      questionId: firstQuestion.id,
      choiceIndex: wrongIndex,
    }),
  );
  const body = await response.json();
  assert.equal(body.grade.correct, false);
  assert.equal(body.grade.awardedPoints, 0);
  assert.equal(body.grade.correctIndex, firstQuestion.correctIndex);
  assert.ok(body.grade.legalBasis.length > 0);
  assert.equal(body.grade.progress.points, 0);
});

test("diem cua moi trinh duyet tach biet", async () => {
  const db = fakeDb();
  const handlers = handlersWith(db);
  await handlers.post(
    post({
      kind: "quiz-answer",
      clientId,
      questionId: firstQuestion.id,
      choiceIndex: firstQuestion.correctIndex,
    }),
  );
  const response = await handlers.post(
    post({ kind: "progress", clientId: otherClientId }),
  );
  const body = await response.json();
  assert.equal(body.progress.points, 0);
});

test("chi nut ket cuc moi duoc cong diem nhap vai", async () => {
  const db = fakeDb();
  const handlers = handlersWith(db);
  const response = await handlers.post(
    post({
      kind: "roleplay-outcome",
      clientId,
      scenarioId: firstScenario.id,
      nodeKey: firstOutcome.key,
    }),
  );
  const body = await response.json();
  assert.equal(body.outcome.awardedPoints, firstOutcome.points);
  assert.equal(body.outcome.progress.points, firstOutcome.points);

  const midway = await handlers.post(
    post({
      kind: "roleplay-outcome",
      clientId,
      scenarioId: firstScenario.id,
      nodeKey: firstScenario.startKey,
    }),
  );
  assert.equal(midway.status, 404);
  assert.equal((await midway.json()).error, "GAME_OUTCOME_NOT_FOUND");
});

test("payload sai bi tu choi, cau hoi khong ton tai tra 404", async () => {
  const handlers = handlersWith(fakeDb());
  const invalid = await handlers.post(post({ kind: "progress" }));
  assert.equal(invalid.status, 400);
  assert.equal((await invalid.json()).error, "GAME_REQUEST_INVALID");

  const missing = await handlers.post(
    post({ kind: "quiz-answer", clientId, questionId: 987_654, choiceIndex: 0 }),
  );
  assert.equal(missing.status, 404);
  assert.equal((await missing.json()).error, "GAME_QUESTION_NOT_FOUND");

  const outOfRange = await handlers.post(
    post({
      kind: "quiz-answer",
      clientId,
      questionId: firstQuestion.id,
      choiceIndex: 3,
    }),
  );
  assert.equal(
    outOfRange.status,
    firstQuestion.options.length > 3 ? 200 : 400,
  );
});

test("mat database thi tra 503 chu khong im lang", async () => {
  const response = await handlersWith(null).post(
    post({ kind: "progress", clientId }),
  );
  assert.equal(response.status, 503);
  assert.equal((await response.json()).error, "GAME_DEPENDENCY_UNAVAILABLE");
});
