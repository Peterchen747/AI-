import NextAuth from "next-auth";
import Resend from "next-auth/providers/resend";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/db";
import { ensureSchema } from "@/db/ensure-schema";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/sales",
  "/categories",
  "/inventory",
  "/purchase-batches",
  "/weekly-costs",
  "/alerts",
  "/share",
];

export const { handlers, auth, signIn, signOut } = NextAuth(async () => {
  await ensureSchema();
  return {
    adapter: DrizzleAdapter(db),
    session: { strategy: "database", maxAge: 60 * 60 * 24 * 30 },
    providers: [
      Resend({
        apiKey: process.env.RESEND_API_KEY,
        from: process.env.AUTH_RESEND_FROM ?? "onboarding@resend.dev",
      }),
    ],
    pages: {
      signIn: "/login",
    },
    callbacks: {
      authorized({ auth: session, request }) {
        const { pathname } = request.nextUrl;
        const isProtected = PROTECTED_PREFIXES.some(
          (prefix) => pathname === prefix || pathname.startsWith(prefix + "/")
        );
        if (!isProtected) return true;
        return Boolean(session?.user);
      },
      async session({ session, user }) {
        if (session.user && user?.id) {
          session.user.id = user.id;
        }
        return session;
      },
    },
  };
});
