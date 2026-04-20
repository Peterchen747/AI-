import { createClient } from "@libsql/client";
import { randomUUID } from "crypto";

const url = process.env.TURSO_CONNECTION_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url) { console.error("缺少 TURSO_CONNECTION_URL"); process.exit(1); }

const client = createClient({ url, authToken });
const USER_EMAIL = "zcbm311069@gmail.com";

async function addColumnIfMissing(table, column, type) {
  const info = await client.execute(`PRAGMA table_info(${table})`);
  const exists = info.rows.some(r => r.name === column);
  if (!exists) {
    await client.execute(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
    console.log(`  + ${table}.${column}`);
  }
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function daysAgoDate(days) {
  return new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
}

async function main() {
  // 確保 auth tables 存在
  await client.execute(`CREATE TABLE IF NOT EXISTS user (
    id TEXT PRIMARY KEY, name TEXT, email TEXT UNIQUE, emailVerified INTEGER, image TEXT
  )`);
  await client.execute(`CREATE TABLE IF NOT EXISTS session (
    sessionToken TEXT PRIMARY KEY,
    userId TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
    expires INTEGER NOT NULL
  )`);
  await client.execute(`CREATE TABLE IF NOT EXISTS verificationToken (
    identifier TEXT NOT NULL, token TEXT NOT NULL, expires INTEGER NOT NULL,
    PRIMARY KEY (identifier, token)
  )`);
  await client.execute(`CREATE TABLE IF NOT EXISTS account (
    userId TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
    type TEXT NOT NULL, provider TEXT NOT NULL, providerAccountId TEXT NOT NULL,
    refresh_token TEXT, access_token TEXT, expires_at INTEGER,
    token_type TEXT, scope TEXT, id_token TEXT, session_state TEXT,
    PRIMARY KEY (provider, providerAccountId)
  )`);

  // 確保 user_id 欄位存在
  console.log("檢查/加入 user_id 欄位...");
  for (const table of ["categories", "items", "sales", "purchase_batches", "weekly_costs"]) {
    await addColumnIfMissing(table, "user_id", "TEXT");
  }

  // 取得或建立 user
  const userResult = await client.execute({
    sql: "SELECT id FROM user WHERE email = ?",
    args: [USER_EMAIL],
  });
  let userId;
  if (userResult.rows.length > 0) {
    userId = userResult.rows[0].id;
    console.log("找到現有 user:", userId);
  } else {
    userId = randomUUID();
    await client.execute({
      sql: "INSERT INTO user (id, name, email) VALUES (?, ?, ?)",
      args: [userId, "飾品小賣家", USER_EMAIL],
    });
    console.log("建立新 user:", userId);
  }

  // 清除舊假資料（暫時關閉 FK 以避免孤立記錄衝突）
  await client.execute("PRAGMA foreign_keys = OFF");
  await client.execute({ sql: "DELETE FROM sales WHERE user_id = ?", args: [userId] });
  await client.execute({ sql: "DELETE FROM purchase_batches WHERE user_id = ?", args: [userId] });
  await client.execute({ sql: "DELETE FROM weekly_costs WHERE user_id = ?", args: [userId] });
  await client.execute({ sql: "DELETE FROM items WHERE user_id = ?", args: [userId] });
  await client.execute({ sql: "DELETE FROM categories WHERE user_id = ?", args: [userId] });
  await client.execute("PRAGMA foreign_keys = ON");
  console.log("清除舊資料完畢");

  // ── 分類（8 個）──
  const categoryNames = ["戒指", "耳環", "項鍊", "手環", "胸針", "髮飾", "腳鍊", "手機殼吊飾"];
  const categoryIds = [];
  for (const name of categoryNames) {
    const r = await client.execute({
      sql: "INSERT INTO categories (user_id, name, is_active) VALUES (?, ?, 1) RETURNING id",
      args: [userId, name],
    });
    categoryIds.push(Number(r.rows[0].id));
  }
  console.log(`✓ 建立 ${categoryNames.length} 個分類`);

  // ── 商品（每分類 5 個，共 40 個）──
  const itemData = [
    [["純銀戒指", 120, 280], ["玫瑰金戒指", 150, 320], ["鑲鑽戒指", 200, 450], ["簡約細戒", 80, 180], ["雙環戒", 95, 210]],
    [["珍珠耳環", 100, 220], ["水晶耳環", 130, 280], ["金屬耳環", 90, 200], ["流蘇耳環", 110, 250], ["貓耳耳環", 85, 190]],
    [["金鍊項鍊", 160, 350], ["珠珠項鍊", 120, 260], ["字母項鍊", 90, 200], ["貝殼項鍊", 140, 300], ["愛心項鍊", 130, 280]],
    [["串珠手環", 80, 180], ["皮革手環", 100, 230], ["銀手環", 150, 320], ["編織手環", 70, 160], ["磁石手環", 110, 240]],
    [["蝴蝶胸針", 90, 200], ["花朵胸針", 110, 240], ["幾何胸針", 80, 180], ["動物胸針", 120, 260], ["星月胸針", 95, 210]],
    [["蕾絲髮箍", 60, 140], ["珍珠髮夾", 75, 165], ["絲巾髮帶", 50, 120], ["水鑽髮圈", 65, 150], ["蝴蝶結髮飾", 55, 130]],
    [["銀色腳鍊", 85, 190], ["珠珠腳鍊", 70, 160], ["鈴鐺腳鍊", 80, 180], ["彩繩腳鍊", 55, 130], ["雙層腳鍊", 95, 215]],
    [["星座吊飾", 45, 110], ["卡通吊飾", 40, 100], ["水晶吊飾", 60, 140], ["幸運草吊飾", 50, 120], ["個性吊飾", 55, 130]],
  ];
  const itemIds = [];
  for (let ci = 0; ci < categoryIds.length; ci++) {
    for (const [name, cost, price] of itemData[ci]) {
      const r = await client.execute({
        sql: "INSERT INTO items (user_id, category_id, name, typical_cost, typical_price, is_active) VALUES (?, ?, ?, ?, ?, 1) RETURNING id",
        args: [userId, categoryIds[ci], name, cost, price],
      });
      itemIds.push({ id: Number(r.rows[0].id), cost, price, categoryIdx: ci });
    }
  }
  console.log(`✓ 建立 ${itemIds.length} 個商品`);

  // ── 進貨批次（100 筆，過去 2 年內）──
  const purchaseBatches = [];
  const batchInserts = [];
  for (let i = 0; i < 100; i++) {
    const item = itemIds[i % itemIds.length];
    const qty = randInt(20, 80);
    const unitCost = Math.round(item.cost * (0.8 + Math.random() * 0.25));
    const totalCost = unitCost * qty;
    const remaining = Math.floor(qty * (0.05 + Math.random() * 0.3));
    const date = daysAgoDate(randInt(0, 730));
    batchInserts.push({
      sql: `INSERT INTO purchase_batches (user_id, item_id, purchase_date, total_qty, remaining_qty, total_cost, unit_cost)
            VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id`,
      args: [userId, item.id, date, qty, remaining, totalCost, unitCost],
    });
  }
  // 逐筆取得 id（需要 id 來建銷售）
  for (const stmt of batchInserts) {
    const r = await client.execute(stmt);
    const row = batchInserts.indexOf(stmt);
    const item = itemIds[row % itemIds.length];
    purchaseBatches.push({
      id: Number(r.rows[0].id),
      itemId: item.id,
      unitCost: Number(stmt.args[6]),
    });
  }
  console.log(`✓ 建立 ${purchaseBatches.length} 筆進貨批次`);

  // ── 銷售記錄（5000 筆，分批 INSERT，過去 2 年）──
  const sources = ["LINE", "IG", "現場", "蝦皮", "Facebook", "朋友介紹"];
  const TOTAL_SALES = 5000;
  const BATCH_SIZE = 200;

  let salesInserted = 0;
  for (let start = 0; start < TOTAL_SALES; start += BATCH_SIZE) {
    const end = Math.min(start + BATCH_SIZE, TOTAL_SALES);
    const stmts = [];
    for (let i = start; i < end; i++) {
      const item = itemIds[randInt(0, itemIds.length - 1)];
      const batch = purchaseBatches[randInt(0, purchaseBatches.length - 1)];
      const daysAgo = randInt(0, 730);
      const date = daysAgoDate(daysAgo);
      const qty = randInt(1, 4);
      const priceVar = randInt(-30, 60);
      const actualPrice = Math.max(item.cost + 20, item.price + priceVar);
      const source = sources[randInt(0, sources.length - 1)];
      stmts.push({
        sql: `INSERT INTO sales (user_id, item_id, purchase_batch_id, cost, actual_price, qty, sale_date, source)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [userId, item.id, batch.id, item.cost, actualPrice, qty, date, source],
      });
    }
    await client.batch(stmts, "write");
    salesInserted += stmts.length;
    process.stdout.write(`\r  銷售進度：${salesInserted} / ${TOTAL_SALES}`);
  }
  console.log(`\n✓ 建立 ${salesInserted} 筆銷售記錄`);

  // ── 月費用（過去 24 個月）──
  const costStmts = [];
  const now = new Date();
  for (let m = 0; m < 24; m++) {
    const d = new Date(now.getFullYear(), now.getMonth() - m, 1);
    const y = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, "0");
    const weekLabel = `${y}-${mo}`;
    const adCost = randInt(500, 3500);
    const shippingCost = randInt(100, 800);
    const packagingCost = randInt(80, 400);
    const otherCost = randInt(0, 600);
    const totalCost = adCost + shippingCost + packagingCost + otherCost;
    costStmts.push({
      sql: `INSERT INTO weekly_costs (user_id, week_label, ad_cost, shipping_cost, packaging_cost, other_cost, total_cost)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [userId, weekLabel, adCost, shippingCost, packagingCost, otherCost, totalCost],
    });
  }
  await client.batch(costStmts, "write");
  console.log(`✓ 建立 ${costStmts.length} 個月費用記錄`);

  console.log(`\n✅ 完成！User: ${USER_EMAIL} (${userId})`);
  await client.close();
}

main().catch(e => { console.error(e); process.exit(1); });
