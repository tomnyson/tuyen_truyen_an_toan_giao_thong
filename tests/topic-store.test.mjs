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
const {
  getActiveTopicDefinitions,
  listAllTopicsForAdmin,
  createTopicRecord,
  updateTopicRecord,
  deleteTopicRecord,
  seedDefaultTopics,
} = await import("../lib/topic-store.ts");
const { contentTopics: baselineTopics } = await import("../lib/topics.ts");

test("getActiveTopicDefinitions falls back to baseline topics when table is empty", async () => {
  const client = new PGlite();
  const db = drizzle(client);
  await bootstrapLegalDatabase(db);

  const topics = await getActiveTopicDefinitions(db);
  assert.equal(topics.length, baselineTopics.length);
  assert.equal(topics[0].name, baselineTopics[0].name);
});

test("createTopicRecord inserts a new topic and getActiveTopicDefinitions includes it", async () => {
  const client = new PGlite();
  const db = drizzle(client);
  await bootstrapLegalDatabase(db);

  const created = await createTopicRecord(
    {
      name: "Phòng chống ma túy",
      icon: "✦",
      detail: "Tác hại ma túy học đường",
      abbreviations: ["pcmt"],
      keywords: ["ma tuy", "chat cam", "bong cuoi"],
      situations: ["Bi ban ru hut thu thi lam gi?"],
      displayOrder: 10,
      status: "published",
    },
    db
  );

  assert.equal(created.name, "Phòng chống ma túy");
  assert.equal(created.icon, "✦");
  assert.deepEqual(created.abbreviations, ["pcmt"]);

  const all = await listAllTopicsForAdmin(db);
  assert.equal(all.length, 1);
  assert.equal(all[0].name, "Phòng chống ma túy");

  const active = await getActiveTopicDefinitions(db);
  assert.equal(active.some((t) => t.name === "Phòng chống ma túy"), true);
});

test("updateTopicRecord modifies fields and deleteTopicRecord removes topic", async () => {
  const client = new PGlite();
  const db = drizzle(client);
  await bootstrapLegalDatabase(db);

  const created = await createTopicRecord(
    {
      name: "Chủ đề A",
      icon: "A",
      detail: "Chi tiết A",
      abbreviations: [],
      keywords: [],
      situations: [],
      displayOrder: 1,
      status: "draft",
    },
    db
  );

  const updated = await updateTopicRecord(
    created.id,
    {
      name: "Chủ đề A (Đã sửa)",
      detail: "Chi tiết mới",
      status: "published",
    },
    db
  );

  assert.equal(updated.name, "Chủ đề A (Đã sửa)");
  assert.equal(updated.detail, "Chi tiết mới");
  assert.equal(updated.status, "published");

  const del = await deleteTopicRecord(created.id, db);
  assert.equal(del.success, true);

  const all = await listAllTopicsForAdmin(db);
  assert.equal(all.length, 0);
});

test("seedDefaultTopics inserts baseline topics into database without duplicates", async () => {
  const client = new PGlite();
  const db = drizzle(client);
  await bootstrapLegalDatabase(db);

  const firstSeed = await seedDefaultTopics(db);
  assert.equal(firstSeed.inserted, baselineTopics.length);

  const all = await listAllTopicsForAdmin(db);
  assert.equal(all.length, baselineTopics.length);

  const secondSeed = await seedDefaultTopics(db);
  assert.equal(secondSeed.inserted, 0);
  assert.equal(secondSeed.updated, baselineTopics.length);
});
