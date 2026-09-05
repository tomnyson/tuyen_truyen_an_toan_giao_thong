import { getInitializedDb } from "@/db";
import {
  defaultBadges,
  gameAwardKeyInput,
  gameHashKey,
  gamePlayerKeyInput,
  gameProgressOf,
  gamificationPolicyVersion,
  parseGameAction,
  sortBadges,
  toPublicQuizQuestion,
  type BadgeDefinition,
  type GameAction,
  type GameProgress,
  type QuizQuestion,
} from "@/lib/gamification";
import {
  awardGamePoints,
  readBadgeDefinitions,
  readGamePoints,
  readManagedQuizQuestions,
  readManagedRoleplayScenarios,
  type GameDb,
} from "@/lib/game-store";
import { quizQuestions } from "@/lib/quiz-content";
import { findRoleplayNode, type RoleplayScenario } from "@/lib/roleplay";
import { roleplayScenarios } from "@/lib/roleplay-content";

const noStore = { "Cache-Control": "no-store" } as const;

type GameDeps = Readonly<{
  loadDb?: () => Promise<GameDb>;
  loadQuestions?: (db: GameDb | null) => Promise<readonly QuizQuestion[]>;
  loadScenarios?: (db: GameDb | null) => Promise<readonly RoleplayScenario[]>;
  loadBadges?: (db: GameDb | null) => Promise<readonly BadgeDefinition[]>;
}>;

// Nội dung seed luôn có sẵn kể cả khi database chưa sẵn sàng, nên phần chơi
// không bao giờ trắng màn hình; chỉ phần tích điểm mới cần database.
async function defaultQuestions(db: GameDb | null) {
  if (!db) return quizQuestions;
  const managed = await readManagedQuizQuestions(db).catch(() => []);
  return [...quizQuestions, ...managed];
}

async function defaultScenarios(db: GameDb | null) {
  if (!db) return roleplayScenarios;
  const managed = await readManagedRoleplayScenarios(db).catch(() => []);
  return [...roleplayScenarios, ...managed];
}

async function defaultBadgeList(db: GameDb | null) {
  if (!db) return undefined;
  return readBadgeDefinitions(db).catch(() => undefined);
}

async function progressOf(
  db: GameDb,
  clientId: string,
  badges: readonly BadgeDefinition[] | undefined,
): Promise<GameProgress> {
  const playerKey = await gameHashKey(gamePlayerKeyInput(clientId));
  const points = await readGamePoints(db, playerKey);
  return badges ? gameProgressOf(points, badges) : gameProgressOf(points);
}

async function awardAndRead(
  db: GameDb,
  clientId: string,
  kind: "quiz" | "roleplay",
  reference: string,
  points: number,
  badges: readonly BadgeDefinition[] | undefined,
): Promise<Readonly<{ progress: GameProgress; awardedPoints: number }>> {
  const playerKey = await gameHashKey(gamePlayerKeyInput(clientId));
  const awardKey = await gameHashKey(
    gameAwardKeyInput(clientId, kind, reference),
  );
  const result = await awardGamePoints(db, playerKey, awardKey, points);
  return Object.freeze({
    progress: badges
      ? gameProgressOf(result.points, badges)
      : gameProgressOf(result.points),
    awardedPoints: result.awarded ? points : 0,
  });
}

export function createGameHandlers(deps: GameDeps = {}) {
  const loadDb = deps.loadDb ?? (() => getInitializedDb() as Promise<GameDb>);
  const loadQuestions = deps.loadQuestions ?? defaultQuestions;
  const loadScenarios = deps.loadScenarios ?? defaultScenarios;
  const loadBadges = deps.loadBadges ?? defaultBadgeList;

  async function openDb(): Promise<GameDb | null> {
    return loadDb().catch(() => null);
  }

  async function get() {
    const db = await openDb();
    const [questions, scenarios, badges] = await Promise.all([
      loadQuestions(db),
      loadScenarios(db),
      loadBadges(db),
    ]);
    return Response.json(
      {
        // Bản chiếu công khai: đáp án đúng và giải thích chỉ được trả về sau
        // khi người chơi đã chọn, nên không thể "xem trộm" từ payload.
        questions: questions.map(toPublicQuizQuestion),
        scenarios,
        badges: sortBadges(badges ?? defaultBadges),
        policyVersion: gamificationPolicyVersion,
      },
      { headers: noStore },
    );
  }

  async function handleQuiz(
    db: GameDb,
    action: Extract<GameAction, { kind: "quiz-answer" }>,
  ) {
    const questions = await loadQuestions(db);
    const question = questions.find((item) => item.id === action.questionId);
    if (!question) {
      return Response.json(
        { error: "GAME_QUESTION_NOT_FOUND" },
        { status: 404, headers: noStore },
      );
    }
    if (action.choiceIndex >= question.options.length) {
      return Response.json(
        { error: "GAME_REQUEST_INVALID" },
        { status: 400, headers: noStore },
      );
    }
    const badges = await loadBadges(db);
    const correct = action.choiceIndex === question.correctIndex;
    const outcome = correct
      ? await awardAndRead(
          db,
          action.clientId,
          "quiz",
          String(question.id),
          question.points,
          badges,
        )
      : {
          progress: await progressOf(db, action.clientId, badges),
          awardedPoints: 0,
        };
    return Response.json(
      {
        grade: {
          questionId: question.id,
          correct,
          correctIndex: question.correctIndex,
          explanation: question.explanation,
          legalBasis: question.legalBasis,
          sourceUrl: question.sourceUrl ?? "",
          awardedPoints: outcome.awardedPoints,
          progress: outcome.progress,
        },
      },
      { headers: noStore },
    );
  }

  async function handleRoleplay(
    db: GameDb,
    action: Extract<GameAction, { kind: "roleplay-outcome" }>,
  ) {
    const scenarios = await loadScenarios(db);
    const scenario = scenarios.find((item) => item.id === action.scenarioId);
    const node = scenario ? findRoleplayNode(scenario, action.nodeKey) : null;
    // Chỉ nút kết cục mới được cộng điểm: gửi thẳng mã nút giữa chừng không
    // giúp tích điểm nhanh hơn.
    if (!scenario || !node || node.kind !== "outcome") {
      return Response.json(
        { error: "GAME_OUTCOME_NOT_FOUND" },
        { status: 404, headers: noStore },
      );
    }
    const badges = await loadBadges(db);
    const outcome = await awardAndRead(
      db,
      action.clientId,
      "roleplay",
      `${scenario.id}:${node.key}`,
      node.points,
      badges,
    );
    return Response.json(
      {
        outcome: {
          scenarioId: scenario.id,
          nodeKey: node.key,
          awardedPoints: outcome.awardedPoints,
          progress: outcome.progress,
        },
      },
      { headers: noStore },
    );
  }

  async function post(request: Request) {
    const body = await request.json().catch(() => null);
    const action = parseGameAction(body);
    if (!action) {
      return Response.json(
        { error: "GAME_REQUEST_INVALID" },
        { status: 400, headers: noStore },
      );
    }
    let db: GameDb;
    try {
      db = await loadDb();
    } catch {
      return Response.json(
        { error: "GAME_DEPENDENCY_UNAVAILABLE" },
        { status: 503, headers: noStore },
      );
    }
    try {
      if (action.kind === "quiz-answer") return await handleQuiz(db, action);
      if (action.kind === "roleplay-outcome") {
        return await handleRoleplay(db, action);
      }
      const badges = await loadBadges(db);
      const progress = await progressOf(db, action.clientId, badges);
      return Response.json({ progress }, { headers: noStore });
    } catch {
      return Response.json(
        { error: "GAME_DEPENDENCY_UNAVAILABLE" },
        { status: 503, headers: noStore },
      );
    }
  }

  return { get, post };
}

const handlers = createGameHandlers();

export async function GET() {
  return handlers.get();
}

export async function POST(request: Request) {
  return handlers.post(request);
}
