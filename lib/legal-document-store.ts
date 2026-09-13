import { eq, and, ilike, or, asc, desc, sql } from "drizzle-orm";
import { legalDocuments as legalDocumentsTable } from "@/db/pg-schema";
import { checkSingleLink, type LinkCheckResult } from "@/lib/link-checker";
import { demoLegalDocuments } from "@/db/seeds/demo-documents";

export type LegalDocumentType =
  | "luat"
  | "nghi_dinh"
  | "thong_tu"
  | "quyet_dinh"
  | "van_ban_hop_nhat"
  | "khac";

export type LegalDocumentRecord = {
  id: number;
  title: string;
  documentNumber: string;
  documentType: LegalDocumentType;
  topic: string;
  issuingAuthority: string;
  officialUrl: string;
  summary: string;
  effectivityStatus: "in_force" | "expired" | "superseded" | "draft";
  status: "published" | "draft" | "archived";
  linkStatus: "ok" | "broken" | "redirect" | "timeout" | "unchecked";
  httpStatus: number | null;
  lastCheckedAt: string | null;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type CreateLegalDocumentInput = {
  title: string;
  documentNumber: string;
  documentType?: LegalDocumentType;
  topic: string;
  issuingAuthority: string;
  officialUrl: string;
  summary?: string;
  effectivityStatus?: "in_force" | "expired" | "superseded" | "draft";
  status?: "published" | "draft" | "archived";
  displayOrder?: number;
};

export type UpdateLegalDocumentInput = Partial<CreateLegalDocumentInput>;

export type LegalDocumentFilter = {
  query?: string;
  topic?: string;
  documentType?: string;
  authority?: string;
  linkStatus?: string;
  status?: string;
  limit?: number;
  offset?: number;
};

export function mapRowToLegalDocument(row: any): LegalDocumentRecord {
  return {
    id: Number(row.id),
    title: String(row.title || ""),
    documentNumber: String(row.documentNumber ?? row.document_number ?? ""),
    documentType: (row.documentType ?? row.document_type ?? "nghi_dinh") as LegalDocumentType,
    topic: String(row.topic || ""),
    issuingAuthority: String(row.issuingAuthority ?? row.issuing_authority ?? ""),
    officialUrl: String(row.officialUrl ?? row.official_url ?? ""),
    summary: String(row.summary || ""),
    effectivityStatus: (row.effectivityStatus ?? row.effectivity_status ?? "in_force") as LegalDocumentRecord["effectivityStatus"],
    status: (row.status || "published") as LegalDocumentRecord["status"],
    linkStatus: (row.linkStatus ?? row.link_status ?? "unchecked") as LegalDocumentRecord["linkStatus"],
    httpStatus: row.httpStatus ?? row.http_status ?? null,
    lastCheckedAt: row.lastCheckedAt ?? row.last_checked_at ?? null,
    displayOrder: Number(row.displayOrder ?? row.display_order ?? 0),
    createdAt: String(row.createdAt ?? row.created_at ?? new Date().toISOString()),
    updatedAt: String(row.updatedAt ?? row.updated_at ?? new Date().toISOString()),
  };
}

export async function listLegalDocuments(
  filter: LegalDocumentFilter = {},
  db?: any
): Promise<LegalDocumentRecord[]> {
  if (!db) return [];

  try {
    const conditions: any[] = [];

    if (filter.status && filter.status !== "all") {
      conditions.push(eq(legalDocumentsTable.status, filter.status as any));
    } else if (!filter.status) {
      // Mặc định không lấy văn bản đã lưu trữ nếu không chỉ định rõ
      conditions.push(eq(legalDocumentsTable.status, "published"));
    }

    if (filter.topic && filter.topic !== "Tất cả") {
      conditions.push(eq(legalDocumentsTable.topic, filter.topic));
    }

    if (filter.documentType && filter.documentType !== "all") {
      conditions.push(eq(legalDocumentsTable.documentType, filter.documentType as any));
    }

    if (filter.authority && filter.authority !== "all") {
      conditions.push(eq(legalDocumentsTable.issuingAuthority, filter.authority));
    }

    if (filter.linkStatus && filter.linkStatus !== "all") {
      conditions.push(eq(legalDocumentsTable.linkStatus, filter.linkStatus as any));
    }

    if (filter.query && filter.query.trim().length > 0) {
      const q = `%${filter.query.trim()}%`;
      conditions.push(
        or(
          ilike(legalDocumentsTable.title, q),
          ilike(legalDocumentsTable.documentNumber, q),
          ilike(legalDocumentsTable.issuingAuthority, q),
          ilike(legalDocumentsTable.summary, q)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    let query = db
      .select()
      .from(legalDocumentsTable)
      .orderBy(asc(legalDocumentsTable.displayOrder), desc(legalDocumentsTable.id));

    if (whereClause) {
      query = query.where(whereClause);
    }

    if (filter.limit && filter.limit > 0) {
      query = query.limit(filter.limit);
    }
    if (filter.offset && filter.offset > 0) {
      query = query.offset(filter.offset);
    }

    const rows = await query;
    return (rows || []).map(mapRowToLegalDocument);
  } catch {
    return [];
  }
}

export async function getLegalDocumentById(
  id: number,
  db?: any
): Promise<LegalDocumentRecord | null> {
  if (!db || !id || id <= 0) return null;
  try {
    const [row] = await db
      .select()
      .from(legalDocumentsTable)
      .where(eq(legalDocumentsTable.id, id));
    return row ? mapRowToLegalDocument(row) : null;
  } catch {
    return null;
  }
}

export async function createLegalDocument(
  data: CreateLegalDocumentInput,
  db?: any
): Promise<LegalDocumentRecord> {
  if (!db) throw new Error("Database client required");

  const title = data.title?.trim();
  const documentNumber = data.documentNumber?.trim();
  const officialUrl = data.officialUrl?.trim();
  const topic = data.topic?.trim();
  const issuingAuthority = data.issuingAuthority?.trim();

  if (!title) throw new Error("Tên văn bản không được để trống");
  if (!documentNumber) throw new Error("Số hiệu văn bản không được để trống");
  if (!officialUrl || (!officialUrl.startsWith("http://") && !officialUrl.startsWith("https://"))) {
    throw new Error("Đường dẫn liên kết văn bản phải bắt đầu bằng http:// hoặc https://");
  }
  if (!topic) throw new Error("Lĩnh vực không được để trống");
  if (!issuingAuthority) throw new Error("Cơ quan ban hành không được để trống");

  const values = {
    title,
    documentNumber,
    documentType: data.documentType || "nghi_dinh",
    topic,
    issuingAuthority,
    officialUrl,
    summary: data.summary?.trim() || "",
    effectivityStatus: data.effectivityStatus || "in_force",
    status: data.status || "published",
    linkStatus: "unchecked" as const,
    displayOrder: Number(data.displayOrder ?? 0),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const [inserted] = await db
    .insert(legalDocumentsTable)
    .values(values)
    .returning();

  return mapRowToLegalDocument(inserted);
}

export async function updateLegalDocument(
  id: number,
  data: UpdateLegalDocumentInput,
  db?: any
): Promise<LegalDocumentRecord> {
  if (!db) throw new Error("Database client required");
  if (!id || id <= 0) throw new Error("ID văn bản không hợp lệ");

  const updateValues: Record<string, any> = {
    updatedAt: new Date().toISOString(),
  };

  if (data.title !== undefined) {
    const title = data.title.trim();
    if (!title) throw new Error("Tên văn bản không được để trống");
    updateValues.title = title;
  }

  if (data.documentNumber !== undefined) {
    const num = data.documentNumber.trim();
    if (!num) throw new Error("Số hiệu văn bản không được để trống");
    updateValues.documentNumber = num;
  }

  if (data.officialUrl !== undefined) {
    const url = data.officialUrl.trim();
    if (!url || (!url.startsWith("http://") && !url.startsWith("https://"))) {
      throw new Error("Đường dẫn liên kết phải bắt đầu bằng http:// hoặc https://");
    }
    updateValues.officialUrl = url;
    // Khi URL thay đổi, đặt lại trạng thái kiểm tra link
    updateValues.linkStatus = "unchecked";
    updateValues.httpStatus = null;
    updateValues.lastCheckedAt = null;
  }

  if (data.documentType !== undefined) updateValues.documentType = data.documentType;
  if (data.topic !== undefined) updateValues.topic = data.topic.trim();
  if (data.issuingAuthority !== undefined) updateValues.issuingAuthority = data.issuingAuthority.trim();
  if (data.summary !== undefined) updateValues.summary = data.summary.trim();
  if (data.effectivityStatus !== undefined) updateValues.effectivityStatus = data.effectivityStatus;
  if (data.status !== undefined) updateValues.status = data.status;
  if (data.displayOrder !== undefined) updateValues.displayOrder = Number(data.displayOrder);

  const [updated] = await db
    .update(legalDocumentsTable)
    .set(updateValues)
    .where(eq(legalDocumentsTable.id, id))
    .returning();

  if (!updated) {
    throw new Error(`Không tìm thấy văn bản với ID ${id}`);
  }

  return mapRowToLegalDocument(updated);
}

export async function deleteLegalDocument(
  id: number,
  db?: any
): Promise<{ success: boolean; message?: string }> {
  if (!db) throw new Error("Database client required");
  if (!id || id <= 0) throw new Error("ID văn bản không hợp lệ");

  const [existing] = await db
    .select()
    .from(legalDocumentsTable)
    .where(eq(legalDocumentsTable.id, id));

  if (!existing) {
    return { success: false, message: "Văn bản không tồn tại" };
  }

  await db
    .delete(legalDocumentsTable)
    .where(eq(legalDocumentsTable.id, id));

  return { success: true };
}

export async function checkAndUpdateDocumentLink(
  id: number,
  db?: any
): Promise<{ result: LinkCheckResult; document: LegalDocumentRecord }> {
  if (!db) throw new Error("Database client required");
  const doc = await getLegalDocumentById(id, db);
  if (!doc) throw new Error(`Không tìm thấy văn bản ID ${id}`);

  // Chạy engine kiểm tra link với SSRF protection
  const checkResult = await checkSingleLink(doc.officialUrl, 6000);
  const stamp = new Date().toISOString();

  let linkStatus: LegalDocumentRecord["linkStatus"] = "ok";
  if (checkResult.status === "broken") {
    linkStatus = "broken";
  } else if (checkResult.status === "redirect") {
    linkStatus = "redirect";
  } else if (checkResult.status === "timeout" || checkResult.status === "network_error" || checkResult.status === "ssl_error") {
    linkStatus = "timeout";
  } else if (checkResult.status === "blocked_ssrf") {
    linkStatus = "broken";
  }

  const [updated] = await db
    .update(legalDocumentsTable)
    .set({
      linkStatus,
      httpStatus: checkResult.statusCode ?? null,
      lastCheckedAt: stamp,
      updatedAt: stamp,
    })
    .where(eq(legalDocumentsTable.id, id))
    .returning();

  return {
    result: checkResult,
    document: mapRowToLegalDocument(updated),
  };
}

export async function checkAllDocumentLinks(
  db?: any
): Promise<{ total: number; ok: number; broken: number; timeout: number; redirect: number }> {
  if (!db) throw new Error("Database client required");
  const docs = await listLegalDocuments({ status: "published" }, db);
  let ok = 0;
  let broken = 0;
  let timeout = 0;
  let redirect = 0;

  for (const d of docs) {
    try {
      const { document } = await checkAndUpdateDocumentLink(d.id, db);
      if (document.linkStatus === "ok") ok++;
      else if (document.linkStatus === "broken") broken++;
      else if (document.linkStatus === "redirect") redirect++;
      else if (document.linkStatus === "timeout") timeout++;
    } catch {
      broken++;
    }
  }

  return { total: docs.length, ok, broken, timeout, redirect };
}

export async function seedDefaultLegalDocuments(
  db?: any
): Promise<{ inserted: number; updated: number }> {
  if (!db) throw new Error("Database client required");
  let inserted = 0;
  let updated = 0;

  for (const item of demoLegalDocuments) {
    const existing = await db
      .select()
      .from(legalDocumentsTable)
      .where(eq(legalDocumentsTable.documentNumber, item.documentNumber));

    const payload = {
      title: item.title,
      documentNumber: item.documentNumber,
      documentType: item.documentType as any,
      topic: item.topic,
      issuingAuthority: item.issuingAuthority,
      officialUrl: item.officialUrl,
      summary: item.summary,
      effectivityStatus: item.effectivityStatus as any,
      status: item.status as any,
      displayOrder: item.displayOrder,
      updatedAt: new Date().toISOString(),
    };

    if (existing && existing.length > 0) {
      await db
        .update(legalDocumentsTable)
        .set(payload)
        .where(eq(legalDocumentsTable.documentNumber, item.documentNumber));
      updated++;
    } else {
      await db.insert(legalDocumentsTable).values({
        ...payload,
        linkStatus: "unchecked",
        createdAt: new Date().toISOString(),
      });
      inserted++;
    }
  }

  return { inserted, updated };
}
