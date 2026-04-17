"use client";

import { useEffect, useState } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type State = "idle" | "loading" | "sent" | "error";

export function LoginForm({ callbackUrl }: { callbackUrl: string }) {
  const [state, setState] = useState<State>("idle");
  const [email, setEmail] = useState("");
  const { data: session, update } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (state !== "sent") return;
    const id = setInterval(() => update(), 3000);
    return () => clearInterval(id);
  }, [state, update]);

  useEffect(() => {
    if (state === "sent" && session?.user) {
      router.push(callbackUrl);
    }
  }, [session, state, callbackUrl, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setState("loading");
    const result = await signIn("resend", { email, redirect: false, callbackUrl });
    if (result?.error) {
      setState("error");
    } else {
      setState("sent");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-sm">
        {state === "sent" ? (
          <>
            <CardHeader>
              <CardTitle>📬 請去信箱點擊連結</CardTitle>
              <CardDescription>
                登入連結已寄到 <strong>{email}</strong>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                點擊信件中的連結即可登入，連結 10 分鐘內有效。
              </p>
              <p className="text-sm text-muted-foreground">
                點擊連結後，此頁面會自動跳轉，不需要切換視窗。
              </p>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setState("idle")}
              >
                重新輸入 Email
              </Button>
            </CardContent>
          </>
        ) : (
          <>
            <CardHeader>
              <CardTitle>登入</CardTitle>
              <CardDescription>
                輸入 Email，系統會寄出登入連結到你的信箱
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="you@example.com"
                    className="h-11"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={state === "loading"}
                  />
                </div>
                {state === "error" && (
                  <p className="text-sm text-destructive">
                    寄送失敗，請稍後再試。
                  </p>
                )}
                <Button
                  type="submit"
                  className="w-full h-11"
                  disabled={state === "loading"}
                >
                  {state === "loading" ? "寄送中…" : "寄送登入連結"}
                </Button>
              </form>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
}
