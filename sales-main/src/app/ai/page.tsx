"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type Message = {
  role: "user" | "assistant";
  content: string;
};

const QUICK_QUESTIONS = [
  "這週賣最好的是？",
  "為什麼利潤降低？",
  "哪些商品該補貨？",
  "預測下月營收",
];

export default function AiPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(
    async (text?: string) => {
      const content = (text ?? input).trim();
      if (!content || isStreaming) return;

      const userMsg: Message = { role: "user", content };
      const history = [...messages, userMsg];
      setMessages([...history, { role: "assistant", content: "" }]);
      setInput("");
      setIsStreaming(true);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: history }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: "連線失敗" }));
          throw new Error(err.error ?? "連線失敗");
        }
        if (!res.body) throw new Error("無法讀取串流");

        const reader = res.body.getReader();
        readerRef.current = reader;
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const events = buffer.split("\n\n");
          buffer = events.pop() ?? "";

          for (const event of events) {
            for (const line of event.split("\n")) {
              if (!line.startsWith("data: ")) continue;
              const data = line.slice(6);
              if (data === "[DONE]") continue;
              try {
                const parsed = JSON.parse(data);
                if (
                  parsed.type === "content_block_delta" &&
                  parsed.delta?.type === "text_delta"
                ) {
                  const chunk: string = parsed.delta.text ?? "";
                  if (chunk) {
                    setMessages((prev) => {
                      const updated = [...prev];
                      updated[updated.length - 1] = {
                        role: "assistant",
                        content: updated[updated.length - 1].content + chunk,
                      };
                      return updated;
                    });
                  }
                }
              } catch {
                // 非 JSON 事件，略過
              }
            }
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "AI 暫時無法使用";
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: "assistant", content: msg };
          return updated;
        });
        toast.error(msg);
      } finally {
        setIsStreaming(false);
        readerRef.current = null;
      }
    },
    [input, messages, isStreaming]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100dvh-56px-64px)] md:h-auto md:min-h-0">
      {/* 標題列（手機內嵌在 app-shell header 下方，桌機自有空間） */}
      <div className="hidden md:flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">AI 財務顧問</h1>
          <p className="text-sm text-muted-foreground">根據您的真實資料回答</p>
        </div>
      </div>

      {/* 手機版返回按鈕列 */}
      <div className="md:hidden flex items-center gap-2 mb-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground"
          aria-label="返回"
        >
          ‹
        </button>
        <span className="font-semibold text-sm">AI 財務顧問</span>
        <span className="ml-auto text-xs text-emerald-600 font-medium">● 已連結資料</span>
      </div>

      {/* 訊息區 */}
      <div className="flex-1 overflow-y-auto space-y-3 pb-2">
        {messages.length === 0 && (
          <div className="py-8 text-center text-muted-foreground">
            <p className="text-4xl mb-3">🤖</p>
            <p className="font-medium">您好！我是您的 AI 財務顧問</p>
            <p className="text-sm mt-1">可以問我本月淨利、廣告費分析，或任何警示的原因</p>
            <div className="mt-5 grid grid-cols-1 gap-2 max-w-xs mx-auto">
              {QUICK_QUESTIONS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => sendMessage(q)}
                  disabled={isStreaming}
                  className="text-left px-4 py-3 rounded-xl border bg-card text-sm hover:bg-muted active:bg-muted/70 transition-colors disabled:opacity-50"
                >
                  ✦ {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.role === "assistant" && (
              <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-xs text-primary-foreground shrink-0 mr-2 mt-1">
                AI
              </div>
            )}
            <div
              className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-sm whitespace-pre-wrap ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground rounded-tr-sm"
                  : "bg-muted text-foreground rounded-tl-sm"
              }`}
            >
              {msg.content ||
                (isStreaming && i === messages.length - 1 ? (
                  <span className="opacity-50 animate-pulse">思考中…</span>
                ) : (
                  ""
                ))}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* 輸入區 */}
      <div className="border-t pt-3 shrink-0">
        <div className="flex gap-2 items-end">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="輸入問題… (Enter 送出)"
            disabled={isStreaming}
            rows={1}
            className="flex-1 resize-none text-sm rounded-xl border border-input bg-background px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-ring min-h-[40px] max-h-28 disabled:opacity-50"
            style={{ fieldSizing: "content" } as React.CSSProperties}
          />
          <button
            type="button"
            onClick={() => sendMessage()}
            disabled={!input.trim() || isStreaming}
            aria-label="送出"
            className="shrink-0 h-10 w-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            ↑
          </button>
        </div>
      </div>
    </div>
  );
}
