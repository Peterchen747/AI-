/**
 * 單元測試：week-utils 工具函數
 * 驗證 ISO 週次計算與格式化邏輯
 */
import { describe, it, expect } from "vitest";
import { getWeekDateRange, formatWeekRange } from "@/lib/week-utils";

describe("getWeekDateRange — 格式驗證", () => {
  it("無效格式 → null", () => {
    expect(getWeekDateRange("invalid")).toBeNull();
    expect(getWeekDateRange("2026-05")).toBeNull();
    expect(getWeekDateRange("")).toBeNull();
    expect(getWeekDateRange("26-W01")).toBeNull();
  });

  it("有效格式 → 回傳 start/end 物件", () => {
    const result = getWeekDateRange("2026-W15");
    expect(result).not.toBeNull();
    expect(result).toHaveProperty("start");
    expect(result).toHaveProperty("end");
  });
});

describe("getWeekDateRange — 日期正確性", () => {
  it("start 永遠是週一（getUTCDay() === 1）", () => {
    const weeks = ["2026-W01", "2026-W10", "2026-W20", "2026-W52"];
    for (const w of weeks) {
      const r = getWeekDateRange(w);
      expect(r, `${w} 應有結果`).not.toBeNull();
      expect(r!.start.getUTCDay(), `${w} start 應為週一`).toBe(1);
    }
  });

  it("end 永遠是週日（getUTCDay() === 0）", () => {
    const weeks = ["2026-W01", "2026-W10", "2026-W20", "2026-W52"];
    for (const w of weeks) {
      const r = getWeekDateRange(w);
      expect(r!.end.getUTCDay(), `${w} end 應為週日`).toBe(0);
    }
  });

  it("end − start 恰好 6 天", () => {
    const weeks = ["2026-W01", "2026-W15", "2026-W30", "2025-W52"];
    for (const w of weeks) {
      const r = getWeekDateRange(w);
      const diffDays =
        (r!.end.getTime() - r!.start.getTime()) / (1000 * 60 * 60 * 24);
      expect(diffDays, `${w} 應為 6 天`).toBe(6);
    }
  });

  it("2026-W01 從 2025-12-29（週一）開始", () => {
    // 計算：Jan 4 2026 是 Sunday（getUTCDay=0→7），故 W01 週一 = Jan4 - 6 = Dec 29
    const r = getWeekDateRange("2026-W01");
    expect(r!.start.getUTCFullYear()).toBe(2025);
    expect(r!.start.getUTCMonth()).toBe(11); // 12月（0-based）
    expect(r!.start.getUTCDate()).toBe(29);
  });

  it("2026-W19 週四落在 5 月（用於月份歸屬判斷）", () => {
    // W19 start = Dec 29 + 18*7 = May 4, 2026
    // 週四 = May 4 + 3 = May 7 → 仍在 5 月
    const r = getWeekDateRange("2026-W19");
    const thursday = new Date(r!.start);
    thursday.setUTCDate(thursday.getUTCDate() + 3);
    expect(thursday.getUTCMonth() + 1).toBe(5); // 5月
  });

  it("連續週次 end + 1天 = 下一週 start", () => {
    const r15 = getWeekDateRange("2026-W15");
    const r16 = getWeekDateRange("2026-W16");
    const nextDay = new Date(r15!.end);
    nextDay.setUTCDate(nextDay.getUTCDate() + 1);
    expect(nextDay.getTime()).toBe(r16!.start.getTime());
  });
});

describe("formatWeekRange — 格式化輸出", () => {
  it("無效格式直接回傳原字串", () => {
    expect(formatWeekRange("2026-05")).toBe("2026-05");
    expect(formatWeekRange("bad")).toBe("bad");
  });

  it("同月週次格式：M/D - D（結尾只顯示日）", () => {
    // 2026-W20: May 11 - 17（同月）
    const result = formatWeekRange("2026-W20");
    expect(result).toMatch(/^5\/11 - 17$/);
  });

  it("跨月週次格式：M/D - M/D（兩端皆顯示月/日）", () => {
    // 2026-W01: Dec 29 - Jan 4（跨月）
    const result = formatWeekRange("2026-W01");
    expect(result).toMatch(/^12\/29 - 1\/4$/);
  });
});
