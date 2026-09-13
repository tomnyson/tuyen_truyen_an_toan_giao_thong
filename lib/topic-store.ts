import { eq, sql, asc } from "drizzle-orm";
import { contentTopics as contentTopicsTable } from "@/db/pg-schema";
import {
  contentTopics as baselineTopics,
  type TopicDefinition,
  type ContentTopic,
  registerDynamicTopics,
} from "@/lib/topics";

export type TopicRecord = {
  id: number;
  name: string;
  icon: string;
  detail: string;
  abbreviations: string[];
  keywords: string[];
  situations: string[];
  displayOrder: number;
  status: "draft" | "published" | "archived";
  createdAt: string;
  updatedAt: string;
};

export type CreateTopicInput = {
  name: string;
  icon?: string;
  detail?: string;
  abbreviations?: string[];
  keywords?: string[];
  situations?: string[];
  displayOrder?: number;
  status?: "draft" | "published" | "archived";
};

export type UpdateTopicInput = Partial<CreateTopicInput>;

export function parseJsonArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch {
      return [];
    }
  }
  return [];
}

export function mapRowToTopicRecord(row: any): TopicRecord {
  return {
    id: Number(row.id),
    name: String(row.name),
    icon: String(row.icon || "◉"),
    detail: String(row.detail || ""),
    abbreviations: parseJsonArray(row.abbreviations),
    keywords: parseJsonArray(row.keywords),
    situations: parseJsonArray(row.situations),
    displayOrder: Number(row.displayOrder ?? row.display_order ?? 0),
    status: (row.status as TopicRecord["status"]) || "published",
    createdAt: String(row.createdAt ?? row.created_at ?? new Date().toISOString()),
    updatedAt: String(row.updatedAt ?? row.updated_at ?? new Date().toISOString()),
  };
}

export function mapRowToTopicDefinition(row: any): TopicDefinition {
  return {
    name: String(row.name) as ContentTopic,
    icon: String(row.icon || "◉"),
    detail: String(row.detail || ""),
    abbreviations: Object.freeze(parseJsonArray(row.abbreviations)),
    keywords: Object.freeze(parseJsonArray(row.keywords)),
    situations: Object.freeze(parseJsonArray(row.situations)),
  };
}

export async function getActiveTopicDefinitions(db?: any): Promise<readonly TopicDefinition[]> {
  if (!db) return baselineTopics;
  try {
    const rows = await db
      .select()
      .from(contentTopicsTable)
      .where(eq(contentTopicsTable.status, "published"))
      .orderBy(asc(contentTopicsTable.displayOrder), asc(contentTopicsTable.id));

    if (!rows || rows.length === 0) {
      return baselineTopics;
    }

    const dynamicDefinitions = rows.map(mapRowToTopicDefinition);
    registerDynamicTopics(dynamicDefinitions);
    return dynamicDefinitions;
  } catch {
    return baselineTopics;
  }
}

export async function listAllTopicsForAdmin(db?: any): Promise<TopicRecord[]> {
  if (!db) {
    return baselineTopics.map((topic, index) => ({
      id: index + 1,
      name: topic.name,
      icon: topic.icon,
      detail: topic.detail,
      abbreviations: Array.from(topic.abbreviations),
      keywords: Array.from(topic.keywords),
      situations: Array.from(topic.situations),
      displayOrder: (index + 1) * 10,
      status: "published" as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));
  }
  const rows = await db
    .select()
    .from(contentTopicsTable)
    .orderBy(asc(contentTopicsTable.displayOrder), asc(contentTopicsTable.id));

  return (rows || []).map(mapRowToTopicRecord);
}

export async function createTopicRecord(data: CreateTopicInput, db?: any): Promise<TopicRecord> {
  if (!db) throw new Error("Database client required");
  const trimmedName = data.name?.trim();
  if (!trimmedName || trimmedName.length > 100) {
    throw new Error("Tên chủ đề không được để trống và tối đa 100 ký tự");
  }

  const values = {
    name: trimmedName,
    icon: data.icon?.trim() || "◉",
    detail: data.detail?.trim() || "",
    abbreviations: JSON.stringify(data.abbreviations || []),
    keywords: JSON.stringify(data.keywords || []),
    situations: JSON.stringify(data.situations || []),
    displayOrder: Number(data.displayOrder ?? 0),
    status: data.status || "published",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const [inserted] = await db
    .insert(contentTopicsTable)
    .values(values)
    .returning();

  return mapRowToTopicRecord(inserted);
}

export async function updateTopicRecord(
  id: number,
  data: UpdateTopicInput,
  db?: any
): Promise<TopicRecord> {
  if (!db) throw new Error("Database client required");
  if (!id || id <= 0) throw new Error("ID chủ đề không hợp lệ");

  const updateValues: Record<string, any> = {
    updatedAt: new Date().toISOString(),
  };

  if (data.name !== undefined) {
    const trimmed = data.name.trim();
    if (!trimmed || trimmed.length > 100) {
      throw new Error("Tên chủ đề không được để trống và tối đa 100 ký tự");
    }
    updateValues.name = trimmed;
  }

  if (data.icon !== undefined) updateValues.icon = data.icon.trim() || "◉";
  if (data.detail !== undefined) updateValues.detail = data.detail.trim();
  if (data.abbreviations !== undefined) {
    updateValues.abbreviations = JSON.stringify(data.abbreviations);
  }
  if (data.keywords !== undefined) {
    updateValues.keywords = JSON.stringify(data.keywords);
  }
  if (data.situations !== undefined) {
    updateValues.situations = JSON.stringify(data.situations);
  }
  if (data.displayOrder !== undefined) {
    updateValues.displayOrder = Number(data.displayOrder);
  }
  if (data.status !== undefined) {
    updateValues.status = data.status;
  }

  const [updated] = await db
    .update(contentTopicsTable)
    .set(updateValues)
    .where(eq(contentTopicsTable.id, id))
    .returning();

  if (!updated) {
    throw new Error(`Không tìm thấy chủ đề với ID ${id}`);
  }

  return mapRowToTopicRecord(updated);
}

export async function deleteTopicRecord(
  id: number,
  db?: any
): Promise<{ success: boolean; message?: string }> {
  if (!db) throw new Error("Database client required");
  if (!id || id <= 0) throw new Error("ID chủ đề không hợp lệ");

  // Kiểm tra chủ đề tồn tại
  const [existing] = await db
    .select()
    .from(contentTopicsTable)
    .where(eq(contentTopicsTable.id, id));

  if (!existing) {
    return { success: false, message: "Chủ đề không tồn tại" };
  }

  // Thực hiện xóa
  await db
    .delete(contentTopicsTable)
    .where(eq(contentTopicsTable.id, id));

  return { success: true };
}

export async function seedDefaultTopics(
  db?: any
): Promise<{ inserted: number; updated: number }> {
  if (!db) throw new Error("Database client required");
  let inserted = 0;
  let updated = 0;

  for (let i = 0; i < baselineTopics.length; i++) {
    const topic = baselineTopics[i];
    const existing = await db
      .select()
      .from(contentTopicsTable)
      .where(eq(contentTopicsTable.name, topic.name));

    const payload = {
      name: topic.name,
      icon: topic.icon,
      detail: topic.detail,
      abbreviations: JSON.stringify(Array.from(topic.abbreviations)),
      keywords: JSON.stringify(Array.from(topic.keywords)),
      situations: JSON.stringify(Array.from(topic.situations)),
      displayOrder: (i + 1) * 10,
      status: "published" as const,
      updatedAt: new Date().toISOString(),
    };

    if (existing && existing.length > 0) {
      await db
        .update(contentTopicsTable)
        .set(payload)
        .where(eq(contentTopicsTable.name, topic.name));
      updated++;
    } else {
      await db
        .insert(contentTopicsTable)
        .values({
          ...payload,
          createdAt: new Date().toISOString(),
        });
      inserted++;
    }
  }

  return { inserted, updated };
}
