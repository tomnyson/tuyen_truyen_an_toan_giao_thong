// Tầng dữ liệu nội dung pháp lý — chạy trên Neon PostgreSQL qua driver
// HTTP (@neondatabase/serverless), hoạt động trong Cloudflare Workers.
// Xem docs/superpowers/specs/2026-07-31-neon-postgres-design.md (giai đoạn
// A). Các subsystem rate-limit / web-search candidates vẫn dùng D1 (env.DB)
// cho tới giai đoạn B.
import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import { sql } from "drizzle-orm";
import { env } from "cloudflare:workers";
import * as schema from "./pg-schema";
import {
  pgBootstrapSentinelTable,
  pgBootstrapStatements,
} from "./pg-bootstrap";

export type LegalDatabase = NeonHttpDatabase<typeof schema>;

function requireDatabaseUrl(): string {
  const url = env.DATABASE_URL ?? process.env.DATABASE_URL;
  if (typeof url !== "string" || url.length === 0) {
    throw new Error(
      "DATABASE_URL chua duoc cau hinh. Dat chuoi ket noi Neon PostgreSQL trong .env.local (dev) hoac secret cua moi truong deploy.",
    );
  }
  return url;
}

let cachedDb: LegalDatabase | null = null;
let schemaInitialization: Promise<unknown> | null = null;

export function getDb(): LegalDatabase {
  cachedDb ??= drizzle(neon(requireDatabaseUrl()), { schema });
  return cachedDb;
}

// Chạy DDL idempotent trên bất kỳ database Drizzle PG nào (Neon thật hoặc
// PGlite trong test). Mỗi statement chạy riêng vì neon-http không nhận
// nhiều statement trong một request.
export async function bootstrapLegalDatabase(database: {
  execute(query: ReturnType<typeof sql.raw>): Promise<unknown>;
}): Promise<void> {
  for (const statement of pgBootstrapStatements) {
    await database.execute(sql.raw(statement));
  }
}

async function ensureBootstrapped(database: LegalDatabase): Promise<void> {
  // ~100 câu DDL qua HTTP là quá đắt cho mỗi cold start — kiểm tra sentinel
  // (bảng cuối chuỗi bootstrap) trước, chỉ chạy đủ bộ khi schema còn thiếu.
  const sentinel = await database.execute(
    sql.raw(
      `SELECT to_regclass('public.${pgBootstrapSentinelTable}') IS NOT NULL AS ready`,
    ),
  );
  const ready = (sentinel as { rows?: Array<{ ready?: unknown }> }).rows?.[0]
    ?.ready;
  if (ready === true || ready === "t") return;
  await bootstrapLegalDatabase(database);
}

export async function getInitializedDb(): Promise<LegalDatabase> {
  const database = getDb();
  schemaInitialization ??= ensureBootstrapped(database).catch((error) => {
    schemaInitialization = null;
    throw error;
  });
  await schemaInitialization;
  return database;
}
