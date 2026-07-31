import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";
import { registerHooks } from "node:module";
import { DatabaseSync } from "node:sqlite";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (
      specifier.startsWith(".") &&
      !specifier.match(/\.[a-z]+$/i) &&
      context.parentURL?.endsWith(".ts")
    ) {
      return nextResolve(`${specifier}.ts`, context);
    }
    return nextResolve(specifier, context);
  },
});

const { importOfficialCorpusDrafts } = await import(
  "../lib/official-corpus-drafts.ts"
);

class PreparedStatement {
  constructor(database, sql, values = []) {
    this.database = database;
    this.sql = sql;
    this.values = values;
  }

  bind(...values) {
    return new PreparedStatement(this.database, this.sql, values);
  }

  execute() {
    const results = this.database.prepare(this.sql).all(...this.values);
    return { success: true, results };
  }
}

class LocalD1Adapter {
  constructor(database) {
    this.database = database;
  }

  prepare(sql) {
    return new PreparedStatement(this.database, sql);
  }

  async batch(statements) {
    this.database.exec("BEGIN IMMEDIATE");
    try {
      const results = statements.map((statement) => statement.execute());
      this.database.exec("COMMIT");
      return results;
    } catch (error) {
      this.database.exec("ROLLBACK");
      throw error;
    }
  }
}

const databaseArgument = process.argv.find((argument) =>
  argument.startsWith("--database="),
);
const databaseValue = databaseArgument?.slice("--database=".length);
if (!databaseValue || !isAbsolute(databaseValue)) {
  console.error(
    JSON.stringify({
      ok: false,
      reason: "Pass an explicit absolute local path with --database=/path/file.sqlite",
    }),
  );
  process.exitCode = 1;
} else {
  const databasePath = resolve(databaseValue);
  if (!existsSync(databasePath)) {
    console.error(
      JSON.stringify({
        ok: false,
        reason: "The explicit local database file does not exist",
      }),
    );
    process.exitCode = 1;
    process.exit();
  }
  const packet = JSON.parse(
    await readFile(
      new URL(
        "../fixtures/rag/official-corpus-drafts.v1.json",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  const database = new DatabaseSync(databasePath);
  try {
    database.exec("PRAGMA foreign_keys = ON");
    const requiredTables = [
      "web_search_candidates",
      "web_search_candidate_sources",
      "web_search_candidate_events",
    ];
    const existingTables = new Set(
      database
        .prepare(
          "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name",
        )
        .all()
        .map((row) => row.name),
    );
    if (requiredTables.some((table) => !existingTables.has(table))) {
      throw new Error("Local D1 does not have migration 0005");
    }
    const result = await importOfficialCorpusDrafts(packet, {
      db: new LocalD1Adapter(database),
    });
    console.log(JSON.stringify({ databasePath, ...result }));
    if (!result.ok) process.exitCode = 1;
  } catch (error) {
    console.error(
      JSON.stringify({
        ok: false,
        reason:
          error instanceof Error ? error.message : "Unexpected import error",
      }),
    );
    process.exitCode = 1;
  } finally {
    database.close();
  }
}
