"use client";

import { useState, useRef, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";

type Message = {
  role: "user" | "assistant";
  content: string;
};

function ChatWidgetInner() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // URL param 觸發預填問題（由警示頁「詢問 AI」按鈕帶入）
  useEffect(() => {
    const question = searchParams.get("ai-question");
    if (question) {
      setIsOpen(true);
      setInput(decodeURIComponent(question));
      router.replace(pathname, { scroll: false });
    }
  }, [searchParams, pathname, router]);

  // 自動捲到最新訊息
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 關閉時取消進行中的串流
  const handleClose = useCallback(() => {
    readerRef.current?.cancel();
    setIsStreaming(false);
    setIsOpen(false);
  }, []);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || isStreaming) return;

    const userMessage: Message = { role: "user", content: input.trim() };
    const newMessages = [...messages, userMessage];
    setMessages([...newMessages, { role: "assistant", content: "" }]);
    setInput("");
    setIsStreaming(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: "連線失敗" }));
        throw new Error(err.error ?? "連線失敗");
      }
      if (!response.body) throw new Error("無法讀取串流");

      const reader = response.body.getReader();
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
                const text: string = parsed.delta.text ?? "";
                if (text) {
                  setMessages((prev) => {
                    const updated = [...prev];
                    updated[updated.length - 1] = {
                      role: "assistant",
                      content: updated[updated.length - 1].content + text,
                    };
                    return updated;
                  });
                }
              }
            } catch {
              // 非 JSON 事件行，略過
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
    } finally {
      setIsStreaming(false);
      readerRef.current = null;
    }
  }, [input, messages, isStreaming]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
      {isOpen && (
        <div className="flex flex-col w-80 h-[520px] rounded-2xl border bg-background shadow-2xl overflow-hidden">
          {/* 標頭 */}
          <div className="flex items-center justify-between px-4 py-3 bg-primary text-primary-foreground shrink-0">
            <div>
              <p className="font-semibold text-sm">AI 財務顧問</p>
              <p className="text-xs opacity-75">根據您的真實資料回答</p>
            </div>
            <button
              onClick={handleClose}
              aria-label="關閉"
              className="p-1 rounded-full hover:bg-white/20 transition-colors text-lg leading-none"
            >
              ✕
            </button>
          </div>

          {/* 訊息列表 */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <div className="text-center text-muted-foreground text-sm py-8">
                <p className="text-2xl mb-2">🤖</p>
                <p>您好！我是您的 AI 財務顧問</p>
                <p className="mt-1 text-xs">
                  可以問我本月淨利、廣告費分析<br />或任何警示的原因
                </p>
              </div>
            )}
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-tr-sm"
                      : "bg-muted text-foreground rounded-tl-sm"
                  }`}
                >
                  {msg.content ||
                    (isStreaming && i === messages.length - 1 ? (
                      <span className="opacity-60">思考中...</span>
                    ) : (
                      ""
                    ))}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* 輸入區 */}
          <div className="p-3 border-t shrink-0">
            <div className="flex gap-2 items-end">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="輸入問題… (Enter 送出)"
                disabled={isStreaming}
                rows={1}
                className="flex-1 resize-none text-sm rounded-lg border border-input bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring min-h-[36px] max-h-24 disabled:opacity-50"
                style={{ fieldSizing: "content" } as React.CSSProperties}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || isStreaming}
                aria-label="送出"
                className="shrink-0 h-9 w-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                ↑
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 浮動按鈕 */}
      <button
        onClick={() => setIsOpen((v) => !v)}
        aria-label={isOpen ? "收合 AI 財務顧問" : "開啟 AI 財務顧問"}
        className="h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center text-2xl hover:bg-primary/90 transition-colors"
      >
        {isOpen ? "✕" : "🤖"}
      </button>
    </div>
  );
}

export function ChatWidget() {
  return (
    <Suspense>
      <ChatWidgetInner />
    </Suspense>
  );
}
