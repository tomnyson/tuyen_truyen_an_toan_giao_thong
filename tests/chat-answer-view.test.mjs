import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { register } from "tsx/esm/api";

const unregisterTsx = register();
const {
  chatAnswerFallbackText,
  chatAnswerNetworkErrorText,
  parseChatAnswerPayload,
} = await import("../lib/chat-answer-view.ts");
const { ChatAnswerBody } = await import("../components/ChatAnswerBody.tsx");

test.after(async () => {
  await unregisterTsx();
});

test("payload thieu answer thi dung cau du phong chu khong render undefined", () => {
  const view = parseChatAnswerPayload({ mode: "unavailable" });
  assert.equal(view.answer, chatAnswerFallbackText);
  assert.equal(view.warning, null);
  assert.equal(view.sections, null);
  assert.deepEqual(view.sources, []);
  assert.deepEqual(view.followUps, []);
  assert.equal(view.answerOrigin, null);
  assert.equal(view.topic, null);
  assert.ok(chatAnswerNetworkErrorText.length > 0);
});

test("loi tra ve tu server duoc dung lam noi dung tra loi", () => {
  const view = parseChatAnswerPayload({
    error: "Bạn hãy nhập một câu hỏi trước nhé.",
  });
  assert.equal(view.answer, "Bạn hãy nhập một câu hỏi trước nhé.");
});

test("chi nhanh web_search moi giu canh bao, sourceKind reference doi dung parser", () => {
  const view = parseChatAnswerPayload({
    answer: "Kết luận: hãy đối chiếu nguồn.",
    mode: "web_search",
    warning: "Cảnh báo từ server.",
    sourceKind: "reference",
    answerOrigin: "live_web",
    sources: [
      { title: "Bài tham khảo", url: "https://thuvienphapluat.vn/van-ban/x" },
    ],
  });
  assert.equal(view.warning, "Cảnh báo từ server.");
  assert.equal(view.sourceKind, "reference");
  assert.equal(view.answerOrigin, "live_web");
  assert.equal(view.sources.length, 1);

  // Nhánh knowledge không mang cảnh báo, và sourceKind lạ rơi về official.
  const knowledge = parseChatAnswerPayload({
    answer: "Kết luận: theo kho nội dung.",
    mode: "knowledge",
    warning: "Không được hiển thị.",
    sourceKind: "reference",
    sources: [{ title: "Nguồn", url: "https://vbpl.vn/van-ban" }],
    followUps: ["Hỏi tiếp câu này?"],
    topic: "Giao thông",
  });
  assert.equal(knowledge.warning, null);
  assert.equal(knowledge.sourceKind, "official");
  assert.equal(knowledge.sources.length, 1);
  assert.deepEqual(knowledge.followUps, ["Hỏi tiếp câu này?"]);
  assert.equal(knowledge.topic, "Giao thông");
});

test("linh vuc khong thuoc bo chu de bi bo qua", () => {
  const view = parseChatAnswerPayload({ mode: "knowledge", topic: "Hôn nhân" });
  assert.equal(view.topic, null);
});

test("than cau tra loi dat khuyen cao truoc canh bao va truoc noi dung", () => {
  const html = renderToStaticMarkup(
    React.createElement(ChatAnswerBody, {
      answer: parseChatAnswerPayload({
        answer: "Kết luận: hãy đối chiếu nguồn.",
        mode: "web_search",
        warning: "Cảnh báo từ server.",
        answerOrigin: "live_web",
        sources: [{ title: "Nguồn Chính phủ", url: "https://vbpl.vn/van-ban" }],
      }),
    }),
  );
  const originIndex = html.indexOf('class="chat-origin"');
  const disclaimerIndex = html.indexOf('class="ai-disclaimer"');
  const warningIndex = html.indexOf('class="chat-warning"');
  const bodyIndex = html.indexOf("Kết luận: hãy đối chiếu nguồn.");
  const sourcesIndex = html.indexOf('class="chat-source-group"');
  assert.ok(originIndex >= 0);
  assert.ok(originIndex < disclaimerIndex);
  assert.ok(disclaimerIndex < warningIndex);
  assert.ok(warningIndex < bodyIndex);
  assert.ok(bodyIndex < sourcesIndex);
  assert.match(html, /data-level="unverified"/);
  assert.match(html, /rel="noopener noreferrer"/);
});

test("tra loi khong co nhan nguon van co khuyen cao", () => {
  const html = renderToStaticMarkup(
    React.createElement(ChatAnswerBody, {
      answer: parseChatAnswerPayload({
        answer: "Câu này chưa có trong dữ liệu đã duyệt.",
        mode: "unavailable",
      }),
    }),
  );
  assert.match(html, /class="ai-disclaimer"/);
  assert.match(html, /data-level="reviewed"/);
  assert.doesNotMatch(html, /class="chat-origin"/);
});
