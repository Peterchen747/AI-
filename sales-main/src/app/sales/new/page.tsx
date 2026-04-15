import { db, schema } from "@/db";
import { asc, eq } from "drizzle-orm";
import { SaleForm } from "@/components/sales/sale-form";

export const dynamic = "force-dynamic";

export default async function NewSalePage() {
  const categories = await db
    .select({
      id: schema.categories.id,
      name: schema.categories.name,
    })
    .from(schema.categories)
    .where(eq(schema.categories.isActive, 1))
    .orderBy(asc(schema.categories.name));

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">新增銷售紀錄</h1>
      <SaleForm categories={categories} />
    </div>
  );
}
