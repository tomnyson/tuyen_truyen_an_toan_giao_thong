import { NextResponse } from "next/server";
import { findCuratedAnswer, findManagedAnswer } from "@/lib/legal-chat";

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

    // DEC-002: AI may only rephrase an evidence bundle returned by retrieval.
    // The current API has no evidence-bound composition/validation yet, so an
    // unmatched question must fail closed even when provider credentials exist.
    return unavailableResponse();
  } catch {
    return unavailableResponse();
  }
}
