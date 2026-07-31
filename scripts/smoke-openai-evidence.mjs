import {
  composeEvidenceAnswer,
  readOpenAiComposerConfig,
} from "../lib/openai-evidence.ts";

const config = readOpenAiComposerConfig(process.env);
const result = await composeEvidenceAnswer(config, {
  question: "Hệ thống cần làm gì khi không đủ bằng chứng?",
  evidence: [
    {
      evidenceId: "fixture-safety",
      sourceId: 1,
      provisionId: 1,
      provisionStatus: "published",
      sourceStatus: "in_force",
      freshnessStatus: "valid",
      provisionCreatedBy: "fixture-editor",
      provisionReviewedBy: "fixture-reviewer",
      provisionReviewedAt: "2026-07-30T01:00:00Z",
      sourceCreatedBy: "fixture-editor",
      sourceVerifiedBy: "fixture-reviewer",
      sourceLastVerifiedAt: "2026-07-30T01:00:00Z",
      freshnessPolicyVersion: "fixture-policy",
      text: "Đây là fixture kỹ thuật, không phải căn cứ pháp lý. Khi không đủ bằng chứng, hệ thống phải nói rõ giới hạn và không suy đoán.",
      allowedClaims: [
        "Đây không phải căn cứ pháp lý.",
        "Khi không đủ bằng chứng, hệ thống phải nói rõ giới hạn.",
        "Hệ thống không được suy đoán.",
      ],
    },
  ],
});

if (!result.ok) {
  console.error(JSON.stringify({ ok: false, code: result.code }));
  process.exitCode = 1;
} else {
  console.log(
    JSON.stringify({
      ok: true,
      responseId: result.responseId,
      model: result.model,
      usage: result.usage,
    }),
  );
}
