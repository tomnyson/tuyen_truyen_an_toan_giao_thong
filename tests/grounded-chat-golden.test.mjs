// Bộ câu hỏi vàng cho cổng vào nhánh có kiểm chứng.
//
// Test này không khẳng định câu trả lời đúng — điều đó do bốn mắt duyệt. Nó giữ
// một tính chất rẻ mà dễ vỡ khi sửa điểm khớp: câu hỏi trong phạm vi kho thì mở
// được cổng, câu hoàn toàn ngoài phạm vi thì không kéo theo lần gọi nào.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { registerHooks } from "node:module";
import test from "node:test";

globalThis.__goldenWorkerEnv = {};
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "cloudflare:workers") {
      return {
        shortCircuit: true,
        url: "data:text/javascript,export const env = globalThis.__goldenWorkerEnv",
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

const { selectShortlist } = await import("../lib/evidence-shortlist.ts");
const { laws } = await import("../lib/legal-content.ts");

const fixture = JSON.parse(
  await readFile(
    new URL("../fixtures/grounded-chat/questions.v1.json", import.meta.url),
    "utf8",
  ),
);

const nowMs = Date.parse("2026-09-07T00:00:00Z");
const options = { nowMs, maxVerifyAgeDays: 365 };

// Hàng ứng viên dựng từ kho đã xuất bản, gắn thêm phần siêu dữ liệu duyệt/hiệu
// lực tổng hợp để test chỉ đo đúng cổng khớp câu hỏi.
const rows = laws.map((law, index) => ({
  entryId: law.id,
  entryTitle: law.title,
  entryTopic: law.topic,
  entryTags: law.tags.join(", "),
  entryLegalBasis: law.legal,
  entryPenalty: law.penalty,
  entryRemedy: law.remedy,
  entryCaseStudy: law.caseStudy,
  displayOrder: index + 1,
  citedChecksumSha256: `checksum-${law.id}`,
  provisionId: 100 + law.id,
  provisionStatus: "published",
  provisionSimplifiedText: `${law.title}. ${law.remedy}`,
  provisionCreatedBy: "editor-a",
  provisionReviewedBy: "reviewer-b",
  provisionReviewedAt: "2026-08-01T02:00:00Z",
  provisionArticle: law.citation?.article ?? "1",
  provisionClause: law.citation?.clause ?? "1",
  provisionPoint: law.citation?.point ?? null,
  provisionEffectivityStatus: "in_force",
  provisionEffectiveFrom: law.citation?.effectiveFrom ?? "2025-01-01",
  provisionEffectiveTo: null,
  provisionChecksumSha256: `checksum-${law.id}`,
  sourceId: 200 + law.id,
  sourceStatus: "in_force",
  sourceTitle: law.citation?.title ?? law.legal,
  sourceDocumentNumber: law.citation?.documentNumber ?? "168/2024/NĐ-CP",
  sourceIssuedAt: law.citation?.issuedAt ?? "2024-12-26",
  sourceOfficialUrl:
    law.citation?.officialUrl ??
    "https://vbpl.vn/tw/Pages/ivbpq-thuoctinh.aspx?ItemID=173920",
  sourceCreatedBy: "editor-a",
  sourceVerifiedBy: "reviewer-c",
  sourceLastVerifiedAt: "2026-08-20T02:00:00Z",
}));

test("bo cau hoi vang du lon va co ca hai phia", () => {
  assert.equal(fixture.schemaVersion, "grounded-chat-fixture-v1");
  assert.ok(fixture.questions.length >= 30);
  assert.ok(
    fixture.questions.some((entry) => entry.expectShortlist === false),
    "phải có câu ngoài phạm vi để giữ cổng đóng lại được",
  );
  const ids = fixture.questions.map((entry) => entry.id);
  assert.equal(new Set(ids).size, ids.length);
});

for (const entry of fixture.questions) {
  test(`cong vao nhanh co kiem chung: ${entry.id}`, () => {
    const shortlist = selectShortlist(rows, entry.question, options);

    assert.equal(
      shortlist.length > 0,
      entry.expectShortlist,
      `${entry.question} — shortlist ${shortlist.length} mục`,
    );
    assert.ok(shortlist.length <= 8);
    if (entry.expectShortlist) {
      // Trong lĩnh vực đã định tuyến phải có ít nhất một ứng viên khớp thật,
      // chứ không chỉ trùng vài âm tiết lẻ.
      assert.ok(shortlist.some((item) => item.score >= 2));
      if (entry.topic) {
        assert.equal(shortlist[0].entryTopic, entry.topic);
      }
    }
  });
}
