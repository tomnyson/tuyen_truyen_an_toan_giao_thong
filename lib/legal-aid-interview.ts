import type { ComplaintFormState } from "./complaint-form-state";

export interface InterviewResponse {
  assistantReply: string;
  extractedFields: Partial<ComplaintFormState>;
}

export function processInterviewMessage(
  message: string,
  _history: Array<{ role: "user" | "assistant"; content: string }>,
): InterviewResponse {
  const lower = message.toLowerCase();
  const extracted: Partial<ComplaintFormState> = {};
  const incident: Partial<ComplaintFormState["incident"]> = {};
  const accused: Partial<ComplaintFormState["accused"]> = {};
  const evidence: Partial<ComplaintFormState["evidence"]> = { items: [] };

  // 1. Phân loại hành vi
  if (lower.includes("lừa") || lower.includes("tiền") || lower.includes("nhiệm vụ") || lower.includes("chuyển khoản")) {
    incident.behaviorSummary = "Lừa đảo chiếm đoạt tài sản qua mạng";
  } else if (lower.includes("đánh") || lower.includes("đe dọa") || lower.includes("bạo lực") || lower.includes("chặn đường")) {
    incident.behaviorSummary = "Đe dọa dùng vũ lực / Bạo lực học đường";
  } else if (lower.includes("hình ảnh") || lower.includes("clip") || lower.includes("bôi nhọ") || lower.includes("nhục")) {
    incident.behaviorSummary = "Làm nhục người khác / Phát tán hình ảnh riêng tư";
  } else if (lower.includes("vay") || lower.includes("app") || lower.includes("tống tiền")) {
    incident.behaviorSummary = "Cưỡng đoạt tài sản / Cho vay nặng lãi";
  }

  // 2. Trích xuất tên đối tượng (chỉ bắt từ viết hoa sau từ khóa)
  const nameMatch = message.match(/(?:[Tt]ên(?: là)?|[Bb]ạn|[Đđ]ối tượng)\s+([A-ZÀ-Ỹ][a-zà-ỹ]*(?:\s+[A-ZÀ-Ỹ][a-zà-ỹ]*)*)/);
  if (nameMatch && nameMatch[1]) {
    accused.fullName = nameMatch[1].trim();
  }

  // 3. Trích xuất thiệt hại
  const moneyMatch = message.match(/(\d+(?:\s*(?:triệu|tr|nghìn|k|đồng|vnd))+)/i);
  if (moneyMatch && moneyMatch[1]) {
    incident.damageOrLoss = moneyMatch[1].trim();
  }

  // 4. Trích xuất bằng chứng
  if (lower.includes("tin nhắn") || lower.includes("chụp") || lower.includes("screenshot")) {
    evidence.items?.push("Ảnh chụp màn hình cuộc hội thoại/tin nhắn");
  }
  if (lower.includes("biên lai") || lower.includes("sao kê") || lower.includes("chuyển khoản")) {
    evidence.items?.push("Biên lai chuyển tiền ngân hàng");
  }

  incident.chronology = message.trim();

  // Tạo phản hồi ân cần, mang tính trấn an
  let assistantReply = "";
  if (incident.behaviorSummary) {
    assistantReply = `Em hãy bình tĩnh nhé, anh/chị đã ghi nhận dấu hiệu hành vi: "${incident.behaviorSummary}". `;
    if (!accused.fullName) {
      assistantReply += "Em có biết họ tên đầy đủ, số điện thoại hoặc tài khoản mạng xã hội của đối tượng này không? ";
    } else {
      assistantReply += `Đã ghi nhận đối tượng là "${accused.fullName}". `;
    }
    assistantReply += "Sự việc này xảy ra vào khoảng thời gian nào và ở địa điểm cụ thể nào (trường học, nhà riêng hay qua không gian mạng)?";
  } else {
    assistantReply =
      "Chào em, em đừng quá lo lắng nhé. Em hãy kể lại tóm tắt sự việc đang gặp phải: Ai là người làm phiền/gây tổn hại cho em, họ đã làm gì và sự việc diễn ra khi nào?";
  }

  if (Object.keys(incident).length > 0) extracted.incident = incident as ComplaintFormState["incident"];
  if (Object.keys(accused).length > 0) extracted.accused = accused as ComplaintFormState["accused"];
  if (evidence.items && evidence.items.length > 0) extracted.evidence = evidence as ComplaintFormState["evidence"];

  return { assistantReply, extractedFields: extracted };
}
