export const telemetrySchemaVersion = "telemetry-v1";
export const requestIdHeader = "x-request-id";

export type TelemetryEventName =
  | "http.response_ready"
  | "chat.completed"
  | "auth.login";

export type TelemetryRoute =
  | "page"
  | "image.optimize"
  | "api.chat"
  | "api.other"
  | "admin.login"
  | "admin.other";

export type TelemetryOutcome =
  | "success"
  | "redirect"
  | "invalid_request"
  | "forbidden"
  | "invalid_credentials"
  | "authenticated"
  | "knowledge"
  | "web_search"
  | "retrieval_no_match"
  | "unavailable"
  | "rate_limited"
  | "dependency_error"
  | "internal_error";

export type TelemetryMode = "knowledge" | "web_search" | "unavailable";

export type TelemetryInput = {
  event: TelemetryEventName;
  requestId: string;
  route: TelemetryRoute;
  method: string;
  status: number;
  outcome: TelemetryOutcome;
  durationMs: number;
  mode?: TelemetryMode;
  policyVersion?: string;
  rankingVersion?: string;
  freshnessVersion?: string;
  retrievedRecordIds?: string[];
  citationIds?: string[];
  candidateIds?: string[];
  providerOutcome?: "success" | "timeout" | "error" | "refusal" | "invalid_output";
  providerLatencyMs?: number;
  providerModel?: string;
  providerRequestCount?: number;
  providerInputTokens?: number;
  providerOutputTokens?: number;
};

export type TelemetrySink = (serializedEvent: string) => void;

type TelemetryDependencies = {
  sink?: TelemetrySink;
  now?: () => number;
};

const eventNames = new Set<TelemetryEventName>([
  "http.response_ready",
  "chat.completed",
  "auth.login",
]);
const routes = new Set<TelemetryRoute>([
  "page",
  "image.optimize",
  "api.chat",
  "api.other",
  "admin.login",
  "admin.other",
]);
const outcomes = new Set<TelemetryOutcome>([
  "success",
  "redirect",
  "invalid_request",
  "forbidden",
  "invalid_credentials",
  "authenticated",
  "knowledge",
  "web_search",
  "retrieval_no_match",
  "unavailable",
  "rate_limited",
  "dependency_error",
  "internal_error",
]);
const modes = new Set<TelemetryMode>([
  "knowledge",
  "web_search",
  "unavailable",
]);
const methods = new Set(["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]);
const providerOutcomes = new Set([
  "success",
  "timeout",
  "error",
  "refusal",
  "invalid_output",
]);
const versionPattern = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$/;
const internalIdPattern = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const requestIdPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function defaultSink(serializedEvent: string) {
  console.log(serializedEvent);
}

function boundedInteger(value: unknown, maximum: number) {
  return typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= maximum
    ? value
    : undefined;
}

function boundedDuration(value: unknown) {
  return typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= 24 * 60 * 60 * 1000
    ? Math.round(value * 1000) / 1000
    : undefined;
}

function boundedVersion(value: unknown) {
  return typeof value === "string" && versionPattern.test(value)
    ? value
    : undefined;
}

function boundedIds(value: unknown) {
  if (!Array.isArray(value)) return undefined;
  const ids = Array.from(
    new Set(
      value.filter(
        (item): item is string =>
          typeof item === "string" && internalIdPattern.test(item),
      ),
    ),
  ).slice(0, 20);
  return ids.length > 0 ? ids : undefined;
}

export function createRequestId() {
  return crypto.randomUUID();
}

export function trustedRequestId(request: Request) {
  const candidate = request.headers.get(requestIdHeader) ?? "";
  return requestIdPattern.test(candidate) ? candidate : createRequestId();
}

export function telemetryRouteFor(request: Request): TelemetryRoute {
  const pathname = new URL(request.url).pathname;
  if (pathname === "/_vinext/image") return "image.optimize";
  if (pathname === "/api/chat") return "api.chat";
  if (pathname === "/admin/api/login") return "admin.login";
  if (pathname.startsWith("/admin")) return "admin.other";
  if (pathname.startsWith("/api")) return "api.other";
  return "page";
}

export function httpOutcome(status: number): TelemetryOutcome {
  if (status === 429) return "rate_limited";
  if (status === 503) return "dependency_error";
  if (status >= 500) return "internal_error";
  if (status === 401) return "invalid_credentials";
  if (status === 403) return "forbidden";
  if (status >= 400) return "invalid_request";
  if (status >= 300) return "redirect";
  return "success";
}

export function withRequestId(response: Response, requestId: string) {
  const result = new Response(response.body, response);
  result.headers.set("X-Request-ID", requestId);
  return result;
}

export function createTelemetry(dependencies: TelemetryDependencies = {}) {
  const sink = dependencies.sink ?? defaultSink;
  const now = dependencies.now ?? Date.now;

  function emit(input: TelemetryInput) {
    try {
      if (
        !eventNames.has(input.event) ||
        !requestIdPattern.test(input.requestId) ||
        !routes.has(input.route) ||
        !methods.has(input.method) ||
        !Number.isInteger(input.status) ||
        input.status < 100 ||
        input.status > 599 ||
        !outcomes.has(input.outcome)
      ) {
        return;
      }
      const durationMs = boundedDuration(input.durationMs);
      if (durationMs === undefined) return;

      const event: Record<string, unknown> = {
        schemaVersion: telemetrySchemaVersion,
        timestamp: new Date(now()).toISOString(),
        event: input.event,
        requestId: input.requestId,
        route: input.route,
        method: input.method,
        status: input.status,
        outcome: input.outcome,
        durationMs,
      };

      if (input.mode && modes.has(input.mode)) event.mode = input.mode;
      for (const [key, value] of [
        ["policyVersion", boundedVersion(input.policyVersion)],
        ["rankingVersion", boundedVersion(input.rankingVersion)],
        ["freshnessVersion", boundedVersion(input.freshnessVersion)],
        ["providerModel", boundedVersion(input.providerModel)],
      ] as const) {
        if (value !== undefined) event[key] = value;
      }
      for (const [key, value] of [
        ["retrievedRecordIds", boundedIds(input.retrievedRecordIds)],
        ["citationIds", boundedIds(input.citationIds)],
        ["candidateIds", boundedIds(input.candidateIds)],
      ] as const) {
        if (value !== undefined) event[key] = value;
      }
      if (
        input.providerOutcome &&
        providerOutcomes.has(input.providerOutcome)
      ) {
        event.providerOutcome = input.providerOutcome;
      }
      for (const [key, value] of [
        ["providerLatencyMs", boundedDuration(input.providerLatencyMs)],
        ["providerRequestCount", boundedInteger(input.providerRequestCount, 4)],
        ["providerInputTokens", boundedInteger(input.providerInputTokens, 10_000_000)],
        ["providerOutputTokens", boundedInteger(input.providerOutputTokens, 10_000_000)],
      ] as const) {
        if (value !== undefined) event[key] = value;
      }

      sink(JSON.stringify(event));
    } catch {
      // Telemetry must never affect the HTTP result or log the rejected object.
    }
  }

  return { emit };
}

export type Telemetry = ReturnType<typeof createTelemetry>;
