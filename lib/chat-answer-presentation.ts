export const CHAT_ANSWER_SECTION_KINDS = [
  "summary",
  "details",
  "examples",
  "legal_basis",
  "sanctions",
  "legal_remedies",
  "next_steps",
  "limitations",
] as const;

export type ChatAnswerSectionKind =
  (typeof CHAT_ANSWER_SECTION_KINDS)[number];

export type ChatAnswerSection = {
  kind: ChatAnswerSectionKind;
  paragraphs: string[];
  bullets: string[];
};

export type PublicChatAnswer = {
  answer: string;
  sections: ChatAnswerSection[];
};

const MAX_ANSWER_LENGTH = 6_000;
const MAX_SECTIONS = CHAT_ANSWER_SECTION_KINDS.length;
const MAX_PARAGRAPHS_PER_SECTION = 4;
const MAX_BULLETS_PER_SECTION = 6;
const MAX_ITEM_LENGTH = 1_200;

const headingKinds = new Map<string, ChatAnswerSectionKind>([
  ["kết luận", "summary"],
  ["trả lời ngắn", "summary"],
  ["tóm tắt", "summary"],
  ["giải thích", "details"],
  ["vì sao", "details"],
  ["thông tin chi tiết", "details"],
  ["ví dụ", "examples"],
  ["ví dụ dễ hiểu", "examples"],
  ["căn cứ pháp lý", "legal_basis"],
  ["căn cứ", "legal_basis"],
  ["mức phạt tham khảo", "sanctions"],
  ["mức xử lý tham khảo", "sanctions"],
  ["biện pháp khắc phục theo văn bản", "legal_remedies"],
  ["bạn nên làm", "next_steps"],
  ["bạn nên làm gì", "next_steps"],
  ["việc nên làm", "next_steps"],
  ["cách xử lý", "next_steps"],
  ["cách xử lý / việc nên làm", "next_steps"],
  ["hành động đề xuất", "next_steps"],
  ["lưu ý", "limitations"],
  ["giới hạn", "limitations"],
  ["điều cần lưu ý", "limitations"],
]);

const sectionTitles: Record<ChatAnswerSectionKind, string> = {
  summary: "Trả lời ngắn",
  details: "Giải thích",
  examples: "Ví dụ dễ hiểu",
  legal_basis: "Căn cứ pháp lý",
  sanctions: "Mức phạt tham khảo",
  legal_remedies: "Biện pháp khắc phục theo văn bản",
  next_steps: "Cách xử lý / việc nên làm",
  limitations: "Điều cần lưu ý",
};

export type ReviewedCitationPresentationInput = {
  title: string;
  documentNumber: string;
  issuedAt: string;
  article?: string;
  clause?: string;
  point?: string;
  effectiveFrom: string;
  effectiveTo?: string;
  lastVerifiedAt: string;
};

type MutableSection = ChatAnswerSection & {
  paragraphBuffer: string[];
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isBoundedText(value: unknown, maximum = MAX_ITEM_LENGTH) {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    value.trim().length <= maximum
  );
}

function stripInlinePresentation(value: string) {
  return value
    .replace(/!\[([^\]]*)\]\((?:[^()]|\([^)]*\))*\)/g, "$1")
    .replace(/\[([^\]]+)\]\((?:[^()]|\([^)]*\))*\)/g, (_match, label) =>
      /(?:https?:\/\/|(?:[\w-]+\.)+[a-z]{2,})/i.test(label) ? "" : label,
    )
    .replace(/<https?:\/\/[^>]+>/gi, "")
    .replace(/https?:\/\/[^\s<>{}\[\]]+/gi, "")
    .replace(
      /\b(?:[\w-]+\.)*(?:chinhphu\.vn|vbpl\.moj\.gov\.vn|vbpl\.vn)\b(?:\/[^\s]*)?/gi,
      "",
    )
    .replace(/【[^】]*】/g, "")
    .replace(/<\/?[a-z][^>]*>/gi, "")
    .replace(/[`*_~]{1,3}/g, "")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/\(\s*\)/g, "")
    .replace(/[ \t]+/g, " ")
    .trim();
}

function parseHeading(value: string) {
  const normalized = value
    .replace(/^\s{0,3}#{1,6}\s*/, "")
    .replace(/^[*_~`]+|[*_~`]+$/g, "")
    .trim();
  const match = normalized.match(
    /^(kết luận|trả lời ngắn|tóm tắt|giải thích|vì sao|thông tin chi tiết|ví dụ(?: dễ hiểu)?|căn cứ pháp lý|căn cứ|mức phạt tham khảo|mức xử lý tham khảo|biện pháp khắc phục theo văn bản|bạn nên làm(?: gì)?|việc nên làm|cách xử lý(?:\s*\/\s*việc nên làm)?|hành động đề xuất|lưu ý|giới hạn|điều cần lưu ý)\s*:?\s*(.*)$/i,
  );
  if (!match) return null;
  return {
    kind: headingKinds.get(match[1].toLocaleLowerCase("vi")) ?? "details",
    content: stripInlinePresentation(match[2]),
  };
}

function finishParagraph(section: MutableSection) {
  const paragraph = stripInlinePresentation(
    section.paragraphBuffer.join(" "),
  ).slice(0, MAX_ITEM_LENGTH);
  section.paragraphBuffer = [];
  if (
    paragraph &&
    section.paragraphs.length < MAX_PARAGRAPHS_PER_SECTION
  ) {
    section.paragraphs.push(paragraph);
  }
}

function publicSection(section: MutableSection): ChatAnswerSection | null {
  finishParagraph(section);
  return section.paragraphs.length > 0 || section.bullets.length > 0
    ? {
        kind: section.kind,
        paragraphs: section.paragraphs,
        bullets: section.bullets,
      }
    : null;
}

export function projectPublicWebSearchAnswer(
  value: unknown,
): PublicChatAnswer | null {
  if (
    typeof value !== "string" ||
    value.trim().length === 0 ||
    value.length > MAX_ANSWER_LENGTH ||
    /<(?:script|style|iframe|object|embed|svg)\b/i.test(value) ||
    /(?:^|\n)\s*(?:```|~~~|>{1,3}\s|[-*_]{3,}\s*$)/m.test(value) ||
    /(?:^|\n)\s*\|.*\|\s*$/m.test(value) ||
    /[{\[]\s*"[^"]{1,120}"\s*:/m.test(value)
  ) {
    return null;
  }

  const sections: MutableSection[] = [];
  let current: MutableSection = {
    kind: "summary",
    paragraphs: [],
    bullets: [],
    paragraphBuffer: [],
  };
  sections.push(current);

  for (const rawLine of value.normalize("NFC").replace(/\r\n?/g, "\n").split("\n")) {
    const line = rawLine.trim();
    if (!line) {
      finishParagraph(current);
      continue;
    }

    const heading = parseHeading(line);
    if (heading) {
      finishParagraph(current);
      const existing = sections.find(
        (section) => section.kind === heading.kind,
      );
      if (existing) {
        current = existing;
      } else if (sections.length < MAX_SECTIONS) {
        current = {
          kind: heading.kind,
          paragraphs: [],
          bullets: [],
          paragraphBuffer: [],
        };
        sections.push(current);
      } else {
        current = sections[sections.length - 1];
      }
      if (heading.content) current.paragraphBuffer.push(heading.content);
      continue;
    }

    const bullet = line.match(/^(?:[-*•]|\d{1,2}[.)])\s+(.+)$/);
    if (bullet) {
      finishParagraph(current);
      const content = stripInlinePresentation(bullet[1]).slice(
        0,
        MAX_ITEM_LENGTH,
      );
      if (content && current.bullets.length < MAX_BULLETS_PER_SECTION) {
        current.bullets.push(content);
      }
      continue;
    }

    const content = stripInlinePresentation(
      line.replace(/^\s{0,3}#{1,6}\s*/, ""),
    );
    if (content) current.paragraphBuffer.push(content);
  }

  const publicSections = sections
    .map(publicSection)
    .filter((section): section is ChatAnswerSection => Boolean(section))
    .sort(
      (left, right) =>
        CHAT_ANSWER_SECTION_KINDS.indexOf(left.kind) -
        CHAT_ANSWER_SECTION_KINDS.indexOf(right.kind),
    );
  if (publicSections.length === 0) return null;

  const answer = flattenChatAnswerSections(publicSections);
  return answer && answer.length <= MAX_ANSWER_LENGTH
    ? { answer, sections: publicSections }
    : null;
}

export function flattenChatAnswerSections(sections: ChatAnswerSection[]) {
  return sections
    .map((section) =>
      [
        sectionTitles[section.kind],
        ...section.paragraphs,
        ...section.bullets.map((bullet) => `• ${bullet}`),
      ].join("\n"),
    )
    .join("\n\n")
    .trim();
}

export function parseChatAnswerSections(
  value: unknown,
): ChatAnswerSection[] | null {
  if (!Array.isArray(value) || value.length < 1 || value.length > MAX_SECTIONS) {
    return null;
  }
  const seen = new Set<ChatAnswerSectionKind>();
  const sections: ChatAnswerSection[] = [];
  for (const item of value) {
    if (!isPlainObject(item)) return null;
    const keys = Object.keys(item).sort();
    if (keys.join(",") !== "bullets,kind,paragraphs") return null;
    if (
      typeof item.kind !== "string" ||
      !CHAT_ANSWER_SECTION_KINDS.includes(
        item.kind as ChatAnswerSectionKind,
      ) ||
      seen.has(item.kind as ChatAnswerSectionKind) ||
      !Array.isArray(item.paragraphs) ||
      !Array.isArray(item.bullets) ||
      item.paragraphs.length > MAX_PARAGRAPHS_PER_SECTION ||
      item.bullets.length > MAX_BULLETS_PER_SECTION ||
      !item.paragraphs.every((entry) => isBoundedText(entry)) ||
      !item.bullets.every((entry) => isBoundedText(entry)) ||
      item.paragraphs.length + item.bullets.length === 0
    ) {
      return null;
    }
    const kind = item.kind as ChatAnswerSectionKind;
    seen.add(kind);
    sections.push({
      kind,
      paragraphs: item.paragraphs.map((entry) => entry.trim()),
      bullets: item.bullets.map((entry) => entry.trim()),
    });
  }
  return sections.sort(
    (left, right) =>
      CHAT_ANSWER_SECTION_KINDS.indexOf(left.kind) -
      CHAT_ANSWER_SECTION_KINDS.indexOf(right.kind),
  );
}

export function chatAnswerSectionTitle(kind: ChatAnswerSectionKind) {
  return sectionTitles[kind];
}

function formatIsoDate(value: string) {
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

export function reviewedCitationsToLegalBasisSection(
  citations: ReviewedCitationPresentationInput[],
): ChatAnswerSection | null {
  const paragraphs = citations.slice(0, 8).map((citation) => {
    const provision = [
      citation.point ? `Điểm ${citation.point}` : "",
      citation.clause ? `khoản ${citation.clause}` : "",
      citation.article ? `Điều ${citation.article}` : "",
    ].filter(Boolean);
    const effectivity = citation.effectiveTo
      ? `Có hiệu lực từ ${formatIsoDate(citation.effectiveFrom)} đến ${formatIsoDate(citation.effectiveTo)}.`
      : `Có hiệu lực từ ${formatIsoDate(citation.effectiveFrom)}.`;
    return [
      `${citation.documentNumber} — ${citation.title}.`,
      provision.length > 0 ? `${provision.join(", ")}.` : "",
      `Ban hành ngày ${formatIsoDate(citation.issuedAt)}.`,
      effectivity,
      `Kiểm tra gần nhất ${formatIsoDate(citation.lastVerifiedAt)}.`,
    ]
      .filter(Boolean)
      .join(" ");
  });
  return paragraphs.length > 0
    ? {
        kind: "legal_basis",
        paragraphs,
        bullets: [],
      }
    : null;
}
