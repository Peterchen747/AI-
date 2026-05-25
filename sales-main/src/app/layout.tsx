import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import { Sidebar } from "@/components/layout/sidebar";
import { ChatWidget } from "@/components/ai-chat/chat-widget";
import { PwaRegister } from "@/components/pwa-register";
import { auth } from "@/auth";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AI 財務助手",
  description: "銷售收入與成本追蹤，計算真實淨利",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "財務助手",
  },
  icons: {
    apple: "/icons/icon-192.png",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();
  const isAdmin = session?.user?.email === process.env.ADMIN_EMAIL;

  return (
    <html
      lang="zh-TW"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <meta name="theme-color" content="#6366f1" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </head>
      <body className="h-full flex">
        {session?.user ? (
          <>
            <AppShell sidebar={<Sidebar isAdmin={isAdmin} />}>{children}</AppShell>
            <ChatWidget />
          </>
        ) : (
          <main className="flex-1">{children}</main>
        )}
        <PwaRegister />
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
