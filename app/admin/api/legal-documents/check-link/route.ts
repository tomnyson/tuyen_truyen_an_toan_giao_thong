import { getInitializedDb } from "@/db";
import { isAdminRequest, hasTrustedOrigin } from "@/lib/admin-auth";
import {
  checkAndUpdateDocumentLink,
  checkAllDocumentLinks,
  seedDefaultLegalDocuments,
} from "@/lib/legal-document-store";
import { checkSingleLink } from "@/lib/link-checker";

async function authorize(request: Request, mutation = true) {
  if (!(await isAdminRequest(request))) {
    return Response.json({ error: "Phiên đăng nhập đã hết hạn." }, { status: 401 });
  }
  const origin = request.headers.get("origin");
  if (mutation && origin && !hasTrustedOrigin(request)) {
    return Response.json({ error: "Yêu cầu không hợp lệ." }, { status: 403 });
  }
  return null;
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
    // 1. Seed demo documents
    if (body.action === "seed_default") {
      const result = await seedDefaultLegalDocuments(db);
      return Response.json({
        ok: true,
        message: `Đã khởi tạo/đồng bộ ${result.inserted + result.updated} văn bản mẫu.`,
        result,
      });
    }

    // 2. Batch check all document links
    if (body.action === "check_all") {
      const summary = await checkAllDocumentLinks(db);
      return Response.json({
        ok: true,
        message: `Đã kiểm tra ${summary.total} liên kết (${summary.ok} hợp lệ, ${summary.broken} hỏng, ${summary.timeout} phản hồi chậm).`,
        summary,
      });
    }

    // 3. Test link directly (e.g. from modal before saving)
    if (typeof body.url === "string" && body.url.trim().length > 0) {
      const result = await checkSingleLink(body.url.trim(), 6000);
      return Response.json({ ok: true, result });
    }

    // 4. Single document check by ID
    const documentId = Number(body.documentId ?? body.id);
    if (!Number.isInteger(documentId) || documentId <= 0) {
      return Response.json(
        { error: "Cần cung cấp documentId hoặc action hợp lệ." },
        { status: 400 }
      );
    }

    const { result, document } = await checkAndUpdateDocumentLink(documentId, db);
    return Response.json({ ok: true, result, document });
  } catch (err: unknown) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Lỗi kiểm tra liên kết." },
      { status: 400 }
    );
  }
}
