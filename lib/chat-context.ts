// Ngữ cảnh nhiều lượt cho chat. Trước đây 8 tin nhắn cuối được gửi lên nhưng chỉ
// tin cuối được dùng, nên "vậy phạt bao nhiêu?" là một câu hỏi vô nghĩa. Ở đây
// câu nối tiếp được ghép với câu hỏi trước để cả khâu lấy dữ liệu lẫn khâu soạn
// đều nhìn thấy điều người hỏi đang nói tới.
//
// Toàn bộ suy luận là xác định và chạy trên lịch sử do server giữ: không có id
// hay ngữ cảnh nào do client gửi lên được tin.
import { normalizeVietnamese } from "./legal-content";
import { searchTokens } from "./situation-search";

export const CHAT_CONTEXT_POLICY_VERSION = "chat-context-v1";

// Trần độ dài câu hỏi của bộ soạn (`MAX_QUESTION_LENGTH` trong openai-evidence).
const MAX_MERGED_QUESTION_LENGTH = 600;
// Dưới ngưỡng này phần ngữ cảnh mang theo quá vụn để còn ý nghĩa.
const MIN_CARRIED_CONTEXT_LENGTH = 20;
// Câu nối tiếp là câu ngắn; câu dài tự nó đã đủ ngữ cảnh.
const MAX_FOLLOW_UP_LENGTH = 120;
// Còn nhiều hơn chừng này từ mang nghĩa thì coi như một câu hỏi độc lập.
const MAX_FOLLOW_UP_TOKENS = 2;

// Từ chỉ trỏ ngược về lượt trước. Chỉ nhận khi đứng đầu câu, để "vậy" nằm giữa
// một câu hỏi độc lập không kéo nhầm ngữ cảnh cũ vào.
const anaphoraPrefixes: readonly string[] = [
  "the con",
  "the thi",
  "the neu",
  "the sao",
  "the a",
  "con neu",
  "con truong hop",
  "vay con",
  "vay thi",
  "vay neu",
  "vay",
  "cai do",
  "viec do",
  "truong hop do",
];

export type ChatContextMessage = Readonly<{
  role: "user" | "assistant";
  content: string;
}>;

export type ChatContext = Readonly<{
  // Câu hỏi mới nhất, đã gom khoảng trắng.
  question: string;
  // Câu đưa cho khâu lấy dữ liệu và khâu soạn.
  mergedQuestion: string;
  // Rỗng khi câu hỏi không nối tiếp lượt nào.
  previousQuestion: string;
  isFollowUp: boolean;
}>;

function collapseWhitespace(value: string): string {
  return value
    .normalize("NFC")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function startsWithAnaphora(question: string): boolean {
  const normalized = normalizeVietnamese(question);
  return anaphoraPrefixes.some(
    (prefix) =>
      normalized === prefix ||
      normalized.startsWith(`${prefix} `) ||
      normalized.startsWith(`${prefix},`),
  );
}

export function isFollowUpQuestion(question: string): boolean {
  if (question.length === 0 || question.length > MAX_FOLLOW_UP_LENGTH) {
    return false;
  }
  return (
    startsWithAnaphora(question) ||
    searchTokens(question).length <= MAX_FOLLOW_UP_TOKENS
  );
}

// Câu mới được giữ nguyên vẹn; phần bị cắt khi chạm trần là ngữ cảnh cũ.
function mergeQuestions(previous: string, question: string): string {
  const room = MAX_MERGED_QUESTION_LENGTH - question.length - 1;
  if (room < MIN_CARRIED_CONTEXT_LENGTH) {
    return question.slice(0, MAX_MERGED_QUESTION_LENGTH).trim();
  }
  return `${previous.slice(0, room).trim()} ${question}`.trim();
}

export function buildChatContext(
  messages: readonly ChatContextMessage[],
): ChatContext | null {
  const userQuestions = messages
    .filter((message) => message.role === "user")
    .map((message) => collapseWhitespace(message.content))
    .filter((content) => content.length > 0);

  const question = userQuestions.at(-1);
  if (!question) return null;

  const previousQuestion = userQuestions.at(-2) ?? "";
  const isFollowUp =
    previousQuestion.length > 0 && isFollowUpQuestion(question);

  return Object.freeze({
    question,
    previousQuestion: isFollowUp ? previousQuestion : "",
    isFollowUp,
    mergedQuestion: isFollowUp
      ? mergeQuestions(previousQuestion, question)
      : question.slice(0, MAX_MERGED_QUESTION_LENGTH).trim(),
  });
}
