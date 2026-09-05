// Truy vấn bộ đếm tương tác (US-033 lượt xem, US-034 "Nội dung này ý nghĩa").
//
// Mỗi hành động chạy trong MỘT câu lệnh duy nhất bằng CTE ghi dữ liệu, vì
// driver neon-http chỉ nhận một statement cho mỗi request và không có
// transaction. Nhờ vậy "ghi dấu chống trùng" và "tăng bộ đếm" luôn cùng số
// phận: hoặc cùng thành công, hoặc cùng không xảy ra.
import { sql, type SQL } from "drizzle-orm";
import {
  engagementDayBucket,
  engagementMarkInput,
  engagementMarkKey,
  projectEngagementCounts,
  type EngagementCount,
  type EngagementEntityType,
  type EngagementRequest,
} from "./engagement";

export type EngagementDb = Readonly<{
  execute(query: SQL): Promise<unknown>;
}>;

export type EngagementApplyResult = Readonly<{
  count: EngagementCount;
  counted: boolean;
}>;

const dayMs = 24 * 60 * 60 * 1000;
const maxCountRows = 2_000;
const markCleanupBatch = 500;

function rowsOf(result: unknown): readonly Record<string, unknown>[] {
  const rows = (result as { rows?: unknown }).rows;
  return Array.isArray(rows) ? (rows as Record<string, unknown>[]) : [];
}

// Chỉ đếm cho nội dung đang xuất bản: chặn việc bơm hàng loạt id không tồn
// tại làm phình bảng đếm.
function publishedEntityExists(
  entityType: EngagementEntityType,
  entityId: number,
): SQL {
  return entityType === "law"
    ? sql`SELECT 1 FROM legal_entries WHERE id = ${entityId} AND status = 'published'`
    : sql`SELECT 1 FROM showcases WHERE id = ${entityId} AND status = 'published'`;
}

function currentCount(
  entityType: EngagementEntityType,
  entityId: number,
  column: SQL,
): SQL {
  return sql`SELECT ${column} FROM content_engagement WHERE entity_type = ${entityType} AND entity_id = ${entityId}`;
}

function resultOf(
  request: EngagementRequest,
  result: unknown,
): EngagementApplyResult {
  const row = rowsOf(result)[0] ?? {};
  const [count] = projectEngagementCounts([
    {
      entityType: request.entityType,
      entityId: request.entityId,
      viewCount: row.view_count,
      favoriteCount: row.favorite_count,
    },
  ]);
  return Object.freeze({
    count,
    counted: row.counted === true || row.counted === "t",
  });
}

export async function readEngagementCounts(
  db: EngagementDb,
): Promise<EngagementCount[]> {
  const result = await db.execute(sql`
    SELECT entity_type, entity_id, view_count, favorite_count
    FROM content_engagement
    ORDER BY entity_type, entity_id
    LIMIT ${maxCountRows}`);
  return projectEngagementCounts(
    rowsOf(result).map((row) => ({
      entityType: row.entity_type,
      entityId: Number(row.entity_id),
      viewCount: row.view_count,
      favoriteCount: row.favorite_count,
    })),
  );
}

export async function applyEngagement(
  db: EngagementDb,
  request: EngagementRequest,
  nowMs: number,
): Promise<EngagementApplyResult> {
  const markKey = await engagementMarkKey(
    engagementMarkInput(request, engagementDayBucket(nowMs)),
  );
  const { entityType, entityId } = request;
  const exists = publishedEntityExists(entityType, entityId);
  const viewNow = currentCount(entityType, entityId, sql.raw("view_count"));
  const favoriteNow = currentCount(
    entityType,
    entityId,
    sql.raw("favorite_count"),
  );

  if (request.action === "unfavorite") {
    // Bỏ đánh dấu: chỉ trừ khi đúng dấu của trình duyệt này còn tồn tại, nên
    // gọi lặp lại không bao giờ trừ quá một lần.
    const result = await db.execute(sql`
      WITH released AS (
        DELETE FROM content_engagement_marks
        WHERE mark_key = ${markKey}
        RETURNING 1 AS ok
      ), bumped AS (
        UPDATE content_engagement
        SET favorite_count = GREATEST(favorite_count - 1, 0),
            updated_at = (now())::text
        WHERE entity_type = ${entityType}
          AND entity_id = ${entityId}
          AND EXISTS (SELECT 1 FROM released)
        RETURNING view_count, favorite_count
      )
      SELECT
        COALESCE((SELECT view_count FROM bumped), (${viewNow}), 0) AS view_count,
        COALESCE((SELECT favorite_count FROM bumped), (${favoriteNow}), 0) AS favorite_count,
        EXISTS (SELECT 1 FROM released) AS counted`);
    return resultOf(request, result);
  }

  const isView = request.action === "view";
  const expiresAt = isView
    ? Math.floor((nowMs + 2 * dayMs) / 1_000)
    : null;
  const increment = isView
    ? sql`INSERT INTO content_engagement (entity_type, entity_id, view_count)
          SELECT ${entityType}, ${entityId}, 1 FROM claimed
          ON CONFLICT (entity_type, entity_id) DO UPDATE
            SET view_count = content_engagement.view_count + 1,
                updated_at = (now())::text
          RETURNING view_count, favorite_count`
    : sql`INSERT INTO content_engagement (entity_type, entity_id, favorite_count)
          SELECT ${entityType}, ${entityId}, 1 FROM claimed
          ON CONFLICT (entity_type, entity_id) DO UPDATE
            SET favorite_count = content_engagement.favorite_count + 1,
                updated_at = (now())::text
          RETURNING view_count, favorite_count`;

  const result = await db.execute(sql`
    WITH claimed AS (
      INSERT INTO content_engagement_marks (mark_key, expires_at)
      SELECT ${markKey}, ${expiresAt}::integer
      WHERE EXISTS (${exists})
      ON CONFLICT (mark_key) DO NOTHING
      RETURNING 1 AS ok
    ), bumped AS (
      ${increment}
    )
    SELECT
      COALESCE((SELECT view_count FROM bumped), (${viewNow}), 0) AS view_count,
      COALESCE((SELECT favorite_count FROM bumped), (${favoriteNow}), 0) AS favorite_count,
      EXISTS (SELECT 1 FROM claimed) AS counted`);
  return resultOf(request, result);
}

// Dọn dấu lượt xem đã hết hạn. Gọi theo xác suất nhỏ trong route để không
// thêm chi phí cho mọi request; dấu yêu thích (expires_at IS NULL) giữ lại.
export async function pruneEngagementMarks(
  db: EngagementDb,
  nowMs: number,
): Promise<void> {
  await db.execute(sql`
    DELETE FROM content_engagement_marks
    WHERE ctid IN (
      SELECT ctid FROM content_engagement_marks
      WHERE expires_at IS NOT NULL AND expires_at < ${Math.floor(nowMs / 1_000)}
      LIMIT ${markCleanupBatch}
    )`);
}
