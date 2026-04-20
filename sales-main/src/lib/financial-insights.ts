import type { MonthlySummary, CategoryPerformance, WeeklyCostDetail } from "@/lib/calculations";

export type ActionItem = {
  priority: "urgent" | "important" | "optional";
  area: "cost" | "revenue" | "product" | "marketing";
  text: string;
};

export type FinancialInsight = {
  grossMargin: { rate: number; level: "excellent" | "healthy" | "ok" | "warning"; text: string };
  netMargin: { rate: number; level: "excellent" | "healthy" | "warning" | "danger"; text: string };
  indirectCost: { rate: number; level: "ok" | "warning" | "critical"; text: string };
  adCostRatio: { rate: number; level: "ok" | "warning" | "danger"; text: string };
  cogRatio: { rate: number; text: string };
  monthTrend: { revenueChange: number; countChange: number; direction: "up" | "stable" | "down"; text: string };
  concentration: { topCategoryShare: number; level: "low" | "medium" | "high"; topCategory: string; text: string };
  overallHealth: "excellent" | "healthy" | "warning" | "danger";
  topIssue: string;
  actions: ActionItem[];
};

export function generateInsights(
  summary: MonthlySummary,
  prevSummary: MonthlySummary,
  categories: CategoryPerformance[],
  weeklyDetail: WeeklyCostDetail
): FinancialInsight {
  const { revenue, profit, netProfit, weeklyCostsTotal, cost } = summary;

  // 1. 毛利率
  const grossRate = revenue > 0 ? (profit / revenue) * 100 : 0;
  let grossLevel: FinancialInsight["grossMargin"]["level"];
  let grossText: string;
  if (grossRate >= 50) {
    grossLevel = "excellent";
    grossText = `${grossRate.toFixed(1)}%，相當優秀，定價與直接成本控制佳`;
  } else if (grossRate >= 30) {
    grossLevel = "healthy";
    grossText = `${grossRate.toFixed(1)}%，健康水準，仍有提價或降成本空間`;
  } else if (grossRate >= 10) {
    grossLevel = "ok";
    grossText = `${grossRate.toFixed(1)}%，偏低，建議審視進貨成本或調整售價`;
  } else {
    grossLevel = "warning";
    grossText = `${grossRate.toFixed(1)}%，危險！幾乎沒有毛利，立即檢視定價`;
  }

  // 2. 淨利率
  const netRate = revenue > 0 ? (netProfit / revenue) * 100 : 0;
  let netLevel: FinancialInsight["netMargin"]["level"];
  let netText: string;
  if (netRate >= 20) {
    netLevel = "excellent";
    netText = `${netRate.toFixed(1)}%，表現優異，整體營運效益佳`;
  } else if (netRate >= 5) {
    netLevel = "healthy";
    netText = `${netRate.toFixed(1)}%，合理範圍，可繼續優化間接費用`;
  } else if (netRate >= 0) {
    netLevel = "warning";
    netText = `${netRate.toFixed(1)}%，接近損益平衡，間接費用偏高需注意`;
  } else {
    netLevel = "danger";
    netText = `${netRate.toFixed(1)}%，本月虧損，間接費用已超過毛利`;
  }

  // 3. 間接費用佔比
  const indirectRate = revenue > 0 ? (weeklyCostsTotal / revenue) * 100 : 0;
  let indirectLevel: FinancialInsight["indirectCost"]["level"];
  let indirectText: string;
  if (indirectRate < 25) {
    indirectLevel = "ok";
    indirectText = `${indirectRate.toFixed(1)}%，間接費用控制良好`;
  } else if (indirectRate < 40) {
    indirectLevel = "warning";
    indirectText = `${indirectRate.toFixed(1)}%，間接費用偏高，建議逐項審查`;
  } else {
    indirectLevel = "critical";
    indirectText = `${indirectRate.toFixed(1)}%，嚴重偏高！已吃掉大部分毛利`;
  }

  // 4. 廣告費佔比
  const adRate = revenue > 0 ? (weeklyDetail.adCost / revenue) * 100 : 0;
  let adLevel: FinancialInsight["adCostRatio"]["level"];
  let adText: string;
  if (adRate < 15) {
    adLevel = "ok";
    adText = `${adRate.toFixed(1)}%，廣告投放效益佳`;
  } else if (adRate < 30) {
    adLevel = "warning";
    adText = `${adRate.toFixed(1)}%，廣告費偏高，建議優化投放策略`;
  } else {
    adLevel = "danger";
    adText = `${adRate.toFixed(1)}%，過高！每賣 NT$100 有 NT$${adRate.toFixed(0)} 花在廣告`;
  }

  // 5. 直接成本率
  const cogRate = revenue > 0 ? (cost / revenue) * 100 : 0;
  const cogText = `進貨成本佔收入 ${cogRate.toFixed(1)}%`;

  // 6. 月環比趨勢
  const prevRev = prevSummary.revenue;
  const revenueChange = prevRev > 0 ? ((revenue - prevRev) / prevRev) * 100 : 0;
  const countChange =
    prevSummary.count > 0
      ? ((summary.count - prevSummary.count) / prevSummary.count) * 100
      : 0;
  let direction: FinancialInsight["monthTrend"]["direction"];
  let trendText: string;
  if (revenueChange >= 20) {
    direction = "up";
    trendText = `較上月成長 ${revenueChange.toFixed(0)}%，業績明顯上升`;
  } else if (revenueChange >= -10) {
    direction = "stable";
    trendText = `較上月變動 ${revenueChange > 0 ? "+" : ""}${revenueChange.toFixed(0)}%，業績穩定`;
  } else {
    direction = "down";
    trendText = `較上月下滑 ${Math.abs(revenueChange).toFixed(0)}%，需要關注`;
  }

  // 7. 類別集中度
  const topCat = categories[0];
  const topShare = topCat && revenue > 0 ? (topCat.revenue / revenue) * 100 : 0;
  let concLevel: FinancialInsight["concentration"]["level"];
  let concText: string;
  if (topShare < 40) {
    concLevel = "low";
    concText = `類別分散健康，最大類別「${topCat?.categoryName ?? "-"}」佔 ${topShare.toFixed(0)}%`;
  } else if (topShare < 60) {
    concLevel = "medium";
    concText = `「${topCat?.categoryName ?? "-"}」佔比達 ${topShare.toFixed(0)}%，依賴度中等`;
  } else {
    concLevel = "high";
    concText = `「${topCat?.categoryName ?? "-"}」佔比高達 ${topShare.toFixed(0)}%，過度依賴單一類別`;
  }

  // 8. 整體健康度
  let overallHealth: FinancialInsight["overallHealth"];
  if (netLevel === "danger" || grossLevel === "warning" || indirectLevel === "critical") {
    overallHealth = "danger";
  } else if (
    netLevel === "warning" ||
    grossLevel === "ok" ||
    indirectLevel === "warning" ||
    adLevel === "danger"
  ) {
    overallHealth = "warning";
  } else if (netLevel === "excellent" && grossLevel === "excellent") {
    overallHealth = "excellent";
  } else {
    overallHealth = "healthy";
  }

  // topIssue：最嚴重的一句話
  let topIssue: string;
  if (netLevel === "danger") {
    topIssue = "本月淨利為負，間接費用已超過毛利，需立即控制支出";
  } else if (grossLevel === "warning") {
    topIssue = "毛利率極低，定價或進貨成本出現嚴重問題";
  } else if (indirectLevel === "critical") {
    topIssue = "間接費用佔比過高，正在侵蝕獲利";
  } else if (adLevel === "danger") {
    topIssue = "廣告費佔比過高，投放效益需要優化";
  } else if (direction === "down") {
    topIssue = "業績較上月明顯下滑，需要調查原因";
  } else if (concLevel === "high") {
    topIssue = "收入過度集中於單一類別，風險偏高";
  } else if (netLevel === "warning") {
    topIssue = "淨利率接近損益平衡，間接費用偏高";
  } else {
    topIssue = "整體財務狀況良好，持續優化即可";
  }

  // 行動建議
  const actions: ActionItem[] = [];
  const ntd = (n: number) => `NT$${n.toLocaleString("zh-TW")}`;

  if (netLevel === "danger" && adLevel === "danger") {
    actions.push({
      priority: "urgent",
      area: "marketing",
      text: `立即削減廣告預算：本月廣告費 ${ntd(weeklyDetail.adCost)} 佔營收 ${adRate.toFixed(0)}%，建議壓至 15% 以下`,
    });
  }
  if (netLevel === "danger" && indirectLevel === "critical") {
    actions.push({
      priority: "urgent",
      area: "cost",
      text: `逐項審查間接費用：運費 ${ntd(weeklyDetail.shippingCost)}、包材 ${ntd(weeklyDetail.packagingCost)}、其他 ${ntd(weeklyDetail.otherCost)}，找出可削減項目`,
    });
  }
  if (grossLevel === "warning") {
    actions.push({
      priority: "urgent",
      area: "product",
      text: `毛利率僅 ${grossRate.toFixed(1)}%，立即重新審視定價策略或更換供應商降低進貨成本`,
    });
  }
  if (netLevel === "danger" && adLevel !== "danger" && indirectLevel !== "critical") {
    actions.push({
      priority: "urgent",
      area: "cost",
      text: `本月淨利 ${ntd(netProfit)}，建議全面縮減非必要支出，目標讓間接費用降至毛利 ${ntd(profit)} 以下`,
    });
  }
  if (concLevel === "high") {
    actions.push({
      priority: "important",
      area: "product",
      text: `「${topCat?.categoryName}」佔比 ${topShare.toFixed(0)}%，建議積極開發其他品類降低集中度`,
    });
  }
  if (direction === "down" && revenueChange < -10) {
    actions.push({
      priority: "important",
      area: "revenue",
      text: `業績較上月下滑 ${Math.abs(revenueChange).toFixed(0)}%（本月 ${summary.count} 筆 vs 上月 ${prevSummary.count} 筆），建議調查是否為季節性或行銷問題`,
    });
  }
  if (adLevel === "warning") {
    actions.push({
      priority: "important",
      area: "marketing",
      text: `廣告費佔比 ${adRate.toFixed(1)}%，建議 A/B 測試廣告素材，目標將投報率提升 20%`,
    });
  }
  if (grossLevel === "ok") {
    actions.push({
      priority: "important",
      area: "revenue",
      text: `毛利率 ${grossRate.toFixed(1)}% 偏低，可嘗試對熱銷商品小幅調漲 5-10% 測試市場反應`,
    });
  }
  const highMarginCats = categories
    .filter((c) => c.margin > grossRate + 10)
    .slice(0, 2)
    .map((c) => c.categoryName);
  if (highMarginCats.length > 0 && (grossLevel === "healthy" || grossLevel === "excellent")) {
    actions.push({
      priority: "optional",
      area: "revenue",
      text: `高毛利品類「${highMarginCats.join("、")}」值得加大備貨與推廣力道`,
    });
  }
  if (actions.length === 0) {
    actions.push({
      priority: "optional",
      area: "revenue",
      text: "整體財務健康，建議每月持續記錄以建立完整趨勢數據",
    });
  }

  const priorityOrder = { urgent: 0, important: 1, optional: 2 };
  actions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return {
    grossMargin: { rate: grossRate, level: grossLevel, text: grossText },
    netMargin: { rate: netRate, level: netLevel, text: netText },
    indirectCost: { rate: indirectRate, level: indirectLevel, text: indirectText },
    adCostRatio: { rate: adRate, level: adLevel, text: adText },
    cogRatio: { rate: cogRate, text: cogText },
    monthTrend: { revenueChange, countChange, direction, text: trendText },
    concentration: {
      topCategoryShare: topShare,
      level: concLevel,
      topCategory: topCat?.categoryName ?? "-",
      text: concText,
    },
    overallHealth,
    topIssue,
    actions,
  };
}
