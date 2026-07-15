import { clearAdminSessionCookie, hasTrustedOrigin } from "@/lib/admin-auth";

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) {
    return Response.json({ error: "Yêu cầu không hợp lệ." }, { status: 403 });
  }
  const secure = new URL(request.url).protocol === "https:";
  return Response.json(
    { ok: true },
    { headers: { "Set-Cookie": clearAdminSessionCookie(secure) } },
  );
}
