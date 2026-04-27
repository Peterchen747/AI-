import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, like } from "drizzle-orm";
import { db, schema } from "@/db";
import { ensureSchema } from "@/db/ensure-schema";
import { DEMO_USER_ID } from "@/lib/mock-session";

export async function GET(request: NextRequest) {
  await ensureSchema();
  const userId = DEMO_USER_ID;

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
  const userId = DEMO_USER_ID;

  const body = await request.json();
  const { weekLabel, adCost, shippingCost, packagingCost, otherCost, notes } = body;

  const totalCost = (adCost ?? 0) + (shippingCost ?? 0) + (packagingCost ?? 0) + (otherCost ?? 0);

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
