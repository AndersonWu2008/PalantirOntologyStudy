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

async function fillGap(): Promise<void> {
  const existing = await listObjects("/daily-bars?ticker=600360.SH&sessionDate=2026-05-19");
  if (existing.length > 0) {
    console.log("gap already filled");
    return;
  }
  const prev = await listObjects("/daily-bars?ticker=600360.SH&sessionDate=2026-05-18");
  const bar = prev[0];
  if (!bar) throw new Error("no 2026-05-18 bar for 600360.SH");
  const close = Number(bar.close);
  await post("/daily-bars/batch", {
    pass: "source",
    rows: [
      {
        barId: "600360.SH|2026-05-19",
        ticker: "600360.SH",
        sessionDate: "2026-05-19",
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
    barId: "600360.SH|2026-05-19",
    ticker: "600360.SH",
    sessionDate: "2026-05-19",
    previousClose: close,
    suspended: true,
  });
  console.log("filled 600360.SH|2026-05-19 from previous close (suspended gap)");
}

async function main(): Promise<void> {
  await fillGap();
  const tradeDate = "2026-05-20";
  const closed = await runClosePipeline("acct-1", tradeDate, `${tradeDate}T08:00:00+08:00`);
  const sells = await listObjects(`/sell-lines?arrangementId=${encodeURIComponent(String(closed.arrangementId))}`);
  const buys = await listObjects(`/buy-lines?arrangementId=${encodeURIComponent(String(closed.arrangementId))}`);
  console.log(
    "CLOSE",
    JSON.stringify({
      ...closed,
      sells: sells.map((line) => ({ ticker: line.ticker, reason: line.reason, quantity: line.plannedQuantity })),
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
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
