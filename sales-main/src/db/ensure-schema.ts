import { client, db } from "@/db";
import { sql } from "drizzle-orm";

let ensurePromise: Promise<void> | null = null;

type ColumnInfoRow = {
  name?: string;
};

function hasColumn(rows: ColumnInfoRow[], name: string) {
  return rows.some((row) => row.name === name);
}

async function runEnsureSchema() {
  await db.run(sql`
    CREATE TABLE IF NOT EXISTS inventory_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id INTEGER NOT NULL REFERENCES items(id),
      unit_cost INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      remaining_qty INTEGER NOT NULL,
      stock_date TEXT NOT NULL,
      note TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.run(sql`
    CREATE INDEX IF NOT EXISTS idx_inventory_records_item_id
    ON inventory_records(item_id)
  `);
  await db.run(sql`
    CREATE INDEX IF NOT EXISTS idx_inventory_records_stock_date
    ON inventory_records(stock_date)
  `);
  await db.run(sql`
    CREATE INDEX IF NOT EXISTS idx_inventory_records_remaining_qty
    ON inventory_records(remaining_qty)
  `);

  const salesTableInfo = await client.execute("PRAGMA table_info(sales)");
  const salesColumns = salesTableInfo.rows as ColumnInfoRow[];
  if (!hasColumn(salesColumns, "inventory_record_id")) {
    await client.execute(
      "ALTER TABLE sales ADD COLUMN inventory_record_id INTEGER REFERENCES inventory_records(id)"
    );
  }

  await db.run(sql`
    CREATE INDEX IF NOT EXISTS idx_sales_inventory_record_id
    ON sales(inventory_record_id)
  `);

  if (!hasColumn(salesColumns, "purchase_batch_id")) {
    await client.execute(
      "ALTER TABLE sales ADD COLUMN purchase_batch_id INTEGER REFERENCES purchase_batches(id)"
    );
  }

  if (!hasColumn(salesColumns, "qty")) {
    await client.execute(
      "ALTER TABLE sales ADD COLUMN qty INTEGER NOT NULL DEFAULT 1"
    );
  }
}

export async function ensureSchema() {
  if (!ensurePromise) {
    ensurePromise = runEnsureSchema().catch((err) => {
      ensurePromise = null;
      throw err;
    });
  }
  await ensurePromise;
}
