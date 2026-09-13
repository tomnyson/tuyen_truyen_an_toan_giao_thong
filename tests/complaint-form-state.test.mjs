import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createEmptyComplaintForm,
  calculateFormCompletionProgress,
} from "../lib/complaint-form-state.ts";

test("createEmptyComplaintForm returns default template with today date", () => {
  const form = createEmptyComplaintForm();
  assert.ok(form.createdDate);
  assert.equal(form.complainant.fullName, "");
  assert.equal(form.incident.behaviorSummary, "");
  assert.deepEqual(form.evidence.items, []);
});

test("calculateFormCompletionProgress calculates completion percentage correctly", () => {
  const form = createEmptyComplaintForm();
  const initProgress = calculateFormCompletionProgress(form);
  assert.equal(initProgress.completedCount, 0);
  assert.equal(initProgress.percentage, 0);

  form.complainant.fullName = "Nguyễn Văn A";
  form.complainant.idNumber = "001099012345";
  form.complainant.permanentAddress = "Đắk Lắk";
  form.incident.behaviorSummary = "Lừa đảo chiếm đoạt tài sản";

  const updated = calculateFormCompletionProgress(form);
  assert.ok(updated.completedCount > 0);
  assert.ok(updated.percentage > 0 && updated.percentage <= 100);
});
