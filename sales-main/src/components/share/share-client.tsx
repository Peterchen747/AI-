"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Token = {
  id: number;
  token: string;
  label: string | null;
  createdAt: string;
};

export function ShareClient({ tokens }: { tokens: Token[] }) {
  const router = useRouter();
  const [label, setLabel] = useState("");
  const [creating, setCreating] = useState(false);

  async function createToken() {
    setCreating(true);
    const res = await fetch("/api/share", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label }),
    });
    setCreating(false);
    if (res.ok) {
      toast.success("已建立分享連結");
      setLabel("");
      router.refresh();
    }
  }

  async function remove(id: number) {
    if (!confirm("確定撤銷此分享連結？")) return;
    const res = await fetch(`/api/share?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("已撤銷");
      router.refresh();
    }
  }

  function copyLink(token: string) {
    const url = `${window.location.origin}/share/${token}`;
    navigator.clipboard.writeText(url);
    toast.success("連結已複製");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">分享連結</h1>
        <p className="text-sm text-muted-foreground mt-1">
          建立只讀連結給投資人查看儀表板，不需登入即可開啟
        </p>
      </div>

      <div className="flex items-end gap-2 max-w-xl">
        <div className="flex-1">
          <Label htmlFor="label">備註（選填）</Label>
          <Input
            id="label"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="例如：投資人王先生"
          />
        </div>
        <Button onClick={createToken} disabled={creating}>
          {creating ? "建立中..." : "+ 建立連結"}
        </Button>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>備註</TableHead>
              <TableHead>連結</TableHead>
              <TableHead>建立時間</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tokens.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="text-center text-muted-foreground py-8"
                >
                  還沒有任何分享連結
                </TableCell>
              </TableRow>
            )}
            {tokens.map((t) => (
              <TableRow key={t.id}>
                <TableCell>{t.label || "—"}</TableCell>
                <TableCell className="font-mono text-xs">
                  /share/{t.token.slice(0, 8)}...
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {new Date(t.createdAt).toLocaleString("zh-TW")}
                </TableCell>
                <TableCell className="text-right space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyLink(t.token)}
                  >
                    複製連結
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => remove(t.id)}
                  >
                    撤銷
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
