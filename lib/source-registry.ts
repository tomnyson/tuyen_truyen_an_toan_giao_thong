export type SourceTrustClass = "official" | "discovery_only" | "rejected";
export type SourceReadiness = "green" | "yellow" | "red" | "unverified";
export type SourceDecision = "go" | "conditional_go" | "no_go";

export type SourceRegistryRecord = {
  providerKey: string;
  displayName: string;
  owner: string;
  registeredBy: string;
  baseUrl: string;
  exportEndpoint: string | null;
  allowedHosts: string[];
  formats: string[];
  authType: "none" | "api_key" | "oauth2" | "unknown";
  quota: string;
  updateCadence: string;
  fields: string[];
  availability: string;
  termsUrl: string | null;
  licenseNote: string;
  attributionText: string;
  retentionDays: number | null;
  trustClass: SourceTrustClass;
  readiness: SourceReadiness;
  sampleRef: string | null;
  decision: SourceDecision;
  risks: string[];
  costNote: string;
  replacementAndDeletion: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
};

export type OfficialDocumentSample = {
  providerKey: string;
  upstreamId: string;
  canonicalUrl: string;
  metadataUrl: string;
  fetchedAt: string;
  contentChecksum: string;
  documentNumber: string;
  title: string;
  issuedAt: string | null;
  effectiveFrom: string | null;
  provision: {
    sourceAnchor: string;
    article: string | null;
    clause: string | null;
    point: string | null;
    originalText: string;
    simplifiedText: string;
  };
};

export type DraftSourceMapping = {
  legalSource: {
    documentNumber: string;
    title: string;
    officialUrl: string;
    officialHost: string;
    issuedAt: string | null;
    effectiveFrom: string | null;
    effectiveTo: null;
    status: "draft";
    createdBy: string;
    lastVerifiedAt: null;
    verifiedBy: null;
  };
  legalProvision: {
    article: string | null;
    clause: string | null;
    point: string | null;
    originalText: string;
    simplifiedText: string;
    status: "draft";
    createdBy: string;
    reviewedBy: null;
    reviewedAt: null;
  };
  provenance: {
    providerKey: string;
    upstreamId: string;
    canonicalUrl: string;
    metadataUrl: string;
    fetchedAt: string;
    contentChecksum: string;
    sourceAnchor: string;
  };
};

const READINESS_VALUES = new Set<SourceReadiness>([
  "green",
  "yellow",
  "red",
  "unverified",
]);
const TRUST_VALUES = new Set<SourceTrustClass>([
  "official",
  "discovery_only",
  "rejected",
]);
const SAFE_PROVIDER_KEY = /^[a-z0-9]+(?:_[a-z0-9]+)*$/;

function hostnameOf(value: string) {
  return new URL(value).hostname.toLowerCase();
}

function isSafeRegistryUrl(value: string) {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      !url.port &&
      !/^\[?[0-9a-f:.]+\]?$/i.test(url.hostname)
    );
  } catch {
    return false;
  }
}

function isAllowedOfficialHost(host: string) {
  return (
    host === "vbpl.vn" ||
    host === "vbpl.moj.gov.vn" ||
    host === "chinhphu.vn" ||
    host.endsWith(".chinhphu.vn")
  );
}

export function validateSourceRegistryRecord(record: SourceRegistryRecord) {
  const errors: string[] = [];

  if (!SAFE_PROVIDER_KEY.test(record.providerKey)) {
    errors.push("providerKey must be lowercase snake_case");
  }
  if (!record.displayName.trim() || !record.owner.trim()) {
    errors.push("displayName and owner are required");
  }
  if (!record.registeredBy.trim()) {
    errors.push("registeredBy is required");
  }
  if (!isSafeRegistryUrl(record.baseUrl)) {
    errors.push("baseUrl must be a safe HTTPS URL");
  }
  if (record.exportEndpoint && !isSafeRegistryUrl(record.exportEndpoint)) {
    errors.push("exportEndpoint must be a safe HTTPS URL when present");
  }
  if (!record.allowedHosts.length) {
    errors.push("at least one allowed host is required");
  } else {
    const invalidHost = record.allowedHosts.find(
      (host) =>
        host !== host.toLowerCase() ||
        !/^[a-z0-9.-]+$/.test(host) ||
        host.includes("..") ||
        !isAllowedOfficialHost(host),
    );
    if (invalidHost) {
      errors.push("allowedHosts must contain exact DEC-004 official hosts");
    }
    const baseHost = isSafeRegistryUrl(record.baseUrl)
      ? hostnameOf(record.baseUrl)
      : null;
    if (baseHost && !record.allowedHosts.includes(baseHost)) {
      errors.push("baseUrl host must be explicitly allowed");
    }
    const exportHost =
      record.exportEndpoint && isSafeRegistryUrl(record.exportEndpoint)
        ? hostnameOf(record.exportEndpoint)
        : null;
    if (exportHost && !record.allowedHosts.includes(exportHost)) {
      errors.push("exportEndpoint host must be explicitly allowed");
    }
  }
  if (!record.formats.length || !record.fields.length) {
    errors.push("formats and fields must be documented");
  }
  if (!record.quota.trim() || !record.updateCadence.trim()) {
    errors.push("quota and update cadence must be documented");
  }
  if (!record.availability.trim() || !record.licenseNote.trim()) {
    errors.push("availability and license note must be documented");
  }
  if (!record.attributionText.trim()) {
    errors.push("attributionText is required");
  }
  if (!TRUST_VALUES.has(record.trustClass)) {
    errors.push("invalid trustClass");
  }
  if (!READINESS_VALUES.has(record.readiness)) {
    errors.push("invalid readiness");
  }
  if (!record.risks.length || !record.costNote.trim()) {
    errors.push("risks and cost must be documented");
  }
  if (!record.replacementAndDeletion.trim()) {
    errors.push("replacement/deletion handling must be documented");
  }

  if (record.readiness === "green") {
    errors.push(
      "green readiness requires the authenticated durable approval workflow",
    );
    if (record.trustClass !== "official") {
      errors.push("green readiness requires an official source");
    }
    if (!record.sampleRef || record.decision !== "go") {
      errors.push("green readiness requires a sample and go decision");
    }
    if (!record.termsUrl || /unknown|unverified|chưa/i.test(record.licenseNote)) {
      errors.push("green readiness requires reviewed terms/license");
    }
    if (
      !record.reviewedBy ||
      record.reviewedBy === record.registeredBy ||
      !record.reviewedAt
    ) {
      errors.push("green readiness requires independent review evidence");
    }
  }

  return errors;
}

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function mapOfficialSampleToDraft(
  sample: OfficialDocumentSample,
  registeredSource: SourceRegistryRecord,
  createdBy: string,
): Promise<DraftSourceMapping> {
  const canonicalRegistryRecord = sourceRegistry.find(
    ({ providerKey }) => providerKey === sample.providerKey,
  );
  if (!canonicalRegistryRecord || canonicalRegistryRecord !== registeredSource) {
    throw new Error("sample must use the canonical static registry record");
  }
  if (sample.providerKey !== registeredSource.providerKey) {
    throw new Error("sample provider is not the selected registry record");
  }
  if (validateSourceRegistryRecord(registeredSource).length > 0) {
    throw new Error("selected registry record is invalid");
  }
  if (
    registeredSource.trustClass !== "official" ||
    registeredSource.readiness !== "yellow" ||
    registeredSource.decision !== "conditional_go"
  ) {
    throw new Error("sample source is not approved for a local mapping spike");
  }
  if (
    !isSafeRegistryUrl(sample.canonicalUrl) ||
    !isSafeRegistryUrl(sample.metadataUrl)
  ) {
    throw new Error("sample URLs must be safe HTTPS URLs");
  }

  const officialHost = hostnameOf(sample.canonicalUrl);
  if (
    !registeredSource.allowedHosts.includes(officialHost) ||
    !registeredSource.allowedHosts.includes(hostnameOf(sample.metadataUrl))
  ) {
    throw new Error("sample host is not in the source allowlist");
  }
  if (!createdBy.trim()) {
    throw new Error("createdBy is required");
  }
  if (
    !sample.documentNumber.trim() ||
    !sample.title.trim() ||
    !sample.provision.sourceAnchor.trim() ||
    !sample.provision.originalText.trim() ||
    !sample.provision.simplifiedText.trim() ||
    !/^[a-f0-9]{64}$/.test(sample.contentChecksum)
  ) {
    throw new Error("sample is missing required source/provision fields");
  }
  if (
    (await sha256Hex(sample.provision.originalText)) !== sample.contentChecksum
  ) {
    throw new Error("sample content checksum does not match original text");
  }

  return {
    legalSource: {
      documentNumber: sample.documentNumber,
      title: sample.title,
      officialUrl: sample.canonicalUrl,
      officialHost,
      issuedAt: sample.issuedAt,
      effectiveFrom: sample.effectiveFrom,
      effectiveTo: null,
      status: "draft",
      createdBy,
      lastVerifiedAt: null,
      verifiedBy: null,
    },
    legalProvision: {
      article: sample.provision.article,
      clause: sample.provision.clause,
      point: sample.provision.point,
      originalText: sample.provision.originalText,
      simplifiedText: sample.provision.simplifiedText,
      status: "draft",
      createdBy,
      reviewedBy: null,
      reviewedAt: null,
    },
    provenance: {
      providerKey: sample.providerKey,
      upstreamId: sample.upstreamId,
      canonicalUrl: sample.canonicalUrl,
      metadataUrl: sample.metadataUrl,
      fetchedAt: sample.fetchedAt,
      contentChecksum: sample.contentChecksum,
      sourceAnchor: sample.provision.sourceAnchor,
    },
  };
}

export const sourceRegistry: readonly SourceRegistryRecord[] = [
  {
    providerKey: "vbpl_national",
    displayName: "Cơ sở dữ liệu quốc gia về văn bản pháp luật",
    owner: "Cơ quan vận hành CSDL quốc gia về văn bản pháp luật",
    registeredBy: "product-owner",
    baseUrl: "https://vbpl.vn/",
    exportEndpoint: null,
    allowedHosts: ["vbpl.vn"],
    formats: ["HTML", "DOC/PDF attachment"],
    authType: "none",
    quota: "Không công bố; chỉ spike thủ công, chưa chạy batch",
    updateCadence: "Theo lịch đăng/cập nhật văn bản; chưa có SLA công bố",
    fields: [
      "document_number",
      "title",
      "issued_at",
      "effective_from",
      "effectivity_history",
      "full_text",
      "attachment_url",
    ],
    availability: "Public HTML; chưa xác minh API/export có versioning",
    termsUrl: null,
    licenseNote: "Chưa xác minh điều khoản tái sử dụng/bulk retrieval",
    attributionText: "Nguồn: Cơ sở dữ liệu quốc gia về văn bản pháp luật",
    retentionDays: null,
    trustClass: "official",
    readiness: "yellow",
    sampleRef: "fixtures/source-registry/vbpl-nd168.sample.json",
    decision: "conditional_go",
    risks: [
      "Không có API/export contract đã xác minh",
      "HTML/attachment có thể đổi cấu trúc hoặc URL",
      "Điều khoản bulk retrieval và retention chưa được duyệt",
    ],
    costNote: "Spike thủ công chi phí thấp; production parser/monitoring chưa ước lượng",
    replacementAndDeletion:
      "Giữ provenance/checksum; khi nguồn đổi hoặc yêu cầu xóa, quarantine candidate, ngừng index và thực hiện cleanup theo reference/legal hold.",
    reviewedBy: null,
    reviewedAt: null,
  },
  {
    providerKey: "government_documents",
    displayName: "Cổng văn bản Chính phủ",
    owner: "Cổng Thông tin điện tử Chính phủ",
    registeredBy: "product-owner",
    baseUrl: "https://vanban.chinhphu.vn/",
    exportEndpoint: null,
    allowedHosts: ["vanban.chinhphu.vn"],
    formats: ["HTML", "PDF attachment"],
    authType: "none",
    quota: "Không công bố; chưa cho phép batch",
    updateCadence: "Theo lịch đăng văn bản; chưa có SLA công bố",
    fields: [
      "document_number",
      "title",
      "issued_at",
      "effective_from",
      "issuer",
      "signer",
      "attachment_url",
    ],
    availability: "Public HTML; không có API contract đã xác minh",
    termsUrl: null,
    licenseNote: "Chưa xác minh điều khoản bulk retrieval/retention",
    attributionText: "Nguồn: Cổng Thông tin điện tử Chính phủ",
    retentionDays: null,
    trustClass: "official",
    readiness: "yellow",
    sampleRef: null,
    decision: "conditional_go",
    risks: [
      "Thiếu API/export có tài liệu",
      "Cần đối chiếu lịch sử hiệu lực theo từng provision",
    ],
    costNote: "Có thể dùng đối chiếu metadata thủ công; chưa ước lượng connector",
    replacementAndDeletion:
      "Không ingest production trước khi có terms; record bị thay thế phải stale/invalidate và chờ reviewer.",
    reviewedBy: null,
    reviewedAt: null,
  },
  {
    providerKey: "government_gazette_rss",
    displayName: "RSS Công báo nước CHXHCN Việt Nam",
    owner: "Cổng Thông tin điện tử Chính phủ",
    registeredBy: "product-owner",
    baseUrl: "https://congbao.chinhphu.vn/rss",
    exportEndpoint:
      "https://congbao.chinhphu.vn/cac_van_ban_moi_ban_hanh.rss",
    allowedHosts: ["congbao.chinhphu.vn"],
    formats: ["RSS/XML", "PDF attachment"],
    authType: "none",
    quota: "Không công bố",
    updateCadence: "RSS theo văn bản mới đăng; chưa có SLA",
    fields: ["title", "link", "publication_summary", "published_at"],
    availability: "Public RSS discovery feed",
    termsUrl: null,
    licenseNote: "Chưa xác minh quyền lưu raw/bulk; chỉ dùng discovery",
    attributionText: "Nguồn: Công báo nước CHXHCN Việt Nam",
    retentionDays: null,
    trustClass: "discovery_only",
    readiness: "yellow",
    sampleRef: null,
    decision: "conditional_go",
    risks: [
      "RSS chỉ là discovery metadata, không đủ citation-level evidence",
      "Cần refetch URL chính thức và kiểm tra effectivity",
    ],
    costNote: "Polling nhẹ; production vẫn cần fetcher/guard/parser riêng",
    replacementAndDeletion:
      "RSS item không trở thành citation; xóa discovery cache khi upstream gỡ, giữ audit tối thiểu không chứa raw content.",
    reviewedBy: null,
    reviewedAt: null,
  },
] as const;
