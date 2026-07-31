import {
  canonicalOfficialSourceUrl,
  isOfficialGovernmentHost,
} from "./official-source-url";
import type { ChatTopic } from "./chat-topic-scope";

export const OFFICIAL_CORPUS_SCHEMA_VERSION = "official-corpus-drafts-v1";
export const OFFICIAL_CORPUS_IMPORT_POLICY_VERSION =
  "official-corpus-import-v1";
export const OFFICIAL_CORPUS_PROVIDER_MODEL = "official-corpus-draft-v1";

const topicLabels = {
  traffic: "Giao thông",
  online_safety: "Mạng xã hội",
  copyright: "Sở hữu trí tuệ",
} as const satisfies Record<ChatTopic, string>;

const intentContracts = {
  "traffic.motorcycle_passenger_overload": {
    topic: "traffic",
    recordKind: "legal_candidate",
  },
  "traffic.motorcycle_red_light": {
    topic: "traffic",
    recordKind: "legal_candidate",
  },
  "online_safety.false_or_insulting_content": {
    topic: "online_safety",
    recordKind: "legal_candidate",
  },
  "online_safety.account_compromise": {
    topic: "online_safety",
    recordKind: "official_guidance",
  },
  "copyright.school_quotation": {
    topic: "copyright",
    recordKind: "legal_candidate",
  },
  "copyright.school_image_use": {
    topic: "copyright",
    recordKind: "legal_candidate",
  },
  "copyright.school_music_remix": {
    topic: "copyright",
    recordKind: "legal_candidate",
  },
} as const;

const legacyContentHashes = new Map([
  [
    "a9d6f3e2-7331-4cb0-8db5-0d745b06c001",
    "e14003a28151b343a78f2febf5c44773f3098818fdcf78b78dfd4acacb036a46",
  ],
  [
    "a9d6f3e2-7331-4cb0-8db5-0d745b06c002",
    "f83116bbc92565c783138c91e787dc9395690b8d22e49f53d4253321da641a15",
  ],
  [
    "a9d6f3e2-7331-4cb0-8db5-0d745b06c003",
    "24aedfabe5f144be50f4c93d0e1f5d779cb24962bf35b143ebb6ed37539066e6",
  ],
  [
    "a9d6f3e2-7331-4cb0-8db5-0d745b06c004",
    "e86c4347d4b213247bf52a9e2a16c929c26c076fe300f81b885b5243f66b005d",
  ],
  [
    "a9d6f3e2-7331-4cb0-8db5-0d745b06c005",
    "748358b54a5449ffa4e7073875923d5db339ee2bf12a157ef13a679946ec3632",
  ],
  [
    "a9d6f3e2-7331-4cb0-8db5-0d745b06c006",
    "00556f00cd3631d1cb909338736822c6edf4570dab2abb86f962f903f370efff",
  ],
  [
    "a9d6f3e2-7331-4cb0-8db5-0d745b06c007",
    "1569e7871065269708d54e215586e3f74c2bb224eda38d3cb27a8bf1401f7674",
  ],
]);

type IntentKey = keyof typeof intentContracts;
type RecordKind = (typeof intentContracts)[IntentKey]["recordKind"];
type D1Like = Pick<D1Database, "prepare" | "batch">;

type ImportDependencies = {
  db: D1Like;
};

type LegalInstrumentCitation = {
  kind: "legal_instrument";
  title: string;
  url: string;
  documentNumber: string;
  article?: string;
  clause?: string;
  point?: string;
  issuedAt: string;
  effectiveFrom: string;
  effectiveTo?: string;
  effectivityNote?: string;
  lastVerifiedAt: string;
};

type OfficialGuidanceCitation = {
  kind: "official_guidance";
  title: string;
  url: string;
  publisher: string;
  publishedAt: string;
  lastVerifiedAt: string;
};

type DraftCitation = LegalInstrumentCitation | OfficialGuidanceCitation;

export type OfficialCorpusDraftSnapshot = {
  topic: (typeof topicLabels)[ChatTopic];
  title: string;
  answer: string;
  tags: string[];
  citations: DraftCitation[];
};

export type OfficialCorpusDraftRecord = {
  intentKey: IntentKey;
  candidateId: string;
  requestId: string;
  canonicalQuestion: string;
  aliases: string[];
  topic: ChatTopic;
  recordKind: RecordKind;
  proposedSnapshot: OfficialCorpusDraftSnapshot;
  reviewNotes: string;
};

export type OfficialCorpusDraftPacket = {
  schemaVersion: typeof OFFICIAL_CORPUS_SCHEMA_VERSION;
  packetId: string;
  verifiedAt: string;
  records: OfficialCorpusDraftRecord[];
};

function rows(result: D1Result | undefined) {
  return Array.isArray(result?.results) ? result.results : [];
}

function recordValue(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function hasExactKeys(
  input: Record<string, unknown>,
  required: readonly string[],
  optional: readonly string[] = [],
) {
  const allowed = new Set([...required, ...optional]);
  return (
    required.every((key) => key in input) &&
    Object.keys(input).every((key) => allowed.has(key))
  );
}

function boundedText(value: unknown, maximum: number) {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length > 0 && normalized.length <= maximum
    ? normalized
    : null;
}

function isoDate(value: unknown) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.valueOf()) &&
    date.toISOString().slice(0, 10) === value
    ? value
    : null;
}

function uuid(value: unknown) {
  return typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
    ? value.toLowerCase()
    : null;
}

function stringList(
  value: unknown,
  minimum: number,
  maximum: number,
  itemMaximum: number,
) {
  if (!Array.isArray(value) || value.length < minimum || value.length > maximum) {
    return null;
  }
  const items = value.map((item) => boundedText(item, itemMaximum));
  if (items.some((item) => !item)) return null;
  const unique = Array.from(new Set(items as string[]));
  return unique.length === items.length ? unique : null;
}

function stripCitationPrefix(
  value: unknown,
  prefix: "Điều" | "Khoản" | "Điểm",
) {
  const normalized = value ? boundedText(value, 160) : undefined;
  if (value && !normalized) return null;
  return normalized
    ? normalized.replace(new RegExp(`^${prefix}\\s+`, "iu"), "").trim()
    : undefined;
}

function normalizeCitation(
  value: unknown,
  verifiedAt: string,
): DraftCitation | null {
  const input = recordValue(value);
  if (!input || !["legal_instrument", "official_guidance"].includes(String(input.kind))) {
    return null;
  }
  const title = boundedText(input.title, 240);
  const url = canonicalOfficialSourceUrl(input.url);
  const lastVerifiedAt = isoDate(input.lastVerifiedAt);
  if (!title || !url || !lastVerifiedAt || lastVerifiedAt !== verifiedAt) {
    return null;
  }

  if (input.kind === "official_guidance") {
    if (
      !hasExactKeys(input, [
        "kind",
        "title",
        "url",
        "publisher",
        "publishedAt",
        "lastVerifiedAt",
      ])
    ) {
      return null;
    }
    const publisher = boundedText(input.publisher, 200);
    const publishedAt = isoDate(input.publishedAt);
    if (!publisher || !publishedAt || publishedAt > verifiedAt) return null;
    return {
      kind: "official_guidance",
      title,
      url,
      publisher,
      publishedAt,
      lastVerifiedAt,
    };
  }

  if (
    !hasExactKeys(
      input,
      [
        "kind",
        "title",
        "url",
        "documentNumber",
        "issuedAt",
        "effectiveFrom",
        "lastVerifiedAt",
      ],
      ["article", "clause", "point", "effectiveTo", "effectivityNote"],
    )
  ) {
    return null;
  }
  const documentNumber = boundedText(input.documentNumber, 160);
  const issuedAt = isoDate(input.issuedAt);
  const effectiveFrom = isoDate(input.effectiveFrom);
  const effectiveTo = input.effectiveTo
    ? isoDate(input.effectiveTo)
    : undefined;
  const effectivityNote = input.effectivityNote
    ? boundedText(input.effectivityNote, 500)
    : undefined;
  const article = stripCitationPrefix(input.article, "Điều");
  const clause = stripCitationPrefix(input.clause, "Khoản");
  const point = stripCitationPrefix(input.point, "Điểm");
  if (
    !documentNumber ||
    !issuedAt ||
    !effectiveFrom ||
    issuedAt > verifiedAt ||
    effectiveFrom > verifiedAt ||
    (input.effectiveTo && !effectiveTo) ||
    (effectiveTo && effectiveTo < effectiveFrom) ||
    (input.effectivityNote && !effectivityNote) ||
    article === null ||
    clause === null ||
    point === null
  ) {
    return null;
  }
  return {
    kind: "legal_instrument",
    title,
    url,
    documentNumber,
    ...(article ? { article } : {}),
    ...(clause ? { clause } : {}),
    ...(point ? { point } : {}),
    issuedAt,
    effectiveFrom,
    ...(effectiveTo ? { effectiveTo } : {}),
    ...(effectivityNote ? { effectivityNote } : {}),
    lastVerifiedAt,
  };
}

function normalizeRecord(
  value: unknown,
  verifiedAt: string,
): OfficialCorpusDraftRecord | null {
  const input = recordValue(value);
  if (
    !input ||
    !hasExactKeys(input, [
      "intentKey",
      "candidateId",
      "requestId",
      "canonicalQuestion",
      "aliases",
      "topic",
      "recordKind",
      "proposedSnapshot",
      "reviewNotes",
    ])
  ) {
    return null;
  }
  const intentKey =
    typeof input.intentKey === "string" && input.intentKey in intentContracts
      ? (input.intentKey as IntentKey)
      : null;
  const contract = intentKey ? intentContracts[intentKey] : null;
  const candidateId = uuid(input.candidateId);
  const requestId = uuid(input.requestId);
  const canonicalQuestion = boundedText(input.canonicalQuestion, 300);
  const aliases = stringList(input.aliases, 2, 12, 60);
  const topic =
    typeof input.topic === "string" && input.topic in topicLabels
      ? (input.topic as ChatTopic)
      : null;
  const recordKind =
    input.recordKind === "legal_candidate" ||
    input.recordKind === "official_guidance"
      ? input.recordKind
      : null;
  const reviewNotes = boundedText(input.reviewNotes, 1_000);
  const snapshotInput = recordValue(input.proposedSnapshot);
  if (
    !contract ||
    !candidateId ||
    !requestId ||
    !canonicalQuestion ||
    !aliases ||
    !topic ||
    !recordKind ||
    topic !== contract.topic ||
    recordKind !== contract.recordKind ||
    !reviewNotes ||
    !snapshotInput ||
    !hasExactKeys(snapshotInput, [
      "topic",
      "title",
      "answer",
      "tags",
      "citations",
    ])
  ) {
    return null;
  }
  const snapshotTopic = boundedText(snapshotInput.topic, 80);
  const title = boundedText(snapshotInput.title, 240);
  const answer = boundedText(snapshotInput.answer, 6_000);
  const tags = stringList(snapshotInput.tags, 2, 12, 60);
  if (
    snapshotTopic !== topicLabels[topic] ||
    !title ||
    !answer ||
    !tags ||
    !Array.isArray(snapshotInput.citations) ||
    snapshotInput.citations.length < 1 ||
    snapshotInput.citations.length > 8
  ) {
    return null;
  }
  const citations = snapshotInput.citations.map((citation) =>
    normalizeCitation(citation, verifiedAt),
  );
  if (citations.some((citation) => !citation)) return null;
  const normalizedCitations = citations as DraftCitation[];
  if (
    new Set(normalizedCitations.map((citation) => citation.url)).size !==
      normalizedCitations.length ||
    (recordKind === "legal_candidate" &&
      normalizedCitations.some((citation) => citation.kind !== "legal_instrument")) ||
    (recordKind === "official_guidance" &&
      normalizedCitations.some((citation) => citation.kind !== "official_guidance"))
  ) {
    return null;
  }
  if (
    topic === "copyright" &&
    !tags.some((tag) =>
      ["bản quyền", "quyền tác giả", "copyright"].includes(
        tag.toLocaleLowerCase("vi"),
      ),
    )
  ) {
    return null;
  }
  if (intentKey === "online_safety.false_or_insulting_content") {
    const legalCitations = normalizedCitations.filter(
      (citation): citation is LegalInstrumentCitation =>
        citation.kind === "legal_instrument",
    );
    if (
      !legalCitations.some(
        (citation) =>
          citation.documentNumber === "174/2026/NĐ-CP" &&
          citation.effectiveFrom === "2026-07-01" &&
          citation.article?.includes("95"),
      ) ||
      legalCitations.some(
        (citation) =>
          /15\/2020/i.test(citation.documentNumber) ||
          /(?:^|\D)101(?:\D|$)/i.test(citation.article ?? ""),
      )
    ) {
      return null;
    }
  }
  if (
    /Điều 101|Nghị định (?:số )?15\/2020|5\s*[–-]\s*10\s*triệu/i.test(
      JSON.stringify({ answer, citations: normalizedCitations }),
    )
  ) {
    return null;
  }
  return {
    intentKey: intentKey as IntentKey,
    candidateId,
    requestId,
    canonicalQuestion,
    aliases,
    topic,
    recordKind,
    proposedSnapshot: {
      topic: snapshotTopic as OfficialCorpusDraftSnapshot["topic"],
      title,
      answer,
      tags,
      citations: normalizedCitations,
    },
    reviewNotes,
  };
}

export function normalizeOfficialCorpusDraftPacket(
  value: unknown,
): OfficialCorpusDraftPacket | null {
  const input = recordValue(value);
  if (
    !input ||
    !hasExactKeys(input, [
      "schemaVersion",
      "packetId",
      "verifiedAt",
      "records",
    ]) ||
    input.schemaVersion !== OFFICIAL_CORPUS_SCHEMA_VERSION
  ) {
    return null;
  }
  const packetId = boundedText(input.packetId, 120);
  const verifiedAt = isoDate(input.verifiedAt);
  if (
    !packetId ||
    !/^[a-z0-9]+(?:[._-][a-z0-9]+)+$/.test(packetId) ||
    !verifiedAt ||
    !Array.isArray(input.records) ||
    input.records.length !== Object.keys(intentContracts).length
  ) {
    return null;
  }
  const records = input.records.map((record) =>
    normalizeRecord(record, verifiedAt),
  );
  if (records.some((record) => !record)) return null;
  const normalizedRecords = records as OfficialCorpusDraftRecord[];
  const intentKeys = new Set(normalizedRecords.map((record) => record.intentKey));
  const candidateIds = new Set(
    normalizedRecords.map((record) => record.candidateId),
  );
  const requestIds = new Set(
    normalizedRecords.map((record) => record.requestId),
  );
  if (
    intentKeys.size !== Object.keys(intentContracts).length ||
    candidateIds.size !== normalizedRecords.length ||
    requestIds.size !== normalizedRecords.length ||
    Object.keys(intentContracts).some(
      (intentKey) => !intentKeys.has(intentKey as IntentKey),
    )
  ) {
    return null;
  }
  return {
    schemaVersion: OFFICIAL_CORPUS_SCHEMA_VERSION,
    packetId,
    verifiedAt,
    records: normalizedRecords,
  };
}

async function sha256(value: string) {
  const digest = new Uint8Array(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)),
  );
  return [...digest]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function editorialSnapshot(record: OfficialCorpusDraftRecord) {
  const tags = Array.from(
    new Set([...record.proposedSnapshot.tags, ...record.aliases]),
  ).slice(0, 12);
  return {
    ...record.proposedSnapshot,
    tags,
  };
}

function recordCanonical(record: OfficialCorpusDraftRecord) {
  return JSON.stringify({
    intentKey: record.intentKey,
    candidateId: record.candidateId,
    requestId: record.requestId,
    canonicalQuestion: record.canonicalQuestion,
    aliases: record.aliases,
    topic: record.topic,
    recordKind: record.recordKind,
    proposedSnapshot: editorialSnapshot(record),
    reviewNotes: record.reviewNotes,
  });
}

function legacyCanonical(
  answer: unknown,
  model: unknown,
  sourceUrls: unknown[],
) {
  return JSON.stringify({ answer, model, sources: sourceUrls });
}

function eventId(candidateId: string, prefix: "b" | "c") {
  return `${prefix}${candidateId.slice(1)}`;
}

function eventMetadata(
  packet: OfficialCorpusDraftPacket,
  record: OfficialCorpusDraftRecord,
  recordSha256: string,
) {
  const metadata = JSON.stringify({
    packetId: packet.packetId,
    intentKey: record.intentKey,
    sourceCount: record.proposedSnapshot.citations.length,
    recordSha256,
    publicationEligible: record.recordKind === "legal_candidate",
    reviewNotes: record.reviewNotes,
    intakeDraft: editorialSnapshot(record),
  });
  return metadata.length <= 8_192 ? metadata : null;
}

function parseEventMetadata(value: unknown) {
  if (typeof value !== "string") return null;
  try {
    return recordValue(JSON.parse(value));
  } catch {
    return null;
  }
}

function storedSourceMatches(
  source: Record<string, unknown>,
  expected: DraftCitation,
  expectedHash: string,
) {
  const host = new URL(expected.url).hostname.toLowerCase();
  return (
    source.title === expected.title &&
    source.official_url === expected.url &&
    source.official_host === host &&
    source.url_sha256 === expectedHash
  );
}

export async function importOfficialCorpusDrafts(
  value: unknown,
  dependencies: ImportDependencies,
) {
  const packet = normalizeOfficialCorpusDraftPacket(value);
  if (!packet) {
    return { ok: false as const, reason: "invalid_packet" as const };
  }
  const prepared = await Promise.all(
    packet.records.map(async (record) => {
      const recordSha256 = await sha256(recordCanonical(record));
      return {
        record,
        recordSha256,
        sourceHashes: await Promise.all(
          record.proposedSnapshot.citations.map((citation) =>
            sha256(citation.url),
          ),
        ),
        metadata: eventMetadata(packet, record, recordSha256),
      };
    }),
  );
  if (prepared.some((item) => !item.metadata)) {
    return { ok: false as const, reason: "invalid_packet" as const };
  }

  const db = dependencies.db;
  let existingResults: D1Result[];
  try {
    existingResults = await db.batch(
      prepared.flatMap(({ record }) => [
        db.prepare(`
          SELECT id, request_id, content_sha256, initial_answer_text,
                 provider_model, policy_version, lifecycle_status,
                 current_revision_id
          FROM web_search_candidates
          WHERE id = ? OR request_id = ?
          ORDER BY id
        `).bind(record.candidateId, record.requestId),
        db.prepare(`
          SELECT s.display_order, s.title, s.official_url,
                 s.official_host, s.url_sha256
          FROM web_search_candidate_sources s
          WHERE s.candidate_id = ?
          ORDER BY s.display_order
        `).bind(record.candidateId),
        db.prepare(`
          SELECT id, operation_id, actor_role, action, metadata_json
          FROM web_search_candidate_events
          WHERE candidate_id = ? AND action = 'draft_persisted'
          ORDER BY occurred_at, id
        `).bind(record.candidateId),
      ]),
    );
  } catch {
    return { ok: false as const, reason: "database_error" as const };
  }

  const newRecords = [];
  const bindingUpgrades = [];
  let skipped = 0;
  for (const [index, item] of prepared.entries()) {
    const existing = rows(existingResults[index * 3]);
    const existingSources = rows(existingResults[index * 3 + 1]);
    const existingEvents = rows(existingResults[index * 3 + 2]);
    if (existing.length === 0) {
      if (existingSources.length > 0 || existingEvents.length > 0) {
        return { ok: false as const, reason: "conflict" as const };
      }
      newRecords.push(item);
      continue;
    }
    const current = existing[0];
    const expectedSources = item.record.proposedSnapshot.citations;
    const everyStoredSourceIsExpected = existingSources.every((stored) => {
      const sourceIndex = expectedSources.findIndex(
        (source) => source.url === stored.official_url,
      );
      return (
        sourceIndex >= 0 &&
        storedSourceMatches(
          stored,
          expectedSources[sourceIndex],
          item.sourceHashes[sourceIndex],
        )
      );
    });
    const missingSourceIndexes = expectedSources
      .map((source, sourceIndex) =>
        existingSources.some((stored) => stored.official_url === source.url)
          ? -1
          : sourceIndex,
      )
      .filter((sourceIndex) => sourceIndex >= 0);
    const fullEventExists = existingEvents.some((event) => {
      const metadata = parseEventMetadata(event.metadata_json);
      return (
        event.actor_role === "system" &&
        event.action === "draft_persisted" &&
        metadata?.packetId === packet.packetId &&
        metadata.intentKey === item.record.intentKey &&
        metadata.recordSha256 === item.recordSha256
      );
    });
    const legacyEventExists = existingEvents.some((event) => {
      const metadata = parseEventMetadata(event.metadata_json);
      return (
        event.actor_role === "system" &&
        event.action === "draft_persisted" &&
        metadata?.packetId === packet.packetId &&
        metadata.intentKey === item.record.intentKey &&
        !("recordSha256" in metadata)
      );
    });
    const commonMatches =
      existing.length === 1 &&
      current?.id === item.record.candidateId &&
      current?.request_id === item.record.requestId &&
      current?.provider_model === OFFICIAL_CORPUS_PROVIDER_MODEL &&
      current?.policy_version === OFFICIAL_CORPUS_IMPORT_POLICY_VERSION &&
      everyStoredSourceIsExpected;
    const fullMatches =
      commonMatches &&
      current?.content_sha256 === item.recordSha256 &&
      current?.initial_answer_text === item.record.proposedSnapshot.answer &&
      missingSourceIndexes.length === 0 &&
      fullEventExists;
    if (fullMatches) {
      skipped += 1;
      continue;
    }

    const legacyIdentityMatches =
      commonMatches &&
      current?.lifecycle_status === "draft" &&
      current?.current_revision_id === null &&
      current?.content_sha256 === legacyContentHashes.get(item.record.candidateId);
    if (
      legacyIdentityMatches &&
      fullEventExists &&
      missingSourceIndexes.length === 0
    ) {
      skipped += 1;
      continue;
    }

    const storedLegacyHash = await sha256(
      legacyCanonical(
        current?.initial_answer_text,
        current?.provider_model,
        existingSources.map((source) => source.official_url),
      ),
    );
    const legacyMatches =
      legacyIdentityMatches &&
      current?.content_sha256 === storedLegacyHash &&
      legacyEventExists &&
      !fullEventExists;
    if (!legacyMatches) {
      return { ok: false as const, reason: "conflict" as const };
    }
    bindingUpgrades.push({ ...item, existingSources, missingSourceIndexes });
    skipped += 1;
  }

  const statements = [
    ...newRecords.flatMap(
      ({ record, recordSha256, sourceHashes, metadata }) => [
        db.prepare(`
          INSERT INTO web_search_candidates (
            id, request_id, content_sha256, initial_answer_text,
            provider_model, policy_version, lifecycle_status
          ) VALUES (?, ?, ?, ?, ?, ?, 'draft')
        `).bind(
          record.candidateId,
          record.requestId,
          recordSha256,
          record.proposedSnapshot.answer,
          OFFICIAL_CORPUS_PROVIDER_MODEL,
          OFFICIAL_CORPUS_IMPORT_POLICY_VERSION,
        ),
        ...record.proposedSnapshot.citations.map((citation, sourceIndex) => {
          const host = new URL(citation.url).hostname.toLowerCase();
          if (!isOfficialGovernmentHost(host)) {
            throw new Error("official corpus source host is invalid");
          }
          return db.prepare(`
            INSERT INTO web_search_candidate_sources (
              candidate_id, display_order, title, official_url,
              official_host, url_sha256
            ) VALUES (?, ?, ?, ?, ?, ?)
          `).bind(
            record.candidateId,
            sourceIndex,
            citation.title,
            citation.url,
            host,
            sourceHashes[sourceIndex],
          );
        }),
        db.prepare(`
          INSERT INTO web_search_candidate_events (
            id, operation_id, candidate_id, actor_role,
            action, metadata_json
          ) VALUES (?, ?, ?, 'system', 'draft_persisted', ?)
        `).bind(
          eventId(record.candidateId, "b"),
          `official-corpus:${record.requestId}`,
          record.candidateId,
          metadata,
        ),
      ],
    ),
    ...bindingUpgrades.flatMap(
      ({ record, sourceHashes, metadata, existingSources, missingSourceIndexes }) => {
        const nextDisplayOrder =
          existingSources.reduce(
            (maximum, source) =>
              Math.max(maximum, Number(source.display_order) || 0),
            -1,
          ) + 1;
        return [
          ...missingSourceIndexes.map((sourceIndex, offset) => {
            const citation = record.proposedSnapshot.citations[sourceIndex];
            const host = new URL(citation.url).hostname.toLowerCase();
            return db.prepare(`
              INSERT INTO web_search_candidate_sources (
                candidate_id, display_order, title, official_url,
                official_host, url_sha256
              ) VALUES (?, ?, ?, ?, ?, ?)
            `).bind(
              record.candidateId,
              nextDisplayOrder + offset,
              citation.title,
              citation.url,
              host,
              sourceHashes[sourceIndex],
            );
          }),
          db.prepare(`
            INSERT INTO web_search_candidate_events (
              id, operation_id, candidate_id, actor_role,
              action, metadata_json
            ) VALUES (?, ?, ?, 'system', 'draft_persisted', ?)
          `).bind(
            eventId(record.candidateId, "c"),
            `official-corpus-binding:${record.requestId}`,
            record.candidateId,
            metadata,
          ),
        ];
      },
    ),
  ];
  try {
    const results = statements.length > 0 ? await db.batch(statements) : [];
    if (results.some((result) => result.success === false)) {
      return { ok: false as const, reason: "database_error" as const };
    }
  } catch {
    return { ok: false as const, reason: "database_error" as const };
  }
  return {
    ok: true as const,
    packetId: packet.packetId,
    created: newRecords.length,
    skipped,
    bound: bindingUpgrades.length,
    candidateIds: packet.records.map((record) => record.candidateId),
  };
}
