import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { register } from "tsx/esm/api";

const unregisterTsx = register();
const { EngagementBar, EngagementStat } = await import(
  "../components/EngagementBar.tsx"
);
const { EngagementProvider } = await import(
  "../components/EngagementProvider.tsx"
);
const { ShowcaseDialog, ShowcaseGallery } = await import(
  "../components/ShowcaseGallery.tsx"
);

test.after(async () => {
  await unregisterTsx();
});

const showcase = (id) => ({
  id,
  topic: "Giao thông",
  title: `Tình huống ${id}`,
  summary: "Nội dung tình huống.",
  sourceUrl: "",
  mediaUrl: "",
  mediaKind: "none",
});

test("thanh tuong tac co nut y nghia va nut chia se", () => {
  const html = renderToStaticMarkup(
    React.createElement(EngagementBar, {
      entityType: "showcase",
      entityId: 4,
      title: "Tình huống 4",
    }),
  );
  assert.match(html, /Nội dung này ý nghĩa/);
  assert.match(html, /Chia sẻ/);
  assert.match(html, /lượt xem/);
  assert.match(html, /aria-pressed="false"/);
  assert.match(html, /role="status"/);
  assert.match(html, /class="engagement-favorite"/);
  assert.match(html, /class="engagement-share"/);
});

test("khong co provider van render duoc voi so 0", () => {
  const html = renderToStaticMarkup(
    React.createElement(EngagementStat, {
      entityType: "law",
      entityId: 1,
    }),
  );
  assert.match(html, /0 lượt xem/);
  // Chưa ai đánh dấu thì không hiển thị dòng "thấy ý nghĩa" rỗng nghĩa.
  assert.doesNotMatch(html, /thấy ý nghĩa/);
});

test("provider khong lam thay doi noi dung con", () => {
  const child = React.createElement(EngagementStat, {
    entityType: "law",
    entityId: 1,
  });
  const bare = renderToStaticMarkup(child);
  const wrapped = renderToStaticMarkup(
    React.createElement(EngagementProvider, null, child),
  );
  assert.equal(wrapped, bare);
});

test("hop thoai tinh huong nhung thanh tuong tac", () => {
  const html = renderToStaticMarkup(
    React.createElement(ShowcaseDialog, {
      item: showcase(7),
      onClose() {},
    }),
  );
  assert.match(html, /class="engagement-bar"/);
  assert.match(html, /Nội dung này ý nghĩa/);
  // Thanh tương tác phải đứng trước ghi chú pháp lý cuối hộp thoại.
  assert.ok(
    html.indexOf("engagement-bar") < html.indexOf("không thay thế tư vấn"),
  );
});

test("the tinh huong hien luot xem", () => {
  const html = renderToStaticMarkup(
    React.createElement(ShowcaseGallery, {
      state: "ready",
      showcases: [showcase(1), showcase(2)],
    }),
  );
  assert.equal((html.match(/class="engagement-stat"/g) ?? []).length, 2);
  assert.equal((html.match(/lượt xem/g) ?? []).length, 2);
  // Thẻ danh sách chỉ hiển thị số liệu, nút tương tác nằm trong hộp thoại.
  assert.doesNotMatch(html, /engagement-favorite/);
});
