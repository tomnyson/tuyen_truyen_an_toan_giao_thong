import { desc, eq } from "drizzle-orm";
import { getInitializedDb } from "@/db";
import { legalEntries } from "@/db/schema";
import {
  hasBlockedLegalBasis,
  laws,
  normalizeVietnamese,
} from "./legal-content";

const [helmetLaw, , falseInformationLaw] = laws;

export const legalContext = `
Bạn là Trợ lý AI của Cổng Luật Học Đường Việt Nam. Đối tượng là học sinh.
Nguyên tắc bắt buộc:
- Trả lời bằng tiếng Việt, thân thiện, dễ hiểu, tối đa 180 từ.
- Nêu kết luận ngắn trước, sau đó giải thích và đưa ra hành động an toàn.
- Không khẳng định đây là tư vấn pháp lý. Không yêu cầu họ tên, trường, địa chỉ hay dữ liệu riêng tư.
- Chỉ nêu số tiền hoặc điều khoản khi chắc chắn từ dữ liệu tham khảo bên dưới. Nếu câu hỏi vượt dữ liệu, nói rõ cần kiểm tra văn bản chính thức hoặc hỏi người lớn/cơ quan có thẩm quyền.
- Với nguy cơ bạo lực, phát tán ảnh nhạy cảm hoặc an toàn khẩn cấp: khuyên dừng chia sẻ, lưu bằng chứng an toàn và báo ngay cho phụ huynh, giáo viên hoặc cơ quan phù hợp.

Dữ liệu tham khảo của cổng:
${laws.map((law, index) => `${index + 1}. ${law.title}: ${law.legal}; ${law.penalty}.`).join("\n")}
${laws.length + 1}. Người từ đủ 14 đến dưới 16 tuổi: không áp dụng phạt tiền. Người từ đủ 16 đến dưới 18 tuổi: mức tiền phạt không quá một nửa mức áp dụng cho người thành niên; việc xử lý còn tùy hành vi và tình tiết.
${laws.length + 2}. Tình huống trên website là minh họa giáo dục, không phải hồ sơ xử phạt thực tế.
`;

export function findCuratedAnswer(question: string): string | null {
  const normalized = normalizeVietnamese(question);

  if (normalized.includes("mu bao hiem")) {
    const penalty = helmetLaw.penalty.replace(" – ", "–").replace("đ", " đồng");
    return `Không đội mũ bảo hiểm khi đi xe máy hoặc xe máy điện là vi phạm. Mức tham khảo cho người thành niên là ${penalty} theo ${helmetLaw.legal}. Nếu bạn từ 16 đến dưới 18 tuổi, tiền phạt không quá một nửa mức của người thành niên; từ 14 đến dưới 16 tuổi không áp dụng phạt tiền. Hãy luôn đội mũ đạt chuẩn và cài quai đúng cách.`;
  }
  if (
    normalized.includes("tin sai") ||
    normalized.includes("facebook") ||
    normalized.includes("dang lai")
  ) {
    const penalty = falseInformationLaw.penalty
      .replace("5 – 10", "5–10")
      .replace(" đối với cá nhân*", "");
    return `Việc đăng hoặc chia sẻ lại thông tin sai sự thật vẫn có thể gây trách nhiệm, kể cả khi bạn không phải người viết đầu tiên. Cá nhân có thể bị phạt ${penalty} và buộc gỡ nội dung theo ${falseInformationLaw.legal}. Hãy dừng chia sẻ, kiểm tra nguồn và đính chính nếu đã đăng.`;
  }
  if (
    normalized.includes("50cc") ||
    normalized.includes("15 tuoi") ||
    normalized.includes("16 tuoi")
  ) {
    return "Độ tuổi và thông số thực tế của phương tiện quyết định bạn có được điều khiển hay không. Không nên chỉ dựa vào tên gọi “xe điện” hoặc “50cc”. Hãy kiểm tra giấy đăng ký xe và nhờ phụ huynh xác nhận trước khi sử dụng; tuyệt đối không tự lái xe không phù hợp độ tuổi.";
  }
  return null;
}

export async function findManagedAnswer(question: string): Promise<string | null> {
  const ignoredTerms = new Set(["cho", "cua", "duoc", "khong", "nhung", "the", "nao", "voi"]);
  const terms = normalizeVietnamese(question)
    .split(/[^a-z0-9]+/)
    .filter((term) => term.length >= 3 && !ignoredTerms.has(term));
  if (!terms.length) return null;

  try {
    const db = await getInitializedDb();
    const entries = await db.select()
      .from(legalEntries)
      .where(eq(legalEntries.status, "published"))
      .orderBy(desc(legalEntries.updatedAt))
      .limit(100);
    const ranked = entries
      .filter((entry) => !hasBlockedLegalBasis(entry.legalBasis))
      .map((entry) => {
        const searchable = normalizeVietnamese(
          `${entry.title} ${entry.topic} ${entry.tags} ${entry.legalBasis}`,
        );
        return { entry, score: terms.filter((term) => searchable.includes(term)).length };
      })
      .sort((left, right) => right.score - left.score);
    const best = ranked[0];
    if (!best || best.score < Math.min(2, terms.length)) return null;

    return `${best.entry.title}. Mức phạt hoặc cách xử lý tham khảo: ${best.entry.penalty}. Căn cứ: ${best.entry.legalBasis}. Biện pháp nên thực hiện: ${best.entry.remedy} Nội dung do ban quản trị biên soạn và xuất bản; việc áp dụng thực tế còn phụ thuộc độ tuổi, chủ thể và tình tiết cụ thể.`;
  } catch {
    return null;
  }
}
