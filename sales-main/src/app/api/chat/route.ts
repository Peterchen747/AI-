import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@/auth";
import { ensureSchema } from "@/db/ensure-schema";
import { buildFinancialContext } from "@/lib/ai-context";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export async function POST(request: NextRequest) {
  await ensureSchema();

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "AI 服務未設定" }, { status: 503 });
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  let body: { messages: ChatMessage[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "無效的請求格式" }, { status: 400 });
  }

  const { messages } = body;
  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "messages 不可為空" }, { status: 400 });
  }

  const recentMessages = messages.slice(-20);

  try {
    const systemPrompt = await buildFinancialContext(userId);

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const stream = await anthropic.messages.stream({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system: systemPrompt,
      messages: recentMessages,
    });

    return new Response(stream.toReadableStream(), {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    console.error("[chat] error:", err);
    return NextResponse.json({ error: "AI 暫時無法使用，請稍後再試" }, { status: 503 });
  }
}
