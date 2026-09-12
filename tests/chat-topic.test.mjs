import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";

globalThis.__workerEnvStub ??= {};
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "cloudflare:workers") {
      return {
        shortCircuit: true,
        url: "data:text/javascript,globalThis.__workerEnvStub ??= {}; export const env = globalThis.__workerEnvStub;",
      };
    }
    if (specifier === "next/server") {
      return {
        shortCircuit: true,
        url: "data:text/javascript,export const NextResponse = { json: (body, init) => Response.json(body, init) };",
      };
    }
    if (specifier === "@/db") {
      return {
        shortCircuit: true,
        url: new URL("../db/index.ts", import.meta.url).href,
      };
    }
    if (specifier.startsWith("@/")) {
      const suffix = specifier.endsWith(".json") ? "" : ".ts";
      return {
        shortCircuit: true,
        url: new URL(`../${specifier.slice(2)}${suffix}`, import.meta.url).href,
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

const { createChatHandler } = await import("../app/api/chat/route.ts");

const allowAll = () => ({
  consumeChat: async () => ({ allowed: true, status: 200, retryAfter: 0 }),
});
const silentTelemetry = { emit() {} };

function ask(question) {
  return new Request("https://x.test/api/chat", {
    method: "POST",
    body: JSON.stringify({ messages: [{ role: "user", content: question }] }),
  });
}

test("cau tra loi tu kho co kem linh vuc", async () => {
  const handler = createChatHandler({
    limiter: allowAll,
    telemetry: silentTelemetry,
    groundedAnswer: async () => ({ ok: false, code: "NO_MATCH" }),
    managedAnswer: async () => "Bạn phải đội mũ bảo hiểm khi đi xe máy điện.",
    curatedAnswer: () => null,
  });
  const response = await handler(
    ask("Không đội mũ bảo hiểm khi đi xe máy điện bị phạt bao nhiêu?"),
  );
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.topic, "Giao thông");
});

test("cau hoi khong thuoc linh vuc nao thi topic la null", async () => {
  const handler = createChatHandler({
    limiter: allowAll,
    telemetry: silentTelemetry,
    groundedAnswer: async () => ({ ok: false, code: "NO_MATCH" }),
    managedAnswer: async () => "Trả lời chung.",
    curatedAnswer: () => null,
  });
  const response = await handler(ask("abc xyz qwerty"));
  const body = await response.json();
  assert.equal(body.topic, null);
});

test("cau tra loi khong kha dung van kem linh vuc de goi y co quan", async () => {
  const handler = createChatHandler({
    limiter: allowAll,
    telemetry: silentTelemetry,
    groundedAnswer: async () => ({ ok: false, code: "NO_MATCH" }),
    managedAnswer: async () => null,
    curatedAnswer: () => null,
    webSearch: async () => ({ ok: false, code: "DISABLED" }),
    referenceWebSearch: async () => ({ ok: false, code: "DISABLED" }),
    reviewedWebAnswer: async () => ({ ok: false, code: "DISABLED" }),
  });
  const response = await handler(
    ask("Bị bạn cùng lớp đánh trong trường thì báo ai?"),
  );
  const body = await response.json();
  assert.equal(body.mode, "unavailable");
  assert.equal(body.topic, "Bạo lực học đường");
});

test("cau hoi rong van tra 400 va khong co topic", async () => {
  const handler = createChatHandler({
    limiter: allowAll,
    telemetry: silentTelemetry,
  });
  const response = await handler(ask("   "));
  assert.equal(response.status, 400);
  const body = await response.json();
  assert.equal(body.topic, undefined);
});
