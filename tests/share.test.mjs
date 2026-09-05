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

const { buildShareTarget, shareOutcomeMessage, shareTarget } = await import(
  "../lib/share.ts"
);
const { brandName } = await import("../lib/brand.ts");

const SITE = "https://tra-cuu.example.vn";

test("noi dung chia se gom tieu de va ten san pham", () => {
  const target = buildShareTarget("  Không đội mũ bảo hiểm  ", SITE);
  assert.equal(target.title, "Không đội mũ bảo hiểm");
  assert.equal(target.text, `Không đội mũ bảo hiểm — ${brandName}`);
  assert.equal(target.url, SITE);

  const fallback = buildShareTarget("   ", SITE);
  assert.equal(fallback.title, brandName);
  assert.equal(fallback.text, brandName);
});

test("uu tien Web Share API", async () => {
  const shared = [];
  const outcome = await shareTarget(buildShareTarget("Tiêu đề", SITE), {
    share: async (target) => {
      shared.push(target);
    },
    copy: async () => assert.fail("khong duoc dung clipboard khi da chia se"),
  });
  assert.equal(outcome, "shared");
  assert.equal(shared.length, 1);
  assert.equal(shared[0].url, SITE);
});

test("khong co Web Share thi sao chep lien ket", async () => {
  const copied = [];
  const outcome = await shareTarget(buildShareTarget("Tiêu đề", SITE), {
    copy: async (value) => {
      copied.push(value);
    },
  });
  assert.equal(outcome, "copied");
  assert.deepEqual(copied, [SITE]);
});

test("nguoi dung dong bang chia se khong bi coi la loi", async () => {
  const abort = new Error("cancelled");
  abort.name = "AbortError";
  let copiedCount = 0;
  const outcome = await shareTarget(buildShareTarget("Tiêu đề", SITE), {
    share: async () => {
      throw abort;
    },
    copy: async () => {
      copiedCount += 1;
    },
  });
  assert.equal(outcome, "cancelled");
  assert.equal(copiedCount, 0, "khong sao chep sau khi nguoi dung huy");
  assert.equal(shareOutcomeMessage("cancelled"), "");
});

test("Web Share loi thuc su thi lui ve sao chep", async () => {
  const outcome = await shareTarget(buildShareTarget("Tiêu đề", SITE), {
    share: async () => {
      throw new Error("NotAllowedError");
    },
    copy: async () => undefined,
  });
  assert.equal(outcome, "copied");
});

test("khong co kenh chia se nao thi bao khong ho tro", async () => {
  assert.equal(await shareTarget(buildShareTarget("A", SITE), {}), "unavailable");
  assert.equal(
    await shareTarget(buildShareTarget("A", ""), {
      copy: async () => undefined,
    }),
    "unavailable",
    "khong co URL thi khong sao chep chuoi rong",
  );
  assert.equal(
    await shareTarget(buildShareTarget("A", SITE), {
      copy: async () => {
        throw new Error("clipboard bi chan");
      },
    }),
    "unavailable",
  );
  assert.match(shareOutcomeMessage("unavailable"), /sao chép liên kết/);
});
