// Đọc và chuẩn hóa dữ liệu cơ quan cho /api/co-quan (US-039).
// Tách khỏi route để test được mà không cần dựng runtime Cloudflare.

import {
  buildReferralChain,
  fallbackReferralAuthorities,
  isAuthorityLevel,
  parseAuthorityTopics,
  type ReferralAuthority,
  type ReferralStep,
} from "./authority-referral";
import { isContentTopic, type ContentTopic } from "./topics";

export type AuthorityRow = Readonly<{
  id: unknown;
  name: unknown;
  level: unknown;
  topics: unknown;
  scope: unknown;
  address: unknown;
  phone: unknown;
  hotline: unknown;
  note: unknown;
}>;

export type ReferralPayload = Readonly<{
  topic: ContentTopic | null;
  chain: readonly ReferralStep[];
  degraded: boolean;
}>;

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

// Một hàng hỏng chỉ làm mất chính nó, không được làm sập cả mục trợ giúp.
export function parseAuthorityRows(
  rows: readonly AuthorityRow[],
): readonly ReferralAuthority[] {
  const parsed: ReferralAuthority[] = [];
  for (const row of rows) {
    const id = typeof row.id === "number" ? row.id : Number.NaN;
    const name = text(row.name);
    if (!Number.isInteger(id) || name === "") continue;
    if (!isAuthorityLevel(row.level)) continue;
    parsed.push(
      Object.freeze({
        id,
        name,
        level: row.level,
        topics: parseAuthorityTopics(row.topics),
        scope: text(row.scope),
        address: text(row.address),
        phone: text(row.phone),
        hotline: text(row.hotline),
        note: text(row.note),
      }),
    );
  }
  return Object.freeze(parsed);
}

export function buildReferralPayload(
  rows: readonly AuthorityRow[] | null,
  topic: ContentTopic | null,
): ReferralPayload {
  const parsed = rows ? parseAuthorityRows(rows) : [];
  const chain = buildReferralChain(parsed, topic);
  if (chain.length > 0) {
    return Object.freeze({ topic, chain, degraded: false });
  }
  return Object.freeze({
    topic,
    chain: buildReferralChain(fallbackReferralAuthorities, topic),
    degraded: true,
  });
}

export function createAuthorityHandler(
  loadRows: () => Promise<readonly AuthorityRow[]>,
): (request: Request) => Promise<Response> {
  return async function handle(request: Request): Promise<Response> {
    const requested = new URL(request.url).searchParams.get("topic");
    if (requested !== null && !isContentTopic(requested)) {
      return Response.json(
        { error: "INVALID_TOPIC" },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }
    const topic: ContentTopic | null = requested === null ? null : requested;

    let rows: readonly AuthorityRow[] | null = null;
    try {
      rows = await loadRows();
    } catch {
      rows = null;
    }
    return Response.json(buildReferralPayload(rows, topic), {
      headers: { "Cache-Control": "no-store" },
    });
  };
}
