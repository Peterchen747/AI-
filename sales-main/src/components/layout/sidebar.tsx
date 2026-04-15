"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "儀表板", icon: "📊" },
  { href: "/categories", label: "商品分類", icon: "🗂️" },
  { href: "/inventory", label: "入庫存紀錄", icon: "📦" },
  { href: "/purchase-batches", label: "進貨管理", icon: "📦" },
  { href: "/sales", label: "銷售紀錄", icon: "🧾" },
  { href: "/sales/new?tab=batch", label: "批次建單", icon: "🖼️" },
  { href: "/share", label: "分享", icon: "🔗" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 shrink-0 border-r bg-card flex flex-col">
      <div className="p-4 border-b">
        <h1 className="text-lg font-bold">成本計算系統</h1>
        <p className="text-xs text-muted-foreground">管理銷售與入庫成本</p>
      </div>
      <nav className="flex-1 p-2 space-y-1">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t text-xs text-muted-foreground">NT$ 單位</div>
    </aside>
  );
}
