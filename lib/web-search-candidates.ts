import { env } from "cloudflare:workers";
import { createNeonD1Database } from "./neon-d1";
import { normalizeVietnamese } from "./legal-content";
import {
  canonicalOfficialSourceUrl,
  parseOfficialSourceLinks,
  type OfficialSourceLink,
} from "./official-source-url";
import type { OpenAiWebSearchResult } from "./openai-web-search";

export const WEB_SEARCH_CANDIDATE_POLICY_VERSION =
  "web-search-candidate-v1";
export const WEB_SEARCH_BUDGET_POLICY_VERSION = "web-search-budget-v1";
export const REVIEWED_WEB_RETRIEVAL_POLICY_VERSION =
  "reviewed-web-candidate-v1";

const topics = new Set([
  "Giao thông",
  "Mạng xã hội",
  "Sở hữu trí tuệ",
]);
const staffRoles = new Set(["editor", "reviewer", "admin"]);
const freshnessDays = 365;

type D1Like = Pick<D1Database, "prepare" | "batch">;

type CandidateDependencies = {
  db?: D1Like;
  now?: () => number;
  randomUUID?: () => string;
};

export type EditorialActor = {
  principalId: string;
  username: string;
  roles: Array<"editor" | "reviewer" | "admin">;
};

export type ReviewedCandidateCitation = {
  title: string;
  url: string;
  documentNumber: string;
  article?: string;
  clause?: string;
  point?: string;
  issuedAt?: string;
  effectiveFrom: string;
  effectiveTo?: string;
  lastVerifiedAt: string;
};

export type ReviewedCandidateSnapshot = {
  topic: "Giao thông" | "Mạng xã hội" | "Sở hữu trí tuệ";
  title: string;
  answer: string;
  tags: string[];
  citations: ReviewedCandidateCitation[];
};

export type ReviewedWebCandidateAnswer = {
  answer: string;
  sources: OfficialSourceLink[];
  citations: ReviewedCandidateCitation[];
  candidateId: string;
  policyVersion: typeof REVIEWED_WEB_RETRIEVAL_POLICY_VERSION;
};

export type WebSearchBudgetReservation = {
  dayStart: number;
  reservedTokens: number;
};

function runtimeValue(name: string) {
  const value = env[name] ?? process.env[name];
  return typeof value === "string" ? value.trim() : "";
}

let runtimeDb: D1Like | undefined;

function requireDb(injected?: D1Like) {
  runtimeDb ??= createNeonD1Database() as D1Like | undefined;
  const db = injected ?? runtimeDb;
  if (!db) throw new Error("Neon DATABASE_URL is unavailable");
  return db;
}

function rows(result: D1Result | undefined) {
  return Array.isArray(result?.results) ? result.results : [];
}

function integerConfig(name: string, minimum: number, maximum: number) {
  const raw = runtimeValue(name);
  if (!/^\d+$/.test(raw)) return null;
  const value = Number(raw);
  return Number.isSafeInteger(value) && value >= minimum && value <= maximum
    ? value
    : null;
}

async function sha256(value: string) {
  const digest = new Uint8Array(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)),
  );
  return [...digest]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function boundedText(value: unknown, maximum: number) {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim().slice(0, maximum)
    : "";
}

function isoDate(value: unknown) {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    return null;
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.valueOf()) ||
    date.toISOString().slice(0, 10) !== value
    ? null
    : value;
}

function roleFor(actor: EditorialActor, operation: "edit" | "review") {
  if (actor.roles.includes("admin")) return "admin";
  if (operation === "edit" && actor.roles.includes("editor")) return "editor";
  if (operation === "review" && actor.roles.includes("reviewer")) {
    return "reviewer";
  }
  return null;
}

export async function reserveWebSearchBudget(
  dependencies: CandidateDependencies = {},
): Promise<WebSearchBudgetReservation | null> {
  const dailyBudget = integerConfig(
    "AI_WEB_SEARCH_DAILY_TOKEN_BUDGET",
    10_000,
    100_000_000,
  );
  const reservedTokens = integerConfig(
    "AI_WEB_SEARCH_RESERVATION_TOKENS",
    12_000,
    100_000,
  );
  if (!dailyBudget || !reservedTokens || reservedTokens > dailyBudget) {
    return null;
  }
  const now = Math.floor((dependencies.now ?? Date.now)() / 1000);
  const dayStart = Math.floor(now / 86_400) * 86_400;
  const db = requireDb(dependencies.db);
  const [cleanup, reservation] = await db.batch([
    db.prepare(
      "DELETE FROM web_search_budget_days WHERE expires_at <= ?",
    ).bind(now),
    db.prepare(`
      INSERT INTO web_search_budget_days (
        day_start, reserved_tokens, actual_tokens, request_count, expires_at
      ) VALUES (?, ?, 0, 1, ?)
      ON CONFLICT(day_start) DO UPDATE SET
        reserved_tokens = reserved_tokens + excluded.reserved_tokens,
        request_count = request_count + 1,
        updated_at = CURRENT_TIMESTAMP
      WHERE
        web_search_budget_days.reserved_tokens
        + web_search_budget_days.actual_tokens
        + excluded.reserved_tokens <= ?
      RETURNING day_start
    `).bind(dayStart, reservedTokens, dayStart + 2 * 86_400, dailyBudget),
  ]);
  void cleanup;
  return rows(reservation).length === 1
    ? { dayStart, reservedTokens }
    : null;
}

export async function settleWebSearchBudget(
  reservation: WebSearchBudgetReservation,
  actualTokens: number | null,
  dependencies: CandidateDependencies = {},
) {
  const actual =
    Number.isInteger(actualTokens) && Number(actualTokens) >= 0
      ? Number(actualTokens)
      : reservation.reservedTokens;
  const db = requireDb(dependencies.db);
  const [result] = await db.batch([
    db.prepare(`
      UPDATE web_search_budget_days
      SET reserved_tokens = max(0, reserved_tokens - ?),
          actual_tokens = actual_tokens + ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE day_start = ?
      RETURNING day_start
    `).bind(reservation.reservedTokens, actual, reservation.dayStart),
  ]);
  return rows(result).length === 1;
}

export async function persistWebSearchCandidate(
  requestId: string,
  result: Extract<OpenAiWebSearchResult, { ok: true }>,
  dependencies: CandidateDependencies = {},
) {
  const sources = parseOfficialSourceLinks(result.sources);
  if (
    !/^[0-9a-f-]{36}$/i.test(requestId) ||
    !boundedText(result.answer, 6_000) ||
    !boundedText(result.model, 100) ||
    sources.length < 1
  ) {
    return null;
  }
  const canonical = JSON.stringify({
    answer: result.answer,
    model: result.model,
    sources: sources.map((source) => source.url),
  });
  const [contentSha256, ...sourceHashes] = await Promise.all([
    sha256(canonical),
    ...sources.map((source) => sha256(source.url)),
  ]);
  const uuid = dependencies.randomUUID ?? crypto.randomUUID.bind(crypto);
  const candidateId = uuid();
  const eventId = uuid();
  const db = requireDb(dependencies.db);
  const statements = [
    db.prepare(`
      INSERT INTO web_search_candidates (
        id, request_id, content_sha256, initial_answer_text,
        provider_model, policy_version, input_tokens, output_tokens, total_tokens
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      candidateId,
      requestId,
      contentSha256,
      result.answer,
      result.model,
      WEB_SEARCH_CANDIDATE_POLICY_VERSION,
      result.usage.inputTokens,
      result.usage.outputTokens,
      result.usage.totalTokens,
    ),
    ...sources.map((source, index) => {
      const url = new URL(source.url);
      return db.prepare(`
        INSERT INTO web_search_candidate_sources (
          candidate_id, display_order, title, official_url,
          official_host, url_sha256
        ) VALUES (?, ?, ?, ?, ?, ?)
      `).bind(
        candidateId,
        index,
        source.title,
        source.url,
        url.hostname.toLowerCase(),
        sourceHashes[index],
      );
    }),
    db.prepare(`
      INSERT INTO web_search_candidate_events (
        id, operation_id, candidate_id, actor_role, action, metadata_json
      ) VALUES (?, ?, ?, 'system', 'draft_persisted', ?)
    `).bind(
      eventId,
      `persist:${requestId}`,
      candidateId,
      JSON.stringify({ sourceCount: sources.length }),
    ),
  ];
  try {
    const results = await db.batch(statements);
    return results.every((item) => item.success !== false)
      ? candidateId
      : null;
  } catch {
    return null;
  }
}

export function normalizeReviewedCandidateSnapshot(
  value: unknown,
  allowedSourceUrls?: ReadonlySet<string>,
  requirements: { requireIssuedAt?: boolean } = {},
): ReviewedCandidateSnapshot | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  const topic = boundedText(input.topic, 80);
  const title = boundedText(input.title, 240);
  const answer = boundedText(input.answer, 6_000);
  const tags = Array.isArray(input.tags)
    ? Array.from(
        new Set(
          input.tags
            .map((tag) => boundedText(tag, 60))
            .filter(Boolean),
        ),
      ).slice(0, 12)
    : [];
  if (!topics.has(topic) || !title || !answer || !Array.isArray(input.citations)) {
    return null;
  }
  const citations: ReviewedCandidateCitation[] = [];
  const seen = new Set<string>();
  for (const value of input.citations.slice(0, 8)) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const citation = value as Record<string, unknown>;
    const url = canonicalOfficialSourceUrl(citation.url);
    const issuedAt = citation.issuedAt ? isoDate(citation.issuedAt) : undefined;
    const effectiveFrom = isoDate(citation.effectiveFrom);
    const effectiveTo = citation.effectiveTo
      ? isoDate(citation.effectiveTo)
      : undefined;
    const lastVerifiedAt = isoDate(citation.lastVerifiedAt);
    const titleValue = boundedText(citation.title, 240);
    const documentNumber = boundedText(citation.documentNumber, 160);
    if (
      !url ||
      !titleValue ||
      !documentNumber ||
      (citation.issuedAt && !issuedAt) ||
      (requirements.requireIssuedAt && !issuedAt) ||
      !effectiveFrom ||
      !lastVerifiedAt ||
      (effectiveTo && effectiveTo < effectiveFrom) ||
      seen.has(url) ||
      (allowedSourceUrls && !allowedSourceUrls.has(url))
    ) {
      return null;
    }
    seen.add(url);
    const normalized: ReviewedCandidateCitation = {
      title: titleValue,
      url,
      documentNumber,
      effectiveFrom,
      lastVerifiedAt,
    };
    if (issuedAt) normalized.issuedAt = issuedAt;
    for (const key of ["article", "clause", "point"] as const) {
      const field = boundedText(citation[key], 80);
      if (field) normalized[key] = field;
    }
    if (effectiveTo) normalized.effectiveTo = effectiveTo;
    citations.push(normalized);
  }
  if (citations.length < 1) return null;
  return {
    topic: topic as ReviewedCandidateSnapshot["topic"],
    title,
    answer,
    tags,
    citations,
  };
}

function canonicalSnapshotJson(snapshot: ReviewedCandidateSnapshot) {
  return JSON.stringify(snapshot);
}

async function loadActor(
  principalId: string,
  username: string,
  dependencies: CandidateDependencies = {},
): Promise<EditorialActor | null> {
  const db = requireDb(dependencies.db);
  const [result] = await db.batch([
    db.prepare(`
      SELECT g.role
      FROM editorial_principals p
      JOIN editorial_role_grants g ON g.principal_id = p.id
      WHERE p.id = ? AND p.status = 'active' AND g.revoked_at IS NULL
      ORDER BY g.role
    `).bind(principalId),
  ]);
  const roles = rows(result)
    .map((row) => row.role)
    .filter(
      (role): role is "editor" | "reviewer" | "admin" =>
        typeof role === "string" && staffRoles.has(role),
    );
  return roles.length > 0 ? { principalId, username, roles } : null;
}

export async function resolveEditorialActor(
  principalId: string,
  username: string,
  dependencies: CandidateDependencies = {},
) {
  try {
    return await loadActor(principalId, username, dependencies);
  } catch {
    return null;
  }
}

async function candidateSourceSet(candidateId: string, db: D1Like) {
  const [result] = await db.batch([
    db.prepare(`
      SELECT official_url FROM web_search_candidate_sources
      WHERE candidate_id = ? ORDER BY display_order
    `).bind(candidateId),
  ]);
  return new Set(
    rows(result)
      .map((row) => canonicalOfficialSourceUrl(row.official_url))
      .filter((url): url is string => Boolean(url)),
  );
}

export async function saveWebSearchCandidateRevision(
  actor: EditorialActor,
  candidateId: string,
  expectedVersion: number,
  snapshotInput: unknown,
  dependencies: CandidateDependencies = {},
) {
  if (!roleFor(actor, "edit") || !Number.isInteger(expectedVersion)) return null;
  const db = requireDb(dependencies.db);
  const sourceSet = await candidateSourceSet(candidateId, db);
  const snapshot = normalizeReviewedCandidateSnapshot(snapshotInput, sourceSet, {
    requireIssuedAt: true,
  });
  if (!snapshot) return null;
  const snapshotJson = canonicalSnapshotJson(snapshot);
  const snapshotSha256 = await sha256(snapshotJson);
  const uuid = dependencies.randomUUID ?? crypto.randomUUID.bind(crypto);
  const revisionId = uuid();
  const operationId = uuid();
  const actorRole = roleFor(actor, "edit");
  let results: D1Result[];
  try {
    results = await db.batch([
    db.prepare(`
      INSERT INTO web_search_candidate_revisions (
        id, candidate_id, version, canonical_snapshot_json,
        snapshot_sha256, created_by_principal_id
      )
      SELECT ?, id, optimistic_version + 1, ?, ?, ?
      FROM web_search_candidates
      WHERE id = ? AND optimistic_version = ?
        AND lifecycle_status IN ('draft', 'rejected')
      RETURNING id
    `).bind(
      revisionId,
      snapshotJson,
      snapshotSha256,
      actor.principalId,
      candidateId,
      expectedVersion,
    ),
    db.prepare(`
      UPDATE web_search_candidates
      SET current_revision_id = ?,
          editor_principal_id = ?,
          lifecycle_status = 'draft',
          submitted_at = NULL,
          reviewer_principal_id = NULL,
          reviewed_at = NULL,
          review_reason = NULL,
          optimistic_version = optimistic_version + 1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND optimistic_version = ?
        AND lifecycle_status IN ('draft', 'rejected')
        AND EXISTS (
          SELECT 1 FROM web_search_candidate_revisions
          WHERE id = ? AND candidate_id = web_search_candidates.id
        )
      RETURNING optimistic_version
    `).bind(
      revisionId,
      actor.principalId,
      candidateId,
      expectedVersion,
      revisionId,
    ),
    db.prepare(`
      INSERT INTO web_search_candidate_events (
        id, operation_id, candidate_id, revision_id,
        actor_principal_id, actor_role, action
      )
      SELECT ?, ?, candidate_id, id, ?, ?, 'revision_created'
      FROM web_search_candidate_revisions WHERE id = ?
      RETURNING id
    `).bind(
      uuid(),
      operationId,
      actor.principalId,
      actorRole,
      revisionId,
    ),
    ]);
  } catch {
    return null;
  }
  const [revision, candidate, event] = results;
  return rows(revision).length === 1 &&
    rows(candidate).length === 1 &&
    rows(event).length === 1
    ? {
        revisionId,
        optimisticVersion: Number(rows(candidate)[0].optimistic_version),
      }
    : null;
}

type CandidateAction = "submit" | "approve" | "reject" | "archive";

export async function transitionWebSearchCandidate(
  actor: EditorialActor,
  candidateId: string,
  expectedVersion: number,
  action: CandidateAction,
  reason: string | undefined,
  dependencies: CandidateDependencies = {},
) {
  if (!Number.isInteger(expectedVersion)) return null;
  const operation = action === "submit" ? "edit" : "review";
  const actorRole = roleFor(actor, operation);
  if (!actorRole) return null;
  const normalizedReason = reason?.trim().slice(0, 2_000) || null;
  if (action === "reject" && !normalizedReason) return null;
  const db = requireDb(dependencies.db);
  const uuid = dependencies.randomUUID ?? crypto.randomUUID.bind(crypto);
  const definitions = {
    submit: {
      from: "draft",
      to: "pending_review",
      event: "review_submitted",
      assignment: `
        submitted_at = CURRENT_TIMESTAMP,
        reviewer_principal_id = NULL,
        reviewed_at = NULL,
        review_reason = NULL
      `,
      guard: "editor_principal_id = ?",
    },
    approve: {
      from: "pending_review",
      to: "published",
      event: "review_approved",
      assignment: `
        reviewer_principal_id = ?,
        reviewed_at = CURRENT_TIMESTAMP,
        review_reason = NULL
      `,
      guard: "editor_principal_id != ?",
    },
    reject: {
      from: "pending_review",
      to: "rejected",
      event: "review_rejected",
      assignment: `
        reviewer_principal_id = ?,
        reviewed_at = CURRENT_TIMESTAMP,
        review_reason = ?
      `,
      guard: "editor_principal_id != ?",
    },
    archive: {
      from: "published",
      to: "archived",
      event: "archived",
      assignment: "review_reason = review_reason",
      guard: "1 = 1",
    },
  } as const;
  const definition = definitions[action];
  const assignmentBindings =
    action === "submit"
      ? []
      : action === "reject"
        ? [actor.principalId, normalizedReason]
        : action === "archive"
          ? []
          : [actor.principalId];
  const guardBindings =
    action === "archive" ? [] : [actor.principalId];
  let results: D1Result[];
  try {
    results = await db.batch([
    db.prepare(`
      UPDATE web_search_candidates
      SET lifecycle_status = ?,
          ${definition.assignment},
          optimistic_version = optimistic_version + 1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND optimistic_version = ?
        AND lifecycle_status = ?
        AND ${definition.guard}
      RETURNING current_revision_id, optimistic_version
    `).bind(
      definition.to,
      ...assignmentBindings,
      candidateId,
      expectedVersion,
      definition.from,
      ...guardBindings,
    ),
    db.prepare(`
      INSERT INTO web_search_candidate_events (
        id, operation_id, candidate_id, revision_id,
        actor_principal_id, actor_role, action, reason
      )
      SELECT ?, ?, id, current_revision_id, ?, ?, ?, ?
      FROM web_search_candidates
      WHERE id = ? AND optimistic_version = ? AND lifecycle_status = ?
      RETURNING id
    `).bind(
      uuid(),
      uuid(),
      actor.principalId,
      actorRole,
      definition.event,
      normalizedReason,
      candidateId,
      expectedVersion + 1,
      definition.to,
    ),
    ]);
  } catch {
    return null;
  }
  const [candidate, event] = results;
  return rows(candidate).length === 1 && rows(event).length === 1
    ? { optimisticVersion: Number(rows(candidate)[0].optimistic_version) }
    : null;
}

export async function listWebSearchCandidates(
  dependencies: CandidateDependencies = {},
) {
  const db = requireDb(dependencies.db);
  const [candidates, sources, revisions, events] = await db.batch([
    db.prepare(`
      SELECT * FROM web_search_candidates
      ORDER BY updated_at DESC, id DESC LIMIT 200
    `),
    db.prepare(`
      SELECT * FROM web_search_candidate_sources
      WHERE candidate_id IN (
        SELECT id FROM web_search_candidates
        ORDER BY updated_at DESC, id DESC LIMIT 200
      )
      ORDER BY candidate_id, display_order
    `),
    db.prepare(`
      SELECT * FROM web_search_candidate_revisions
      WHERE candidate_id IN (
        SELECT id FROM web_search_candidates
        ORDER BY updated_at DESC, id DESC LIMIT 200
      )
      ORDER BY candidate_id, version DESC
    `),
    db.prepare(`
      SELECT * FROM web_search_candidate_events
      WHERE candidate_id IN (
        SELECT id FROM web_search_candidates
        ORDER BY updated_at DESC, id DESC LIMIT 200
      )
      ORDER BY candidate_id, occurred_at DESC, id DESC
    `),
  ]);
  return {
    candidates: rows(candidates),
    sources: rows(sources),
    revisions: rows(revisions),
    events: rows(events),
  };
}

function citationIsCurrent(
  citation: ReviewedCandidateCitation,
  nowMs: number,
) {
  const today = new Date(nowMs).toISOString().slice(0, 10);
  const freshnessCutoff = new Date(nowMs - freshnessDays * 86_400_000)
    .toISOString()
    .slice(0, 10);
  return (
    citation.effectiveFrom <= today &&
    (!citation.effectiveTo || citation.effectiveTo >= today) &&
    citation.lastVerifiedAt <= today &&
    citation.lastVerifiedAt >= freshnessCutoff
  );
}

export async function findReviewedWebCandidate(
  question: string,
  dependencies: CandidateDependencies = {},
): Promise<ReviewedWebCandidateAnswer | null> {
  const terms = normalizeVietnamese(question)
    .split(/[^a-z0-9]+/)
    .filter((term) => term.length >= 3)
    .slice(0, 20);
  if (terms.length < 1) return null;
  try {
    const db = requireDb(dependencies.db);
    const [candidateResult, sourceResult] = await db.batch([
      db.prepare(`
        SELECT c.id, r.canonical_snapshot_json
        FROM web_search_candidates c
        JOIN web_search_candidate_revisions r
          ON r.id = c.current_revision_id AND r.candidate_id = c.id
        WHERE c.lifecycle_status = 'published'
        ORDER BY c.updated_at DESC LIMIT 100
      `),
      db.prepare(`
        SELECT s.candidate_id, s.official_url
        FROM web_search_candidate_sources s
        JOIN web_search_candidates c ON c.id = s.candidate_id
        WHERE c.lifecycle_status = 'published'
        ORDER BY s.candidate_id, s.display_order
      `),
    ]);
    const allowedByCandidate = new Map<string, Set<string>>();
    for (const row of rows(sourceResult)) {
      if (
        typeof row.candidate_id !== "string" ||
        typeof row.official_url !== "string"
      ) {
        continue;
      }
      const set = allowedByCandidate.get(row.candidate_id) ?? new Set<string>();
      set.add(row.official_url);
      allowedByCandidate.set(row.candidate_id, set);
    }
    const nowMs = (dependencies.now ?? Date.now)();
    const ranked = rows(candidateResult)
      .map((row) => {
        if (
          typeof row.id !== "string" ||
          typeof row.canonical_snapshot_json !== "string"
        ) {
          return null;
        }
        let parsed: unknown;
        try {
          parsed = JSON.parse(row.canonical_snapshot_json);
        } catch {
          return null;
        }
        const snapshot = normalizeReviewedCandidateSnapshot(
          parsed,
          allowedByCandidate.get(row.id) ?? new Set(),
        );
        if (
          !snapshot ||
          !snapshot.citations.every((citation) =>
            citationIsCurrent(citation, nowMs)
          )
        ) {
          return null;
        }
        const searchable = normalizeVietnamese(
          `${snapshot.title} ${snapshot.tags.join(" ")} ${snapshot.answer}`,
        );
        return {
          id: row.id,
          snapshot,
          score: terms.filter((term) => searchable.includes(term)).length,
        };
      })
      .filter((value): value is NonNullable<typeof value> => Boolean(value))
      .sort((left, right) => right.score - left.score);
    const best = ranked[0];
    if (!best || best.score < Math.min(2, terms.length)) return null;
    return {
      answer: best.snapshot.answer,
      sources: best.snapshot.citations.map(({ title, url }) => ({ title, url })),
      citations: best.snapshot.citations,
      candidateId: best.id,
      policyVersion: REVIEWED_WEB_RETRIEVAL_POLICY_VERSION,
    };
  } catch {
    return null;
  }
}
