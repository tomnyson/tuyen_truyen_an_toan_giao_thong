# US-049: Kho Văn Bản Pháp Luật & Công Cụ Kiểm Tra Link (Check-Link 404) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Xây dựng chuyên mục "Kho văn bản pháp luật" trong Admin CMS và giao diện tra cứu công khai cho học sinh/giáo viên, cho phép thêm, tìm kiếm luật/nghị định/thông tư theo từ khóa, lĩnh vực, cơ quan ban hành; tích hợp công cụ kiểm tra liên kết (Check Link) tự động phát hiện link chết/404/hết hạn và cảnh báo trực quan cho Quản trị viên.

**Architecture:** 
- Bổ sung bảng `legal_documents` trong PostgreSQL schema (Drizzle ORM) và idempotent DDL migration trong `db/pg-bootstrap.ts`.
- Tầng lưu trữ `lib/legal-document-store.ts` cung cấp nghiệp vụ CRUD, tra cứu đa tiêu chí và nạp dữ liệu mẫu văn bản từ Cổng TTĐT Chính phủ (`vanban.chinhphu.vn`, `chinhphu.vn`, `vbpl.vn`).
- Tích hợp engine `checkSingleLink` từ `lib/link-checker.ts` (bảo vệ SSRF, HTTP HEAD/GET, timeout 5s) để kiểm tra tình trạng HTTP (200 OK, 404 Not Found, 301/302 Redirect, Timeout, SSL Error) và lưu vết vào DB.
- Cung cấp API endpoints cho Public (`/api/legal-documents`) và Admin (`/admin/api/legal-documents`, `/admin/api/legal-documents/check-link`).
- Xây dựng component giao diện Admin CMS `app/admin/LegalDocumentManager.tsx` chuẩn Stitch Design (bộ lọc từ khóa, lĩnh vực, cơ quan ban hành, loại văn bản; badge cảnh báo 404 nhấp nháy, nút Check Link đơn lẻ và Check All).
- Tích hợp tab `documents` vào `app/admin/AdminDashboard.tsx` (Left Sidebar và Sub-nav Pills) và phần tra cứu văn bản trên trang chủ `app/page.tsx`.

**Tech Stack:** Next.js 16 (App Router), TypeScript, PostgreSQL (Neon / PGlite), Drizzle ORM, React Icons (fa6), Vanilla CSS (Stitch Design tokens).

## Global Constraints

- Tuân thủ quy ước bàn giao theo tài liệu trong `AGENTS.md` (US-049, cập nhật `USER_STORIES.md`, `TECHNICAL_SPEC.md`, `PROGRESS.md`).
- Toàn bộ liên kết nguồn văn bản chính thống phải thuộc danh sách cơ quan nhà nước uy tín (`vanban.chinhphu.vn`, `chinhphu.vn`, `vbpl.vn`, `moj.gov.vn`).
- Công cụ kiểm tra link phải có SSRF Guard (`isSafeUrlToCheck`) để ngăn chặn tấn công mạng nội bộ hoặc địa chỉ IP loopback.
- Tổng số dòng của `app/page.tsx` phải luôn duy trì **nhỏ hơn 990 dòng** (ràng buộc kiểm thử tự động tại `tests/legal-aid.test.mjs`).
- Mọi thay đổi phải duy trì tỷ lệ vượt qua **100% (520+ tests pass)** trên toàn bộ test suite.

---

### Task 1: Thiết kế Cơ sở dữ liệu & Migration Bảng `legal_documents`

**Files:**
- Modify: `db/pg-schema.ts`
- Modify: `db/pg-bootstrap.ts`
- Test: `tests/legal-documents-schema.test.mjs`

**Interfaces:**
- Produces: `legalDocuments` table definition in `db/pg-schema.ts` with columns:
  - `id`: serial PK
  - `title`: text (tên văn bản)
  - `documentNumber`: text (số hiệu, vd: 168/2024/NĐ-CP)
  - `documentType`: text enum ('luat', 'nghi_dinh', 'thong_tu', 'quyet_dinh', 'van_ban_hop_nhat', 'khac')
  - `topic`: text (lĩnh vực / chuyên đề)
  - `issuingAuthority`: text (cơ quan ban hành: Chính phủ, Quốc hội, Bộ Công an, Bộ GD&ĐT...)
  - `officialUrl`: text (đường link gốc https)
  - `summary`: text default ''
  - `effectivityStatus`: text default 'in_force' ('in_force', 'expired', 'superseded', 'draft')
  - `status`: text default 'published' ('published', 'draft', 'archived')
  - `linkStatus`: text default 'unchecked' ('ok', 'broken', 'redirect', 'timeout', 'unchecked')
  - `httpStatus`: integer nullable
  - `lastCheckedAt`: text nullable
  - `displayOrder`: integer default 0
  - `createdAt`: text default now()
  - `updatedAt`: text default now()

- [x] **Step 1: Viết failing test kiểm tra schema và migration DDL**
- [x] **Step 2: Chạy test để xác nhận test thất bại**
- [x] **Step 3: Khai báo bảng `legalDocuments` trong `db/pg-schema.ts`**
- [x] **Step 4: Khai báo DDL trong `db/pg-bootstrap.ts` và nâng `pgSchemaVersion`**
- [x] **Step 5: Chạy test để xác nhận test thành công**

---

### Task 2: Tầng Lưu Trữ & Nghiệp Vụ Quản Lý Kho Văn Bản (`lib/legal-document-store.ts`)

**Files:**
- Create: `lib/legal-document-store.ts`
- Create: `db/seeds/demo-documents.ts`
- Test: `tests/legal-document-store.test.mjs`

**Interfaces:**
- Consumes: `legalDocuments` from `db/pg-schema.ts`, `checkSingleLink` from `lib/link-checker.ts`.
- Produces:
  - `listLegalDocuments(filter, db): Promise<LegalDocumentRecord[]>`
  - `getLegalDocumentById(id, db): Promise<LegalDocumentRecord | null>`
  - `createLegalDocument(input, db): Promise<LegalDocumentRecord>`
  - `updateLegalDocument(id, input, db): Promise<LegalDocumentRecord>`
  - `deleteLegalDocument(id, db): Promise<{ success: boolean }>`
  - `checkAndUpdateDocumentLink(id, db): Promise<{ result: LinkCheckResult, document: LegalDocumentRecord }>`
  - `seedDefaultLegalDocuments(db): Promise<{ inserted: number, updated: number }>`

- [x] **Step 1: Tạo dữ liệu mẫu văn bản chính thống trong `db/seeds/demo-documents.ts`**
- [x] **Step 2: Viết failing test cho `lib/legal-document-store.ts`**
- [x] **Step 3: Viết triển khai `lib/legal-document-store.ts`**
- [x] **Step 4: Chạy test để xác nhận test thành công**

---

### Task 3: Xây dựng Public & Admin API Endpoints

**Files:**
- Create: `app/api/legal-documents/route.ts`
- Create: `app/admin/api/legal-documents/route.ts`
- Create: `app/admin/api/legal-documents/check-link/route.ts`
- Test: `tests/legal-documents-api.test.mjs`

**Interfaces:**
- `GET /api/legal-documents`: Public API tra cứu văn bản (query: `q`, `topic`, `type`, `authority`).
- `GET /admin/api/legal-documents`: Admin API (bảo vệ session admin).
- `POST /admin/api/legal-documents`: Tạo văn bản (validate payload, CSRF).
- `PUT /admin/api/legal-documents`: Cập nhật văn bản theo ID.
- `DELETE /admin/api/legal-documents`: Xóa văn bản theo ID.
- `POST /admin/api/legal-documents/check-link`: Kiểm tra link đơn lẻ `{ documentId }` hoặc toàn bộ `{ action: "check_all" }`.

- [x] **Step 1: Viết failing test cho các API endpoints**
- [x] **Step 2: Viết code Public API `app/api/legal-documents/route.ts`**
- [x] **Step 3: Viết code Admin CRUD API `app/admin/api/legal-documents/route.ts`**
- [x] **Step 4: Viết code Admin Check-Link API `app/admin/api/legal-documents/check-link/route.ts`**
- [x] **Step 5: Chạy test để xác nhận toàn bộ API routes hoạt động**

---

### Task 4: Xây dựng Component Quản Lý `LegalDocumentManager.tsx` Chuẩn Stitch Design

**Files:**
- Create: `app/admin/LegalDocumentManager.tsx`
- Modify: `app/admin/AdminDashboard.tsx`
- Test: `tests/legal-document-manager-ui.test.mjs`

**Interfaces:**
- Giao diện Admin chuyên mục "Kho văn bản pháp luật" với:
  - Thanh tìm kiếm và bộ lọc đa tiêu chí: Từ khóa, Lĩnh vực (10 chuyên đề), Loại văn bản, Cơ quan ban hành, Trạng thái link (Tất cả, Cảnh báo 404/Lỗi, Hoạt động tốt).
  - KPI Stat Cards: Tổng văn bản, Đang hoạt động, Cảnh báo link hỏng/404, Chưa kiểm tra.
  - Bảng danh sách tài liệu: Badge trạng thái HTTP (200 xanh, 404 đỏ, timeout vàng), thời gian check gần nhất, nút "Kiểm tra link" cho từng dòng (spinner khi đang chạy).
  - Modal Thêm / Chỉnh sửa văn bản: Có nút "Kiểm tra link trước khi lưu".
  - Nút "Kiểm tra toàn bộ link" (Batch Check) kèm thanh tiến trình.
  - Nút "Nạp văn bản mẫu từ Chính phủ" nếu kho đang trống.
- Tích hợp vào `AdminDashboard.tsx`:
  - Thêm tab `documents` với label "Kho văn bản pháp luật", icon `FaBookBookmark`.
  - Hiển thị badge cảnh báo nếu phát hiện link chết (404).

- [x] **Step 1: Viết test cho `LegalDocumentManager`**
- [x] **Step 2: Tạo component `app/admin/LegalDocumentManager.tsx`**
- [x] **Step 3: Tích hợp vào `app/admin/AdminDashboard.tsx`**
- [x] **Step 4: Chạy test để xác nhận UI component hợp lệ**

---

### Task 5: Tích hợp Giao diện Tra cứu Văn bản cho Người học trên Trang Chủ

**Files:**
- Modify: `app/page.tsx`
- Create: `components/LegalDocumentLookup.tsx`
- Test: `tests/legal-aid.test.mjs` (bảo đảm line count < 990)

**Interfaces:**
- Tại mục "Nguồn luật gốc" (#nguon) trên trang chủ `app/page.tsx`:
  - Nạp dữ liệu từ `/api/legal-documents` hiển thị danh sách các văn bản pháp luật chính thống phục vụ học tập, nghiên cứu.
  - Cho phép người học lọc nhanh theo Loại văn bản (Luật, Nghị định, Thông tư) hoặc Lĩnh vực.
  - Hiển thị nhãn cơ quan ban hành, số hiệu và nút mở Cổng TTĐT Chính phủ trong tab mới.

- [x] **Step 1: Cập nhật phần nguồn luật trong `app/page.tsx`**
- [x] **Step 2: Chạy test kiểm tra dòng của `app/page.tsx` (< 990 dòng)**

---

### Task 6: Seed Dữ liệu Mẫu vào Live Neon DB, Kiểm thử Toàn diện & Cập nhật Tài liệu

**Files:**
- Modify: `scripts/seed-topics.mjs` (tích hợp seed văn bản mẫu)
- Modify: `docs/USER_STORIES.md` (Thêm US-049)
- Modify: `docs/TECHNICAL_SPEC.md` (Ghi nhận kiến trúc Kho văn bản & Link Checker)
- Modify: `docs/PROGRESS.md` (Ghi nhận tiến độ và bằng chứng hoàn thành)

- [x] **Step 1: Bổ sung lệnh nạp văn bản mẫu vào `scripts/seed-topics.mjs`**
- [x] **Step 2: Chạy seed vào Neon DB (`npm run seed:topics`)**
- [x] **Step 3: Chạy toàn bộ test suites (`npm test`) - pass 100% (527 tests)**
- [x] **Step 4: Kiểm tra type check TypeScript (`npx tsc --noEmit`)**
- [x] **Step 5: Cập nhật tài liệu dự án (`USER_STORIES.md`, `TECHNICAL_SPEC.md`, `PROGRESS.md`)**
