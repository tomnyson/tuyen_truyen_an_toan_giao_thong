// Nhãn nguồn của câu trả lời chat (US-031). Người đọc phải phân biệt được ngay
// câu trả lời đến từ kho nội dung đã duyệt của cổng hay từ tra cứu bên ngoài,
// vì mức độ tin cậy của hai nhánh không giống nhau.

export const answerOrigins = [
  "library",
  "grounded_library",
  "reviewed_web",
  "live_web",
] as const;

export type AnswerOrigin = (typeof answerOrigins)[number];

export type AnswerOriginCopy = Readonly<{
  label: string;
  detail: string;
}>;

const originCopy: Record<AnswerOrigin, AnswerOriginCopy> = {
  library: {
    label: "Kho nội dung của cổng",
    detail: "Trả lời từ nội dung đã xuất bản trên cổng.",
  },
  grounded_library: {
    label: "Kho nội dung của cổng, diễn giải lại",
    detail:
      "Nội dung đã duyệt bốn mắt của cổng được diễn giải lại cho dễ hiểu; mức phạt và căn cứ pháp lý giữ nguyên từ dữ liệu gốc.",
  },
  reviewed_web: {
    label: "Nguồn ngoài đã kiểm duyệt",
    detail: "Nội dung tra cứu bên ngoài đã qua duyệt bốn mắt trước khi hiển thị.",
  },
  live_web: {
    label: "Tra cứu nguồn ngoài",
    detail:
      "Kho nội dung của cổng chưa có câu trả lời nên phần này tra cứu trực tiếp bên ngoài; hãy đối chiếu với văn bản gốc.",
  },
};

export function answerOriginCopyOf(origin: AnswerOrigin): AnswerOriginCopy {
  return originCopy[origin];
}

export function parseAnswerOrigin(value: unknown): AnswerOrigin | null {
  return typeof value === "string" &&
    (answerOrigins as readonly string[]).includes(value)
    ? (value as AnswerOrigin)
    : null;
}
