"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";

const moreItems = [
  { href: "/sales", label: "銷售紀錄", icon: "🧾" },
  { href: "/weekly-costs", label: "每週成本", icon: "💰" },
  { href: "/purchase-batches", label: "進貨批次", icon: "📋" },
  { href: "/categories", label: "商品分類", icon: "🗂️" },
  { href: "/share", label: "分享頁面", icon: "🔗" },
];

export function BottomNav({ isAdmin }: { isAdmin?: boolean }) {
  const pathname = usePathname();
  const [alertCount, setAlertCount] = useState(0);
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    fetch("/api/alerts")
      .then((r) => r.json())
      .then((data) => setAlertCount(Array.isArray(data) ? data.length : 0))
      .catch(() => {});
  }, []);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  return (
    <>
      <nav className="fixed bottom-0 inset-x-0 z-40 md:hidden bg-card border-t pb-safe">
        <div className="flex items-end h-16">
          {/* 儀表板 */}
          <Link
            href="/dashboard"
            className={cn(
              "flex-1 flex flex-col items-center justify-center h-full gap-0.5",
              isActive("/dashboard") ? "text-primary" : "text-muted-foreground"
            )}
          >
            <span className="text-2xl leading-none">📊</span>
            <span className="text-[10px]">儀表板</span>
          </Link>

          {/* 庫存 */}
          <Link
            href="/inventory"
            className={cn(
              "flex-1 flex flex-col items-center justify-center h-full gap-0.5",
              isActive("/inventory") ? "text-primary" : "text-muted-foreground"
            )}
          >
            <span className="text-2xl leading-none">📦</span>
            <span className="text-[10px]">庫存</span>
          </Link>

          {/* ＋ 新增銷售（中央大按鈕） */}
          <Link
            href="/sales/new"
            className="flex-1 flex flex-col items-center justify-center h-full"
            aria-label="新增銷售"
          >
            <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center shadow-lg -mt-5 border-4 border-card">
              <span className="text-3xl text-primary-foreground font-light leading-none select-none">＋</span>
            </div>
          </Link>

          {/* 警示 */}
          <Link
            href="/alerts"
            className={cn(
              "flex-1 flex flex-col items-center justify-center h-full gap-0.5 relative",
              isActive("/alerts") ? "text-primary" : "text-muted-foreground"
            )}
          >
            <span className="text-2xl leading-none">🔔</span>
            {alertCount > 0 && (
              <span className="absolute top-2 right-[calc(50%-20px)] min-w-[16px] h-4 px-1 bg-red-500 text-white text-[10px] font-semibold rounded-full flex items-center justify-center leading-none">
                {alertCount > 9 ? "9+" : alertCount}
              </span>
            )}
            <span className="text-[10px]">警示</span>
          </Link>

          {/* 更多 */}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className="flex-1 flex flex-col items-center justify-center h-full gap-0.5 text-muted-foreground"
          >
            <span className="text-2xl leading-none">☰</span>
            <span className="text-[10px]">更多</span>
          </button>
        </div>
      </nav>

      {/* 更多 Drawer */}
      {moreOpen && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/50 md:hidden"
            onClick={() => setMoreOpen(false)}
            aria-hidden
          />
          <div className="fixed bottom-0 inset-x-0 z-50 md:hidden bg-card rounded-t-2xl shadow-xl animate-in slide-in-from-bottom duration-200">
            <div className="w-10 h-1 bg-muted rounded-full mx-auto mt-3 mb-2" />
            <div className="px-4 pb-8 space-y-1 max-h-[70vh] overflow-y-auto">
              {moreItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMoreOpen(false)}
                  className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-base hover:bg-muted active:bg-muted/70 transition-colors"
                >
                  <span className="text-xl w-7 text-center">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              ))}
              {isAdmin && (
                <Link
                  href="/admin"
                  onClick={() => setMoreOpen(false)}
                  className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-base hover:bg-muted active:bg-muted/70 transition-colors"
                >
                  <span className="text-xl w-7 text-center">👤</span>
                  <span>使用者管理</span>
                </Link>
              )}
              <div className="border-t my-2" />
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-base text-red-500 hover:bg-red-50 active:bg-red-100 transition-colors"
              >
                <span className="text-xl w-7 text-center">🚪</span>
                <span>登出</span>
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
