// Adapter giao diện D1 (prepare/bind/batch) chạy trên Neon PostgreSQL.
// Dịch placeholder nặc danh `?` của SQLite sang `$N` của Postgres lúc
// runtime để phần SQL trong lib giữ nguyên (tests SQLite vẫn dùng được).
// batch chạy nguyên tử qua sql.transaction của driver neon-http.
import { neon } from "@neondatabase/serverless";
import { env } from "@/lib/runtime-env";

export type NeonD1Statement = {
  bind(...values: unknown[]): NeonD1Statement;
};

export type NeonD1Database = {
  prepare(query: string): NeonD1Statement;
  batch(statements: NeonD1Statement[]): Promise<
    Array<{ success: boolean; results: Record<string, unknown>[] }>
  >;
};

type PreparedStatement = NeonD1Statement & {
  query: string;
  values: unknown[];
};

export function translatePlaceholders(query: string): string {
  let index = 0;
  return query.replace(/\?/g, () => `$${++index}`);
}

export function createNeonD1Database(): NeonD1Database | undefined {
  const url = env.DATABASE_URL ?? process.env.DATABASE_URL;
  if (typeof url !== "string" || url.length === 0) return undefined;
  const sql = neon(url);
  return {
    prepare(query: string): NeonD1Statement {
      const statement: PreparedStatement = {
        query: translatePlaceholders(query),
        values: [],
        bind(...values: unknown[]) {
          return { ...statement, values };
        },
      };
      return statement;
    },
    async batch(statements: NeonD1Statement[]) {
      const results = await sql.transaction(
        statements.map((statement) => {
          const { query, values } = statement as PreparedStatement;
          return sql.query(query, values);
        }),
      );
      return results.map((resultRows) => ({
        success: true,
        results: resultRows as Record<string, unknown>[],
      }));
    },
  };
}
