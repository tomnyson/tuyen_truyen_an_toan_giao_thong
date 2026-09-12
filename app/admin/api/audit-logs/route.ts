import { getAdminRequestActor } from "@/lib/admin-auth";
import { queryAuditLogs } from "@/lib/audit-log-store";

export async function GET(request: Request) {
  const actor = await getAdminRequestActor(request);
  if (!actor) {
    return Response.json({ error: "Chưa đăng nhập." }, { status: 401 });
  }
  if (actor.role && actor.role !== "admin") {
    return Response.json(
      { error: "Bạn không có quyền truy cập nhật ký kiểm toán hệ thống." },
      { status: 403 },
    );
  }

  try {
    const url = new URL(request.url);
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "50", 10)));
    const offset = Math.max(0, parseInt(url.searchParams.get("offset") || "0", 10));
    const action = url.searchParams.get("action") || undefined;
    const actorParam = url.searchParams.get("actor") || undefined;
    const targetType = url.searchParams.get("targetType") || undefined;
    const search = url.searchParams.get("search") || undefined;

    const result = await queryAuditLogs({
      limit,
      offset,
      action,
      actor: actorParam,
      targetType,
      search,
    });

    return Response.json(result);
  } catch (error: any) {
    return Response.json(
      { error: error?.message || "Lỗi khi truy vấn nhật ký kiểm toán." },
      { status: 500 },
    );
  }
}
