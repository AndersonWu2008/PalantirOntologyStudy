import { listObjects } from "./api.ts";
import { runClosePipeline, runOpenPipeline } from "./close-pipeline.ts";

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

async function fillGap(ticker: string, sessionDate: string): Promise<void> {
  const existing = await listObjects(`/daily-bars?ticker=${encodeURIComponent(ticker)}&sessionDate=${sessionDate}`);
  if (existing.length > 0 && existing[0].close != null && existing[0].changePercent != null) {
    console.log("gap already filled", ticker, sessionDate);
    return;
  }
  const calendar = (await listObjects("/trading-days"))
    .filter((day) => day.isTradingDay === true)
    .map((day) => String(day.sessionDate))
    .sort();
  const previous = [...calendar].reverse().find((date) => date < sessionDate);
  if (!previous) throw new Error(`no previous day before ${sessionDate}`);
  const prev = await listObjects(`/daily-bars?ticker=${encodeURIComponent(ticker)}&sessionDate=${previous}`);
  const bar = prev[0];
  if (!bar || bar.close == null) throw new Error(`no previous bar for ${ticker} on ${previous}`);
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
  console.log("filled", `${ticker}|${sessionDate}`, "from", previous);
}

async function main(): Promise<void> {
  await fillGap("000608.SZ", "2026-05-20");
  const tradeDate = "2026-05-21";
  const closed = await runClosePipeline("acct-1", tradeDate, `${tradeDate}T08:00:00+08:00`);
  const sells = await listObjects(`/sell-lines?arrangementId=${encodeURIComponent(String(closed.arrangementId))}`);
  const buys = await listObjects(`/buy-lines?arrangementId=${encodeURIComponent(String(closed.arrangementId))}`);
  console.log(
    "CLOSE",
    JSON.stringify({
      ...closed,
      sells: sells.map((line) => ({
        ticker: line.ticker,
        reason: line.reason,
        quantity: line.plannedQuantity,
        limit: line.plannedLimitPrice,
      })),
      buys: buys.map((line) => ({
        ticker: line.ticker,
        rank: line.rank,
        quantity: line.plannedQuantity,
        limit: line.plannedLimitPrice,
      })),
    }),
  );
  const opened = await runOpenPipeline("acct-1", tradeDate, `${tradeDate}T09:26:00+08:00`);
  console.log("OPEN", JSON.stringify(opened));
  const positions = await listObjects("/positions?accountId=acct-1");
  console.log(
    "POSITIONS",
    JSON.stringify(
      positions.map((row) => ({
        ticker: row.ticker,
        daysHeld: row.daysHeld,
        exitState: row.exitState,
        exitReason: row.exitReason,
      })),
    ),
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
