import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { users } from "@/db/schema";
import { AdminUserList } from "@/components/admin/user-list";

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");
  if (session.user.email !== process.env.ADMIN_EMAIL) redirect("/dashboard");

  const allUsers = await db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .orderBy(users.email);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">使用者管理</h1>
        <p className="text-sm text-muted-foreground">新增或刪除客戶帳號</p>
      </div>
      <AdminUserList users={allUsers} />
    </div>
  );
}
