import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";

function createD1Mock() {
  const buckets = new Map();
  const penalties = new Map();
  let stateVersion = 0;
  const nextStateVersion = () => (++stateVersion).toString(16).padStart(32, "0");

  function statement(query, values = []) {
    return {
      query,
      values,
      bind(...nextValues) {
        return statement(query, nextValues);
      },
      async all() {
        return { success: true, results: [] };
      },
      async first() {
        return null;
      },
      async run() {
        return { success: true, results: [] };
      },
    };
  }

  function execute({ query, values }) {
    if (/DELETE FROM rate_limit_buckets/i.test(query)) {
      for (const [key, value] of buckets) {
        if (value.expires_at <= values[0]) buckets.delete(key);
      }
      return [];
    }
    if (/DELETE FROM rate_limit_penalties/i.test(query)) {
      for (const [key, value] of penalties) {
        if (value.expires_at <= values[0]) penalties.delete(key);
      }
      return [];
    }
    if (/INSERT INTO rate_limit_buckets/i.test(query)) {
      const [scope, keyHash, windowStart, expiresAt, cap] = values;
      const key = `${scope}:${keyHash}:${windowStart}`;
      const current = buckets.get(key);
      const value = {
        request_count: Math.min((current?.request_count ?? 0) + 1, cap),
        expires_at: expiresAt,
      };
      buckets.set(key, value);
      return [{ request_count: value.request_count }];
    }
    if (/SELECT request_count[\s\S]+FROM rate_limit_buckets/i.test(query)) {
      const [scope, keyHash, windowStart] = values;
      const value = buckets.get(`${scope}:${keyHash}:${windowStart}`);
      return value ? [{ request_count: value.request_count }] : [];
    }
    if (/SELECT consecutive_failures, blocked_until/i.test(query)) {
      const [scope, keyHash, windowStart] = values;
      const value = penalties.get(`${scope}:${keyHash}`);
      return value?.window_start === windowStart ? [value] : [];
    }
    if (/INSERT INTO rate_limit_penalties/i.test(query)) {
      const [scope, keyHash, windowStart, expiresAt, windowEnd, fourthBlock, thirdBlock] = values;
      const key = `${scope}:${keyHash}`;
      const current = penalties.get(key);
      const failures =
        current?.window_start === windowStart
          ? Math.min(current.consecutive_failures + 1, 5)
          : 1;
      const value = {
        window_start: windowStart,
        consecutive_failures: failures,
        blocked_until:
          failures >= 5 ? windowEnd : failures === 4 ? fourthBlock : failures === 3 ? thirdBlock : 0,
        state_version: nextStateVersion(),
        expires_at: expiresAt,
      };
      penalties.set(key, value);
      return [{
        consecutive_failures: failures,
        blocked_until: value.blocked_until,
        state_version: value.state_version,
      }];
    }
    if (/UPDATE rate_limit_penalties/i.test(query)) {
      const [scope, keyHash, windowStart, stateVersion] = values;
      const key = `${scope}:${keyHash}`;
      const current = penalties.get(key);
      if (
        current?.window_start === windowStart &&
        current.state_version === stateVersion
      ) {
        current.consecutive_failures = 0;
        current.blocked_until = 0;
        current.state_version = nextStateVersion();
        return [{ state_version: current.state_version }];
      }
      return [];
    }
    return [];
  }

  return {
    prepare(query) {
      return statement(query);
    },
    async batch(statements) {
      return statements.map((item) => ({ success: true, results: execute(item) }));
    },
  };
}

const workerEnv = {
  ADMIN_USERNAME: "admin",
  ADMIN_PASSWORD_HASH:
    "v1$pbkdf2-sha256$600000$AAECAwQFBgcICQoLDA0ODw$mh0FvdOLp8VMUZ6wViUAazeYRmrnaBisZZF2AE9PVbA",
  ADMIN_SESSION_SECRET: "test-session-secret-at-least-32-characters-long",
  RATE_LIMIT_KEY_SECRET: "test-rate-limit-secret-at-least-32-characters",
  DB: createD1Mock(),
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
  const headers = new Headers(init?.headers);
  if (!headers.has("cf-connecting-ip")) {
    headers.set("cf-connecting-ip", "203.0.113.10");
  }
  return worker.fetch(
    new Request(`http://localhost${pathname}`, { ...init, headers }),
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
    body: JSON.stringify({ username: "admin", password: "test-admin-password-strong" }),
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
  assert.doesNotMatch(html, /Nghị định 15\/2020\/NĐ-CP/);
  assert.doesNotMatch(html, /5\s*[–-]\s*10 triệu đồng/i);
  assert.match(html, /Chưa công bố mức tham khảo/);
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
  assert.match(body.answer, /400\.000 đồng đến 600\.000 đồng/);
  assert.match(body.answer, /168\/2024\/NĐ-CP — Quy định xử phạt/);
  assert.deepEqual(
    body.sections.map((section) => section.kind),
    [
      "summary",
      "details",
      "examples",
      "legal_basis",
      "sanctions",
      "next_steps",
      "limitations",
    ],
  );
  assert.match(
    body.sections.find((section) => section.kind === "legal_basis")
      .paragraphs[0],
    /Ban hành ngày 26\/12\/2024.*Có hiệu lực từ 01\/01\/2025.*Kiểm tra gần nhất 31\/07\/2026/,
  );
  assert.match(
    body.sections.find((section) => section.kind === "sanctions")
      .paragraphs[0],
    /Phạt tiền từ 400\.000 đồng đến 600\.000 đồng.*Đối tượng tham khảo/,
  );
  assert.deepEqual(body.sources, [
    {
      title:
        "168/2024/NĐ-CP — Quy định xử phạt vi phạm hành chính về trật tự, an toàn giao thông trong lĩnh vực giao thông đường bộ; trừ điểm, phục hồi điểm giấy phép lái xe",
      url: "https://vbpl.vn/tw/Pages/ivbpq-thuoctinh.aspx?ItemID=173920",
    },
  ]);
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
