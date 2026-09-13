import { test } from "node:test";
import assert from "node:assert/strict";
import { processInterviewMessage } from "../lib/legal-aid-interview.ts";

test("processInterviewMessage extracts online fraud behavior and details", () => {
  const message = "Em bị một người tên Hoàng trên Facebook lừa đảo nạp tiền làm nhiệm vụ mất 5 triệu đồng";
  const result = processInterviewMessage(message, []);
  assert.ok(result.assistantReply);
  assert.ok(result.extractedFields);
  assert.equal(result.extractedFields.incident?.behaviorSummary, "Lừa đảo chiếm đoạt tài sản qua mạng");
  assert.equal(result.extractedFields.accused?.fullName, "Hoàng");
  assert.equal(result.extractedFields.incident?.damageOrLoss, "5 triệu đồng");
});

test("processInterviewMessage extracts school violence / bullying", () => {
  const message = "Bạn Tuấn cùng lớp đe dọa đánh em ở cổng trường";
  const result = processInterviewMessage(message, []);
  assert.ok(result.assistantReply);
  assert.equal(result.extractedFields.incident?.behaviorSummary, "Đe dọa dùng vũ lực / Bạo lực học đường");
  assert.equal(result.extractedFields.accused?.fullName, "Tuấn");
});

test("processInterviewMessage fails gracefully for generic messages", () => {
  const message = "Xin chào luật sư";
  const result = processInterviewMessage(message, []);
  assert.ok(result.assistantReply.length > 20);
});
