import { defineConfig } from "drizzle-kit";

// Tầng nội dung pháp lý chạy trên Neon PostgreSQL (db/pg-schema.ts).
// DDL production hiện áp bằng bootstrap idempotent (db/pg-bootstrap.ts);
// config này phục vụ drizzle-kit generate khi cần sinh migration PG.
// Schema SQLite cũ (db/schema.ts) vẫn dùng cho các bảng còn ở D1
// (rate limit, web search candidates, editorial) tới hết giai đoạn B.
export default defineConfig({
  out: "./drizzle-pg",
  schema: "./db/pg-schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
});
