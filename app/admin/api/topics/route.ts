import { getInitializedDb } from "@/db";
import { isAdminRequest, hasTrustedOrigin } from "@/lib/admin-auth";
import {
  listAllTopicsForAdmin,
  createTopicRecord,
  updateTopicRecord,
  deleteTopicRecord,
  seedDefaultTopics,
  type CreateTopicInput,
  type UpdateTopicInput,
} from "@/lib/topic-store";

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

export async function GET(request: Request) {
  const authError = await authorize(request, false);
  if (authError) return authError;

  let db = null;
  try {
    db = await getInitializedDb();
  } catch {
    // Fallback khi DB chua khoi tao hoac offline
  }

  try {
    const topics = await listAllTopicsForAdmin(db);
    return Response.json({ ok: true, topics }, { headers: { "Cache-Control": "no-store" } });
  } catch (err: unknown) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Lỗi khi lấy danh sách chủ đề." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const authError = await authorize(request, true);
  if (authError) return authError;

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) {
    return Response.json({ error: "Dữ liệu yêu cầu không hợp lệ." }, { status: 400 });
  }

  try {
    const db = await getInitializedDb();

    // Hành động nạp 5 chủ đề mặc định
    if (body.action === "seed_defaults") {
      const result = await seedDefaultTopics(db);
      return Response.json({
        ok: true,
        message: `Đã đồng bộ ${result.inserted + result.updated} chủ đề mặc định vào cơ sở dữ liệu.`,
        result,
      });
    }

    const input: CreateTopicInput = {
      name: String(body.name || ""),
      icon: typeof body.icon === "string" ? body.icon : undefined,
      detail: typeof body.detail === "string" ? body.detail : undefined,
      abbreviations: Array.isArray(body.abbreviations) ? body.abbreviations.map(String) : [],
      keywords: Array.isArray(body.keywords) ? body.keywords.map(String) : [],
      situations: Array.isArray(body.situations) ? body.situations.map(String) : [],
      displayOrder: Number(body.displayOrder ?? body.display_order ?? 0),
      status: (body.status as CreateTopicInput["status"]) || "published",
    };

    const topic = await createTopicRecord(input, db);
    return Response.json({ ok: true, topic });
  } catch (err: unknown) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Không thể tạo chủ đề mới." },
      { status: 400 }
    );
  }
}

export async function PUT(request: Request) {
  const authError = await authorize(request, true);
  if (authError) return authError;

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || !body.id) {
    return Response.json({ error: "Thiếu ID chủ đề cần chỉnh sửa." }, { status: 400 });
  }

  const id = Number(body.id);
  if (!Number.isInteger(id) || id <= 0) {
    return Response.json({ error: "ID chủ đề không hợp lệ." }, { status: 400 });
  }

  try {
    const db = await getInitializedDb();
    const updateData: UpdateTopicInput = {};

    if (body.name !== undefined) updateData.name = String(body.name);
    if (body.icon !== undefined) updateData.icon = String(body.icon);
    if (body.detail !== undefined) updateData.detail = String(body.detail);
    if (body.abbreviations !== undefined) {
      updateData.abbreviations = Array.isArray(body.abbreviations)
        ? body.abbreviations.map(String)
        : [];
    }
    if (body.keywords !== undefined) {
      updateData.keywords = Array.isArray(body.keywords) ? body.keywords.map(String) : [];
    }
    if (body.situations !== undefined) {
      updateData.situations = Array.isArray(body.situations) ? body.situations.map(String) : [];
    }
    if (body.displayOrder !== undefined || body.display_order !== undefined) {
      updateData.displayOrder = Number(body.displayOrder ?? body.display_order ?? 0);
    }
    if (body.status !== undefined) {
      updateData.status = body.status as UpdateTopicInput["status"];
    }

    const updated = await updateTopicRecord(id, updateData, db);
    return Response.json({ ok: true, topic: updated });
  } catch (err: unknown) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Không thể cập nhật chủ đề." },
      { status: 400 }
    );
  }
}

export async function DELETE(request: Request) {
  const authError = await authorize(request, true);
  if (authError) return authError;

  const url = new URL(request.url);
  const rawId = url.searchParams.get("id");
  const id = Number(rawId);
  if (!rawId || !Number.isInteger(id) || id <= 0) {
    return Response.json({ error: "ID chủ đề cần xóa không hợp lệ." }, { status: 400 });
  }

  try {
    const db = await getInitializedDb();
    const result = await deleteTopicRecord(id, db);
    if (!result.success) {
      return Response.json({ error: result.message || "Không thể xóa chủ đề." }, { status: 400 });
    }
    return Response.json({ ok: true, success: true });
  } catch (err: unknown) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Không thể xóa chủ đề." },
      { status: 500 }
    );
  }
}
