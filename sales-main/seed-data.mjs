// 寫入擬真的展示資料 (不會清理) - 讓網站有實際內容可以看
const BASE = process.env.BASE_URL || "http://localhost:3000";

async function req(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, data: await res.json().catch(() => null) };
}

console.log("正在寫入展示資料...\n");

// 1. 建立分類
const categoryDefs = [
  { name: "手搖飲料", description: "茶飲、奶茶系列", typicalCost: 18, typicalPrice: 55 },
  { name: "咖啡", description: "美式、拿鐵、特調", typicalCost: 25, typicalPrice: 75 },
  { name: "便當", description: "雞腿、排骨、素食便當", typicalCost: 55, typicalPrice: 110 },
  { name: "輕食", description: "三明治、沙拉、貝果", typicalCost: 35, typicalPrice: 85 },
  { name: "甜點", description: "蛋糕、塔類、布丁", typicalCost: 30, typicalPrice: 95 },
  { name: "零食", description: "餅乾、洋芋片", typicalCost: 12, typicalPrice: 35 },
  { name: "麵包", description: "吐司、菠蘿、可頌", typicalCost: 15, typicalPrice: 45 },
];

const cats = [];
for (const c of categoryDefs) {
  const r = await req("POST", "/api/categories", c);
  if (r.data?.id) {
    cats.push(r.data);
    console.log(`  ✓ 分類: ${c.name}`);
  }
}

// 2. 建立 3 個月的擬真銷售
const itemPool = {
  "手搖飲料": ["珍珠奶茶", "四季春", "金萱拿鐵", "百香雙響炮", "冬瓜檸檬"],
  "咖啡": ["美式咖啡", "拿鐵", "卡布奇諾", "焦糖瑪奇朵", "摩卡"],
  "便當": ["招牌雞腿便當", "排骨便當", "魯肉飯", "三寶飯", "素食便當"],
  "輕食": ["火腿三明治", "凱薩沙拉", "鮪魚貝果", "雞肉捲餅"],
  "甜點": ["草莓蛋糕", "起司塔", "焦糖布丁", "提拉米蘇", "馬卡龍"],
  "零食": ["洋芋片", "蘇打餅乾", "巧克力棒"],
  "麵包": ["奶油吐司", "菠蘿麵包", "巧克力可頌", "紅豆麵包"],
};

const now = new Date();
const sales = [];
let rng = 42;
const rand = () => { rng = (rng * 9301 + 49297) % 233280; return rng / 233280; };

// 過去 90 天的資料
for (let day = 0; day < 90; day++) {
  const d = new Date(now);
  d.setDate(d.getDate() - day);
  const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  // 每天 5~15 筆
  const count = 5 + Math.floor(rand() * 11);
  for (let i = 0; i < count; i++) {
    const cat = cats[Math.floor(rand() * cats.length)];
    const items = itemPool[cat.name] || ["商品"];
    const item = items[Math.floor(rand() * items.length)];

    // 偶爾出現異常數據增加真實感
    let cost = cat.typicalCost + Math.floor((rand() - 0.5) * 10);
    let price = cat.typicalPrice + Math.floor((rand() - 0.5) * 20);

    // 5% 機率打折
    if (rand() < 0.05) price = Math.floor(price * 0.7);
    // 2% 機率虧本（過期出清）
    if (rand() < 0.02) price = Math.floor(cost * 0.8);

    sales.push({
      categoryId: cat.id,
      itemName: item,
      cost: Math.max(1, cost),
      actualPrice: Math.max(1, price),
      saleDate: dateStr,
      source: "manual",
    });
  }
}

console.log(`\n  正在插入 ${sales.length} 筆銷售資料...`);
// 分批插入避免超時
const chunkSize = 200;
let inserted = 0;
for (let i = 0; i < sales.length; i += chunkSize) {
  const chunk = sales.slice(i, i + chunkSize);
  const r = await req("POST", "/api/sales", chunk);
  if (Array.isArray(r.data)) inserted += r.data.length;
}
console.log(`  ✓ 已插入 ${inserted} 筆`);

// 3. 建立 1 個分享 token
const share = await req("POST", "/api/share", { label: "對外展示" });
console.log(`\n  ✓ 建立分享連結: ${BASE}/share/${share.data?.token}`);

// 4. 統計概覽
const allSales = await req("GET", "/api/sales");
const totalRev = allSales.data.reduce((s, r) => s + r.actualPrice, 0);
const totalCost = allSales.data.reduce((s, r) => s + r.cost, 0);
const profit = totalRev - totalCost;
const margin = ((profit / totalRev) * 100).toFixed(1);

console.log(`\n========== 實際表現 ==========`);
console.log(`  分類數: ${cats.length}`);
console.log(`  銷售筆數: ${allSales.data.length}`);
console.log(`  總營收: $${totalRev.toLocaleString()}`);
console.log(`  總成本: $${totalCost.toLocaleString()}`);
console.log(`  總毛利: $${profit.toLocaleString()}`);
console.log(`  整體毛利率: ${margin}%`);
console.log(`\n  打開瀏覽器查看: ${BASE}/dashboard`);
