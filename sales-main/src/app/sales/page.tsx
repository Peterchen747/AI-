import Link from "next/link";
import { db, schema } from "@/db";
import { desc, eq, and, gte, lt, lte, like, asc } from "drizzle-orm";
import { buttonVariants } from "@/components/ui/button";
import { SalesTable } from "@/components/sales/sales-table";
import { MonthFilter } from "@/components/sales/month-filter";
import { SalesFilters } from "@/components/sales/sales-filters";
import { formatNTD } from "@/lib/utils";
import { ensureSchema } from "@/db/ensure-schema";

export const dynamic = "force-dynamic";

export default async function SalesPage({
  searchParams,
}: {
  searchParams: Promise<{
    month?: string;
    dateFrom?: string;
    dateTo?: string;
    categoryId?: string;
    q?: string;
  }>;
}) {
  await ensureSchema();
  const params = await searchParams;
  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const dateFrom = params.dateFrom && /^\d{4}-\d{2}-\d{2}$/.test(params.dateFrom) ? params.dateFrom : null;
  const dateTo = params.dateTo && /^\d{4}-\d{2}-\d{2}$/.test(params.dateTo) ? params.dateTo : null;
  const categoryId = params.categoryId ? Number(params.categoryId) : null;
  const q = params.q?.trim() || null;

  const month = !dateFrom && !dateTo ? params.month || defaultMonth : null;

  const filters = [];
  if (dateFrom) filters.push(gte(schema.sales.saleDate, dateFrom));
  if (dateTo) filters.push(lte(schema.sales.saleDate, dateTo));
  if (month) {
    const [y, m] = month.split("-").map(Number);
    const start = `${month}-01`;
    const nextMonth = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`;
    filters.push(gte(schema.sales.saleDate, start));
    filters.push(lt(schema.sales.saleDate, nextMonth));
  }
  if (categoryId && !isNaN(categoryId) && categoryId > 0) {
    filters.push(eq(schema.items.categoryId, categoryId));
  }
  if (q) {
    filters.push(like(schema.items.name, `%${q}%`));
  }

  const sales = await db
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
      categoryName: schema.categories.name,
      itemDisplayName: schema.items.name,
      itemActive: schema.items.isActive,
    })
    .from(schema.sales)
    .innerJoin(schema.items, eq(schema.sales.itemId, schema.items.id))
    .leftJoin(schema.categories, eq(schema.items.categoryId, schema.categories.id))
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(schema.sales.saleDate), desc(schema.sales.id));

  // Q7: sales 頁下拉列全部分類(含封存),封存的標示
  const categories = await db
    .select({
      id: schema.categories.id,
      name: schema.categories.name,
      isActive: schema.categories.isActive,
    })
    .from(schema.categories)
    .orderBy(asc(schema.categories.name));

  const totalQty = sales.reduce((s, r) => s + (r.qty ?? 1), 0);
  const totalRevenue = sales.reduce((s, r) => s + r.actualPrice * (r.qty ?? 1), 0);
  const totalCost = sales.reduce((s, r) => s + r.cost * (r.qty ?? 1), 0);
  const totalProfit = totalRevenue - totalCost;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">銷售紀錄</h1>
        <div className="flex gap-2">
          <Link href="/sales/new" className={buttonVariants()}>
            + 手動新增
          </Link>
        </div>
      </div>

      <SalesFilters categories={categories} />

      <div className="flex flex-col md:flex-row md:items-end gap-4">
        {month && <MonthFilter current={month} />}
        <div className="flex-1 grid grid-cols-2 md:flex gap-2 md:gap-4 md:justify-end text-sm">
          <div className="px-3 py-2 rounded-md border bg-card">
            <div className="text-muted-foreground text-xs">筆數 / 件數</div>
            <div className="font-bold">{sales.length} / {totalQty}</div>
          </div>
          <div className="px-3 py-2 rounded-md border bg-card">
            <div className="text-muted-foreground text-xs">營收</div>
            <div className="font-bold">{formatNTD(totalRevenue)}</div>
          </div>
          <div className="px-3 py-2 rounded-md border bg-card">
            <div className="text-muted-foreground text-xs">成本</div>
            <div className="font-bold">{formatNTD(totalCost)}</div>
          </div>
          <div className="px-3 py-2 rounded-md border bg-card">
            <div className="text-muted-foreground text-xs">利潤</div>
            <div className={`font-bold ${totalProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
              {formatNTD(totalProfit)}
            </div>
          </div>
        </div>
      </div>

      <SalesTable sales={sales} />
    </div>
  );
}
