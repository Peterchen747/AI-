import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, gte, like, lt, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { ensureSchema } from "@/db/ensure-schema";
import { DEMO_USER_ID } from "@/lib/mock-session";

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

function parsePositiveInt(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) return null;
  return n;
}

function parseNonNegativeInt(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0) return null;
  return n;
}

export async function GET(request: NextRequest) {
  await ensureSchema();
  const userId = DEMO_USER_ID;

  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month");
  const itemId = searchParams.get("itemId");
  const categoryId = searchParams.get("categoryId");
  const onlyAvailable = searchParams.get("onlyAvailable") === "1";
  const includeInactive = searchParams.get("includeInactive") === "1";
  const q = searchParams.get("q");

  const filters = [eq(schema.inventoryRecords.userId, userId)];

  if (!includeInactive) {
    filters.push(eq(schema.inventoryRecords.isActive, 1));
  }
  if (onlyAvailable) {
    filters.push(gte(schema.inventoryRecords.remainingQty, 1));
  }

  if (month && /^\d{4}-\d{2}$/.test(month)) {
    const [y, m] = month.split("-").map(Number);
    const start = `${month}-01`;
    const nextMonth =
      m === 12
        ? `${y + 1}-01-01`
        : `${y}-${String(m + 1).padStart(2, "0")}-01`;
    filters.push(gte(schema.inventoryRecords.stockDate, start));
    filters.push(lt(schema.inventoryRecords.stockDate, nextMonth));
  }

  if (itemId) {
    const id = Number(itemId);
    if (!Number.isNaN(id) && id > 0) {
      filters.push(eq(schema.inventoryRecords.itemId, id));
    }
  }

  if (categoryId) {
    const id = Number(categoryId);
    if (!Number.isNaN(id) && id > 0) {
      filters.push(eq(schema.items.categoryId, id));
    }
  }

  if (q && q.trim()) {
    filters.push(like(schema.items.name, `%${q.trim()}%`));
  }

  const rows = await db
    .select({
      id: schema.inventoryRecords.id,
      itemId: schema.inventoryRecords.itemId,
      unitCost: schema.inventoryRecords.unitCost,
      quantity: schema.inventoryRecords.quantity,
      remainingQty: schema.inventoryRecords.remainingQty,
      stockDate: schema.inventoryRecords.stockDate,
      note: schema.inventoryRecords.note,
      isActive: schema.inventoryRecords.isActive,
      createdAt: schema.inventoryRecords.createdAt,
      itemName: schema.items.name,
      categoryId: schema.items.categoryId,
      categoryName: schema.categories.name,
      usedCount:
        sql<number>`${schema.inventoryRecords.quantity} - ${schema.inventoryRecords.remainingQty}`,
    })
    .from(schema.inventoryRecords)
    .innerJoin(schema.items, eq(schema.inventoryRecords.itemId, schema.items.id))
    .leftJoin(schema.categories, eq(schema.items.categoryId, schema.categories.id))
    .where(and(...filters))
    .orderBy(desc(schema.inventoryRecords.stockDate), desc(schema.inventoryRecords.id));

  return NextResponse.json(rows);
}

export async function POST(request: NextRequest) {
  await ensureSchema();
  const userId = DEMO_USER_ID;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const itemId = parsePositiveInt(body.itemId);
  const unitCost = parseNonNegativeInt(body.unitCost);
  const quantity = parsePositiveInt(body.quantity);
  const stockDate = String(body.stockDate ?? "");
  const note = body.note ? String(body.note).trim().slice(0, 500) : null;

  if (!itemId) return NextResponse.json({ error: "itemId is required" }, { status: 400 });
  if (unitCost == null) return NextResponse.json({ error: "unitCost must be a non-negative integer" }, { status: 400 });
  if (!quantity) return NextResponse.json({ error: "quantity must be a positive integer" }, { status: 400 });
  if (!isValidDateString(stockDate)) return NextResponse.json({ error: "stockDate must be YYYY-MM-DD" }, { status: 400 });

  const [item] = await db
    .select({ id: schema.items.id })
    .from(schema.items)
    .where(and(eq(schema.items.id, itemId), eq(schema.items.userId, userId)))
    .limit(1);
  if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 });

  const [inserted] = await db
    .insert(schema.inventoryRecords)
    .values({
      userId,
      itemId,
      unitCost,
      quantity,
      remainingQty: quantity,
      stockDate,
      note,
      isActive: 1,
    })
    .returning();

  return NextResponse.json(inserted);
}

export async function PATCH(request: NextRequest) {
  await ensureSchema();
  const userId = DEMO_USER_ID;

  const { searchParams } = new URL(request.url);
  const id = Number(searchParams.get("id"));
  if (!id || Number.isNaN(id) || id <= 0) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const [existing] = await db
    .select()
    .from(schema.inventoryRecords)
    .where(and(eq(schema.inventoryRecords.id, id), eq(schema.inventoryRecords.userId, userId)))
    .limit(1);
  if (!existing) {
    return NextResponse.json({ error: "Inventory record not found" }, { status: 404 });
  }

  const patch: Record<string, unknown> = {};

  if (body.note !== undefined) {
    patch.note = body.note ? String(body.note).trim().slice(0, 500) : null;
  }
  if (body.stockDate !== undefined) {
    const stockDate = String(body.stockDate ?? "");
    if (!isValidDateString(stockDate)) {
      return NextResponse.json({ error: "stockDate must be YYYY-MM-DD" }, { status: 400 });
    }
    patch.stockDate = stockDate;
  }
  if (body.unitCost !== undefined) {
    const unitCost = parseNonNegativeInt(body.unitCost);
    if (unitCost == null) {
      return NextResponse.json({ error: "unitCost must be a non-negative integer" }, { status: 400 });
    }
    patch.unitCost = unitCost;
  }
  if (body.quantity !== undefined) {
    const quantity = parsePositiveInt(body.quantity);
    if (!quantity) {
      return NextResponse.json({ error: "quantity must be a positive integer" }, { status: 400 });
    }
    const usedCount = existing.quantity - existing.remainingQty;
    if (quantity < usedCount) {
      return NextResponse.json(
        { error: `quantity cannot be less than already-used amount (${usedCount})` },
        { status: 400 }
      );
    }
    patch.quantity = quantity;
    patch.remainingQty = quantity - usedCount;
  }
  if (body.isActive !== undefined) {
    patch.isActive = body.isActive ? 1 : 0;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const [updated] = await db
    .update(schema.inventoryRecords)
    .set(patch)
    .where(and(eq(schema.inventoryRecords.id, id), eq(schema.inventoryRecords.userId, userId)))
    .returning();

  return NextResponse.json(updated);
}

export async function DELETE(request: NextRequest) {
  await ensureSchema();
  const userId = DEMO_USER_ID;

  const { searchParams } = new URL(request.url);
  const id = Number(searchParams.get("id"));
  if (!id || Number.isNaN(id) || id <= 0) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const [existing] = await db
    .select()
    .from(schema.inventoryRecords)
    .where(and(eq(schema.inventoryRecords.id, id), eq(schema.inventoryRecords.userId, userId)))
    .limit(1);
  if (!existing) {
    return NextResponse.json({ error: "Inventory record not found" }, { status: 404 });
  }

  const [ref] = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.sales)
    .where(and(eq(schema.sales.inventoryRecordId, id), eq(schema.sales.userId, userId)));
  const usedCount = Number(ref?.count ?? 0);

  if (usedCount === 0) {
    await db.delete(schema.inventoryRecords).where(and(eq(schema.inventoryRecords.id, id), eq(schema.inventoryRecords.userId, userId)));
    return NextResponse.json({ ok: true, mode: "hard" });
  }

  await db
    .update(schema.inventoryRecords)
    .set({ isActive: 0 })
    .where(and(eq(schema.inventoryRecords.id, id), eq(schema.inventoryRecords.userId, userId)));
  return NextResponse.json({ ok: true, mode: "soft" });
}

export async function PUT(request: NextRequest) {
  return PATCH(request);
}
