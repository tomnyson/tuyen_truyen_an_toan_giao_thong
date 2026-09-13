import { getInitializedDb } from "@/db";
import { isAdminRequest, hasTrustedOrigin } from "@/lib/admin-auth";
import {
  listLegalDocuments,
  createLegalDocument,
  updateLegalDocument,
  deleteLegalDocument,
  type CreateLegalDocumentInput,
  type UpdateLegalDocumentInput,
  type LegalDocumentFilter,
} from "@/lib/legal-document-store";

async function authorize(request: Request, mutation = false) {
  if (!(await isAdminRequest(request))) {
    return Response.json({ error: "Phiên đăng nhập đã hết hạn." }, { status: 401 });
  }
  const origin = request.headers.get("origin");
  if (mutation && origin && !hasTrustedOrigin(request)) {
    return Response.json({ error: "Yêu cầu không hợp lệ." }, { status: 403 });
  }
  return null;
}

export async function GET(request: Request, context?: { db?: any }) {
  const authError = await authorize(request, false);
  if (authError) return authError;

  let db = context?.db ?? null;
  if (!db) {
    try {
      db = await getInitializedDb();
    } catch {
      // Fallback khi DB chua khoi tao
    }
  }

  const url = new URL(request.url);
  const filter: LegalDocumentFilter = {
    query: url.searchParams.get("q") || url.searchParams.get("query") || undefined,
    topic: url.searchParams.get("topic") || undefined,
    documentType: url.searchParams.get("type") || url.searchParams.get("documentType") || undefined,
    authority: url.searchParams.get("authority") || undefined,
    linkStatus: url.searchParams.get("linkStatus") || undefined,
    status: url.searchParams.get("status") || "all",
    limit: Number(url.searchParams.get("limit") || 100),
    offset: Number(url.searchParams.get("offset") || 0),
  };

  try {
    const documents = await listLegalDocuments(filter, db);
    return Response.json(
      { ok: true, documents },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err: unknown) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Lỗi khi lấy danh sách văn bản." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request, context?: { db?: any }) {
  const authError = await authorize(request, true);
  if (authError) return authError;

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) {
    return Response.json({ error: "Dữ liệu yêu cầu không hợp lệ." }, { status: 400 });
  }

  let db = context?.db ?? null;
  if (!db) {
    try {
      db = await getInitializedDb();
    } catch {
      // Fallback
    }
  }

  try {
    const input: CreateLegalDocumentInput = {
      title: String(body.title || ""),
      documentNumber: String(body.documentNumber ?? body.document_number ?? ""),
      documentType: (body.documentType ?? body.document_type) as any,
      topic: String(body.topic || ""),
      issuingAuthority: String(body.issuingAuthority ?? body.issuing_authority ?? ""),
      officialUrl: String(body.officialUrl ?? body.official_url ?? ""),
      summary: typeof body.summary === "string" ? body.summary : undefined,
      effectivityStatus: (body.effectivityStatus ?? body.effectivity_status) as any,
      status: body.status as any,
      displayOrder: Number(body.displayOrder ?? body.display_order ?? 0),
    };

    const document = await createLegalDocument(input, db);
    return Response.json({ ok: true, document }, { status: 201 });
  } catch (err: unknown) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Không thể tạo văn bản mới." },
      { status: 400 }
    );
  }
}

export async function PUT(request: Request, context?: { db?: any }) {
  const authError = await authorize(request, true);
  if (authError) return authError;

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || !body.id) {
    return Response.json({ error: "Thiếu ID văn bản cần chỉnh sửa." }, { status: 400 });
  }

  const id = Number(body.id);
  if (!Number.isInteger(id) || id <= 0) {
    return Response.json({ error: "ID văn bản không hợp lệ." }, { status: 400 });
  }

  let db = context?.db ?? null;
  if (!db) {
    try {
      db = await getInitializedDb();
    } catch {
      // Fallback
    }
  }

  try {
    const updateData: UpdateLegalDocumentInput = {};
    if (body.title !== undefined) updateData.title = String(body.title);
    if (body.documentNumber !== undefined || body.document_number !== undefined) {
      updateData.documentNumber = String(body.documentNumber ?? body.document_number);
    }
    if (body.documentType !== undefined || body.document_type !== undefined) {
      updateData.documentType = (body.documentType ?? body.document_type) as any;
    }
    if (body.topic !== undefined) updateData.topic = String(body.topic);
    if (body.issuingAuthority !== undefined || body.issuing_authority !== undefined) {
      updateData.issuingAuthority = String(body.issuingAuthority ?? body.issuing_authority);
    }
    if (body.officialUrl !== undefined || body.official_url !== undefined) {
      updateData.officialUrl = String(body.officialUrl ?? body.official_url);
    }
    if (body.summary !== undefined) updateData.summary = String(body.summary);
    if (body.effectivityStatus !== undefined || body.effectivity_status !== undefined) {
      updateData.effectivityStatus = (body.effectivityStatus ?? body.effectivity_status) as any;
    }
    if (body.status !== undefined) updateData.status = body.status as any;
    if (body.displayOrder !== undefined || body.display_order !== undefined) {
      updateData.displayOrder = Number(body.displayOrder ?? body.display_order);
    }

    const updated = await updateLegalDocument(id, updateData, db);
    return Response.json({ ok: true, document: updated });
  } catch (err: unknown) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Không thể cập nhật văn bản." },
      { status: 400 }
    );
  }
}

export async function DELETE(request: Request, context?: { db?: any }) {
  const authError = await authorize(request, true);
  if (authError) return authError;

  const url = new URL(request.url);
  const rawId = url.searchParams.get("id");
  const id = Number(rawId);
  if (!rawId || !Number.isInteger(id) || id <= 0) {
    return Response.json({ error: "ID văn bản cần xóa không hợp lệ." }, { status: 400 });
  }

  let db = context?.db ?? null;
  if (!db) {
    try {
      db = await getInitializedDb();
    } catch {
      // Fallback
    }
  }

  try {
    const result = await deleteLegalDocument(id, db);
    if (!result.success) {
      return Response.json({ error: result.message || "Không thể xóa văn bản." }, { status: 400 });
    }
    return Response.json({ ok: true, success: true });
  } catch (err: unknown) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Không thể xóa văn bản." },
      { status: 500 }
    );
  }
}
