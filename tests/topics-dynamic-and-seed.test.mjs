import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";
import { readFileSync } from "node:fs";

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
const { seedTopicsToDatabase, seedDemoSituationsToDatabase } = await import(
  "../scripts/seed-topics.mjs"
);
const { getActiveTopicDefinitions } = await import("../lib/topic-store.ts");
const { legalEntries, legalEntryCitations } = await import("../db/pg-schema.ts");
const { eq } = await import("drizzle-orm");

const EXPECTED_TOPICS = [
  { name: "Giao thông", detail: "Xe điện & xe máy" },
  { name: "Mạng xã hội", detail: "Ứng xử trên không gian mạng" },
  { name: "Bạo lực học đường", detail: "Bắt nạt & xô xát trong trường" },
  { name: "An ninh trật tự", detail: "Trật tự công cộng & an toàn" },
  { name: "Sở hữu trí tuệ", detail: "Bản quyền & đạo văn" },
  {
    name: "Chuyên đề phòng chống ma túy",
    detail: "Tác hại ma túy, bóng cười & chất gây nghiện",
  },
  {
    name: "Chuyên đề an ninh trật tự trường học",
    detail: "An toàn cổng trường & bảo vệ tài sản trường lớp",
  },
  {
    name: "Chuyên đề game và không gian mạng",
    detail: "Văn minh game số, quản lý giờ chơi & nạp thẻ ảo",
  },
  {
    name: "Tài chính - tín dụng đen",
    detail: "Cảnh giác bẫy nợ, app vay tiền & vay nặng lãi",
  },
  {
    name: "Phòng chống tệ nạn xã hội",
    detail: "Phòng ngừa cờ bạc, cá độ, số đề & mê tín dị đoan",
  },
];

test("Database seeds all 10 topics with exact names and details", async () => {
  const client = new PGlite();
  const db = drizzle(client);
  await bootstrapLegalDatabase(db);

  await seedTopicsToDatabase(db);
  const activeTopics = await getActiveTopicDefinitions(db);

  assert.equal(activeTopics.length, 10);
  for (let i = 0; i < EXPECTED_TOPICS.length; i++) {
    assert.equal(activeTopics[i].name, EXPECTED_TOPICS[i].name);
    assert.equal(activeTopics[i].detail, EXPECTED_TOPICS[i].detail);
    assert.ok(activeTopics[i].icon);
  }
});

test("Database seeds demo situations for missing topics with verified citations", async () => {
  const client = new PGlite();
  const db = drizzle(client);
  await bootstrapLegalDatabase(db);

  await seedTopicsToDatabase(db);
  const result = await seedDemoSituationsToDatabase(db);
  assert.equal(result.seededSituationsCount, 21);

  // Kiểm tra tình huống cho các chủ đề chuyên đề mới
  const rows = await db
    .select()
    .from(legalEntries)
    .where(eq(legalEntries.status, "published"));

  const seededTopics = new Set(rows.map((r) => r.topic));
  assert.ok(seededTopics.has("Bạo lực học đường"));
  assert.ok(seededTopics.has("An ninh trật tự"));
  assert.ok(seededTopics.has("Chuyên đề phòng chống ma túy"));
  assert.ok(seededTopics.has("Chuyên đề an ninh trật tự trường học"));
  assert.ok(seededTopics.has("Chuyên đề game và không gian mạng"));
  assert.ok(seededTopics.has("Tài chính - tín dụng đen"));
  assert.ok(seededTopics.has("Phòng chống tệ nạn xã hội"));

  // Kiểm tra mỗi tình huống đều có citation four_eyes_verified
  const citations = await db.select().from(legalEntryCitations);
  assert.ok(citations.length >= 21);
  for (const cit of citations) {
    assert.equal(cit.reviewStatus, "four_eyes_verified");
    assert.ok(cit.citedChecksumSha256);
  }

  // Chạy lại lần 2 bảo đảm tính idempotent (không nhân đôi bản ghi)
  const result2 = await seedDemoSituationsToDatabase(db);
  assert.equal(result2.seededSituationsCount, 0);
  const rows2 = await db
    .select()
    .from(legalEntries)
    .where(eq(legalEntries.status, "published"));
  assert.equal(rows2.length, 21);
});

test("app/page.tsx fetches dynamic topics from /api/topics and uses DB-first laws", () => {
  const pageSource = readFileSync("app/page.tsx", "utf8");

  // Kiểm tra nạp topics động qua /api/topics
  assert.ok(pageSource.includes("fetch(\"/api/topics\")"));
  assert.ok(pageSource.includes("setTopicList(dynamicList)"));
  assert.ok(pageSource.includes("registerDynamicTopics(topicsData.topics)"));

  // Kiểm tra không dùng filterTopics tĩnh ở danh sách chủ đề và filter bar
  assert.ok(!pageSource.includes("{filterTopics.slice(1).map("));
  assert.ok(!pageSource.includes("{filterTopics.map("));
  assert.ok(pageSource.includes("{topicList.slice(1).map("));
  assert.ok(pageSource.includes("{topicList.map("));

  // Kiểm tra DB-first: ưu tiên managedLaws từ DB thay vì ghép nối cứng với laws tĩnh
  assert.ok(
    pageSource.includes("managedLaws.length > 0 ? managedLaws : laws")
  );
});
