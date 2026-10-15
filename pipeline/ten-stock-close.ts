import { readFileSync } from "node:fs";
import { listObjects, postObject } from "./api.ts";
import { runClosePipeline } from "./close-pipeline.ts";

type BarRow = {
  sessionDate: string;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  volume: number | null;
  amount: number | null;
  changePercent: number | null;
  publishedIndustry: string | null;
};

type StockFile = {
  ticker: string;
  displayName: string;
  board: string;
  isSt: boolean;
  rows: BarRow[];
};

const file = JSON.parse(readFileSync("/tmp/ten-stocks-2026-08-18.json", "utf8")) as {
  closeDate: string;
  tradeDate: string;
  stocks: StockFile[];
};

function present(value: number | null): number | undefined {
  return value == null ? undefined : value;
}

async function pool<T>(items: T[], limit: number, task: (item: T) => Promise<void>): Promise<void> {
  let index = 0;
  async function worker(): Promise<void> {
    while (index < items.length) {
      const current = index;
      index += 1;
      await task(items[current]);
    }
  }
  await Promise.all(Array.from({ length: limit }, () => worker()));
}

async function main(): Promise<void> {
  const labels = new Set<string>();
  for (const stock of file.stocks) {
    for (const row of stock.rows) {
      if (row.publishedIndustry) labels.add(row.publishedIndustry);
    }
  }
  for (const label of labels) {
    await postObject("/industries", { industryId: label, displayName: label });
  }
  const bars: { ticker: string; row: BarRow }[] = [];
  for (const stock of file.stocks) {
    await postObject("/stocks", {
      ticker: stock.ticker,
      displayName: stock.displayName,
      isSt: stock.isSt,
      board: stock.board,
    });
    await postObject("/index-constituents", { indexId: "pool", ticker: stock.ticker });
    if (stock.ticker === "000007.SZ") continue;
    for (const row of stock.rows) bars.push({ ticker: stock.ticker, row });
  }
  const dates = [...new Set(file.stocks.flatMap((stock) => stock.rows.map((row) => row.sessionDate))), file.tradeDate];
  await pool(dates, 8, async (sessionDate) => {
    await postObject("/trading-days", { pass: "calendar", sessionDate, isTradingDay: true });
  });
  await pool(bars, 12, async ({ ticker, row }) => {
    const barId = `${ticker}|${row.sessionDate}`;
    await postObject("/daily-bars", {
      pass: "open",
      barId,
      ticker,
      sessionDate: row.sessionDate,
      open: present(row.open),
    });
    await postObject("/daily-bars", {
      pass: "close",
      barId,
      ticker,
      sessionDate: row.sessionDate,
      high: present(row.high),
      low: present(row.low),
      close: present(row.close),
      volume: present(row.volume),
      amount: present(row.amount),
      changePercent: present(row.changePercent),
      publishedIndustry: row.publishedIndustry ?? undefined,
    });
  });
  console.log("synced", file.stocks.map((stock) => stock.ticker).join(","), "new bars", bars.length);

  const page = await runClosePipeline("acct-1", file.tradeDate, `${file.tradeDate}T08:00:00+08:00`);
  const sells = await listObjects(`/sell-lines?arrangementId=${encodeURIComponent(String(page.arrangementId))}`);
  const buys = await listObjects(`/buy-lines?arrangementId=${encodeURIComponent(String(page.arrangementId))}`);
  console.log("close", JSON.stringify({
    tradeDate: file.tradeDate,
    closeDate: page.closeDate,
    regime: page.regime,
    entryGate: page.entryGate,
    selectionMissing: page.selectionMissing,
    header: page.header,
    sellLines: sells.map((line) => ({ ticker: line.ticker, reason: line.reason, plannedQuantity: line.plannedQuantity, plannedLimitPrice: line.plannedLimitPrice })),
    buyLines: buys.map((line) => ({ ticker: line.ticker, rank: line.rank, plannedQuantity: line.plannedQuantity, plannedLimitPrice: line.plannedLimitPrice })),
  }));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
