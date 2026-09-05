// CMS cho phần game hóa (US-035 ngân hàng câu hỏi + quy đổi huy hiệu,
// US-036 kịch bản nhập vai). Mọi nội dung game đều là dữ liệu quản lý được.
import { asc, desc, eq, sql } from "drizzle-orm";
import { getInitializedDb } from "@/db";
import {
  gameBadges,
  quizQuestions,
  roleplayNodes,
  roleplayScenarios,
} from "@/db/pg-schema";
import { hasTrustedOrigin, isAdminRequest } from "@/lib/admin-auth";
import {
  isBadgeCode,
  maxAwardPoints,
  minAwardPoints,
  parseQuizOptionList,
} from "@/lib/gamification";
import { hasBlockedLegalBasis } from "@/lib/legal-content";
import {
  validateRoleplayScenario,
  type RoleplayNode,
  type RoleplayScenario,
} from "@/lib/roleplay";
import { isContentTopic } from "@/lib/topics";

type Entity = "question" | "badge" | "scenario";

const statuses = new Set(["draft", "published"]);
const requiredError = "Vui lòng nhập đầy đủ và đúng định dạng.";
const blockedBasisError =
  "Không thể xuất bản nội dung dùng căn cứ đã hết hiệu lực.";

type Validation =
  | { ok: true; values: Record<string, unknown> }
  | { ok: false; error: string };

function text(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function parseId(value: unknown) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function points(value: unknown, fallback: number) {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) return fallback;
  return Math.min(Math.max(parsed, minAwardPoints), maxAwardPoints);
}

function normalizeQuestion(body: Record<string, unknown>): Validation {
  const topic = text(body.topic, 80);
  const status = text(body.status, 20);
  const prompt = text(body.prompt, 1_000);
  const explanation = text(body.explanation, 2_000);
  const legalBasis = text(body.legalBasis, 500);
  const sourceUrl = text(body.sourceUrl, 1_000);
  const options = parseQuizOptionList(body.options);
  const correctIndex = Number(body.correctIndex);
  if (
    !isContentTopic(topic) ||
    !statuses.has(status) ||
    !prompt ||
    !explanation ||
    !legalBasis ||
    !options ||
    !Number.isSafeInteger(correctIndex) ||
    correctIndex < 0 ||
    correctIndex >= options.length
  ) {
    return { ok: false, error: requiredError };
  }
  if (sourceUrl && !sourceUrl.startsWith("https://")) {
    return { ok: false, error: "Đường dẫn nguồn phải bắt đầu bằng https://." };
  }
  if (status === "published" && hasBlockedLegalBasis(legalBasis)) {
    return { ok: false, error: blockedBasisError };
  }
  return {
    ok: true,
    values: {
      topic,
      status,
      prompt,
      explanation,
      legalBasis,
      sourceUrl,
      options: JSON.stringify(options),
      correctIndex,
      points: points(body.points, 10),
    },
  };
}

function normalizeBadge(body: Record<string, unknown>): Validation {
  const code = text(body.code, 40);
  const name = text(body.name, 120);
  const icon = text(body.icon, 8) || "★";
  const description = text(body.description, 400);
  const thresholdPoints = Number(body.thresholdPoints);
  if (
    !isBadgeCode(code) ||
    !name ||
    !Number.isSafeInteger(thresholdPoints) ||
    thresholdPoints <= 0
  ) {
    return { ok: false, error: requiredError };
  }
  return { ok: true, values: { code, name, icon, description, thresholdPoints } };
}

function nodeOf(value: unknown): RoleplayNode | null {
  if (typeof value !== "object" || value === null) return null;
  const record = value as Record<string, unknown>;
  const kind = record.kind === "outcome" ? "outcome" : "step";
  const outcomeKind =
    record.outcomeKind === "safe" ||
    record.outcomeKind === "risky" ||
    record.outcomeKind === "harmful"
      ? record.outcomeKind
      : null;
  if (kind === "outcome" && !outcomeKind) return null;
  const choices = Array.isArray(record.choices) ? record.choices : [];
  const parsedChoices = choices.map((choice) => {
    const item = (choice ?? {}) as Record<string, unknown>;
    return Object.freeze({
      label: text(item.label, 240),
      next: text(item.next, 40),
    });
  });
  if (parsedChoices.some((choice) => !choice.label || !choice.next)) return null;
  return Object.freeze({
    key: text(record.key, 40),
    kind,
    text: text(record.text, 2_000),
    choices: Object.freeze(parsedChoices),
    consequence: text(record.consequence, 2_000),
    legalBasis: text(record.legalBasis, 500),
    sourceUrl: text(record.sourceUrl, 1_000),
    outcomeKind,
    points: points(record.points, 1),
  });
}

type ScenarioValidation =
  | { ok: true; scenario: RoleplayScenario; status: "draft" | "published" }
  | { ok: false; error: string };

function normalizeScenario(body: Record<string, unknown>): ScenarioValidation {
  const topic = text(body.topic, 80);
  const status = text(body.status, 20);
  const title = text(body.title, 240);
  const intro = text(body.intro, 1_000);
  const startKey = text(body.startKey, 40);
  const rawNodes = Array.isArray(body.nodes) ? body.nodes : [];
  const nodes: RoleplayNode[] = [];
  for (const raw of rawNodes) {
    const node = nodeOf(raw);
    if (!node) return { ok: false, error: requiredError };
    nodes.push(node);
  }
  if (
    !isContentTopic(topic) ||
    !statuses.has(status) ||
    !title ||
    !intro ||
    !startKey ||
    nodes.length === 0
  ) {
    return { ok: false, error: requiredError };
  }
  const scenario: RoleplayScenario = Object.freeze({
    id: parseId(body.id) ?? 1,
    topic,
    title,
    intro,
    startKey,
    nodes: Object.freeze(nodes),
  });
  // Đồ thị hỏng bị chặn ngay tại CMS: người chơi không bao giờ gặp ngõ cụt.
  const errors = validateRoleplayScenario(scenario);
  if (errors.length > 0) return { ok: false, error: errors.join(" ") };
  if (
    status === "published" &&
    nodes.some((node) => hasBlockedLegalBasis(node.legalBasis))
  ) {
    return { ok: false, error: blockedBasisError };
  }
  return { ok: true, scenario, status: status as "draft" | "published" };
}

async function authorize(request: Request, mutation = false) {
  if (!(await isAdminRequest(request))) {
    return Response.json({ error: "Phiên đăng nhập đã hết hạn." }, { status: 401 });
  }
  if (mutation && !hasTrustedOrigin(request)) {
    return Response.json({ error: "Yêu cầu không hợp lệ." }, { status: 403 });
  }
  return null;
}

async function readBody(request: Request) {
  return (await request.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
}

type Db = Awaited<ReturnType<typeof getInitializedDb>>;

// Nút của kịch bản luôn được ghi lại trọn bộ: xóa hết rồi chèn lại theo payload
// đã qua kiểm tra đồ thị, tránh tình trạng còn sót nút mồ côi.
async function writeScenarioNodes(
  db: Db,
  scenarioId: number,
  scenario: RoleplayScenario,
) {
  await db.delete(roleplayNodes).where(eq(roleplayNodes.scenarioId, scenarioId));
  await db.insert(roleplayNodes).values(
    scenario.nodes.map((node) => ({
      scenarioId,
      nodeKey: node.key,
      kind: node.kind,
      text: node.text,
      choices: JSON.stringify(node.choices),
      consequence: node.consequence,
      legalBasis: node.legalBasis,
      sourceUrl: node.sourceUrl,
      outcomeKind: node.outcomeKind,
      points: node.points,
    })),
  );
}

export async function GET(request: Request) {
  const denied = await authorize(request);
  if (denied) return denied;
  const db = await getInitializedDb();
  const [questions, badges, scenarios, nodes] = await Promise.all([
    db.select().from(quizQuestions).orderBy(asc(quizQuestions.topic), desc(quizQuestions.id)),
    db.select().from(gameBadges).orderBy(asc(gameBadges.thresholdPoints)),
    db.select().from(roleplayScenarios).orderBy(desc(roleplayScenarios.id)),
    db.select().from(roleplayNodes).orderBy(asc(roleplayNodes.scenarioId), asc(roleplayNodes.nodeKey)),
  ]);
  return Response.json({ questions, badges, scenarios, nodes });
}

export async function POST(request: Request) {
  const denied = await authorize(request, true);
  if (denied) return denied;
  const body = await readBody(request);
  const entity = body?.entity as Entity | undefined;
  if (!body) return Response.json({ error: requiredError }, { status: 400 });

  if (entity === "question") {
    const parsed = normalizeQuestion(body);
    if (!parsed.ok) return Response.json({ error: parsed.error }, { status: 400 });
    const db = await getInitializedDb();
    const [item] = await db
      .insert(quizQuestions)
      .values(parsed.values as typeof quizQuestions.$inferInsert)
      .returning();
    return Response.json({ item }, { status: 201 });
  }
  if (entity === "badge") {
    const parsed = normalizeBadge(body);
    if (!parsed.ok) return Response.json({ error: parsed.error }, { status: 400 });
    const db = await getInitializedDb();
    const values = parsed.values as typeof gameBadges.$inferInsert;
    const [item] = await db
      .insert(gameBadges)
      .values(values)
      .onConflictDoUpdate({
        target: gameBadges.code,
        set: { ...values, updatedAt: sql`CURRENT_TIMESTAMP` },
      })
      .returning();
    return Response.json({ item }, { status: 201 });
  }
  if (entity === "scenario") {
    const parsed = normalizeScenario(body);
    if (!parsed.ok) return Response.json({ error: parsed.error }, { status: 400 });
    const db = await getInitializedDb();
    const [item] = await db
      .insert(roleplayScenarios)
      .values({
        topic: parsed.scenario.topic,
        title: parsed.scenario.title,
        intro: parsed.scenario.intro,
        startKey: parsed.scenario.startKey,
        status: parsed.status,
      })
      .returning();
    await writeScenarioNodes(db, item.id, parsed.scenario);
    return Response.json({ item }, { status: 201 });
  }
  return Response.json({ error: "Loại nội dung không hợp lệ." }, { status: 400 });
}

export async function PATCH(request: Request) {
  const denied = await authorize(request, true);
  if (denied) return denied;
  const body = await readBody(request);
  const entity = body?.entity as Entity | undefined;
  if (!body) return Response.json({ error: requiredError }, { status: 400 });

  if (entity === "badge") {
    const parsed = normalizeBadge(body);
    if (!parsed.ok) return Response.json({ error: parsed.error }, { status: 400 });
    const values = parsed.values as typeof gameBadges.$inferInsert;
    const db = await getInitializedDb();
    const [item] = await db
      .update(gameBadges)
      .set({ ...values, updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(eq(gameBadges.code, values.code))
      .returning();
    return item
      ? Response.json({ item })
      : Response.json({ error: "Không tìm thấy huy hiệu." }, { status: 404 });
  }

  const id = parseId(body.id);
  if (!id) return Response.json({ error: "ID không hợp lệ." }, { status: 400 });

  if (entity === "question") {
    const parsed = normalizeQuestion(body);
    if (!parsed.ok) return Response.json({ error: parsed.error }, { status: 400 });
    const db = await getInitializedDb();
    const [item] = await db
      .update(quizQuestions)
      .set({
        ...(parsed.values as typeof quizQuestions.$inferInsert),
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(quizQuestions.id, id))
      .returning();
    return item
      ? Response.json({ item })
      : Response.json({ error: "Không tìm thấy câu hỏi." }, { status: 404 });
  }
  if (entity === "scenario") {
    const parsed = normalizeScenario(body);
    if (!parsed.ok) return Response.json({ error: parsed.error }, { status: 400 });
    const db = await getInitializedDb();
    const [item] = await db
      .update(roleplayScenarios)
      .set({
        topic: parsed.scenario.topic,
        title: parsed.scenario.title,
        intro: parsed.scenario.intro,
        startKey: parsed.scenario.startKey,
        status: parsed.status,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(roleplayScenarios.id, id))
      .returning();
    if (!item) {
      return Response.json({ error: "Không tìm thấy kịch bản." }, { status: 404 });
    }
    await writeScenarioNodes(db, id, parsed.scenario);
    return Response.json({ item });
  }
  return Response.json({ error: "Loại nội dung không hợp lệ." }, { status: 400 });
}

export async function DELETE(request: Request) {
  const denied = await authorize(request, true);
  if (denied) return denied;
  const body = await readBody(request);
  const entity = body?.entity as Entity | undefined;
  const db = await getInitializedDb();

  if (entity === "badge") {
    const code = text(body?.code, 40);
    if (!isBadgeCode(code)) {
      return Response.json({ error: "Mã huy hiệu không hợp lệ." }, { status: 400 });
    }
    await db.delete(gameBadges).where(eq(gameBadges.code, code));
    return Response.json({ ok: true });
  }

  const id = parseId(body?.id);
  if (!id) return Response.json({ error: "ID không hợp lệ." }, { status: 400 });
  if (entity === "question") {
    await db.delete(quizQuestions).where(eq(quizQuestions.id, id));
    return Response.json({ ok: true });
  }
  if (entity === "scenario") {
    await db.delete(roleplayNodes).where(eq(roleplayNodes.scenarioId, id));
    await db.delete(roleplayScenarios).where(eq(roleplayScenarios.id, id));
    return Response.json({ ok: true });
  }
  return Response.json({ error: "Loại nội dung không hợp lệ." }, { status: 400 });
}
