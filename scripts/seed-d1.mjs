// Sinh va ap SQL seed idempotent cho D1.
// Dung: node --experimental-strip-types scripts/seed-d1.mjs [--sql-only]
import { registerHooks } from "node:module";
import { writeFile } from "node:fs/promises";
import { glob } from "node:fs/promises";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "cloudflare:workers") {
      // Stub dùng chung với tests: cùng một object env toàn cục để test có
      // thể gắn binding DB giả trước khi import db/index.ts.
      return {
        shortCircuit: true,
        url: "data:text/javascript,globalThis.__workerEnvStub ??= {}; export const env = globalThis.__workerEnvStub;",
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

const { computeProvisionChecksum, PROVISION_CHECKSUM_VERSION } = await import(
  "../lib/legal-evidence-retriever.ts"
);
const { hasBlockedLegalBasis } = await import("../lib/legal-content.ts");

const TOPICS = new Set(["Giao thông", "Mạng xã hội", "Sở hữu trí tuệ"]);
const ALLOWED_HOSTS = new Set(["vbpl.vn", "vbpl.moj.gov.vn", "chinhphu.vn"]);
const SEED_EDITOR = "seed-editor";
const SEED_REVIEWER = "seed-reviewer";

function isAllowedHost(host) {
  return ALLOWED_HOSTS.has(host) || host.endsWith(".chinhphu.vn");
}

export function validateSeedContent(content) {
  const errors = [];
  const slugs = new Set();
  if (content?.seedContentVersion !== "seed-content-v1") {
    errors.push("seedContentVersion khong dung");
  }
  for (const situation of content?.situations ?? []) {
    const where = situation.slug ?? "<khong slug>";
    if (!situation.slug || slugs.has(situation.slug)) {
      errors.push(`${where}: slug trung hoac thieu`);
    }
    slugs.add(situation.slug);
    if (!TOPICS.has(situation.topic)) {
      errors.push(`${where}: topic khong hop le`);
    }
    if (hasBlockedLegalBasis(situation.legalBasis ?? "")) {
      errors.push(`${where}: legalBasis dinh blocklist ND 131/2013`);
    }
    for (const field of ["title", "legalBasis", "penalty", "remedy", "caseStudy", "icon"]) {
      if (typeof situation[field] !== "string" || !situation[field].trim()) {
        errors.push(`${where}: thieu ${field}`);
      }
    }
    if (!Array.isArray(situation.tags) || situation.tags.length === 0) {
      errors.push(`${where}: thieu tags`);
    }
    let url = null;
    try {
      url = new URL(situation.source?.officialUrl ?? "");
    } catch {
      errors.push(`${where}: officialUrl khong phai URL`);
    }
    if (
      url &&
      (url.protocol !== "https:" || !isAllowedHost(url.hostname.toLowerCase()))
    ) {
      errors.push(`${where}: officialUrl ngoai allowlist`);
    }
    for (const field of ["documentNumber", "title", "issuedAt", "effectiveFrom"]) {
      if (
        typeof situation.source?.[field] !== "string" ||
        !situation.source[field].trim()
      ) {
        errors.push(`${where}: source thieu ${field}`);
      }
    }
    for (const field of ["originalText", "simplifiedText"]) {
      if (
        typeof situation.provision?.[field] !== "string" ||
        !situation.provision[field].trim()
      ) {
        errors.push(`${where}: provision thieu ${field}`);
      }
    }
  }
  return errors;
}

const q = (value) =>
  value === null || value === undefined
    ? "NULL"
    : `'${String(value).replace(/'/g, "''")}'`;

export async function buildSeedSql(content, { now = () => new Date() } = {}) {
  const errors = validateSeedContent(content);
  if (errors.length) {
    throw new Error(`Noi dung seed khong hop le:\n${errors.join("\n")}`);
  }
  const stamp = now().toISOString();
  const lines = ["BEGIN;"];

  const sources = new Map();
  for (const situation of content.situations) {
    if (!sources.has(situation.source.documentNumber)) {
      sources.set(situation.source.documentNumber, situation.source);
    }
  }
  for (const source of sources.values()) {
    const host = new URL(source.officialUrl).hostname.toLowerCase();
    lines.push(`
INSERT INTO legal_sources (
  document_number, title, official_url, official_host, issued_at,
  effective_from, status, created_by, last_verified_at, verified_by
)
SELECT ${q(source.documentNumber)}, ${q(source.title)}, ${q(source.officialUrl)},
  ${q(host)}, ${q(source.issuedAt)}, ${q(source.effectiveFrom)}, 'in_force',
  ${q(SEED_EDITOR)}, ${q(stamp)}, ${q(SEED_REVIEWER)}
WHERE NOT EXISTS (
  SELECT 1 FROM legal_sources WHERE document_number = ${q(source.documentNumber)}
);`);
  }

  for (const situation of content.situations) {
    const { source, provision } = situation;
    const revisionId = `seed-${situation.slug}-v1`;
    const effectiveFrom = provision.effectiveFrom ?? source.effectiveFrom;
    const checksum = await computeProvisionChecksum({
      source: {
        documentNumber: source.documentNumber,
        officialUrl: source.officialUrl,
      },
      provision: {
        revisionId,
        checksumVersion: PROVISION_CHECKSUM_VERSION,
        article: provision.article ?? null,
        clause: provision.clause ?? null,
        point: provision.point ?? null,
        originalText: provision.originalText,
        simplifiedText: provision.simplifiedText,
        effectivityStatus: "in_force",
        effectiveFrom,
        effectiveTo: null,
      },
    });
    lines.push(`
INSERT INTO legal_provisions (
  source_id, article, clause, point, original_text, simplified_text,
  status, created_by, reviewed_by, reviewed_at, revision_id,
  checksum_version, checksum_sha256, effectivity_status, effective_from
)
SELECT s.id, ${q(provision.article ?? null)}, ${q(provision.clause ?? null)},
  ${q(provision.point ?? null)}, ${q(provision.originalText)},
  ${q(provision.simplifiedText)}, 'published', ${q(SEED_EDITOR)},
  ${q(SEED_REVIEWER)}, ${q(stamp)}, ${q(revisionId)},
  ${q(PROVISION_CHECKSUM_VERSION)}, ${q(checksum)}, 'in_force',
  ${q(effectiveFrom)}
FROM legal_sources s
WHERE s.document_number = ${q(source.documentNumber)}
  AND NOT EXISTS (
    SELECT 1 FROM legal_provisions WHERE revision_id = ${q(revisionId)}
  );`);
    lines.push(`
INSERT INTO legal_entries (
  topic, icon, title, legal_basis, penalty, remedy, case_study, tags,
  status, review_status, created_by, reviewed_by, reviewed_at
)
SELECT ${q(situation.topic)}, ${q(situation.icon)}, ${q(situation.title)},
  ${q(situation.legalBasis)}, ${q(situation.penalty)}, ${q(situation.remedy)},
  ${q(situation.caseStudy)}, ${q(JSON.stringify(situation.tags))},
  'published', 'four_eyes_verified', ${q(SEED_EDITOR)}, ${q(SEED_REVIEWER)},
  ${q(stamp)}
WHERE NOT EXISTS (
  SELECT 1 FROM legal_entries
  WHERE topic = ${q(situation.topic)} AND title = ${q(situation.title)}
);`);
    lines.push(`
INSERT INTO legal_entry_citations (
  legal_entry_id, provision_id, display_order, review_status,
  created_by, reviewed_by, reviewed_at, cited_revision_id,
  cited_checksum_version, cited_checksum_sha256
)
SELECT e.id, p.id, 0, 'four_eyes_verified', ${q(SEED_EDITOR)},
  ${q(SEED_REVIEWER)}, ${q(stamp)}, ${q(revisionId)},
  ${q(PROVISION_CHECKSUM_VERSION)}, ${q(checksum)}
FROM legal_entries e, legal_provisions p
WHERE e.topic = ${q(situation.topic)} AND e.title = ${q(situation.title)}
  AND p.revision_id = ${q(revisionId)}
  AND NOT EXISTS (
    SELECT 1 FROM legal_entry_citations c
    WHERE c.legal_entry_id = e.id AND c.provision_id = p.id
  );`);
  }

  lines.push("COMMIT;");
  return lines.join("\n");
}

async function findLocalD1Files() {
  const files = [];
  for await (const file of glob(
    ".wrangler/state/v3/d1/miniflare-D1DatabaseObject/*.sqlite",
  )) {
    if (!file.endsWith("metadata.sqlite")) files.push(file);
  }
  return files;
}

const isMain = process.argv[1]?.endsWith("seed-d1.mjs");
if (isMain) {
  const content = (await import("../db/seeds/seed-content.v1.mjs")).default;
  const sql = await buildSeedSql(content);
  if (process.argv.includes("--sql-only")) {
    await writeFile("db/seeds/seed.v1.sql", sql);
    console.log("Da ghi db/seeds/seed.v1.sql — ap len production bang:");
    console.log("  wrangler d1 execute DB --remote --file db/seeds/seed.v1.sql");
  } else {
    const files = await findLocalD1Files();
    if (files.length === 0) {
      console.error(
        "Khong tim thay D1 local trong .wrangler/state. Chay `npm run dev` mot lan de miniflare tao DB roi seed lai.",
      );
      process.exit(1);
    }
    const { DatabaseSync } = await import("node:sqlite");
    for (const file of files) {
      const db = new DatabaseSync(file);
      try {
        db.exec(sql);
        console.log(`Da seed: ${file}`);
      } finally {
        db.close();
      }
    }
  }
}
