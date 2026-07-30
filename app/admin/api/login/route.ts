import {
  adminSessionCookie,
  createAdminSession,
  hasTrustedOrigin,
  validateAdminCredentials,
} from "@/lib/admin-auth";
import {
  createRuntimeRateLimiter,
  rateLimitErrorResponse,
  type RateLimitDecision,
} from "@/lib/rate-limit";
import {
  createTelemetry,
  httpOutcome,
  trustedRequestId,
  withRequestId,
  type Telemetry,
  type TelemetryOutcome,
} from "@/lib/telemetry";

type LoginRateLimiter = {
  beforeLogin(request: Request, username: string): Promise<RateLimitDecision>;
  recordLoginFailure(request: Request, username: string): Promise<RateLimitDecision>;
  resetLoginPair(
    request: Request,
    username: string,
    resetToken?: RateLimitDecision["resetToken"],
  ): Promise<RateLimitDecision>;
};

type LoginHandlerDependencies = {
  limiter: () => LoginRateLimiter;
  validateCredentials: typeof validateAdminCredentials;
  createSession: typeof createAdminSession;
  telemetry: Telemetry;
  now: () => number;
};

export function createLoginHandler(
  dependencies: Partial<LoginHandlerDependencies> = {},
) {
  const limiterFactory = dependencies.limiter ?? createRuntimeRateLimiter;
  const validateCredentials = dependencies.validateCredentials ?? validateAdminCredentials;
  const createSession = dependencies.createSession ?? createAdminSession;
  const telemetry = dependencies.telemetry ?? createTelemetry();
  const now = dependencies.now ?? Date.now;

  return async function login(request: Request) {
    const startedAt = now();
    const requestId = trustedRequestId(request);
    const complete = (
      response: Response,
      outcome: TelemetryOutcome,
      policyVersion?: string,
    ) => {
      const result = withRequestId(response, requestId);
      telemetry.emit({
        event: "auth.login",
        requestId,
        route: "admin.login",
        method: request.method.toUpperCase(),
        status: result.status,
        outcome,
        durationMs: Math.max(0, now() - startedAt),
        policyVersion,
      });
      return result;
    };

    if (!hasTrustedOrigin(request)) {
      return complete(
        Response.json({ error: "Yêu cầu không hợp lệ." }, { status: 403 }),
        "forbidden",
      );
    }

    try {
      const body = (await request.json().catch(() => null)) as
        | { username?: unknown; password?: unknown }
        | null;
      const username = typeof body?.username === "string" ? body.username.trim() : "";
      const password = typeof body?.password === "string" ? body.password : "";
      const limiter = limiterFactory();
      const preflight = await limiter.beforeLogin(request, username);
      if (!preflight.allowed) {
        return complete(
          rateLimitErrorResponse(preflight),
          httpOutcome(preflight.status),
          "rate-limit-v1",
        );
      }

      if (!(await validateCredentials(username, password))) {
        const failure = await limiter.recordLoginFailure(request, username);
        if (!failure.allowed) {
          return complete(
            rateLimitErrorResponse(failure),
            httpOutcome(failure.status),
            "rate-limit-v1",
          );
        }
        return complete(
          Response.json(
            { error: "Tên đăng nhập hoặc mật khẩu không đúng." },
            { status: 401, headers: { "Cache-Control": "no-store" } },
          ),
          "invalid_credentials",
        );
      }

      const reset = await limiter.resetLoginPair(request, username, preflight.resetToken);
      if (!reset.allowed) {
        return complete(
          rateLimitErrorResponse(reset),
          httpOutcome(reset.status),
          "rate-limit-v1",
        );
      }
      const session = await createSession();
      const secure = new URL(request.url).protocol === "https:";
      return complete(
        Response.json(
          { ok: true },
          {
            headers: {
              "Cache-Control": "no-store",
              "Set-Cookie": adminSessionCookie(session.token, session.maxAge, secure),
            },
          },
        ),
        "authenticated",
      );
    } catch {
      return complete(
        Response.json(
          { error: "Dịch vụ tạm thời chưa sẵn sàng." },
          { status: 500, headers: { "Cache-Control": "no-store" } },
        ),
        "internal_error",
      );
    }
  };
}

export const POST = createLoginHandler();
