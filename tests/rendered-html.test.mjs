import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";

const workerEnv = {
  ADMIN_USERNAME: "admin",
  ADMIN_PASSWORD: "admin",
  ADMIN_SESSION_SECRET: "test-session-secret-at-least-32-characters-long",
  ASSETS: {
    fetch: async () => new Response("Not found", { status: 404 }),
  },
};

delete process.env.OPENAI_API_KEY;
delete process.env.AI_GATEWAY_API_KEY;
delete process.env.VERCEL_OIDC_TOKEN;

globalThis.__lawSchoolWorkerEnv = workerEnv;
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "cloudflare:workers") {
      return {
        shortCircuit: true,
        url: "data:text/javascript,export const env = globalThis.__lawSchoolWorkerEnv",
      };
    }
    return nextResolve(specifier, context);
  },
});

const workerUrl = new URL("../dist/server/index.js", import.meta.url);
workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
const { default: worker } = await import(workerUrl.href);

const executionContext = {
  waitUntil() {},
  passThroughOnException() {},
};

function request(pathname, init) {
  return worker.fetch(
    new Request(`http://localhost${pathname}`, init),
    workerEnv,
    executionContext,
  );
}

function chatRequest(content) {
  return request("/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ messages: [{ role: "user", content }] }),
  });
}

async function validAdminCookie() {
  const response = await request("/admin/api/login", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "http://localhost" },
    body: JSON.stringify({ username: "admin", password: "admin" }),
  });
  assert.equal(response.status, 200);
  const header = response.headers.get("set-cookie");
  assert.match(header ?? "", /law_school_admin=/);
  return { header, value: header.split(";", 1)[0] };
}

test("server-renders the student law portal", async () => {
  const response = await request("/");

  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Luật Học Đường \| Tra cứu pháp luật dành cho học sinh<\/title>/i);
  assert.match(html, /Hiểu luật dễ dàng/);
  assert.match(html, /Không đội mũ bảo hiểm/);
  assert.match(html, /Hỏi trợ lý/);
  assert.doesNotMatch(html, /Nghị định 131\/2013\/NĐ-CP/);
  assert.doesNotMatch(html, /Sao chép tác phẩm trái phép, đạo văn/);
  assert.doesNotMatch(html, /Cố ý vô hiệu biện pháp bảo vệ phần mềm/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton|Your site is taking shape/i);
});

test("redirects anonymous visitors away from the admin dashboard", async () => {
  const response = await request("/admin", { redirect: "manual" });

  assert.ok([302, 303, 307, 308].includes(response.status));
  assert.equal(new URL(response.headers.get("location"), "http://localhost").pathname, "/admin/login");
});

test("defers password-manager targets until after hydration", async () => {
  const response = await request("/admin/login");
  const html = await response.text();

  assert.equal(response.status, 200);
  assert.match(html, /Đang mở trang quản trị/);
  assert.doesNotMatch(html, /autoComplete="(?:username|current-password)"/);
});

test("rejects invalid admin credentials", async () => {
  const response = await request("/admin/api/login", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "http://localhost" },
    body: JSON.stringify({ username: "admin", password: "wrong" }),
  });

  assert.equal(response.status, 401);
  assert.equal(response.headers.get("set-cookie"), null);
});

test("creates a protected admin session with valid credentials", async () => {
  const cookie = await validAdminCookie();
  assert.match(cookie.header, /HttpOnly/i);
  assert.match(cookie.header, /SameSite=Strict/i);

  const adminResponse = await request("/admin", {
    headers: { cookie: cookie.value },
    redirect: "manual",
  });
  assert.equal(adminResponse.status, 200);
  assert.match(await adminResponse.text(), /Quản lý kho nội dung/);
});

test("rejects publishing an expired copyright basis before database access", async () => {
  const cookie = await validAdminCookie();
  const response = await request("/admin/api/content", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: cookie.value,
      origin: "http://localhost",
    },
    body: JSON.stringify({
      entity: "law",
      topic: "Sở hữu trí tuệ",
      icon: "©",
      title: "Nội dung chờ rà soát",
      legalBasis: "Nghị định số 131 / 2013 / NĐ–CP",
      penalty: "Chưa công bố",
      remedy: "Kiểm tra nguồn đang hiệu lực.",
      caseStudy: "Tình huống chỉ dùng để kiểm tra bộ chặn.",
      tags: "ban-quyen",
      status: "published",
    }),
  });
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.match(body.error, /hết hiệu lực/);
});

test("answers a published knowledge question without AI", async () => {
  const response = await chatRequest("Không đội mũ bảo hiểm bị phạt thế nào?");
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.mode, "knowledge");
  assert.match(body.answer, /400\.000–600\.000 đồng/);
  assert.match(body.answer, /Nghị định 168\/2024\/NĐ-CP/);
  assert.doesNotMatch(body.answer, /131\/2013|341\/2025/i);
});

for (const [question, expectedAnswer] of [
  ["Đăng lại bài chưa kiểm chứng có sao không?", /chia sẻ lại thông tin sai sự thật/],
  ["Em 15 tuổi đi xe 50cc được không?", /Độ tuổi và thông số thực tế/],
]) {
  test(`answers published topic: ${question}`, async () => {
    const response = await chatRequest(question);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.mode, "knowledge");
    assert.match(body.answer, expectedAnswer);
    assert.doesNotMatch(body.answer, /131\/2013|341\/2025/i);
  });
}

for (const question of [
  "Đạo văn có vi phạm không?",
  "Vi phạm bản quyền phần mềm bị phạt thế nào?",
]) {
  test(`fails closed for copyright content awaiting legal review: ${question}`, async () => {
    const response = await chatRequest(question);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.mode, "unavailable");
    assert.doesNotMatch(body.answer, /131\/2013|341\/2025/i);
  });
}

test("does not call an ungrounded AI provider when credentials exist", async () => {
  const originalFetch = globalThis.fetch;
  let providerCalled = false;
  process.env.OPENAI_API_KEY = "test-only-key";
  globalThis.fetch = async () => {
    providerCalled = true;
    throw new Error("The provider must not be called without retrieved evidence.");
  };

  try {
    const response = await chatRequest("Bản quyền phần mềm cần lưu ý gì?");
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.mode, "unavailable");
    assert.doesNotMatch(body.answer, /131\/2013|341\/2025/i);
  } finally {
    globalThis.fetch = originalFetch;
    delete process.env.OPENAI_API_KEY;
  }

  assert.equal(providerCalled, false);
});

test("fails closed when a question is outside published knowledge", async () => {
  const response = await chatRequest("Em ký hợp đồng làm thêm cuối tuần có được không?");
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.mode, "unavailable");
  assert.match(body.answer, /chưa có trong dữ liệu/);
});

test("rejects an empty chat request", async () => {
  const response = await request("/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ messages: [] }),
  });
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.match(body.error, /nhập một câu hỏi/);
});

test("rejects malformed chat messages", async () => {
  const response = await request("/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ messages: [{ role: "system", content: 42 }] }),
  });

  assert.equal(response.status, 400);
});
