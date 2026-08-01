import { env } from "@/lib/runtime-env";
import { verifyAdminPassword } from "@/lib/password-hash";

export const adminCookieName = "law_school_admin";
const sessionTtlSeconds = 8 * 60 * 60;

export type AdminSessionActor = {
  username: string;
  principalId: string;
};

type AdminAccount = AdminSessionActor & {
  passwordHash?: string;
  plainPassword?: string;
};

function getSecret(name: string) {
  const value = env[name] ?? process.env[name];
  return typeof value === "string" ? value : "";
}

function toBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value: string) {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) return null;
  const padded = value.replace(/-/g, "+").replace(/_/g, "/")
    .padEnd(Math.ceil(value.length / 4) * 4, "=");
  try {
    const binary = atob(padded);
    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
  } catch {
    return null;
  }
}

function accountRegistry(): AdminAccount[] {
  const rawRegistry = getSecret("ADMIN_ACCOUNTS_JSON").trim();
  if (rawRegistry) {
    try {
      const parsed = JSON.parse(rawRegistry);
      if (!Array.isArray(parsed) || parsed.length < 1 || parsed.length > 20) {
        return [];
      }
      const accounts: AdminAccount[] = [];
      const usernames = new Set<string>();
      const principals = new Set<string>();
      for (const value of parsed) {
        if (!value || typeof value !== "object") return [];
        const record = value as Record<string, unknown>;
        const username =
          typeof record.username === "string" ? record.username.trim() : "";
        const passwordHash =
          typeof record.passwordHash === "string"
            ? record.passwordHash.trim()
            : "";
        const principalId =
          typeof record.principalId === "string"
            ? record.principalId.trim()
            : "";
        if (
          !/^[A-Za-z0-9._@-]{1,80}$/.test(username) ||
          !/^[A-Za-z0-9._:@-]{1,128}$/.test(principalId) ||
          !passwordHash ||
          usernames.has(username) ||
          principals.has(principalId)
        ) {
          return [];
        }
        usernames.add(username);
        principals.add(principalId);
        accounts.push({ username, passwordHash, principalId });
      }
      return accounts;
    } catch {
      return [];
    }
  }

  const username = getSecret("ADMIN_USERNAME").trim();
  const plainPassword = getSecret("ADMIN_PASSWORD");
  const passwordHash = getSecret("ADMIN_PASSWORD_HASH").trim();
  const principalId =
    getSecret("ADMIN_PRINCIPAL_ID").trim() || `legacy-admin:${username}`;
  if (!username || !/^[A-Za-z0-9._:@-]{1,128}$/.test(principalId)) return [];
  // Ưu tiên ADMIN_PASSWORD thuần (cấu hình đơn giản); hash là đường nâng cao.
  if (plainPassword) return [{ username, plainPassword, principalId }];
  return passwordHash ? [{ username, passwordHash, principalId }] : [];
}

// Secret ký phiên: dùng ADMIN_SESSION_SECRET nếu có (≥32 ký tự); nếu không,
// tự dẫn xuất từ ADMIN_PASSWORD (SHA-256, 64 hex) để cấu hình tối giản chỉ
// cần username + password. Đổi mật khẩu sẽ vô hiệu các phiên cũ — chấp nhận.
async function sessionSigningSecret(): Promise<string> {
  const configured = getSecret("ADMIN_SESSION_SECRET");
  if (configured.length >= 32) return configured;
  const password = getSecret("ADMIN_PASSWORD");
  if (!password) return "";
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`admin-session-secret-v1:${password}`),
  );
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function digest(value: string) {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
}

async function safeEqual(left: string, right: string) {
  const [leftHash, rightHash] = await Promise.all([digest(left), digest(right)]);
  let difference = 0;
  for (let index = 0; index < leftHash.length; index += 1) {
    difference |= leftHash[index] ^ rightHash[index];
  }
  return difference === 0;
}

async function sign(payload: string) {
  const secret = await sessionSigningSecret();
  if (secret.length < 32) return "";
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return toBase64Url(new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload))));
}

export async function validateAdminCredentials(username: string, password: string) {
  if (
    (await sessionSigningSecret()).length < 32 ||
    !password ||
    new TextEncoder().encode(password).length > 1024
  ) {
    return false;
  }
  const accounts = accountRegistry();
  const comparisons = await Promise.all(
    accounts.map(async (account) => {
      const [usernameMatches, passwordMatches] = await Promise.all([
        safeEqual(username, account.username),
        account.plainPassword !== undefined
          ? safeEqual(password, account.plainPassword)
          : verifyAdminPassword(password, account.passwordHash ?? ""),
      ]);
      return usernameMatches && passwordMatches;
    }),
  );
  return comparisons.some(Boolean);
}

export async function createAdminSession(username?: string) {
  const accounts = accountRegistry();
  const account = username
    ? accounts.find((candidate) => candidate.username === username)
    : accounts[0];
  if (!account) throw new Error("Tài khoản quản trị chưa được cấu hình.");
  const expiresAt = Math.floor(Date.now() / 1000) + sessionTtlSeconds;
  const payload = toBase64Url(
    new TextEncoder().encode(
      JSON.stringify({
        version: 2,
        username: account.username,
        principalId: account.principalId,
        expiresAt,
      }),
    ),
  );
  const signature = await sign(payload);
  if (!signature) throw new Error("ADMIN_SESSION_SECRET phải có ít nhất 32 ký tự.");
  return { token: `v2.${payload}.${signature}`, maxAge: sessionTtlSeconds };
}

export async function verifyAdminSessionActor(
  token: string | undefined,
): Promise<AdminSessionActor | null> {
  if (!token) return null;
  const [version, payload, signature, extra] = token.split(".");
  if (version !== "v2" || !payload || !signature || extra) return null;
  const expectedSignature = await sign(payload);
  if (!expectedSignature || !(await safeEqual(signature, expectedSignature))) {
    return null;
  }
  const decoded = fromBase64Url(payload);
  if (!decoded) return null;
  let session: Record<string, unknown>;
  try {
    session = JSON.parse(new TextDecoder().decode(decoded));
  } catch {
    return null;
  }
  if (
    session.version !== 2 ||
    typeof session.username !== "string" ||
    typeof session.principalId !== "string" ||
    typeof session.expiresAt !== "number" ||
    !Number.isInteger(session.expiresAt) ||
    session.expiresAt <= Date.now() / 1000
  ) {
    return null;
  }
  const account = accountRegistry().find(
    (candidate) =>
      candidate.username === session.username &&
      candidate.principalId === session.principalId,
  );
  return account
    ? { username: account.username, principalId: account.principalId }
    : null;
}

export async function verifyAdminSession(token: string | undefined) {
  return Boolean(await verifyAdminSessionActor(token));
}

export function readCookie(request: Request, name: string) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  for (const part of cookieHeader.split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (key === name) return decodeURIComponent(value.join("="));
  }
  return undefined;
}

export async function isAdminRequest(request: Request) {
  return verifyAdminSession(readCookie(request, adminCookieName));
}

export async function getAdminRequestActor(request: Request) {
  return verifyAdminSessionActor(readCookie(request, adminCookieName));
}

export function adminSessionCookie(token: string, maxAge: number, secure: boolean) {
  return `${adminCookieName}=${encodeURIComponent(token)}; Path=/admin; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure ? "; Secure" : ""}`;
}

export function clearAdminSessionCookie(secure: boolean) {
  return `${adminCookieName}=; Path=/admin; HttpOnly; SameSite=Strict; Max-Age=0${secure ? "; Secure" : ""}`;
}

export function hasTrustedOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return Boolean(origin && origin === new URL(request.url).origin);
}
