import { normalizeVietnamese } from "@/lib/legal-content";

export const imageIntentPolicyVersion = "image-intent-v1";

export type ImageIntent =
  | "privacy_safety"
  | "copyright"
  | "unknown";

export type ImageIntentReason =
  | "non_consensual_sharing"
  | "sensitive_image"
  | "peer_or_group_context"
  | "authorship"
  | "license_or_permission"
  | "attribution"
  | "ambiguous";

export type ImageIntentDecision = Readonly<{
  intent: ImageIntent;
  reasons: readonly ImageIntentReason[];
  policyVersion: typeof imageIntentPolicyVersion;
}>;

export const privacySafetyGuidance = Object.freeze({
  intent: "privacy_safety" as const,
  answer:
    "Ưu tiên an toàn: hãy dừng chia sẻ và không phát tán hình ảnh thêm. Lưu bằng chứng một cách an toàn, chẳng hạn thời điểm, đường dẫn hoặc ảnh chụp màn hình cần thiết, nhưng không chuyển tiếp nội dung nhạy cảm. Hãy báo ngay cho phụ huynh, giáo viên hoặc cơ quan phù hợp để được hỗ trợ gỡ nội dung và bảo vệ người bị ảnh hưởng. Bạn không cần cung cấp hình ảnh, họ tên, trường hoặc lớp cho hệ thống này.",
});

const sensitivePhrases = [
  "anh rieng tu",
  "hinh anh rieng tu",
  "anh nhay cam",
  "hinh anh nhay cam",
  "anh kin",
  "anh nong",
] as const;
const sharingPhrases = [
  "phat tan",
  "chia se",
  "dang len",
  "dang lai",
  "gui vao",
  "chuyen tiep",
  "lan truyen",
] as const;
const noConsentPhrases = [
  "khong dong y",
  "khong duoc dong y",
  "chua dong y",
  "khong xin phep",
  "chua xin phep",
] as const;
const peerPhrases = [
  "ban hoc",
  "nhom lop",
  "nhom chat lop",
  "lop hoc",
] as const;
const authorshipPhrases = [
  "tac gia",
  "tac pham",
  "ban quyen",
  "quyen tac gia",
] as const;
const licensePhrases = [
  "giay phep",
  "xin phep",
  "duoc phep",
  "su dung lai",
  "dung lai",
] as const;
const attributionPhrases = [
  "ghi nguon",
  "dan nguon",
  "chu thich nguon",
] as const;
const imagePhrases = [
  "hinh anh",
  "buc anh",
  "tam anh",
  "dung anh",
  "su dung anh",
  "chia se anh",
  "dang anh",
  "gui anh",
] as const;

function normalizedText(value: string) {
  return normalizeVietnamese(value.normalize("NFKC"))
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function hasPhrase(value: string, phrase: string) {
  return ` ${value} `.includes(` ${phrase} `);
}

function hasAnyPhrase(value: string, phrases: readonly string[]) {
  return phrases.some((phrase) => hasPhrase(value, phrase));
}

function freezeDecision(
  intent: ImageIntent,
  reasons: ImageIntentReason[],
): ImageIntentDecision {
  return Object.freeze({
    intent,
    reasons: Object.freeze(reasons),
    policyVersion: imageIntentPolicyVersion,
  });
}

export function classifyImageIntent(question: string): ImageIntentDecision {
  const normalized = normalizedText(question);
  if (!normalized) {
    return freezeDecision("unknown", []);
  }

  const hasSensitiveImage = hasAnyPhrase(normalized, sensitivePhrases);
  const hasSharing = hasAnyPhrase(normalized, sharingPhrases);
  const hasNoConsent = hasAnyPhrase(normalized, noConsentPhrases);
  const hasPeerContext = hasAnyPhrase(normalized, peerPhrases);
  const hasGenericImage = hasAnyPhrase(normalized, imagePhrases);
  const hasContextualImageToken =
    hasPhrase(normalized, "anh") &&
    (hasSharing || hasNoConsent || hasPeerContext);
  const hasImageContext =
    hasSensitiveImage || hasGenericImage || hasContextualImageToken;

  const privacyReasons: ImageIntentReason[] = [];
  if (
    hasImageContext &&
    hasSharing &&
    (hasNoConsent || hasSensitiveImage || hasPeerContext)
  ) {
    privacyReasons.push("non_consensual_sharing");
  }
  if (hasSensitiveImage) {
    privacyReasons.push("sensitive_image");
  }
  if (hasImageContext && hasPeerContext) {
    privacyReasons.push("peer_or_group_context");
  }

  const hasAuthorship = hasAnyPhrase(normalized, authorshipPhrases);
  const hasLicense = hasAnyPhrase(normalized, licensePhrases);
  const hasAttribution = hasAnyPhrase(normalized, attributionPhrases);
  const copyrightAnchor = hasImageContext || hasAuthorship;
  const copyrightReasons: ImageIntentReason[] = [];
  if (hasAuthorship) {
    copyrightReasons.push("authorship");
  }
  if (hasLicense && copyrightAnchor) {
    copyrightReasons.push("license_or_permission");
  }
  if (hasAttribution && copyrightAnchor) {
    copyrightReasons.push("attribution");
  }

  if (privacyReasons.length > 0) {
    return freezeDecision(
      "privacy_safety",
      [...privacyReasons, ...copyrightReasons],
    );
  }
  if (copyrightReasons.length > 0) {
    return freezeDecision("copyright", copyrightReasons);
  }
  if (hasImageContext) {
    return freezeDecision("unknown", ["ambiguous"]);
  }
  return freezeDecision("unknown", []);
}
