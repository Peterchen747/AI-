import { createClient } from "@libsql/client";

const url = process.env.TURSO_CONNECTION_URL ?? "file:./sales-tracker.db";
const authToken = process.env.TURSO_AUTH_TOKEN;

const client = createClient({ url, authToken });

// Must match DEMO_USER_ID in src/lib/mock-session.ts
const DEMO_USER_ID = "demo-user-001";

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDateInMonth(year, month) {
  const daysInMonth = new Date(year, month, 0).getDate();
  const day = randInt(1, daysInMonth);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

// ISO weeks in a given year (52 or 53)
function isoWeeksInYear(year) {
  const jan1Day = new Date(Date.UTC(year, 0, 1)).getUTCDay() || 7;
  const dec31Day = new Date(Date.UTC(year, 11, 31)).getUTCDay() || 7;
  return jan1Day === 4 || dec31Day === 4 ? 53 : 52;
}

async function main() {
  // Ensure demo user exists
  await client.execute(`CREATE TABLE IF NOT EXISTS user (
    id TEXT PRIMARY KEY, name TEXT, email TEXT UNIQUE, emailVerified INTEGER, image TEXT
  )`);
  await client.execute(
    `INSERT OR IGNORE INTO user (id, name, email) VALUES ('${DEMO_USER_ID}', 'Demo 飾品賣家', 'demo@localhost')`
  );

  // Ensure user_id columns exist (may not exist on fresh DB)
  const tables = ["categories", "items", "sales", "purchase_batches", "weekly_costs"];
  for (const table of tables) {
    const info = await client.execute(`PRAGMA table_info(${table})`);
    const has = info.rows.some((r) => r.name === "user_id");
    if (!has) {
      await client.execute(`ALTER TABLE ${table} ADD COLUMN user_id TEXT`);
      console.log(`  + ${table}.user_id`);
    }
  }

  // Clear old seed data for this user
  await client.execute("PRAGMA foreign_keys = OFF");
  for (const table of tables) {
    await client.execute({ sql: `DELETE FROM ${table} WHERE user_id = ?`, args: [DEMO_USER_ID] });
  }
  await client.execute("PRAGMA foreign_keys = ON");
  console.log("清除舊資料完畢");

  // ── 分類（8 個）──
  const categoryNames = ["戒指", "耳環", "項鍊", "手環", "胸針", "髮飾", "腳鍊", "手機殼吊飾"];
  const categoryIds = [];
  for (const name of categoryNames) {
    const r = await client.execute({
      sql: "INSERT INTO categories (user_id, name, is_active) VALUES (?, ?, 1) RETURNING id",
      args: [DEMO_USER_ID, name],
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
        args: [DEMO_USER_ID, categoryIds[ci], name, cost, price],
      });
      itemIds.push({ id: Number(r.rows[0].id), cost, price });
    }
  }
  console.log(`✓ 建立 ${itemIds.length} 個商品`);

  // ── 進貨批次（120 筆）──
  // 前 10 筆強制低庫存（觸發警示）
  const purchaseBatches = [];
  for (let i = 0; i < 120; i++) {
    const item = itemIds[i % itemIds.length];
    const qty = randInt(20, 80);
    const unitCost = Math.round(item.cost * (0.8 + Math.random() * 0.25));
    const totalCost = unitCost * qty;
    const remaining = i < 10 ? randInt(1, 2) : randInt(5, Math.floor(qty * 0.35));
    const year = randInt(2024, 2025);
    const month = randInt(1, 12);
    const date = randomDateInMonth(year, month);
    const r = await client.execute({
      sql: `INSERT INTO purchase_batches (user_id, item_id, purchase_date, total_qty, remaining_qty, total_cost, unit_cost)
            VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id`,
      args: [DEMO_USER_ID, item.id, date, qty, remaining, totalCost, unitCost],
    });
    purchaseBatches.push({ id: Number(r.rows[0].id), itemId: item.id, unitCost, item });
  }
  console.log(`✓ 建立 ${purchaseBatches.length} 筆進貨批次（前 10 筆低庫存）`);

  // ── 月費用（YYYY-W## 格式，2024-W01 ~ 2026-W18）──
  // April 2026 的週（W14-W18）廣告費刻意調高，觸發廣告費警示
  const APRIL_2026_HIGH_AD = new Set(["2026-W14", "2026-W15", "2026-W16", "2026-W17", "2026-W18"]);
  const weeklyLabels = [];
  for (let year = 2024; year <= 2026; year++) {
    const maxWeek = year < 2026 ? isoWeeksInYear(year) : 18;
    for (let week = 1; week <= maxWeek; week++) {
      weeklyLabels.push(`${year}-W${String(week).padStart(2, "0")}`);
    }
  }
  const costStmts = weeklyLabels.map((label) => {
    const isHighAd = APRIL_2026_HIGH_AD.has(label);
    const adCost = isHighAd ? randInt(9000, 12000) : randInt(150, 700);
    const shippingCost = randInt(80, 400);
    const packagingCost = randInt(40, 180);
    const otherCost = randInt(0, 150);
    const totalCost = adCost + shippingCost + packagingCost + otherCost;
    return {
      sql: `INSERT INTO weekly_costs (user_id, week_label, ad_cost, shipping_cost, packaging_cost, other_cost, total_cost)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [DEMO_USER_ID, label, adCost, shippingCost, packagingCost, otherCost, totalCost],
    };
  });
  for (let i = 0; i < costStmts.length; i += 50) {
    await client.batch(costStmts.slice(i, i + 50), "write");
  }
  console.log(`✓ 建立 ${weeklyLabels.length} 筆週費用（W14-W18/2026 廣告費偏高）`);

  // ── 銷售記錄（10,000 筆，按月分配）──
  // May 2024 ~ Mar 2026: 23 個月各 420 筆 = 9,660
  // Apr 2026: 340 筆（模擬本月銷量下滑，觸發月比月警示）
  // 合計: 10,000 筆
  const monthlyPlan = [];
  for (let year = 2024; year <= 2026; year++) {
    const startM = year === 2024 ? 5 : 1;
    const endM = year === 2026 ? 3 : 12;
    for (let month = startM; month <= endM; month++) {
      monthlyPlan.push({ year, month, count: 420 });
    }
  }
  monthlyPlan.push({ year: 2026, month: 4, count: 340 });

  const sources = ["LINE", "IG", "現場", "蝦皮", "Facebook", "朋友介紹"];
  const BATCH_SIZE = 200;
  let totalInserted = 0;

  for (const { year, month, count } of monthlyPlan) {
    let remaining = count;
    while (remaining > 0) {
      const chunk = Math.min(remaining, BATCH_SIZE);
      const stmts = [];
      for (let i = 0; i < chunk; i++) {
        const item = itemIds[randInt(0, itemIds.length - 1)];
        const batch = purchaseBatches[randInt(0, purchaseBatches.length - 1)];
        const date = randomDateInMonth(year, month);
        const qty = randInt(1, 4);
        const priceVar = randInt(-20, 60);
        const actualPrice = Math.max(item.cost + 20, item.price + priceVar);
        const source = sources[randInt(0, sources.length - 1)];
        stmts.push({
          sql: `INSERT INTO sales (user_id, item_id, purchase_batch_id, cost, actual_price, qty, sale_date, source)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [DEMO_USER_ID, item.id, batch.id, item.cost, actualPrice, qty, date, source],
        });
      }
      await client.batch(stmts, "write");
      totalInserted += chunk;
      remaining -= chunk;
      process.stdout.write(`\r  銷售進度：${totalInserted} / 10000`);
    }
  }
  console.log(`\n✓ 建立 ${totalInserted} 筆銷售記錄（橫跨 ${monthlyPlan.length} 個月份）`);
  console.log(`\n✅ 完成！User: ${DEMO_USER_ID}`);
  await client.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
