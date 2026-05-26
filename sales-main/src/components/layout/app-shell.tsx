"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { BottomNav } from "./bottom-nav";

export function AppShell({
  children,
  sidebar,
  isAdmin,
}: {
  children: React.ReactNode;
  sidebar: React.ReactNode;
  isAdmin?: boolean;
}) {
  const pathname = usePathname();
  const isPublicShare = pathname?.startsWith("/share/") && pathname.split("/").length >= 3;
  const isLogin = pathname === "/login";

  useEffect(() => {
    // 路由切換時捲回頂部（手機體驗）
    window.scrollTo(0, 0);
  }, [pathname]);

  if (isPublicShare || isLogin) {
    return <main className="min-h-screen overflow-auto">{children}</main>;
  }

  return (
    <>
      {/* 桌機 Sidebar */}
      <div className="hidden md:flex md:shrink-0">{sidebar}</div>

      <div className="flex-1 flex flex-col min-w-0">
        {/* 手機頂部標題列 */}
        <header className="md:hidden sticky top-0 z-30 flex items-center px-4 h-14 border-b bg-card">
          <span className="text-base font-semibold">AI 財務助手</span>
        </header>

        <main className="flex-1 overflow-auto">
          {/* 手機底部加 padding，避免內容被 BottomNav 蓋住 */}
          <div className="p-4 md:p-6 pb-24 md:pb-6">{children}</div>
        </main>
      </div>

      {/* 手機底部導覽列 */}
      <BottomNav isAdmin={isAdmin} />
    </>
  );
}
