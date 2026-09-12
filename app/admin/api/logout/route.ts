import { clearAdminSessionCookie, getAdminRequestActor, hasTrustedOrigin } from "@/lib/admin-auth";
import { recordAuditEvent } from "@/lib/audit-log-store";

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) {
    return Response.json({ error: "Yêu cầu không hợp lệ." }, { status: 403 });
  }
  const actor = await getAdminRequestActor(request);
  if (actor) {
    await recordAuditEvent({
      actor: actor.username,
      actorRole: actor.role || "admin",
      action: "LOGOUT",
      targetType: "system",
      targetId: actor.username,
      details: "Đăng xuất khỏi hệ thống quản trị",
      ipAddress: request.headers.get("x-forwarded-for") || undefined,
    }).catch(() => {});
  }
  const secure = new URL(request.url).protocol === "https:";
  return Response.json(
    { ok: true },
    { headers: { "Set-Cookie": clearAdminSessionCookie(secure) } },
  );
}
