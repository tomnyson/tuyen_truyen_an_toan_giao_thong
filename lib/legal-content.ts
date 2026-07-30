export type Topic =
  | "Tất cả"
  | "Giao thông"
  | "Mạng xã hội"
  | "Sở hữu trí tuệ";

export type LawItem = {
  id: number;
  topic: Exclude<Topic, "Tất cả">;
  icon: string;
  title: string;
  legal: string;
  penalty: string;
  remedy: string;
  caseStudy: string;
  tags: string[];
};

export const topics: { name: Topic; icon: string; detail: string }[] = [
  { name: "Tất cả", icon: "⌕", detail: "Mọi chủ đề" },
  { name: "Giao thông", icon: "◉", detail: "Xe điện & xe máy" },
  { name: "Mạng xã hội", icon: "@", detail: "Ứng xử trên mạng" },
  { name: "Sở hữu trí tuệ", icon: "©", detail: "Bản quyền & đạo văn" },
];

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
];

export const sources = [
  {
    label: "Nghị định 168/2024/NĐ-CP",
    href: "https://xaydungchinhsach.chinhphu.vn/toan-van-nghi-dinh-168-2024-nd-cp-quy-dinh-xu-phat-vi-pham-hanh-chinh-ve-trat-tu-atgt-duong-bo-119241231164556785.htm",
  },
  {
    label: "Luật Xử lý vi phạm hành chính",
    href: "https://vbpl.moj.gov.vn/FileData/TW/Lists/vbpq/Attachments/147301/tvHienThiToanVan_31.VBHN.VPQH.1.pdf",
  },
];

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
