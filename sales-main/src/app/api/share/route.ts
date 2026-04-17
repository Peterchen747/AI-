import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/db";
import { and, desc, eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { auth } from "@/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const rows = await db
    .select()
    .from(schema.shareTokens)
    .where(eq(schema.shareTokens.userId, userId))
    .orderBy(desc(schema.shareTokens.createdAt));
  return NextResponse.json(rows);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const body = await request.json();
  const label = (body?.label ?? "").toString().trim() || null;
  const token = uuidv4();
  const [row] = await db
    .insert(schema.shareTokens)
    .values({ userId, token, label })
    .returning();
  return NextResponse.json(row);
}

export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const { searchParams } = new URL(request.url);
  const id = Number(searchParams.get("id"));
  if (!id || isNaN(id) || id <= 0) {
    return NextResponse.json({ error: "id 必須是正整數" }, { status: 400 });
  }
  const deleted = await db
    .delete(schema.shareTokens)
    .where(and(eq(schema.shareTokens.id, id), eq(schema.shareTokens.userId, userId)))
    .returning();
  if (deleted.length === 0) {
    return NextResponse.json({ error: "找不到該分享連結" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
