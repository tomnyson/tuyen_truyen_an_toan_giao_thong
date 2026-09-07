// Nhánh trả lời có kiểm chứng: một lần gọi mô hình vừa chọn evidence vừa viết
// phần diễn giải, server dựng lại toàn bộ con số và căn cứ pháp lý.
//
// Đây là ranh giới duy nhất giữa route chat và bộ soạn `openai-evidence`. Mọi
// thất bại đều trả mã lỗi để route đi tiếp cascade cũ; nhánh này không bao giờ
// làm câu trả lời tệ hơn hiện tại.
import {
  CHAT_ANSWER_SECTION_KINDS,
  flattenChatAnswerSections,
  reviewedCitationsToLegalBasisSection,
  type ChatAnswerSection,
} from "./chat-answer-presentation";
import { buildChatContext, type ChatContextMessage } from "./chat-context";
import { CHAT_EVIDENCE_POLICY_VERSION } from "./chat-evidence-policy";
import {
  shortlistEvidence,
  type ShortlistedEvidence,
} from "./evidence-shortlist";
import { normalizeVietnamese } from "./legal-content";
import type { OfficialSourceLink } from "./official-source-url";
import {
  composeEvidenceAnswer,
  readOpenAiComposerConfig,
  sanitizeQuestion,
  type EvidenceComposition,
  type OpenAiComposerFailureCode,
} from "./openai-evidence";
import { env } from "./runtime-env";

export const GROUNDED_ANSWER_POLICY_VERSION = "grounded-chat-v1";

// Bộ soạn mặc định chờ 10 giây, quá dài so với mốc 3 giây của chat.
const DEFAULT_GROUNDED_TIMEOUT_MS = 2_500;
const MIN_GROUNDED_TIMEOUT_MS = 500;
const MAX_GROUNDED_TIMEOUT_MS = 10_000;
const MAX_QUESTION_LENGTH = 600;
const MAX_PARAGRAPHS_PER_SECTION = 4;
const MAX_BULLETS_PER_SECTION = 6;
const MAX_ITEM_LENGTH = 1_200;
const MAX_FOLLOW_UPS = 3;

const standingLimitation =
  "Câu trả lời được soạn lại từ nội dung đã kiểm duyệt của cổng; mức áp dụng thực tế còn phụ thuộc độ tuổi, chủ thể và tình tiết cụ thể, bạn nên đối chiếu văn bản gốc khi cần.";

export type GroundedChatConfig = Readonly<{
  enabled: boolean;
  timeoutMs: number;
}>;

// Hai ổ khoá phải cùng bật: `AI_REPHRASE_ENABLED` bật thành phần bộ soạn,
// `AI_GROUNDED_CHAT_ENABLED` bật riêng bề mặt chat. Tắt một cái là quay về hành
// vi cũ ngay, không cần deploy.
export function readGroundedChatConfig(
  runtimeEnv: Record<string, unknown>,
): GroundedChatConfig {
  const timeout = Number(runtimeEnv.AI_GROUNDED_TIMEOUT_MS);
  return {
    enabled: runtimeEnv.AI_GROUNDED_CHAT_ENABLED === "true",
    timeoutMs:
      Number.isInteger(timeout) &&
      timeout >= MIN_GROUNDED_TIMEOUT_MS &&
      timeout <= MAX_GROUNDED_TIMEOUT_MS
        ? timeout
        : DEFAULT_GROUNDED_TIMEOUT_MS,
  };
}

export type GroundedAnswerFailureCode =
  | OpenAiComposerFailureCode
  | "SURFACE_DISABLED"
  | "NO_QUESTION"
  | "NO_EVIDENCE"
  | "EMPTY_COMPOSITION";

export type GroundedAnswer = Readonly<{
  answer: string;
  sections: ChatAnswerSection[];
  sources: OfficialSourceLink[];
  followUps: string[];
  shortlistSize: number;
  citedEvidenceCount: number;
  model: string;
  inputTokens: number | null;
  outputTokens: number | null;
  freshnessPolicyVersion: string;
}>;

export type GroundedAnswerResult =
  | Readonly<{ ok: true; answer: GroundedAnswer }>
  | Readonly<{ ok: false; code: GroundedAnswerFailureCode }>;

function boundedText(value: string): string | null {
  const text = value.replace(/\s+/g, " ").trim();
  return text.length > 0 ? text.slice(0, MAX_ITEM_LENGTH) : null;
}

function boundedTexts(values: readonly string[], limit: number): string[] {
  return values
    .flatMap((value) => {
      const text = boundedText(value);
      return text ? [text] : [];
    })
    .filter((text, index, all) => all.indexOf(text) === index)
    .slice(0, limit);
}

function citedEvidenceIds(composition: EvidenceComposition): Set<string> {
  return new Set([
    ...composition.conclusion.evidenceIds,
    ...composition.explanation.flatMap((item) => item.evidenceIds),
    ...composition.examples.flatMap((item) => item.evidenceIds),
    ...composition.recommendedActions.flatMap((item) => item.evidenceIds),
    ...composition.warnings.flatMap((item) => item.evidenceIds),
  ]);
}

// Gợi ý hỏi tiếp do server dựng, không phải mô hình: mọi chữ trong output của
// mô hình bị cấm chứa chữ số, mà gợi ý tự nhiên nhất lại nói về tuổi.
export function suggestFollowUps(
  cited: readonly ShortlistedEvidence[],
): string[] {
  if (cited.length === 0) return [];
  const topics = normalizeVietnamese(
    cited.map((item) => item.entryTopic).join(" "),
  );
  const hasPenalty = cited.some((item) => item.penalty.length > 0);

  const suggestions = [
    ...(hasPenalty
      ? [
          "Nếu em chưa đủ 16 tuổi thì mức xử lý có khác không?",
          "Mức phạt này được tính dựa trên những gì?",
        ]
      : []),
    ...(topics.includes("giao thong")
      ? ["Xe của em có bị tạm giữ không?"]
      : []),
    ...(topics.includes("bao luc") ||
    topics.includes("an ninh") ||
    topics.includes("mang")
      ? ["Em nên giữ lại bằng chứng gì?"]
      : []),
    "Bố mẹ em có phải chịu trách nhiệm cùng không?",
    "Em nên làm gì ngay bây giờ?",
  ];
  return suggestions
    .filter((text, index, all) => all.indexOf(text) === index)
    .slice(0, MAX_FOLLOW_UPS);
}

// Mô hình chỉ viết phần diễn giải; số tiền và điều/khoản/điểm được dựng từ đúng
// những evidence mà mô hình thật sự trích dẫn.
export function renderGroundedSections(
  composition: EvidenceComposition,
  cited: readonly ShortlistedEvidence[],
): ChatAnswerSection[] {
  const sections: ChatAnswerSection[] = [];

  const summary = boundedText(composition.conclusion.text);
  if (!summary) return [];
  sections.push({ kind: "summary", paragraphs: [summary], bullets: [] });

  const details = boundedTexts(
    composition.explanation.map((item) => item.text),
    MAX_PARAGRAPHS_PER_SECTION,
  );
  if (details.length > 0) {
    sections.push({ kind: "details", paragraphs: details, bullets: [] });
  }

  const examples = boundedTexts(
    composition.examples.map((item) =>
      `${item.title}: ${item.scenario} ${item.outcome}`,
    ),
    MAX_PARAGRAPHS_PER_SECTION,
  );
  if (examples.length > 0) {
    sections.push({ kind: "examples", paragraphs: examples, bullets: [] });
  }

  const legalBasis = reviewedCitationsToLegalBasisSection(
    cited.flatMap((item) => (item.citation ? [item.citation] : [])),
  );
  if (legalBasis) sections.push(legalBasis);

  const penalties = boundedTexts(
    cited.map((item) => item.penalty),
    MAX_PARAGRAPHS_PER_SECTION,
  );
  if (penalties.length > 0) {
    sections.push({ kind: "sanctions", paragraphs: penalties, bullets: [] });
  }

  const nextSteps = boundedTexts(
    [
      ...composition.recommendedActions.map((item) => item.text),
      ...cited.map((item) => item.remedy),
    ],
    MAX_BULLETS_PER_SECTION,
  );
  if (nextSteps.length > 0) {
    sections.push({ kind: "next_steps", paragraphs: [], bullets: nextSteps });
  }

  sections.push({
    kind: "limitations",
    paragraphs: boundedTexts(
      [...composition.warnings.map((item) => item.text), standingLimitation],
      MAX_PARAGRAPHS_PER_SECTION,
    ),
    bullets: [],
  });

  return sections.sort(
    (left, right) =>
      CHAT_ANSWER_SECTION_KINDS.indexOf(left.kind) -
      CHAT_ANSWER_SECTION_KINDS.indexOf(right.kind),
  );
}

export type GroundedAnswerDependencies = Readonly<{
  shortlist: typeof shortlistEvidence;
  compose: typeof composeEvidenceAnswer;
  runtimeEnv: Record<string, unknown>;
}>;

export async function findGroundedAnswer(
  messages: readonly ChatContextMessage[],
  dependencies: Partial<GroundedAnswerDependencies> = {},
): Promise<GroundedAnswerResult> {
  const shortlist = dependencies.shortlist ?? shortlistEvidence;
  const compose = dependencies.compose ?? composeEvidenceAnswer;
  const runtimeEnv = dependencies.runtimeEnv ?? env;

  const surface = readGroundedChatConfig(runtimeEnv);
  // Cổng bề mặt đứng trước mọi thứ khác: flag tắt thì không truy vấn dữ liệu và
  // không gọi nhà cung cấp.
  if (!surface.enabled) return { ok: false, code: "SURFACE_DISABLED" };

  const composerConfig = readOpenAiComposerConfig(runtimeEnv);
  if (!composerConfig.enabled) return { ok: false, code: "DISABLED" };

  const context = buildChatContext(messages);
  if (!context) return { ok: false, code: "NO_QUESTION" };

  const question = sanitizeQuestion(context.mergedQuestion).slice(
    0,
    MAX_QUESTION_LENGTH,
  );
  if (question.length === 0) return { ok: false, code: "NO_QUESTION" };

  const evidence = await shortlist(question);
  if (evidence.length === 0) return { ok: false, code: "NO_EVIDENCE" };

  const composed = await compose(
    { ...composerConfig, timeoutMs: surface.timeoutMs },
    { question, evidence: evidence.map((item) => item.record) },
  );
  if (!composed.ok) return { ok: false, code: composed.code };

  const citedIds = citedEvidenceIds(composed.composition);
  const cited = evidence.filter((item) => citedIds.has(item.record.evidenceId));
  if (cited.length === 0) return { ok: false, code: "EMPTY_COMPOSITION" };

  const sections = renderGroundedSections(composed.composition, cited);
  if (sections.length === 0) return { ok: false, code: "EMPTY_COMPOSITION" };

  const answer = flattenChatAnswerSections(sections);
  if (answer.length === 0) return { ok: false, code: "EMPTY_COMPOSITION" };

  const sources = cited
    .flatMap((item) => (item.sourceLink ? [item.sourceLink] : []))
    .filter(
      (link, index, all) =>
        all.findIndex((other) => other.url === link.url) === index,
    );

  return {
    ok: true,
    answer: {
      answer,
      sections,
      sources,
      followUps: suggestFollowUps(cited),
      shortlistSize: evidence.length,
      citedEvidenceCount: cited.length,
      model: composed.model,
      inputTokens: composed.usage.inputTokens,
      outputTokens: composed.usage.outputTokens,
      freshnessPolicyVersion: CHAT_EVIDENCE_POLICY_VERSION,
    },
  };
}
