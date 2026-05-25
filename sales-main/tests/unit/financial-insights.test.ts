/**
 * 單元測試：generateInsights 純函數
 * 驗證所有門檻值判斷邏輯
 */
import { describe, it, expect } from "vitest";
import { generateInsights } from "@/lib/financial-insights";
import type {
  MonthlySummary,
  CategoryPerformance,
  WeeklyCostDetail,
} from "@/lib/calculations";

// ─── 輔助工廠函數 ────────────────────────────────────────────────────────────

function makeSummary(override: Partial<MonthlySummary> = {}): MonthlySummary {
  return {
    month: "2026-05",
    revenue: 2000,
    cost: 600,
    profit: 1400,
    margin: 70,
    count: 10,
    weeklyCostsTotal: 400,
    netProfit: 1000,
    netProfitRate: 50,
    ...override,
  };
}

function makePrev(override: Partial<MonthlySummary> = {}): MonthlySummary {
  return makeSummary({ month: "2026-04", ...override });
}

function makeCats(topShare = 1.0, revenue = 2000): CategoryPerformance[] {
  const topRev = revenue * topShare;
  const rest = revenue - topRev;
  const cats: CategoryPerformance[] = [
    {
      categoryId: 1,
      categoryName: "手環",
      count: 8,
      revenue: topRev,
      cost: topRev * 0.3,
      profit: topRev * 0.7,
      margin: 70,
    },
  ];
  if (rest > 0) {
    cats.push({
      categoryId: 2,
      categoryName: "項鍊",
      count: 2,
      revenue: rest,
      cost: rest * 0.3,
      profit: rest * 0.7,
      margin: 70,
    });
  }
  return cats;
}

function makeDetail(override: Partial<WeeklyCostDetail> = {}): WeeklyCostDetail {
  return {
    adCost: 200,
    shippingCost: 100,
    packagingCost: 50,
    otherCost: 50,
    totalCost: 400,
    ...override,
  };
}

// ═══════════════════════════════════════════════════════════════
// 毛利率門檻
// ═══════════════════════════════════════════════════════════════
describe("毛利率門檻 (grossMargin.level)", () => {
  it("≥ 50% → excellent", () => {
    // 600/1000 = 60%
    const s = makeSummary({ revenue: 1000, cost: 400, profit: 600 });
    const ins = generateInsights(s, makePrev(), makeCats(1, 1000), makeDetail());
    expect(ins.grossMargin.level).toBe("excellent");
    expect(ins.grossMargin.rate).toBeCloseTo(60, 1);
  });

  it("30% ≤ x < 50% → healthy", () => {
    // 380/1000 = 38%
    const s = makeSummary({ revenue: 1000, cost: 620, profit: 380 });
    const ins = generateInsights(s, makePrev(), makeCats(1, 1000), makeDetail());
    expect(ins.grossMargin.level).toBe("healthy");
  });

  it("10% ≤ x < 30% → ok", () => {
    // 200/1000 = 20%
    const s = makeSummary({ revenue: 1000, cost: 800, profit: 200 });
    const ins = generateInsights(s, makePrev(), makeCats(1, 1000), makeDetail());
    expect(ins.grossMargin.level).toBe("ok");
  });

  it("< 10% → warning", () => {
    // 50/1000 = 5%
    const s = makeSummary({ revenue: 1000, cost: 950, profit: 50 });
    const ins = generateInsights(s, makePrev(), makeCats(1, 1000), makeDetail());
    expect(ins.grossMargin.level).toBe("warning");
  });
});

// ═══════════════════════════════════════════════════════════════
// 淨利率門檻
// ═══════════════════════════════════════════════════════════════
describe("淨利率門檻 (netMargin.level)", () => {
  it("≥ 20% → excellent", () => {
    // 250/1000 = 25%
    const s = makeSummary({ revenue: 1000, netProfit: 250 });
    const ins = generateInsights(s, makePrev(), makeCats(1, 1000), makeDetail());
    expect(ins.netMargin.level).toBe("excellent");
    expect(ins.netMargin.rate).toBeCloseTo(25, 1);
  });

  it("5% ≤ x < 20% → healthy", () => {
    // 100/1000 = 10%
    const s = makeSummary({ revenue: 1000, netProfit: 100 });
    const ins = generateInsights(s, makePrev(), makeCats(1, 1000), makeDetail());
    expect(ins.netMargin.level).toBe("healthy");
  });

  it("0% ≤ x < 5% → warning", () => {
    // 30/1000 = 3%
    const s = makeSummary({ revenue: 1000, netProfit: 30 });
    const ins = generateInsights(s, makePrev(), makeCats(1, 1000), makeDetail());
    expect(ins.netMargin.level).toBe("warning");
  });

  it("< 0% → danger", () => {
    // -100/1000 = -10%
    const s = makeSummary({ revenue: 1000, netProfit: -100 });
    const ins = generateInsights(s, makePrev(), makeCats(1, 1000), makeDetail());
    expect(ins.netMargin.level).toBe("danger");
  });
});

// ═══════════════════════════════════════════════════════════════
// 間接費用佔比門檻
// ═══════════════════════════════════════════════════════════════
describe("間接費用佔比門檻 (indirectCost.level)", () => {
  it("< 25% → ok", () => {
    // 200/1000 = 20%
    const s = makeSummary({ revenue: 1000, weeklyCostsTotal: 200 });
    const ins = generateInsights(s, makePrev(), makeCats(1, 1000), makeDetail());
    expect(ins.indirectCost.level).toBe("ok");
    expect(ins.indirectCost.rate).toBeCloseTo(20, 1);
  });

  it("25% ≤ x < 40% → warning", () => {
    // 300/1000 = 30%
    const s = makeSummary({ revenue: 1000, weeklyCostsTotal: 300 });
    const ins = generateInsights(s, makePrev(), makeCats(1, 1000), makeDetail());
    expect(ins.indirectCost.level).toBe("warning");
  });

  it("≥ 40% → critical", () => {
    // 500/1000 = 50%
    const s = makeSummary({ revenue: 1000, weeklyCostsTotal: 500 });
    const ins = generateInsights(s, makePrev(), makeCats(1, 1000), makeDetail());
    expect(ins.indirectCost.level).toBe("critical");
  });
});

// ═══════════════════════════════════════════════════════════════
// 廣告費佔比門檻
// ═══════════════════════════════════════════════════════════════
describe("廣告費佔比門檻 (adCostRatio.level)", () => {
  it("< 15% → ok", () => {
    // 100/1000 = 10%
    const s = makeSummary({ revenue: 1000 });
    const ins = generateInsights(s, makePrev(), makeCats(1, 1000), makeDetail({ adCost: 100 }));
    expect(ins.adCostRatio.level).toBe("ok");
    expect(ins.adCostRatio.rate).toBeCloseTo(10, 1);
  });

  it("15% ≤ x < 30% → warning", () => {
    // 200/1000 = 20%
    const s = makeSummary({ revenue: 1000 });
    const ins = generateInsights(s, makePrev(), makeCats(1, 1000), makeDetail({ adCost: 200 }));
    expect(ins.adCostRatio.level).toBe("warning");
  });

  it("≥ 30% → danger", () => {
    // 350/1000 = 35%
    const s = makeSummary({ revenue: 1000 });
    const ins = generateInsights(s, makePrev(), makeCats(1, 1000), makeDetail({ adCost: 350 }));
    expect(ins.adCostRatio.level).toBe("danger");
  });
});

// ═══════════════════════════════════════════════════════════════
// 月環比趨勢門檻
// ═══════════════════════════════════════════════════════════════
describe("月環比趨勢門檻 (monthTrend.direction)", () => {
  it("成長 ≥ 20% → up", () => {
    // (1300 - 1000) / 1000 = 30%
    const curr = makeSummary({ revenue: 1300, count: 13 });
    const prev = makePrev({ revenue: 1000, count: 10 });
    const ins = generateInsights(curr, prev, makeCats(1, 1300), makeDetail());
    expect(ins.monthTrend.direction).toBe("up");
    expect(ins.monthTrend.revenueChange).toBeCloseTo(30, 1);
  });

  it("−10% ≤ 變動 < +20% → stable", () => {
    // (1050 - 1000) / 1000 = 5%
    const curr = makeSummary({ revenue: 1050 });
    const prev = makePrev({ revenue: 1000 });
    const ins = generateInsights(curr, prev, makeCats(1, 1050), makeDetail());
    expect(ins.monthTrend.direction).toBe("stable");
  });

  it("下滑 > 10% → down", () => {
    // (800 - 1000) / 1000 = -20%
    const curr = makeSummary({ revenue: 800 });
    const prev = makePrev({ revenue: 1000 });
    const ins = generateInsights(curr, prev, makeCats(1, 800), makeDetail());
    expect(ins.monthTrend.direction).toBe("down");
    expect(ins.monthTrend.revenueChange).toBeCloseTo(-20, 1);
  });
});

// ═══════════════════════════════════════════════════════════════
// 類別集中度門檻
// ═══════════════════════════════════════════════════════════════
describe("類別集中度門檻 (concentration.level)", () => {
  it("最大類別 ≥ 60% → high", () => {
    // 單一分類佔 100%
    const s = makeSummary({ revenue: 2000 });
    const ins = generateInsights(s, makePrev(), makeCats(1.0, 2000), makeDetail());
    expect(ins.concentration.level).toBe("high");
    expect(ins.concentration.topCategoryShare).toBeCloseTo(100, 0);
  });

  it("40% ≤ 最大類別 < 60% → medium", () => {
    // 最大類別佔 50%
    const s = makeSummary({ revenue: 2000 });
    const ins = generateInsights(s, makePrev(), makeCats(0.5, 2000), makeDetail());
    expect(ins.concentration.level).toBe("medium");
    expect(ins.concentration.topCategoryShare).toBeCloseTo(50, 0);
  });

  it("最大類別 < 40% → low", () => {
    // 最大類別佔 30%
    const s = makeSummary({ revenue: 2000 });
    const cats: CategoryPerformance[] = [
      { categoryId: 1, categoryName: "手環", count: 3, revenue: 600, cost: 180, profit: 420, margin: 70 },
      { categoryId: 2, categoryName: "項鍊", count: 4, revenue: 800, cost: 240, profit: 560, margin: 70 },
      { categoryId: 3, categoryName: "耳環", count: 3, revenue: 600, cost: 180, profit: 420, margin: 70 },
    ];
    const ins = generateInsights(s, makePrev(), cats, makeDetail());
    expect(ins.concentration.level).toBe("low");
  });
});

// ═══════════════════════════════════════════════════════════════
// 整體健康度組合
// ═══════════════════════════════════════════════════════════════
describe("整體健康度 (overallHealth)", () => {
  it("淨利 excellent + 毛利 excellent → excellent", () => {
    const s = makeSummary({
      revenue: 1000,
      profit: 600,
      netProfit: 300,
      weeklyCostsTotal: 150,
    });
    const ins = generateInsights(s, makePrev(), makeCats(0.3, 1000), makeDetail({ adCost: 80 }));
    expect(ins.overallHealth).toBe("excellent");
  });

  it("淨利 danger → overallHealth danger", () => {
    const s = makeSummary({ revenue: 1000, profit: 600, netProfit: -100, weeklyCostsTotal: 700 });
    const ins = generateInsights(s, makePrev(), makeCats(1, 1000), makeDetail());
    expect(ins.overallHealth).toBe("danger");
  });

  it("毛利 warning（< 10%）→ overallHealth danger", () => {
    const s = makeSummary({ revenue: 1000, profit: 50, netProfit: 10, weeklyCostsTotal: 40 });
    const ins = generateInsights(s, makePrev(), makeCats(1, 1000), makeDetail({ adCost: 30 }));
    expect(ins.overallHealth).toBe("danger");
  });
});

// ═══════════════════════════════════════════════════════════════
// 直接成本率計算
// ═══════════════════════════════════════════════════════════════
describe("直接成本率 (cogRatio)", () => {
  it("進貨成本 400 / 收入 1000 = 40%", () => {
    const s = makeSummary({ revenue: 1000, cost: 400 });
    const ins = generateInsights(s, makePrev(), makeCats(1, 1000), makeDetail());
    expect(ins.cogRatio.rate).toBeCloseTo(40, 1);
    expect(ins.cogRatio.text).toContain("40.0%");
  });
});

// ═══════════════════════════════════════════════════════════════
// 零收入邊界條件
// ═══════════════════════════════════════════════════════════════
describe("零收入邊界條件", () => {
  it("收入為 0 時，所有比率應為 0", () => {
    const s = makeSummary({ revenue: 0, cost: 0, profit: 0, netProfit: 0, weeklyCostsTotal: 0 });
    const ins = generateInsights(s, makePrev(), [], makeDetail({ adCost: 0, totalCost: 0 }));
    expect(ins.grossMargin.rate).toBe(0);
    expect(ins.netMargin.rate).toBe(0);
    expect(ins.indirectCost.rate).toBe(0);
    expect(ins.adCostRatio.rate).toBe(0);
  });
});
