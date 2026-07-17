import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

const createLegalEntriesTable = `
  CREATE TABLE IF NOT EXISTS legal_entries (
    id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    topic text NOT NULL,
    icon text DEFAULT '§' NOT NULL,
    title text NOT NULL,
    legal_basis text NOT NULL,
    penalty text NOT NULL,
    remedy text NOT NULL,
    case_study text NOT NULL,
    tags text DEFAULT '[]' NOT NULL,
    status text DEFAULT 'draft' NOT NULL,
    created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at text DEFAULT CURRENT_TIMESTAMP NOT NULL
  )
`;

const createShowcasesTable = `
  CREATE TABLE IF NOT EXISTS showcases (
    id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    topic text NOT NULL,
    title text NOT NULL,
    summary text NOT NULL,
    source_url text DEFAULT '' NOT NULL,
    status text DEFAULT 'draft' NOT NULL,
    created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at text DEFAULT CURRENT_TIMESTAMP NOT NULL
  )
`;

let schemaInitialization: Promise<unknown> | null = null;

function requireD1() {
  if (!env.DB) {
    throw new Error(
      "Cloudflare D1 binding `DB` is unavailable. Set the `d1` field in .openai/hosting.json to `DB` or let your control plane inject the real binding values before using the database."
    );
  }

  return env.DB;
}

export function getDb() {
  return drizzle(requireD1(), { schema });
}

export async function getInitializedDb() {
  const d1 = requireD1();
  schemaInitialization ??= d1.batch([
    d1.prepare(createLegalEntriesTable),
    d1.prepare(createShowcasesTable),
  ]).catch((error) => {
    schemaInitialization = null;
    throw error;
  });
  await schemaInitialization;

  return drizzle(d1, { schema });
}
