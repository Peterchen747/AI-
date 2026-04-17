import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { purchaseBatches, sales } from "@/db/schema";
import { auth } from "@/auth";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const { id: idStr } = await params;
  const id = parseInt(idStr);
  const body = await request.json();

  const updatedRecord = await db
    .update(purchaseBatches)
    .set({
      itemId: body.itemId,
      purchaseDate: body.purchaseDate,
      totalQty: body.totalQty,
      totalCost: body.totalCost,
      unitCost: Math.round(body.totalCost / body.totalQty),
      notes: body.notes,
    })
    .where(and(eq(purchaseBatches.id, id), eq(purchaseBatches.userId, userId)))
    .returning();

  if (updatedRecord.length > 0) {
    return NextResponse.json(updatedRecord[0]);
  } else {
    return NextResponse.json(
      { error: "Purchase batch not found" },
      { status: 404 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const { id: idStr } = await params;
  const id = parseInt(idStr);

  const salesCount = await db
    .select()
    .from(sales)
    .where(and(eq(sales.inventoryRecordId, id), eq(sales.userId, userId)));

  if (salesCount.length > 0) {
    return NextResponse.json(
      { error: "Cannot delete: this batch has associated sales records" },
      { status: 400 }
    );
  }

  const deleted = await db
    .delete(purchaseBatches)
    .where(and(eq(purchaseBatches.id, id), eq(purchaseBatches.userId, userId)))
    .returning();

  if (deleted.length > 0) {
    return NextResponse.json(deleted[0]);
  } else {
    return NextResponse.json(
      { error: "Purchase batch not found" },
      { status: 404 }
    );
  }
}
