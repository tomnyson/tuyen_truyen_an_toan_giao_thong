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

test("processInterviewMessage understands direct name input in conversational context", () => {
  const history = [
    {
      role: "assistant",
      content: "Chào em, em hãy kể lại tóm tắt sự việc: Ai là người đã làm tổn hại/lừa dối em?",
    },
  ];
  // The exact case reported by the user:
  const message = "Nguyên văn linh";
  const result = processInterviewMessage(message, history);

  assert.ok(result.extractedFields.accused?.fullName, "Must extract accused name");
  assert.equal(result.extractedFields.accused.fullName, "Nguyên Văn Linh");
  assert.ok(
    result.assistantReply.includes("Nguyên Văn Linh") || result.assistantReply.includes("đối tượng"),
    "Assistant must acknowledge the accused name instead of repeating the opening greeting"
  );
  assert.ok(!result.assistantReply.includes("Chào em, em đừng quá lo lắng nhé. Em hãy kể lại tóm tắt sự việc đang gặp phải"));
});

test("processInterviewMessage extracts standalone name without keywords", () => {
  const result = processInterviewMessage("Nguyễn Văn Linh", []);
  assert.equal(result.extractedFields.accused?.fullName, "Nguyễn Văn Linh");
  assert.ok(result.assistantReply.includes("Nguyễn Văn Linh"));
});

