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

const {
  contentMetaDescription,
  contentMetaTitle,
  parseContentRouteId,
  socialImageUrl,
} = await import("../lib/content-meta.ts");
const { brandName } = await import("../lib/brand.ts");

test("tieu de chia se gom noi dung va ten san pham", () => {
  assert.equal(
    contentMetaTitle("  Không đội mũ bảo hiểm  "),
    `Không đội mũ bảo hiểm | ${brandName}`,
  );
  assert.equal(contentMetaTitle("   "), brandName);
});

test("mo ta gop cac phan co noi dung, bo phan rong", () => {
  assert.equal(
    contentMetaDescription([
      "Điều 7 Nghị định 168/2024/NĐ-CP",
      "",
      "  Phạt 400.000 – 600.000đ  ",
    ]),
    "Điều 7 Nghị định 168/2024/NĐ-CP · Phạt 400.000 – 600.000đ",
  );
});

test("mo ta qua dai bi cat gon co dau ba cham", () => {
  const long = "a".repeat(400);
  const description = contentMetaDescription([long]);
  assert.ok(description.length <= 200, "mo ta phai gon cho the OG");
  assert.ok(description.endsWith("…"), "phai bao hieu con noi dung phia sau");
});

test("khong co du lieu thi lui ve mo ta san pham", () => {
  assert.ok(contentMetaDescription([]).length > 0);
  assert.ok(contentMetaDescription(["  ", ""]).length > 0);
});

test("anh chia se dung ve host dang phuc vu", () => {
  assert.equal(
    socialImageUrl("tra-cuu.example.vn", "https"),
    "https://tra-cuu.example.vn/og.png",
  );
  assert.equal(
    socialImageUrl("localhost:3004", null),
    "http://localhost:3004/og.png",
  );
});

test("id tren duong dan phai la so nguyen duong", () => {
  assert.equal(parseContentRouteId("12"), 12);
  assert.equal(parseContentRouteId("0"), null);
  assert.equal(parseContentRouteId("-3"), null);
  assert.equal(parseContentRouteId("1.5"), null);
  assert.equal(parseContentRouteId("abc"), null);
  assert.equal(parseContentRouteId("12abc"), null);
  assert.equal(parseContentRouteId(undefined), null);
});
