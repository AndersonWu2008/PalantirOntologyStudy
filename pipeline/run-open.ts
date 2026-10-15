import { listObjects } from "./api.ts";
import { runOpenPipeline } from "./close-pipeline.ts";

const accountId = "acct-1";
const tradeDate = "2026-05-19";

async function main(): Promise<void> {
  const opened = await runOpenPipeline(accountId, tradeDate, `${tradeDate}T09:26:00+08:00`);
  const buys = await listObjects(`/buy-lines?arrangementId=${encodeURIComponent(String(opened.arrangementId))}`);
  const sells = await listObjects(`/sell-lines?arrangementId=${encodeURIComponent(String(opened.arrangementId))}`);
  console.log(JSON.stringify({
    ...opened,
    sells: sells.map((line) => ({
      ticker: line.ticker,
      reason: line.reason,
      outcome: line.outcome,
      quantity: line.submitQuantity ?? line.plannedQuantity,
      limit: line.submitLimitPrice ?? line.plannedLimitPrice,
      open: line.openPrice,
    })),
    buys: buys.map((line) => ({
      ticker: line.ticker,
      rank: line.rank,
      outcome: line.outcome,
      quantity: line.submitQuantity ?? line.plannedQuantity,
      limit: line.submitLimitPrice ?? line.plannedLimitPrice,
      open: line.openPrice,
    })),
  }));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
