// Chuỗi "gửi đến đâu" cho mục trợ giúp pháp lý (US-039, DEC-022).
//
// Đây là hàm thuần, không chạm DB: trang chủ và trang trợ giúp đều dùng được
// kể cả khi cơ sở dữ liệu hỏng. AI không bao giờ sinh tên hay số điện thoại
// cơ quan — dữ liệu chỉ đến từ bảng `referral_authorities` đã duyệt, hoặc từ
// `fallbackReferralAuthorities` bên dưới (ba đầu mối công khai đã xác minh).

import { brandLocality } from "./brand";
import { isContentTopic, type ContentTopic } from "./topics";

export const authorityLevels = [
  "truong",
  "xa_phuong",
  "huyen",
  "tinh",
  "trung_uong",
] as const;

export type AuthorityLevel = (typeof authorityLevels)[number];

export type ReferralAuthority = Readonly<{
  id: number;
  name: string;
  level: AuthorityLevel;
  topics: readonly ContentTopic[];
  scope: string;
  address: string;
  phone: string;
  hotline: string;
  note: string;
}>;

export type ReferralStep = Readonly<{
  order: number;
  level: AuthorityLevel;
  levelLabel: string;
  authority: ReferralAuthority;
  badge: string;
}>;

const levelLabels: Readonly<Record<AuthorityLevel, string>> = Object.freeze({
  truong: "Nhà trường",
  xa_phuong: "Xã / phường",
  huyen: "Cấp huyện",
  tinh: "Cấp tỉnh",
  trung_uong: "Trung ương",
});

const levelSet: ReadonlySet<string> = new Set(authorityLevels);

export function isAuthorityLevel(value: unknown): value is AuthorityLevel {
  return typeof value === "string" && levelSet.has(value);
}

export function authorityLevelLabel(level: AuthorityLevel): string {
  return levelLabels[level];
}

export function parseAuthorityTopics(
  value: unknown,
): readonly ContentTopic[] {
  const raw = typeof value === "string" ? safeParse(value) : value;
  if (!Array.isArray(raw)) return [];
  const seen = new Set<ContentTopic>();
  for (const item of raw) {
    if (isContentTopic(item)) seen.add(item);
  }
  return Object.freeze([...seen]);
}

function safeParse(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

// Nhãn ngắn dùng cho huy hiệu khi cơ quan không có số máy công khai.
export function authorityBadge(authority: ReferralAuthority): string {
  return (
    authority.hotline.trim() ||
    authority.phone.trim() ||
    authorityLevelLabel(authority.level)
  );
}

// Thứ tự leo thang: gần người học trước, trung ương sau cùng.
export function buildReferralChain(
  authorities: readonly ReferralAuthority[],
  topic: ContentTopic | null,
): readonly ReferralStep[] {
  const steps: ReferralStep[] = [];
  for (const level of authorityLevels) {
    const atLevel = authorities.filter((item) => item.level === level);
    const chosen =
      (topic
        ? atLevel.find((item) => item.topics.includes(topic))
        : undefined) ??
      atLevel.find((item) => item.topics.length === 0);
    if (!chosen) continue;
    steps.push(
      Object.freeze({
        order: steps.length + 1,
        level,
        levelLabel: authorityLevelLabel(level),
        authority: chosen,
        badge: authorityBadge(chosen),
      }),
    );
  }
  return Object.freeze(steps);
}

// Ba đầu mối công khai đã xác minh, trước đây nằm trong app/page.tsx.
// Dùng khi DB chưa có dữ liệu hoặc lỗi — không bao giờ để trang trống số máy.
export const fallbackReferralAuthorities: readonly ReferralAuthority[] =
  Object.freeze([
    Object.freeze({
      id: -1,
      name: "Công an – tình huống khẩn cấp",
      level: "xa_phuong" as AuthorityLevel,
      topics: Object.freeze([]),
      scope: "Toàn quốc",
      address: "",
      phone: "",
      hotline: "113",
      note: "Gọi ngay khi có nguy hiểm trực tiếp.",
    }),
    Object.freeze({
      id: -2,
      name: "Tổng đài quốc gia bảo vệ trẻ em",
      level: "trung_uong" as AuthorityLevel,
      topics: Object.freeze([]),
      scope: "Toàn quốc",
      address: "",
      phone: "",
      hotline: "111",
      note: "24/7 · Miễn phí",
    }),
    Object.freeze({
      id: -3,
      name: `Trung tâm Trợ giúp pháp lý Nhà nước tỉnh ${brandLocality}`,
      level: "tinh" as AuthorityLevel,
      topics: Object.freeze([]),
      scope: brandLocality,
      address: "",
      phone: "",
      hotline: "TGPL",
      note: "Sở Tư pháp · Tư vấn miễn phí cho HSSV",
    }),
  ]);
