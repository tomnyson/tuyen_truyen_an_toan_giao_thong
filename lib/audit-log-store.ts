import { desc, eq, sql } from "drizzle-orm";
import { getInitializedDb } from "@/db";
import { systemAuditLogs as auditLogsTable } from "@/db/pg-schema";

export type AuditEventInput = {
  actor: string;
  actorRole?: string;
  action: string;
  targetType: string;
  targetId?: string;
  details?: string;
  ipAddress?: string;
};

export type AuditLogRecord = {
  id: number;
  actor: string;
  actorRole: string;
  action: string;
  targetType: string;
  targetId: string;
  details: string;
  ipAddress?: string | null;
  createdAt: string;
};

export type AuditLogFilters = {
  action?: string;
  actor?: string;
  targetType?: string;
  search?: string;
  limit?: number;
  offset?: number;
};

// Bộ đệm bộ nhớ lưu trữ audit logs dự phòng (cho môi trường kiểm thử hoặc offline)
const fallbackMemoryLogs: AuditLogRecord[] = [];
let nextLogId = 1;

export async function recordAuditEvent(
  event: AuditEventInput,
  dbClient?: any,
): Promise<AuditLogRecord> {
  const actor = event.actor?.trim() || "system";
  const actorRole = event.actorRole?.trim() || "editor";
  const action = event.action?.trim().toUpperCase() || "UNKNOWN";
  const targetType = event.targetType?.trim() || "system";
  const targetId = String(event.targetId || "").trim();
  const details = String(event.details || "").trim();
  const ipAddress = event.ipAddress?.trim() || null;
  const createdAt = new Date().toISOString();

  let db = dbClient;
  if (!db) {
    try {
      db = await getInitializedDb();
    } catch {
      db = null;
    }
  }

  if (db) {
    try {
      const [inserted] = await db
        .insert(auditLogsTable)
        .values({
          actor,
          actorRole,
          action,
          targetType,
          targetId,
          details,
          ipAddress,
          createdAt,
        })
        .returning();

      if (inserted) {
        return {
          id: Number(inserted.id),
          actor: String(inserted.actor),
          actorRole: String(inserted.actorRole ?? inserted.actor_role ?? "editor"),
          action: String(inserted.action),
          targetType: String(inserted.targetType ?? inserted.target_type),
          targetId: String(inserted.targetId ?? inserted.target_id ?? ""),
          details: String(inserted.details ?? ""),
          ipAddress: inserted.ipAddress ?? inserted.ip_address ?? null,
          createdAt: String(inserted.createdAt ?? inserted.created_at ?? createdAt),
        };
      }
    } catch {
      // Nếu DB lỗi tạm thời, ghi vào bộ đệm memory
    }
  }

  // Fallback in-memory
  const record: AuditLogRecord = {
    id: nextLogId++,
    actor,
    actorRole,
    action,
    targetType,
    targetId,
    details,
    ipAddress,
    createdAt,
  };
  fallbackMemoryLogs.unshift(record);
  if (fallbackMemoryLogs.length > 500) {
    fallbackMemoryLogs.pop();
  }
  return record;
}

export async function queryAuditLogs(
  filters: AuditLogFilters = {},
  dbClient?: any,
): Promise<{ logs: AuditLogRecord[]; total: number }> {
  const limit = Math.min(Math.max(Number(filters.limit) || 50, 1), 100);
  const offset = Math.max(Number(filters.offset) || 0, 0);

  let db = dbClient;
  if (!db) {
    try {
      db = await getInitializedDb();
    } catch {
      db = null;
    }
  }

  if (db) {
    try {
      const conditions: any[] = [];

      if (filters.action && filters.action !== "ALL") {
        conditions.push(eq(auditLogsTable.action, filters.action.toUpperCase()));
      }
      if (filters.actor && filters.actor !== "ALL") {
        conditions.push(eq(auditLogsTable.actor, filters.actor));
      }
      if (filters.targetType && filters.targetType !== "ALL") {
        conditions.push(eq(auditLogsTable.targetType, filters.targetType));
      }
      if (filters.search?.trim()) {
        const q = `%${filters.search.trim().toLowerCase()}%`;
        conditions.push(
          sql`(lower(${auditLogsTable.details}) LIKE ${q} OR lower(${auditLogsTable.targetId}) LIKE ${q} OR lower(${auditLogsTable.actor}) LIKE ${q})`,
        );
      }

      const whereClause = conditions.length > 0 ? sql.join(conditions, sql` AND `) : undefined;

      const [rows, totalResult] = await Promise.all([
        db
          .select()
          .from(auditLogsTable)
          .where(whereClause)
          .orderBy(desc(auditLogsTable.id))
          .limit(limit)
          .offset(offset),
        db
          .select({ count: sql<number>`count(*)` })
          .from(auditLogsTable)
          .where(whereClause),
      ]);

      const total = Number(totalResult[0]?.count ?? 0);
      const logs: AuditLogRecord[] = (rows || []).map((row: any) => ({
        id: Number(row.id),
        actor: String(row.actor),
        actorRole: String(row.actorRole ?? row.actor_role ?? "editor"),
        action: String(row.action),
        targetType: String(row.targetType ?? row.target_type),
        targetId: String(row.targetId ?? row.target_id ?? ""),
        details: String(row.details ?? ""),
        ipAddress: row.ipAddress ?? row.ip_address ?? null,
        createdAt: String(row.createdAt ?? row.created_at),
      }));

      return { logs, total };
    } catch {
      // Fallback
    }
  }

  // Fallback in-memory
  let filtered = [...fallbackMemoryLogs];

  if (filters.action && filters.action !== "ALL") {
    filtered = filtered.filter((l) => l.action === filters.action?.toUpperCase());
  }
  if (filters.actor && filters.actor !== "ALL") {
    filtered = filtered.filter((l) => l.actor === filters.actor);
  }
  if (filters.targetType && filters.targetType !== "ALL") {
    filtered = filtered.filter((l) => l.targetType === filters.targetType);
  }
  if (filters.search?.trim()) {
    const q = filters.search.trim().toLowerCase();
    filtered = filtered.filter(
      (l) =>
        l.details.toLowerCase().includes(q) ||
        l.targetId.toLowerCase().includes(q) ||
        l.actor.toLowerCase().includes(q),
    );
  }

  const total = filtered.length;
  const logs = filtered.slice(offset, offset + limit);
  return { logs, total };
}
