import test from "node:test";
import assert from "node:assert/strict";
import { register } from "tsx/esm/api";

const unregisterTsx = register();

const { GET, POST } = await import(
  "../app/admin/api/link-health/route.ts"
);
const { createAdminSession } = await import(
  "../lib/admin-auth.ts"
);

test.after(async () => {
  await unregisterTsx();
});

test("GET /admin/api/link-health tu choi request khong co session admin", async () => {
  const req = new Request("http://localhost/admin/api/link-health", {
    headers: {},
  });
  const res = await GET(req);
  assert.equal(res.status, 401);
  const data = await res.json();
  assert.equal(data.error, "Yêu cầu đăng nhập quản trị.");
});

test("POST /admin/api/link-health tu choi request khong co session admin", async () => {
  const req = new Request("http://localhost/admin/api/link-health", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "scan_all" }),
  });
  const res = await POST(req);
  assert.equal(res.status, 401);
});

test("GET va POST chap nhan request khi co session admin hop le", async () => {
  const session = await createAdminSession().catch(() => null);
  if (!session) {
    // Neu moi truong test chua co secret, bo qua phan co session
    return;
  }

  const cookie = `admin_session=${session.token}`;
  const origin = "http://localhost";

  // Test GET
  const getReq = new Request("http://localhost/admin/api/link-health", {
    headers: {
      cookie,
    },
  });
  const getRes = await GET(getReq);
  assert.equal(getRes.status, 200);
  const getData = await getRes.json();
  assert.equal(getData.ok, true);
  assert.ok(getData.domain);
  assert.ok(getData.summary);
  assert.ok(Array.isArray(getData.links));

  // Test POST check_single với URL an toàn
  const postReq = new Request("http://localhost/admin/api/link-health", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      cookie,
      origin,
    },
    body: JSON.stringify({
      action: "check_single",
      url: "https://vbpl.vn",
    }),
  });
  const postRes = await POST(postReq);
  assert.equal(postRes.status, 200);
  const postData = await postRes.json();
  assert.equal(postData.ok, true);
  assert.ok(postData.result);

  // Test POST action không hợp lệ
  const invalidReq = new Request("http://localhost/admin/api/link-health", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      cookie,
      origin,
    },
    body: JSON.stringify({ action: "unknown_action" }),
  });
  const invalidRes = await POST(invalidReq);
  assert.equal(invalidRes.status, 400);
});
