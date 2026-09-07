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
  buildShareTarget,
  shareChannels,
  shareOpenMessage,
  shareOutcomeMessage,
  shareTarget,
} = await import(
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

test("kenh chia se mang xa hoi mang du URL va noi dung", () => {
  const target = buildShareTarget("Không đội mũ bảo hiểm", SITE);
  const channels = shareChannels(target);
  const byId = Object.fromEntries(channels.map((channel) => [channel.id, channel]));

  assert.deepEqual(
    channels.map((channel) => channel.id),
    ["facebook", "zalo", "x", "telegram", "email"],
  );
  for (const channel of channels) {
    assert.ok(channel.label.length > 0, `${channel.id} thieu nhan`);
  }

  const encodedUrl = encodeURIComponent(SITE);
  const encodedText = encodeURIComponent(target.text);
  assert.equal(
    byId.facebook.href,
    `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
  );
  assert.equal(
    byId.zalo.href,
    `https://sp.zalo.me/plugins/share?url=${encodedUrl}`,
  );
  assert.equal(
    byId.x.href,
    `https://x.com/intent/post?url=${encodedUrl}&text=${encodedText}`,
  );
  assert.equal(
    byId.telegram.href,
    `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`,
  );
  assert.match(byId.email.href, /^mailto:\?subject=/);
  assert.ok(byId.email.href.includes(encodedUrl));
});

test("khong co URL thi khong dung kenh mang xa hoi nao", () => {
  assert.deepEqual(shareChannels(buildShareTarget("A", "")), []);
});

test("ky tu dac biet trong tieu de duoc ma hoa", () => {
  const target = buildShareTarget("Vượt đèn đỏ & rẽ phải?", SITE);
  const byId = Object.fromEntries(
    shareChannels(target).map((channel) => [channel.id, channel]),
  );
  assert.ok(!byId.x.href.includes("&text=Vượt"), "text phai duoc encode");
  assert.equal(
    new URL(byId.x.href).searchParams.get("text"),
    target.text,
    "giai ma lai phai ra dung noi dung",
  );
});

test("thong bao khi mo mot mang xa hoi", () => {
  assert.match(shareOpenMessage("Facebook"), /Facebook/);
});
