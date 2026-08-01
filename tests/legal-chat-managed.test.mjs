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

const { buildManagedAnswerSections } = await import("../lib/legal-chat.ts");

const entry = {
  title: "Không đội mũ bảo hiểm khi đi xe máy",
  penalty: "Phạt tiền từ 400.000 đến 600.000 đồng.",
  remedy: "Luôn đội mũ bảo hiểm đạt chuẩn.",
  caseStudy: "Nam 16 tuổi chở bạn đi học, cả hai đều không đội mũ.",
};

const citation = {
  title: "Nghị định 168/2024/NĐ-CP quy định xử phạt vi phạm hành chính...",
  documentNumber: "168/2024/NĐ-CP",
  issuedAt: "2024-12-26",
  article: "7",
  clause: "2",
  point: "h",
  effectiveFrom: "2025-01-01",
  lastVerifiedAt: "2026-07-31T00:00:00Z",
};

test("co citation bon mat: hien muc phat va can cu phap ly", () => {
  const sections = buildManagedAnswerSections(entry, [citation]);
  const kinds = sections.map((section) => section.kind);
  assert.ok(kinds.includes("legal_basis"));
  const flat = JSON.stringify(sections);
  assert.ok(flat.includes("400.000"));
  assert.ok(flat.includes("168/2024/NĐ-CP"));
  assert.ok(!flat.includes("Chưa hiển thị căn cứ và mức xử lý"));
});

test("khong citation: giu nguyen gioi han cu, khong lo muc phat", () => {
  const sections = buildManagedAnswerSections(entry, []);
  const kinds = sections.map((section) => section.kind);
  assert.ok(!kinds.includes("legal_basis"));
  const flat = JSON.stringify(sections);
  assert.ok(!flat.includes("400.000"));
  assert.ok(flat.includes("Chưa hiển thị căn cứ và mức xử lý"));
});

test("entry khong co caseStudy: khong tao section examples", () => {
  const sections = buildManagedAnswerSections(
    { ...entry, caseStudy: "" },
    [citation],
  );
  assert.ok(!sections.map((section) => section.kind).includes("examples"));
});
