import { asc, desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { ensureSchema } from "@/db/ensure-schema";
import { InventoryClient } from "@/components/inventory/inventory-client";

export const dynamic = "force-dynamic";

export default async function InventoryPage() {
  await ensureSchema();

  const [categories, initialRecords] = await Promise.all([
    db
      .select({ id: schema.categories.id, name: schema.categories.name })
      .from(schema.categories)
      .where(eq(schema.categories.isActive, 1))
      .orderBy(asc(schema.categories.name)),
    db
      .select({
        id: schema.inventoryRecords.id,
        itemId: schema.inventoryRecords.itemId,
        unitCost: schema.inventoryRecords.unitCost,
        quantity: schema.inventoryRecords.quantity,
        remainingQty: schema.inventoryRecords.remainingQty,
        stockDate: schema.inventoryRecords.stockDate,
        note: schema.inventoryRecords.note,
        isActive: schema.inventoryRecords.isActive,
        itemName: schema.items.name,
        categoryId: schema.items.categoryId,
        categoryName: schema.categories.name,
      })
      .from(schema.inventoryRecords)
      .innerJoin(schema.items, eq(schema.inventoryRecords.itemId, schema.items.id))
      .leftJoin(schema.categories, eq(schema.items.categoryId, schema.categories.id))
      .orderBy(desc(schema.inventoryRecords.stockDate), desc(schema.inventoryRecords.id)),
  ]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">入庫存紀錄</h1>
      <InventoryClient categories={categories} initialRecords={initialRecords} />
    </div>
  );
}
