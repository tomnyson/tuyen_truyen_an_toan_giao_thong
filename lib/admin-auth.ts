import { env } from "cloudflare:workers";

export const adminCookieName = "law_school_admin";
const sessionTtlSeconds = 8 * 60 * 60;

function getSecret(name: "ADMIN_USERNAME" | "ADMIN_PASSWORD" | "ADMIN_SESSION_SECRET") {
  const value = env[name] ?? process.env[name];
  return typeof value === "string" ? value : "";
}

function toBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
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
  const secret = getSecret("ADMIN_SESSION_SECRET");
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
  const expectedUsername = getSecret("ADMIN_USERNAME");
  const expectedPassword = getSecret("ADMIN_PASSWORD");
  if (!expectedUsername || !expectedPassword || getSecret("ADMIN_SESSION_SECRET").length < 32) {
    return false;
  }
  const [usernameMatches, passwordMatches] = await Promise.all([
    safeEqual(username, expectedUsername),
    safeEqual(password, expectedPassword),
  ]);
  return usernameMatches && passwordMatches;
}

export async function createAdminSession() {
  const expiresAt = Math.floor(Date.now() / 1000) + sessionTtlSeconds;
  const payload = `${getSecret("ADMIN_USERNAME")}.${expiresAt}`;
  const signature = await sign(payload);
  if (!signature) throw new Error("ADMIN_SESSION_SECRET phải có ít nhất 32 ký tự.");
  return { token: `${payload}.${signature}`, maxAge: sessionTtlSeconds };
}

export async function verifyAdminSession(token: string | undefined) {
  if (!token) return false;
  const separator = token.lastIndexOf(".");
  if (separator < 1) return false;
  const payload = token.slice(0, separator);
  const signature = token.slice(separator + 1);
  const [username, expiresAtValue] = payload.split(".");
  const expiresAt = Number(expiresAtValue);
  if (username !== getSecret("ADMIN_USERNAME") || !Number.isFinite(expiresAt) || expiresAt <= Date.now() / 1000) {
    return false;
  }
  const expectedSignature = await sign(payload);
  return Boolean(signature && expectedSignature) && safeEqual(signature, expectedSignature);
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
