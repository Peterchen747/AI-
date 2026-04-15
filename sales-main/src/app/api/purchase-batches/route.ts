import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, getTableColumns } from "drizzle-orm";
import { db } from "@/db";
import { purchaseBatches, items } from "@/db/schema";

export async function GET(request: NextRequest) {
  const itemIdParam = request.nextUrl.searchParams.get("itemId");
  const itemIdFilter =
    itemIdParam && /^\d+$/.test(itemIdParam)
      ? eq(purchaseBatches.itemId, Number(itemIdParam))
      : undefined;

  const result = await db
    .select({
      ...getTableColumns(purchaseBatches),
      itemName: items.name,
    })
    .from(purchaseBatches)
    .innerJoin(items, eq(items.id, purchaseBatches.itemId))
    .where(itemIdFilter ? and(itemIdFilter) : undefined)
    .orderBy(desc(purchaseBatches.purchaseDate));

  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const { itemId, purchaseDate, totalQty, totalCost, notes } = await request.json();
  const unitCost = Math.round(totalCost / totalQty);

  const [batch] = await db.insert(purchaseBatches).values({
    itemId,
    purchaseDate,
    totalQty,
    totalCost,
    unitCost,
    remainingQty: totalQty,
    notes,
  }).returning();

  // 同步更新商品的典型成本，讓進貨管理與商品分類的成本保持一致
  await db
    .update(items)
    .set({ typicalCost: unitCost, updatedAt: new Date().toISOString() })
    .where(eq(items.id, itemId));

  return NextResponse.json(batch);
}
