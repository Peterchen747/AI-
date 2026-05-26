"use client";

import { useRouter } from "next/navigation";

const actions = [
  {
    label: "單筆銷售",
    hint: "一筆一筆輸入",
    href: "/sales/new",
    emoji: "🧾",
  },
  {
    label: "批次銷售",
    hint: "數字鍵盤連續輸入多筆",
    href: "/sales/batch",
    emoji: "📋",
  },
  {
    label: "問 AI",
    hint: "用自然語言問生意問題",
    href: "/ai",
    emoji: "🤖",
  },
  {
    label: "新增入庫",
    hint: "進貨建檔",
    href: "/inventory",
    emoji: "📦",
  },
];

export function PlusSheet({ onClose }: { onClose: () => void }) {
  const router = useRouter();

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/40 md:hidden"
        onClick={onClose}
        aria-hidden
      />
      <div
        className="fixed bottom-0 inset-x-0 z-50 md:hidden bg-card rounded-t-2xl shadow-xl pb-safe animate-in slide-in-from-bottom duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-9 h-1 bg-muted rounded-full mx-auto mt-3 mb-1" />
        <p className="px-5 py-2 text-sm font-bold">新增…</p>
        {actions.map((action) => (
          <button
            key={action.href}
            type="button"
            onClick={() => {
              router.push(action.href);
              onClose();
            }}
            className="w-full flex items-center gap-4 px-5 py-4 border-t border-border text-left active:bg-muted/60 transition-colors"
          >
            <span className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-xl shrink-0">
              {action.emoji}
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold">{action.label}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{action.hint}</div>
            </div>
            <span className="text-muted-foreground text-sm">›</span>
          </button>
        ))}
        <div className="h-4" />
      </div>
    </>
  );
}
