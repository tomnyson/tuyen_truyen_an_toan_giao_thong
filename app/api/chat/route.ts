import { env } from "@/lib/runtime-env";
import { NextResponse } from "next/server";
import {
  classifyImageIntent,
  privacySafetyGuidance,
} from "@/lib/image-intent";
import type { AnswerOrigin } from "@/lib/answer-origin";
import {
  CHAT_ANSWER_SECTION_KINDS,
  projectPublicWebSearchAnswer,
  reviewedCitationsToLegalBasisSection,
} from "@/lib/chat-answer-presentation";
import {
  findGroundedAnswer,
  GROUNDED_ANSWER_POLICY_VERSION,
} from "@/lib/grounded-answer";
import { findCuratedAnswer, findManagedAnswer } from "@/lib/legal-chat";
import {
  readOpenAiWebSearchConfig,
  searchAllowedLegalSources,
  searchReferenceLegalSources,
  REFERENCE_SEARCH_POLICY_VERSION,
  WEB_SEARCH_POLICY_VERSION,
} from "@/lib/openai-web-search";
import {
  parseOfficialSourceLinks,
  parseReferenceSourceLinks,
} from "@/lib/official-source-url";
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
import {
  findReviewedWebCandidate,
  persistWebSearchCandidate,
  reserveWebSearchBudget,
  settleWebSearchBudget,
  WEB_SEARCH_BUDGET_POLICY_VERSION,
  WEB_SEARCH_CANDIDATE_POLICY_VERSION,
  type ReviewedWebCandidateAnswer,
  type WebSearchBudgetReservation,
} from "@/lib/web-search-candidates";

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

// Nhãn phiên bản của telemetry không nhận dấu gạch dưới, nên mã lỗi phải được
// hạ chữ và đổi sang gạch nối trước khi phát đi, nếu không sẽ bị bỏ lặng.
function telemetryCode(code: string): string {
  return code.toLowerCase().replace(/_/g, "-");
}

function unavailableResponse() {
  return NextResponse.json({
    answer: unavailableAnswer,
    mode: "unavailable",
  });
}

function sumKnownTokenCounts(...values: Array<number | null | undefined>) {
  const known = values.filter(
    (value): value is number =>
      typeof value === "number" && Number.isInteger(value) && value >= 0,
  );
  return known.length > 0
    ? known.reduce((total, value) => total + value, 0)
    : undefined;
}

type ChatHandlerDependencies = {
  limiter: () => {
    consumeChat(request: Request): Promise<RateLimitDecision>;
  };
  groundedAnswer: typeof findGroundedAnswer;
  managedAnswer: typeof findManagedAnswer;
  curatedAnswer: typeof findCuratedAnswer;
  imageIntent: typeof classifyImageIntent;
  webSearch: typeof searchAllowedLegalSources;
  referenceWebSearch: typeof searchReferenceLegalSources;
  reviewedWebAnswer: typeof findReviewedWebCandidate;
  reserveWebBudget: () => Promise<WebSearchBudgetReservation | null>;
  settleWebBudget: (
    reservation: WebSearchBudgetReservation,
    actualTokens: number | null,
  ) => Promise<boolean>;
  persistWebCandidate: typeof persistWebSearchCandidate;
  telemetry: Telemetry;
  now: () => number;
};

export function createChatHandler(
  dependencies: Partial<ChatHandlerDependencies> = {},
) {
  const limiterFactory = dependencies.limiter ?? createRuntimeRateLimiter;
  const groundedAnswer = dependencies.groundedAnswer ?? findGroundedAnswer;
  const managedAnswer = dependencies.managedAnswer ?? findManagedAnswer;
  const curatedAnswer = dependencies.curatedAnswer ?? findCuratedAnswer;
  const imageIntent = dependencies.imageIntent ?? classifyImageIntent;
  const webSearch = dependencies.webSearch ?? searchAllowedLegalSources;
  const referenceWebSearch =
    dependencies.referenceWebSearch ?? searchReferenceLegalSources;
  const reviewedWebAnswer =
    dependencies.reviewedWebAnswer ?? findReviewedWebCandidate;
  const reserveWebBudget =
    dependencies.reserveWebBudget ?? reserveWebSearchBudget;
  const settleWebBudget =
    dependencies.settleWebBudget ?? settleWebSearchBudget;
  const persistWebCandidate =
    dependencies.persistWebCandidate ?? persistWebSearchCandidate;
  const telemetry = dependencies.telemetry ?? createTelemetry();
  const now = dependencies.now ?? Date.now;

  return async function chat(request: Request) {
    const startedAt = now();
    const requestId = trustedRequestId(request);
    // Nhánh có kiểm chứng thất bại thì request đi tiếp cascade cũ, nhưng lý do
    // vẫn phải nhìn thấy được trong telemetry của câu trả lời cuối cùng.
    let groundedCode: string | undefined;
    const complete = (
      response: Response,
      outcome: TelemetryOutcome,
      mode?: TelemetryMode,
      policyVersion?: string,
      metadata: {
        candidateIds?: string[];
        providerModel?: string;
        providerRequestCount?: number;
        providerInputTokens?: number;
        providerOutputTokens?: number;
        providerOutcome?: "success" | "timeout" | "error" | "refusal" | "invalid_output";
        groundedCode?: string;
        shortlistSize?: number;
        citedEvidenceCount?: number;
      } = {},
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
        groundedCode,
        ...metadata,
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
      if (imageDecision.reasons.includes("ambiguous")) {
        // No reviewed, intent-tagged copyright record exists yet. Recognized
        // ambiguous image questions must not enter legacy weak matching or be
        // mapped to the privacy guidance.
        return complete(
          unavailableResponse(),
          "retrieval_no_match",
          "unavailable",
          imageDecision.policyVersion,
        );
      }

      // DEC-019: kho nội bộ đã duyệt bốn mắt được diễn giải lại bằng đúng một
      // lần gọi mô hình. Câu hỏi bản quyền vẫn đứng ngoài như mọi nhánh khác,
      // và mọi thất bại đều rơi xuống cascade cũ chứ không làm hỏng câu trả lời.
      if (imageDecision.intent !== "copyright") {
        const grounded = await groundedAnswer(messages);
        if (grounded.ok) {
          const groundedOrigin: AnswerOrigin = "grounded_library";
          return complete(
            NextResponse.json({
              answer: grounded.answer.answer,
              sections: grounded.answer.sections,
              mode: "knowledge" as const,
              answerOrigin: groundedOrigin,
              sources: grounded.answer.sources,
              followUps: grounded.answer.followUps,
            }),
            "knowledge",
            "knowledge",
            GROUNDED_ANSWER_POLICY_VERSION,
            {
              providerModel: grounded.answer.model,
              providerRequestCount: 1,
              providerInputTokens: grounded.answer.inputTokens ?? undefined,
              providerOutputTokens: grounded.answer.outputTokens ?? undefined,
              providerOutcome: "success",
              shortlistSize: grounded.answer.shortlistSize,
              citedEvidenceCount: grounded.answer.citedEvidenceCount,
            },
          );
        }
        groundedCode = telemetryCode(grounded.code);
      }

      // Copyright questions skip legacy weak matching, but may use the
      // separately guarded official-source search fallback.
      const knowledgeAnswer =
        imageDecision.intent === "copyright"
          ? null
          : (await managedAnswer(question)) ?? curatedAnswer(question);
      if (knowledgeAnswer) {
        // US-031: kho nội bộ luôn được trả lời trước và gắn nhãn nguồn rõ ràng.
        const libraryOrigin: AnswerOrigin = "library";
        const knowledgePayload =
          typeof knowledgeAnswer === "string"
            ? {
                answer: knowledgeAnswer,
                mode: "knowledge" as const,
                answerOrigin: libraryOrigin,
              }
            : {
                answer: knowledgeAnswer.answer,
                sections: knowledgeAnswer.sections,
                mode: "knowledge" as const,
                answerOrigin: libraryOrigin,
                sources: parseOfficialSourceLinks(knowledgeAnswer.sources),
              };
        return complete(
          NextResponse.json(knowledgePayload),
          "knowledge",
          "knowledge",
        );
      }

      const reviewedCandidate: ReviewedWebCandidateAnswer | null =
        await reviewedWebAnswer(question);
      if (reviewedCandidate) {
        const presentation = projectPublicWebSearchAnswer(
          reviewedCandidate.answer,
        );
        const publicSources = parseOfficialSourceLinks(
          reviewedCandidate.sources,
        );
        if (presentation && publicSources.length > 0) {
          const legalBasis = reviewedCitationsToLegalBasisSection(
            (reviewedCandidate.citations ?? []).filter(
              (
                citation,
              ): citation is typeof citation & { issuedAt: string } =>
                Boolean(citation.issuedAt),
            ),
          );
          const sections = legalBasis
            ? [...presentation.sections, legalBasis].sort(
                (left, right) =>
                  CHAT_ANSWER_SECTION_KINDS.indexOf(left.kind) -
                  CHAT_ANSWER_SECTION_KINDS.indexOf(right.kind),
              )
            : presentation.sections;
          return complete(
            NextResponse.json({
              answer: presentation.answer,
              sections,
              mode: "knowledge",
              answerOrigin: "reviewed_web" satisfies AnswerOrigin,
              sources: publicSources,
            }),
            "knowledge",
            "knowledge",
            reviewedCandidate.policyVersion,
            { candidateIds: [reviewedCandidate.candidateId] },
          );
        }
      }

      // DEC-010/DEC-011: reserve a global UTC-day token budget before the provider call.
      // A successful result is returned only after its immutable D1 draft is
      // persisted; it still is not reviewed RAG evidence until four-eyes publish.
      const webSearchConfig = readOpenAiWebSearchConfig(env);
      if (!webSearchConfig.enabled) {
        return complete(
          unavailableResponse(),
          "retrieval_no_match",
          "unavailable",
          WEB_SEARCH_POLICY_VERSION,
        );
      }
      const reservation = await reserveWebBudget();
      if (!reservation) {
        return complete(
          unavailableResponse(),
          "dependency_error",
          "unavailable",
          WEB_SEARCH_BUDGET_POLICY_VERSION,
        );
      }
      const searched = await webSearch(
        webSearchConfig,
        question,
      );
      const settled = await settleWebBudget(
        reservation,
        searched.ok
          ? searched.usage.totalTokens
          : searched.usage?.totalTokens ?? reservation.reservedTokens,
      );
      if (!settled) {
        return complete(
          unavailableResponse(),
          "dependency_error",
          "unavailable",
          WEB_SEARCH_BUDGET_POLICY_VERSION,
        );
      }
      if (searched.ok) {
        const publicSources = parseOfficialSourceLinks(searched.sources);
        const publicPresentation = projectPublicWebSearchAnswer(
          searched.answer,
        );
        if (publicSources.length === 0 || !publicPresentation) {
          return complete(
            unavailableResponse(),
            "retrieval_no_match",
            "unavailable",
            WEB_SEARCH_POLICY_VERSION,
            {
              providerOutcome: "invalid_output",
              providerRequestCount: 1,
              providerModel: searched.model,
              providerInputTokens: searched.usage.inputTokens ?? undefined,
              providerOutputTokens: searched.usage.outputTokens ?? undefined,
            },
          );
        }
        const publicResult = {
          ...searched,
          answer: publicPresentation.answer,
          sections: publicPresentation.sections,
          sources: publicSources,
        };
        const candidateId = await persistWebCandidate(
          requestId,
          publicResult,
        );
        if (!candidateId) {
          return complete(
            unavailableResponse(),
            "dependency_error",
            "unavailable",
            WEB_SEARCH_CANDIDATE_POLICY_VERSION,
            {
              providerOutcome: "success",
              providerRequestCount: 1,
              providerModel: searched.model,
              providerInputTokens: searched.usage.inputTokens ?? undefined,
              providerOutputTokens: searched.usage.outputTokens ?? undefined,
            },
          );
        }
        return complete(
          NextResponse.json(
            {
              answer: publicResult.answer,
              sections: publicResult.sections,
              mode: "web_search",
              answerOrigin: "live_web" satisfies AnswerOrigin,
              sourceKind: "official",
              warning: publicResult.warning,
              sources: publicSources,
            },
            {
              headers: {
                "Cache-Control": "no-store",
              },
            },
          ),
          "web_search",
          "web_search",
          WEB_SEARCH_POLICY_VERSION,
          {
            candidateIds: [candidateId],
            providerOutcome: "success",
            providerRequestCount: 1,
            providerModel: searched.model,
            providerInputTokens: searched.usage.inputTokens ?? undefined,
            providerOutputTokens: searched.usage.outputTokens ?? undefined,
          },
        );
      }

      const canUseReferenceFallback =
        searched.code === "MISSING_OFFICIAL_CITATION" ||
        searched.code === "UNVERIFIED_LEGAL_CLAIM";
      if (canUseReferenceFallback) {
        // DEC-012: reference search has its own reservation because it is a
        // second provider request. Its result is live-only and never enters
        // candidate persistence or reviewed RAG.
        const referenceReservation = await reserveWebBudget();
        if (!referenceReservation) {
          return complete(
            unavailableResponse(),
            "dependency_error",
            "unavailable",
            WEB_SEARCH_BUDGET_POLICY_VERSION,
          );
        }
        const referenceResult = await referenceWebSearch(
          webSearchConfig,
          question,
        );
        const referenceSettled = await settleWebBudget(
          referenceReservation,
          referenceResult.ok
            ? referenceResult.usage.totalTokens
            : referenceResult.usage?.totalTokens ??
                referenceReservation.reservedTokens,
        );
        if (!referenceSettled) {
          return complete(
            unavailableResponse(),
            "dependency_error",
            "unavailable",
            WEB_SEARCH_BUDGET_POLICY_VERSION,
          );
        }
        if (referenceResult.ok) {
          const referenceSources = parseReferenceSourceLinks(
            referenceResult.sources,
          );
          const referencePresentation = projectPublicWebSearchAnswer(
            referenceResult.answer,
          );
          if (referenceSources.length > 0 && referencePresentation) {
            return complete(
              NextResponse.json(
                {
                  answer: referencePresentation.answer,
                  sections: referencePresentation.sections,
                  mode: "web_search",
                  answerOrigin: "live_web" satisfies AnswerOrigin,
                  sourceKind: "reference",
                  warning: referenceResult.warning,
                  sources: referenceSources,
                },
                {
                  headers: {
                    "Cache-Control": "no-store",
                  },
                },
              ),
              "web_search",
              "web_search",
              REFERENCE_SEARCH_POLICY_VERSION,
              {
                providerOutcome: "success",
                providerRequestCount: 2,
                providerModel: referenceResult.model,
                providerInputTokens:
                  sumKnownTokenCounts(
                    searched.usage?.inputTokens,
                    referenceResult.usage.inputTokens,
                  ),
                providerOutputTokens:
                  sumKnownTokenCounts(
                    searched.usage?.outputTokens,
                    referenceResult.usage.outputTokens,
                  ),
              },
            );
          }
        }
        return complete(
          unavailableResponse(),
          "retrieval_no_match",
          "unavailable",
          REFERENCE_SEARCH_POLICY_VERSION,
          {
            providerRequestCount: 2,
            providerModel:
              referenceResult.model ?? searched.model,
            providerInputTokens: sumKnownTokenCounts(
              searched.usage?.inputTokens,
              referenceResult.usage?.inputTokens,
            ),
            providerOutputTokens: sumKnownTokenCounts(
              searched.usage?.outputTokens,
              referenceResult.usage?.outputTokens,
            ),
            providerOutcome:
              !referenceResult.ok &&
              referenceResult.code === "PROVIDER_TIMEOUT"
                ? "timeout"
                : !referenceResult.ok &&
                    referenceResult.code === "PROVIDER_REFUSAL"
                  ? "refusal"
                  : !referenceResult.ok &&
                      (referenceResult.code === "INVALID_OUTPUT" ||
                        referenceResult.code === "UNVERIFIED_LEGAL_CLAIM" ||
                        referenceResult.code === "UNTRUSTED_CITATION" ||
                        referenceResult.code === "MISSING_REFERENCE_CITATION")
                    ? "invalid_output"
                    : "error",
          },
        );
      }

      return complete(
        unavailableResponse(),
        "retrieval_no_match",
        "unavailable",
        WEB_SEARCH_POLICY_VERSION,
        {
          providerRequestCount: 1,
          providerOutcome:
            searched.code === "PROVIDER_TIMEOUT"
              ? "timeout"
              : searched.code === "PROVIDER_REFUSAL"
                ? "refusal"
              : searched.code === "INVALID_OUTPUT" ||
                    searched.code === "UNVERIFIED_LEGAL_CLAIM" ||
                    searched.code === "UNTRUSTED_CITATION" ||
                    searched.code === "MISSING_OFFICIAL_CITATION"
                  ? "invalid_output"
                  : "error",
        },
      );
    } catch {
      return complete(unavailableResponse(), "unavailable", "unavailable");
    }
  };
}

export const POST = createChatHandler();
