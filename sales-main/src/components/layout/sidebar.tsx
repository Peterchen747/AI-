import { SidebarNav } from "./sidebar-nav";

export async function Sidebar() {
  return (
    <aside className="w-56 shrink-0 border-r bg-card flex flex-col">
      <div className="p-4 border-b">
        <h1 className="text-lg font-bold">成本計算系統</h1>
        <p className="text-xs text-muted-foreground">管理銷售與入庫成本</p>
      </div>
      <SidebarNav />
      <div className="p-3 border-t">
        <div className="text-xs text-muted-foreground">NT$ 單位</div>
      </div>
    </aside>
  );
}
