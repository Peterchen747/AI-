import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, like } from "drizzle-orm";
import { db, schema } from "@/db";
import { ensureSchema } from "@/db/ensure-schema";
import { auth } from "@/auth";

export async function GET(request: NextRequest) {
  await ensureSchema();
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const url = new URL(request.url);
  const yearParam = url.searchParams.get("year");
  const monthParam = url.searchParams.get("month");

  if (yearParam && monthParam) {
    const weeklyCosts = await db
      .select()
      .from(schema.weeklyCosts)
      .where(and(
        eq(schema.weeklyCosts.userId, userId),
        like(schema.weeklyCosts.weekLabel, `${yearParam}-W${monthParam}%`)
      ));
    return NextResponse.json(weeklyCosts);
  } else {
    const recentWeeklyCosts = await db
      .select()
      .from(schema.weeklyCosts)
      .where(eq(schema.weeklyCosts.userId, userId))
      .orderBy(desc(schema.weeklyCosts.weekLabel))
      .limit(50);
    return NextResponse.json(recentWeeklyCosts);
  }
}

export async function POST(request: NextRequest) {
  await ensureSchema();
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const rawWeekLabel = body.weekLabel;
  if (!rawWeekLabel || typeof rawWeekLabel !== "string" || !/^\d{4}-W\d{1,2}$/.test(rawWeekLabel)) {
    return NextResponse.json({ error: "weekLabel 格式必須為 YYYY-WNN" }, { status: 400 });
  }
  const weekLabel: string = rawWeekLabel;

  const toNonNegNum = (v: unknown): number => {
    const n = Number(v ?? 0);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  };

  const adCost = toNonNegNum(body.adCost);
  const shippingCost = toNonNegNum(body.shippingCost);
  const packagingCost = toNonNegNum(body.packagingCost);
  const otherCost = toNonNegNum(body.otherCost);
  const notes = body.notes ? String(body.notes).slice(0, 500) : null;
  const totalCost = adCost + shippingCost + packagingCost + otherCost;

  const existing = await db
    .select({ id: schema.weeklyCosts.id })
    .from(schema.weeklyCosts)
    .where(and(eq(schema.weeklyCosts.userId, userId), eq(schema.weeklyCosts.weekLabel, weekLabel)))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(schema.weeklyCosts)
      .set({ adCost, shippingCost, packagingCost, otherCost, totalCost, notes })
      .where(and(eq(schema.weeklyCosts.userId, userId), eq(schema.weeklyCosts.weekLabel, weekLabel)));
  } else {
    await db
      .insert(schema.weeklyCosts)
      .values({ userId, weekLabel, adCost, shippingCost, packagingCost, otherCost, totalCost, notes });
  }

  const [updated] = await db
    .select()
    .from(schema.weeklyCosts)
    .where(and(eq(schema.weeklyCosts.userId, userId), eq(schema.weeklyCosts.weekLabel, weekLabel)))
    .limit(1);

  return NextResponse.json(updated);
}
