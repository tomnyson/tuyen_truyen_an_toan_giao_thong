# Thiết kế: Chuyển tầng dữ liệu sang Neon PostgreSQL

Ngày: 2026-07-31. Trạng thái: người dùng đã chốt hướng "chuyển hẳn app sang
Neon" (DATABASE_URL trong .env.local, đã xác minh kết nối: PostgreSQL 15.18,
database `verceldb`, schema public trống).

## Quyết định kiến trúc

1. Giữ Cloudflare Workers (vinext/wrangler). Truy cập Neon qua
   `@neondatabase/serverless` (HTTP fetch, chạy được trong workerd) +
   `drizzle-orm/neon-http`.
2. Giữ triết lý "DB là chốt gác cuối": port CHECK constraint và trigger
   bốn mắt sang PostgreSQL (trigger dùng hàm plpgsql).
3. Unit test dùng `@electric-sql/pglite` (Postgres in-memory cho Node),
   không đụng Neon thật.
4. Chiến lược strangler-fig, KHÔNG big-bang:
   - Giai đoạn A (spec này): tầng nội dung pháp lý — 4 bảng
     `legal_sources`, `legal_provisions`, `legal_entries`,
     `legal_entry_citations` + mọi consumer qua Drizzle
     (`getInitializedDb`) + seed script.
   - Giai đoạn B (spec sau): rate-limit, web_search_* (budget/candidates),
     editorial_*, showcases — hiện vẫn chạy D1 qua `env.DB`.
5. `DATABASE_URL` đọc từ env worker (vinext nạp `.env.local` ở dev;
   production đặt qua secret). D1 binding giữ nguyên cho tới hết giai
   đoạn B.

## Thành phần giai đoạn A

- `db/pg-schema.ts`: 4 bảng trên bằng `pgTable`, giữ nguyên tên bảng/cột,
  CHECK constraint tương đương bản SQLite.
- `db/index.ts`: `getDb`/`getInitializedDb` trả về Drizzle trên
  neon-http; bootstrap idempotent tạo bảng + hàm/trigger plpgsql (port từ
  bootstrap SQLite, chỉ phần 4 bảng nội dung). Cho phép inject client để
  test bằng PGlite.
- Consumer Drizzle giữ nguyên API (lib/legal-chat.ts, route admin
  content, public-showcase, catalog-resolver phần managed) — chỉ đổi
  import schema.
- `scripts/seed-d1.mjs` → thêm chế độ Postgres (mặc định): validate +
  checksum như cũ, ghi vào Neon qua DATABASE_URL, idempotent theo cùng
  khóa tự nhiên. Chế độ `--d1` giữ đường cũ cho tới hết giai đoạn B.
- Tests: bootstrap + seed + legal-chat chạy trên PGlite.

## Ngoài phạm vi giai đoạn A

- rate-limit.ts, web-search-candidates.ts, legal-evidence-retriever.ts
  (raw SQL, chỉ dùng cho shadow/tests) — vẫn D1.
- Gỡ binding D1 khỏi vite.config/hosting — làm ở giai đoạn B.
- Migration files drizzle/ (SQLite) — giữ nguyên cho D1; PG dùng
  bootstrap idempotent, sinh migration PG chính thức ở giai đoạn B.

## Tiêu chí thành công giai đoạn A

1. `npm run seed` ghi 27 tình huống vào Neon; chạy lại không nhân đôi;
   người dùng thấy dữ liệu trong Neon console.
2. Trang chủ + chat đọc từ Neon (dev server), câu "mũ bảo hiểm" trả lời
   kèm mức phạt + căn cứ như trước.
3. Trigger bốn mắt trên PG chặn bản ghi sai (có test chứng minh).
4. Toàn bộ test repo xanh; các test D1 cũ không bị ảnh hưởng.

## Cập nhật: Giai đoạn B đã hoàn thành (2026-07-31)

Rate-limit, web search budget/candidates và các bảng editorial đã chuyển
sang Neon (db/pg-workflow.ts, lib/neon-d1.ts, lib/rate-limit.ts). D1 đã gỡ
khỏi runtime: hosting.json d1=null, worker Env bỏ binding DB, seed bỏ chế
độ --d1. env.DB chỉ còn là seam cho test bơm mock. Thư mục drizzle/ và
db/schema.ts giữ lại làm hồ sơ lịch sử schema D1 (tests đối chiếu tài
liệu vẫn đọc chúng). Đã xác minh E2E: login, chat knowledge, web search
fallback + persist candidate + budget đều ghi/đọc Neon.
