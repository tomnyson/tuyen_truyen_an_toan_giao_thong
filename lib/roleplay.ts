// Game nhập vai tình huống (US-036).
//
// Kịch bản là DỮ LIỆU, không phải markup: mỗi kịch bản là một đồ thị nút, nút
// `step` có các lựa chọn dẫn sang nút khác, nút `outcome` là kết cục kèm phân
// tích hậu quả và căn cứ đã duyệt. Component chỉ đi trên đồ thị, không chứa
// bất kỳ nhánh nội dung nào.
import { boundedPoints, isRoleplayNodeKey } from "./gamification";
import { isContentTopic, type ContentTopic } from "./topics";

export const roleplayOutcomeKinds = ["safe", "risky", "harmful"] as const;

export type RoleplayOutcomeKind = (typeof roleplayOutcomeKinds)[number];

export type RoleplayChoice = Readonly<{
  label: string;
  next: string;
}>;

export type RoleplayNode = Readonly<{
  key: string;
  kind: "step" | "outcome";
  text: string;
  choices: readonly RoleplayChoice[];
  // Chỉ nút kết cục mới có ba trường dưới đây.
  consequence: string;
  legalBasis: string;
  sourceUrl: string;
  outcomeKind: RoleplayOutcomeKind | null;
  points: number;
}>;

export type RoleplayScenario = Readonly<{
  id: number;
  topic: ContentTopic;
  title: string;
  intro: string;
  startKey: string;
  nodes: readonly RoleplayNode[];
}>;

const outcomeCopy: Record<RoleplayOutcomeKind, Readonly<{ label: string; detail: string }>> = {
  safe: {
    label: "Lựa chọn an toàn",
    detail: "Hướng xử lý này giữ được an toàn cho bạn và cho người khác.",
  },
  risky: {
    label: "Rủi ro còn bỏ ngỏ",
    detail: "Tình huống chưa leo thang nhưng rủi ro vẫn còn; cần bước tiếp theo.",
  },
  harmful: {
    label: "Hậu quả nặng",
    detail: "Lựa chọn này kéo theo hậu quả pháp lý hoặc an toàn nghiêm trọng.",
  },
};

export function isRoleplayOutcomeKind(
  value: unknown,
): value is RoleplayOutcomeKind {
  return (
    typeof value === "string" &&
    (roleplayOutcomeKinds as readonly string[]).includes(value)
  );
}

export function roleplayOutcomeCopy(
  kind: RoleplayOutcomeKind,
): Readonly<{ label: string; detail: string }> {
  return outcomeCopy[kind];
}

export function findRoleplayNode(
  scenario: RoleplayScenario,
  key: string,
): RoleplayNode | null {
  return scenario.nodes.find((node) => node.key === key) ?? null;
}

export function roleplayStartNode(
  scenario: RoleplayScenario,
): RoleplayNode | null {
  return findRoleplayNode(scenario, scenario.startKey);
}

export function isRoleplayOutcome(node: RoleplayNode): boolean {
  return node.kind === "outcome";
}

// Kiểm tra đồ thị: kịch bản hỏng (lựa chọn trỏ vào nút không tồn tại, nút chết
// không dẫn tới kết cục nào) phải bị chặn ngay ở CMS chứ không đợi người chơi
// đi vào ngõ cụt. Trả về danh sách lỗi rỗng nghĩa là hợp lệ.
export function validateRoleplayScenario(
  scenario: RoleplayScenario,
): readonly string[] {
  const errors: string[] = [];
  const keys = new Set<string>();
  for (const node of scenario.nodes) {
    if (!isRoleplayNodeKey(node.key)) {
      errors.push(`Mã nút không hợp lệ: ${node.key}`);
      continue;
    }
    if (keys.has(node.key)) errors.push(`Mã nút bị trùng: ${node.key}`);
    keys.add(node.key);
  }
  if (!keys.has(scenario.startKey)) {
    errors.push(`Thiếu nút mở đầu: ${scenario.startKey}`);
  }

  for (const node of scenario.nodes) {
    if (node.kind === "outcome") {
      if (node.choices.length > 0) {
        errors.push(`Nút kết cục ${node.key} không được có lựa chọn tiếp.`);
      }
      if (!node.consequence.trim()) {
        errors.push(`Nút kết cục ${node.key} thiếu phân tích hậu quả.`);
      }
      if (!node.legalBasis.trim()) {
        errors.push(`Nút kết cục ${node.key} thiếu căn cứ.`);
      }
      continue;
    }
    if (node.choices.length < 2) {
      errors.push(`Nút ${node.key} phải có ít nhất hai lựa chọn.`);
    }
    for (const choice of node.choices) {
      if (!keys.has(choice.next)) {
        errors.push(`Lựa chọn "${choice.label}" trỏ tới nút không tồn tại.`);
      }
    }
  }

  const reachable = reachableNodeKeys(scenario);
  for (const node of scenario.nodes) {
    if (!reachable.has(node.key)) {
      errors.push(`Nút ${node.key} không đi tới được từ nút mở đầu.`);
    }
  }
  if (!scenario.nodes.some((node) => node.kind === "outcome")) {
    errors.push("Kịch bản phải có ít nhất một kết cục.");
  }
  return errors;
}

export function reachableNodeKeys(
  scenario: RoleplayScenario,
): ReadonlySet<string> {
  const reachable = new Set<string>();
  const queue: string[] = [scenario.startKey];
  while (queue.length > 0) {
    const key = queue.shift() as string;
    if (reachable.has(key)) continue;
    const node = findRoleplayNode(scenario, key);
    if (!node) continue;
    reachable.add(key);
    for (const choice of node.choices) queue.push(choice.next);
  }
  return reachable;
}

function parseChoices(value: unknown): readonly RoleplayChoice[] | null {
  if (!Array.isArray(value)) return null;
  if (value.length > 4) return null;
  const choices: RoleplayChoice[] = [];
  for (const item of value) {
    if (typeof item !== "object" || item === null) return null;
    const record = item as Record<string, unknown>;
    const label = typeof record.label === "string" ? record.label.trim() : "";
    if (!label || !isRoleplayNodeKey(record.next)) return null;
    choices.push(Object.freeze({ label: label.slice(0, 240), next: record.next }));
  }
  return Object.freeze(choices);
}

function parseNode(value: unknown): RoleplayNode | null {
  if (typeof value !== "object" || value === null) return null;
  const record = value as Record<string, unknown>;
  const kind = record.kind === "outcome" ? "outcome" : "step";
  const text = typeof record.text === "string" ? record.text.trim() : "";
  const choices = parseChoices(record.choices ?? []);
  if (!isRoleplayNodeKey(record.key) || !text || !choices) return null;
  const outcomeKind = isRoleplayOutcomeKind(record.outcomeKind)
    ? record.outcomeKind
    : null;
  if (kind === "outcome" && !outcomeKind) return null;
  return Object.freeze({
    key: record.key,
    kind,
    text: text.slice(0, 2_000),
    choices,
    consequence:
      typeof record.consequence === "string"
        ? record.consequence.trim().slice(0, 2_000)
        : "",
    legalBasis:
      typeof record.legalBasis === "string"
        ? record.legalBasis.trim().slice(0, 500)
        : "",
    sourceUrl:
      typeof record.sourceUrl === "string" ? record.sourceUrl.trim() : "",
    outcomeKind,
    points: boundedPoints(record.points),
  });
}

// Guard chung cho cả dữ liệu từ database lẫn payload nhận ở trình duyệt: kịch
// bản không hợp lệ bị loại hẳn thay vì hiển thị nửa vời.
export function parseRoleplayScenarios(
  value: unknown,
): RoleplayScenario[] | null {
  if (!Array.isArray(value)) return null;
  const scenarios: RoleplayScenario[] = [];
  for (const item of value) {
    if (typeof item !== "object" || item === null) return null;
    const record = item as Record<string, unknown>;
    const title = typeof record.title === "string" ? record.title.trim() : "";
    const intro = typeof record.intro === "string" ? record.intro.trim() : "";
    const id = Number(record.id);
    if (
      !Number.isSafeInteger(id) ||
      id <= 0 ||
      !isContentTopic(record.topic) ||
      !title ||
      !intro ||
      !isRoleplayNodeKey(record.startKey) ||
      !Array.isArray(record.nodes)
    ) {
      return null;
    }
    const nodes: RoleplayNode[] = [];
    for (const rawNode of record.nodes) {
      const node = parseNode(rawNode);
      if (!node) return null;
      nodes.push(node);
    }
    const scenario: RoleplayScenario = Object.freeze({
      id,
      topic: record.topic,
      title: title.slice(0, 240),
      intro: intro.slice(0, 1_000),
      startKey: record.startKey,
      nodes: Object.freeze(nodes),
    });
    if (validateRoleplayScenario(scenario).length > 0) return null;
    scenarios.push(scenario);
  }
  return scenarios;
}
