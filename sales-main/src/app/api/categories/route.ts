import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/db";
import { and, desc, eq, sql } from "drizzle-orm";
import { auth } from "@/auth";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const { searchParams } = new URL(request.url);
  const includeArchived = searchParams.get("includeArchived") === "1";
  const onlyActive = searchParams.get("active") === "1";

  const rows = await db
    .select()
    .from(schema.categories)
    .where(eq(schema.categories.userId, userId))
    .orderBy(desc(schema.categories.createdAt));

  let filtered = rows;
  if (onlyActive) filtered = rows.filter((r) => r.isActive === 1);
  else if (!includeArchived) filtered = rows.filter((r) => r.isActive === 1);
  return NextResponse.json(filtered);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "無效的 JSON 格式" }, { status: 400 });
  }
  const { name, description } = body;

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "名稱必填" }, { status: 400 });
  }
  if (name.trim().length > 100) {
    return NextResponse.json({ error: "名稱最多 100 字" }, { status: 400 });
  }

  const [row] = await db
    .insert(schema.categories)
    .values({
      userId,
      name: name.trim(),
      description: description ? String(description).slice(0, 500) : null,
    })
    .returning();

  return NextResponse.json(row);
}

export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "無效的 JSON 格式" }, { status: 400 });
  }
  const { id, name, description, isActive } = body;

  if (!id || isNaN(Number(id)) || Number(id) <= 0) {
    return NextResponse.json({ error: "id 必須是正整數" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {
    updatedAt: new Date().toISOString(),
  };
  if (name !== undefined) {
    if (typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "名稱不可為空" }, { status: 400 });
    }
    updates.name = name.trim().slice(0, 100);
  }
  if (description !== undefined) {
    updates.description = description ? String(description).slice(0, 500) : null;
  }
  if (isActive !== undefined) {
    updates.isActive = isActive ? 1 : 0;
  }

  const [row] = await db
    .update(schema.categories)
    .set(updates)
    .where(and(eq(schema.categories.id, Number(id)), eq(schema.categories.userId, userId)))
    .returning();

  if (!row) {
    return NextResponse.json({ error: "找不到該分類" }, { status: 404 });
  }
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

  const [cat] = await db
    .select({ id: schema.categories.id })
    .from(schema.categories)
    .where(and(eq(schema.categories.id, id), eq(schema.categories.userId, userId)))
    .limit(1);
  if (!cat) return NextResponse.json({ error: "找不到該分類" }, { status: 404 });

  const [{ itemCount }] = await db
    .select({ itemCount: sql<number>`count(*)` })
    .from(schema.items)
    .where(and(eq(schema.items.categoryId, id), eq(schema.items.userId, userId)));
  const [{ saleCount }] = await db
    .select({ saleCount: sql<number>`count(*)` })
    .from(schema.sales)
    .innerJoin(schema.items, eq(schema.sales.itemId, schema.items.id))
    .where(and(eq(schema.items.categoryId, id), eq(schema.sales.userId, userId)));

  if (Number(itemCount) === 0 && Number(saleCount) === 0) {
    const deleted = await db
      .delete(schema.categories)
      .where(and(eq(schema.categories.id, id), eq(schema.categories.userId, userId)))
      .returning();
    if (deleted.length === 0) {
      return NextResponse.json({ error: "找不到該分類" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, mode: "hard" });
  }

  const now = new Date().toISOString();
  await db
    .update(schema.items)
    .set({ isActive: 0, updatedAt: now })
    .where(and(eq(schema.items.categoryId, id), eq(schema.items.userId, userId)));
  const [row] = await db
    .update(schema.categories)
    .set({ isActive: 0, updatedAt: now })
    .where(and(eq(schema.categories.id, id), eq(schema.categories.userId, userId)))
    .returning();
  if (!row) {
    return NextResponse.json({ error: "找不到該分類" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, mode: "soft" });
}
