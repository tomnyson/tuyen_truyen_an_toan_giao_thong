import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { register } from "tsx/esm/api";

const unregisterTsx = register();
const {
  contentTopicNames,
  contentTopics,
  filterTopics,
  findTopic,
  isContentTopic,
  situationSuggestions,
} = await import("../lib/topics.ts");
const { rankBySituation, scoreSituationMatch, searchTokens } = await import(
  "../lib/situation-search.ts"
);
const { buildSituationAnswer, situationAnswerParts } = await import(
  "../lib/situation-answer.ts"
);
const { laws } = await import("../lib/legal-content.ts");
const { SituationAnswer } = await import("../components/SituationAnswer.tsx");
const { ContentMedia } = await import("../components/ContentMedia.tsx");

test.after(async () => {
  await unregisterTsx();
});

const lawHaystack = (item) =>
  [item.title, item.legal, item.topic, item.remedy, item.caseStudy, item.tags.join(" ")].join(" ");

test("bo linh vuc phu du bon mang yeu cau va khong trung ten", () => {
  assert.equal(new Set(contentTopicNames).size, contentTopicNames.length);
  for (const required of [
    "Giao thông",
    "Mạng xã hội",
    "Bạo lực học đường",
    "An ninh trật tự",
  ]) {
    assert.ok(isContentTopic(required), `thiếu lĩnh vực ${required}`);
  }
  assert.equal(isContentTopic("Tất cả"), false);
  assert.equal(isContentTopic("Lĩnh vực lạ"), false);
  // Bộ lọc công khai luôn mở đầu bằng "Tất cả", phần còn lại đúng registry.
  assert.equal(filterTopics[0].name, "Tất cả");
  assert.deepEqual(
    filterTopics.slice(1).map((item) => item.name),
    [...contentTopicNames],
  );
  for (const topic of contentTopics) {
    assert.ok(topic.situations.length > 0, `${topic.name} chưa có câu hỏi mẫu`);
    assert.ok(topic.abbreviations.length > 0, `${topic.name} chưa có từ viết tắt`);
  }
});

test("goi y tinh huong theo linh vuc dang chon", () => {
  const traffic = situationSuggestions("Giao thông");
  assert.deepEqual(traffic, findTopic("Giao thông").situations.slice(0, 3));
  // Chưa chọn lĩnh vực thì lấy câu đầu của mỗi lĩnh vực để lộ đủ phạm vi.
  const all = situationSuggestions("Tất cả");
  assert.equal(all.length, 3);
  assert.equal(all[0], contentTopics[0].situations[0]);
  assert.equal(all[1], contentTopics[1].situations[0]);
  assert.deepEqual(situationSuggestions("Giao thông", 0), []);
});

test("tra cuu nhan tu viet tat cua tung linh vuc", () => {
  const traffic = rankBySituation(laws, "ATGT", lawHaystack);
  assert.ok(traffic.length > 0);
  for (const item of traffic) assert.equal(item.topic, "Giao thông");

  const bullying = rankBySituation(laws, "BLHĐ", lawHaystack);
  assert.ok(bullying.length > 0);
  for (const item of bullying) assert.equal(item.topic, "Bạo lực học đường");

  const security = rankBySituation(laws, "antt", lawHaystack);
  assert.ok(security.length > 0);
  for (const item of security) assert.equal(item.topic, "An ninh trật tự");

  const social = rankBySituation(laws, "mxh", lawHaystack);
  assert.ok(social.length > 0);
  for (const item of social) assert.equal(item.topic, "Mạng xã hội");
});

test("cau hoi doi thuc nguyen cau van ra dung tinh huong", () => {
  const results = rankBySituation(
    laws,
    "em bị bắt nạt và đe dọa trong trường thì phải làm gì?",
    lawHaystack,
  );
  assert.ok(results.length > 0);
  assert.equal(results[0].topic, "Bạo lực học đường");

  const helmet = rankBySituation(
    laws,
    "đi xe máy điện không đội mũ bảo hiểm bị phạt bao nhiêu?",
    lawHaystack,
  );
  assert.match(helmet[0].title, /mũ bảo hiểm/);
});

test("cham diem loai truong hop khong lien quan va am tiet ngan", () => {
  assert.equal(scoreSituationMatch("Không đội mũ bảo hiểm", "blockchain quốc tế"), 0);
  // "ảnh" (3 ký tự) không được khớp chuỗi con trong "đánh"/"nhanh".
  assert.equal(scoreSituationMatch("Bị đánh nhau ngoài trường", "ảnh"), 0);
  assert.ok(scoreSituationMatch("Phát tán hình ảnh riêng tư", "ảnh") > 0);
  // Từ đệm bị loại khỏi token nên không tự khớp bừa.
  assert.deepEqual(searchTokens("thì em có bị làm sao không?"), []);
  assert.equal(scoreSituationMatch("Bất kỳ nội dung nào", "thì có bị không"), 1);
});

test("khong nhap gi thi giu nguyen thu tu goc", () => {
  const all = rankBySituation(laws, "   ", lawHaystack);
  assert.deepEqual(
    all.map((item) => item.id),
    laws.map((item) => item.id),
  );
});

test("cau tra loi luon du ba phan dung thu tu", () => {
  const blocks = buildSituationAnswer({
    remedy: "Gỡ nội dung và xin lỗi.",
    penalty: "5 – 10 triệu đồng",
    legalBasis: "Điều 101 Nghị định 15/2020/NĐ-CP",
    citationUrl: "https://vbpl.vn/tw/Pages/vbpq-toanvan.aspx?ItemID=1",
  });
  assert.deepEqual(
    blocks.map((block) => block.part),
    [...situationAnswerParts],
  );
  assert.deepEqual(
    blocks.map((block) => block.part),
    ["handling", "risk", "citation"],
  );
  assert.equal(blocks[0].body, "Gỡ nội dung và xin lỗi.");
  assert.equal(blocks[1].body, "5 – 10 triệu đồng");
  assert.equal(blocks[2].url, "https://vbpl.vn/tw/Pages/vbpq-toanvan.aspx?ItemID=1");
  // Link nguồn chỉ gắn vào phần trích dẫn, không leo lên phần xử lý.
  assert.equal(blocks[0].url, "");
  assert.equal(blocks[1].url, "");
});

test("thieu du lieu thi noi ro chua co, khong bia can cu", () => {
  const blocks = buildSituationAnswer({ remedy: "  ", penalty: "", legalBasis: "" });
  assert.match(blocks[0].body, /báo ngay cho giáo viên/);
  assert.equal(blocks[1].body, "Chưa công bố mức tham khảo");
  assert.equal(blocks[2].body, "Đang kiểm chứng căn cứ hiện hành");
  assert.equal(blocks[2].url, "");
});

test("noi dung seed cua linh vuc moi khong gan can cu chua duyet", () => {
  const pending = laws.filter((item) =>
    ["Bạo lực học đường", "An ninh trật tự"].includes(item.topic),
  );
  assert.equal(pending.length, 2);
  for (const item of pending) {
    assert.equal(item.legal, "Đang kiểm chứng căn cứ hiện hành");
    assert.equal(item.penalty, "Chưa công bố mức tham khảo");
    assert.equal(item.citation, undefined);
    assert.equal(item.verified, undefined);
    assert.ok(item.remedy.length > 0);
  }
});

test("khoi tra loi render ba buoc danh so theo dung thu tu", () => {
  const html = renderToStaticMarkup(
    React.createElement(SituationAnswer, {
      remedy: "Giữ bằng chứng.",
      penalty: "400.000 – 600.000đ",
      legalBasis: "Điều 7 Nghị định 168/2024/NĐ-CP",
      citationUrl: "https://vbpl.vn/tw/Pages/ivbpq-thuoctinh.aspx?ItemID=173920",
    }),
  );
  assert.match(html, /<ol class="situation-answer">/);
  assert.ok(
    html.indexOf('data-part="handling"') <
      html.indexOf('data-part="risk"') &&
      html.indexOf('data-part="risk"') < html.indexOf('data-part="citation"'),
  );
  assert.match(html, /Cách xử lý nhanh/);
  assert.match(html, /Cảnh báo nguy cơ và mức phạt/);
  assert.match(html, /Trích dẫn luật để đối chiếu/);
  assert.match(html, /rel="noopener noreferrer"/);
});

test("media minh hoa render dung loai va bo qua khi rong", () => {
  const image = renderToStaticMarkup(
    React.createElement(ContentMedia, {
      kind: "image",
      url: "https://cdn.example.vn/anh.jpg",
      imageAlt: "Ảnh minh họa tình huống: Test",
      videoTitle: "Video minh họa tình huống: Test",
      className: "situation-media",
    }),
  );
  assert.match(image, /class="situation-media" data-media-kind="image"/);
  assert.match(image, /loading="lazy"/);
  assert.match(image, /alt="Ảnh minh họa tình huống: Test"/);

  const video = renderToStaticMarkup(
    React.createElement(ContentMedia, {
      kind: "youtube",
      url: "https://www.youtube-nocookie.com/embed/abcdefghijk",
      imageAlt: "a",
      videoTitle: "Video minh họa tình huống: Test",
    }),
  );
  assert.match(video, /data-media-kind="youtube"/);
  assert.match(video, /<iframe/);
  assert.match(video, /referrerpolicy="strict-origin-when-cross-origin"/i);

  assert.equal(
    renderToStaticMarkup(
      React.createElement(ContentMedia, {
        kind: "none",
        url: "",
        imageAlt: "a",
        videoTitle: "b",
      }),
    ),
    "",
  );
});
