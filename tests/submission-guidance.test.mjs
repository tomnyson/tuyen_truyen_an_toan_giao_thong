import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("SubmissionGuidanceModal details 4 safe steps and authority selection", () => {
  const content = fs.readFileSync("components/SubmissionGuidanceModal.tsx", "utf8");
  assert.ok(content.includes("Điều 145") || content.includes("Điều 146"));
  assert.ok(content.includes("Giấy tiếp nhận") || content.includes("biên nhận"));
  assert.ok(content.includes("/api/co-quan"));
  assert.ok(content.includes("02 bản đơn"));
});
