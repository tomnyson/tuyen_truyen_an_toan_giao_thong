// Nguồn duy nhất cho bộ lĩnh vực nội dung (US-030). Trước đây danh sách chủ đề
// bị chép ở bốn nơi (public projector, admin API, form CMS, trang chủ) nên chỉ
// cần thêm một lĩnh vực là chắc chắn lệch. Mọi nơi phải import từ đây.

export const contentTopicNames = [
  "Giao thông",
  "Mạng xã hội",
  "Bạo lực học đường",
  "An ninh trật tự",
  "Sở hữu trí tuệ",
] as const;

export type ContentTopic = (typeof contentTopicNames)[number];
export type Topic = "Tất cả" | ContentTopic;

export type TopicDefinition = Readonly<{
  name: ContentTopic;
  icon: string;
  detail: string;
  // Từ viết tắt người dùng hay gõ; dùng cho tra cứu chứ không hiển thị.
  abbreviations: readonly string[];
  // Từ khóa mở rộng để câu hỏi đời thực chạm được tới lĩnh vực.
  keywords: readonly string[];
  // Câu hỏi tình huống mẫu hiển thị thành chip gợi ý.
  situations: readonly string[];
}>;

export const contentTopics: readonly TopicDefinition[] = Object.freeze([
  Object.freeze({
    name: "Giao thông",
    icon: "◉",
    detail: "Xe điện & xe máy",
    abbreviations: ["atgt", "gtdb"],
    keywords: [
      "an toàn giao thông",
      "giao thông đường bộ",
      "xe máy điện",
      "xe đạp điện",
      "mũ bảo hiểm",
      "vượt đèn đỏ",
      "chở quá số người",
      "chưa đủ tuổi điều khiển xe",
      "xe 50cc",
    ],
    situations: [
      "Chưa đủ tuổi mà đi xe máy điện tới trường thì sao?",
      "Không đội mũ bảo hiểm bị xử lý thế nào?",
      "Chở ba bạn đi học có bị phạt không?",
    ],
  }),
  Object.freeze({
    name: "Mạng xã hội",
    icon: "@",
    detail: "Ứng xử trên không gian mạng",
    abbreviations: ["mxh", "kgm"],
    keywords: [
      "mạng xã hội",
      "không gian mạng",
      "facebook",
      "tiktok",
      "zalo",
      "tin sai sự thật",
      "ảnh riêng tư",
      "lừa đảo trực tuyến",
    ],
    situations: [
      "Bị ghép ảnh chế giễu đăng Facebook thì làm gì?",
      "Đăng lại tin chưa kiểm chứng có bị phạt không?",
      "Bị dụ chuyển khoản qua Zalo thì xử lý sao?",
    ],
  }),
  Object.freeze({
    name: "Bạo lực học đường",
    icon: "⚠",
    detail: "Bắt nạt & xô xát trong trường",
    abbreviations: ["blhd"],
    keywords: [
      "bạo lực học đường",
      "bắt nạt",
      "bắt nạt trực tuyến",
      "đánh nhau",
      "cô lập bạn",
      "đe dọa",
      "nhắn tin đe dọa",
    ],
    situations: [
      "Chứng kiến bạn bị đánh trong trường thì nên làm gì?",
      "Bị nhóm bạn cô lập và đe dọa thì báo cho ai?",
      "Bị quay clip đánh nhau tung lên mạng phải làm sao?",
    ],
  }),
  Object.freeze({
    name: "An ninh trật tự",
    icon: "▣",
    detail: "Trật tự công cộng & an toàn",
    abbreviations: ["antt"],
    keywords: [
      "an ninh trật tự",
      "gây rối trật tự công cộng",
      "tụ tập đua xe",
      "pháo nổ",
      "vũ khí",
      "chất cấm",
    ],
    situations: [
      "Bị rủ tụ tập đua xe ban đêm thì từ chối thế nào?",
      "Đốt pháo dịp lễ tết có vi phạm không?",
      "Phát hiện bạn mang hung khí vào trường thì báo ai?",
    ],
  }),
  Object.freeze({
    name: "Sở hữu trí tuệ",
    icon: "©",
    detail: "Bản quyền & đạo văn",
    abbreviations: ["shtt"],
    keywords: [
      "sở hữu trí tuệ",
      "bản quyền",
      "đạo văn",
      "sao chép tác phẩm",
      "phần mềm lậu",
    ],
    situations: [
      "Chép bài trên mạng nộp cho cô có bị coi là đạo văn?",
      "Dùng nhạc có bản quyền cho video của lớp được không?",
    ],
  }),
]);

// Danh sách cho bộ lọc trên trang công khai: "Tất cả" luôn đứng đầu.
export const filterTopics: readonly Readonly<{
  name: Topic;
  icon: string;
  detail: string;
}>[] = Object.freeze([
  Object.freeze({ name: "Tất cả" as Topic, icon: "⌕", detail: "Mọi lĩnh vực" }),
  ...contentTopics.map((topic) =>
    Object.freeze({
      name: topic.name as Topic,
      icon: topic.icon,
      detail: topic.detail,
    }),
  ),
]);

const topicByName = new Map<string, TopicDefinition>(
  contentTopics.map((topic) => [topic.name, topic]),
);

export function isContentTopic(value: unknown): value is ContentTopic {
  return typeof value === "string" && topicByName.has(value);
}

export function findTopic(name: string): TopicDefinition | null {
  return topicByName.get(name) ?? null;
}

// Chip gợi ý: khi chưa chọn lĩnh vực thì lấy câu đầu tiên của mỗi lĩnh vực để
// người dùng thấy ngay phạm vi của cổng.
export function situationSuggestions(
  topic: Topic,
  limit = 3,
): readonly string[] {
  if (limit <= 0) return [];
  const selected = topicByName.get(topic);
  if (selected) return selected.situations.slice(0, limit);
  return contentTopics
    .map((item) => item.situations[0])
    .filter((question): question is string => Boolean(question))
    .slice(0, limit);
}

// Chip tra cứu nhanh ở hero — nhãn ngắn xếp hai cột theo `design/index.html`.
// Nhãn cũng chính là truy vấn được nạp vào ô tìm kiếm nên không lệch kỳ vọng.
export type HeroQuickChip = {
  readonly label: string;
  readonly tone: "brick" | "sky" | "green" | "gold";
  readonly topic: ContentTopic;
};

export const heroQuickChips: readonly HeroQuickChip[] = [
  { label: "Bị bắt nạt ở trường", tone: "brick", topic: "Bạo lực học đường" },
  { label: "Bị lộ ảnh riêng tư", tone: "sky", topic: "Mạng xã hội" },
  { label: "Bị lừa đảo qua mạng", tone: "green", topic: "Mạng xã hội" },
  { label: "Đi xe điện chưa đủ tuổi", tone: "gold", topic: "Giao thông" },
];
