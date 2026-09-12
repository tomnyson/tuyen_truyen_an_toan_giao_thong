// Nguồn câu chữ duy nhất cho khuyến cáo độ chính xác của nội dung do AI tạo
// (US-038, DEC-020). Trước đây câu khuyến cáo nằm rải ở footer hộp chat,
// `modal-note` của trang điều luật và hai hằng cảnh báo trong
// `lib/openai-web-search.ts`, nên sửa một chỗ là lệch ba chỗ còn lại. Mọi bề
// mặt phải đọc từ đây; không tệp nào được viết lại câu khuyến cáo của riêng nó.
import type { AnswerOrigin } from "./answer-origin";

export const disclosureLevels = ["reviewed", "unverified"] as const;

export type DisclosureLevel = (typeof disclosureLevels)[number];

export type AiDisclosure = Readonly<{
  level: DisclosureLevel;
  title: string;
  body: string;
  // Nhãn của liên kết mở nguồn gốc; trình bày dùng lại, không tự đặt tên khác.
  actionLabel: string;
}>;

// Nội dung đã qua duyệt bốn mắt: vẫn phải nhắc người đọc đối chiếu văn bản gốc
// vì mức áp dụng thực tế phụ thuộc độ tuổi, chủ thể và tình tiết cụ thể.
export const reviewedDisclosure: AiDisclosure = Object.freeze({
  level: "reviewed",
  title: "Thông tin tham khảo, cần đối chiếu văn bản gốc",
  body: "Nội dung được biên soạn để học tập và đã qua duyệt nội bộ, nhưng không thay thế tư vấn pháp lý. Mức áp dụng thực tế phụ thuộc độ tuổi, chủ thể và tình tiết cụ thể — hãy đối chiếu văn bản gốc trước khi áp dụng.",
  actionLabel: "Mở văn bản gốc",
});

// Nhánh tra cứu trực tiếp bên ngoài: chưa qua kiểm duyệt của cổng nên câu chữ
// phải nói thẳng hai điều — không bảo đảm chính xác, và không dùng làm căn cứ.
export const unverifiedDisclosure: AiDisclosure = Object.freeze({
  level: "unverified",
  title: "Kết quả AI chưa được kiểm duyệt",
  body: "Phần trả lời này do AI tra cứu tự động, chưa qua quy trình kiểm duyệt nội dung của cổng nên không bảo đảm chính xác 100% và không dùng làm căn cứ pháp lý. Hãy mở nguồn bên dưới hoặc hỏi cơ quan có thẩm quyền trước khi áp dụng.",
  actionLabel: "Mở nguồn để kiểm tra",
});

const disclosureByOrigin: Record<AnswerOrigin, AiDisclosure> = {
  library: reviewedDisclosure,
  grounded_library: reviewedDisclosure,
  reviewed_web: reviewedDisclosure,
  live_web: unverifiedDisclosure,
};

// `null` xảy ra khi câu trả lời không mang nhãn nguồn (nhánh fail-closed, lỗi
// mạng). Vẫn trả về khuyến cáo chứ không trả về null: không bề mặt nào được
// phép hiển thị nội dung AI mà thiếu khuyến cáo.
export function disclosureFor(origin: AnswerOrigin | null): AiDisclosure {
  return origin ? disclosureByOrigin[origin] : reviewedDisclosure;
}

// Hai câu cảnh báo đi kèm payload chat của nhánh tra cứu ngoài. Chúng dài hơn
// `unverifiedDisclosure.body` vì còn phân biệt nguồn Chính phủ với nguồn tham
// khảo, nhưng vẫn thuộc cùng một bộ câu chữ nên phải sống ở tệp này.
export const unverifiedOfficialSourceWarning =
  "Đây là kết quả AI tra cứu trực tuyến từ nguồn Chính phủ và chưa đi qua quy trình kiểm duyệt nội dung của cổng. Bạn nên mở nguồn bên dưới để kiểm tra trước khi áp dụng.";

export const unverifiedReferenceSourceWarning =
  "Đây là kết quả AI từ nguồn tham khảo ngoài, không phải nguồn chính thống và chưa được cổng kiểm duyệt. Bạn cần xác minh lại bằng văn bản hoặc cơ quan chính thức trước khi áp dụng.";
