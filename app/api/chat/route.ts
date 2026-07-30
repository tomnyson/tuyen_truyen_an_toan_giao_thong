import { NextResponse } from "next/server";
import {
  classifyImageIntent,
  privacySafetyGuidance,
} from "@/lib/image-intent";
import { findCuratedAnswer, findManagedAnswer } from "@/lib/legal-chat";
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
  type TelemetryMode,
  type TelemetryOutcome,
} from "@/lib/telemetry";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const unavailableAnswer =
  "Câu hỏi này chưa có trong dữ liệu hiện được xuất bản của cổng, nên mình chưa thể đưa ra thông tin pháp lý chắc chắn. Bạn hãy kiểm tra văn bản chính thức hoặc trao đổi cùng phụ huynh, giáo viên hay người có chuyên môn pháp lý.";

function sanitizeMessages(value: unknown): ChatMessage[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter(
      (message): message is ChatMessage =>
        typeof message === "object" &&
        message !== null &&
        (message.role === "user" || message.role === "assistant") &&
        typeof message.content === "string",
    )
    .slice(-8)
    .map((message) => ({
      role: message.role,
      content: message.content.slice(0, 600),
    }));
}

function unavailableResponse() {
  return NextResponse.json({
    answer: unavailableAnswer,
    mode: "unavailable",
  });
}

type ChatHandlerDependencies = {
  limiter: () => {
    consumeChat(request: Request): Promise<RateLimitDecision>;
  };
  managedAnswer: typeof findManagedAnswer;
  curatedAnswer: typeof findCuratedAnswer;
  imageIntent: typeof classifyImageIntent;
  telemetry: Telemetry;
  now: () => number;
};

export function createChatHandler(
  dependencies: Partial<ChatHandlerDependencies> = {},
) {
  const limiterFactory = dependencies.limiter ?? createRuntimeRateLimiter;
  const managedAnswer = dependencies.managedAnswer ?? findManagedAnswer;
  const curatedAnswer = dependencies.curatedAnswer ?? findCuratedAnswer;
  const imageIntent = dependencies.imageIntent ?? classifyImageIntent;
  const telemetry = dependencies.telemetry ?? createTelemetry();
  const now = dependencies.now ?? Date.now;

  return async function chat(request: Request) {
    const startedAt = now();
    const requestId = trustedRequestId(request);
    const complete = (
      response: Response,
      outcome: TelemetryOutcome,
      mode?: TelemetryMode,
      policyVersion?: string,
    ) => {
      const result = withRequestId(response, requestId);
      telemetry.emit({
        event: "chat.completed",
        requestId,
        route: "api.chat",
        method: request.method.toUpperCase(),
        status: result.status,
        outcome,
        durationMs: Math.max(0, now() - startedAt),
        mode,
        policyVersion,
      });
      return result;
    };

    let rateLimit: RateLimitDecision;
    try {
      rateLimit = await limiterFactory().consumeChat(request);
    } catch {
      return complete(
        rateLimitErrorResponse({
          allowed: false,
          status: 503,
          retryAfter: 5,
        }),
        "dependency_error",
        undefined,
        "rate-limit-v1",
      );
    }
    if (!rateLimit.allowed) {
      return complete(
        rateLimitErrorResponse(rateLimit),
        httpOutcome(rateLimit.status),
        undefined,
        "rate-limit-v1",
      );
    }

    try {
      const body = (await request.json()) as { messages?: unknown };
      const messages = sanitizeMessages(body.messages);
      const question = messages.findLast(
        (message) => message.role === "user",
      )?.content.trim();

      if (!question) {
        return complete(
          NextResponse.json(
            { error: "Bạn hãy nhập một câu hỏi trước nhé." },
            { status: 400 },
          ),
          "invalid_request",
        );
      }

      const imageDecision = imageIntent(question);
      if (imageDecision.intent === "privacy_safety") {
        return complete(
          NextResponse.json({
            answer: privacySafetyGuidance.answer,
            mode: "knowledge",
          }),
          "knowledge",
          "knowledge",
          imageDecision.policyVersion,
        );
      }
      if (
        imageDecision.intent === "copyright" ||
        imageDecision.reasons.includes("ambiguous")
      ) {
        // No reviewed, intent-tagged copyright record exists yet. Recognized
        // copyright and ambiguous image questions must not enter legacy weak
        // matching or be mapped to the privacy guidance.
        return complete(
          unavailableResponse(),
          "retrieval_no_match",
          "unavailable",
          imageDecision.policyVersion,
        );
      }

      const knowledgeAnswer = (await managedAnswer(question)) ?? curatedAnswer(question);
      if (knowledgeAnswer) {
        return complete(
          NextResponse.json({ answer: knowledgeAnswer, mode: "knowledge" }),
          "knowledge",
          "knowledge",
        );
      }

      // DEC-002: AI may only rephrase an evidence bundle returned by retrieval.
      // The current API has no evidence-bound composition/validation yet, so an
      // unmatched question must fail closed even when provider credentials exist.
      return complete(
        unavailableResponse(),
        "retrieval_no_match",
        "unavailable",
      );
    } catch {
      return complete(unavailableResponse(), "unavailable", "unavailable");
    }
  };
}

export const POST = createChatHandler();
