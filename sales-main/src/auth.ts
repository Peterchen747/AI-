import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ensureSchema } from "@/db/ensure-schema";
import bcrypt from "bcryptjs";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/sales",
  "/categories",
  "/inventory",
  "/purchase-batches",
  "/weekly-costs",
  "/alerts",
  "/share",
  "/admin",
];

export const { handlers, auth, signIn, signOut } = NextAuth(async () => {
  await ensureSchema();
  return {
    adapter: DrizzleAdapter(db),
    session: { strategy: "database", maxAge: 60 * 60 * 24 * 30 },
    providers: [
      Credentials({
        credentials: {
          email: { label: "Email", type: "email" },
          password: { label: "Password", type: "password" },
        },
        async authorize(credentials) {
          if (!credentials?.email || !credentials?.password) return null;
          const [user] = await db
            .select()
            .from(users)
            .where(eq(users.email, String(credentials.email)))
            .limit(1);
          if (!user?.password) return null;
          const valid = await bcrypt.compare(
            String(credentials.password),
            user.password
          );
          if (!valid) return null;
          return { id: user.id, name: user.name, email: user.email };
        },
      }),
    ],
    pages: {
      signIn: "/login",
    },
    callbacks: {
      authorized({ auth: session, request }) {
        const { pathname } = request.nextUrl;
        if (pathname === "/login") return true;
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
