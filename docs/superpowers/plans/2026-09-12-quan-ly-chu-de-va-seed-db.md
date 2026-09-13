# Quản lý Chủ đề & Seed Dữ liệu vào Database — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cho phép quản trị viên (Admin) quản lý toàn diện các chủ đề/lĩnh vực pháp luật qua giao diện CMS (thêm, sửa, xóa/lưu trữ, sắp xếp, cập nhật từ khóa, câu hỏi mẫu), đồng thời lưu trữ và seed bộ chủ đề hiện tại vào cơ sở dữ liệu PostgreSQL (Neon/PGlite).

**Architecture:** Mở rộng tầng schema PostgreSQL với bảng `content_topics` có kiểm tra ràng buộc toàn vẹn dữ liệu (idempotent bootstrap, schema version bump); xây dựng tầng `lib/topic-store.ts` cung cấp cơ chế fallback về bộ chủ đề tĩnh `lib/topics.ts` khi DB offline/trống; xây dựng Admin API `/admin/api/topics` bảo vệ bởi session quản trị, public API `/api/topics` cho frontend, script seed dữ liệu `scripts/seed-topics.mjs`, và giao diện quản lý `TopicManager.tsx` tích hợp vào Sidebar theo chuẩn Stitch Design.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript 5.9, Drizzle ORM, PostgreSQL (Neon / PGlite), Tailwind CSS v4, Node.js test runner.

## Global Constraints

- User-story ID: `US-047 — Quản lý chủ đề và lưu trữ vào cơ sở dữ liệu`.
- Quyết định kiến trúc: `DEC-028 — Lưu trữ chủ đề pháp lý trong cơ sở dữ liệu và cơ chế fallback an toàn`.
- Schema Version: Nâng `pgSchemaVersion` từ `2026-09-12-referral-authorities-v1` lên `2026-09-12-content-topics-v1`.
- DDL idempotent: Mọi câu lệnh DDL sử dụng `CREATE TABLE IF NOT EXISTS` và `ON CONFLICT DO NOTHING`.
- Fail-safe & Fallback: Hệ thống không bao giờ được gãy nếu cơ sở dữ liệu gặp sự cố hoặc bảng trống; luôn fallback an toàn về 5 chủ đề mặc định trong `lib/topics.ts`.
- Bảo vệ dữ liệu liên quan: Không cho phép xóa cứng chủ đề nếu đang có `legal_entries` hoặc `showcases` liên kết (yêu cầu chuyển sang trạng thái `archived` hoặc chuyển dữ liệu).

---

## File Structure Overview

### Files Created:
1. `lib/topic-store.ts`: Tầng xử lý logic nghiệp vụ và truy vấn DB cho chủ đề, bao gồm mapper DTO, CRUD và cache/fallback.
2. `scripts/seed-topics.mjs`: Script độc lập để seed dữ liệu 5 chủ đề hiện tại vào database (hỗ trợ cả production và local dev).
3. `app/admin/api/topics/route.ts`: API endpoint cho quản trị viên thực hiện CRUD chủ đề.
4. `app/api/topics/route.ts`: Public API endpoint trả về danh sách chủ đề đã xuất bản cho client.
5. `app/admin/TopicManager.tsx`: Giao diện CMS quản lý danh sách chủ đề, form thêm/sửa, xem từ khóa và câu hỏi mẫu.
6. `tests/topics-schema.test.mjs`: Test kiểm tra DDL schema, bootstrap và ràng buộc bảng `content_topics`.
7. `tests/topic-store.test.mjs`: Test kiểm tra tầng lưu trữ, CRUD và fallback logic.
8. `tests/seed-topics.test.mjs`: Test kiểm tra script seed dữ liệu vào database.
9. `tests/topics-api.test.mjs`: Test kiểm tra API endpoint của admin và public.

### Files Modified:
1. `db/pg-schema.ts`: Khai báo bảng Drizzle `contentTopics`.
2. `db/pg-bootstrap.ts`: Bổ sung DDL tạo bảng `content_topics`, seed khởi tạo và cập nhật `pgSchemaVersion`.
3. `lib/topics.ts`: Xuất hàm cập nhật bộ chủ đề động cho các validator `isContentTopic` và `findTopic`.
4. `app/admin/AdminDashboard.tsx`: Thêm menu "Chủ đề & Lĩnh vực" trong Sidebar và Tab Pills, render `TopicManager`.
5. `package.json`: Thêm lệnh `npm run seed:topics`.
6. `docs/USER_STORIES.md`: Thêm câu chuyện người dùng US-047.
7. `docs/TECHNICAL_SPEC.md`: Ghi nhận quyết định kiến trúc DEC-028.
8. `docs/PROGRESS.md`: Cập nhật trạng thái và bằng chứng kiểm thử cho US-047.

---

### Task 1: Database Schema & Bootstrap Migration for `content_topics`

**Files:**
- Modify: `db/pg-schema.ts`
- Modify: `db/pg-bootstrap.ts`
- Test: `tests/topics-schema.test.mjs`

**Interfaces:**
- Consumes: `@/db/pg-schema`, `@/db/pg-bootstrap`, `@electric-sql/pglite`, `drizzle-orm`
- Produces: `contentTopics` table export trong `db/pg-schema.ts`, `createContentTopicsTable` và `pgSchemaVersion = '2026-09-12-content-topics-v1'` trong `db/pg-bootstrap.ts`

- [ ] **Step 1: Write the failing test**

Tạo file `tests/topics-schema.test.mjs`:
```javascript
import assert from "node:assert/strict";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { sql } from "drizzle-orm";
import { bootstrapLegalDatabase } from "../db/index.ts";
import { pgSchemaVersion } from "../db/pg-bootstrap.ts";

test("content_topics table is created by bootstrap and enforces checks", async () => {
  const client = new PGlite();
  const db = drizzle(client);

  await bootstrapLegalDatabase(db);

  assert.equal(pgSchemaVersion, "2026-09-12-content-topics-v1");

  // Kiểm tra bảng tồn tại
  const tableCheck = await db.execute(
    sql.raw("SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'content_topics') AS exists")
  );
  assert.equal(tableCheck.rows[0].exists, true);

  // Thử insert hợp lệ
  await db.execute(
    sql.raw(`
      INSERT INTO content_topics (name, icon, detail, abbreviations, keywords, situations, display_order, status)
      VALUES ('Chủ đề test', '★', 'Mô tả test', '["test"]', '["tu khoa"]', '["cau hoi?"]', 1, 'published')
    `)
  );

  const res = await db.execute(sql.raw("SELECT name, icon FROM content_topics WHERE name = 'Chủ đề test'"));
  assert.equal(res.rows[0].name, "Chủ đề test");
  assert.equal(res.rows[0].icon, "★");

  // Kiểm tra ràng buộc unique name
  await assert.rejects(
    async () => {
      await db.execute(
        sql.raw(`
          INSERT INTO content_topics (name, icon, detail)
          VALUES ('Chủ đề test', '★', 'Trùng tên')
        `)
      );
    },
    /duplicate key|unique/i
  );

  // Kiểm tra ràng buộc JSON array cho keywords
  await assert.rejects(
    async () => {
      await db.execute(
        sql.raw(`
          INSERT INTO content_topics (name, keywords)
          VALUES ('Chủ đề sai JSON', 'khong phai json')
        `)
      );
    }
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-strip-types --test tests/topics-schema.test.mjs`
Expected: FAIL vì `content_topics` chưa được khai báo trong bootstrap và schema version chưa tăng.

- [ ] **Step 3: Write minimal implementation**

Trong `db/pg-schema.ts`, thêm bảng:
```typescript
export const contentTopics = pgTable("content_topics", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  icon: text("icon").notNull().default("◉"),
  detail: text("detail").notNull().default(""),
  abbreviations: text("abbreviations").notNull().default("[]"),
  keywords: text("keywords").notNull().default("[]"),
  situations: text("situations").notNull().default("[]"),
  displayOrder: integer("display_order").notNull().default(0),
  status: text("status", { enum: ["draft", "published", "archived"] })
    .notNull()
    .default("published"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(now())::text`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(now())::text`),
});
```

Trong `db/pg-bootstrap.ts`, bổ sung DDL:
```sql
const createContentTopicsTable = `
CREATE TABLE IF NOT EXISTS content_topics (
  id integer PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY,
  name text NOT NULL UNIQUE,
  icon text DEFAULT '◉' NOT NULL,
  detail text DEFAULT '' NOT NULL,
  abbreviations text DEFAULT '[]' NOT NULL,
  keywords text DEFAULT '[]' NOT NULL,
  situations text DEFAULT '[]' NOT NULL,
  display_order integer DEFAULT 0 NOT NULL,
  status text DEFAULT 'published' NOT NULL,
  created_at text DEFAULT (now())::text NOT NULL,
  updated_at text DEFAULT (now())::text NOT NULL,
  CONSTRAINT content_topics_status_check
    CHECK (status IN ('draft', 'published', 'archived')),
  CONSTRAINT content_topics_name_check
    CHECK (length(btrim(name)) BETWEEN 1 AND 100),
  CONSTRAINT content_topics_abbreviations_json_check
    CHECK (
      abbreviations::jsonb IS NOT NULL
      AND jsonb_typeof(abbreviations::jsonb) = 'array'
    ),
  CONSTRAINT content_topics_keywords_json_check
    CHECK (
      keywords::jsonb IS NOT NULL
      AND jsonb_typeof(keywords::jsonb) = 'array'
    ),
  CONSTRAINT content_topics_situations_json_check
    CHECK (
      situations::jsonb IS NOT NULL
      AND jsonb_typeof(situations::jsonb) = 'array'
    )
)`;
```
Và cập nhật `pgSchemaVersion = "2026-09-12-content-topics-v1"`, thêm `createContentTopicsTable` vào mảng `pgBootstrapStatements`.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --experimental-strip-types --test tests/topics-schema.test.mjs`
Expected: PASS (1 suite, all assertions pass).

- [ ] **Step 5: Commit**

```bash
git add db/pg-schema.ts db/pg-bootstrap.ts tests/topics-schema.test.mjs
git commit -m "feat(db): add content_topics table and bootstrap migration"
```

---

### Task 2: Topic Store & Fallback Resolution Layer

**Files:**
- Create: `lib/topic-store.ts`
- Modify: `lib/topics.ts`
- Test: `tests/topic-store.test.mjs`

**Interfaces:**
- Consumes: `contentTopics` từ `@/db/pg-schema`, `contentTopics` từ `@/lib/topics`, `LegalDatabase` từ `@/db`
- Produces:
  - `type TopicRecord = { id: number; name: string; icon: string; detail: string; abbreviations: string[]; keywords: string[]; situations: string[]; displayOrder: number; status: 'draft' | 'published' | 'archived'; createdAt: string; updatedAt: string; }`
  - `getActiveTopicDefinitions(db?: LegalDatabase): Promise<readonly TopicDefinition[]>`
  - `listAllTopicsForAdmin(db?: LegalDatabase): Promise<TopicRecord[]>`
  - `createTopicRecord(data: CreateTopicInput, db?: LegalDatabase): Promise<TopicRecord>`
  - `updateTopicRecord(id: number, data: UpdateTopicInput, db?: LegalDatabase): Promise<TopicRecord>`
  - `deleteTopicRecord(id: number, db?: LegalDatabase): Promise<{ success: boolean; message?: string }>`

- [ ] **Step 1: Write the failing test**

Tạo file `tests/topic-store.test.mjs`:
```javascript
import assert from "node:assert/strict";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { bootstrapLegalDatabase } from "../db/index.ts";
import {
  getActiveTopicDefinitions,
  listAllTopicsForAdmin,
  createTopicRecord,
  updateTopicRecord,
  deleteTopicRecord,
} from "../lib/topic-store.ts";
import { contentTopics as baselineTopics } from "../lib/topics.ts";

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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-strip-types --test tests/topic-store.test.mjs`
Expected: FAIL vì `lib/topic-store.ts` chưa được tạo.

- [ ] **Step 3: Write minimal implementation**

Tạo `lib/topic-store.ts`:
```typescript
import { eq, sql, desc, asc } from "drizzle-orm";
import { contentTopics as contentTopicsTable } from "@/db/pg-schema";
import { contentTopics as baselineTopics, type TopicDefinition, type ContentTopic } from "@/lib/topics";
import type { LegalDatabase } from "@/db";

export type TopicRecord = {
  id: number;
  name: string;
  icon: string;
  detail: string;
  abbreviations: string[];
  keywords: string[];
  situations: string[];
  displayOrder: number;
  status: "draft" | "published" | "archived";
  createdAt: string;
  updatedAt: string;
};

export type CreateTopicInput = {
  name: string;
  icon?: string;
  detail?: string;
  abbreviations?: string[];
  keywords?: string[];
  situations?: string[];
  displayOrder?: number;
  status?: "draft" | "published" | "archived";
};

export type UpdateTopicInput = Partial<CreateTopicInput>;

function parseJsonArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch {}
  }
  return [];
}

export function mapRowToTopicRecord(row: any): TopicRecord {
  return {
    id: Number(row.id),
    name: String(row.name),
    icon: String(row.icon || "◉"),
    detail: String(row.detail || ""),
    abbreviations: parseJsonArray(row.abbreviations),
    keywords: parseJsonArray(row.keywords),
    situations: parseJsonArray(row.situations),
    displayOrder: Number(row.displayOrder ?? row.display_order ?? 0),
    status: row.status as TopicRecord["status"],
    createdAt: String(row.createdAt ?? row.created_at),
    updatedAt: String(row.updatedAt ?? row.updated_at),
  };
}

export async function getActiveTopicDefinitions(db?: any): Promise<readonly TopicDefinition[]> {
  if (!db) return baselineTopics;
  try {
    const rows = await db
      .select()
      .from(contentTopicsTable)
      .where(eq(contentTopicsTable.status, "published"))
      .orderBy(asc(contentTopicsTable.displayOrder), asc(contentTopicsTable.id));

    if (!rows || rows.length === 0) {
      return baselineTopics;
    }

    return rows.map((r: any) => {
      const mapped = mapRowToTopicRecord(r);
      return Object.freeze({
        name: mapped.name as ContentTopic,
        icon: mapped.icon,
        detail: mapped.detail,
        abbreviations: Object.freeze(mapped.abbreviations),
        keywords: Object.freeze(mapped.keywords),
        situations: Object.freeze(mapped.situations),
      });
    });
  } catch {
    return baselineTopics;
  }
}

export async function listAllTopicsForAdmin(db: any): Promise<TopicRecord[]> {
  const rows = await db
    .select()
    .from(contentTopicsTable)
    .orderBy(asc(contentTopicsTable.displayOrder), desc(contentTopicsTable.id));
  return rows.map(mapRowToTopicRecord);
}

export async function createTopicRecord(input: CreateTopicInput, db: any): Promise<TopicRecord> {
  const name = input.name.trim();
  if (!name) throw new Error("Tên chủ đề không được để trống.");

  const [row] = await db
    .insert(contentTopicsTable)
    .values({
      name,
      icon: input.icon?.trim() || "◉",
      detail: input.detail?.trim() || "",
      abbreviations: JSON.stringify(input.abbreviations || []),
      keywords: JSON.stringify(input.keywords || []),
      situations: JSON.stringify(input.situations || []),
      displayOrder: input.displayOrder ?? 0,
      status: input.status || "published",
    })
    .returning();

  return mapRowToTopicRecord(row);
}

export async function updateTopicRecord(id: number, input: UpdateTopicInput, db: any): Promise<TopicRecord> {
  const values: Record<string, unknown> = {
    updatedAt: sql`(now())::text`,
  };
  if (input.name !== undefined) values.name = input.name.trim();
  if (input.icon !== undefined) values.icon = input.icon.trim();
  if (input.detail !== undefined) values.detail = input.detail.trim();
  if (input.abbreviations !== undefined) values.abbreviations = JSON.stringify(input.abbreviations);
  if (input.keywords !== undefined) values.keywords = JSON.stringify(input.keywords);
  if (input.situations !== undefined) values.situations = JSON.stringify(input.situations);
  if (input.displayOrder !== undefined) values.displayOrder = input.displayOrder;
  if (input.status !== undefined) values.status = input.status;

  const [row] = await db
    .update(contentTopicsTable)
    .set(values)
    .where(eq(contentTopicsTable.id, id))
    .returning();

  if (!row) throw new Error("Không tìm thấy chủ đề.");
  return mapRowToTopicRecord(row);
}

export async function deleteTopicRecord(id: number, db: any): Promise<{ success: boolean; message?: string }> {
  const [deleted] = await db
    .delete(contentTopicsTable)
    .where(eq(contentTopicsTable.id, id))
    .returning();
  if (!deleted) throw new Error("Chủ đề không tồn tại.");
  return { success: true };
}
```

Trong `lib/topics.ts`, cập nhật hàm `registerDynamicTopics`:
```typescript
export function registerDynamicTopics(dynamicTopics: readonly TopicDefinition[]) {
  for (const topic of dynamicTopics) {
    if (!topicByName.has(topic.name)) {
      topicByName.set(topic.name, topic);
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --experimental-strip-types --test tests/topic-store.test.mjs`
Expected: PASS (all tests pass).

- [ ] **Step 5: Commit**

```bash
git add lib/topic-store.ts lib/topics.ts tests/topic-store.test.mjs
git commit -m "feat(topics): add topic store with database CRUD and fallback resolution"
```

---

### Task 3: Topic Seed Script & DB Seeding Execution

**Files:**
- Create: `scripts/seed-topics.mjs`
- Modify: `package.json`
- Test: `tests/seed-topics.test.mjs`

**Interfaces:**
- Consumes: `contentTopics` từ `lib/topics.ts`, `getInitializedDb` từ `db/index.ts`, `contentTopics` table từ `db/pg-schema.ts`
- Produces: script CLI nạp 5 chủ đề cơ sở vào database, tự động bỏ qua nếu đã có (idempotent `ON CONFLICT (name) DO UPDATE`).

- [ ] **Step 1: Write the failing test**

Tạo file `tests/seed-topics.test.mjs`:
```javascript
import assert from "node:assert/strict";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { bootstrapLegalDatabase } from "../db/index.ts";
import { seedTopicsToDatabase } from "../scripts/seed-topics.mjs";
import { listAllTopicsForAdmin } from "../lib/topic-store.ts";

test("seedTopicsToDatabase seeds 5 baseline topics into DB and is idempotent", async () => {
  const client = new PGlite();
  const db = drizzle(client);
  await bootstrapLegalDatabase(db);

  // Chạy seed lần 1
  const result1 = await seedTopicsToDatabase(db);
  assert.equal(result1.seededCount, 5);

  const all1 = await listAllTopicsForAdmin(db);
  assert.equal(all1.length, 5);
  const names1 = all1.map((t) => t.name);
  assert.equal(names1.includes("Giao thông"), true);
  assert.equal(names1.includes("Mạng xã hội"), true);
  assert.equal(names1.includes("Bạo lực học đường"), true);
  assert.equal(names1.includes("An ninh trật tự"), true);
  assert.equal(names1.includes("Sở hữu trí tuệ"), true);

  // Chạy seed lần 2 (idempotent, không nhân bản)
  const result2 = await seedTopicsToDatabase(db);
  assert.equal(result2.seededCount, 5);

  const all2 = await listAllTopicsForAdmin(db);
  assert.equal(all2.length, 5);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-strip-types --test tests/seed-topics.test.mjs`
Expected: FAIL vì `scripts/seed-topics.mjs` chưa tồn tại.

- [ ] **Step 3: Write minimal implementation**

Tạo `scripts/seed-topics.mjs`:
```javascript
import { sql } from "drizzle-orm";
import { contentTopics as baselineTopics } from "../lib/topics.ts";
import { contentTopics as contentTopicsTable } from "../db/pg-schema.ts";

export async function seedTopicsToDatabase(db) {
  let count = 0;
  for (let i = 0; i < baselineTopics.length; i++) {
    const topic = baselineTopics[i];
    await db
      .insert(contentTopicsTable)
      .values({
        name: topic.name,
        icon: topic.icon,
        detail: topic.detail,
        abbreviations: JSON.stringify(topic.abbreviations || []),
        keywords: JSON.stringify(topic.keywords || []),
        situations: JSON.stringify(topic.situations || []),
        displayOrder: (i + 1) * 10,
        status: "published",
      })
      .onConflictDoUpdate({
        target: contentTopicsTable.name,
        set: {
          icon: topic.icon,
          detail: topic.detail,
          abbreviations: JSON.stringify(topic.abbreviations || []),
          keywords: JSON.stringify(topic.keywords || []),
          situations: JSON.stringify(topic.situations || []),
          displayOrder: (i + 1) * 10,
          status: "published",
          updatedAt: sql`(now())::text`,
        },
      });
    count++;
  }
  return { seededCount: count };
}

// Chạy trực tiếp từ CLI
if (process.argv[1] && process.argv[1].endsWith("seed-topics.mjs")) {
  const { getInitializedDb } = await import("../db/index.ts");
  console.log("Bat dau seed danh sach chu de vao database...");
  try {
    const db = await getInitializedDb();
    const { seededCount } = await seedTopicsToDatabase(db);
    console.log(`Da seed thanh cong ${seededCount} chu de vao database.`);
    process.exit(0);
  } catch (err) {
    console.error("Loi khi seed chu de:", err);
    process.exit(1);
  }
}
```

Thêm script vào `package.json`:
```json
"seed:topics": "node --env-file=.env.local --experimental-strip-types scripts/seed-topics.mjs"
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --experimental-strip-types --test tests/seed-topics.test.mjs`
Expected: PASS (all tests pass).

- [ ] **Step 5: Commit**

```bash
git add scripts/seed-topics.mjs package.json tests/seed-topics.test.mjs
git commit -m "feat(scripts): add seed-topics script to populate baseline topics into db"
```

---

### Task 4: Admin & Public API Endpoints for Topic Management

**Files:**
- Create: `app/admin/api/topics/route.ts`
- Create: `app/api/topics/route.ts`
- Test: `tests/topics-api.test.mjs`

**Interfaces:**
- Consumes: `isAdminRequest`, `hasTrustedOrigin` từ `lib/admin-auth`, `listAllTopicsForAdmin`, `createTopicRecord`, `updateTopicRecord`, `deleteTopicRecord`, `getActiveTopicDefinitions` từ `lib/topic-store`
- Produces:
  - `GET /admin/api/topics`: JSON `{ topics: TopicRecord[] }`
  - `POST /admin/api/topics`: JSON `{ topic: TopicRecord }`
  - `PUT /admin/api/topics`: JSON `{ topic: TopicRecord }`
  - `DELETE /admin/api/topics`: JSON `{ success: boolean }`
  - `GET /api/topics`: JSON `{ topics: TopicDefinition[] }` (công khai, có cache)

- [ ] **Step 1: Write the failing test**

Tạo file `tests/topics-api.test.mjs`:
```javascript
import assert from "node:assert/strict";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { bootstrapLegalDatabase } from "../db/index.ts";
import { GET as getPublicTopics } from "../app/api/topics/route.ts";
import {
  GET as getAdminTopics,
  POST as postAdminTopics,
  PUT as putAdminTopics,
  DELETE as deleteAdminTopics,
} from "../app/admin/api/topics/route.ts";

test("Public GET /api/topics returns 200 with topics array", async () => {
  const req = new Request("http://localhost/api/topics");
  const res = await getPublicTopics(req);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(Array.isArray(data.topics), true);
  assert.equal(data.topics.length >= 5, true);
});

test("Admin endpoints require authentication", async () => {
  const unauthReq = new Request("http://localhost/admin/api/topics");
  const res = await getAdminTopics(unauthReq);
  assert.equal(res.status, 401);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-strip-types --test tests/topics-api.test.mjs`
Expected: FAIL vì các route handlers chưa tồn tại.

- [ ] **Step 3: Write minimal implementation**

Tạo `app/api/topics/route.ts`:
```typescript
import { NextResponse } from "next/server";
import { getActiveTopicDefinitions } from "@/lib/topic-store";
import { getInitializedDb } from "@/db";

export async function GET() {
  try {
    let db = null;
    try {
      db = await getInitializedDb();
    } catch {}
    const topics = await getActiveTopicDefinitions(db);
    return NextResponse.json(
      { topics },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      }
    );
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Lỗi tải chủ đề." },
      { status: 500 }
    );
  }
}
```

Tạo `app/admin/api/topics/route.ts`:
```typescript
import { NextResponse } from "next/server";
import { isAdminRequest, hasTrustedOrigin } from "@/lib/admin-auth";
import { getInitializedDb } from "@/db";
import {
  listAllTopicsForAdmin,
  createTopicRecord,
  updateTopicRecord,
  deleteTopicRecord,
} from "@/lib/topic-store";
import { seedTopicsToDatabase } from "@/scripts/seed-topics.mjs";

export async function GET(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Chưa xác thực quyền quản trị." }, { status: 401 });
  }

  try {
    const db = await getInitializedDb();
    const topics = await listAllTopicsForAdmin(db);
    return NextResponse.json({ topics }, { headers: { "Cache-Control": "no-store" } });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Lỗi khi lấy danh sách chủ đề." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Chưa xác thực quyền quản trị." }, { status: 401 });
  }
  if (!hasTrustedOrigin(request)) {
    return NextResponse.json({ error: "Origin không hợp lệ." }, { status: 403 });
  }

  try {
    const body = await request.json();
    const db = await getInitializedDb();

    if (body.action === "seed_defaults") {
      const { seededCount } = await seedTopicsToDatabase(db);
      const topics = await listAllTopicsForAdmin(db);
      return NextResponse.json({ success: true, seededCount, topics });
    }

    const topic = await createTopicRecord(body, db);
    return NextResponse.json({ topic }, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Lỗi khi tạo chủ đề mới." },
      { status: 400 }
    );
  }
}

export async function PUT(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Chưa xác thực quyền quản trị." }, { status: 401 });
  }
  if (!hasTrustedOrigin(request)) {
    return NextResponse.json({ error: "Origin không hợp lệ." }, { status: 403 });
  }

  try {
    const body = await request.json();
    const id = Number(body.id);
    if (!id || id <= 0) {
      return NextResponse.json({ error: "ID chủ đề không hợp lệ." }, { status: 400 });
    }

    const db = await getInitializedDb();
    const topic = await updateTopicRecord(id, body, db);
    return NextResponse.json({ topic });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Lỗi khi cập nhật chủ đề." },
      { status: 400 }
    );
  }
}

export async function DELETE(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Chưa xác thực quyền quản trị." }, { status: 401 });
  }
  if (!hasTrustedOrigin(request)) {
    return NextResponse.json({ error: "Origin không hợp lệ." }, { status: 403 });
  }

  try {
    const url = new URL(request.url);
    const id = Number(url.searchParams.get("id"));
    if (!id || id <= 0) {
      return NextResponse.json({ error: "ID chủ đề không hợp lệ." }, { status: 400 });
    }

    const db = await getInitializedDb();
    const result = await deleteTopicRecord(id, db);
    return NextResponse.json(result);
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Lỗi khi xóa chủ đề." },
      { status: 400 }
    );
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --experimental-strip-types --test tests/topics-api.test.mjs`
Expected: PASS (all tests pass).

- [ ] **Step 5: Commit**

```bash
git add app/api/topics/route.ts app/admin/api/topics/route.ts tests/topics-api.test.mjs
git commit -m "feat(api): add admin and public API endpoints for topic management"
```

---

### Task 5: Admin UI `TopicManager.tsx` & Sidebar Integration

**Files:**
- Create: `app/admin/TopicManager.tsx`
- Modify: `app/admin/AdminDashboard.tsx`
- Test: `tests/topic-manager-ui.test.mjs`

**Interfaces:**
- Consumes: API `/admin/api/topics`, `TopicRecord` từ `lib/topic-store`
- Produces: Component `TopicManager` hỗ trợ tạo mới, chỉnh sửa inline/drawer, seed mặc định, gắn vào tab "topic" trong `AdminDashboard`.

- [ ] **Step 1: Write UI unit test**

Tạo file `tests/topic-manager-ui.test.mjs`:
```javascript
import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

test("TopicManager component source exports a valid React component and handles actions", () => {
  const code = readFileSync("app/admin/TopicManager.tsx", "utf8");
  assert.equal(code.includes("export function TopicManager"), true);
  assert.equal(code.includes("/admin/api/topics"), true);
  assert.equal(code.includes("seed_defaults"), true);
});

test("AdminDashboard includes topic navigation item and renders TopicManager", () => {
  const code = readFileSync("app/admin/AdminDashboard.tsx", "utf8");
  assert.equal(code.includes("TopicManager"), true);
  assert.equal(code.includes("Chủ đề & Lĩnh vực"), true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/topic-manager-ui.test.mjs`
Expected: FAIL vì file `app/admin/TopicManager.tsx` chưa được tạo.

- [ ] **Step 3: Write minimal implementation**

Tạo `app/admin/TopicManager.tsx`:
```tsx
"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { TopicRecord } from "@/lib/topic-store";

const emptyTopicForm = {
  name: "",
  icon: "◉",
  detail: "",
  abbreviations: "",
  keywords: "",
  situations: "",
  displayOrder: 0,
  status: "published" as const,
};

export function TopicManager() {
  const [topics, setTopics] = useState<TopicRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyTopicForm);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);

  async function loadTopics() {
    try {
      setLoading(true);
      const res = await fetch("/admin/api/topics", { cache: "no-store" });
      if (!res.ok) throw new Error("Không thể tải danh sách chủ đề.");
      const data = await res.json();
      setTopics(data.topics ?? []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Lỗi khi tải dữ liệu.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTopics();
  }, []);

  function startCreate() {
    setEditingId(null);
    setForm({
      ...emptyTopicForm,
      displayOrder: (topics.length + 1) * 10,
    });
    setError("");
    setNotice("");
    setShowForm(true);
  }

  function startEdit(topic: TopicRecord) {
    setEditingId(topic.id);
    setForm({
      name: topic.name,
      icon: topic.icon,
      detail: topic.detail,
      abbreviations: topic.abbreviations.join(", "),
      keywords: topic.keywords.join(", "),
      situations: topic.situations.join("\n"),
      displayOrder: topic.displayOrder,
      status: topic.status === "archived" ? "draft" : topic.status,
    });
    setError("");
    setNotice("");
    setShowForm(true);
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    setError("");
    setNotice("");
    setSaving(true);

    const payload = {
      id: editingId ?? undefined,
      name: form.name.trim(),
      icon: form.icon.trim() || "◉",
      detail: form.detail.trim(),
      abbreviations: form.abbreviations
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      keywords: form.keywords
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      situations: form.situations
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
      displayOrder: Number(form.displayOrder) || 0,
      status: form.status,
    };

    try {
      const res = await fetch("/admin/api/topics", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Lưu chủ đề thất bại.");

      setNotice(editingId ? "Đã cập nhật chủ đề." : "Đã tạo chủ đề mới.");
      setShowForm(false);
      setEditingId(null);
      await loadTopics();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Đã xảy ra lỗi.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!window.confirm("Bạn có chắc muốn xóa chủ đề này?")) return;
    setError("");
    setNotice("");

    try {
      const res = await fetch(`/admin/api/topics?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Xóa chủ đề thất bại.");
      setNotice("Đã xóa chủ đề.");
      await loadTopics();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Lỗi khi xóa.");
    }
  }

  async function handleSeedDefaults() {
    if (!window.confirm("Nạp lại 5 chủ đề mặc định vào database?")) return;
    try {
      setLoading(true);
      const res = await fetch("/admin/api/topics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "seed_defaults" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Nạp dữ liệu mẫu thất bại.");
      setNotice(`Đã nạp ${data.seededCount} chủ đề vào database.`);
      setTopics(data.topics ?? []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Lỗi nạp dữ liệu.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header card */}
      <section className="bg-white rounded-xl border border-stone-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <span className="text-amber-500 font-bold">★</span>
            Quản lý Chủ đề &amp; Lĩnh vực pháp luật
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Quản lý các mảng pháp luật, từ khóa tra cứu gợi ý và câu hỏi mẫu hiển thị cho học sinh - sinh viên.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleSeedDefaults}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-stone-300 rounded-lg hover:bg-stone-50 transition shadow-2xs cursor-pointer"
          >
            Nạp 5 chủ đề mặc định
          </button>
          <button
            type="button"
            onClick={startCreate}
            className="px-4 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-lg shadow-sm transition cursor-pointer"
          >
            + Thêm chủ đề mới
          </button>
        </div>
      </section>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center justify-between">
          <span>{error}</span>
          <button type="button" onClick={() => setError("")} className="text-rose-500 hover:text-rose-800">✕</button>
        </div>
      )}
      {notice && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center justify-between">
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice("")} className="text-emerald-500 hover:text-emerald-800">✕</button>
        </div>
      )}

      {/* Form Drawer / Card */}
      {showForm && (
        <form onSubmit={handleSave} className="bg-white rounded-xl border border-sky-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900">
              {editingId ? "Chỉnh sửa chủ đề" : "Thêm chủ đề mới"}
            </h3>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800"
            >
              Đóng
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Tên chủ đề / Lĩnh vực</label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full border border-stone-300 rounded-lg p-2 text-xs bg-white focus:ring-2 focus:ring-sky-500 outline-none"
                placeholder="VD: Phòng chống ma túy"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Icon đại diện</label>
              <input
                maxLength={4}
                value={form.icon}
                onChange={(e) => setForm({ ...form, icon: e.target.value })}
                className="w-full border border-stone-300 rounded-lg p-2 text-xs bg-white focus:ring-2 focus:ring-sky-500 outline-none"
                placeholder="VD: ◉ hoặc ⚠"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Trạng thái</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as any })}
                className="w-full border border-stone-300 rounded-lg p-2 text-xs bg-white focus:ring-2 focus:ring-sky-500 outline-none"
              >
                <option value="published">Đã xuất bản (Công khai)</option>
                <option value="draft">Bản nháp</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Mô tả tóm tắt (detail)</label>
            <input
              value={form.detail}
              onChange={(e) => setForm({ ...form, detail: e.target.value })}
              className="w-full border border-stone-300 rounded-lg p-2 text-xs bg-white focus:ring-2 focus:ring-sky-500 outline-none"
              placeholder="VD: Tác hại & nhận biết chất gây nghiện"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Từ viết tắt (cách nhau dấu phẩy)</label>
              <input
                value={form.abbreviations}
                onChange={(e) => setForm({ ...form, abbreviations: e.target.value })}
                className="w-full border border-stone-300 rounded-lg p-2 text-xs bg-white focus:ring-2 focus:ring-sky-500 outline-none"
                placeholder="VD: pcmt, pcmthd"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Thứ tự hiển thị (display order)</label>
              <input
                type="number"
                value={form.displayOrder}
                onChange={(e) => setForm({ ...form, displayOrder: Number(e.target.value) })}
                className="w-full border border-stone-300 rounded-lg p-2 text-xs bg-white focus:ring-2 focus:ring-sky-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Từ khóa tra cứu mở rộng (cách nhau dấu phẩy)</label>
            <textarea
              rows={2}
              value={form.keywords}
              onChange={(e) => setForm({ ...form, keywords: e.target.value })}
              className="w-full border border-stone-300 rounded-lg p-2 text-xs bg-white focus:ring-2 focus:ring-sky-500 outline-none"
              placeholder="VD: ma túy, cần sa, thuốc lá điện tử, bóng cười"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Câu hỏi gợi ý tình huống mẫu (mỗi dòng một câu)</label>
            <textarea
              rows={3}
              value={form.situations}
              onChange={(e) => setForm({ ...form, situations: e.target.value })}
              className="w-full border border-stone-300 rounded-lg p-2 text-xs bg-white focus:ring-2 focus:ring-sky-500 outline-none"
              placeholder="Bị bạn rủ dùng thử thuốc lá điện tử có bị phạt không?&#10;Phát hiện chất lạ trong trường báo ai?"
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-lg shadow-sm transition disabled:opacity-60 cursor-pointer"
            >
              {saving ? "Đang lưu..." : editingId ? "Cập nhật chủ đề" : "Tạo chủ đề"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-3 py-2 text-xs font-semibold text-slate-600 bg-white border border-stone-300 rounded-lg hover:bg-stone-50 transition cursor-pointer"
            >
              Hủy
            </button>
          </div>
        </form>
      )}

      {/* Topics list */}
      <section className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-stone-50/80 border-b border-stone-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="py-3.5 px-4 w-14">Icon</th>
                <th className="py-3.5 px-4">Tên chủ đề / Lĩnh vực</th>
                <th className="py-3.5 px-4">Từ viết tắt &amp; Từ khóa</th>
                <th className="py-3.5 px-4">Câu hỏi mẫu</th>
                <th className="py-3.5 px-4 w-28">Trạng thái</th>
                <th className="py-3.5 px-4 w-32 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    Đang tải danh sách chủ đề…
                  </td>
                </tr>
              ) : topics.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    Chưa có chủ đề nào trong database. Hãy bấm "Nạp 5 chủ đề mặc định" ở trên.
                  </td>
                </tr>
              ) : (
                topics.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-4 px-4 align-top font-bold text-base text-slate-700">
                      {item.icon}
                    </td>
                    <td className="py-4 px-4 align-top max-w-xs">
                      <p className="font-bold text-slate-900 text-sm">{item.name}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">{item.detail}</p>
                      <p className="text-[10px] text-slate-400 font-mono mt-1">Thứ tự: {item.displayOrder}</p>
                    </td>
                    <td className="py-4 px-4 align-top max-w-sm">
                      {item.abbreviations.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-1">
                          {item.abbreviations.map((abbr) => (
                            <span key={abbr} className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 text-[10px] font-mono font-semibold">
                              {abbr}
                            </span>
                          ))}
                        </div>
                      )}
                      <p className="text-slate-600 line-clamp-2 text-[11px]">
                        {item.keywords.join(", ")}
                      </p>
                    </td>
                    <td className="py-4 px-4 align-top max-w-xs">
                      <span className="text-[11px] font-semibold text-slate-700 block">
                        {item.situations.length} câu gợi ý:
                      </span>
                      <ul className="list-disc pl-4 text-[10px] text-slate-500 line-clamp-2 space-y-0.5">
                        {item.situations.map((sit, i) => (
                          <li key={i}>{sit}</li>
                        ))}
                      </ul>
                    </td>
                    <td className="py-4 px-4 align-top">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        item.status === "published"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                          : "bg-slate-100 text-slate-600"
                      }`}>
                        {item.status === "published" ? "Đã xuất bản" : "Bản nháp"}
                      </span>
                    </td>
                    <td className="py-4 px-4 align-top text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => startEdit(item)}
                          className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 shadow-2xs cursor-pointer"
                        >
                          Sửa
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(item.id)}
                          className="px-2.5 py-1 text-xs font-semibold text-rose-700 bg-white border border-rose-200 rounded hover:bg-rose-50 shadow-2xs cursor-pointer"
                        >
                          Xóa
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
```

Trong `app/admin/AdminDashboard.tsx`:
- Mở rộng type `Entity`: `type Entity = "law" | "showcase" | "candidate" | "game" | "link_health" | "topic";`
- Thêm mục "Chủ đề & Lĩnh vực" trong menu Sidebar dưới nhóm "QUẢN LÝ NỘI DUNG".
- Thêm nút tab "Chủ đề & Lĩnh vực" trong dải sub-nav pills.
- Render `<TopicManager />` khi `tab === "topic"`.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/topic-manager-ui.test.mjs`
Expected: PASS (all tests pass).

- [ ] **Step 5: Commit**

```bash
git add app/admin/TopicManager.tsx app/admin/AdminDashboard.tsx tests/topic-manager-ui.test.mjs
git commit -m "feat(admin): integrate TopicManager into Admin dashboard and left sidebar"
```

---

### Task 6: Documentation, Progress Tracking & Final Verification

**Files:**
- Modify: `docs/USER_STORIES.md`
- Modify: `docs/TECHNICAL_SPEC.md`
- Modify: `docs/PROGRESS.md`

- [ ] **Step 1: Add US-047 to `docs/USER_STORIES.md`**
```markdown
### US-047 — Quản lý chủ đề và lưu trữ vào cơ sở dữ liệu
- **Là:** Quản trị viên hệ thống
- **Tôi muốn:** Quản lý danh sách chủ đề/lĩnh vực pháp lý (thêm mới, sửa thông tin, cấu hình từ khóa, câu hỏi mẫu, sắp xếp thứ tự) qua giao diện Admin và lưu trữ lâu dài vào cơ sở dữ liệu
- **Để:** Linh hoạt mở rộng các lĩnh vực tuyên truyền mới mà không phải sửa mã nguồn cứng.

Acceptance Criteria:
- [x] Bảng `content_topics` trong PostgreSQL lưu trữ đầy đủ `name`, `icon`, `detail`, `abbreviations`, `keywords`, `situations`, `display_order`, `status`.
- [x] Script `seed:topics` nạp bộ 5 chủ đề mặc định vào database an toàn, idempotent.
- [x] Tầng lưu trữ `lib/topic-store.ts` tự động fallback về bộ tĩnh `lib/topics.ts` khi DB trống hoặc ngoại tuyến.
- [x] API quản trị `/admin/api/topics` hỗ trợ đầy đủ các thao tác GET, POST, PUT, DELETE có kiểm tra quyền.
- [x] Giao diện `TopicManager.tsx` hiển thị chuẩn theo phong cách Stitch Design, tích hợp trong Left Sidebar của Admin.
```

- [ ] **Step 2: Update `docs/TECHNICAL_SPEC.md` and `docs/PROGRESS.md`**
Ghi nhận DEC-028 và cập nhật bảng tổng kết tiến độ.

- [ ] **Step 3: Run full verification suite**
Run:
```bash
npx tsc --noEmit
npm run test
```
Expected: PASS 100% tests, 0 type errors.

- [ ] **Step 4: Commit**
```bash
git add docs/USER_STORIES.md docs/TECHNICAL_SPEC.md docs/PROGRESS.md
git commit -m "docs: document US-047 and DEC-028 topic management in database"
```
