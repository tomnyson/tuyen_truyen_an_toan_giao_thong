import {
  createRequestId,
  createTelemetry,
  httpOutcome,
  requestIdHeader,
  telemetryRouteFor,
  withRequestId,
  type Telemetry,
} from "@/lib/telemetry";

type FetchHandler<Environment, Context> = {
  fetch(
    request: Request,
    environment: Environment,
    context: Context,
  ): Promise<Response>;
};

type WorkerObservabilityDependencies<Environment, Context> = {
  handler: FetchHandler<Environment, Context>;
  telemetry?: Telemetry;
  now?: () => number;
};

export function createObservableWorker<Environment, Context>(
  dependencies: WorkerObservabilityDependencies<Environment, Context>,
) {
  const telemetry = dependencies.telemetry ?? createTelemetry();
  const now = dependencies.now ?? Date.now;

  return {
    async fetch(
      request: Request,
      environment: Environment,
      context: Context,
    ): Promise<Response> {
      const startedAt = now();
      const requestId = createRequestId();
      const headers = new Headers(request.headers);
      headers.set(requestIdHeader, requestId);
      const trustedRequest = new Request(request, { headers });
      const route = telemetryRouteFor(trustedRequest);

      let response: Response;
      try {
        response = await dependencies.handler.fetch(
          trustedRequest,
          environment,
          context,
        );
      } catch {
        response = Response.json(
          { error: "Dịch vụ tạm thời chưa sẵn sàng." },
          {
            status: 500,
            headers: { "Cache-Control": "no-store" },
          },
        );
      }

      const result = withRequestId(response, requestId);
      telemetry.emit({
        event: "http.response_ready",
        requestId,
        route,
        method: request.method.toUpperCase(),
        status: result.status,
        outcome: httpOutcome(result.status),
        durationMs: Math.max(0, now() - startedAt),
      });
      return result;
    },
  };
}
