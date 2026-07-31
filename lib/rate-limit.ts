import { neon } from "@neondatabase/serverless";
import { env } from "cloudflare:workers";

export const rateLimitPolicyVersion = "rate-limit-v1";

const loginClientScope = "login-client-15m-v1";
const loginAccountScope = "login-account-60m-v1";
const loginPairAttemptScope = "login-pair-attempt-15m-v1";
const loginPairPenaltyScope = "login-pair-penalty-15m-v1";
const chatMinuteScope = "chat-client-60s-v1";
const chatDayScope = "chat-client-day-v1";

const minute = 60;
const loginWindow = 15 * minute;
const accountWindow = 60 * minute;
const day = 24 * 60 * minute;
const cleanupLimit = 100;
const cleanupGrace = minute;

type RateLimitScope =
  | typeof loginClientScope
  | typeof loginAccountScope
  | typeof loginPairAttemptScope
  | typeof loginPairPenaltyScope
  | typeof chatMinuteScope
  | typeof chatDayScope;

type RateLimitOutcome = "allowed" | "limited" | "dependency_error";

export type RateLimitTelemetryEvent = {
  scope: RateLimitScope;
  outcome: RateLimitOutcome;
  policyVersion: typeof rateLimitPolicyVersion;
  retryAfter: number;
  requestId: string;
};

type D1Result<Row = Record<string, unknown>> = {
  success?: boolean;
  results?: Row[];
};

export type RateLimitStatement = {
  bind(...values: unknown[]): RateLimitStatement;
};

export type RateLimitDatabase = {
  prepare(query: string): RateLimitStatement;
  batch(statements: RateLimitStatement[]): Promise<D1Result[]>;
};

export type RateLimitDecision = {
  allowed: boolean;
  status: 200 | 429 | 503;
  retryAfter: number;
  resetToken?: {
    windowStart: number;
    stateVersion: string;
  };
};

type RateLimiterDependencies = {
  database?: RateLimitDatabase;
  secret?: unknown;
  now?: () => number;
  telemetry?: (event: RateLimitTelemetryEvent) => void;
};

type LoginIdentity = {
  clientKey: string;
  accountKey: string;
  pairAttemptKey: string;
  pairPenaltyKey: string;
  requestId: string;
};

const cleanupBucketsSql = `
  DELETE FROM rate_limit_buckets
  WHERE (scope, key_hash, window_start) IN (
    SELECT scope, key_hash, window_start
    FROM rate_limit_buckets
    WHERE expires_at <= $1
    ORDER BY expires_at
    LIMIT $2
  )
`;

const cleanupPenaltiesSql = `
  DELETE FROM rate_limit_penalties
  WHERE (scope, key_hash) IN (
    SELECT scope, key_hash
    FROM rate_limit_penalties
    WHERE expires_at <= $1
    ORDER BY expires_at
    LIMIT $2
  )
`;

const consumeBucketSql = `
  INSERT INTO rate_limit_buckets (
    scope, key_hash, window_start, request_count, expires_at
  ) VALUES ($1, $2, $3, 1, $4)
  ON CONFLICT (scope, key_hash, window_start) DO UPDATE SET
    request_count = LEAST(rate_limit_buckets.request_count + 1, $5),
    expires_at = GREATEST(rate_limit_buckets.expires_at, excluded.expires_at)
  RETURNING request_count
`;

const readPenaltySql = `
  SELECT consecutive_failures, blocked_until, state_version
  FROM rate_limit_penalties
  WHERE scope = $1 AND key_hash = $2 AND window_start = $3
`;

const recordLoginFailureSql = `
  INSERT INTO rate_limit_penalties (
    scope, key_hash, window_start, consecutive_failures, blocked_until,
    state_version, expires_at
  ) VALUES ($1, $2, $3, 1, 0, md5(random()::text || clock_timestamp()::text), $4)
  ON CONFLICT (scope, key_hash) DO UPDATE SET
    window_start = excluded.window_start,
    consecutive_failures = CASE
      WHEN rate_limit_penalties.window_start = excluded.window_start
        THEN LEAST(rate_limit_penalties.consecutive_failures + 1, 5)
      ELSE 1
    END,
    blocked_until = CASE
      WHEN (
        CASE
          WHEN rate_limit_penalties.window_start = excluded.window_start
            THEN LEAST(rate_limit_penalties.consecutive_failures + 1, 5)
          ELSE 1
        END
      ) >= 5 THEN $5
      WHEN (
        CASE
          WHEN rate_limit_penalties.window_start = excluded.window_start
            THEN LEAST(rate_limit_penalties.consecutive_failures + 1, 5)
          ELSE 1
        END
      ) = 4 THEN $6
      WHEN (
        CASE
          WHEN rate_limit_penalties.window_start = excluded.window_start
            THEN LEAST(rate_limit_penalties.consecutive_failures + 1, 5)
          ELSE 1
        END
      ) = 3 THEN $7
      ELSE 0
    END,
    state_version = md5(random()::text || clock_timestamp()::text),
    expires_at = excluded.expires_at
  RETURNING consecutive_failures, blocked_until, state_version
`;

const resetLoginPairSql = `
  UPDATE rate_limit_penalties
  SET consecutive_failures = 0,
      blocked_until = 0,
      state_version = md5(random()::text || clock_timestamp()::text)
  WHERE scope = $1
    AND key_hash = $2
    AND window_start = $3
    AND state_version = $4
  RETURNING state_version
`;

function safeRequestId(request: Request) {
  const candidate = request.headers.get("x-request-id") ?? "";
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    candidate,
  )
    ? candidate
    : crypto.randomUUID();
}

function parseIpv4(value: string) {
  const parts = value.split(".");
  if (parts.length !== 4) return null;
  const numbers = parts.map((part) => (/^\d{1,3}$/.test(part) ? Number(part) : -1));
  if (numbers.some((part) => part < 0 || part > 255)) return null;
  return numbers;
}

function parseIpv6Part(value: string) {
  if (!value) return [];
  const parts = value.split(":");
  const output: number[] = [];
  for (let index = 0; index < parts.length; index += 1) {
    const part = parts[index];
    if (part.includes(".")) {
      if (index !== parts.length - 1) return null;
      const ipv4 = parseIpv4(part);
      if (!ipv4) return null;
      output.push((ipv4[0] << 8) | ipv4[1], (ipv4[2] << 8) | ipv4[3]);
    } else {
      if (!/^[0-9a-f]{1,4}$/i.test(part)) return null;
      output.push(Number.parseInt(part, 16));
    }
  }
  return output;
}

export function normalizeClientIp(value: string) {
  const candidate = value.trim();
  if (!candidate || candidate.includes(",") || /\s/.test(candidate) || candidate.includes("%")) {
    return null;
  }

  const ipv4 = parseIpv4(candidate);
  if (ipv4) return ipv4.join(".");

  const halves = candidate.split("::");
  if (halves.length > 2) return null;
  const left = parseIpv6Part(halves[0]);
  const right = parseIpv6Part(halves[1] ?? "");
  if (!left || !right) return null;

  const missing = 8 - left.length - right.length;
  if ((halves.length === 1 && missing !== 0) || (halves.length === 2 && missing < 1)) {
    return null;
  }
  const words = [...left, ...Array.from({ length: missing }, () => 0), ...right];
  if (words.length !== 8) return null;

  if (
    words.slice(0, 5).every((word) => word === 0) &&
    words[5] === 0xffff
  ) {
    return [
      words[6] >> 8,
      words[6] & 0xff,
      words[7] >> 8,
      words[7] & 0xff,
    ].join(".");
  }

  return `${words.slice(0, 4).map((word) => word.toString(16).padStart(4, "0")).join(":")}::/64`;
}

function normalizeUsername(username: string) {
  return username.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("vi-VN");
}

function windowStart(nowSeconds: number, windowSeconds: number) {
  return Math.floor(nowSeconds / windowSeconds) * windowSeconds;
}

function retryAfter(blockedUntil: number, nowSeconds: number) {
  return Math.max(1, Math.ceil(blockedUntil - nowSeconds));
}

function rows<Row extends Record<string, unknown>>(result: D1Result | undefined) {
  if (!result || result.success === false || !Array.isArray(result.results)) {
    throw new Error("Invalid D1 rate-limit result.");
  }
  return result.results as Row[];
}

export function createRateLimiter(dependencies: RateLimiterDependencies) {
  const database = dependencies.database;
  const secret =
    typeof dependencies.secret === "string" &&
    new TextEncoder().encode(dependencies.secret).length >= 32
      ? dependencies.secret
      : null;
  const now = dependencies.now ?? Date.now;
  const telemetry = dependencies.telemetry ?? (() => {});
  const keyPromise =
    secret === null
      ? null
      : crypto.subtle.importKey(
          "raw",
          new TextEncoder().encode(secret),
          { name: "HMAC", hash: "SHA-256" },
          false,
          ["sign"],
        );

  function emit(
    scope: RateLimitScope,
    outcome: RateLimitOutcome,
    retry: number,
    requestId: string,
  ) {
    try {
      telemetry({
        scope,
        outcome,
        policyVersion: rateLimitPolicyVersion,
        retryAfter: retry,
        requestId,
      });
    } catch {
      // Telemetry must never change the security decision.
    }
  }

  function dependencyError(scope: RateLimitScope, requestId: string): RateLimitDecision {
    emit(scope, "dependency_error", 5, requestId);
    return { allowed: false, status: 503, retryAfter: 5 };
  }

  function limited(
    scope: RateLimitScope,
    blockedUntil: number,
    nowSeconds: number,
    requestId: string,
  ): RateLimitDecision {
    const retry = retryAfter(blockedUntil, nowSeconds);
    emit(scope, "limited", retry, requestId);
    return { allowed: false, status: 429, retryAfter: retry };
  }

  async function hash(scope: RateLimitScope, value: string) {
    if (!keyPromise) throw new Error("Missing rate-limit secret.");
    const key = await keyPromise;
    const signature = await crypto.subtle.sign(
      "HMAC",
      key,
      new TextEncoder().encode(`${rateLimitPolicyVersion}\0${scope}\0${value}`),
    );
    return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, "0")).join("");
  }

  async function loginIdentity(request: Request, username: string): Promise<LoginIdentity> {
    const client = normalizeClientIp(request.headers.get("cf-connecting-ip") ?? "");
    if (!client) throw new Error("Missing trusted client identity.");
    const account = normalizeUsername(username);
    const [clientKey, accountKey, pairAttemptKey, pairPenaltyKey] = await Promise.all([
      hash(loginClientScope, client),
      hash(loginAccountScope, account),
      hash(loginPairAttemptScope, `${client}\0${account}`),
      hash(loginPairPenaltyScope, `${client}\0${account}`),
    ]);
    return {
      clientKey,
      accountKey,
      pairAttemptKey,
      pairPenaltyKey,
      requestId: safeRequestId(request),
    };
  }

  function cleanupStatements(nowSeconds: number) {
    if (!database) throw new Error("Missing D1 rate-limit database.");
    return [
      database.prepare(cleanupBucketsSql).bind(nowSeconds, cleanupLimit),
      database.prepare(cleanupPenaltiesSql).bind(nowSeconds, cleanupLimit),
    ];
  }

  function bucketStatement(
    scope: RateLimitScope,
    key: string,
    start: number,
    windowSeconds: number,
    maximum: number,
  ) {
    if (!database) throw new Error("Missing D1 rate-limit database.");
    return database
      .prepare(consumeBucketSql)
      .bind(scope, key, start, start + windowSeconds + cleanupGrace, maximum + 1);
  }

  async function runBatch(statements: RateLimitStatement[]) {
    if (!database) throw new Error("Missing D1 rate-limit database.");
    const result = await database.batch(statements);
    if (
      !Array.isArray(result) ||
      result.length !== statements.length ||
      result.some(
        (item) =>
          !item ||
          item.success !== true ||
          !Array.isArray(item.results),
      )
    ) {
      throw new Error("Invalid D1 rate-limit batch result.");
    }
    return result;
  }

  async function beforeLogin(request: Request, username: string): Promise<RateLimitDecision> {
    const requestId = safeRequestId(request);
    try {
      if (!database || !keyPromise) throw new Error("Invalid rate-limit configuration.");
      const identity = await loginIdentity(request, username);
      const nowSeconds = Math.floor(now() / 1000);
      const loginStart = windowStart(nowSeconds, loginWindow);
      const accountStart = windowStart(nowSeconds, accountWindow);
      const result = await runBatch([
        ...cleanupStatements(nowSeconds),
        bucketStatement(loginClientScope, identity.clientKey, loginStart, loginWindow, 20),
        bucketStatement(
          loginAccountScope,
          identity.accountKey,
          accountStart,
          accountWindow,
          20,
        ),
        bucketStatement(
          loginPairAttemptScope,
          identity.pairAttemptKey,
          loginStart,
          loginWindow,
          5,
        ),
        database
          .prepare(readPenaltySql)
          .bind(loginPairPenaltyScope, identity.pairPenaltyKey, loginStart),
      ]);
      const clientCount = Number(rows<{ request_count: number }>(result[2])[0]?.request_count);
      const accountCount = Number(rows<{ request_count: number }>(result[3])[0]?.request_count ?? 0);
      const pairAttemptCount = Number(
        rows<{ request_count: number }>(result[4])[0]?.request_count,
      );
      const penalty = rows<{
        blocked_until: number;
        consecutive_failures: number;
        state_version: string;
      }>(result[5])[0];
      const blockedUntil = Number(penalty?.blocked_until ?? 0);
      const consecutiveFailures = Number(penalty?.consecutive_failures ?? 0);
      const stateVersion =
        typeof penalty?.state_version === "string" ? penalty.state_version : "";

      if (
        !Number.isFinite(clientCount) ||
        !Number.isFinite(accountCount) ||
        !Number.isFinite(pairAttemptCount) ||
        !Number.isFinite(blockedUntil) ||
        !Number.isInteger(consecutiveFailures) ||
        consecutiveFailures < 0 ||
        (stateVersion !== "" && !/^[0-9a-f]{32}$/.test(stateVersion))
      ) {
        throw new Error("Malformed rate-limit state.");
      }
      if (clientCount > 20) {
        return limited(loginClientScope, loginStart + loginWindow, nowSeconds, identity.requestId);
      }
      if (accountCount > 20) {
        return limited(loginAccountScope, accountStart + accountWindow, nowSeconds, identity.requestId);
      }
      if (pairAttemptCount > 5) {
        return limited(
          loginPairAttemptScope,
          loginStart + loginWindow,
          nowSeconds,
          identity.requestId,
        );
      }
      if (blockedUntil > nowSeconds) {
        return limited(loginPairPenaltyScope, blockedUntil, nowSeconds, identity.requestId);
      }

      emit(loginClientScope, "allowed", 0, identity.requestId);
      return {
        allowed: true,
        status: 200,
        retryAfter: 0,
        resetToken: { windowStart: loginStart, stateVersion },
      };
    } catch {
      return dependencyError(loginClientScope, requestId);
    }
  }

  async function recordLoginFailure(
    request: Request,
    username: string,
  ): Promise<RateLimitDecision> {
    const requestId = safeRequestId(request);
    try {
      if (!database || !keyPromise) throw new Error("Invalid rate-limit configuration.");
      const identity = await loginIdentity(request, username);
      const nowSeconds = Math.floor(now() / 1000);
      const loginStart = windowStart(nowSeconds, loginWindow);
      const result = await runBatch([
        ...cleanupStatements(nowSeconds),
        database.prepare(recordLoginFailureSql).bind(
          loginPairPenaltyScope,
          identity.pairPenaltyKey,
          loginStart,
          loginStart + loginWindow + cleanupGrace,
          loginStart + loginWindow,
          nowSeconds + 4,
          nowSeconds + 2,
        ),
      ]);
      const penalty = rows<{ blocked_until: number }>(result[2])[0];
      const blockedUntil = Number(penalty?.blocked_until);
      if (!Number.isFinite(blockedUntil)) {
        throw new Error("Malformed rate-limit state.");
      }

      if (blockedUntil > nowSeconds) {
        return limited(loginPairPenaltyScope, blockedUntil, nowSeconds, identity.requestId);
      }
      emit(loginPairPenaltyScope, "allowed", 0, identity.requestId);
      return { allowed: true, status: 200, retryAfter: 0 };
    } catch {
      return dependencyError(loginPairPenaltyScope, requestId);
    }
  }

  async function resetLoginPair(
    request: Request,
    username: string,
    resetToken?: RateLimitDecision["resetToken"],
  ): Promise<RateLimitDecision> {
    const requestId = safeRequestId(request);
    try {
      if (!database || !keyPromise) throw new Error("Invalid rate-limit configuration.");
      const identity = await loginIdentity(request, username);
      const nowSeconds = Math.floor(now() / 1000);
      if (
        !resetToken ||
        !Number.isInteger(resetToken.windowStart) ||
        typeof resetToken.stateVersion !== "string" ||
        (resetToken.stateVersion !== "" &&
          !/^[0-9a-f]{32}$/.test(resetToken.stateVersion))
      ) {
        throw new Error("Missing login reset token.");
      }
      await runBatch([
        ...cleanupStatements(nowSeconds),
        database.prepare(resetLoginPairSql).bind(
          loginPairPenaltyScope,
          identity.pairPenaltyKey,
          resetToken.windowStart,
          resetToken.stateVersion,
        ),
      ]);
      emit(loginPairPenaltyScope, "allowed", 0, identity.requestId);
      return { allowed: true, status: 200, retryAfter: 0 };
    } catch {
      return dependencyError(loginPairPenaltyScope, requestId);
    }
  }

  async function consumeChat(request: Request): Promise<RateLimitDecision> {
    const requestId = safeRequestId(request);
    try {
      if (!database || !keyPromise) throw new Error("Invalid rate-limit configuration.");
      const client = normalizeClientIp(request.headers.get("cf-connecting-ip") ?? "");
      if (!client) throw new Error("Missing trusted client identity.");
      const [minuteKey, dayKey] = await Promise.all([
        hash(chatMinuteScope, client),
        hash(chatDayScope, client),
      ]);
      const nowSeconds = Math.floor(now() / 1000);
      const minuteStart = windowStart(nowSeconds, minute);
      const dayStart = windowStart(nowSeconds, day);
      const result = await runBatch([
        ...cleanupStatements(nowSeconds),
        bucketStatement(chatMinuteScope, minuteKey, minuteStart, minute, 20),
        bucketStatement(chatDayScope, dayKey, dayStart, day, 200),
      ]);
      const minuteCount = Number(rows<{ request_count: number }>(result[2])[0]?.request_count);
      const dayCount = Number(rows<{ request_count: number }>(result[3])[0]?.request_count);
      if (!Number.isFinite(minuteCount) || !Number.isFinite(dayCount)) {
        throw new Error("Malformed rate-limit state.");
      }
      if (minuteCount > 20) {
        return limited(chatMinuteScope, minuteStart + minute, nowSeconds, requestId);
      }
      if (dayCount > 200) {
        return limited(chatDayScope, dayStart + day, nowSeconds, requestId);
      }
      emit(chatMinuteScope, "allowed", 0, requestId);
      return { allowed: true, status: 200, retryAfter: 0 };
    } catch {
      return dependencyError(chatMinuteScope, requestId);
    }
  }

  return { beforeLogin, consumeChat, recordLoginFailure, resetLoginPair };
}

// Adapter Neon giữ nguyên giao diện prepare/bind/batch kiểu D1 mà
// createRateLimiter tiêu thụ; batch chạy nguyên tử qua sql.transaction.
type PreparedStatement = RateLimitStatement & {
  query: string;
  values: unknown[];
};

function createNeonRateLimitDatabase(): RateLimitDatabase | undefined {
  const url = env.DATABASE_URL ?? process.env.DATABASE_URL;
  if (typeof url !== "string" || url.length === 0) return undefined;
  const sql = neon(url);
  return {
    prepare(query: string): RateLimitStatement {
      const statement: PreparedStatement = {
        query,
        values: [],
        bind(...values: unknown[]) {
          return { ...statement, values };
        },
      };
      return statement;
    },
    async batch(statements: RateLimitStatement[]) {
      const results = await sql.transaction(
        statements.map((statement) => {
          const { query, values } = statement as PreparedStatement;
          return sql.query(query, values);
        }),
      );
      return results.map((resultRows) => ({
        success: true,
        results: resultRows as Record<string, unknown>[],
      }));
    },
  };
}

let runtimeDatabase: RateLimitDatabase | undefined;

export function createRuntimeRateLimiter() {
  runtimeDatabase ??= createNeonRateLimitDatabase();
  return createRateLimiter({
    database: runtimeDatabase,
    secret: env.RATE_LIMIT_KEY_SECRET ?? process.env.RATE_LIMIT_KEY_SECRET,
  });
}

export function rateLimitErrorResponse(decision: RateLimitDecision) {
  const error =
    decision.status === 429
      ? "Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau."
      : "Dịch vụ tạm thời chưa sẵn sàng. Vui lòng thử lại sau.";
  return Response.json(
    { error },
    {
      status: decision.status,
      headers: {
        "Cache-Control": "no-store",
        "Retry-After": String(decision.retryAfter),
      },
    },
  );
}
