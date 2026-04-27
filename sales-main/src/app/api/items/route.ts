import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/db";
import { and, asc, eq, sql } from "drizzle-orm";
import { DEMO_USER_ID } from "@/lib/mock-session";

export async function GET(request: NextRequest) {
  const userId = DEMO_USER_ID;

  const { searchParams } = new URL(request.url);
  const categoryId = searchParams.get("categoryId");
  const includeArchived = searchParams.get("includeArchived") === "1";

  const filters = [eq(schema.items.userId, userId)] as ReturnType<typeof eq>[];
  if (categoryId) {
    const cid = Number(categoryId);
    if (!isNaN(cid) && cid > 0) filters.push(eq(schema.items.categoryId, cid));
  }
  if (!includeArchived) filters.push(eq(schema.items.isActive, 1));

  const rows = await db
    .select({
      id: schema.items.id,
      categoryId: schema.items.categoryId,
      name: schema.items.name,
      typicalCost: schema.items.typicalCost,
      typicalPrice: schema.items.typicalPrice,
      isActive: schema.items.isActive,
      categoryName: schema.categories.name,
      saleCount: sql<number>`(select count(*) from sales where sales.item_id = ${schema.items.id} AND sales.user_id = ${userId})`,
      saleQty: sql<number>`(select coalesce(sum(case when qty is null then 1 else qty end), 0) from sales where sales.item_id = ${schema.items.id} AND sales.user_id = ${userId})`,
    })
    .from(schema.items)
    .leftJoin(schema.categories, eq(schema.items.categoryId, schema.categories.id))
    .where(and(...filters))
    .orderBy(asc(schema.items.name));

  return NextResponse.json(rows);
}

export async function POST(request: NextRequest) {
  const userId = DEMO_USER_ID;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "無效的 JSON 格式" }, { status: 400 });
  }
  const { categoryId, name, typicalCost, typicalPrice } = body;

  const cid = Number(categoryId);
  if (!cid || isNaN(cid) || cid <= 0) {
    return NextResponse.json({ error: "categoryId 必填" }, { status: 400 });
  }
  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "商品名稱必填" }, { status: 400 });
  }
  if (name.trim().length > 200) {
    return NextResponse.json({ error: "名稱最多 200 字" }, { status: 400 });
  }

  // Verify category exists and belongs to this user
  const [cat] = await db
    .select({ id: schema.categories.id })
    .from(schema.categories)
    .where(and(eq(schema.categories.id, cid), eq(schema.categories.userId, userId)))
    .limit(1);
  if (!cat) {
    return NextResponse.json({ error: "找不到該大分類" }, { status: 404 });
  }

  const trimmed = name.trim();
  const existing = await db
    .select()
    .from(schema.items)
    .where(and(eq(schema.items.categoryId, cid), eq(schema.items.userId, userId)));
  const match = existing.find(
    (r) => r.name.trim().toLowerCase() === trimmed.toLowerCase()
  );
  if (match) {
    if (match.isActive === 0) {
      const [row] = await db
        .update(schema.items)
        .set({ isActive: 1, updatedAt: new Date().toISOString() })
        .where(eq(schema.items.id, match.id))
        .returning();
      return NextResponse.json(row);
    }
    return NextResponse.json(match);
  }

  const [row] = await db
    .insert(schema.items)
    .values({
      userId,
      categoryId: cid,
      name: trimmed,
      typicalCost: typicalCost != null && typicalCost !== "" ? Number(typicalCost) : null,
      typicalPrice: typicalPrice != null && typicalPrice !== "" ? Number(typicalPrice) : null,
    })
    .returning();
  return NextResponse.json(row);
}

export async function PUT(request: NextRequest) {
  const userId = DEMO_USER_ID;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "無效的 JSON 格式" }, { status: 400 });
  }
  const { id, name, typicalCost, typicalPrice, isActive } = body;
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
    updates.name = name.trim().slice(0, 200);
  }
  if (typicalCost !== undefined)
    updates.typicalCost = typicalCost != null && typicalCost !== "" ? Number(typicalCost) : null;
  if (typicalPrice !== undefined)
    updates.typicalPrice = typicalPrice != null && typicalPrice !== "" ? Number(typicalPrice) : null;
  if (isActive !== undefined) updates.isActive = isActive ? 1 : 0;

  const [row] = await db
    .update(schema.items)
    .set(updates)
    .where(and(eq(schema.items.id, Number(id)), eq(schema.items.userId, userId)))
    .returning();
  if (!row) return NextResponse.json({ error: "找不到該商品" }, { status: 404 });
  return NextResponse.json(row);
}

export async function DELETE(request: NextRequest) {
  const userId = DEMO_USER_ID;

  const { searchParams } = new URL(request.url);
  const id = Number(searchParams.get("id"));
  if (!id || isNaN(id) || id <= 0) {
    return NextResponse.json({ error: "id 必須是正整數" }, { status: 400 });
  }

  const [{ saleCount }] = await db
    .select({ saleCount: sql<number>`count(*)` })
    .from(schema.sales)
    .where(and(eq(schema.sales.itemId, id), eq(schema.sales.userId, userId)));

  if (Number(saleCount) === 0) {
    const deleted = await db
      .delete(schema.items)
      .where(and(eq(schema.items.id, id), eq(schema.items.userId, userId)))
      .returning();
    if (deleted.length === 0)
      return NextResponse.json({ error: "找不到該商品" }, { status: 404 });
    return NextResponse.json({ ok: true, mode: "hard" });
  }

  const [row] = await db
    .update(schema.items)
    .set({ isActive: 0, updatedAt: new Date().toISOString() })
    .where(and(eq(schema.items.id, id), eq(schema.items.userId, userId)))
    .returning();
  if (!row) return NextResponse.json({ error: "找不到該商品" }, { status: 404 });
  return NextResponse.json({ ok: true, mode: "soft" });
}
