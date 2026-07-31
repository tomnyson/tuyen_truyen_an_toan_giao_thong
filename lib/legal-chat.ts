import { and, desc, eq } from "drizzle-orm";
import { getInitializedDb } from "@/db";
import { legalEntries } from "@/db/schema";
import {
  hasBlockedLegalBasis,
  laws,
  normalizeVietnamese,
  type LawItem,
} from "./legal-content";
import {
  flattenChatAnswerSections,
  reviewedCitationsToLegalBasisSection,
  type ChatAnswerSection,
  type PublicChatAnswer,
} from "./chat-answer-presentation";
import {
  chatTopicLabel,
  type ChatTopic,
} from "./chat-topic-scope";
import type { OfficialSourceLink } from "./official-source-url";

const [helmetLaw, , falseInformationLaw] = laws;

export type KnowledgeChatAnswer = PublicChatAnswer & {
  sources?: OfficialSourceLink[];
};

function curatedPresentation(
  law: LawItem,
  summary: string,
  explanation: string,
  sanction: LawItem["reviewedSanction"],
  action: string,
  warnings: string[],
): KnowledgeChatAnswer {
  const sections: ChatAnswerSection[] = [
    { kind: "summary", paragraphs: [summary], bullets: [] },
    { kind: "details", paragraphs: [explanation], bullets: [] },
    { kind: "examples", paragraphs: [law.caseStudy], bullets: [] },
  ];
  if (law.citation) {
    const legalBasis = reviewedCitationsToLegalBasisSection([
      {
        title: law.citation.title,
        documentNumber: law.citation.documentNumber,
        issuedAt: law.citation.issuedAt,
        article: law.citation.article,
        clause: law.citation.clause,
        point: law.citation.point,
        effectiveFrom: law.citation.effectiveFrom,
        lastVerifiedAt: law.citation.lastVerifiedAt,
      },
    ]);
    if (legalBasis) sections.push(legalBasis);
  }
  if (sanction) {
    sections.push({
      kind: "sanctions",
      paragraphs: [
        `${sanction.summary} Đối tượng tham khảo: ${sanction.subject}`,
      ],
      bullets: sanction.conditions,
    });
  }
  sections.push({
    kind: "next_steps",
    paragraphs: [action],
    bullets: [],
  });
  const limitations = [
    ...(law.citation?.statusNote ? [law.citation.statusNote] : []),
    ...warnings,
  ];
  if (limitations.length > 0) {
    sections.push({
      kind: "limitations",
      paragraphs: limitations,
      bullets: [],
    });
  }
  return {
    answer: flattenChatAnswerSections(sections),
    sections,
    sources: law.citation
      ? [
          {
            title: `${law.citation.documentNumber} — ${law.citation.title}`,
            url: law.citation.officialUrl,
          },
        ]
      : undefined,
  };
}

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

export function findCuratedAnswer(question: string): KnowledgeChatAnswer | null {
  const normalized = normalizeVietnamese(question);

  if (
    (normalized.includes("tai khoan") &&
      (normalized.includes("hack") ||
        normalized.includes("chiem") ||
        normalized.includes("mat"))) ||
    normalized.includes("lo mat khau")
  ) {
    const sections: ChatAnswerSection[] = [
      {
        kind: "summary",
        paragraphs: [
          "Hãy coi đây là sự cố an toàn tài khoản và xử lý ngay, chưa nên tự kết luận có tội danh hay mức phạt.",
        ],
        bullets: [],
      },
      {
        kind: "next_steps",
        paragraphs: ["Các việc nên làm theo thứ tự:"],
        bullets: [
          "Đổi mật khẩu bằng thiết bị tin cậy; không đưa mật khẩu hoặc mã OTP cho người khác.",
          "Thông báo cho bạn bè, người thân biết tài khoản có thể bị chiếm để tránh bị lừa.",
          "Không bấm liên kết lạ; lưu ảnh chụp và bằng chứng liên quan.",
          "Nếu đã mất tài sản, nhanh chóng trình báo cơ quan công an gần nhất.",
        ],
      },
      {
        kind: "limitations",
        paragraphs: [
          "Đây là hướng dẫn an toàn từ nguồn Chính phủ, không phải kết luận pháp lý cho một vụ việc cụ thể.",
        ],
        bullets: [],
      },
    ];
    return {
      answer: flattenChatAnswerSections(sections),
      sections,
      sources: [
        {
          title:
            "Công an TP.HCM cảnh báo thủ đoạn chiếm quyền tài khoản",
          url: "https://tphcm.chinhphu.vn/cong-an-tphcm-canh-bao-thu-doan-lua-dao-ho-tro-cai-dat-sinh-trac-hoc-101240703150617949.htm",
        },
      ],
    };
  }
  if (normalized.includes("mu bao hiem")) {
    return curatedPresentation(
      helmetLaw,
      "Không đội mũ bảo hiểm khi đi xe máy hoặc xe máy điện là hành vi vi phạm.",
      "Có mũ nhưng không đội, hoặc đội mà không cài quai đúng quy cách, vẫn có thể bị xử lý.",
      helmetLaw.reviewedSanction,
      helmetLaw.remedy,
      [
        "Mức áp dụng thực tế còn phụ thuộc độ tuổi, chủ thể và tình tiết cụ thể.",
      ],
    );
  }
  if (
    normalized.includes("tin sai") ||
    normalized.includes("facebook") ||
    normalized.includes("dang lai")
  ) {
    return curatedPresentation(
      falseInformationLaw,
      "Đăng hoặc chia sẻ lại thông tin sai sự thật vẫn có thể làm phát sinh trách nhiệm, kể cả khi bạn không phải người viết đầu tiên.",
      "Việc tiếp tục chia sẻ có thể làm thông tin lan rộng và ảnh hưởng đến người khác.",
      undefined,
      "Dừng chia sẻ, kiểm tra nguồn, gỡ nội dung và đính chính nếu đã đăng.",
      [
        "Chưa hiển thị mức phạt vì văn bản đã được sửa đổi và dữ liệu sanction hiện hành chưa qua backfill bốn mắt.",
        "Mức áp dụng thực tế còn phụ thuộc chủ thể, nội dung và tình tiết cụ thể.",
      ],
    );
  }
  if (
    normalized.includes("50cc") ||
    normalized.includes("15 tuoi") ||
    normalized.includes("16 tuoi")
  ) {
    const ageLaw = laws[1];
    return curatedPresentation(
      ageLaw,
      "Độ tuổi và thông số thực tế của phương tiện quyết định bạn có được điều khiển xe hay không.",
      "Không nên chỉ dựa vào tên gọi “xe điện” hoặc “50cc”; cần kiểm tra dung tích xi-lanh hoặc công suất động cơ ghi trên giấy tờ xe.",
      undefined,
      ageLaw.remedy,
      [
        "Chưa hiển thị căn cứ hoặc mức xử lý vì dữ liệu hiện hành cho từng loại xe chưa qua backfill bốn mắt.",
        "Việc xử lý phụ thuộc tuổi chính xác, loại xe và người đã giao xe.",
      ],
    );
  }
  return null;
}

export async function findManagedAnswer(
  question: string,
  topic?: ChatTopic,
): Promise<KnowledgeChatAnswer | null> {
  const ignoredTerms = new Set(["cho", "cua", "duoc", "khong", "nhung", "the", "nao", "voi"]);
  const terms = normalizeVietnamese(question)
    .split(/[^a-z0-9]+/)
    .filter((term) => term.length >= 3 && !ignoredTerms.has(term));
  if (!terms.length) return null;

  try {
    const db = await getInitializedDb();
    const entries = await db.select()
      .from(legalEntries)
      .where(
        topic
          ? and(
              eq(legalEntries.status, "published"),
              eq(legalEntries.topic, chatTopicLabel(topic)),
            )
          : eq(legalEntries.status, "published"),
      )
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

    const sections: ChatAnswerSection[] = [
      {
        kind: "summary",
        paragraphs: [best.entry.title],
        bullets: [],
      },
      {
        kind: "details",
        paragraphs: [
          "Nội dung phù hợp đã được tìm thấy trong kho kiến thức của cổng.",
        ],
        bullets: [],
      },
      ...(best.entry.caseStudy
        ? [
            {
              kind: "examples" as const,
              paragraphs: [best.entry.caseStudy],
              bullets: [],
            },
          ]
        : []),
      {
        kind: "next_steps",
        paragraphs: [best.entry.remedy],
        bullets: [],
      },
      {
        kind: "limitations",
        paragraphs: [
          "Chưa hiển thị căn cứ và mức xử lý từ bản ghi cũ vì dữ liệu này chưa được liên kết với source, provision và sanction đã qua kiểm duyệt bốn mắt.",
        ],
        bullets: [],
      },
    ];
    return {
      answer: flattenChatAnswerSections(sections),
      sections,
    };
  } catch {
    return null;
  }
}
