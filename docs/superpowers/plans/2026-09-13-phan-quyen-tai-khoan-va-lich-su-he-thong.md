# Phân Quyền & Quản Lý Tài Khoản Theo Chuyên Mục Kèm Lịch Sử Hệ Thống (Audit History) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Xây dựng hệ thống quản lý tài khoản quản trị và phân quyền chi tiết theo từng chuyên mục (Topic-Based RBAC), đồng thời ghi lại và hiển thị toàn bộ lịch sử thao tác hệ thống (Audit Logs) cho quản trị viên.

**Architecture:** Bổ sung hai bảng cơ sở dữ liệu PostgreSQL `admin_accounts` và `system_audit_logs` thông qua bootstrap migration idempotent. Tầng dịch vụ `account-store.ts` và `audit-log-store.ts` quản lý nghiệp vụ tài khoản, phân quyền chuyên mục, kiểm tra quyền hạn và ghi log bất biến (append-only). Tầng API `/admin/api/accounts` và `/admin/api/audit-logs` cung cấp endpoint quản trị bảo mật; hai module giao diện CMS `AccountManager.tsx` và `AuditLogManager.tsx` được tích hợp vào `AdminDashboard.tsx`.

**Tech Stack:** Next.js 15 (App Router), TypeScript, PostgreSQL / Neon (Drizzle ORM DDL), PBKDF2 Web Crypto (`lib/password-hash.ts`), Tailwind CSS, `react-icons/fa6`, Node.js Test Runner.

## Global Constraints

- Mọi câu lệnh SQL trong `pg-bootstrap.ts` phải idempotent (`CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`).
- Tài khoản quản trị mặc định trong `.env` (`ADMIN_USERNAME`, `ADMIN_PASSWORD`) tiếp tục hoạt động với vai trò `admin` và toàn quyền (`allowedTopics = ["*"]`).
- Mật khẩu tài khoản mới phải được băm an toàn qua PBKDF2/SHA-256 (`lib/password-hash.ts`), tuyệt đối không lưu plaintext.
- Thao tác thay đổi quyền, tạo/sửa/xóa tài khoản, thêm/sửa/xóa nội dung, đăng nhập/đăng xuất đều phải được ghi log vào `system_audit_logs`.
- Toàn bộ 530 bài kiểm thử hiện có phải tiếp tục vượt qua 100% không hồi quy; `npx tsc --noEmit` đạt 0 lỗi; `app/page.tsx` duy trì dưới 990 dòng.

---

### Task 1: Thiết kế Cơ sở dữ liệu cho Tài khoản Quản trị & Nhật ký Kiểm toán (Schema & Bootstrap Migration)

**Files:**
- Modify: `db/pg-schema.ts:375-385`
- Modify: `db/pg-bootstrap.ts:880-925`
- Test: `tests/admin-accounts-schema.test.mjs`

**Interfaces:**
- Produces:
  - `adminAccounts`: bảng lưu tài khoản quản trị viên và biên tập viên
  - `systemAuditLogs`: bảng lưu nhật ký kiểm toán hệ thống
  - `pgSchemaVersion`: cập nhật lên `"2026-09-13-rbac-and-audit-v1"`

- [x] **Step 1: Viết bài kiểm thử thất bại cho Schema `admin_accounts` và `system_audit_logs`**

Tạo tệp `tests/admin-accounts-schema.test.mjs`:
```javascript
import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

test("pg-schema defines adminAccounts and systemAuditLogs tables", () => {
  const schemaCode = readFileSync("db/pg-schema.ts", "utf8");
  assert.equal(schemaCode.includes("export const adminAccounts = pgTable("), true);
  assert.equal(schemaCode.includes("export const systemAuditLogs = pgTable("), true);
  assert.equal(schemaCode.includes("allowedTopics"), true);
  assert.equal(schemaCode.includes("actorRole"), true);
});

test("pg-bootstrap includes tables creation and bumped version", () => {
  const bootstrapCode = readFileSync("db/pg-bootstrap.ts", "utf8");
  assert.equal(bootstrapCode.includes("createAdminAccountsTable"), true);
  assert.equal(bootstrapCode.includes("createSystemAuditLogsTable"), true);
  assert.equal(bootstrapCode.includes("2026-09-13-rbac-and-audit-v1"), true);
});
```

- [x] **Step 2: Chạy kiểm thử để xác nhận thất bại**

Run: `node --test tests/admin-accounts-schema.test.mjs`
Expected: FAIL (các bảng và version mới chưa tồn tại)

- [x] **Step 3: Cập nhật `db/pg-schema.ts`**

Thêm định nghĩa bảng `adminAccounts` và `systemAuditLogs` vào cuối tệp `db/pg-schema.ts`:
```typescript
// Tài khoản quản trị & biên tập viên (US-050).
export const adminAccounts = pgTable("admin_accounts", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  fullName: text("full_name").notNull(),
  passwordHash: text("password_hash").notNull(),
  role: text("role", { enum: ["admin", "editor", "viewer"] })
    .notNull()
    .default("editor"),
  allowedTopics: text("allowed_topics").notNull().default("[]"),
  status: text("status", { enum: ["active", "disabled"] })
    .notNull()
    .default("active"),
  lastLoginAt: text("last_login_at"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(now())::text`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(now())::text`),
});

// Nhật ký kiểm toán hệ thống (Audit Logs) (US-050).
export const systemAuditLogs = pgTable("system_audit_logs", {
  id: serial("id").primaryKey(),
  actor: text("actor").notNull(),
  actorRole: text("actor_role").notNull().default("editor"),
  action: text("action").notNull(),
  targetType: text("target_type").notNull(),
  targetId: text("target_id").notNull().default(""),
  details: text("details").notNull().default(""),
  ipAddress: text("ip_address"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(now())::text`),
});
```

- [x] **Step 4: Cập nhật `db/pg-bootstrap.ts`**

Thêm câu lệnh DDL `createAdminAccountsTable` và `createSystemAuditLogsTable`, nâng cấp `pgSchemaVersion` lên `"2026-09-13-rbac-and-audit-v1"` và thêm vào `pgBootstrapStatements`.

- [x] **Step 5: Chạy kiểm thử để xác nhận vượt qua**

Run: `node --test tests/admin-accounts-schema.test.mjs`
Expected: PASS

- [x] **Step 6: Commit**

```bash
git add db/pg-schema.ts db/pg-bootstrap.ts tests/admin-accounts-schema.test.mjs
git commit -m "feat: add admin accounts and audit logs schema in postgres"
```

---

### Task 2: Xây dựng Tầng Nghiệp vụ Lưu Trữ Tài Khoản & Nhật Ký Kiểm Toán (`lib/account-store.ts` & `lib/audit-log-store.ts`)

**Files:**
- Create: `lib/account-store.ts`
- Create: `lib/audit-log-store.ts`
- Modify: `lib/admin-auth.ts:135-225`
- Test: `tests/account-and-audit-store.test.mjs`

**Interfaces:**
- Consumes: `adminAccounts`, `systemAuditLogs` từ `@/db/pg-schema`, `hashAdminPassword`, `verifyAdminPassword` từ `@/lib/password-hash`
- Produces:
  - `lib/account-store.ts`:
    - `listAdminAccounts(): Promise<AdminAccountRecord[]>`
    - `getAdminAccountByUsername(username: string): Promise<AdminAccountRecord | null>`
    - `createAdminAccount(input): Promise<AdminAccountRecord>`
    - `updateAdminAccount(id, input): Promise<AdminAccountRecord | null>`
    - `deleteAdminAccount(id: number): Promise<boolean>`
    - `canAccessTopic(actor: { role: string; allowedTopics: string[] }, topic: string): boolean`
    - `seedDefaultAdminAccounts(): Promise<void>`
  - `lib/audit-log-store.ts`:
    - `recordAuditEvent(event: AuditEventInput): Promise<AuditLogRecord>`
    - `queryAuditLogs(filters: AuditLogFilters): Promise<{ logs: AuditLogRecord[]; total: number }>`
  - `lib/admin-auth.ts`:
    - Mở rộng `AdminSessionActor` bao gồm `role: string` và `allowedTopics: string[]`.

- [x] **Step 1: Viết bài kiểm thử thất bại cho `account-store` và `audit-log-store`**

Tạo tệp `tests/account-and-audit-store.test.mjs`:
```javascript
import assert from "node:assert/strict";
import test from "node:test";
import {
  canAccessTopic,
  listAdminAccounts,
  createAdminAccount,
  updateAdminAccount,
  deleteAdminAccount,
} from "../lib/account-store.ts";
import {
  recordAuditEvent,
  queryAuditLogs,
} from "../lib/audit-log-store.ts";

test("canAccessTopic allows admin everything and editors only allowed topics", () => {
  const admin = { role: "admin", allowedTopics: [] };
  assert.equal(canAccessTopic(admin, "Giao thông"), true);
  assert.equal(canAccessTopic(admin, "Bất kỳ chủ đề nào"), true);

  const editor = { role: "editor", allowedTopics: ["Giao thông", "Mạng xã hội"] };
  assert.equal(canAccessTopic(editor, "Giao thông"), true);
  assert.equal(canAccessTopic(editor, "Mạng xã hội"), true);
  assert.equal(canAccessTopic(editor, "Bạo lực học đường"), false);

  const superEditor = { role: "editor", allowedTopics: ["*"] };
  assert.equal(canAccessTopic(superEditor, "Bạo lực học đường"), true);
});

test("account-store provides CRUD operations", async () => {
  const newAccount = await createAdminAccount({
    username: `test_editor_${Date.now()}`,
    fullName: "Biên tập viên thử nghiệm",
    password: "Password123@",
    role: "editor",
    allowedTopics: ["Giao thông"],
    status: "active",
  });
  assert.ok(newAccount.id);
  assert.equal(newAccount.role, "editor");
  assert.deepEqual(newAccount.allowedTopics, ["Giao thông"]);

  const updated = await updateAdminAccount(newAccount.id, {
    fullName: "Tên đã cập nhật",
    allowedTopics: ["Giao thông", "Mạng xã hội"],
  });
  assert.equal(updated.fullName, "Tên đã cập nhật");
  assert.equal(updated.allowedTopics.length, 2);

  const deleted = await deleteAdminAccount(newAccount.id);
  assert.equal(deleted, true);
});

test("audit-log-store records and queries audit events", async () => {
  await recordAuditEvent({
    actor: "admin_test",
    actorRole: "admin",
    action: "TEST_ACTION",
    targetType: "topic",
    targetId: "Giao thông",
    details: "Thao tác kiểm thử ghi log",
  });

  const results = await queryAuditLogs({ action: "TEST_ACTION", limit: 10 });
  assert.ok(results.logs.length >= 1);
  const found = results.logs.find((l) => l.action === "TEST_ACTION");
  assert.ok(found);
  assert.equal(found.actor, "admin_test");
});
```

- [x] **Step 2: Chạy kiểm thử để xác nhận thất bại**

Run: `node --test tests/account-and-audit-store.test.mjs`
Expected: FAIL (module chưa tồn tại)

- [x] **Step 3: Cài đặt `lib/audit-log-store.ts`**

Viết hàm `recordAuditEvent` và `queryAuditLogs` tương tác với Neon/Postgres, có fallback an toàn bộ nhớ khi chạy offline hoặc test runner không kết nối DB.

- [x] **Step 4: Cài đặt `lib/account-store.ts`**

Viết `canAccessTopic`, `listAdminAccounts`, `getAdminAccountByUsername`, `createAdminAccount`, `updateAdminAccount`, `deleteAdminAccount`, và `seedDefaultAdminAccounts` (tự động nạp tài khoản admin gốc nếu DB chưa có tài khoản nào).

- [x] **Step 5: Cập nhật `lib/admin-auth.ts`**

Bổ sung kiểm tra thông tin đăng nhập đối chiếu với `admin_accounts` trong database trước khi fallback về env; mã hóa vai trò `role` và `allowedTopics` vào `AdminSessionActor` trong payload session.

- [x] **Step 6: Chạy kiểm thử để xác nhận vượt qua**

Run: `node --test tests/account-and-audit-store.test.mjs`
Expected: PASS

- [x] **Step 7: Commit**

```bash
git add lib/account-store.ts lib/audit-log-store.ts lib/admin-auth.ts tests/account-and-audit-store.test.mjs
git commit -m "feat: implement account management, topic authorization and audit log store"
```

---

### Task 3: Xây dựng Admin APIs Cho Quản Lý Tài Khoản, Phân Quyền & Lịch Sử Hệ Thống

**Files:**
- Create: `app/admin/api/accounts/route.ts`
- Create: `app/admin/api/audit-logs/route.ts`
- Modify: `app/admin/api/content/route.ts`
- Modify: `app/admin/api/login/route.ts`
- Modify: `app/admin/api/logout/route.ts`
- Test: `tests/admin-accounts-api.test.mjs`

**Interfaces:**
- Consumes: `lib/account-store.ts`, `lib/audit-log-store.ts`, `lib/admin-auth.ts`
- Produces:
  - `GET /admin/api/accounts`: Trả về danh sách tài khoản (chỉ role `admin` mới được gọi)
  - `POST /admin/api/accounts`: Tạo tài khoản mới kèm phân quyền chuyên mục
  - `PUT /admin/api/accounts`: Cập nhật tài khoản, mật khẩu, trạng thái, phân quyền chuyên mục
  - `DELETE /admin/api/accounts`: Xóa tài khoản (chặn tự xóa chính mình)
  - `GET /admin/api/audit-logs`: Truy vấn lịch sử hệ thống kèm phân trang và bộ lọc
  - Bảo vệ phân quyền chuyên mục trong `app/admin/api/content/route.ts`

- [x] **Step 1: Viết bài kiểm thử thất bại cho các API Tài khoản & Audit Logs**

Tạo tệp `tests/admin-accounts-api.test.mjs`:
```javascript
import assert from "node:assert/strict";
import test from "node:test";
import { GET as getAccounts, POST as postAccount } from "../app/admin/api/accounts/route.ts";
import { GET as getAuditLogs } from "../app/admin/api/audit-logs/route.ts";

test("Accounts API requires admin authentication", async () => {
  const unauthRequest = new Request("http://localhost:3000/admin/api/accounts", {
    method: "GET",
  });
  const res = await getAccounts(unauthRequest);
  assert.equal(res.status, 401);
});

test("Audit logs API requires admin authentication", async () => {
  const unauthRequest = new Request("http://localhost:3000/admin/api/audit-logs", {
    method: "GET",
  });
  const res = await getAuditLogs(unauthRequest);
  assert.equal(res.status, 401);
});
```

- [x] **Step 2: Chạy kiểm thử để xác nhận thất bại**

Run: `node --test tests/admin-accounts-api.test.mjs`
Expected: FAIL (các route chưa được tạo)

- [x] **Step 3: Cài đặt `app/admin/api/accounts/route.ts`**

Xử lý `GET`, `POST`, `PUT`, `DELETE` với kiểm tra session, chỉ cho phép vai trò `admin` quản lý tài khoản; tự động ghi nhận sự kiện vào `audit-log-store`.

- [x] **Step 4: Cài đặt `app/admin/api/audit-logs/route.ts`**

Xử lý `GET` lấy danh sách log có phân trang, hỗ trợ lọc theo: `action`, `actor`, `targetType`, `search`. Chỉ cho phép vai trò `admin` truy cập.

- [x] **Step 5: Tích hợp ghi log và kiểm tra phân quyền chuyên mục trong `content/route.ts`, `login/route.ts`, `logout/route.ts`**

- Trong `content/route.ts`: Khi `POST` hoặc `PUT` hoặc `DELETE`, kiểm tra nếu actor là `editor` thì `canAccessTopic(actor, item.topic)` phải là `true`; nếu vi phạm, trả về HTTP 403 Forbidden.
- Trong `login/route.ts`: Ghi nhận sự kiện `LOGIN` vào audit logs.
- Trong `logout/route.ts`: Ghi nhận sự kiện `LOGOUT` vào audit logs.

- [x] **Step 6: Chạy kiểm thử để xác nhận vượt qua**

Run: `node --test tests/admin-accounts-api.test.mjs`
Expected: PASS

- [x] **Step 7: Commit**

```bash
git add app/admin/api/accounts/route.ts app/admin/api/audit-logs/route.ts app/admin/api/content/route.ts app/admin/api/login/route.ts app/admin/api/logout/route.ts tests/admin-accounts-api.test.mjs
git commit -m "feat: implement accounts and audit logs admin api with rbac guard"
```

---

### Task 4: Xây dựng Giao diện Quản lý Tài khoản, Phân quyền & Lịch sử Hệ thống (`AccountManager.tsx` & `AuditLogManager.tsx`)

**Files:**
- Create: `app/admin/AccountManager.tsx`
- Create: `app/admin/AuditLogManager.tsx`
- Modify: `app/admin/AdminDashboard.tsx:15-30,810-840,1100-1170`
- Test: `tests/admin-accounts-ui.test.mjs`

**Interfaces:**
- Consumes: `@/components/TopicIcon`, React-Icons (`fa6`), APIs `/admin/api/accounts`, `/admin/api/audit-logs`
- Produces:
  - `AccountManager`: Giao diện danh sách tài khoản, thẻ KPI, modal thêm/sửa, bảng chọn phân quyền chuyên mục theo checkbox/chips trực quan.
  - `AuditLogManager`: Giao diện dòng thời gian lịch sử hệ thống, thẻ KPI, thanh tìm kiếm và lọc theo loại thao tác/người dùng.
  - Cập nhật `AdminDashboard.tsx` tích hợp 2 tab mới với phân quyền hiển thị theo vai trò người dùng.

- [x] **Step 1: Viết bài kiểm thử thất bại cho component UI Quản lý Tài khoản & Audit Logs**

Tạo tệp `tests/admin-accounts-ui.test.mjs`:
```javascript
import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

test("AccountManager and AuditLogManager components exist and export valid components", () => {
  const accountCode = readFileSync("app/admin/AccountManager.tsx", "utf8");
  assert.equal(accountCode.includes("export function AccountManager"), true);
  assert.equal(accountCode.includes("Phân quyền chuyên mục"), true);
  assert.equal(accountCode.includes("allowedTopics"), true);

  const auditCode = readFileSync("app/admin/AuditLogManager.tsx", "utf8");
  assert.equal(auditCode.includes("export function AuditLogManager"), true);
  assert.equal(auditCode.includes("Lịch sử hệ thống"), true);
});

test("AdminDashboard integrates AccountManager and AuditLogManager tabs", () => {
  const dashCode = readFileSync("app/admin/AdminDashboard.tsx", "utf8");
  assert.equal(dashCode.includes("AccountManager"), true);
  assert.equal(dashCode.includes("AuditLogManager"), true);
  assert.equal(dashCode.includes('tab === "accounts"'), true);
  assert.equal(dashCode.includes('tab === "audit_logs"'), true);
});
```

- [x] **Step 2: Chạy kiểm thử để xác nhận thất bại**

Run: `node --test tests/admin-accounts-ui.test.mjs`
Expected: FAIL (các component chưa tồn tại)

- [x] **Step 3: Cài đặt `app/admin/AccountManager.tsx`**

Xây dựng component quản lý tài khoản:
- Thẻ KPI: Tổng tài khoản, Quản trị viên, Biên tập viên, Đang hoạt động.
- Bảng danh sách tài khoản: Username, Họ tên, Vai trò, Chuyên mục được cấp quyền (chips màu), Trạng thái, Thao tác (Sửa, Xóa, Đổi mật khẩu).
- Modal Thêm / Chỉnh sửa:
  - Form nhập thông tin.
  - Lưới chọn chuyên mục (từ 10 chuyên đề hiện có): có nút "Chọn tất cả" / "Bỏ chọn".
  - Nút lưu có trạng thái loading spinner.

- [x] **Step 4: Cài đặt `app/admin/AuditLogManager.tsx`**

Xây dựng component nhật ký kiểm toán:
- Thẻ KPI: Tổng lượt ghi nhận, Thao tác nội dung, Cập nhật phân quyền, Đăng nhập.
- Thanh lọc & tìm kiếm: Lọc theo Hành động (`CREATE`, `UPDATE`, `DELETE`, `LOGIN`, `PERM_CHANGE`), tìm kiếm theo từ khóa.
- Bảng nhật ký chi tiết: Thời gian định dạng thân thiện, Người thực hiện kèm badge vai trò, Hành động với màu sắc nhận diện, Đối tượng tác động, Mô tả chi tiết hành động.

- [x] **Step 5: Tích hợp vào `app/admin/AdminDashboard.tsx`**

- Mở rộng `type Entity` thêm `"accounts" | "audit_logs"`.
- Bổ sung 2 mục điều hướng vào Sidebar với icon đẹp mắt (`FaUsersGear` và `FaClockRotateLeft`).
- Hiển thị thông tin phiên người dùng và phân quyền theo vai trò (nếu `editor` thì chỉ hiển thị các tab nội dung và các chuyên mục được cấp quyền).

- [x] **Step 6: Chạy kiểm thử để xác nhận vượt qua**

Run: `node --test tests/admin-accounts-ui.test.mjs`
Expected: PASS

- [x] **Step 7: Commit**

```bash
git add app/admin/AccountManager.tsx app/admin/AuditLogManager.tsx app/admin/AdminDashboard.tsx tests/admin-accounts-ui.test.mjs
git commit -m "feat: add AccountManager and AuditLogManager in AdminDashboard"
```

---

### Task 5: Kiểm Thử E2E Toàn Diện, Cập Nhật Tài Liệu & Nghiệm Thu

**Files:**
- Create: `tests/rbac-and-audit-e2e.test.mjs`
- Modify: `docs/USER_STORIES.md`
- Modify: `docs/PROGRESS.md`
- Modify: `docs/TECHNICAL_SPEC.md`

**Interfaces:**
- Consumes: Toàn bộ hệ thống xác thực, phân quyền chuyên mục và nhật ký hệ thống
- Produces: Bằng chứng kiểm thử hoàn tất 100% cho US-050

- [x] **Step 1: Viết bài kiểm thử tích hợp E2E**

Tạo tệp `tests/rbac-and-audit-e2e.test.mjs`:
- Kiểm tra luồng tạo tài khoản biên tập viên chỉ định 2 chuyên mục ("Giao thông", "Mạng xã hội").
- Kiểm tra việc ghi nhận tự động vào bảng audit log khi tạo tài khoản.
- Kiểm tra biên tập viên được phép cập nhật bài viết chuyên đề "Giao thông" nhưng bị chặn khi cố cập nhật bài viết chuyên đề "Bạo lực học đường" (HTTP 403).
- Kiểm tra truy vấn danh sách audit logs phản ánh chính xác các sự kiện vừa diễn ra.

- [x] **Step 2: Chạy kiểm thử E2E**

Run: `node --test tests/rbac-and-audit-e2e.test.mjs`
Expected: PASS

- [x] **Step 3: Cập nhật tài liệu dự án**

- `docs/USER_STORIES.md`: Thêm `US-050 — Phân quyền tài khoản theo chuyên mục & Nhật ký hệ thống`.
- `docs/PROGRESS.md`: Cập nhật bảng theo dõi tiến độ và các quyết định kỹ thuật mới.
- `docs/TECHNICAL_SPEC.md`: Ghi nhận kiến trúc phân quyền Topic-Based RBAC và lưu trữ Audit Logs.

- [x] **Step 4: Chạy toàn bộ Test Suite và Typecheck**

Run:
```bash
npx tsc --noEmit
npm test
```
Expected: `npx tsc --noEmit` 0 lỗi; toàn bộ test suite pass 100%.

- [x] **Step 5: Commit**

```bash
git add tests/rbac-and-audit-e2e.test.mjs docs/USER_STORIES.md docs/PROGRESS.md docs/TECHNICAL_SPEC.md
git commit -m "docs: complete US-050 documentation and e2e test suite"
```
