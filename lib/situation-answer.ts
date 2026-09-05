// Câu trả lời ba phần theo yêu cầu #2 của bản điều chỉnh 2026-09-05: người
// đọc cần biết LÀM GÌ trước, rồi mới tới nguy cơ, cuối cùng mới là trích dẫn
// luật để đối chiếu. Thứ tự do `situationAnswerParts` quyết định, không phụ
// thuộc thứ tự dữ liệu đầu vào.

export const situationAnswerParts = ["handling", "risk", "citation"] as const;

export type SituationAnswerPart = (typeof situationAnswerParts)[number];

const partTitles: Record<SituationAnswerPart, string> = {
  handling: "Cách xử lý nhanh",
  risk: "Cảnh báo nguy cơ và mức phạt",
  citation: "Trích dẫn luật để đối chiếu",
};

// Fallback không được phép bịa căn cứ hay mức phạt: khi thiếu dữ liệu đã duyệt
// thì nói rõ là chưa có, kèm hành động an toàn chung.
const fallbackHandling =
  "Giữ bình tĩnh, lưu lại bằng chứng và báo ngay cho giáo viên, phụ huynh hoặc cơ quan có thẩm quyền.";
const fallbackRisk = "Chưa công bố mức tham khảo";
const fallbackCitation = "Đang kiểm chứng căn cứ hiện hành";

export type SituationAnswerInput = Readonly<{
  remedy?: string;
  penalty?: string;
  legalBasis?: string;
  citationUrl?: string;
}>;

export type SituationAnswerBlock = Readonly<{
  part: SituationAnswerPart;
  title: string;
  body: string;
  url: string;
}>;

export function situationAnswerPartTitle(part: SituationAnswerPart): string {
  return partTitles[part];
}

function bodyOf(value: string | undefined, fallback: string): string {
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed || fallback;
}

export function buildSituationAnswer(
  input: SituationAnswerInput,
): readonly SituationAnswerBlock[] {
  const bodies: Record<SituationAnswerPart, string> = {
    handling: bodyOf(input.remedy, fallbackHandling),
    risk: bodyOf(input.penalty, fallbackRisk),
    citation: bodyOf(input.legalBasis, fallbackCitation),
  };
  const citationUrl = bodyOf(input.citationUrl, "");
  return Object.freeze(
    situationAnswerParts.map((part) =>
      Object.freeze({
        part,
        title: partTitles[part],
        body: bodies[part],
        url: part === "citation" ? citationUrl : "",
      }),
    ),
  );
}
