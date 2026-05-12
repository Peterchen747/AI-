"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const schema = z.object({
  name: z.string().optional(),
  email: z.string().email("請輸入有效的 Email"),
  password: z.string().min(6, "密碼至少 6 個字元"),
});
type FormValues = z.infer<typeof schema>;

type User = { id: string; name: string | null; email: string | null };

export function AdminUserList({ users: initial }: { users: User[] }) {
  const [users, setUsers] = useState<User[]>(initial);
  const [deleting, setDeleting] = useState<string | null>(null);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } =
    useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onCreate(data: FormValues) {
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      toast.error(err.error ?? "建立失敗");
      return;
    }
    const newUser = await res.json();
    setUsers((prev) => [...prev, newUser]);
    reset();
    toast.success(`帳號 ${newUser.email} 建立成功`);
  }

  async function onDelete(id: string, email: string | null) {
    if (!confirm(`確定要刪除 ${email} 嗎？`)) return;
    setDeleting(id);
    const res = await fetch(`/api/admin/users?id=${id}`, { method: "DELETE" });
    setDeleting(null);
    if (!res.ok) {
      const err = await res.json();
      toast.error(err.error ?? "刪除失敗");
      return;
    }
    setUsers((prev) => prev.filter((u) => u.id !== id));
    toast.success("帳號已刪除");
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>新增使用者</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onCreate)} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
            <div className="space-y-1">
              <Label>姓名（選填）</Label>
              <Input {...register("name")} placeholder="王小明" />
            </div>
            <div className="space-y-1">
              <Label>電子郵件</Label>
              <Input {...register("email")} type="email" placeholder="user@example.com" />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>密碼</Label>
              <Input {...register("password")} type="password" placeholder="至少 6 字元" />
              {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
            </div>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "建立中..." : "建立帳號"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>使用者列表（{users.length} 人）</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>姓名</TableHead>
                <TableHead>電子郵件</TableHead>
                <TableHead className="w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>{u.name ?? "—"}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={deleting === u.id}
                      onClick={() => onDelete(u.id, u.email)}
                    >
                      刪除
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">
                    尚無使用者
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
