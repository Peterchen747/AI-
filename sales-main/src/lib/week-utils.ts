/**
 * 將 ISO 週標籤（例如 "2026-W15"）轉換為該週的週一與週日日期。
 * ISO 週定義：週一為第一天，以 1/4 一定落在第 1 週來定錨。
 */
export function getWeekDateRange(weekLabel: string): { start: Date; end: Date } | null {
  const match = weekLabel.match(/^(\d{4})-W(\d{2})$/);
  if (!match) return null;
  const year = parseInt(match[1], 10);
  const week = parseInt(match[2], 10);

  // Jan 4 一定在第 1 週
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const dow = jan4.getUTCDay() || 7; // 0(Sun)→7，其餘不變
  // 第 1 週的週一
  const week1Mon = new Date(jan4);
  week1Mon.setUTCDate(jan4.getUTCDate() - (dow - 1));

  const monday = new Date(week1Mon);
  monday.setUTCDate(week1Mon.getUTCDate() + (week - 1) * 7);

  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);

  return { start: monday, end: sunday };
}

/** 回傳 "M/D - M/D" 格式的日期區間字串，跨月時兩端都帶月份 */
export function formatWeekRange(weekLabel: string): string {
  const range = getWeekDateRange(weekLabel);
  if (!range) return weekLabel;
  const { start, end } = range;
  const sm = start.getUTCMonth() + 1;
  const sd = start.getUTCDate();
  const em = end.getUTCMonth() + 1;
  const ed = end.getUTCDate();
  const startStr = `${sm}/${sd}`;
  const endStr = sm === em ? `${ed}` : `${em}/${ed}`;
  return `${startStr} - ${endStr}`;
}
