// Truy vấn dữ liệu game hóa (US-035 quiz/điểm/huy hiệu, US-036 nhập vai).
//
// Cùng ràng buộc với bộ đếm tương tác: driver neon-http chỉ nhận MỘT câu lệnh
// cho mỗi request và không có transaction, nên "ghi dấu đã cộng điểm" và "cộng
// điểm" phải nằm chung một câu lệnh bằng CTE ghi dữ liệu. Nhờ vậy người chơi
// bấm lại nhiều lần cũng chỉ được cộng đúng một lần.
//
// Bảng `game_progress` chỉ lưu SHA-256 của token ngẫu nhiên do trình duyệt tự
// sinh, không lưu bất kỳ định danh cá nhân nào.
import { sql, type SQL } from "drizzle-orm";
import {
  boundedPoints,
  defaultBadges,
  isBadgeCode,
  managedGameIdOffset,
  parseStoredQuizOptions,
  totalPointsOf,
  type BadgeDefinition,
  type QuizQuestion,
} from "./gamification";
import {
  isRoleplayOutcomeKind,
  validateRoleplayScenario,
  type RoleplayChoice,
  type RoleplayNode,
  type RoleplayScenario,
} from "./roleplay";
import { isContentTopic } from "./topics";

export type GameDb = Readonly<{
  execute(query: SQL): Promise<unknown>;
}>;

export type AwardResult = Readonly<{
  points: number;
  awarded: boolean;
}>;

const maxQuestionRows = 500;
const maxScenarioRows = 100;
const maxNodeRows = 1_000;
const maxBadgeRows = 50;

function rowsOf(result: unknown): readonly Record<string, unknown>[] {
  const rows = (result as { rows?: unknown }).rows;
  return Array.isArray(rows) ? (rows as Record<string, unknown>[]) : [];
}

function textOf(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export async function readGamePoints(
  db: GameDb,
  playerKey: string,
): Promise<number> {
  const result = await db.execute(
    sql`SELECT points FROM game_progress WHERE player_key = ${playerKey}`,
  );
  return totalPointsOf(rowsOf(result)[0]?.points);
}

// Cộng điểm đúng một lần cho mỗi (người chơi, câu hỏi/kết cục): `awardKey` đã
// là hash của cả hai nên chỉ cần khóa chính chống trùng.
export async function awardGamePoints(
  db: GameDb,
  playerKey: string,
  awardKey: string,
  points: number,
): Promise<AwardResult> {
  const amount = boundedPoints(points);
  const result = await db.execute(sql`
    WITH claimed AS (
      INSERT INTO game_awards (award_key)
      VALUES (${awardKey})
      ON CONFLICT (award_key) DO NOTHING
      RETURNING 1 AS ok
    ), bumped AS (
      INSERT INTO game_progress (player_key, points)
      SELECT ${playerKey}, ${amount} FROM claimed
      ON CONFLICT (player_key) DO UPDATE
        SET points = game_progress.points + ${amount},
            updated_at = (now())::text
      RETURNING points
    )
    SELECT
      COALESCE(
        (SELECT points FROM bumped),
        (SELECT points FROM game_progress WHERE player_key = ${playerKey}),
        0
      ) AS points,
      EXISTS (SELECT 1 FROM claimed) AS awarded`);
  const row = rowsOf(result)[0] ?? {};
  return Object.freeze({
    points: totalPointsOf(row.points),
    awarded: row.awarded === true || row.awarded === "t",
  });
}

// Cấu hình quy đổi do CMS quản lý. Chưa cấu hình thì dùng bộ mặc định để người
// chơi không bao giờ thấy màn hình trống.
export async function readBadgeDefinitions(
  db: GameDb,
): Promise<readonly BadgeDefinition[]> {
  const result = await db.execute(sql`
    SELECT code, name, icon, description, threshold_points
    FROM game_badges
    ORDER BY threshold_points, code
    LIMIT ${maxBadgeRows}`);
  const badges: BadgeDefinition[] = [];
  for (const row of rowsOf(result)) {
    const thresholdPoints = Number(row.threshold_points);
    if (!isBadgeCode(row.code) || !Number.isSafeInteger(thresholdPoints)) {
      continue;
    }
    if (thresholdPoints <= 0) continue;
    badges.push(
      Object.freeze({
        code: row.code,
        name: textOf(row.name).trim() || row.code,
        icon: textOf(row.icon).trim() || "★",
        description: textOf(row.description).trim(),
        thresholdPoints,
      }),
    );
  }
  return badges.length > 0 ? Object.freeze(badges) : defaultBadges;
}

// Ngân hàng câu hỏi do CMS quản lý. Hàng hỏng (đáp án không parse được, đáp án
// đúng nằm ngoài danh sách) bị bỏ qua thay vì hiển thị nửa vời.
export async function readManagedQuizQuestions(
  db: GameDb,
): Promise<QuizQuestion[]> {
  const result = await db.execute(sql`
    SELECT id, topic, prompt, options, correct_index, explanation,
           legal_basis, source_url, points
    FROM quiz_questions
    WHERE status = 'published'
    ORDER BY topic, id
    LIMIT ${maxQuestionRows}`);
  const questions: QuizQuestion[] = [];
  for (const row of rowsOf(result)) {
    const options = parseStoredQuizOptions(row.options);
    const correctIndex = Number(row.correct_index);
    const id = Number(row.id);
    const prompt = textOf(row.prompt).trim();
    const explanation = textOf(row.explanation).trim();
    const legalBasis = textOf(row.legal_basis).trim();
    if (
      !options ||
      !Number.isSafeInteger(id) ||
      id <= 0 ||
      !isContentTopic(row.topic) ||
      !prompt ||
      !explanation ||
      !legalBasis ||
      !Number.isSafeInteger(correctIndex) ||
      correctIndex < 0 ||
      correctIndex >= options.length
    ) {
      continue;
    }
    const sourceUrl = textOf(row.source_url).trim();
    questions.push(
      Object.freeze({
        id: id + managedGameIdOffset,
        topic: row.topic,
        prompt,
        options,
        correctIndex,
        explanation,
        legalBasis,
        sourceUrl: sourceUrl || undefined,
        points: boundedPoints(row.points),
      }),
    );
  }
  return questions;
}

function parseStoredChoices(value: unknown): readonly RoleplayChoice[] | null {
  const raw = typeof value === "string" ? safeJson(value) : value;
  if (raw === undefined || raw === null) return Object.freeze([]);
  if (!Array.isArray(raw)) return null;
  const choices: RoleplayChoice[] = [];
  for (const item of raw) {
    if (typeof item !== "object" || item === null) return null;
    const record = item as Record<string, unknown>;
    const label = textOf(record.label).trim();
    const next = textOf(record.next).trim();
    if (!label || !next) return null;
    choices.push(Object.freeze({ label, next }));
  }
  return Object.freeze(choices);
}

function safeJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function nodeOf(row: Record<string, unknown>): RoleplayNode | null {
  const choices = parseStoredChoices(row.choices);
  const key = textOf(row.node_key).trim();
  const text = textOf(row.text).trim();
  if (!choices || !key || !text) return null;
  const kind = row.kind === "outcome" ? "outcome" : "step";
  const outcomeKind = isRoleplayOutcomeKind(row.outcome_kind)
    ? row.outcome_kind
    : null;
  if (kind === "outcome" && !outcomeKind) return null;
  return Object.freeze({
    key,
    kind,
    text,
    choices,
    consequence: textOf(row.consequence).trim(),
    legalBasis: textOf(row.legal_basis).trim(),
    sourceUrl: textOf(row.source_url).trim(),
    outcomeKind,
    points: boundedPoints(row.points),
  });
}

// Kịch bản do CMS quản lý. Kịch bản hỏng đồ thị (nhánh trỏ vào nút không tồn
// tại, thiếu kết cục) bị loại hẳn để người chơi không đi vào ngõ cụt.
export async function readManagedRoleplayScenarios(
  db: GameDb,
): Promise<RoleplayScenario[]> {
  const scenarioRows = rowsOf(
    await db.execute(sql`
      SELECT id, topic, title, intro, start_key
      FROM roleplay_scenarios
      WHERE status = 'published'
      ORDER BY id
      LIMIT ${maxScenarioRows}`),
  );
  if (scenarioRows.length === 0) return [];

  const nodeRows = rowsOf(
    await db.execute(sql`
      SELECT scenario_id, node_key, kind, text, choices, consequence,
             legal_basis, source_url, outcome_kind, points
      FROM roleplay_nodes
      ORDER BY scenario_id, node_key
      LIMIT ${maxNodeRows}`),
  );
  const nodesByScenario = new Map<number, RoleplayNode[]>();
  for (const row of nodeRows) {
    const scenarioId = Number(row.scenario_id);
    const node = nodeOf(row);
    if (!node || !Number.isSafeInteger(scenarioId)) continue;
    const bucket = nodesByScenario.get(scenarioId) ?? [];
    bucket.push(node);
    nodesByScenario.set(scenarioId, bucket);
  }

  const scenarios: RoleplayScenario[] = [];
  for (const row of scenarioRows) {
    const id = Number(row.id);
    const title = textOf(row.title).trim();
    const intro = textOf(row.intro).trim();
    const startKey = textOf(row.start_key).trim();
    const nodes = nodesByScenario.get(id) ?? [];
    if (
      !Number.isSafeInteger(id) ||
      id <= 0 ||
      !isContentTopic(row.topic) ||
      !title ||
      !intro ||
      !startKey ||
      nodes.length === 0
    ) {
      continue;
    }
    const scenario: RoleplayScenario = Object.freeze({
      id: id + managedGameIdOffset,
      topic: row.topic,
      title,
      intro,
      startKey,
      nodes: Object.freeze(nodes),
    });
    if (validateRoleplayScenario(scenario).length > 0) continue;
    scenarios.push(scenario);
  }
  return scenarios;
}
