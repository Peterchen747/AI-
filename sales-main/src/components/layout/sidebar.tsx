import { auth, signOut } from "@/auth";
import { SidebarNav } from "./sidebar-nav";

export async function Sidebar() {
  const session = await auth();

  async function logout() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  return (
    <aside className="w-56 shrink-0 border-r bg-card flex flex-col">
      <div className="p-4 border-b">
        <h1 className="text-lg font-bold">成本計算系統</h1>
        <p className="text-xs text-muted-foreground">管理銷售與入庫成本</p>
      </div>
      <SidebarNav />
      <div className="p-3 border-t space-y-2">
        {session?.user?.email && (
          <div className="text-xs text-muted-foreground truncate">
            {session.user.email}
          </div>
        )}
        <form action={logout}>
          <button
            type="submit"
            className="w-full text-left text-sm px-3 py-2 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            🚪 登出
          </button>
        </form>
        <div className="text-xs text-muted-foreground">NT$ 單位</div>
      </div>
    </aside>
  );
}
