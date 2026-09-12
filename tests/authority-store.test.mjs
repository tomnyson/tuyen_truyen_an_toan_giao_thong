import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";

registerHooks({
  resolve(specifier, context, nextResolve) {
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

const { buildReferralPayload, createAuthorityHandler, parseAuthorityRows } =
  await import("../lib/authority-store.ts");

const row = (overrides) => ({
  id: 1,
  name: "Công an phường Thắng Lợi",
  level: "xa_phuong",
  topics: '["An ninh trật tự"]',
  scope: "Phường Thắng Lợi",
  address: "01 Lê Duẩn",
  phone: "02623 000 000",
  hotline: "",
  note: "",
  ...overrides,
});

test("hang du lieu hong bi loai thay vi lam sap route", () => {
  const parsed = parseAuthorityRows([
    row(),
    row({ id: 2, level: "quan_huyen" }),
    row({ id: 3, name: "   " }),
    row({ id: "khong-phai-so" }),
    row({ id: 5, topics: null, phone: null, note: undefined }),
  ]);
  assert.deepEqual(
    parsed.map((item) => item.id),
    [1, 5],
  );
  assert.deepEqual(parsed[0].topics, ["An ninh trật tự"]);
  // Cột rỗng phải thành chuỗi rỗng, không phải null lọt xuống UI.
  assert.equal(parsed[1].phone, "");
  assert.equal(parsed[1].note, "");
});

test("khong co du lieu thi dung chuoi du phong va bao degraded", () => {
  const payload = buildReferralPayload(null, "Giao thông");
  assert.equal(payload.degraded, true);
  assert.equal(payload.topic, "Giao thông");
  assert.ok(payload.chain.length >= 1);

  const empty = buildReferralPayload([], null);
  assert.equal(empty.degraded, true);
  assert.ok(empty.chain.length >= 1);
});

test("co du lieu that thi khong degraded", () => {
  const payload = buildReferralPayload([row()], "An ninh trật tự");
  assert.equal(payload.degraded, false);
  assert.equal(payload.chain[0].authority.name, "Công an phường Thắng Lợi");
  assert.equal(payload.chain[0].badge, "02623 000 000");
});

test("linh vuc khong hop le bi tu choi bang 400", async () => {
  const handler = createAuthorityHandler(async () => [row()]);
  const response = await handler(
    new Request("https://x.test/api/co-quan?topic=Khong+co+that"),
  );
  assert.equal(response.status, 400);
  assert.equal((await response.json()).error, "INVALID_TOPIC");
});

test("route tra ve chuoi va khong cho cache", async () => {
  const handler = createAuthorityHandler(async () => [row()]);
  const response = await handler(
    new Request("https://x.test/api/co-quan?topic=An%20ninh%20tr%E1%BA%ADt%20t%E1%BB%B1"),
  );
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  const body = await response.json();
  assert.equal(body.topic, "An ninh trật tự");
  assert.equal(body.degraded, false);
  assert.equal(body.chain.length, 1);
});

test("DB hong van tra 200 kem chuoi du phong", async () => {
  const handler = createAuthorityHandler(async () => {
    throw new Error("connection refused");
  });
  const response = await handler(new Request("https://x.test/api/co-quan"));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.degraded, true);
  assert.ok(body.chain.length >= 1);
  assert.equal(body.topic, null);
});
