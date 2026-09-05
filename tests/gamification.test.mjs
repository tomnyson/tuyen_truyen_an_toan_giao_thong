import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/")) {
      return {
        shortCircuit: true,
        url: new URL(`../${specifier.slice(2)}.ts`, import.meta.url).href,
      };
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

const {
  boundedPoints,
  defaultBadges,
  gameAwardKeyInput,
  gameHashKey,
  gamePlayerKeyInput,
  gameProgressOf,
  maxAwardPoints,
  parseBadgeDefinitions,
  parseGameAction,
  parseGameProgress,
  parsePublicQuizQuestions,
  parseQuizGrade,
  parseQuizOptionList,
  pointsToNextBadge,
  sortBadges,
  toPublicQuizQuestion,
} = await import("../lib/gamification.ts");
const {
  maxQuestionsPerTopic,
  minQuestionsPerTopic,
  quizQuestions,
  quizQuestionsOfTopic,
  findQuizQuestion,
  validateQuizBank,
} = await import("../lib/quiz-content.ts");

const clientId = "a".repeat(32);

test("ngan hang cau hoi seed hop le va moi chu de co 3-5 cau", () => {
  assert.deepEqual(validateQuizBank(quizQuestions), []);
  const topics = new Set(quizQuestions.map((question) => question.topic));
  assert.ok(topics.size >= 4);
  for (const topic of topics) {
    const count = quizQuestionsOfTopic(topic).length;
    assert.ok(
      count >= minQuestionsPerTopic && count <= maxQuestionsPerTopic,
      `chu de ${topic} co ${count} cau`,
    );
  }
});

test("moi cau hoi co giai thich va can cu da duyet", () => {
  for (const question of quizQuestions) {
    assert.ok(question.explanation.length > 10, `cau ${question.id}`);
    assert.ok(question.legalBasis.length > 0, `cau ${question.id}`);
    assert.ok(question.correctIndex < question.options.length);
    // Không được tự chế căn cứ: nếu có link thì phải là văn bản gốc https.
    if (question.sourceUrl) {
      assert.match(question.sourceUrl, /^https:\/\//);
    }
  }
});

test("validateQuizBank bat loi ngan hang hong", () => {
  const [first] = quizQuestions;
  const broken = [{ ...first, correctIndex: 99 }];
  assert.ok(validateQuizBank(broken).length > 0);
  const duplicated = [first, { ...first, prompt: "khac" }];
  assert.ok(validateQuizBank(duplicated).length > 0);
});

test("ban chieu cong khai khong lo dap an", () => {
  const question = quizQuestions[0];
  const item = toPublicQuizQuestion(question);
  assert.equal(item.correctIndex, undefined);
  assert.equal(item.explanation, undefined);
  assert.deepEqual([...item.options], [...question.options]);
  const parsed = parsePublicQuizQuestions(
    quizQuestions.map(toPublicQuizQuestion),
  );
  assert.equal(parsed?.length, quizQuestions.length);
  assert.equal(parsePublicQuizQuestions([{ id: 0 }]), null);
});

test("findQuizQuestion tra ve dung cau", () => {
  const question = quizQuestions[0];
  assert.equal(findQuizQuestion(question.id)?.prompt, question.prompt);
  assert.equal(findQuizQuestion(999_999), null);
});

test("parseGameAction chan payload sai", () => {
  assert.equal(parseGameAction(null), null);
  assert.equal(parseGameAction({ kind: "progress" }), null);
  assert.equal(parseGameAction({ kind: "progress", clientId: "xyz" }), null);
  assert.deepEqual(parseGameAction({ kind: "progress", clientId }), {
    kind: "progress",
    clientId,
  });
  assert.equal(
    parseGameAction({ kind: "quiz-answer", clientId, questionId: 0, choiceIndex: 1 }),
    null,
  );
  assert.equal(
    parseGameAction({ kind: "quiz-answer", clientId, questionId: 1, choiceIndex: 9 }),
    null,
  );
  assert.deepEqual(
    parseGameAction({ kind: "quiz-answer", clientId, questionId: 3, choiceIndex: 2 }),
    { kind: "quiz-answer", clientId, questionId: 3, choiceIndex: 2 },
  );
  assert.equal(
    parseGameAction({ kind: "roleplay-outcome", clientId, scenarioId: 1, nodeKey: "KHONG HOP LE" }),
    null,
  );
  assert.equal(parseGameAction({ kind: "tu-che", clientId }), null);
});

test("diem va huy hieu quy doi theo cau hinh", () => {
  const empty = gameProgressOf(0);
  assert.equal(empty.points, 0);
  assert.deepEqual(empty.badges, []);
  assert.equal(empty.nextBadge?.code, sortBadges(defaultBadges)[0].code);
  assert.equal(pointsToNextBadge(empty), sortBadges(defaultBadges)[0].thresholdPoints);

  const badges = [
    { code: "moc-a", name: "Mốc A", icon: "★", description: "", thresholdPoints: 10 },
    { code: "moc-b", name: "Mốc B", icon: "★", description: "", thresholdPoints: 30 },
  ];
  const progress = gameProgressOf(12, badges);
  assert.deepEqual(
    progress.badges.map((badge) => badge.code),
    ["moc-a"],
  );
  assert.equal(progress.nextBadge?.code, "moc-b");
  assert.equal(pointsToNextBadge(progress), 18);
  assert.equal(gameProgressOf(-5, badges).points, 0);
  assert.equal(gameProgressOf(999, badges).nextBadge, null);
});

test("boundedPoints va parseQuizOptionList giu bien", () => {
  assert.equal(boundedPoints(0), 1);
  assert.equal(boundedPoints(1_000), maxAwardPoints);
  assert.equal(boundedPoints("khong phai so"), 1);
  assert.equal(parseQuizOptionList(["chi mot"]), null);
  assert.equal(parseQuizOptionList(["a", "b", "c", "d", "e"]), null);
  assert.deepEqual(parseQuizOptionList([" a ", "b"]), ["a", "b"]);
  assert.equal(parseQuizOptionList(["a", ""]), null);
});

test("parseBadgeDefinitions va parseGameProgress chan du lieu rac", () => {
  assert.equal(parseBadgeDefinitions([{ code: "KHONG HOP LE" }]), null);
  assert.equal(parseGameProgress("khong phai object"), null);
  const parsed = parseGameProgress(gameProgressOf(25));
  assert.equal(parsed?.points, 25);
});

test("parseQuizGrade doi du truong bat buoc", () => {
  const grade = {
    questionId: 1,
    correct: true,
    correctIndex: 1,
    explanation: "giai thich",
    legalBasis: "can cu",
    sourceUrl: "",
    awardedPoints: 10,
    progress: gameProgressOf(10),
  };
  assert.equal(parseQuizGrade(grade)?.awardedPoints, 10);
  assert.equal(parseQuizGrade({ ...grade, correct: "co" }), null);
  assert.equal(parseQuizGrade({ ...grade, progress: null }), null);
});

test("khoa nguoi choi la hash mot chieu, khong chua token goc", async () => {
  const playerKey = await gameHashKey(gamePlayerKeyInput(clientId));
  assert.match(playerKey, /^[0-9a-f]{64}$/);
  assert.ok(!playerKey.includes(clientId));
  const awardKey = await gameHashKey(gameAwardKeyInput(clientId, "quiz", "7"));
  assert.match(awardKey, /^[0-9a-f]{64}$/);
  assert.notEqual(awardKey, playerKey);
  // Cùng đầu vào cho cùng khóa: nhờ vậy mới chống cộng điểm trùng được.
  assert.equal(
    awardKey,
    await gameHashKey(gameAwardKeyInput(clientId, "quiz", "7")),
  );
  assert.notEqual(
    awardKey,
    await gameHashKey(gameAwardKeyInput(clientId, "roleplay", "7")),
  );
});
