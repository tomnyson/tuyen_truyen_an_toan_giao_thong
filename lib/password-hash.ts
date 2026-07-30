const passwordHashVersion = "v1";
const passwordHashAlgorithm = "pbkdf2-sha256";
const passwordHashIterations = 600_000;
const passwordSaltBytes = 16;
const passwordDigestBytes = 32;

const encoder = new TextEncoder();

function toBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value: string) {
  if (!value || !/^[A-Za-z0-9_-]+$/.test(value)) return null;

  try {
    const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    return toBase64Url(bytes) === value ? bytes : null;
  } catch {
    return null;
  }
}

function parsePasswordHash(value: string) {
  const [version, algorithm, iterationsValue, saltValue, digestValue, ...extra] = value.split("$");
  if (
    extra.length > 0 ||
    version !== passwordHashVersion ||
    algorithm !== passwordHashAlgorithm ||
    iterationsValue !== String(passwordHashIterations)
  ) {
    return null;
  }

  const salt = fromBase64Url(saltValue);
  const digest = fromBase64Url(digestValue);
  if (salt?.length !== passwordSaltBytes || digest?.length !== passwordDigestBytes) {
    return null;
  }

  return { salt, digest };
}

async function derivePassword(password: string, salt: Uint8Array) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: new Uint8Array(salt),
      iterations: passwordHashIterations,
    },
    key,
    passwordDigestBytes * 8,
  );
  return new Uint8Array(bits);
}

function safeEqualBytes(left: Uint8Array, right: Uint8Array) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left[index] ^ right[index];
  }
  return difference === 0;
}

export async function createAdminPasswordHash(password: string, salt?: Uint8Array) {
  const resolvedSalt = salt ?? crypto.getRandomValues(new Uint8Array(passwordSaltBytes));
  if (resolvedSalt.length !== passwordSaltBytes) {
    throw new Error(`Salt phải có đúng ${passwordSaltBytes} byte.`);
  }

  const digest = await derivePassword(password, resolvedSalt);
  return [
    passwordHashVersion,
    passwordHashAlgorithm,
    passwordHashIterations,
    toBase64Url(resolvedSalt),
    toBase64Url(digest),
  ].join("$");
}

export async function verifyAdminPassword(password: string, encodedHash: string) {
  const parsed = parsePasswordHash(encodedHash);
  if (!parsed) return false;

  try {
    const actualDigest = await derivePassword(password, parsed.salt);
    return safeEqualBytes(actualDigest, parsed.digest);
  } catch {
    return false;
  }
}

export const adminPasswordHashFormat =
  `${passwordHashVersion}$${passwordHashAlgorithm}$${passwordHashIterations}$<salt-base64url>$<digest-base64url>`;
