import assert from "node:assert/strict";
import { register } from "node:module";
import test from "node:test";

register("tsx/esm/api", import.meta.url);

const {
  authorityBadge,
  authorityLevelLabel,
  authorityLevels,
  buildReferralChain,
  fallbackReferralAuthorities,
  isAuthorityLevel,
  parseAuthorityTopics,
} = await import("../lib/authority-referral.ts");

const make = (overrides) => ({
  id: 1,
  name: "Cơ quan",
  level: "tinh",
  topics: [],
  scope: "",
  address: "",
  phone: "",
  hotline: "",
  note: "",
  ...overrides,
});

test("nhan cap duoc viet bang tieng Viet co dau", () => {
  assert.equal(authorityLevelLabel("truong"), "Nhà trường");
  assert.equal(authorityLevelLabel("xa_phuong"), "Xã / phường");
  assert.equal(authorityLevelLabel("huyen"), "Cấp huyện");
  assert.equal(authorityLevelLabel("tinh"), "Cấp tỉnh");
  assert.equal(authorityLevelLabel("trung_uong"), "Trung ương");
  assert.equal(authorityLevels.length, 5);
  assert.ok(isAuthorityLevel("tinh"));
  assert.ok(!isAuthorityLevel("quan_huyen"));
  assert.ok(!isAuthorityLevel(null));
});

test("parseAuthorityTopics chi giu linh vuc hop le", () => {
  assert.deepEqual(parseAuthorityTopics('["Giao thông","Không có thật"]'), [
    "Giao thông",
  ]);
  assert.deepEqual(parseAuthorityTopics(["Mạng xã hội", 7]), ["Mạng xã hội"]);
  assert.deepEqual(parseAuthorityTopics("khong-phai-json"), []);
  assert.deepEqual(parseAuthorityTopics(null), []);
  assert.deepEqual(parseAuthorityTopics('{"a":1}'), []);
  // Không nhân bản khi dữ liệu lặp.
  assert.deepEqual(parseAuthorityTopics('["Giao thông","Giao thông"]'), [
    "Giao thông",
  ]);
});

test("chuoi chuyen tiep di tu gan den xa, moi cap mot dau moi", () => {
  const chain = buildReferralChain(
    [
      make({ id: 1, name: "Tỉnh chung", level: "tinh" }),
      make({ id: 2, name: "Trường", level: "truong" }),
      make({ id: 3, name: "Công an xã", level: "xa_phuong" }),
    ],
    null,
  );
  assert.deepEqual(
    chain.map((step) => step.authority.name),
    ["Trường", "Công an xã", "Tỉnh chung"],
  );
  assert.deepEqual(
    chain.map((step) => step.order),
    [1, 2, 3],
  );
  assert.equal(chain[0].levelLabel, "Nhà trường");
});

test("dau moi dung linh vuc duoc uu tien hon dau moi chung", () => {
  const chain = buildReferralChain(
    [
      make({ id: 1, name: "Đầu mối chung tỉnh", level: "tinh" }),
      make({
        id: 2,
        name: "Phòng CSGT tỉnh",
        level: "tinh",
        topics: ["Giao thông"],
      }),
    ],
    "Giao thông",
  );
  assert.equal(chain.length, 1);
  assert.equal(chain[0].authority.name, "Phòng CSGT tỉnh");
});

test("dau moi cua linh vuc khac bi loai bo", () => {
  const chain = buildReferralChain(
    [
      make({ id: 1, name: "Chỉ mạng xã hội", level: "tinh", topics: ["Mạng xã hội"] }),
    ],
    "Giao thông",
  );
  assert.deepEqual(chain, []);
});

test("huy hieu uu tien duong day nong, roi den dien thoai, roi den cap", () => {
  assert.equal(authorityBadge(make({ hotline: "111", phone: "0262..." })), "111");
  assert.equal(authorityBadge(make({ phone: "02623 000 000" })), "02623 000 000");
  assert.equal(authorityBadge(make({ level: "xa_phuong" })), "Xã / phường");
});

test("du phong giu dung ba dau moi da xac minh cua trang chu", () => {
  assert.equal(fallbackReferralAuthorities.length, 3);
  const chain = buildReferralChain(fallbackReferralAuthorities, null);
  assert.equal(chain.length, 3);
  // Thứ tự theo cấp: xã/phường → tỉnh → trung ương, tức gần trước, xa sau.
  assert.deepEqual(
    chain.map((step) => step.badge),
    ["113", "TGPL", "111"],
  );
  assert.ok(chain[1].authority.name.includes("Trợ giúp pháp lý"));
  // DEC-022: không có số máy nào do AI sinh — mọi mục đều có ghi chú nguồn.
  for (const authority of fallbackReferralAuthorities) {
    assert.ok(authority.note.length > 0);
  }
});
