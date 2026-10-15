import { listObjects } from "./api.ts";

const API = "http://127.0.0.1:3010";

async function post(path: string, body: unknown): Promise<unknown> {
  const response = await fetch(`${API}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`${path} ${response.status} ${text}`);
  return text ? JSON.parse(text) : null;
}

/** 找出可买池在某交易日缺 close/涨跌幅的票 */
export async function findPoolGaps(sessionDate: string): Promise<string[]> {
  const members = await listObjects("/index-constituents?indexId=pool");
  const tickers = members.map((row) => String(row.ticker));
  const missing: string[] = [];
  for (let index = 0; index < tickers.length; index += 50) {
    const batch = tickers.slice(index, index + 50);
    await Promise.all(
      batch.map(async (ticker) => {
        const bars = await listObjects(
          `/daily-bars?ticker=${encodeURIComponent(ticker)}&sessionDate=${encodeURIComponent(sessionDate)}`,
        );
        const bar = bars[0];
        if (bar == null || bar.close == null || bar.changePercent == null) missing.push(ticker);
      }),
    );
  }
  return missing.sort();
}

/** 用上一交易日收盘价写入停牌缺口行（非真实 OHLC） */
export async function fillPoolGaps(sessionDate: string): Promise<string[]> {
  const missing = await findPoolGaps(sessionDate);
  if (missing.length === 0) return [];
  const calendar = (await listObjects("/trading-days"))
    .filter((day) => day.isTradingDay === true)
    .map((day) => String(day.sessionDate))
    .sort();
  const previous = [...calendar].reverse().find((date) => date < sessionDate);
  if (!previous) throw new Error(`没有 ${sessionDate} 的前一交易日`);

  const filled: string[] = [];
  for (const ticker of missing) {
    const prev = await listObjects(
      `/daily-bars?ticker=${encodeURIComponent(ticker)}&sessionDate=${encodeURIComponent(previous)}`,
    );
    const bar = prev[0];
    if (bar == null || bar.close == null) {
      console.warn("skip gap, no previous bar", ticker, previous);
      continue;
    }
    const close = Number(bar.close);
    await post("/daily-bars/batch", {
      pass: "source",
      rows: [
        {
          barId: `${ticker}|${sessionDate}`,
          ticker,
          sessionDate,
          open: close,
          high: close,
          low: close,
          close,
          volume: 0,
          amount: 0,
          changePercent: 0,
          publishedIndustry: bar.publishedIndustry ?? null,
        },
      ],
    });
    await post("/daily-bars", {
      pass: "close",
      barId: `${ticker}|${sessionDate}`,
      ticker,
      sessionDate,
      previousClose: close,
      suspended: true,
    });
    filled.push(ticker);
  }
  return filled;
}
