import { getAdminRequestActor } from "@/lib/admin-auth";
import {
  listAdminAccounts,
  createAdminAccount,
  updateAdminAccount,
  deleteAdminAccount,
  type AdminAccountRole,
  type AdminAccountStatus,
} from "@/lib/account-store";
import { recordAuditEvent } from "@/lib/audit-log-store";

async function requireAdminActor(request: Request) {
  const actor = await getAdminRequestActor(request);
  if (!actor) {
    return { error: Response.json({ error: "Chưa đăng nhập." }, { status: 401 }) };
  }
  if (actor.role && actor.role !== "admin") {
    return {
      error: Response.json(
        { error: "Bạn không có quyền quản lý tài khoản người dùng." },
        { status: 403 },
      ),
    };
  }
  return { actor };
}

export async function GET(request: Request) {
  const check = await requireAdminActor(request);
  if (check.error) return check.error;

  try {
    const accounts = await listAdminAccounts();
    return Response.json({ accounts });
  } catch (error: any) {
    return Response.json(
      { error: error?.message || "Lỗi khi lấy danh sách tài khoản." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const check = await requireAdminActor(request);
  if (check.error) return check.error;
  const actor = check.actor;

  try {
    const body = await request.json();
    const { username, fullName, password, role, allowedTopics, status } = body;

    if (!username || !password) {
      return Response.json(
        { error: "Vui lòng nhập tên đăng nhập và mật khẩu." },
        { status: 400 },
      );
    }

    const account = await createAdminAccount({
      username,
      fullName: fullName || username,
      password,
      role: (role as AdminAccountRole) || "editor",
      allowedTopics: Array.isArray(allowedTopics) ? allowedTopics : [],
      status: (status as AdminAccountStatus) || "active",
    });

    await recordAuditEvent({
      actor: actor.username,
      actorRole: actor.role || "admin",
      action: "CREATE_ACCOUNT",
      targetType: "account",
      targetId: account.username,
      details: `Tạo tài khoản ${account.username} với vai trò ${account.role}, chuyên mục: ${JSON.stringify(account.allowedTopics)}`,
      ipAddress: request.headers.get("x-forwarded-for") || undefined,
    });

    return Response.json({ account }, { status: 201 });
  } catch (error: any) {
    return Response.json(
      { error: error?.message || "Lỗi khi tạo tài khoản." },
      { status: 400 },
    );
  }
}

export async function PUT(request: Request) {
  const check = await requireAdminActor(request);
  if (check.error) return check.error;
  const actor = check.actor;

  try {
    const body = await request.json();
    const { id, fullName, password, role, allowedTopics, status } = body;

    const numericId = Number(id);
    if (!numericId || numericId <= 0) {
      return Response.json({ error: "ID tài khoản không hợp lệ." }, { status: 400 });
    }

    const updated = await updateAdminAccount(numericId, {
      fullName,
      password: password || undefined,
      role: role as AdminAccountRole,
      allowedTopics: Array.isArray(allowedTopics) ? allowedTopics : undefined,
      status: status as AdminAccountStatus,
    });

    if (!updated) {
      return Response.json({ error: "Không tìm thấy tài khoản để cập nhật." }, { status: 404 });
    }

    await recordAuditEvent({
      actor: actor.username,
      actorRole: actor.role || "admin",
      action: "UPDATE_ACCOUNT",
      targetType: "account",
      targetId: updated.username,
      details: `Cập nhật tài khoản ${updated.username} (ID: ${numericId}): ${JSON.stringify({ fullName, role, allowedTopics, status })}`,
      ipAddress: request.headers.get("x-forwarded-for") || undefined,
    });

    return Response.json({ account: updated });
  } catch (error: any) {
    return Response.json(
      { error: error?.message || "Lỗi khi cập nhật tài khoản." },
      { status: 400 },
    );
  }
}

export async function DELETE(request: Request) {
  const check = await requireAdminActor(request);
  if (check.error) return check.error;
  const actor = check.actor;

  try {
    const body = await request.json().catch(() => ({}));
    const numericId = Number(body?.id);
    if (!numericId || numericId <= 0) {
      return Response.json({ error: "ID tài khoản không hợp lệ." }, { status: 400 });
    }

    // Lấy thông tin tài khoản trước khi xóa để kiểm tra
    const accounts = await listAdminAccounts();
    const target = accounts.find((a) => a.id === numericId);

    if (target && target.username.toLowerCase() === actor.username.toLowerCase()) {
      return Response.json(
        { error: "Không thể tự xóa tài khoản của chính mình." },
        { status: 400 },
      );
    }

    const success = await deleteAdminAccount(numericId);
    if (!success) {
      return Response.json({ error: "Không tìm thấy tài khoản để xóa." }, { status: 404 });
    }

    await recordAuditEvent({
      actor: actor.username,
      actorRole: actor.role || "admin",
      action: "DELETE_ACCOUNT",
      targetType: "account",
      targetId: target?.username || String(numericId),
      details: `Xóa tài khoản ${target?.username || numericId}`,
      ipAddress: request.headers.get("x-forwarded-for") || undefined,
    });

    return Response.json({ ok: true });
  } catch (error: any) {
    return Response.json(
      { error: error?.message || "Lỗi khi xóa tài khoản." },
      { status: 500 },
    );
  }
}
