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

const {
  createEngagementClientId,
  engagementDayBucket,
  engagementMarkInput,
  engagementMarkKey,
  formatEngagementCount,
  isEngagementClientId,
  parseEngagementCounts,
  parseEngagementRequest,
  projectEngagementCounts,
  toEngagementCountMap,
  withEngagementCount,
} = await import("../lib/engagement.ts");

const { applyEngagement, pruneEngagementMarks, readEngagementCounts } =
  await import("../lib/engagement-store.ts");

const CLIENT = "a".repeat(32);
const OTHER_CLIENT = "b".repeat(32);
const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 8, 5, 10, 0, 0);

test("chi nhan client id 32 ky tu hex", () => {
  assert.equal(isEngagementClientId(CLIENT), true);
  assert.equal(isEngagementClientId("A".repeat(32)), false);
  assert.equal(isEngagementClientId("a".repeat(31)), false);
  assert.equal(isEngagementClientId(""), false);
  assert.equal(isEngagementClientId(null), false);
});

test("client id sinh ra hop le va khong lap", () => {
  const bytes = (size) => Uint8Array.from({ length: size }, (_, i) => i);
  const id = createEngagementClientId(bytes);
  assert.equal(isEngagementClientId(id), true);
  const random = createEngagementClientId((size) =>
    crypto.getRandomValues(new Uint8Array(size)),
  );
  assert.equal(isEngagementClientId(random), true);
  assert.notEqual(id, random);
});

test("parse request tu choi payload sai", () => {
  const valid = {
    entityType: "showcase",
    entityId: 3,
    action: "view",
    clientId: CLIENT,
  };
  assert.deepEqual(parseEngagementRequest(valid), valid);
  for (const invalid of [
    null,
    [],
    "view",
    { ...valid, entityType: "user" },
    { ...valid, entityId: 0 },
    { ...valid, entityId: -1 },
    { ...valid, entityId: 1.5 },
    { ...valid, entityId: "3" },
    { ...valid, action: "delete" },
    { ...valid, clientId: "khong-hop-le" },
  ]) {
    assert.equal(parseEngagementRequest(invalid), null);
  }
});

test("khoa chong trung: luot xem theo ngay, yeu thich ben vung", async () => {
  const view = {
    entityType: "law",
    entityId: 7,
    action: "view",
    clientId: CLIENT,
  };
  const sameDay = engagementMarkInput(view, engagementDayBucket(NOW));
  const laterSameDay = engagementMarkInput(
    view,
    engagementDayBucket(NOW + 3 * 60 * 60 * 1000),
  );
  const nextDay = engagementMarkInput(
    view,
    engagementDayBucket(NOW + DAY_MS),
  );
  assert.equal(sameDay, laterSameDay);
  assert.notEqual(sameDay, nextDay);

  const favorite = { ...view, action: "favorite" };
  const unfavorite = { ...view, action: "unfavorite" };
  assert.equal(
    engagementMarkInput(favorite, engagementDayBucket(NOW)),
    engagementMarkInput(unfavorite, engagementDayBucket(NOW + 30 * DAY_MS)),
    "bo yeu thich phai tro dung dau da ghi khi yeu thich",
  );

  // Khoa khong chua client id tho: chi la SHA-256 mot chieu.
  const key = await engagementMarkKey(sameDay);
  assert.match(key, /^[0-9a-f]{64}$/);
  assert.ok(!key.includes(CLIENT));
  assert.notEqual(key, await engagementMarkKey(nextDay));
  assert.notEqual(
    key,
    await engagementMarkKey(
      engagementMarkInput({ ...view, clientId: OTHER_CLIENT }, engagementDayBucket(NOW)),
    ),
  );
});

test("project va parse DTO bo dem", () => {
  const rows = [
    { entityType: "law", entityId: 1, viewCount: 5, favoriteCount: 2 },
    { entityType: "law", entityId: 1, viewCount: 9, favoriteCount: 9 },
    { entityType: "showcase", entityId: 2, viewCount: -3, favoriteCount: "x" },
    { entityType: "user", entityId: 3, viewCount: 1, favoriteCount: 1 },
    { entityType: "law", entityId: 0, viewCount: 1, favoriteCount: 1 },
    null,
  ];
  const projected = projectEngagementCounts(rows);
  assert.deepEqual(projected, [
    { entityType: "law", entityId: 1, viewCount: 5, favoriteCount: 2 },
    { entityType: "showcase", entityId: 2, viewCount: 0, favoriteCount: 0 },
  ]);

  assert.deepEqual(parseEngagementCounts(projected), projected);
  assert.equal(parseEngagementCounts("[]"), null);
  assert.equal(
    parseEngagementCounts([{ ...projected[0], extra: 1 }]),
    null,
    "field thua phai bi tu choi",
  );
  assert.equal(parseEngagementCounts([{ entityType: "law", entityId: 1 }]), null);
});

test("map bo dem cap nhat bat bien", () => {
  const base = toEngagementCountMap([
    { entityType: "law", entityId: 1, viewCount: 1, favoriteCount: 0 },
  ]);
  const next = withEngagementCount(base, {
    entityType: "law",
    entityId: 1,
    viewCount: 2,
    favoriteCount: 1,
  });
  assert.equal(base.get("law:1").viewCount, 1, "map cu khong duoc doi");
  assert.equal(next.get("law:1").viewCount, 2);
  assert.notEqual(base, next);
});

test("rut gon so lieu hien thi", () => {
  assert.equal(formatEngagementCount(0), "0");
  assert.equal(formatEngagementCount(999), "999");
  assert.equal(formatEngagementCount(1_000), "1K");
  assert.equal(formatEngagementCount(1_250), "1.2K");
  assert.equal(formatEngagementCount(1_000_000), "1M");
  assert.equal(formatEngagementCount(-5), "0");
});

// ===== Kiem thu SQL that tren PGlite =====

const { PGlite } = await import("@electric-sql/pglite");
const { drizzle } = await import("drizzle-orm/pglite");
const { sql } = await import("drizzle-orm");
const { bootstrapLegalDatabase } = await import("../db/index.ts");

const db = drizzle(new PGlite());
await bootstrapLegalDatabase(db);
await db.execute(
  sql.raw(`
  INSERT INTO showcases (id, topic, title, summary, status)
  VALUES (1, 'Giao thong', 'Tinh huong 1', 'Tom tat', 'published'),
         (2, 'Giao thong', 'Ban nhap', 'Tom tat', 'draft')`),
);

const request = (overrides) => ({
  entityType: "showcase",
  entityId: 1,
  action: "view",
  clientId: CLIENT,
  ...overrides,
});

test("luot xem: cung trinh duyet trong ngay chi dem mot lan", async () => {
  const first = await applyEngagement(db, request(), NOW);
  assert.equal(first.counted, true);
  assert.equal(first.count.viewCount, 1);

  const again = await applyEngagement(db, request(), NOW + 60_000);
  assert.equal(again.counted, false, "mo lai trong ngay khong dem them");
  assert.equal(again.count.viewCount, 1, "van tra ve so dem hien tai");

  const otherBrowser = await applyEngagement(
    db,
    request({ clientId: OTHER_CLIENT }),
    NOW,
  );
  assert.equal(otherBrowser.counted, true);
  assert.equal(otherBrowser.count.viewCount, 2);

  const nextDay = await applyEngagement(db, request(), NOW + DAY_MS);
  assert.equal(nextDay.counted, true, "sang ngay moi duoc dem lai");
  assert.equal(nextDay.count.viewCount, 3);
});

test("yeu thich: bat/tat khong bao gio dem lech", async () => {
  const on = await applyEngagement(db, request({ action: "favorite" }), NOW);
  assert.equal(on.counted, true);
  assert.equal(on.count.favoriteCount, 1);

  const onAgain = await applyEngagement(
    db,
    request({ action: "favorite" }),
    NOW + DAY_MS,
  );
  assert.equal(onAgain.counted, false, "bam lai khong cong them");
  assert.equal(onAgain.count.favoriteCount, 1);

  const off = await applyEngagement(
    db,
    request({ action: "unfavorite" }),
    NOW + 2 * DAY_MS,
  );
  assert.equal(off.counted, true);
  assert.equal(off.count.favoriteCount, 0);

  const offAgain = await applyEngagement(
    db,
    request({ action: "unfavorite" }),
    NOW,
  );
  assert.equal(offAgain.counted, false, "bo yeu thich lap lai khong tru am");
  assert.equal(offAgain.count.favoriteCount, 0);
  assert.ok(off.count.viewCount > 0, "bo dem xem khong bi anh huong");
});

test("khong dem cho noi dung chua xuat ban hoac khong ton tai", async () => {
  for (const entityId of [2, 999]) {
    const result = await applyEngagement(db, request({ entityId }), NOW);
    assert.equal(result.counted, false);
    assert.equal(result.count.viewCount, 0);
  }
  const rows = await db.execute(
    sql.raw(
      "SELECT count(*)::int AS total FROM content_engagement WHERE entity_id IN (2, 999)",
    ),
  );
  assert.equal(rows.rows[0].total, 0, "khong tao dong rac trong bang dem");
});

test("bang mark chi luu hash mot chieu va don duoc dau het han", async () => {
  const marks = await db.execute(
    sql.raw("SELECT mark_key, expires_at FROM content_engagement_marks"),
  );
  for (const row of marks.rows) {
    assert.match(row.mark_key, /^[0-9a-f]{64}$/);
    assert.ok(!row.mark_key.includes(CLIENT));
  }
  const before = marks.rows.length;
  await pruneEngagementMarks(db, NOW + 30 * DAY_MS);
  const after = await db.execute(
    sql.raw(
      "SELECT count(*)::int AS total, count(expires_at)::int AS temporary FROM content_engagement_marks",
    ),
  );
  assert.ok(after.rows[0].total < before, "dau luot xem het han bi don");
  assert.equal(after.rows[0].temporary, 0);
});

test("doc bo dem tra ve DTO da chuan hoa", async () => {
  const counts = await readEngagementCounts(db);
  assert.ok(counts.length >= 1);
  const showcase = counts.find(
    (count) => count.entityType === "showcase" && count.entityId === 1,
  );
  assert.ok(showcase);
  assert.equal(showcase.viewCount, 3);
  assert.equal(showcase.favoriteCount, 0);
  assert.deepEqual(parseEngagementCounts(counts), counts);
});
