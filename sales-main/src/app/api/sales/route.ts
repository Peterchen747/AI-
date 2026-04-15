import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, gte, like, lte, lt, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { ensureSchema } from "@/db/ensure-schema";

type SalePayload = {
  itemId: number;
  cost: number;
  actualPrice: number;
  qty: number;
  saleDate: string;
  batchId: number | null;
  notes: string | null;
  imageUrl: string | null;
  inventoryRecordId: number | null;
  purchaseBatchId: number | null;
};

function isValidDateString(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  );
}

export async function GET(request: NextRequest) {
  await ensureSchema();
  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month");
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");
  const categoryId = searchParams.get("categoryId");
  const q = searchParams.get("q");

  const filters = [];
  if (dateFrom && /^\d{4}-\d{2}-\d{2}$/.test(dateFrom)) {
    filters.push(gte(schema.sales.saleDate, dateFrom));
  }
  if (dateTo && /^\d{4}-\d{2}-\d{2}$/.test(dateTo)) {
    filters.push(lte(schema.sales.saleDate, dateTo));
  }
  if (!dateFrom && !dateTo && month && /^\d{4}-\d{2}$/.test(month)) {
    const start = `${month}-01`;
    const [y, m] = month.split("-").map(Number);
    const nextMonth = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`;
    filters.push(gte(schema.sales.saleDate, start));
    filters.push(lt(schema.sales.saleDate, nextMonth));
  }
  if (categoryId) {
    const cid = Number(categoryId);
    if (!Number.isNaN(cid) && cid > 0) filters.push(eq(schema.items.categoryId, cid));
  }
  if (q && q.trim()) {
    filters.push(like(schema.items.name, `%${q.trim()}%`));
  }

  const rows = await db
    .select({
      id: schema.sales.id,
      itemId: schema.sales.itemId,
      categoryId: schema.items.categoryId,
      cost: schema.sales.cost,
      actualPrice: schema.sales.actualPrice,
      qty: schema.sales.qty,
      saleDate: schema.sales.saleDate,
      source: schema.sales.source,
      notes: schema.sales.notes,
      imageUrl: schema.sales.imageUrl,
      inventoryRecordId: schema.sales.inventoryRecordId,
      categoryName: schema.categories.name,
      itemDisplayName: schema.items.name,
      inventoryStockDate: schema.inventoryRecords.stockDate,
      inventoryNote: schema.inventoryRecords.note,
    })
    .from(schema.sales)
    .innerJoin(schema.items, eq(schema.sales.itemId, schema.items.id))
    .leftJoin(schema.categories, eq(schema.items.categoryId, schema.categories.id))
    .leftJoin(schema.inventoryRecords, eq(schema.sales.inventoryRecordId, schema.inventoryRecords.id))
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(schema.sales.saleDate), desc(schema.sales.id));

  return NextResponse.json(rows);
}

export async function POST(request: NextRequest) {
  await ensureSchema();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const list = Array.isArray(body) ? body : [body];
  if (list.length > 500) {
    return NextResponse.json({ error: "Maximum 500 records per request" }, { status: 400 });
  }

  const rawItems = list as Record<string, unknown>[];
  const itemIds = Array.from(
    new Set(
      rawItems
        .map((it) => (it.itemId != null ? Number(it.itemId) : NaN))
        .filter((v) => Number.isInteger(v) && v > 0)
    )
  );

  const itemRows = itemIds.length
    ? await db
        .select({
          id: schema.items.id,
          categoryId: schema.items.categoryId,
          typicalCost: schema.items.typicalCost,
          typicalPrice: schema.items.typicalPrice,
        })
        .from(schema.items)
        .where(
          itemIds.length === 1
            ? eq(schema.items.id, itemIds[0])
            : sql`${schema.items.id} in (${sql.join(
                itemIds.map((id) => sql`${id}`),
                sql`, `
              )})`
        )
    : [];
  const itemMap = new Map(itemRows.map((row) => [row.id, row]));

  let validated: SalePayload[];
  try {
    validated = rawItems.map((item) => {
      if (item.cost == null || item.actualPrice == null || item.saleDate == null) {
        throw new Error("cost, actualPrice and saleDate are required");
      }

      const itemId = Number(item.itemId);
      const cost = Number(item.cost);
      const actualPrice = Number(item.actualPrice);
      const saleDate = String(item.saleDate);
      const inventoryRecordId =
        item.inventoryRecordId == null || item.inventoryRecordId === ""
          ? null
          : Number(item.inventoryRecordId);

      if (!Number.isInteger(itemId) || itemId <= 0 || !itemMap.has(itemId)) {
        throw new Error("Invalid itemId");
      }
      if (!Number.isFinite(cost) || cost < 0) {
        throw new Error("cost must be a non-negative number");
      }
      if (!Number.isFinite(actualPrice) || actualPrice < 0) {
        throw new Error("actualPrice must be a non-negative number");
      }
      if (!isValidDateString(saleDate)) {
        throw new Error("saleDate must be YYYY-MM-DD");
      }
      if (
        inventoryRecordId != null &&
        (!Number.isInteger(inventoryRecordId) || inventoryRecordId <= 0)
      ) {
        throw new Error("inventoryRecordId must be a positive integer");
      }

      const purchaseBatchId =
        item.purchaseBatchId == null || item.purchaseBatchId === ""
          ? null
          : Number(item.purchaseBatchId);
      if (
        purchaseBatchId != null &&
        (!Number.isInteger(purchaseBatchId) || purchaseBatchId <= 0)
      ) {
        throw new Error("purchaseBatchId must be a positive integer");
      }

      const qty =
        item.qty != null && item.qty !== ""
          ? Math.max(1, Math.floor(Number(item.qty)))
          : 1;

      return {
        itemId,
        cost,
        actualPrice,
        qty,
        saleDate,
        inventoryRecordId,
        purchaseBatchId,
        batchId: item.batchId != null ? Number(item.batchId) : null,
        notes: item.notes ? String(item.notes).slice(0, 500) : null,
        imageUrl: item.imageUrl ? String(item.imageUrl).slice(0, 500) : null,
      };
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Validation failed" },
      { status: 400 }
    );
  }

  const inserted = [] as Array<typeof schema.sales.$inferSelect>;
  const backfillCandidates = new Map<number, { cost: number; actualPrice: number }>();

  for (const v of validated) {
    const created = await db.transaction(async (tx) => {
      let finalCost = v.cost;
      if (v.inventoryRecordId != null) {
        const updatedInventory = await tx
          .update(schema.inventoryRecords)
          .set({
            remainingQty: sql`${schema.inventoryRecords.remainingQty} - 1`,
          })
          .where(
            and(
              eq(schema.inventoryRecords.id, v.inventoryRecordId),
              eq(schema.inventoryRecords.itemId, v.itemId),
              eq(schema.inventoryRecords.isActive, 1),
              gte(schema.inventoryRecords.remainingQty, 1)
            )
          )
          .returning({
            id: schema.inventoryRecords.id,
            unitCost: schema.inventoryRecords.unitCost,
          });

        if (updatedInventory.length === 0) {
          throw new Error("Inventory record unavailable or out of stock");
        }

        finalCost = updatedInventory[0].unitCost;
      }

      if (v.purchaseBatchId != null) {
        const updatedBatch = await tx
          .update(schema.purchaseBatches)
          .set({
            remainingQty: sql`${schema.purchaseBatches.remainingQty} - ${v.qty}`,
          })
          .where(
            and(
              eq(schema.purchaseBatches.id, v.purchaseBatchId),
              eq(schema.purchaseBatches.itemId, v.itemId),
              gte(schema.purchaseBatches.remainingQty, v.qty)
            )
          )
          .returning({
            id: schema.purchaseBatches.id,
            unitCost: schema.purchaseBatches.unitCost,
          });

        if (updatedBatch.length === 0) {
          throw new Error("進貨批次庫存不足或批次不存在");
        }

        finalCost = updatedBatch[0].unitCost;
      }

      const [row] = await tx
        .insert(schema.sales)
        .values({
          itemId: v.itemId,
          cost: finalCost,
          actualPrice: v.actualPrice,
          qty: v.qty,
          saleDate: v.saleDate,
          source: "manual",
          batchId: v.batchId,
          notes: v.notes,
          imageUrl: v.imageUrl,
          inventoryRecordId: v.inventoryRecordId,
          purchaseBatchId: v.purchaseBatchId,
        })
        .returning();

      return row;
    });

    inserted.push(created);

    const itemRow = itemMap.get(v.itemId);
    if (itemRow && itemRow.typicalCost == null && itemRow.typicalPrice == null) {
      backfillCandidates.set(v.itemId, {
        cost: created.cost,
        actualPrice: created.actualPrice,
      });
    }
  }

  for (const [itemId, fallback] of backfillCandidates) {
    await db
      .update(schema.items)
      .set({
        typicalCost: fallback.cost,
        typicalPrice: fallback.actualPrice,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(schema.items.id, itemId));
  }

  return NextResponse.json(Array.isArray(body) ? inserted : inserted[0]);
}

export async function DELETE(request: NextRequest) {
  await ensureSchema();
  const { searchParams } = new URL(request.url);
  const id = Number(searchParams.get("id"));
  if (!id || Number.isNaN(id) || id <= 0) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const deleted = await db.transaction(async (tx) => {
    const rows = await tx
      .delete(schema.sales)
      .where(eq(schema.sales.id, id))
      .returning({
        id: schema.sales.id,
        inventoryRecordId: schema.sales.inventoryRecordId,
        purchaseBatchId: schema.sales.purchaseBatchId,
        qty: schema.sales.qty,
      });

    if (rows.length === 0) return null;

    if (rows[0].inventoryRecordId != null) {
      await tx
        .update(schema.inventoryRecords)
        .set({
          remainingQty: sql`${schema.inventoryRecords.remainingQty} + 1`,
        })
        .where(eq(schema.inventoryRecords.id, rows[0].inventoryRecordId));
    }

    if (rows[0].purchaseBatchId != null) {
      await tx
        .update(schema.purchaseBatches)
        .set({
          remainingQty: sql`${schema.purchaseBatches.remainingQty} + ${rows[0].qty ?? 1}`,
        })
        .where(eq(schema.purchaseBatches.id, rows[0].purchaseBatchId));
    }

    return rows[0];
  });

  if (!deleted) {
    return NextResponse.json({ error: "Sale not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}

export async function PATCH(request: NextRequest) {
  await ensureSchema();
  const { searchParams } = new URL(request.url);
  const id = Number(searchParams.get("id"));
  if (!id || Number.isNaN(id) || id <= 0) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Body must be an object" }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const patch: Record<string, unknown> = {};

  const parseNonNegNumber = (v: unknown): number | null => {
    if (typeof v !== "number" && typeof v !== "string") return null;
    if (typeof v === "string" && v.trim() === "") return null;
    const n = Number(v);
    if (!Number.isFinite(n) || n < 0) return null;
    return n;
  };

  if (b.cost !== undefined) {
    const value = parseNonNegNumber(b.cost);
    if (value == null) return NextResponse.json({ error: "Invalid cost" }, { status: 400 });
    patch.cost = value;
  }
  if (b.actualPrice !== undefined) {
    const value = parseNonNegNumber(b.actualPrice);
    if (value == null) return NextResponse.json({ error: "Invalid actualPrice" }, { status: 400 });
    patch.actualPrice = value;
  }
  if (b.saleDate !== undefined) {
    const value = String(b.saleDate);
    if (!isValidDateString(value)) {
      return NextResponse.json({ error: "saleDate must be YYYY-MM-DD" }, { status: 400 });
    }
    patch.saleDate = value;
  }
  if (b.notes !== undefined) {
    patch.notes = b.notes ? String(b.notes).slice(0, 500) : null;
  }
  if (b.imageUrl !== undefined) {
    patch.imageUrl = b.imageUrl ? String(b.imageUrl).slice(0, 500) : null;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const [updated] = await db
    .update(schema.sales)
    .set(patch)
    .where(eq(schema.sales.id, id))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Sale not found" }, { status: 404 });
  }
  return NextResponse.json(updated);
}
