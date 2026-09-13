import { NextResponse } from "next/server";
import { processInterviewMessage } from "@/lib/legal-aid-interview";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { message, history = [] } = body;
    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Missing message" }, { status: 400 });
    }

    const result = processInterviewMessage(message, history);
    return NextResponse.json(result);
  } catch (_err) {
    return NextResponse.json({ error: "Interview processing failed" }, { status: 500 });
  }
}
