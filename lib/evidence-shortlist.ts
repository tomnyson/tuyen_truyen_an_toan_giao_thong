// Lọc thô ứng viên evidence cho bộ soạn có kiểm chứng.
//
// Đây là nơi DUY NHẤT quyết định dữ liệu nào được đưa cho mô hình. Mọi bản ghi
// rời khỏi module này đều đã qua bốn mắt (người tạo khác người duyệt ở cả điều
// khoản lẫn nguồn), còn hiệu lực, và có checksum trích dẫn khớp bản văn.
//
// Cổng vào nhánh là bộ định tuyến lĩnh vực dùng chung (`routeQuestionToTopic`),
// chứ không phải một ngưỡng điểm riêng. Điểm khớp thô là túi âm tiết nên rất ồn:
// đo trên bộ câu hỏi vàng, "Xin visa du học Nhật Bản mất bao lâu?" vẫn đạt 4 điểm
// với một điều luật giao thông. Bộ định tuyến đã được hiệu chỉnh đúng cho nhược
// điểm đó, nên câu ngoài phạm vi không kéo theo một lần gọi nhà cung cấp nào.
//
// Sau khi đã chốt lĩnh vực, ngưỡng đưa vào shortlist chỉ còn là 1: việc phân biệt
// ứng viên nào thực sự trả lời được câu hỏi là việc của mô hình, không phải của
// điểm số đoán.
import { and, desc, eq, isNotNull } from "drizzle-orm";
import { getInitializedDb } from "@/db";
import {
  legalEntries,
  legalEntryCitations,
  legalProvisions,
  legalSources,
} from "@/db/pg-schema";
import {
  CHAT_EVIDENCE_POLICY_VERSION,
  isEvidenceFresh,
  readChatEvidenceMaxVerifyAgeDays,
  toIsoDate,
  toIsoDateTime,
} from "./chat-evidence-policy";
import type { ReviewedCitationPresentationInput } from "./chat-answer-presentation";
import { routeQuestionToTopic } from "./knowledge-router";
import { hasBlockedLegalBasis } from "./legal-content";
import { canonicalOfficialSourceUrl } from "./official-source-url";
import type { OfficialSourceLink } from "./official-source-url";
import type { EvidenceRecord } from "./openai-evidence";
import { env } from "./runtime-env";
import { scoreSituationMatch, searchTokens } from "./situation-search";

export const CHAT_EVIDENCE_SHORTLIST_POLICY_VERSION =
  "chat-evidence-shortlist-v1";

// Trần cứng của bộ soạn (`MAX_EVIDENCE_ITEMS` trong openai-evidence).
export const MAX_SHORTLIST_ITEMS = 8;
const MAX_EVIDENCE_TEXT_LENGTH = 4_000;
const MAX_ALLOWED_CLAIMS = 16;
const MAX_CLAIM_LENGTH = 1_200;
const MINIMUM_SHORTLIST_SCORE = 1;
const CANDIDATE_ROW_LIMIT = 200;

export type ShortlistCandidateRow = Readonly<{
  entryId: number;
  entryTitle: string;
  entryTopic: string;
  entryTags: string;
  entryLegalBasis: string;
  entryPenalty: string;
  entryRemedy: string;
  entryCaseStudy: string;
  displayOrder: number;
  citedChecksumSha256: string | null;
  provisionId: number;
  provisionStatus: string;
  provisionSimplifiedText: string;
  provisionCreatedBy: string;
  provisionReviewedBy: string | null;
  provisionReviewedAt: string | null;
  provisionArticle: string | null;
  provisionClause: string | null;
  provisionPoint: string | null;
  provisionEffectivityStatus: string;
  provisionEffectiveFrom: string | null;
  provisionEffectiveTo: string | null;
  provisionChecksumSha256: string | null;
  sourceId: number;
  sourceStatus: string;
  sourceTitle: string;
  sourceDocumentNumber: string;
  sourceIssuedAt: string | null;
  sourceOfficialUrl: string;
  sourceCreatedBy: string;
  sourceVerifiedBy: string | null;
  sourceLastVerifiedAt: string | null;
}>;

// Bản ghi gửi cho mô hình, kèm phần dữ liệu chuẩn mà server dùng để dựng lại số
// tiền và căn cứ sau khi mô hình trả lời (mô hình không được viết chữ số).
export type ShortlistedEvidence = Readonly<{
  record: EvidenceRecord;
  entryId: number;
  entryTopic: string;
  score: number;
  penalty: string;
  remedy: string;
  citation: ReviewedCitationPresentationInput | null;
  sourceLink: OfficialSourceLink | null;
}>;

export function evidenceIdOf(entryId: number, provisionId: number): string {
  return `e${entryId}-p${provisionId}`;
}

function boundedClaim(value: string): string | null {
  const claim = value.trim();
  return claim.length > 0 && claim.length <= MAX_CLAIM_LENGTH ? claim : null;
}

function allowedClaimsOf(row: ShortlistCandidateRow): string[] {
  const claims = [
    row.entryTitle,
    row.entryPenalty,
    row.entryRemedy,
    row.entryCaseStudy,
  ]
    .flatMap((value) => {
      const claim = boundedClaim(value);
      return claim ? [claim] : [];
    })
    .filter((claim, index, all) => all.indexOf(claim) === index);
  return claims.slice(0, MAX_ALLOWED_CLAIMS);
}

function citationOf(
  row: ShortlistCandidateRow,
): ReviewedCitationPresentationInput | null {
  const issuedAt = toIsoDate(row.sourceIssuedAt);
  const effectiveFrom = toIsoDate(row.provisionEffectiveFrom);
  const lastVerifiedAt = toIsoDate(row.sourceLastVerifiedAt);
  if (!issuedAt || !effectiveFrom || !lastVerifiedAt) return null;
  return {
    title: row.sourceTitle,
    documentNumber: row.sourceDocumentNumber,
    issuedAt,
    article: row.provisionArticle ?? undefined,
    clause: row.provisionClause ?? undefined,
    point: row.provisionPoint ?? undefined,
    effectiveFrom,
    effectiveTo: toIsoDate(row.provisionEffectiveTo) ?? undefined,
    lastVerifiedAt,
  };
}

function toShortlistedEvidence(
  row: ShortlistCandidateRow,
  score: number,
): ShortlistedEvidence | null {
  const reviewedAt = toIsoDateTime(row.provisionReviewedAt);
  const verifiedAt = toIsoDateTime(row.sourceLastVerifiedAt);
  const text = row.provisionSimplifiedText.trim();
  const allowedClaims = allowedClaimsOf(row);
  if (
    !reviewedAt ||
    !verifiedAt ||
    text.length === 0 ||
    text.length > MAX_EVIDENCE_TEXT_LENGTH ||
    allowedClaims.length === 0 ||
    !row.provisionReviewedBy ||
    !row.sourceVerifiedBy ||
    // Bốn mắt thật sự: cùng một người vừa tạo vừa duyệt thì không tính.
    row.provisionCreatedBy.trim() === row.provisionReviewedBy.trim() ||
    row.sourceCreatedBy.trim() === row.sourceVerifiedBy.trim() ||
    row.provisionCreatedBy.trim().length === 0 ||
    row.sourceCreatedBy.trim().length === 0
  ) {
    return null;
  }

  const officialUrl = canonicalOfficialSourceUrl(row.sourceOfficialUrl);
  return {
    record: {
      evidenceId: evidenceIdOf(row.entryId, row.provisionId),
      sourceId: row.sourceId,
      provisionId: row.provisionId,
      provisionStatus: "published",
      sourceStatus: "in_force",
      freshnessStatus: "valid",
      provisionCreatedBy: row.provisionCreatedBy.trim(),
      provisionReviewedBy: row.provisionReviewedBy.trim(),
      provisionReviewedAt: reviewedAt,
      sourceCreatedBy: row.sourceCreatedBy.trim(),
      sourceVerifiedBy: row.sourceVerifiedBy.trim(),
      sourceLastVerifiedAt: verifiedAt,
      freshnessPolicyVersion: CHAT_EVIDENCE_POLICY_VERSION,
      text,
      allowedClaims,
    },
    entryId: row.entryId,
    entryTopic: row.entryTopic,
    score,
    penalty: row.entryPenalty.trim(),
    remedy: row.entryRemedy.trim(),
    citation: citationOf(row),
    sourceLink: officialUrl
      ? {
          title: `${row.sourceDocumentNumber} — ${row.sourceTitle}`,
          url: officialUrl,
        }
      : null,
  };
}

export type ShortlistOptions = Readonly<{
  nowMs: number;
  maxVerifyAgeDays: number;
}>;

// Phần thuần: chấm điểm, lọc tươi mới, ánh xạ hàng và cắt còn 8. Tách khỏi truy
// vấn để test được mà không cần cơ sở dữ liệu.
export function selectShortlist(
  rows: readonly ShortlistCandidateRow[],
  question: string,
  options: ShortlistOptions,
): ShortlistedEvidence[] {
  if (searchTokens(question).length === 0) return [];

  // Câu hỏi không thuộc lĩnh vực nào của cổng thì dừng ngay tại đây: không đọc
  // dữ liệu, không gọi mô hình, để cascade cũ trả lời như trước.
  const route = routeQuestionToTopic(question);
  if (!route) return [];

  const scored = rows
    .filter((row) => row.entryTopic === route.topic)
    .filter((row) => !hasBlockedLegalBasis(row.entryLegalBasis))
    .filter((row) =>
      isEvidenceFresh(
        {
          sourceStatus: row.sourceStatus,
          sourceLastVerifiedAt: row.sourceLastVerifiedAt,
          provisionStatus: row.provisionStatus,
          provisionEffectivityStatus: row.provisionEffectivityStatus,
          provisionEffectiveFrom: row.provisionEffectiveFrom,
          provisionEffectiveTo: row.provisionEffectiveTo,
          provisionChecksumSha256: row.provisionChecksumSha256,
          citedChecksumSha256: row.citedChecksumSha256,
        },
        options,
      ),
    )
    .map((row, index) => ({
      row,
      index,
      score: scoreSituationMatch(
        [
          row.entryTitle,
          row.entryTopic,
          row.entryTags,
          row.entryLegalBasis,
          row.entryRemedy,
          row.entryCaseStudy,
          row.provisionSimplifiedText,
        ].join(" "),
        question,
      ),
    }))
    .filter((candidate) => candidate.score >= MINIMUM_SHORTLIST_SCORE)
    .sort((left, right) =>
      left.score === right.score
        ? left.row.displayOrder === right.row.displayOrder
          ? left.index - right.index
          : left.row.displayOrder - right.row.displayOrder
        : right.score - left.score,
    );

  const seen = new Set<string>();
  const shortlist: ShortlistedEvidence[] = [];
  for (const candidate of scored) {
    if (shortlist.length >= MAX_SHORTLIST_ITEMS) break;
    const evidence = toShortlistedEvidence(candidate.row, candidate.score);
    if (!evidence || seen.has(evidence.record.evidenceId)) continue;
    seen.add(evidence.record.evidenceId);
    shortlist.push(evidence);
  }
  return shortlist;
}

async function loadCandidateRows(): Promise<ShortlistCandidateRow[]> {
  const db = await getInitializedDb();
  const rows = await db
    .select({
      entryId: legalEntries.id,
      entryTitle: legalEntries.title,
      entryTopic: legalEntries.topic,
      entryTags: legalEntries.tags,
      entryLegalBasis: legalEntries.legalBasis,
      entryPenalty: legalEntries.penalty,
      entryRemedy: legalEntries.remedy,
      entryCaseStudy: legalEntries.caseStudy,
      displayOrder: legalEntryCitations.displayOrder,
      citedChecksumSha256: legalEntryCitations.citedChecksumSha256,
      provisionId: legalProvisions.id,
      provisionStatus: legalProvisions.status,
      provisionSimplifiedText: legalProvisions.simplifiedText,
      provisionCreatedBy: legalProvisions.createdBy,
      provisionReviewedBy: legalProvisions.reviewedBy,
      provisionReviewedAt: legalProvisions.reviewedAt,
      provisionArticle: legalProvisions.article,
      provisionClause: legalProvisions.clause,
      provisionPoint: legalProvisions.point,
      provisionEffectivityStatus: legalProvisions.effectivityStatus,
      provisionEffectiveFrom: legalProvisions.effectiveFrom,
      provisionEffectiveTo: legalProvisions.effectiveTo,
      provisionChecksumSha256: legalProvisions.checksumSha256,
      sourceId: legalSources.id,
      sourceStatus: legalSources.status,
      sourceTitle: legalSources.title,
      sourceDocumentNumber: legalSources.documentNumber,
      sourceIssuedAt: legalSources.issuedAt,
      sourceOfficialUrl: legalSources.officialUrl,
      sourceCreatedBy: legalSources.createdBy,
      sourceVerifiedBy: legalSources.verifiedBy,
      sourceLastVerifiedAt: legalSources.lastVerifiedAt,
    })
    .from(legalEntryCitations)
    .innerJoin(
      legalEntries,
      eq(legalEntryCitations.legalEntryId, legalEntries.id),
    )
    .innerJoin(
      legalProvisions,
      eq(legalEntryCitations.provisionId, legalProvisions.id),
    )
    .innerJoin(legalSources, eq(legalProvisions.sourceId, legalSources.id))
    .where(
      and(
        eq(legalEntries.status, "published"),
        eq(legalEntryCitations.reviewStatus, "four_eyes_verified"),
        eq(legalProvisions.status, "published"),
        eq(legalSources.status, "in_force"),
        isNotNull(legalProvisions.reviewedBy),
        isNotNull(legalProvisions.reviewedAt),
        isNotNull(legalSources.verifiedBy),
        isNotNull(legalSources.lastVerifiedAt),
        eq(
          legalEntryCitations.citedChecksumSha256,
          legalProvisions.checksumSha256,
        ),
      ),
    )
    .orderBy(desc(legalEntries.updatedAt), legalEntryCitations.displayOrder)
    .limit(CANDIDATE_ROW_LIMIT);
  return rows;
}

export type ShortlistDependencies = Readonly<{
  loadRows: () => Promise<ShortlistCandidateRow[]>;
  runtimeEnv: Record<string, unknown>;
  now: () => number;
}>;

export async function shortlistEvidence(
  question: string,
  dependencies: Partial<ShortlistDependencies> = {},
): Promise<ShortlistedEvidence[]> {
  const loadRows = dependencies.loadRows ?? loadCandidateRows;
  const runtimeEnv = dependencies.runtimeEnv ?? env;
  const now = dependencies.now ?? Date.now;
  try {
    const rows = await loadRows();
    return selectShortlist(rows, question, {
      nowMs: now(),
      maxVerifyAgeDays: readChatEvidenceMaxVerifyAgeDays(runtimeEnv),
    });
  } catch {
    return [];
  }
}
