"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const isPublicShare = pathname?.startsWith("/share/") && pathname.split("/").length >= 3;

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  if (isPublicShare) {
    return <main className="min-h-screen overflow-auto">{children}</main>;
  }

  return (
    <>
      <div className="hidden md:flex md:shrink-0">
        <Sidebar />
      </div>

      {mobileNavOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileNavOpen(false)}
          aria-hidden
        />
      )}
      <div
        className={`fixed inset-y-0 left-0 z-50 md:hidden transform transition-transform duration-200 ease-out ${
          mobileNavOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Sidebar />
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden sticky top-0 z-30 flex items-center gap-3 px-4 h-14 border-b bg-card">
          <button
            type="button"
            onClick={() => setMobileNavOpen(true)}
            aria-label="開啟選單"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border hover:bg-muted"
          >
            <span className="text-xl leading-none">☰</span>
          </button>
          <span className="text-base font-semibold">成本計算系統</span>
        </header>

        <main className="flex-1 overflow-auto">
          <div className="p-4 md:p-6">{children}</div>
        </main>
      </div>
    </>
  );
}
