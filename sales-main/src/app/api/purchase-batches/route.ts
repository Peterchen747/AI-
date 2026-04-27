import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, getTableColumns } from "drizzle-orm";
import { db } from "@/db";
import { purchaseBatches, items } from "@/db/schema";
import { DEMO_USER_ID } from "@/lib/mock-session";

export async function GET(request: NextRequest) {
  const userId = DEMO_USER_ID;

  const itemIdParam = request.nextUrl.searchParams.get("itemId");
  const filters = [eq(purchaseBatches.userId, userId)];
  if (itemIdParam && /^\d+$/.test(itemIdParam)) {
    filters.push(eq(purchaseBatches.itemId, Number(itemIdParam)));
  }

  const result = await db
    .select({
      ...getTableColumns(purchaseBatches),
      itemName: items.name,
    })
    .from(purchaseBatches)
    .innerJoin(items, eq(items.id, purchaseBatches.itemId))
    .where(and(...filters))
    .orderBy(desc(purchaseBatches.purchaseDate));

  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const userId = DEMO_USER_ID;

  const { itemId, purchaseDate, totalQty, totalCost, notes } = await request.json();
  const unitCost = Math.round(totalCost / totalQty);

  // Verify item belongs to user
  const [item] = await db
    .select({ id: items.id })
    .from(items)
    .where(and(eq(items.id, itemId), eq(items.userId, userId)))
    .limit(1);
  if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 });

  const [batch] = await db.insert(purchaseBatches).values({
    userId,
    itemId,
    purchaseDate,
    totalQty,
    totalCost,
    unitCost,
    remainingQty: totalQty,
    notes,
  }).returning();

  await db
    .update(items)
    .set({ typicalCost: unitCost, updatedAt: new Date().toISOString() })
    .where(and(eq(items.id, itemId), eq(items.userId, userId)));

  return NextResponse.json(batch);
}
