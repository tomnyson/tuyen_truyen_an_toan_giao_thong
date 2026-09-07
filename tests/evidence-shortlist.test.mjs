import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";

globalThis.__shortlistWorkerEnv = {};
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "cloudflare:workers") {
      return {
        shortCircuit: true,
        url: "data:text/javascript,export const env = globalThis.__shortlistWorkerEnv",
      };
    }
    if (specifier.startsWith("@/")) {
      return {
        shortCircuit: true,
        url: new URL(
          specifier === "@/db" ? "../db/index.ts" : `../${specifier.slice(2)}.ts`,
          import.meta.url,
        ).href,
      };
    }
    if (
      specifier.startsWith(".") &&
      !specifier.match(/\.[a-z]+$/i) &&
      context.parentURL?.endsWith(".ts")
    ) {
      return nextResolve(`${specifier}.ts`, context);
    }
    return nextResolve(specifier, context);
  },
});

const {
  CHAT_EVIDENCE_SHORTLIST_POLICY_VERSION,
  MAX_SHORTLIST_ITEMS,
  evidenceIdOf,
  selectShortlist,
  shortlistEvidence,
} = await import("../lib/evidence-shortlist.ts");
const { isEvidenceFresh } = await import("../lib/chat-evidence-policy.ts");

const nowMs = Date.parse("2026-09-07T00:00:00Z");
const options = { nowMs, maxVerifyAgeDays: 365 };

function candidateRow(overrides = {}) {
  return {
    entryId: 1,
    entryTitle: "Đội mũ bảo hiểm khi đi xe máy điện",
    entryTopic: "Giao thông",
    entryTags: "mu bao hiem, xe may dien",
    entryLegalBasis: "Nghị định 168/2024/NĐ-CP",
    entryPenalty: "Phạt tiền từ 400.000 đồng đến 600.000 đồng.",
    entryRemedy: "Chấp hành và đội mũ bảo hiểm đạt chuẩn khi tham gia giao thông.",
    entryCaseStudy: "Học sinh đi xe máy điện không đội mũ bảo hiểm bị lập biên bản.",
    displayOrder: 1,
    citedChecksumSha256: "checksum-a",
    provisionId: 10,
    provisionStatus: "published",
    provisionSimplifiedText:
      "Người điều khiển xe máy điện phải đội mũ bảo hiểm và cài quai đúng quy cách.",
    provisionCreatedBy: "editor-a",
    provisionReviewedBy: "reviewer-b",
    provisionReviewedAt: "2026-08-01T02:00:00Z",
    provisionArticle: "7",
    provisionClause: "2",
    provisionPoint: "a",
    provisionEffectivityStatus: "in_force",
    provisionEffectiveFrom: "2025-01-01",
    provisionEffectiveTo: null,
    provisionChecksumSha256: "checksum-a",
    sourceId: 5,
    sourceStatus: "in_force",
    sourceTitle: "Nghị định xử phạt vi phạm hành chính lĩnh vực giao thông",
    sourceDocumentNumber: "168/2024/NĐ-CP",
    sourceIssuedAt: "2024-12-26",
    sourceOfficialUrl: "https://vanban.chinhphu.vn/nghi-dinh-168-2024",
    sourceCreatedBy: "editor-a",
    sourceVerifiedBy: "reviewer-c",
    sourceLastVerifiedAt: "2026-08-20T02:00:00Z",
    ...overrides,
  };
}

const question = "Đi xe máy điện không đội mũ bảo hiểm bị phạt bao nhiêu?";

test("phien ban chinh sach shortlist duoc ghim", () => {
  assert.equal(
    CHAT_EVIDENCE_SHORTLIST_POLICY_VERSION,
    "chat-evidence-shortlist-v1",
  );
  assert.equal(MAX_SHORTLIST_ITEMS, 8);
  assert.equal(evidenceIdOf(1, 10), "e1-p10");
});

test("hang hop le duoc dua vao shortlist voi du bon mat", () => {
  const shortlist = selectShortlist([candidateRow()], question, options);

  assert.equal(shortlist.length, 1);
  const [item] = shortlist;
  assert.equal(item.record.evidenceId, "e1-p10");
  assert.equal(item.record.provisionCreatedBy, "editor-a");
  assert.equal(item.record.provisionReviewedBy, "reviewer-b");
  assert.equal(item.record.sourceVerifiedBy, "reviewer-c");
  assert.equal(item.record.freshnessStatus, "valid");
  assert.ok(item.record.allowedClaims.includes(candidateRow().entryPenalty));
  assert.equal(item.citation?.documentNumber, "168/2024/NĐ-CP");
  assert.equal(item.sourceLink?.url, candidateRow().sourceOfficialUrl);
});

test("cung mot nguoi vua tao vua duyet thi bi loai", () => {
  assert.deepEqual(
    selectShortlist(
      [candidateRow({ provisionReviewedBy: "editor-a" })],
      question,
      options,
    ),
    [],
  );
  assert.deepEqual(
    selectShortlist(
      [candidateRow({ sourceVerifiedBy: "editor-a" })],
      question,
      options,
    ),
    [],
  );
});

test("checksum trich dan lech ban van thi khong duoc dung", () => {
  assert.deepEqual(
    selectShortlist(
      [candidateRow({ citedChecksumSha256: "checksum-cu" })],
      question,
      options,
    ),
    [],
  );
});

test("nguon het hieu luc hoac qua han doi chieu deu bi loai", () => {
  assert.deepEqual(
    selectShortlist(
      [candidateRow({ sourceStatus: "repealed" })],
      question,
      options,
    ),
    [],
  );
  assert.deepEqual(
    selectShortlist(
      [candidateRow({ provisionEffectivityStatus: "repealed" })],
      question,
      options,
    ),
    [],
  );
  assert.deepEqual(
    selectShortlist(
      [candidateRow({ sourceLastVerifiedAt: "2024-01-01T02:00:00Z" })],
      question,
      options,
    ),
    [],
  );
  assert.deepEqual(
    selectShortlist(
      [candidateRow({ provisionEffectiveTo: "2026-01-01" })],
      question,
      options,
    ),
    [],
  );
});

test("cau hoi hoan toan ngoai kho khong keo theo mot lan goi nao", () => {
  assert.deepEqual(
    selectShortlist(
      [candidateRow()],
      "Thủ tục đăng ký kết hôn với người nước ngoài thế nào?",
      options,
    ),
    [],
  );
});

test("ung vien phu duoc di kem khi co it nhat mot ung vien du manh", () => {
  const weak = candidateRow({
    entryId: 2,
    provisionId: 20,
    entryTitle: "Giấy phép lái xe",
    entryTopic: "Giao thông",
    entryTags: "giay phep lai xe",
    entryCaseStudy: "Người lái xe không mang giấy phép.",
    entryLegalBasis: "Nghị định 168/2024/NĐ-CP",
    provisionSimplifiedText: "Người lái xe phải mang theo giấy phép lái xe.",
  });
  const shortlist = selectShortlist([candidateRow(), weak], question, options);

  assert.equal(shortlist.length, 2);
  assert.equal(shortlist[0].record.evidenceId, "e1-p10");
  assert.ok(shortlist[0].score >= 2);
  assert.ok(shortlist[1].score >= 1);
});

test("shortlist khong bao gio vuot tran cua bo soan", () => {
  const rows = Array.from({ length: 20 }, (_unused, index) =>
    candidateRow({ entryId: index + 1, provisionId: 100 + index }),
  );
  assert.equal(
    selectShortlist(rows, question, options).length,
    MAX_SHORTLIST_ITEMS,
  );
});

test("truy van loi thi tra ve rong chu khong nem loi ra route", async () => {
  const shortlist = await shortlistEvidence(question, {
    loadRows: async () => {
      throw new Error("db down");
    },
    runtimeEnv: {},
    now: () => nowMs,
  });
  assert.deepEqual(shortlist, []);
});

test("chinh sach tuoi moi tu choi moc doi chieu o tuong lai", () => {
  assert.equal(
    isEvidenceFresh(
      {
        sourceStatus: "in_force",
        sourceLastVerifiedAt: "2027-01-01T00:00:00Z",
        provisionStatus: "published",
        provisionEffectivityStatus: "in_force",
        provisionEffectiveFrom: "2025-01-01",
        provisionEffectiveTo: null,
        provisionChecksumSha256: "checksum-a",
        citedChecksumSha256: "checksum-a",
      },
      options,
    ),
    false,
  );
});
