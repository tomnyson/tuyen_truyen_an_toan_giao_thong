import type { ShowcaseMediaKind } from "./showcase-media";
import type { ContentTopic } from "./topics";

export type { ContentTopic, Topic } from "./topics";

export type LawItem = {
  id: number;
  topic: ContentTopic;
  icon: string;
  title: string;
  legal: string;
  penalty: string;
  remedy: string;
  caseStudy: string;
  tags: string[];
  // Ảnh/video minh họa đã qua allowlist `resolveShowcaseMedia`; media không
  // bao giờ là căn cứ pháp lý, chỉ để trực quan hóa tình huống (US-030).
  mediaUrl?: string;
  mediaKind?: ShowcaseMediaKind;
  // true khi entry có citation đã duyệt bốn mắt trong D1/Postgres — UI được
  // phép hiển thị trực tiếp legal/penalty do biên tập viên soạn.
  verified?: boolean;
  citation?: {
    documentNumber: string;
    title: string;
    issuedAt: string;
    article: string;
    clause: string;
    point?: string;
    effectiveFrom: string;
    lastVerifiedAt: string;
    officialUrl: string;
    statusNote?: string;
  };
  reviewedSanction?: {
    summary: string;
    subject: string;
    conditions: string[];
  };
};

export const laws: LawItem[] = [
  {
    id: 1,
    topic: "Giao thông",
    icon: "◉",
    title: "Không đội mũ bảo hiểm khi đi xe máy, xe máy điện",
    legal: "Điểm h khoản 2 Điều 7 Nghị định 168/2024/NĐ-CP",
    penalty: "400.000 – 600.000đ",
    remedy: "Chấp hành quyết định xử phạt; trang bị và cài quai mũ đúng quy cách.",
    caseStudy:
      "Minh, 16 tuổi, đi xe máy điện tới trường nhưng để mũ trong cốp. Khi được kiểm tra, Minh mới hiểu việc có mũ mà không đội vẫn là vi phạm.",
    tags: ["xemaydien", "mu-baohiem", "antoan"],
    citation: {
      documentNumber: "168/2024/NĐ-CP",
      title:
        "Quy định xử phạt vi phạm hành chính về trật tự, an toàn giao thông trong lĩnh vực giao thông đường bộ; trừ điểm, phục hồi điểm giấy phép lái xe",
      issuedAt: "2024-12-26",
      article: "7",
      clause: "2",
      point: "h",
      effectiveFrom: "2025-01-01",
      lastVerifiedAt: "2026-07-31",
      officialUrl:
        "https://vbpl.vn/tw/Pages/ivbpq-thuoctinh.aspx?ItemID=173920",
    },
    reviewedSanction: {
      summary: "Phạt tiền từ 400.000 đồng đến 600.000 đồng.",
      subject: "Người điều khiển xe mô tô, xe gắn máy hoặc phương tiện tương tự.",
      conditions: [
        "Không đội mũ bảo hiểm hoặc đội mũ nhưng không cài quai đúng quy cách.",
      ],
    },
  },
  {
    id: 2,
    topic: "Giao thông",
    icon: "⚑",
    title: "Chưa đủ tuổi điều khiển xe từ 50 cm³ trở lên",
    legal: "Điều 18 Nghị định 168/2024/NĐ-CP",
    penalty: "Cảnh cáo hoặc xử phạt theo độ tuổi và loại xe",
    remedy: "Dừng điều khiển phương tiện không phù hợp; phụ huynh không giao xe.",
    caseStudy:
      "Lan 15 tuổi mượn xe 110 cm³ của anh để đi học thêm. Cả người điều khiển và người giao xe đều có thể phát sinh trách nhiệm.",
    tags: ["duoi18", "xemay", "phuhuynh"],
  },
  {
    id: 3,
    topic: "Mạng xã hội",
    icon: "@",
    title: "Đăng thông tin sai sự thật, xúc phạm người khác",
    legal: "Điểm a khoản 1 Điều 101 Nghị định 15/2020/NĐ-CP",
    penalty: "5 – 10 triệu đồng đối với cá nhân*",
    remedy: "Buộc gỡ bỏ thông tin sai sự thật hoặc gây nhầm lẫn.",
    caseStudy:
      "Sau khi bất mãn vì điểm số, một học sinh đăng bài quy kết giáo viên gian lận nhưng không có bằng chứng. Bài đăng bị yêu cầu gỡ và học sinh phải xin lỗi.",
    tags: ["facebook", "tinsai", "dan-du"],
  },
  {
    id: 4,
    topic: "Mạng xã hội",
    icon: "□",
    title: "Phát tán hình ảnh riêng tư của bạn học",
    legal: "Điểm e khoản 3 Điều 102 Nghị định 15/2020/NĐ-CP",
    penalty: "Có thể bị xử phạt hành chính và áp dụng biện pháp khác",
    remedy: "Gỡ nội dung, ngừng chia sẻ và khắc phục hậu quả cho người bị ảnh hưởng.",
    caseStudy:
      "Một ảnh chụp riêng tư bị chuyển tiếp trong nhóm lớp. Dù không phải người chụp, người tiếp tục phát tán vẫn có thể phải chịu trách nhiệm.",
    tags: ["quyenriengtu", "zalo", "baolucmang"],
  },
  // Hai entry dưới đây chưa gắn căn cứ đã duyệt: `legal`/`penalty` giữ nguyên
  // trạng thái "đang kiểm chứng" để UI không trình bày mức xử lý chưa rà soát.
  // Phần hướng dẫn xử lý là khuyến nghị an toàn, không phải kết luận pháp lý.
  // Chỉ được nối thêm vào cuối mảng: `lib/legal-chat.ts` destructure theo vị trí.
  {
    id: 5,
    topic: "Bạo lực học đường",
    icon: "⚠",
    title: "Bị bắt nạt, đe dọa hoặc chứng kiến bạn bị đánh trong trường",
    legal: "Đang kiểm chứng căn cứ hiện hành",
    penalty: "Chưa công bố mức tham khảo",
    remedy:
      "Rời khỏi nơi xô xát, không quay clip để đăng lại, lưu bằng chứng (tin nhắn, ảnh) và báo ngay giáo viên chủ nhiệm, phụ huynh hoặc tổng đài bảo vệ trẻ em 111.",
    caseStudy:
      "Một nhóm bạn liên tục nhắn tin đe dọa và cô lập một học sinh trong lớp. Việc im lặng khiến sự việc kéo dài; khi báo giáo viên chủ nhiệm kèm ảnh chụp tin nhắn, nhà trường mới có cơ sở xử lý.",
    tags: ["baoluchocduong", "batnat", "tongdai111"],
  },
  {
    id: 6,
    topic: "An ninh trật tự",
    icon: "▣",
    title: "Bị rủ tụ tập đua xe, gây rối hoặc mang hung khí",
    legal: "Đang kiểm chứng căn cứ hiện hành",
    penalty: "Chưa công bố mức tham khảo",
    remedy:
      "Từ chối tham gia và rời khỏi nhóm, không giữ hay mang hộ hung khí, báo cho phụ huynh, nhà trường hoặc cơ quan công an gần nhất (113) khi thấy nguy cơ mất an toàn.",
    caseStudy:
      "Một học sinh được rủ đi cổ vũ đua xe ban đêm và giữ hộ balo cho bạn. Cả người tham gia lẫn người giúp sức đều có thể phát sinh trách nhiệm, tùy hành vi và tình tiết cụ thể.",
    tags: ["anninhtrattu", "duaxe", "hungkhi"],
  },
];

// Nguồn tra cứu chính thống hiển thị ở mục "Đọc luật từ nguồn chính thống".
// Chỉ giữ địa chỉ của cơ quan nhà nước và đã kiểm tra truy cập được.
export const sources = [
  {
    label: "Nghị định 168/2024/NĐ-CP",
    topic: "Giao thông",
    href: "https://xaydungchinhsach.chinhphu.vn/toan-van-nghi-dinh-168-2024-nd-cp-quy-dinh-xu-phat-vi-pham-hanh-chinh-ve-trat-tu-atgt-duong-bo-119241231164556785.htm",
  },
  {
    label: "Luật Xử lý vi phạm hành chính",
    topic: "An ninh trật tự",
    href: "https://vbpl.moj.gov.vn/FileData/TW/Lists/vbpq/Attachments/147301/tvHienThiToanVan_31.VBHN.VPQH.1.pdf",
  },
  {
    label: "Cơ sở dữ liệu văn bản quy phạm pháp luật",
    topic: "Tất cả",
    href: "https://vanban.chinhphu.vn/",
  },
  {
    label: "Cục Cảnh sát giao thông",
    topic: "Giao thông",
    href: "https://csgt.vn/",
  },
  {
    label: "Cổng thông tin điện tử Bộ Công an",
    topic: "An ninh trật tự",
    href: "https://bocongan.gov.vn/",
  },
  {
    label: "Tổng đài quốc gia bảo vệ trẻ em 111",
    topic: "Bạo lực học đường",
    href: "https://tongdai111.vn/",
  },
];

// Quy tac trinh bay can cu da duyet, dung chung cho trang chu, quiz va game
// nhap vai: entry chua co citation bon mat thi khong bao gio duoc dung ra mot
// cau can cu — hien thi dung trang thai "dang kiem chung".
export function reviewedLegalBasisOf(item: LawItem) {
  if (item.verified) return item.legal;
  if (!item.citation) return "Đang kiểm chứng căn cứ hiện hành";
  const provision = [
    item.citation.point ? `Điểm ${item.citation.point}` : "",
    `khoản ${item.citation.clause}`,
    `Điều ${item.citation.article}`,
  ]
    .filter(Boolean)
    .join(" ");
  return `${provision} Nghị định ${item.citation.documentNumber}`;
}

export function reviewedPenaltyOf(item: LawItem) {
  if (item.verified) return item.penalty;
  return item.reviewedSanction?.summary ?? "Chưa công bố mức tham khảo";
}

export function hasBlockedLegalBasis(value: string) {
  const compact = normalizeVietnamese(value).replace(/[^a-z0-9]+/g, "");
  return (
    /(?:nghidinh|nd)(?:so)?1312013(?:ndcp)?/.test(compact) ||
    compact.includes("1312013ndcp")
  );
}

export function normalizeVietnamese(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/đ/g, "d");
}
