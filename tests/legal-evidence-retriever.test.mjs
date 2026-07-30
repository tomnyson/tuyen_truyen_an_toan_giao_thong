import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import {
  createProvisionCandidateRetriever,
  getCandidateEligibilityReason,
  loadD1CandidateGraph,
  normalizeRetrievalText,
  rankProvisionCandidates,
  tokenizeRetrievalQuery,
} from "../lib/legal-evidence-retriever.ts";

const asOf = "2026-07-31T12:00:00Z";

const approval = {
  pm: "pm-owner",
  internalContentReviewer: "content-reviewer",
  approvedAt: "2026-07-01T00:00:00Z",
};

const freshnessPolicy = {
  version: "fixture-freshness-v1",
  approval,
  rules: [{ officialHost: "vbpl.vn", maxAgeDays: 30 }],
};

const rankingPolicy = {
  version: "fixture-ranking-v1",
  approval,
  topK: 2,
  minimumScore: 5,
  minimumMatchedTerms: 2,
  candidateLimit: 100,
  weights: {
    title: 5,
    tags: 3,
    topic: 1,
    simplifiedProvision: 3,
    originalProvision: 2,
    sourceTitle: 1,
    documentNumber: 1,
    exactTitlePhraseBonus: 4,
  },
};

const validCandidate = {
  answerSignal: {
    id: 21,
    status: "published",
    reviewStatus: "four_eyes_verified",
    createdBy: "answer-editor",
    reviewedBy: "answer-reviewer",
    reviewedAt: "2026-07-10T00:00:00Z",
    topic: "Giao thông",
    title: "Đội mũ bảo hiểm khi đi xe máy",
    tags: '["mu-baohiem","xe-may"]',
    updatedAt: "2026-07-10T00:00:00Z",
  },
  citationLink: {
    legalEntryId: 21,
    provisionId: 11,
    reviewStatus: "four_eyes_verified",
    createdBy: "citation-editor",
    reviewedBy: "citation-reviewer",
    reviewedAt: "2026-07-10T00:00:00Z",
  },
  provision: {
    id: 11,
    sourceId: 7,
    status: "published",
    article: "Điều mẫu",
    clause: "Khoản mẫu",
    point: null,
    originalText:
      "Người điều khiển xe máy phải đội mũ bảo hiểm và cài quai đúng quy cách.",
    simplifiedText:
      "Khi đi xe máy, người điều khiển cần đội mũ bảo hiểm đúng cách.",
    createdBy: "provision-editor",
    reviewedBy: "provision-reviewer",
    reviewedAt: "2026-07-10T00:00:00Z",
    revisionId: "provision-11-revision-a",
    checksum:
      "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    effectivityStatus: "active",
    effectiveFrom: "2026-01-01",
    effectiveTo: null,
    updatedAt: "2026-07-10T00:00:00Z",
  },
  source: {
    id: 7,
    status: "in_force",
    documentNumber: "VB-MAU",
    title: "Văn bản chính thức mẫu",
    officialUrl: "https://vbpl.vn/van-ban-mau",
    officialHost: "vbpl.vn",
    effectiveFrom: "2026-01-01",
    effectiveTo: null,
    createdBy: "source-editor",
    verifiedBy: "source-reviewer",
    lastVerifiedAt: "2026-07-15T12:00:00Z",
    updatedAt: "2026-07-15T12:00:00Z",
  },
};

function context(overrides = {}) {
  return {
    asOf,
    freshnessPolicy,
    rankingPolicy,
    ...overrides,
  };
}

function cloneCandidate(overrides = {}) {
  const candidate = structuredClone(validCandidate);
  return Object.assign(candidate, overrides);
}

test("normalizes Vietnamese and tokenizes with exact deduplicated terms", () => {
  assert.equal(
    normalizeRetrievalText("  ĐỘI—mũ, bảo hiểm!  "),
    "doi mu bao hiem",
  );
  assert.deepEqual(
    tokenizeRetrievalQuery("Em đội mũ, đội MŨ bảo hiểm như thế nào?"),
    ["doi", "mu", "bao", "hiem"],
  );
});

test("missing or malformed server policies fail closed", () => {
  const wrongWeightKeys = {
    ...rankingPolicy.weights,
    unexpected: 1,
  };
  delete wrongWeightKeys.title;

  const cases = [
    {
      context: { asOf },
      code: "MISSING_FRESHNESS_POLICY",
    },
    {
      context: context({
        freshnessPolicy: {
          ...freshnessPolicy,
          approval: { ...approval, pm: approval.internalContentReviewer },
        },
      }),
      code: "INVALID_FRESHNESS_POLICY",
    },
    {
      context: context({ freshnessPolicy: {} }),
      code: "INVALID_FRESHNESS_POLICY",
    },
    {
      context: { asOf, freshnessPolicy },
      code: "MISSING_RANKING_POLICY",
    },
    {
      context: context({
        rankingPolicy: { ...rankingPolicy, topK: 0 },
      }),
      code: "INVALID_RANKING_POLICY",
    },
    {
      context: context({
        rankingPolicy: { ...rankingPolicy, minimumScore: 0 },
      }),
      code: "INVALID_RANKING_POLICY",
    },
    {
      context: context({ rankingPolicy: {} }),
      code: "INVALID_RANKING_POLICY",
    },
    {
      context: context({
        rankingPolicy: {
          ...rankingPolicy,
          weights: wrongWeightKeys,
        },
      }),
      code: "INVALID_RANKING_POLICY",
    },
  ];

  for (const item of cases) {
    const result = rankProvisionCandidates(
      "đội mũ bảo hiểm",
      [validCandidate],
      item.context,
    );
    assert.equal(result.status, "unavailable");
    assert.equal(result.code, item.code);
  }
});

test("eligibility rejects unreviewed graph, invalid relations and inactive records", () => {
  const cases = [
    [
      "GRAPH_METADATA_INVALID",
      (item) => (item.answerSignal.tags = "not-json"),
    ],
    [
      "GRAPH_METADATA_INVALID",
      (item) => (item.provision.article = "x".repeat(201)),
    ],
    [
      "GRAPH_METADATA_INVALID",
      (item) => (item.answerSignal.updatedAt = "not-a-timestamp"),
    ],
    [
      "GRAPH_METADATA_INVALID",
      (item) => (item.provision.updatedAt = "2026-08-01T00:00:00Z"),
    ],
    [
      "GRAPH_METADATA_INVALID",
      (item) => (item.source.updatedAt = "2026-08-01T00:00:00Z"),
    ],
    ["ANSWER_NOT_PUBLISHED", (item) => (item.answerSignal.status = "draft")],
    [
      "ANSWER_NOT_FOUR_EYES_REVIEWED",
      (item) => (item.answerSignal.reviewStatus = "legacy_unverified"),
    ],
    [
      "ANSWER_NOT_FOUR_EYES_REVIEWED",
      (item) => (item.answerSignal.reviewedAt = "2026-08-01T00:00:00Z"),
    ],
    [
      "CITATION_RELATION_MISMATCH",
      (item) => (item.citationLink.provisionId = 999),
    ],
    [
      "CITATION_NOT_FOUR_EYES_REVIEWED",
      (item) => (item.citationLink.reviewStatus = "legacy_unverified"),
    ],
    [
      "PROVISION_NOT_PUBLISHED",
      (item) => (item.provision.status = "pending_review"),
    ],
    [
      "PROVISION_NOT_FOUR_EYES_REVIEWED",
      (item) => (item.provision.reviewedBy = item.provision.createdBy),
    ],
    [
      "PROVISION_REVISION_MISSING",
      (item) => (item.provision.checksum = null),
    ],
    [
      "PROVISION_REVISION_MISSING",
      (item) => (item.provision.checksum = "not-a-checksum"),
    ],
    [
      "PROVISION_EFFECTIVITY_UNVERIFIED",
      (item) => (item.provision.effectivityStatus = "unverified"),
    ],
    [
      "PROVISION_NOT_EFFECTIVE",
      (item) => (item.provision.effectiveFrom = "2026-08-01"),
    ],
    [
      "SOURCE_RELATION_MISMATCH",
      (item) => (item.provision.sourceId = 999),
    ],
    ["SOURCE_NOT_IN_FORCE", (item) => (item.source.status = "expired")],
    [
      "SOURCE_NOT_FOUR_EYES_VERIFIED",
      (item) => (item.source.verifiedBy = item.source.createdBy),
    ],
    [
      "SOURCE_TIMESTAMP_INVALID",
      (item) => (item.source.lastVerifiedAt = "2026-08-01T00:00:00Z"),
    ],
    [
      "SOURCE_URL_INVALID",
      (item) => (item.source.officialUrl = "https://evil.example/vbpl.vn"),
    ],
    [
      "SOURCE_NOT_EFFECTIVE",
      (item) => (item.source.effectiveTo = "2026-07-30"),
    ],
    [
      "SOURCE_STALE",
      (item) => (item.source.lastVerifiedAt = "2026-06-01T00:00:00Z"),
    ],
  ];

  for (const [expected, mutate] of cases) {
    const candidate = cloneCandidate();
    mutate(candidate);
    assert.equal(
      getCandidateEligibilityReason(candidate, freshnessPolicy, asOf),
      expected,
    );
  }

  const missingRulePolicy = {
    ...freshnessPolicy,
    rules: [{ officialHost: "chinhphu.vn", maxAgeDays: 30 }],
  };
  assert.equal(
    getCandidateEligibilityReason(validCandidate, missingRulePolicy, asOf),
    "NO_FRESHNESS_RULE",
  );
});

test("date and TTL boundaries are inclusive and future review is rejected", () => {
  const boundary = cloneCandidate();
  boundary.provision.effectiveTo = "2026-07-31";
  boundary.source.effectiveTo = "2026-07-31";
  boundary.source.lastVerifiedAt = "2026-07-01T12:00:00Z";
  assert.equal(
    getCandidateEligibilityReason(boundary, freshnessPolicy, asOf),
    null,
  );
});

test("returns ranked provision candidates with versioned score reasons", () => {
  const result = rankProvisionCandidates(
    "đội mũ bảo hiểm",
    [validCandidate],
    context(),
  );

  assert.equal(result.status, "candidates");
  if (result.status !== "candidates") return;
  assert.equal(result.candidateSet.rankingPolicyVersion, rankingPolicy.version);
  assert.equal(
    result.candidateSet.freshnessPolicyVersion,
    freshnessPolicy.version,
  );
  assert.equal(result.candidateSet.candidates.length, 1);
  const candidate = result.candidateSet.candidates[0];
  assert.match(candidate.candidateId, /^provision:11:source:7:revision:/);
  assert.ok(candidate.score >= rankingPolicy.minimumScore);
  assert.deepEqual(candidate.matchedTerms, ["bao", "doi", "hiem", "mu"]);
  assert.ok(candidate.matchReasons.some((reason) => reason.field === "title"));
  assert.equal(candidate.provision.revisionId, "provision-11-revision-a");
  assert.equal(candidate.source.officialHost, "vbpl.vn");
  assert.equal("penalty" in candidate, false);
  assert.equal("remedy" in candidate, false);
  assert.equal("caseStudy" in candidate, false);
  assert.equal("legalBasis" in candidate, false);
});

test("ranking is diacritic-insensitive, deterministic and deduplicates a provision", () => {
  const lowerId = cloneCandidate();
  lowerId.answerSignal.id = 10;
  lowerId.citationLink.legalEntryId = 10;

  const secondProvision = cloneCandidate();
  secondProvision.answerSignal.id = 30;
  secondProvision.citationLink.legalEntryId = 30;
  secondProvision.provision.id = 12;
  secondProvision.citationLink.provisionId = 12;
  secondProvision.provision.revisionId = "provision-12-revision-a";

  const first = rankProvisionCandidates(
    "doi mu bao hiem",
    [validCandidate, secondProvision, lowerId],
    context({ rankingPolicy: { ...rankingPolicy, topK: 2 } }),
  );
  const shuffled = rankProvisionCandidates(
    "đội mũ bảo hiểm",
    [lowerId, validCandidate, secondProvision],
    context({ rankingPolicy: { ...rankingPolicy, topK: 2 } }),
  );

  assert.equal(first.status, "candidates");
  assert.equal(shuffled.status, "candidates");
  if (first.status !== "candidates" || shuffled.status !== "candidates") return;
  assert.deepEqual(
    first.candidateSet.candidates.map((item) => item.candidateId),
    shuffled.candidateSet.candidates.map((item) => item.candidateId),
  );
  assert.equal(first.candidateSet.candidates.length, 2);
  assert.equal(first.candidateSet.candidates[0].rankingSignal.answerId, 10);
});

test("fails closed when the candidate scan is truncated before ranking", async () => {
  const limitedRankingPolicy = {
    ...rankingPolicy,
    candidateLimit: 1,
  };
  const pureResult = rankProvisionCandidates(
    "đội mũ bảo hiểm",
    [validCandidate, cloneCandidate()],
    context({ rankingPolicy: limitedRankingPolicy }),
  );
  assert.equal(pureResult.status, "unavailable");
  assert.equal(pureResult.code, "CANDIDATE_SCAN_OVERFLOW");

  let boundLimit = null;
  const database = {
    prepare() {
      return {
        bind(value) {
          boundLimit = value;
          return {
            async all() {
              return { results: [{}, {}] };
            },
          };
        },
      };
    },
  };
  const retriever = createProvisionCandidateRetriever({
    database,
    freshnessPolicy,
    rankingPolicy: limitedRankingPolicy,
    clock: () => asOf,
  });
  const result = await retriever.retrieve("đội mũ bảo hiểm");
  assert.equal(boundLimit, 2);
  assert.equal(result.status, "unavailable");
  assert.equal(result.code, "CANDIDATE_SCAN_OVERFLOW");
});

test("fails closed when one canonical revision has conflicting content", () => {
  const conflicting = cloneCandidate();
  conflicting.provision.checksum =
    "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
  conflicting.provision.originalText = "Nội dung mâu thuẫn trong cùng revision.";

  const result = rankProvisionCandidates(
    "đội mũ bảo hiểm",
    [validCandidate, conflicting],
    context(),
  );
  assert.equal(result.status, "unavailable");
  assert.equal(result.code, "CANDIDATE_CONFLICT");
});

test("substring traps and below-threshold queries return unavailable", () => {
  const substringCandidate = cloneCandidate();
  substringCandidate.answerSignal.title = "Mũi đường và bảo tàng";
  substringCandidate.answerSignal.tags = "[]";
  substringCandidate.provision.originalText = "Nội dung khác.";
  substringCandidate.provision.simplifiedText = "Nội dung khác.";

  const result = rankProvisionCandidates(
    "mũ bảo hiểm",
    [substringCandidate],
    context(),
  );
  assert.equal(result.status, "unavailable");
  assert.equal(result.code, "BELOW_THRESHOLD");
});

test("empty and oversized questions fail before ranking", () => {
  for (const question of ["", "không với em", "x".repeat(601)]) {
    const result = rankProvisionCandidates(
      question,
      [validCandidate],
      context(),
    );
    assert.equal(result.status, "unavailable");
    assert.equal(result.code, "INVALID_QUERY");
  }
});

test("the current D1 graph loads through canonical joins but remains legacy-unverified", async () => {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec(
    await readFile(new URL("../drizzle/0000_groovy_cerise.sql", import.meta.url), "utf8"),
  );
  sqlite.exec(
    await readFile(
      new URL("../drizzle/0001_citation_foundation.sql", import.meta.url),
      "utf8",
    ),
  );
  sqlite.exec(`
    INSERT INTO legal_entries
      (id, topic, icon, title, legal_basis, penalty, remedy, case_study, tags, status)
    VALUES
      (21, 'Giao thông', 'x', 'Đội mũ bảo hiểm', 'legacy free text', 'legacy', 'legacy', 'legacy', '[]', 'published');
    INSERT INTO legal_sources
      (id, document_number, title, official_url, official_host, effective_from,
       status, created_by, last_verified_at, verified_by)
    VALUES
      (7, 'VB-MAU', 'Văn bản mẫu', 'https://vbpl.vn/van-ban-mau', 'vbpl.vn',
       '2026-01-01', 'in_force', 'source-editor', '2026-07-15T12:00:00Z', 'source-reviewer');
    INSERT INTO legal_provisions
      (id, source_id, article, original_text, simplified_text, status,
       created_by, reviewed_by, reviewed_at)
    VALUES
      (11, 7, 'Điều mẫu', 'Phải đội mũ bảo hiểm.', 'Cần đội mũ bảo hiểm.',
       'published', 'provision-editor', 'provision-reviewer', '2026-07-10T00:00:00Z');
    INSERT INTO legal_entry_citations (legal_entry_id, provision_id, display_order)
    VALUES (21, 11, 0);
  `);

  const d1 = {
    prepare(query) {
      return {
        bind(...values) {
          return {
            async all() {
              return { results: sqlite.prepare(query).all(...values) };
            },
          };
        },
      };
    },
  };

  const graph = await loadD1CandidateGraph(d1, 100);
  assert.equal(graph.overflow, false);
  assert.equal(graph.rows.length, 1);
  assert.equal(graph.rows[0].answerSignal.reviewStatus, "legacy_unverified");
  assert.equal(graph.rows[0].citationLink.reviewStatus, "legacy_unverified");
  assert.equal(graph.rows[0].provision.revisionId, null);
  assert.equal("legalBasis" in graph.rows[0].answerSignal, false);
  assert.equal("penalty" in graph.rows[0].answerSignal, false);
  assert.equal("remedy" in graph.rows[0].answerSignal, false);

  const result = rankProvisionCandidates(
    "đội mũ bảo hiểm",
    graph.rows,
    context(),
  );
  assert.deepEqual(result, {
    status: "unavailable",
    code: "NO_ELIGIBLE_CANDIDATES",
    diagnostics: { graphRowCount: 1, eligibleCandidateCount: 0 },
  });
});

test("the injected retriever fails closed on dependency error and does not query for invalid config", async () => {
  let calls = 0;
  const database = {
    prepare() {
      calls += 1;
      throw new Error("D1 unavailable");
    },
  };

  const retriever = createProvisionCandidateRetriever({
    database,
    freshnessPolicy,
    rankingPolicy,
    clock: () => asOf,
  });
  assert.equal((await retriever.retrieve("đội mũ bảo hiểm")).code, "DEPENDENCY_ERROR");
  assert.equal(calls, 1);

  const invalidRetriever = createProvisionCandidateRetriever({
    database,
    freshnessPolicy,
    rankingPolicy: { ...rankingPolicy, topK: 0 },
    clock: () => asOf,
  });
  assert.equal(
    (await invalidRetriever.retrieve("đội mũ bảo hiểm")).code,
    "INVALID_RANKING_POLICY",
  );
  assert.equal(calls, 1);

  const brokenClockRetriever = createProvisionCandidateRetriever({
    database,
    freshnessPolicy,
    rankingPolicy,
    clock: () => {
      throw new Error("clock unavailable");
    },
  });
  assert.equal(
    (await brokenClockRetriever.retrieve("đội mũ bảo hiểm")).code,
    "DEPENDENCY_ERROR",
  );
  assert.equal(calls, 1);
});

test("the injected retriever snapshots policies against caller mutation", async () => {
  const mutableFreshnessPolicy = structuredClone(freshnessPolicy);
  const mutableRankingPolicy = structuredClone(rankingPolicy);
  let boundLimit = null;
  const database = {
    prepare() {
      return {
        bind(value) {
          boundLimit = value;
          return {
            async all() {
              return { results: [] };
            },
          };
        },
      };
    },
  };
  const retriever = createProvisionCandidateRetriever({
    database,
    freshnessPolicy: mutableFreshnessPolicy,
    rankingPolicy: mutableRankingPolicy,
    clock: () => asOf,
  });

  mutableFreshnessPolicy.rules[0].maxAgeDays = 0;
  mutableRankingPolicy.candidateLimit = 1;
  mutableRankingPolicy.topK = 0;
  mutableRankingPolicy.weights.title = -1;

  const result = await retriever.retrieve("đội mũ bảo hiểm");
  assert.equal(boundLimit, rankingPolicy.candidateLimit + 1);
  assert.equal(result.status, "unavailable");
  assert.equal(result.code, "NO_ELIGIBLE_CANDIDATES");
});

test("the candidate foundation remains isolated from chat and OpenAI", async () => {
  const [chatRoute, retrieverSource] = await Promise.all([
    readFile(new URL("../app/api/chat/route.ts", import.meta.url), "utf8"),
    readFile(
      new URL("../lib/legal-evidence-retriever.ts", import.meta.url),
      "utf8",
    ),
  ]);
  assert.doesNotMatch(chatRoute, /legal-evidence-retriever|rankProvisionCandidates/);
  assert.doesNotMatch(retrieverSource, /composeEvidenceAnswer|openai-evidence/);
  assert.doesNotMatch(retrieverSource, /\bFTS5?\b|\bWHERE\b[^\n]*\bMATCH\b/i);
});
