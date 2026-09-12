import assert from "node:assert/strict";
import test from "node:test";
import { register } from "tsx/esm/api";

const unregisterTsx = register();
const {
  disclosureFor,
  disclosureLevels,
  reviewedDisclosure,
  unverifiedDisclosure,
  unverifiedOfficialSourceWarning,
  unverifiedReferenceSourceWarning,
} = await import("../lib/ai-disclosure.ts");
const { answerOrigins } = await import("../lib/answer-origin.ts");
const { WEB_SEARCH_WARNING, REFERENCE_SEARCH_WARNING } = await import(
  "../lib/openai-web-search.ts"
);
const { publicSourceUiCopy } = await import("../lib/official-source-url.ts");

test.after(async () => {
  await unregisterTsx();
});

test("moi nguon tra loi deu co mot muc khuyen cao", () => {
  for (const origin of answerOrigins) {
    const disclosure = disclosureFor(origin);
    assert.ok(disclosureLevels.includes(disclosure.level));
    assert.ok(disclosure.title.length > 0);
    assert.ok(disclosure.body.length > 0);
    assert.ok(disclosure.actionLabel.length > 0);
  }
});

test("chi nhanh tra cuu truc tiep bi danh dau chua kiem duyet", () => {
  assert.equal(disclosureFor("live_web").level, "unverified");
  assert.equal(disclosureFor("library").level, "reviewed");
  assert.equal(disclosureFor("grounded_library").level, "reviewed");
  assert.equal(disclosureFor("reviewed_web").level, "reviewed");
  // Không biết nguồn thì vẫn phải có khuyến cáo, mức thận trọng mặc định.
  assert.equal(disclosureFor(null).level, "reviewed");
});

test("cau khuyen cao noi ro khong bao dam va khong la can cu phap ly", () => {
  assert.match(unverifiedDisclosure.body, /không bảo đảm chính xác 100%/);
  assert.match(unverifiedDisclosure.body, /không dùng làm căn cứ pháp lý/);
  assert.match(reviewedDisclosure.body, /đối chiếu/);
});

test("khuyen cao la object dong bang nen khong noi nao sua duoc cau chu", () => {
  assert.ok(Object.isFrozen(reviewedDisclosure));
  assert.ok(Object.isFrozen(unverifiedDisclosure));
});

test("cac module khac lay cau chu tu day chu khong tu viet lai", () => {
  assert.equal(WEB_SEARCH_WARNING, unverifiedOfficialSourceWarning);
  assert.equal(REFERENCE_SEARCH_WARNING, unverifiedReferenceSourceWarning);
  assert.equal(
    publicSourceUiCopy("reference", true).warningTitle,
    unverifiedDisclosure.title,
  );
  assert.equal(
    publicSourceUiCopy("official", true).warningTitle,
    unverifiedDisclosure.title,
  );
});
