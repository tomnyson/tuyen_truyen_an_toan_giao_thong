import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { register } from "tsx/esm/api";

const unregisterTsx = register();
const {
  createPublicContentHandler,
  isExactDec004SourceUrl,
  parsePublicShowcases,
  projectPublishedShowcases,
} = await import("../lib/public-showcase.ts");
const {
  handleShowcaseDialogKeyDown,
  restoreShowcaseTriggerFocus,
  ShowcaseDialog,
  ShowcaseGallery,
  showcaseDialogReducer,
} = await import("../components/ShowcaseGallery.tsx");

test.after(async () => {
  await unregisterTsx();
});

const officialSource =
  "https://vbpl.vn/TW/Pages/vbpq-toanvan.aspx?ItemID=173920";

function showcase(id, overrides = {}) {
  return {
    id,
    topic: "Giao thông",
    title: `Tình huống ${id}`,
    summary: `Nội dung đầy đủ ${id}`,
    sourceUrl: officialSource,
    status: "published",
    ...overrides,
  };
}

async function responseFor(showcases) {
  const handler = createPublicContentHandler(async () => ({
    laws: [],
    showcases,
  }));
  return handler();
}

test("public showcase projection accepts only exact DEC-004 HTTPS authority", () => {
  for (const url of [
    officialSource,
    "https://vbpl.moj.gov.vn/van-ban",
    "https://chinhphu.vn/van-ban",
    "https://vanban.chinhphu.vn/van-ban",
  ]) {
    assert.equal(isExactDec004SourceUrl(url), true, url);
  }
  for (const url of [
    "http://vbpl.vn/van-ban",
    "https://vbpl.vn.evil.example/van-ban",
    "https://evil.example/vbpl.vn",
    "https://user@vbpl.vn/van-ban",
    "not-a-url",
  ]) {
    assert.equal(isExactDec004SourceUrl(url), false, url);
  }
});

test("public API preserves success-empty instead of inventing fallback cards", async () => {
  const response = await responseFor([]);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { laws: [], showcases: [] });
});

test("public API projects one valid published showcase and excludes draft or invalid records", async () => {
  const response = await responseFor([
    showcase(90, { status: "draft" }),
    showcase(91, { sourceUrl: "https://vbpl.vn.evil.example/source" }),
    showcase(92, { summary: "  " }),
    showcase(7),
  ]);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(body.showcases, [
    {
      id: 7,
      topic: "Giao thông",
      title: "Tình huống 7",
      summary: "Nội dung đầy đủ 7",
      sourceUrl: officialSource,
    },
  ]);
  assert.equal("status" in body.showcases[0], false);
});

test("public API preserves deterministic database order for at least three stable IDs", async () => {
  const response = await responseFor([
    showcase(30),
    showcase(10),
    showcase(20),
  ]);
  const body = await response.json();

  assert.deepEqual(
    body.showcases.map((item) => item.id),
    [30, 10, 20],
  );
});

test("public API reports dependency failure as 503 no-store", async () => {
  const handler = createPublicContentHandler(async () => {
    throw new Error("D1 unavailable");
  });
  const response = await handler();

  assert.equal(response.status, 503);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(await response.json(), {
    error: "CONTENT_DEPENDENCY_UNAVAILABLE",
  });
});

test("projector rejects duplicate IDs and preserves first eligible API position", () => {
  assert.deepEqual(
    projectPublishedShowcases([
      showcase(3),
      showcase(3, { title: "Duplicate must not render" }),
      showcase(1),
    ]).map((item) => item.title),
    ["Tình huống 3", "Tình huống 1"],
  );
});

test("client parser accepts only the exact public DTO and never promotes eligibility fields", () => {
  const publicDto = {
    id: 3,
    topic: "Giao thông",
    title: "Tình huống 3",
    summary: "Nội dung đầy đủ 3",
    sourceUrl: officialSource,
  };
  assert.deepEqual(parsePublicShowcases([publicDto]), [publicDto]);
  assert.equal(
    parsePublicShowcases([{ ...publicDto, status: "draft" }]),
    null,
  );
  assert.equal(
    parsePublicShowcases([{ ...publicDto, eligible: true }]),
    null,
  );
});

test("gallery renders all DTO fields in API order with stable item IDs", () => {
  const items = [showcase(30), showcase(10), showcase(20)].map((item) => ({
    id: item.id,
    topic: item.topic,
    title: item.title,
    summary: item.summary,
    sourceUrl: item.sourceUrl,
  }));
  const html = renderToStaticMarkup(
    React.createElement(ShowcaseGallery, {
      state: "ready",
      showcases: items,
    }),
  );

  assert.equal((html.match(/data-showcase-id=/g) ?? []).length, 3);
  assert.ok(html.indexOf("Tình huống 30") < html.indexOf("Tình huống 10"));
  assert.ok(html.indexOf("Tình huống 10") < html.indexOf("Tình huống 20"));
  for (const item of items) {
    assert.match(html, new RegExp(`data-showcase-id="${item.id}"`));
    assert.match(html, new RegExp(item.title));
    assert.match(html, new RegExp(item.summary));
    assert.match(html, new RegExp(item.topic));
  }
  assert.match(html, /target="_blank"/);
  assert.match(html, /rel="noreferrer"/);
  assert.doesNotMatch(html, /showcase-modal/);
});

for (const [state, marker, text] of [
  ["loading", "loading", "Đang tải"],
  ["empty", "empty", "Chưa có tình huống"],
  ["degraded", "degraded", "tạm gián đoạn"],
]) {
  test(`gallery renders distinct ${state} state`, () => {
    const html = renderToStaticMarkup(
      React.createElement(ShowcaseGallery, {
        state,
        showcases: [],
      }),
    );
    assert.match(html, new RegExp(`data-showcase-state="${marker}"`));
    assert.match(html, new RegExp(text));
    assert.doesNotMatch(html, /data-showcase-id=/);
  });
}

test("detail dialog renders the exact selected item with full source fields", () => {
  const selected = {
    id: 10,
    topic: "Mạng xã hội",
    title: "Đúng tình huống được chọn",
    summary: "Toàn bộ nội dung chi tiết của tình huống được chọn.",
    sourceUrl: "https://chinhphu.vn/nguon-chinh-thuc",
  };
  const html = renderToStaticMarkup(
    React.createElement(ShowcaseDialog, {
      item: selected,
      onClose() {},
    }),
  );

  assert.match(html, /role="dialog"/);
  assert.match(html, /aria-modal="true"/);
  assert.match(html, /Đúng tình huống được chọn/);
  assert.match(html, /Toàn bộ nội dung chi tiết/);
  assert.match(html, /Mạng xã hội/);
  assert.match(html, /https:\/\/chinhphu\.vn\/nguon-chinh-thuc/);
  assert.match(html, /aria-label="Đóng tình huống"/);
  assert.doesNotMatch(html, /Tình huống 30/);
});

test("dialog reducer opens the exact item and closes from button or Escape action", () => {
  const item = projectPublishedShowcases([showcase(8)])[0];
  const opened = showcaseDialogReducer(
    { selected: null },
    { type: "open", item },
  );
  assert.equal(opened.selected?.id, 8);
  assert.equal(
    showcaseDialogReducer(opened, { type: "close" }).selected,
    null,
  );
});

test("Escape closes, Tab traps focus and close restores the trigger", () => {
  let prevented = 0;
  let closed = 0;
  let firstFocused = 0;
  let lastFocused = 0;
  let triggerFocused = 0;
  const first = { focus: () => firstFocused++ };
  const last = { focus: () => lastFocused++ };
  const dialog = {
    querySelectorAll() {
      return [first, last];
    },
  };

  handleShowcaseDialogKeyDown(
    { key: "Escape", preventDefault: () => prevented++ },
    dialog,
    null,
    () => closed++,
  );
  assert.equal(closed, 1);
  assert.equal(prevented, 1);

  handleShowcaseDialogKeyDown(
    { key: "Tab", preventDefault: () => prevented++ },
    dialog,
    last,
    () => closed++,
  );
  assert.equal(firstFocused, 1);

  handleShowcaseDialogKeyDown(
    {
      key: "Tab",
      shiftKey: true,
      preventDefault: () => prevented++,
    },
    dialog,
    first,
    () => closed++,
  );
  assert.equal(lastFocused, 1);

  restoreShowcaseTriggerFocus(
    { focus: () => triggerFocused++ },
    (callback) => callback(),
  );
  assert.equal(triggerFocused, 1);
});

test("focus trap recovers when focus is already outside the dialog", () => {
  let prevented = 0;
  let firstFocused = 0;
  let lastFocused = 0;
  const first = { focus: () => firstFocused++ };
  const last = { focus: () => lastFocused++ };
  const dialog = {
    querySelectorAll() {
      return [first, last];
    },
  };

  handleShowcaseDialogKeyDown(
    { key: "Tab", preventDefault: () => prevented++ },
    dialog,
    {},
    () => {},
  );
  handleShowcaseDialogKeyDown(
    {
      key: "Tab",
      shiftKey: true,
      preventDefault: () => prevented++,
    },
    dialog,
    {},
    () => {},
  );

  assert.equal(prevented, 2);
  assert.equal(firstFocused, 1);
  assert.equal(lastFocused, 1);
});
