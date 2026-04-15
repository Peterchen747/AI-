import Database from "better-sqlite3";
import path from "path";

const db = new Database(path.join(process.cwd(), "sales-tracker.db"));
db.pragma("foreign_keys = ON");

// Clean up existing data
db.exec(`
  DELETE FROM sales;
  DELETE FROM screenshots;
  DELETE FROM import_batches;
  DELETE FROM items;
  DELETE FROM categories;
  DELETE FROM share_tokens;
`);

const categories = [
  { name: "飲料", description: "各式飲品" },
  { name: "甜點", description: "蛋糕、餅乾等" },
  { name: "輕食", description: "三明治、沙拉" },
  { name: "主食", description: "便當、麵類" },
  { name: "周邊商品", description: "杯子、周邊" },
];

const insertCat = db.prepare(
  "INSERT INTO categories (name, description) VALUES (?, ?)"
);
const catIds = categories.map((c) => insertCat.run(c.name, c.description).lastInsertRowid);

const items = [
  { cat: 0, name: "拿鐵咖啡", cost: 35, price: 90 },
  { cat: 0, name: "美式咖啡", cost: 25, price: 70 },
  { cat: 0, name: "手沖咖啡", cost: 50, price: 150 },
  { cat: 0, name: "紅茶拿鐵", cost: 30, price: 85 },
  { cat: 1, name: "草莓蛋糕", cost: 60, price: 150 },
  { cat: 1, name: "提拉米蘇", cost: 70, price: 160 },
  { cat: 1, name: "巧克力餅乾", cost: 15, price: 45 },
  { cat: 2, name: "火腿三明治", cost: 45, price: 110 },
  { cat: 2, name: "凱薩沙拉", cost: 55, price: 140 },
  { cat: 3, name: "雞肉便當", cost: 80, price: 160 },
  { cat: 3, name: "牛肉麵", cost: 90, price: 180 },
  { cat: 4, name: "品牌馬克杯", cost: 120, price: 280 },
];

const insertItem = db.prepare(
  "INSERT INTO items (category_id, name, typical_cost, typical_price) VALUES (?, ?, ?, ?)"
);
const itemRecords = items.map((i) => ({
  id: insertItem.run(catIds[i.cat], i.name, i.cost, i.price).lastInsertRowid,
  ...i,
}));

// Generate sales over the past 60 days
const insertSale = db.prepare(
  "INSERT INTO sales (item_id, cost, actual_price, sale_date, source, notes) VALUES (?, ?, ?, ?, ?, ?)"
);

const today = new Date("2026-04-08");
let salesCount = 0;
for (let d = 0; d < 60; d++) {
  const date = new Date(today);
  date.setDate(date.getDate() - d);
  const dateStr = date.toISOString().slice(0, 10);
  // 3-10 sales per day
  const n = 3 + Math.floor(Math.random() * 8);
  for (let i = 0; i < n; i++) {
    const item = itemRecords[Math.floor(Math.random() * itemRecords.length)];
    // slight price variation
    const priceVar = Math.floor((Math.random() - 0.3) * 20);
    const actualPrice = Math.max(item.cost + 5, item.price + priceVar);
    insertSale.run(item.id, item.cost, actualPrice, dateStr, "manual", null);
    salesCount++;
  }
}

// Share token
db.prepare("INSERT INTO share_tokens (token, label) VALUES (?, ?)").run(
  "test-share-token-abc123",
  "測試分享連結"
);

console.log(`✓ 建立 ${categories.length} 個分類`);
console.log(`✓ 建立 ${items.length} 個商品`);
console.log(`✓ 建立 ${salesCount} 筆銷售紀錄`);
console.log(`✓ 建立 1 個分享 token`);

db.close();
