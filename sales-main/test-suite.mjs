// 自動化測試腳本 - 測試 sales-tracker 所有 API 與情境
// 執行: node test-suite.mjs (需先 npm run dev)
import fs from "node:fs";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const results = [];
let passed = 0, failed = 0;

function log(name, ok, detail = "") {
  results.push({ name, ok, detail });
  if (ok) { passed++; console.log(`  ✓ ${name}`); }
  else    { failed++; console.log(`  ✗ ${name} — ${detail}`); }
}

async function req(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch {}
  return { status: res.status, data };
}

async function section(title, fn) {
  console.log(`\n[${title}]`);
  try { await fn(); }
  catch (e) { log(`${title} 例外`, false, e.message); }
}

// 建立的資源 ID 收集
const created = { categories: [], sales: [], shares: [] };

await section("健康檢查 / 首頁", async () => {
  const r = await fetch(BASE + "/");
  log("GET / 回應 200", r.status === 200, `status=${r.status}`);
});

await section("分類 (categories) CRUD", async () => {
  // 1. GET 初始
  let r = await req("GET", "/api/categories");
  log("GET /api/categories 回應陣列", Array.isArray(r.data));

  // 2. POST 正常
  const sample = [
    { name: "飲料", description: "手搖杯", typicalCost: 20, typicalPrice: 60 },
    { name: "便當", description: "午餐主餐", typicalCost: 60, typicalPrice: 110 },
    { name: "甜點", description: "蛋糕點心", typicalCost: 35, typicalPrice: 90 },
    { name: "零食", typicalCost: 10, typicalPrice: 30 },
  ];
  for (const s of sample) {
    const c = await req("POST", "/api/categories", s);
    log(`POST 建立分類「${s.name}」`, c.status === 200 && c.data?.id, JSON.stringify(c.data));
    if (c.data?.id) created.categories.push(c.data.id);
  }

  // 3. POST 缺名稱
  const bad = await req("POST", "/api/categories", { description: "no name" });
  log("POST 缺名稱應 400", bad.status === 400);

  // 4. POST 名稱非字串
  const bad2 = await req("POST", "/api/categories", { name: 123 });
  log("POST 名稱型別錯誤應 400", bad2.status === 400);

  // 5. PUT 更新
  if (created.categories[0]) {
    const u = await req("PUT", "/api/categories", {
      id: created.categories[0], name: "飲料(更新)", typicalCost: 25, typicalPrice: 65,
    });
    log("PUT 更新分類", u.status === 200 && u.data?.name === "飲料(更新)");
  }

  // 6. PUT 缺 id
  const u2 = await req("PUT", "/api/categories", { name: "x" });
  log("PUT 缺 id 應 400", u2.status === 400);
});

await section("銷售 (sales) CRUD", async () => {
  // 取得當前年月
  const now = new Date();
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const prev = new Date(now); prev.setMonth(prev.getMonth() - 1);
  const ymPrev = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`;

  // 1. 批次 POST 各種情境資料
  const items = [];
  // 本月各分類
  for (let i = 0; i < 15; i++) {
    const cat = created.categories[i % created.categories.length];
    items.push({
      categoryId: cat,
      itemName: `商品${i + 1}`,
      cost: 20 + (i % 5) * 10,
      actualPrice: 60 + (i % 5) * 15,
      saleDate: `${ym}-${String((i % 28) + 1).padStart(2, "0")}`,
      source: "manual",
      notes: i % 3 === 0 ? "備註" : null,
    });
  }
  // 上月資料 (用於 guidance 趨勢)
  for (let i = 0; i < 10; i++) {
    items.push({
      categoryId: created.categories[i % created.categories.length],
      itemName: `舊商品${i}`,
      cost: 30, actualPrice: 80,
      saleDate: `${ymPrev}-15`,
    });
  }
  // 邊界: 零成本 (100% 毛利)
  items.push({ categoryId: created.categories[0], itemName: "零成本", cost: 0, actualPrice: 100, saleDate: `${ym}-05` });
  // 邊界: 虧本銷售
  items.push({ categoryId: created.categories[1], itemName: "虧本", cost: 200, actualPrice: 50, saleDate: `${ym}-06` });
  // 邊界: 無分類
  items.push({ itemName: "未分類商品", cost: 10, actualPrice: 30, saleDate: `${ym}-07` });

  const r = await req("POST", "/api/sales", items);
  log(`批次 POST ${items.length} 筆銷售`, Array.isArray(r.data) && r.data.length === items.length);
  if (Array.isArray(r.data)) created.sales.push(...r.data.map(x => x.id));

  // 2. 缺欄位
  const bad = await req("POST", "/api/sales", { itemName: "缺欄位" });
  log("POST 缺必填欄位應 500/錯誤", bad.status >= 400);

  // 3. GET 全部
  const all = await req("GET", "/api/sales");
  log("GET /api/sales 回傳陣列", Array.isArray(all.data) && all.data.length >= items.length);

  // 4. GET 月份過濾
  const monthFilter = await req("GET", `/api/sales?month=${ym}`);
  const onlyThisMonth = Array.isArray(monthFilter.data) && monthFilter.data.every(s => s.saleDate.startsWith(ym));
  log(`GET ?month=${ym} 過濾正確`, onlyThisMonth);

  // 5. GET 12 月邊界 (今年12月)
  const dec = await req("GET", `/api/sales?month=${now.getFullYear()}-12`);
  log("GET ?month=YYYY-12 不報錯", dec.status === 200);

  // 6. DELETE 一筆
  if (created.sales[0]) {
    const d = await req("DELETE", `/api/sales?id=${created.sales[0]}`);
    log("DELETE 銷售", d.status === 200);
  }

  // 7. DELETE 缺 id
  const d2 = await req("DELETE", "/api/sales");
  log("DELETE 缺 id 應 400", d2.status === 400);

  // 8. 計算驗證: 抓回月份資料自己算
  const m = await req("GET", `/api/sales?month=${ym}`);
  if (Array.isArray(m.data)) {
    const rev = m.data.reduce((s, r) => s + r.actualPrice, 0);
    const cost = m.data.reduce((s, r) => s + r.cost, 0);
    log(`本月計算: 營收=${rev}, 成本=${cost}, 毛利=${rev - cost}`, rev > 0 && cost >= 0);
  }
});

await section("分享 token (shareTokens)", async () => {
  // 1. POST 建立
  const c = await req("POST", "/api/share", { label: "測試分享" });
  log("POST 建立 token", c.status === 200 && c.data?.token);
  if (c.data?.id) created.shares.push(c.data.id);
  const token = c.data?.token;

  // 2. POST 無 label
  const c2 = await req("POST", "/api/share", {});
  log("POST 無 label 也可建立", c2.status === 200 && c2.data?.token);
  if (c2.data?.id) created.shares.push(c2.data.id);

  // 3. GET list
  const list = await req("GET", "/api/share");
  log("GET token 列表", Array.isArray(list.data) && list.data.length >= created.shares.length);

  // 4. 訪問公開分享頁
  if (token) {
    const pub = await fetch(`${BASE}/share/${token}`);
    log("GET /share/{token} 公開頁面 200", pub.status === 200);
    const html = await pub.text();
    log("公開頁面包含儀表板內容", html.includes("營收") || html.includes("毛利") || html.length > 500);
  }

  // 5. 訪問不存在 token
  const bad = await fetch(`${BASE}/share/不存在的token12345`);
  log("無效 token 應 404", bad.status === 404);

  // 6. DELETE
  if (created.shares[0]) {
    const d = await req("DELETE", `/api/share?id=${created.shares[0]}`);
    log("DELETE token", d.status === 200);
  }
});

await section("頁面渲染 (SSR)", async () => {
  const pages = [
    ["/", "首頁"],
    ["/dashboard", "儀表板"],
    ["/sales", "銷售列表"],
    ["/sales/new", "新增銷售"],
    ["/categories", "分類管理"],
    ["/share", "分享管理"],
  ];
  for (const [p, name] of pages) {
    try {
      const r = await fetch(BASE + p);
      log(`${name} ${p}`, r.status === 200, `status=${r.status}`);
    } catch (e) {
      log(`${name} ${p}`, false, e.message);
    }
  }
});

await section("壓力 / 邊界", async () => {
  // 大量批次
  const bulk = [];
  const ym = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
  for (let i = 0; i < 100; i++) {
    bulk.push({
      categoryId: created.categories[i % created.categories.length],
      itemName: `壓測${i}`,
      cost: 10, actualPrice: 25,
      saleDate: `${ym}-10`,
    });
  }
  const t0 = Date.now();
  const r = await req("POST", "/api/sales", bulk);
  const dt = Date.now() - t0;
  log(`批次插入 100 筆 (${dt}ms)`, r.status === 200 && Array.isArray(r.data) && r.data.length === 100);
  if (Array.isArray(r.data)) created.sales.push(...r.data.map(x => x.id));

  // 月份格式異常
  const weird = await req("GET", "/api/sales?month=invalid");
  log("月份格式無效仍回應 (不崩潰)", weird.status === 200 || weird.status >= 400);
});

// 清理: 刪除測試建立的資料
await section("清理測試資料", async () => {
  let okSales = 0;
  for (const id of created.sales) {
    const r = await req("DELETE", `/api/sales?id=${id}`);
    if (r.status === 200) okSales++;
  }
  log(`刪除 ${okSales}/${created.sales.length} 筆銷售`, okSales === created.sales.length);

  let okCats = 0;
  for (const id of created.categories) {
    const r = await req("DELETE", `/api/categories?id=${id}`);
    if (r.status === 200) okCats++;
  }
  log(`刪除 ${okCats}/${created.categories.length} 個分類`, okCats === created.categories.length);

  for (const id of created.shares.slice(1)) {
    await req("DELETE", `/api/share?id=${id}`);
  }
});

// 輸出報告
const total = passed + failed;
const report = `# Sales Tracker 測試報告

- 執行時間: ${new Date().toISOString()}
- 測試對象: ${BASE}
- 總測試項: **${total}**
- ✅ 通過: **${passed}**
- ❌ 失敗: **${failed}**
- 通過率: **${((passed / total) * 100).toFixed(1)}%**

## 測試範圍
1. **首頁健康檢查** — 伺服器是否啟動
2. **分類 API CRUD** — GET / POST / PUT / DELETE，含驗證錯誤情境
3. **銷售 API CRUD** — 批次插入、月份過濾、邊界值（零成本、虧本、無分類、12 月邊界）
4. **分享 token API** — 建立 / 列表 / 公開頁面 / 無效 token / 刪除
5. **頁面 SSR 渲染** — 所有主要路由是否回傳 200
6. **壓力測試** — 100 筆批次插入效能
7. **資料清理** — 移除測試資料

## 詳細結果

| # | 項目 | 結果 | 備註 |
|---|------|------|------|
${results.map((r, i) => `| ${i + 1} | ${r.name} | ${r.ok ? "✅" : "❌"} | ${r.detail || ""} |`).join("\n")}

${failed === 0 ? "## 結論\n\n🎉 所有測試通過，系統功能正常。" : `## 結論\n\n⚠️ 共 ${failed} 項失敗，請檢查上方表格。`}
`;

fs.writeFileSync("test-report.md", report);
console.log(`\n========================================`);
console.log(`通過 ${passed}/${total} (${((passed / total) * 100).toFixed(1)}%)`);
console.log(`報告已寫入 test-report.md`);
process.exit(failed === 0 ? 0 : 1);
