import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { purchaseBatches, sales } from "@/db/schema";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = parseInt(params.id);
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
    .where(eq(purchaseBatches.id, id))
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
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = parseInt(params.id);

  const salesCount = await db
    .select()
    .from(sales)
    .where(eq(sales.inventoryRecordId, id));

  if (salesCount.length > 0) {
    return NextResponse.json(
      { error: "Cannot delete: this batch has associated sales records" },
      { status: 400 }
    );
  }

  const deleted = await db
    .delete(purchaseBatches)
    .where(eq(purchaseBatches.id, id))
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
