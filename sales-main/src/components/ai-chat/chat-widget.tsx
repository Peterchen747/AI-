"use client";

import { useState, useRef, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";

type Message = {
  role: "user" | "assistant";
  content: string;
};

const STORAGE_KEY = "ai-chat-widget-pos";
const BUTTON_SIZE = 56; // h-14 w-14
const MARGIN = 16;

function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val));
}

function loadPos(): { x: number; y: number } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (typeof p.x === "number" && typeof p.y === "number") return p;
  } catch {}
  return null;
}

function defaultPos() {
  return {
    x: window.innerWidth - BUTTON_SIZE - MARGIN,
    y: window.innerHeight - BUTTON_SIZE - MARGIN - 64, // above bottom-nav
  };
}

function ChatWidgetInner() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);
  const dragState = useRef<{
    startPointerX: number;
    startPointerY: number;
    startPosX: number;
    startPosY: number;
    moved: boolean;
  } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // 初始化位置
  useEffect(() => {
    const saved = loadPos();
    setPos(saved ?? defaultPos());
  }, []);

  // URL param 觸發預填問題
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

  // 視窗大小改變時把按鈕夾回範圍內
  useEffect(() => {
    function onResize() {
      setPos((p) => {
        if (!p) return p;
        const maxX = window.innerWidth - BUTTON_SIZE - MARGIN;
        const maxY = window.innerHeight - BUTTON_SIZE - MARGIN;
        return { x: clamp(p.x, MARGIN, maxX), y: clamp(p.y, MARGIN, maxY) };
      });
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const handleClose = useCallback(() => {
    readerRef.current?.cancel();
    setIsStreaming(false);
    setIsOpen(false);
  }, []);

  // 拖移開始
  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      if (!pos) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      dragState.current = {
        startPointerX: e.clientX,
        startPointerY: e.clientY,
        startPosX: pos.x,
        startPosY: pos.y,
        moved: false,
      };
      setIsDragging(false);
    },
    [pos]
  );

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    const ds = dragState.current;
    if (!ds) return;

    const dx = e.clientX - ds.startPointerX;
    const dy = e.clientY - ds.startPointerY;

    if (!ds.moved && Math.abs(dx) < 5 && Math.abs(dy) < 5) return;
    ds.moved = true;
    setIsDragging(true);

    const maxX = window.innerWidth - BUTTON_SIZE - MARGIN;
    const maxY = window.innerHeight - BUTTON_SIZE - MARGIN;
    setPos({
      x: clamp(ds.startPosX + dx, MARGIN, maxX),
      y: clamp(ds.startPosY + dy, MARGIN, maxY),
    });
  }, []);

  const handlePointerUp = useCallback(() => {
    const ds = dragState.current;
    dragState.current = null;

    if (!ds) return;

    if (!ds.moved) {
      // 當作一般點擊
      setIsOpen((v) => !v);
    } else {
      // 拖移結束：存位置
      setPos((p) => {
        if (p) localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
        return p;
      });
    }
    setIsDragging(false);
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

  if (!pos) return null;

  // 計算對話框位置：優先在按鈕上方，若空間不足就在下方
  const panelWidth = 320;
  const panelHeight = 520;
  const spaceAbove = pos.y;
  const panelTop = spaceAbove >= panelHeight + 8
    ? pos.y - panelHeight - 8
    : pos.y + BUTTON_SIZE + 8;
  const panelLeft = clamp(pos.x - panelWidth + BUTTON_SIZE, MARGIN, window.innerWidth - panelWidth - MARGIN);

  return (
    <>
      {/* 對話框 */}
      {isOpen && (
        <div
          className="fixed z-50 flex flex-col rounded-2xl border bg-background shadow-2xl overflow-hidden"
          style={{
            width: panelWidth,
            height: panelHeight,
            left: panelLeft,
            top: panelTop,
          }}
        >
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

      {/* 可拖移浮動按鈕 */}
      <button
        ref={buttonRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        aria-label={isOpen ? "收合 AI 財務顧問" : "開啟 AI 財務顧問"}
        className="fixed z-50 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center text-2xl hover:bg-primary/90 active:scale-95 transition-transform select-none"
        style={{
          left: pos.x,
          top: pos.y,
          cursor: isDragging ? "grabbing" : "grab",
          userSelect: "none",
        }}
      >
        {isOpen ? "✕" : "🤖"}
      </button>
    </>
  );
}

export function ChatWidget() {
  return (
    <Suspense>
      <ChatWidgetInner />
    </Suspense>
  );
}
