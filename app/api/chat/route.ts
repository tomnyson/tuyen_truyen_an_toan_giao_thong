import { NextResponse } from "next/server";
import { findCuratedAnswer, findManagedAnswer, legalContext } from "@/lib/legal-chat";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const unavailableAnswer =
  "Câu hỏi này chưa có trong dữ liệu của cổng và dịch vụ AI đang tạm thời chưa thể truy cập. Bạn hãy thử lại sau. Với vụ việc thực tế, nên trao đổi cùng phụ huynh, giáo viên hoặc người có chuyên môn pháp lý.";

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

async function requestGatewayAnswer(
  messages: ChatMessage[],
  token: string,
): Promise<string | null> {
  const response = await fetch(
    "https://ai-gateway.vercel.sh/v1/chat/completions",
    {
      method: "POST",
      signal: AbortSignal.timeout(15_000),
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.AI_GATEWAY_MODEL ?? "openai/gpt-5.4-mini",
        messages: [{ role: "system", content: legalContext }, ...messages],
        max_completion_tokens: 500,
      }),
    },
  );

  if (!response.ok) return null;

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return data.choices?.[0]?.message?.content?.trim() || null;
}

async function requestOpenAiAnswer(
  messages: ChatMessage[],
  apiKey: string,
): Promise<string | null> {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    signal: AbortSignal.timeout(15_000),
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? "gpt-5.4-mini",
      instructions: legalContext,
      input: messages,
      reasoning: { effort: "low" },
      max_output_tokens: 500,
      store: false,
    }),
  });

  if (!response.ok) return null;

  const data = (await response.json()) as {
    output_text?: string;
    output?: Array<{ content?: Array<{ type?: string; text?: string }> }>;
  };
  const output =
    data.output_text ??
    data.output
      ?.flatMap((item) => item.content ?? [])
      .find((content) => content.type === "output_text")?.text;

  return output?.trim() || null;
}

function unavailableResponse() {
  return NextResponse.json({
    answer: unavailableAnswer,
    mode: "unavailable",
  });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { messages?: unknown };
    const messages = sanitizeMessages(body.messages);
    const question = messages.findLast(
      (message) => message.role === "user",
    )?.content.trim();

    if (!question) {
      return NextResponse.json(
        { error: "Bạn hãy nhập một câu hỏi trước nhé." },
        { status: 400 },
      );
    }

    const knowledgeAnswer = (await findManagedAnswer(question)) ?? findCuratedAnswer(question);
    if (knowledgeAnswer) {
      return NextResponse.json({ answer: knowledgeAnswer, mode: "knowledge" });
    }

    const openAiKey = process.env.OPENAI_API_KEY;
    const gatewayToken =
      process.env.AI_GATEWAY_API_KEY ??
      process.env.VERCEL_OIDC_TOKEN ??
      request.headers.get("x-vercel-oidc-token");

    const answer = openAiKey
      ? await requestOpenAiAnswer(messages, openAiKey)
      : gatewayToken
        ? await requestGatewayAnswer(messages, gatewayToken)
        : null;

    return answer
      ? NextResponse.json({ answer, mode: "ai" })
      : unavailableResponse();
  } catch {
    return unavailableResponse();
  }
}
