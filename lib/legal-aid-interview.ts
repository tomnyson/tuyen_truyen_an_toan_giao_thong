import type { ComplaintFormState } from "./complaint-form-state";

export interface InterviewResponse {
  assistantReply: string;
  extractedFields: Partial<ComplaintFormState>;
  extractedSummary?: string[];
}

const COMMON_STOP_WORDS = new Set([
  "chào", "xin", "luật", "sư", "em", "anh", "chị", "tôi", "bạn", "dạ", "vâng",
  "không", "có", "rồi", "đang", "muốn", "hỏi", "giúp", "với", "ạ", "ơi", "nhé",
  "được", "làm", "sao", "thế", "nào", "gì", "ai", "đâu", "khi", "nào", "vào",
  "bị", "lừa", "đánh", "chặn", "tiền"
]);

function capitalizeVietnamese(str: string): string {
  return str
    .trim()
    .split(/\s+/)
    .map((word) => {
      if (!word) return "";
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

function isPotentialName(text: string): boolean {
  const cleaned = text.replace(/[.,/#!$%^&*;:{}=\-_`~()?"'<>]/g, "").trim();
  const words = cleaned.split(/\s+/);
  if (words.length < 2 || words.length > 5) return false;

  // Nếu tất cả từ đều là stop words thông thường thì không phải tên
  const lowerWords = words.map((w) => w.toLowerCase());
  const allStopWords = lowerWords.every((w) => COMMON_STOP_WORDS.has(w));
  if (allStopWords) return false;

  // Kiểm tra chỉ gồm chữ cái tiếng Việt và khoảng trắng
  const validLetters = /^[\p{L}\s]+$/u.test(cleaned);
  return validLetters;
}

export function processInterviewMessage(
  message: string,
  history: Array<{ role: "user" | "assistant"; content: string }> = [],
): InterviewResponse {
  const trimmed = message.trim();
  const lower = trimmed.toLowerCase();
  const extracted: Partial<ComplaintFormState> = {};
  const incident: Partial<ComplaintFormState["incident"]> = {};
  const accused: Partial<ComplaintFormState["accused"]> = {};
  const evidence: Partial<ComplaintFormState["evidence"]> = { items: [] };
  const updatedSummary: string[] = [];

  // Tìm câu hỏi gần nhất của trợ lý trong lịch sử
  const lastAssistantMsg = [...history]
    .reverse()
    .find((m) => m.role === "assistant")?.content?.toLowerCase() || "";

  // 1. Phân loại hành vi vi phạm
  if (
    lower.includes("lừa") ||
    lower.includes("nhiệm vụ") ||
    lower.includes("chuyển khoản") ||
    lower.includes("nạp thẻ") ||
    lower.includes("mất tiền") ||
    lower.includes("giả mạo")
  ) {
    incident.behaviorSummary = "Lừa đảo chiếm đoạt tài sản qua mạng";
    updatedSummary.push("Hành vi: Lừa đảo chiếm đoạt tài sản qua mạng");
  } else if (
    lower.includes("đánh") ||
    lower.includes("chặn đường") ||
    lower.includes("bạo lực") ||
    lower.includes("tát") ||
    lower.includes("xô xát") ||
    lower.includes("bắt nạt")
  ) {
    incident.behaviorSummary = "Đe dọa dùng vũ lực / Bạo lực học đường";
    updatedSummary.push("Hành vi: Đe dọa dùng vũ lực / Bạo lực học đường");
  } else if (
    lower.includes("hình ảnh") ||
    lower.includes("clip") ||
    lower.includes("bôi nhọ") ||
    lower.includes("nhục") ||
    lower.includes("ảnh nóng") ||
    lower.includes("phát tán") ||
    lower.includes("tin nhắn riêng tư")
  ) {
    incident.behaviorSummary = "Làm nhục người khác / Phát tán hình ảnh riêng tư";
    updatedSummary.push("Hành vi: Làm nhục người khác / Phát tán hình ảnh riêng tư");
  } else if (
    lower.includes("vay") ||
    lower.includes("tống tiền") ||
    lower.includes("cưỡng đoạt") ||
    lower.includes("ép đưa tiền")
  ) {
    incident.behaviorSummary = "Cưỡng đoạt tài sản / Cho vay nặng lãi";
    updatedSummary.push("Hành vi: Cưỡng đoạt tài sản / Cho vay nặng lãi");
  }

  // 2. Trích xuất tên đối tượng
  // Cách A: Có từ khoá chỉ danh tính kèm tên viết hoa ("tên Hoàng trên Facebook", "Bạn Tuấn cùng lớp")
  const capMatch = trimmed.match(
    /(?:[Tt]ên(?: là)?|[Bb]ạn|[Đđ]ối tượng|[Nn]ick)\s+([A-ZÀ-Ỹ][a-zà-ỹ]*(?:\s+[A-ZÀ-Ỹ][a-zà-ỹ]*)*)/
  );
  if (capMatch && capMatch[1]) {
    accused.fullName = capMatch[1].trim();
    updatedSummary.push(`Đối tượng: ${accused.fullName}`);
  }

  // Cách B: Nhập tên trực tiếp (Toàn bộ tin nhắn là họ tên người, VD: "Nguyên văn linh", "Nguyễn Văn Linh")
  if (!accused.fullName) {
    const isAnsweringWho =
      lastAssistantMsg.includes("ai là người") ||
      lastAssistantMsg.includes("họ tên") ||
      lastAssistantMsg.includes("đối tượng") ||
      lastAssistantMsg.includes("ai làm");

    if (isAnsweringWho && isPotentialName(trimmed)) {
      accused.fullName = capitalizeVietnamese(trimmed);
      updatedSummary.push(`Đối tượng: ${accused.fullName}`);
    } else if (isPotentialName(trimmed) && !incident.behaviorSummary) {
      accused.fullName = capitalizeVietnamese(trimmed);
      updatedSummary.push(`Đối tượng: ${accused.fullName}`);
    }
  }

  // 3. Trích xuất tài khoản / SĐT / liên hệ đối tượng
  const phoneMatch = trimmed.match(/(?:0|\+84)[3|5|7|8|9][0-9]{8}\b/);
  if (phoneMatch) {
    accused.addressOrAccount = phoneMatch[0];
    updatedSummary.push(`Số điện thoại liên hệ: ${phoneMatch[0]}`);
  }
  const socialMatch = trimmed.match(/(?:facebook|fb|zalo|tiktok)(?:\.com|\.me)?(?:\s*[:=]?\s*|\/)([\w.-]+)/i);
  if (socialMatch && socialMatch[1]) {
    accused.addressOrAccount = `${socialMatch[0]}`;
    updatedSummary.push(`Tài khoản mạng xã hội: ${socialMatch[0]}`);
  }

  // 4. Trích xuất thiệt hại tài sản
  const moneyMatch = message.match(/(\d+(?:[.,]\d+)?(?:\s*(?:triệu|tr|nghìn|ngàn|k|đồng|vnd|đ))+)/i);
  if (moneyMatch && moneyMatch[1]) {
    incident.damageOrLoss = moneyMatch[1].trim();
    updatedSummary.push(`Thiệt hại: ${incident.damageOrLoss}`);
  }

  // 5. Trích xuất địa điểm và thời gian
  const locationMatches = [
    "cổng trường", "lớp học", "sân trường", "quán net", "trên mạng",
    "qua mạng xã hội", "qua zalo", "qua facebook", "nhà riêng", "đường đi học về"
  ];
  for (const loc of locationMatches) {
    if (lower.includes(loc)) {
      incident.location = loc;
      updatedSummary.push(`Địa điểm: ${loc}`);
      break;
    }
  }

  const timeMatches = [
    "hôm qua", "sáng nay", "tối qua", "trưa nay", "tuần trước",
    "tháng trước", "hôm thứ hai", "hôm kia"
  ];
  for (const t of timeMatches) {
    if (lower.includes(t)) {
      incident.occurrenceTime = t;
      updatedSummary.push(`Thời gian: ${t}`);
      break;
    }
  }

  // 6. Trích xuất chứng cứ
  if (lower.includes("tin nhắn") || lower.includes("chụp") || lower.includes("screenshot")) {
    evidence.items?.push("Ảnh chụp màn hình cuộc hội thoại / tin nhắn đe dọa");
    updatedSummary.push("Chứng cứ: Ảnh chụp màn hình");
  }
  if (lower.includes("biên lai") || lower.includes("sao kê") || lower.includes("giao dịch")) {
    evidence.items?.push("Biên lai / Sao kê tài khoản chuyển tiền");
    updatedSummary.push("Chứng cứ: Biên lai chuyển khoản");
  }
  if (lower.includes("ghi âm") || lower.includes("video") || lower.includes("clip")) {
    evidence.items?.push("File ghi âm / video chứng minh vụ việc");
    updatedSummary.push("Chứng cứ: File ghi âm / video");
  }

  // Ghi diễn biến lời kể nếu có nội dung thực sự
  if (trimmed.length > 5 && !isPotentialName(trimmed)) {
    incident.chronology = trimmed;
  }

  // Kiểm tra thông tin đã có từ trước trong lịch sử để hỏi bước tiếp theo
  const fullHistoryText = history.map((h) => h.content).join(" ").toLowerCase();
  const alreadyHasAccused = Boolean(accused.fullName || fullHistoryText.includes("đối tượng"));
  const alreadyHasTimeOrPlace = Boolean(incident.occurrenceTime || incident.location);

  // Tạo phản hồi linh hoạt, xác nhận đúng mục vừa nhận được và hỏi câu hỏi kế tiếp
  let assistantReply = "";
  if (accused.fullName && !incident.behaviorSummary) {
    assistantReply = `Anh/chị đã ghi nhận đối tượng liên quan là **${accused.fullName}** vào đơn tố giác. Em hãy kể rõ hơn: Người này đã có hành vi gì gây tổn hại cho em (ví dụ: lừa tiền, đe dọa đánh, bôi nhọ trên mạng...), và sự việc xảy ra ở đâu, vào lúc nào?`;
  } else if (incident.behaviorSummary) {
    assistantReply = `Anh/chị đã ghi nhận dấu hiệu hành vi: "${incident.behaviorSummary}". `;
    if (accused.fullName) {
      assistantReply += `Đối tượng vi phạm là "${accused.fullName}". `;
    } else if (!alreadyHasAccused) {
      assistantReply += "Em có biết họ tên, tài khoản mạng xã hội hoặc số điện thoại của người này không? ";
    }
    if (!alreadyHasTimeOrPlace) {
      assistantReply += "Sự việc này xảy ra vào khoảng thời gian nào và ở địa điểm cụ thể nào (ở trường, nhà riêng hay qua mạng)? ";
    }
    if (incident.damageOrLoss) {
      assistantReply += `Thiệt hại ghi nhận là ${incident.damageOrLoss}. `;
    }
    assistantReply += "Em có lưu giữ bằng chứng nào (tin nhắn chụp, sao kê chuyển khoản, ghi âm) không?";
  } else if (incident.location || incident.occurrenceTime) {
    assistantReply = `Anh/chị đã ghi nhận thời gian/địa điểm diễn ra sự việc (${incident.occurrenceTime || ""} ${incident.location || ""}). Em hãy cho biết rõ hơn người gây tổn hại cho em là ai và họ đã làm những gì nhé.`;
  } else if (lower.includes("chào") || lower.includes("giúp")) {
    assistantReply =
      "Chào em, em đừng quá lo lắng nhé. Trợ lý pháp lý ở đây để bảo vệ quyền lợi cho em. Em hãy chia sẻ: Ai là người đang làm tổn hại/lừa dối em, hành vi cụ thể là gì và xảy ra khi nào?";
  } else {
    // Trường hợp câu văn ngắn hoặc lời kể tự do
    assistantReply = `Anh/chị đã ghi nhận thông tin em vừa cung cấp vào bản thảo đơn tố giác. Em hãy cho biết thêm: Ai là người thực hiện hành vi này, sự việc xảy ra vào lúc nào và em có lưu lại bằng chứng gì không?`;
  }

  if (Object.keys(incident).length > 0) extracted.incident = incident as ComplaintFormState["incident"];
  if (Object.keys(accused).length > 0) extracted.accused = accused as ComplaintFormState["accused"];
  if (evidence.items && evidence.items.length > 0) extracted.evidence = evidence as ComplaintFormState["evidence"];

  return {
    assistantReply,
    extractedFields: extracted,
    extractedSummary: updatedSummary.length > 0 ? updatedSummary : undefined,
  };
}
