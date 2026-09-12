// View model của một câu trả lời chat (US-038, US-039). Trước đây phần đọc
// payload nằm inline trong `app/page.tsx`; trang trợ giúp pháp lý cần đúng
// cách đọc đó nên logic được rút ra đây để hai bề mặt không lệch nhau.
import {
  parseChatAnswerSections,
  parseChatFollowUps,
  type ChatAnswerSection,
} from "./chat-answer-presentation";
import {
  parsePublicSourceLinks,
  type OfficialSourceLink,
  type PublicSourceKind,
} from "./official-source-url";
import { parseAnswerOrigin, type AnswerOrigin } from "./answer-origin";
import { isContentTopic, type ContentTopic } from "./topics";

export type ChatAnswerView = Readonly<{
  answer: string;
  mode: string;
  warning: string | null;
  sections: readonly ChatAnswerSection[] | null;
  sources: readonly OfficialSourceLink[];
  sourceKind: PublicSourceKind;
  answerOrigin: AnswerOrigin | null;
  followUps: readonly string[];
  topic: ContentTopic | null;
}>;

export const chatAnswerFallbackText =
  "Mình chưa thể trả lời lúc này. Bạn thử lại sau nhé.";

export const chatAnswerNetworkErrorText =
  "Kết nối đang gián đoạn. Bạn thử gửi lại câu hỏi sau ít phút nhé.";

type ChatAnswerPayload = {
  answer?: unknown;
  error?: unknown;
  mode?: unknown;
  warning?: unknown;
  sourceKind?: unknown;
  answerOrigin?: unknown;
  sections?: unknown;
  sources?: unknown;
  followUps?: unknown;
  topic?: unknown;
};

function textOf(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

export function parseChatAnswerPayload(value: unknown): ChatAnswerView {
  const payload = (value ?? {}) as ChatAnswerPayload;
  const mode = typeof payload.mode === "string" ? payload.mode : "";
  // sourceKind lạ hoặc thiếu phải rơi về parser official (nghiêm hơn) để một
  // URL tham khảo không bị dán nhãn nguồn chính thống.
  const sourceKind: PublicSourceKind =
    mode === "web_search" && payload.sourceKind === "reference"
      ? "reference"
      : "official";
  const carriesSources = mode === "web_search" || mode === "knowledge";
  const sources = carriesSources
    ? parsePublicSourceLinks(payload.sources, sourceKind)
    : [];
  const sections = carriesSources
    ? parseChatAnswerSections(payload.sections)
    : null;
  return Object.freeze({
    answer:
      textOf(payload.answer) ?? textOf(payload.error) ?? chatAnswerFallbackText,
    mode,
    // Cảnh báo chỉ thuộc nhánh tra cứu ngoài; nhánh kho nội bộ không được
    // mượn lại nó để tránh làm nhiễu mức độ tin cậy.
    warning: mode === "web_search" ? textOf(payload.warning) : null,
    sections,
    sources,
    sourceKind,
    answerOrigin: parseAnswerOrigin(payload.answerOrigin),
    followUps: mode === "knowledge" ? parseChatFollowUps(payload.followUps) : [],
    topic: isContentTopic(payload.topic) ? payload.topic : null,
  });
}
