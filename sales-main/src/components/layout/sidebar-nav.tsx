"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "儀表板", icon: "📊" },
  { href: "/categories", label: "商品分類", icon: "🗂️" },
  { href: "/inventory", label: "進貨 / 庫存", icon: "📦" },
  { href: "/sales", label: "銷售紀錄", icon: "🧾" },
  { href: "/weekly-costs", label: "每月成本", icon: "💰" },
  { href: "/alerts", label: "警示中心", icon: "🚨" },
  { href: "/share", label: "分享", icon: "🔗" },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
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
  );
}
