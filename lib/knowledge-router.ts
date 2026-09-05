// Định tuyến câu hỏi về đúng lĩnh vực trước khi tra kho nội bộ (US-031).
// Chatbot phải trả lời từ kho tài liệu của cổng trước, chỉ khi kho không khớp
// mới đi tiếp sang fallback nguồn ngoài (DEC-010/DEC-012). Bộ định tuyến này
// là cổng vào của nhánh "kho nội bộ": nó chỉ nói câu hỏi thuộc lĩnh vực nào,
// không bao giờ tự sinh nội dung pháp lý.
import { normalizeVietnamese } from "./legal-content";
import { scoreSituationMatch, searchTokens } from "./situation-search";
import { contentTopics, type ContentTopic, type TopicDefinition } from "./topics";

export const knowledgeRoutePolicyVersion = "knowledge-route-v1";

// Gõ tắt đúng tên lĩnh vực ("ATGT", "BLHĐ") là tín hiệu mạnh, tính riêng để
// một token cũng đủ vượt ngưỡng.
const abbreviationScore = 4;

// Ngưỡng tối thiểu, đo trên bộ câu hỏi thật: câu đúng phạm vi đạt từ 6 điểm
// trở lên, còn câu ngoài phạm vi ("xin visa du học Nhật" chỉ trùng âm "học")
// cao nhất là 2. Chọn 4 để giữ khoảng cách hai chiều. Dưới ngưỡng thì trả null
// và pipeline chat đi tiếp sang fallback/fail-closed thay vì đoán bừa.
export const minimumRouteScore = 4;

export type KnowledgeRoute = Readonly<{
  topic: ContentTopic;
  score: number;
}>;

function topicHaystack(topic: TopicDefinition): string {
  return [
    topic.name,
    topic.detail,
    ...topic.keywords,
    ...topic.situations,
  ].join(" ");
}

function abbreviationBonus(
  topic: TopicDefinition,
  tokens: readonly string[],
): number {
  const abbreviations = new Set(
    topic.abbreviations.map((value) => normalizeVietnamese(value)),
  );
  return tokens.some((token) => abbreviations.has(token))
    ? abbreviationScore
    : 0;
}

export function scoreTopicRoute(
  topic: TopicDefinition,
  question: string,
): number {
  const tokens = searchTokens(question);
  if (tokens.length === 0) return 0;
  return (
    scoreSituationMatch(topicHaystack(topic), question) +
    abbreviationBonus(topic, tokens)
  );
}

// Lĩnh vực khớp nhất; hòa điểm thì giữ thứ tự registry để kết quả ổn định.
export function routeQuestionToTopic(question: string): KnowledgeRoute | null {
  if (searchTokens(question).length === 0) return null;
  let best: KnowledgeRoute | null = null;
  for (const topic of contentTopics) {
    const score = scoreTopicRoute(topic, question);
    if (score < minimumRouteScore) continue;
    if (!best || score > best.score) best = { topic: topic.name, score };
  }
  return best;
}
