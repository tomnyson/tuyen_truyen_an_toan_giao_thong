import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/")) {
      return {
        shortCircuit: true,
        url: new URL(`../${specifier.slice(2)}.ts`, import.meta.url).href,
      };
    }
    if (
      specifier.startsWith(".") &&
      !/\.[a-z]+$/i.test(specifier) &&
      context.parentURL?.endsWith(".ts")
    ) {
      return nextResolve(`${specifier}.ts`, context);
    }
    return nextResolve(specifier, context);
  },
});

const { contentPath, contentShareUrl, readSharedEntity, sharedEntityQuery } =
  await import("../lib/deep-link.ts");

const SITE = "https://tra-cuu.example.vn";

test("duong dan rieng cho tung noi dung", () => {
  assert.equal(contentPath({ type: "law", id: 12 }), "/dieu-luat/12");
  assert.equal(contentPath({ type: "showcase", id: 7 }), "/tinh-huong/7");
});

test("lien ket chia se tro thang toi trang chi tiet", () => {
  assert.equal(
    contentShareUrl(SITE, { type: "law", id: 12 }),
    `${SITE}/dieu-luat/12`,
  );
  assert.equal(
    contentShareUrl(`${SITE}/`, { type: "showcase", id: 7 }),
    `${SITE}/tinh-huong/7`,
  );
});

test("khong co URL goc thi khong dung lien ket", () => {
  assert.equal(contentShareUrl("", { type: "law", id: 12 }), "");
  assert.equal(contentShareUrl("khong-phai-url", { type: "law", id: 12 }), "");
});

test("tham so cu trong URL goc khong bi giu lai", () => {
  assert.equal(
    contentShareUrl(`${SITE}/?tinh-huong=3&utm=abc#doan`, {
      type: "law",
      id: 12,
    }),
    `${SITE}/dieu-luat/12`,
  );
});

test("doc duoc noi dung can mo tu query string", () => {
  assert.deepEqual(readSharedEntity("?dieu-luat=12"), { type: "law", id: 12 });
  assert.deepEqual(readSharedEntity("?tinh-huong=7"), {
    type: "showcase",
    id: 7,
  });
  assert.deepEqual(readSharedEntity("dieu-luat=12"), { type: "law", id: 12 });
});

test("query khong hop le thi khong mo gi ca", () => {
  assert.equal(readSharedEntity(""), null);
  assert.equal(readSharedEntity("?q=mu-bao-hiem"), null);
  assert.equal(readSharedEntity("?dieu-luat=abc"), null);
  assert.equal(readSharedEntity("?dieu-luat=0"), null);
  assert.equal(readSharedEntity("?dieu-luat=-3"), null);
  assert.equal(readSharedEntity("?dieu-luat=1.5"), null);
});

test("dieu luat duoc uu tien khi query co ca hai", () => {
  assert.deepEqual(readSharedEntity("?tinh-huong=7&dieu-luat=12"), {
    type: "law",
    id: 12,
  });
});

test("query dung cho thanh dia chi khi mo hop thoai", () => {
  assert.equal(sharedEntityQuery({ type: "law", id: 12 }), "?dieu-luat=12");
  assert.equal(
    sharedEntityQuery({ type: "showcase", id: 7 }),
    "?tinh-huong=7",
  );
});
