import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { ensureSchema } from "@/db/ensure-schema";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.email) return null;
  if (session.user.email !== process.env.ADMIN_EMAIL) return null;
  return session;
}

export async function GET() {
  await ensureSchema();
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const allUsers = await db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .orderBy(users.email);
  return NextResponse.json(allUsers);
}

export async function POST(request: NextRequest) {
  await ensureSchema();
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { name, email, password } = await request.json();
  if (!email || !password) {
    return NextResponse.json({ error: "email and password required" }, { status: 400 });
  }
  const hash = await bcrypt.hash(String(password), 12);
  try {
    const [user] = await db
      .insert(users)
      .values({ name: name || null, email: String(email), password: hash })
      .returning({ id: users.id, name: users.name, email: users.email });
    return NextResponse.json(user);
  } catch {
    return NextResponse.json({ error: "Email 已被使用" }, { status: 409 });
  }
}

export async function DELETE(request: NextRequest) {
  await ensureSchema();
  const adminSession = await requireAdmin();
  if (!adminSession) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const [self] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, adminSession.user.email!))
    .limit(1);
  if (self?.id === id) {
    return NextResponse.json({ error: "Cannot delete own account" }, { status: 400 });
  }

  await db.delete(users).where(eq(users.id, id));
  return NextResponse.json({ ok: true });
}
