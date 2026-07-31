import { normalizeVietnamese } from "@/lib/legal-content";

export const imageIntentPolicyVersion = "image-intent-v2";

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

const accentedSensitivePhrases = [
  "ảnh riêng tư",
  "hình ảnh riêng tư",
  "ảnh nhạy cảm",
  "hình ảnh nhạy cảm",
  "ảnh kín",
  "ảnh nóng",
] as const;
const foldedSensitivePhrases = [
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
const authorPermissionPhrases = [
  "khong xin phep tac gia",
  "chua xin phep tac gia",
] as const;
const nonImageAccentedPhrases = ["ảnh hưởng"] as const;
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
const passiveImageRiskPhrases = [
  "bi phat tan",
  "bi chia se",
  "bi dang len",
  "bi dang lai",
  "bi gui vao",
  "bi chuyen tiep",
  "bi lan truyen",
  "bi lay dung",
  "bi su dung",
] as const;
const substantiveDomainPhrases = [
  "bien bao",
  "den tin hieu",
  "giao thong",
  "giay phep lai xe",
  "mu bao hiem",
  "toc do",
  "vach ke duong",
  "xe dap",
  "xe may",
  "duong bo",
] as const;

function normalizeTokenText(value: string, foldVietnamese: boolean) {
  const normalized = value.normalize("NFKC").toLocaleLowerCase("vi-VN");
  const source = foldVietnamese
    ? normalizeVietnamese(normalized)
    : normalized;
  return source
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function hasPhrase(value: string, phrase: string) {
  return ` ${value} `.includes(` ${phrase} `);
}

function hasAnyPhrase(value: string, phrases: readonly string[]) {
  return phrases.some((phrase) => hasPhrase(value, phrase));
}

function withoutPhrases(value: string, phrases: readonly string[]) {
  let result = ` ${value} `;
  for (const phrase of phrases) {
    result = result.split(` ${phrase} `).join(" ");
  }
  return result.trim().replace(/\s+/g, " ");
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
  const accented = normalizeTokenText(question, false);
  const folded = normalizeTokenText(question, true);
  if (!folded) {
    return freezeDecision("unknown", []);
  }

  const hasSharing = hasAnyPhrase(folded, sharingPhrases);
  const consentTextWithoutAuthorPermission = withoutPhrases(
    folded,
    authorPermissionPhrases,
  );
  const hasPrivacyNoConsent = hasAnyPhrase(
    consentTextWithoutAuthorPermission,
    noConsentPhrases,
  );
  const hasPeerContext = hasAnyPhrase(folded, peerPhrases);
  const hasPassiveImageRisk = hasAnyPhrase(folded, passiveImageRiskPhrases);
  const hasSensitiveImage =
    hasAnyPhrase(accented, accentedSensitivePhrases) ||
    (
      hasAnyPhrase(folded, foldedSensitivePhrases) &&
      (hasPassiveImageRisk || hasPrivacyNoConsent || hasSharing)
    );
  const hasGenericImage = hasAnyPhrase(folded, imagePhrases);
  const accentedImageSubjectText = withoutPhrases(
    accented,
    nonImageAccentedPhrases,
  );
  const hasAccentedImageToken = hasPhrase(accentedImageSubjectText, "ảnh");
  const hasGuardedHinhSubject =
    hasPhrase(folded, "hinh") && hasPassiveImageRisk;
  const hasImageContext =
    hasSensitiveImage ||
    hasGenericImage ||
    hasAccentedImageToken ||
    hasGuardedHinhSubject;

  const hasAuthorship = hasAnyPhrase(folded, authorshipPhrases);
  const hasLicense = hasAnyPhrase(folded, licensePhrases);
  const hasAttribution = hasAnyPhrase(folded, attributionPhrases);

  const privacyReasons: ImageIntentReason[] = [];
  const hasPeerPrivacyRisk =
    hasPeerContext &&
    (
      hasSharing ||
      hasPrivacyNoConsent ||
      hasPassiveImageRisk ||
      hasSensitiveImage
    );
  if (
    hasImageContext &&
    (
      hasPrivacyNoConsent ||
      hasPassiveImageRisk ||
      (hasSharing && (hasSensitiveImage || hasPeerContext))
    )
  ) {
    privacyReasons.push("non_consensual_sharing");
  }
  if (hasSensitiveImage) {
    privacyReasons.push("sensitive_image");
  }
  if (hasImageContext && hasPeerPrivacyRisk) {
    privacyReasons.push("peer_or_group_context");
  }

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
  const hasSubstantiveDomainQualifier = hasAnyPhrase(
    folded,
    substantiveDomainPhrases,
  );
  if (hasImageContext && !hasSubstantiveDomainQualifier) {
    return freezeDecision("unknown", ["ambiguous"]);
  }
  return freezeDecision("unknown", []);
}
