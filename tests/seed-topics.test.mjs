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

const { PGlite } = await import("@electric-sql/pglite");
const { drizzle } = await import("drizzle-orm/pglite");
const { bootstrapLegalDatabase } = await import("../db/index.ts");
const { seedTopicsToDatabase } = await import("../scripts/seed-topics.mjs");
const { listAllTopicsForAdmin } = await import("../lib/topic-store.ts");

test("seedTopicsToDatabase seeds 5 baseline topics into DB and is idempotent", async () => {
  const client = new PGlite();
  const db = drizzle(client);
  await bootstrapLegalDatabase(db);

  // Chạy seed lần 1
  const result1 = await seedTopicsToDatabase(db);
  assert.equal(result1.seededCount, 10);

  const all1 = await listAllTopicsForAdmin(db);
  assert.equal(all1.length, 10);
  const names1 = all1.map((t) => t.name);
  assert.equal(names1.includes("Giao thông"), true);
  assert.equal(names1.includes("Mạng xã hội"), true);
  assert.equal(names1.includes("Bạo lực học đường"), true);
  assert.equal(names1.includes("An ninh trật tự"), true);
  assert.equal(names1.includes("Sở hữu trí tuệ"), true);
  assert.equal(names1.includes("Chuyên đề phòng chống ma túy"), true);
  assert.equal(names1.includes("Chuyên đề an ninh trật tự trường học"), true);
  assert.equal(names1.includes("Chuyên đề game và không gian mạng"), true);
  assert.equal(names1.includes("Tài chính - tín dụng đen"), true);
  assert.equal(names1.includes("Phòng chống tệ nạn xã hội"), true);

  // Chạy seed lần 2 (idempotent, không nhân bản)
  const result2 = await seedTopicsToDatabase(db);
  assert.equal(result2.seededCount, 10);

  const all2 = await listAllTopicsForAdmin(db);
  assert.equal(all2.length, 10);
});
