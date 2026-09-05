// Quiz, điểm và huy hiệu (US-035).
//
// Nguyên tắc riêng tư giống bộ đếm tương tác: server KHÔNG lưu định danh cá
// nhân. Trình duyệt tự sinh token ngẫu nhiên (dùng chung token của
// `lib/engagement.ts`), server chỉ lưu SHA-256 của token đó làm khóa tiến độ.
//
// Nguyên tắc nội dung: đáp án đúng và phần giải thích KHÔNG bao giờ nằm trong
// dữ liệu gửi xuống trình duyệt trước khi người chơi trả lời — chấm điểm là
// việc của server, nhờ vậy điểm không bị bịa và giải thích luôn đi kèm căn cứ
// đã duyệt của kho nội dung.
import { isContentTopic, type ContentTopic } from "./topics";

export const gamificationPolicyVersion = "gamification-v1";

// Nội dung do CMS quản lý được cộng offset để không đè lên id của bộ đề seed
// tĩnh — cùng quy ước với `managedLawIdOffset` của trang chủ.
export const managedGameIdOffset = 100_000;

export const minQuizOptions = 2;
export const maxQuizOptions = 4;
export const minAwardPoints = 1;
export const maxAwardPoints = 100;

export type QuizQuestion = Readonly<{
  id: number;
  topic: ContentTopic;
  prompt: string;
  options: readonly string[];
  correctIndex: number;
  // Giải thích đúng/sai; luôn kèm căn cứ lấy từ kho nội dung đã duyệt.
  explanation: string;
  legalBasis: string;
  sourceUrl?: string;
  points: number;
}>;

// Bản chiếu công khai: bỏ hẳn `correctIndex` và `explanation`.
export type PublicQuizQuestion = Readonly<{
  id: number;
  topic: ContentTopic;
  prompt: string;
  options: readonly string[];
  points: number;
}>;

export type BadgeDefinition = Readonly<{
  code: string;
  name: string;
  icon: string;
  description: string;
  thresholdPoints: number;
}>;

export type GameProgress = Readonly<{
  points: number;
  badges: readonly BadgeDefinition[];
  nextBadge: BadgeDefinition | null;
}>;

export type QuizGrade = Readonly<{
  questionId: number;
  correct: boolean;
  correctIndex: number;
  explanation: string;
  legalBasis: string;
  sourceUrl: string;
  awardedPoints: number;
  progress: GameProgress;
}>;

export type GameAction =
  | Readonly<{ kind: "progress"; clientId: string }>
  | Readonly<{
      kind: "quiz-answer";
      clientId: string;
      questionId: number;
      choiceIndex: number;
    }>
  | Readonly<{
      kind: "roleplay-outcome";
      clientId: string;
      scenarioId: number;
      nodeKey: string;
    }>;

// Cấu hình quy đổi mặc định. CMS ghi đè được bằng bảng `game_badges`; danh
// sách này chỉ là điểm khởi đầu để tính năng chạy được ngay khi chưa cấu hình.
export const defaultBadges: readonly BadgeDefinition[] = Object.freeze([
  Object.freeze({
    code: "moi-vao-cuoc",
    name: "Người mới cẩn trọng",
    icon: "★",
    description: "Hoàn thành những câu hỏi đầu tiên về an toàn.",
    thresholdPoints: 20,
  }),
  Object.freeze({
    code: "tay-lai-an-toan",
    name: "Tay lái an toàn",
    icon: "◉",
    description: "Nắm chắc quy tắc giao thông dành cho học sinh, sinh viên.",
    thresholdPoints: 60,
  }),
  Object.freeze({
    code: "ban-dong-hanh",
    name: "Bạn đồng hành tin cậy",
    icon: "⚑",
    description: "Biết cách bảo vệ bạn bè trước bắt nạt và rủ rê nguy hiểm.",
    thresholdPoints: 120,
  }),
  Object.freeze({
    code: "dai-su-phap-luat",
    name: "Đại sứ pháp luật",
    icon: "◆",
    description: "Đủ tự tin lan tỏa kiến thức pháp luật cho cả lớp.",
    thresholdPoints: 200,
  }),
]);

const clientIdPattern = /^[0-9a-f]{32}$/;
const nodeKeyPattern = /^[a-z0-9][a-z0-9-]{0,39}$/;
const badgeCodePattern = /^[a-z0-9][a-z0-9-]{0,39}$/;

export function isGameClientId(value: unknown): value is string {
  return typeof value === "string" && clientIdPattern.test(value);
}

export function isRoleplayNodeKey(value: unknown): value is string {
  return typeof value === "string" && nodeKeyPattern.test(value);
}

export function isBadgeCode(value: unknown): value is string {
  return typeof value === "string" && badgeCodePattern.test(value);
}

function isPositiveId(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) > 0;
}

export function boundedPoints(value: unknown): number {
  const points = Number(value);
  if (!Number.isSafeInteger(points)) return minAwardPoints;
  return Math.min(Math.max(points, minAwardPoints), maxAwardPoints);
}

export function totalPointsOf(value: unknown): number {
  const points = Number(value);
  return Number.isSafeInteger(points) && points >= 0 ? points : 0;
}

// Xác thực tại biên hệ thống: mọi trường phải đúng kiểu và trong biên, sai một
// trường là loại cả yêu cầu thay vì "sửa hộ" cho người gửi.
export function parseGameAction(value: unknown): GameAction | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }
  const body = value as Record<string, unknown>;
  if (!isGameClientId(body.clientId)) return null;
  const clientId = body.clientId;

  if (body.kind === "progress") {
    return Object.freeze({ kind: "progress", clientId });
  }
  if (body.kind === "quiz-answer") {
    if (!isPositiveId(body.questionId)) return null;
    const choiceIndex = Number(body.choiceIndex);
    if (
      !Number.isSafeInteger(choiceIndex) ||
      choiceIndex < 0 ||
      choiceIndex >= maxQuizOptions
    ) {
      return null;
    }
    return Object.freeze({
      kind: "quiz-answer",
      clientId,
      questionId: body.questionId,
      choiceIndex,
    });
  }
  if (body.kind === "roleplay-outcome") {
    if (!isPositiveId(body.scenarioId) || !isRoleplayNodeKey(body.nodeKey)) {
      return null;
    }
    return Object.freeze({
      kind: "roleplay-outcome",
      clientId,
      scenarioId: body.scenarioId,
      nodeKey: body.nodeKey,
    });
  }
  return null;
}

export function toPublicQuizQuestion(
  question: QuizQuestion,
): PublicQuizQuestion {
  return Object.freeze({
    id: question.id,
    topic: question.topic,
    prompt: question.prompt,
    options: Object.freeze([...question.options]),
    points: question.points,
  });
}

// Guard phía client: chỉ nhận đúng DTO server phát ra. Nếu payload có thêm
// `correctIndex` (server lỗi hoặc bị can thiệp) thì loại luôn, không hiển thị.
export function parsePublicQuizQuestions(
  value: unknown,
): PublicQuizQuestion[] | null {
  if (!Array.isArray(value)) return null;
  const allowed = ["id", "topic", "prompt", "options", "points"];
  const questions: PublicQuizQuestion[] = [];
  for (const item of value) {
    if (typeof item !== "object" || item === null || Array.isArray(item)) {
      return null;
    }
    const record = item as Record<string, unknown>;
    const keys = Object.keys(record);
    if (keys.length !== allowed.length || !keys.every((key) => allowed.includes(key))) {
      return null;
    }
    const options = parseQuizOptionList(record.options);
    if (
      !isPositiveId(record.id) ||
      !isContentTopic(record.topic) ||
      typeof record.prompt !== "string" ||
      !record.prompt.trim() ||
      !options
    ) {
      return null;
    }
    questions.push(
      Object.freeze({
        id: record.id,
        topic: record.topic,
        prompt: record.prompt,
        options,
        points: boundedPoints(record.points),
      }),
    );
  }
  return questions;
}

// Danh sách đáp án: 2–4 lựa chọn, không rỗng, không trùng nhau.
export function parseQuizOptionList(value: unknown): readonly string[] | null {
  if (!Array.isArray(value)) return null;
  if (value.length < minQuizOptions || value.length > maxQuizOptions) return null;
  const options: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") return null;
    const option = item.trim().slice(0, 240);
    if (!option || options.includes(option)) return null;
    options.push(option);
  }
  return Object.freeze(options);
}

// Đáp án lưu trong database dưới dạng chuỗi JSON (cùng quy ước với `tags`).
export function parseStoredQuizOptions(value: unknown): readonly string[] | null {
  if (typeof value !== "string") return parseQuizOptionList(value);
  try {
    return parseQuizOptionList(JSON.parse(value));
  } catch {
    return null;
  }
}

export function parseBadgeDefinitions(
  value: unknown,
): BadgeDefinition[] | null {
  if (!Array.isArray(value)) return null;
  const badges: BadgeDefinition[] = [];
  for (const item of value) {
    if (typeof item !== "object" || item === null) return null;
    const record = item as Record<string, unknown>;
    if (
      !isBadgeCode(record.code) ||
      typeof record.name !== "string" ||
      !record.name.trim() ||
      typeof record.icon !== "string" ||
      typeof record.description !== "string"
    ) {
      return null;
    }
    const thresholdPoints = Number(record.thresholdPoints);
    if (!Number.isSafeInteger(thresholdPoints) || thresholdPoints <= 0) {
      return null;
    }
    badges.push(
      Object.freeze({
        code: record.code,
        name: record.name.trim().slice(0, 120),
        icon: record.icon.trim().slice(0, 8) || "★",
        description: record.description.trim().slice(0, 400),
        thresholdPoints,
      }),
    );
  }
  return badges;
}

// Quy đổi điểm sang huy hiệu: sắp theo ngưỡng tăng dần rồi lấy mọi huy hiệu đã
// đạt. Cấu hình rỗng thì rơi về bộ mặc định để người chơi không bao giờ thấy
// màn hình trống.
export function sortBadges(
  badges: readonly BadgeDefinition[],
): readonly BadgeDefinition[] {
  return [...badges].sort(
    (left, right) =>
      left.thresholdPoints - right.thresholdPoints ||
      left.code.localeCompare(right.code),
  );
}

export function gameProgressOf(
  points: unknown,
  badges: readonly BadgeDefinition[] = defaultBadges,
): GameProgress {
  const total = totalPointsOf(points);
  const ordered = sortBadges(badges.length > 0 ? badges : defaultBadges);
  const earned = ordered.filter((badge) => total >= badge.thresholdPoints);
  const next = ordered.find((badge) => total < badge.thresholdPoints) ?? null;
  return Object.freeze({
    points: total,
    badges: Object.freeze(earned),
    nextBadge: next,
  });
}

export function pointsToNextBadge(progress: GameProgress): number {
  return progress.nextBadge
    ? Math.max(progress.nextBadge.thresholdPoints - progress.points, 0)
    : 0;
}

// Guard cho payload nhận ở trình duyệt: tiến độ và kết quả chấm đều phải đúng
// hình dạng server phát ra, sai thì bỏ qua thay vì hiển thị số liệu rác.
export function parseGameProgress(value: unknown): GameProgress | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }
  const record = value as Record<string, unknown>;
  const badges = parseBadgeDefinitions(record.badges ?? []);
  if (!badges) return null;
  const nextBadge =
    record.nextBadge === null || record.nextBadge === undefined
      ? null
      : (parseBadgeDefinitions([record.nextBadge]) ?? [])[0] ?? null;
  return Object.freeze({
    points: totalPointsOf(record.points),
    badges: Object.freeze(badges),
    nextBadge,
  });
}

export function parseQuizGrade(value: unknown): QuizGrade | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }
  const record = value as Record<string, unknown>;
  const progress = parseGameProgress(record.progress);
  const correctIndex = Number(record.correctIndex);
  if (
    !progress ||
    !isPositiveId(record.questionId) ||
    typeof record.correct !== "boolean" ||
    !Number.isSafeInteger(correctIndex) ||
    correctIndex < 0 ||
    correctIndex >= maxQuizOptions ||
    typeof record.explanation !== "string" ||
    typeof record.legalBasis !== "string"
  ) {
    return null;
  }
  const awardedPoints = Number(record.awardedPoints);
  return Object.freeze({
    questionId: record.questionId,
    correct: record.correct,
    correctIndex,
    explanation: record.explanation,
    legalBasis: record.legalBasis,
    sourceUrl: typeof record.sourceUrl === "string" ? record.sourceUrl : "",
    awardedPoints: Number.isSafeInteger(awardedPoints) && awardedPoints >= 0 ? awardedPoints : 0,
    progress,
  });
}

// Khóa tiến độ và khóa chống cộng điểm trùng. Cả hai đều là hash một chiều của
// token ngẫu nhiên nên không truy ngược ra người chơi.
export function gamePlayerKeyInput(clientId: string): string {
  return `${gamificationPolicyVersion} player ${clientId}`;
}

export function gameAwardKeyInput(
  clientId: string,
  kind: "quiz" | "roleplay",
  reference: string,
): string {
  return `${gamificationPolicyVersion} award ${kind} ${reference} ${clientId}`;
}

export async function gameHashKey(input: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(input),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}
