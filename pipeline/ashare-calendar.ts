/** 2026 休市。库里或行情里已经出现的日期优先，这份名单只补未来还没印出来的日子。 */
const HOLIDAYS_2026 = new Set([
  "2026-01-01",
  "2026-01-02",
  "2026-01-03",
  "2026-02-16",
  "2026-02-17",
  "2026-02-18",
  "2026-02-19",
  "2026-02-20",
  "2026-02-23",
  "2026-02-24",
  "2026-02-25",
  "2026-02-26",
  "2026-02-27",
  "2026-04-06",
  "2026-05-01",
  "2026-05-04",
  "2026-05-05",
  "2026-06-19",
  "2026-09-25",
  "2026-09-28",
  "2026-09-29",
  "2026-09-30",
  "2026-10-01",
  "2026-10-02",
  "2026-10-05",
  "2026-10-06",
  "2026-10-07",
  "2026-10-08",
  "2026-10-09",
]);

export function shiftCalendarDays(isoDate: string, delta: number): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + delta);
  return date.toISOString().slice(0, 10);
}

export function shanghaiParts(now = new Date()): { day: string; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const read = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  const day = `${read("year")}-${read("month")}-${read("day")}`;
  return { day, minutes: Number(read("hour")) * 60 + Number(read("minute")) };
}

function weekday(isoDate: string): number {
  return new Date(`${isoDate}T00:00:00Z`).getUTCDay();
}

export function isTradingDay(isoDate: string, observed: ReadonlySet<string>): boolean {
  if (observed.has(isoDate)) return true;
  const day = weekday(isoDate);
  if (day === 0 || day === 6) return false;
  if (HOLIDAYS_2026.has(isoDate)) return false;
  return true;
}

export function previousTradingDay(isoDate: string, observed: ReadonlySet<string>): string {
  let cursor = shiftCalendarDays(isoDate, -1);
  for (let step = 0; step < 24; step += 1) {
    if (isTradingDay(cursor, observed)) return cursor;
    cursor = shiftCalendarDays(cursor, -1);
  }
  throw new Error(`没有 ${isoDate} 的前一交易日`);
}

export function nextTradingDay(isoDate: string, observed: ReadonlySet<string>): string {
  let cursor = shiftCalendarDays(isoDate, 1);
  for (let step = 0; step < 24; step += 1) {
    if (isTradingDay(cursor, observed)) return cursor;
    cursor = shiftCalendarDays(cursor, 1);
  }
  throw new Error(`没有 ${isoDate} 的下一交易日`);
}

/** 不到 15:00 的交易日：计划日是今天，行情用前一交易日。其余：计划日是下一交易日，行情用刚收完的那一天。 */
export function decidePlan(
  today: string,
  minutes: number,
  observed: ReadonlySet<string>,
): { planDate: string; barDate: string } {
  if (isTradingDay(today, observed) && minutes < 15 * 60) {
    return { planDate: today, barDate: previousTradingDay(today, observed) };
  }
  const closed = isTradingDay(today, observed) ? today : previousTradingDay(today, observed);
  return { planDate: nextTradingDay(closed, observed), barDate: closed };
}
