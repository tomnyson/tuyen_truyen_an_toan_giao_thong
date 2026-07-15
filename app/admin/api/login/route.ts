import {
  adminSessionCookie,
  createAdminSession,
  hasTrustedOrigin,
  validateAdminCredentials,
} from "@/lib/admin-auth";

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) {
    return Response.json({ error: "Yêu cầu không hợp lệ." }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as
    | { username?: string; password?: string }
    | null;
  const username = body?.username?.trim() ?? "";
  const password = body?.password ?? "";

  if (!(await validateAdminCredentials(username, password))) {
    return Response.json({ error: "Tên đăng nhập hoặc mật khẩu không đúng." }, { status: 401 });
  }

  const session = await createAdminSession();
  const secure = new URL(request.url).protocol === "https:";
  return Response.json(
    { ok: true },
    { headers: { "Set-Cookie": adminSessionCookie(session.token, session.maxAge, secure) } },
  );
}
