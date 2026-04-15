import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const categories = sqliteTable("categories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  description: text("description"),
  isActive: integer("is_active").default(1).notNull(),
  createdAt: text("created_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  updatedAt: text("updated_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

export const items = sqliteTable("items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  categoryId: integer("category_id")
    .references(() => categories.id)
    .notNull(),
  name: text("name").notNull(),
  typicalCost: integer("typical_cost"),
  typicalPrice: integer("typical_price"),
  isActive: integer("is_active").default(1).notNull(),
  createdAt: text("created_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  updatedAt: text("updated_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

export const sales = sqliteTable("sales", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  itemId: integer("item_id")
    .references(() => items.id)
    .notNull(),
  inventoryRecordId: integer("inventory_record_id").references(
    () => inventoryRecords.id
  ),
  purchaseBatchId: integer("purchase_batch_id").references(
    () => purchaseBatches.id
  ),
  cost: integer("cost").notNull(),
  actualPrice: integer("actual_price").notNull(),
  qty: integer("qty").default(1).notNull(),
  saleDate: text("sale_date").notNull(),
  source: text("source").default("manual").notNull(),
  batchId: integer("batch_id").references(() => importBatches.id),
  notes: text("notes"),
  imageUrl: text("image_url"),
  createdAt: text("created_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

export const inventoryRecords = sqliteTable("inventory_records", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  itemId: integer("item_id")
    .references(() => items.id)
    .notNull(),
  unitCost: integer("unit_cost").notNull(),
  quantity: integer("quantity").notNull(),
  remainingQty: integer("remaining_qty").notNull(),
  stockDate: text("stock_date").notNull(),
  note: text("note"),
  isActive: integer("is_active").default(1).notNull(),
  createdAt: text("created_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

export const importBatches = sqliteTable("import_batches", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  weekLabel: text("week_label"),
  totalImages: integer("total_images").default(0).notNull(),
  totalSales: integer("total_sales").default(0).notNull(),
  status: text("status").default("in_progress").notNull(),
  createdAt: text("created_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

export const screenshots = sqliteTable("screenshots", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  batchId: integer("batch_id")
    .references(() => importBatches.id)
    .notNull(),
  imagePath: text("image_path").notNull(),
  ocrText: text("ocr_text"),
  isProcessed: integer("is_processed").default(0).notNull(),
  createdAt: text("created_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

export const shareTokens = sqliteTable("share_tokens", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  token: text("token").notNull().unique(),
  label: text("label"),
  expiresAt: text("expires_at"),
  createdAt: text("created_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

export const purchaseBatches = sqliteTable('purchase_batches', {
  id:            integer('id').primaryKey({ autoIncrement: true }),
  itemId:        integer('item_id').notNull().references(() => items.id),
  purchaseDate:  text('purchase_date').notNull(),
  totalQty:      integer('total_qty').notNull(),
  remainingQty:  integer('remaining_qty').notNull(),
  totalCost:     integer('total_cost').notNull(),
  unitCost:      integer('unit_cost').notNull(),
  notes:         text('notes'),
  createdAt:     text('created_at').default(sql`(datetime('now'))`),
});

export const weeklyCosts = sqliteTable('weekly_costs', {
  id:            integer('id').primaryKey({ autoIncrement: true }),
  weekLabel:     text('week_label').notNull(),
  adCost:        integer('ad_cost').notNull().default(0),
  shippingCost:  integer('shipping_cost').notNull().default(0),
  packagingCost: integer('packaging_cost').notNull().default(0),
  otherCost:     integer('other_cost').notNull().default(0),
  totalCost:     integer('total_cost').notNull().default(0),
  notes:         text('notes'),
  createdAt:     text('created_at').default(sql`(datetime('now'))`),
  purchaseBatchId: integer('purchase_batch_id').references(() => purchaseBatches.id),
});