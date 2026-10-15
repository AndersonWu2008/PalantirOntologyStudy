import { listObjects } from "./api.ts";
import { confirmBuys, confirmSells } from "./actions.ts";
import { lotShares, runClosePipeline, runOpenPipeline } from "./close-pipeline.ts";

const accountId = "acct-1";
const tradeDate = "2026-05-19";

async function main(): Promise<void> {
  const closed = await runClosePipeline(accountId, tradeDate, `${tradeDate}T08:00:00+08:00`);
  const sells = await listObjects(`/sell-lines?arrangementId=${encodeURIComponent(String(closed.arrangementId))}`);
  const buys = await listObjects(`/buy-lines?arrangementId=${encodeURIComponent(String(closed.arrangementId))}`);
  const account = (await listObjects("/accounts")).find((row) => row.accountId === accountId);
  const assets = Number(account?.totalAssets ?? 0);
  console.log("close", JSON.stringify({
    tradeDate,
    closeDate: closed.closeDate,
    regime: closed.regime,
    entryGate: closed.entryGate,
    selectionMissing: closed.selectionMissing,
    header: closed.header,
    sells: sells.map((line) => ({ ticker: line.ticker, reason: line.reason, quantity: line.plannedQuantity, limit: line.plannedLimitPrice })),
    buys: buys.map((line) => {
      const close = Number(line.plannedLimitPrice);
      const weight = closed.regime === "高波动" || closed.regime === "牛市趋势" ? 0.2 : 0.1;
      return {
        ticker: line.ticker,
        rank: line.rank,
        quantity: line.plannedQuantity,
        limit: line.plannedLimitPrice,
        sharesMatch: line.plannedQuantity === lotShares(assets, weight, close),
      };
    }),
  }));

  const opened = await runOpenPipeline(accountId, tradeDate, `${tradeDate}T09:26:00+08:00`);
  console.log("open", JSON.stringify(opened));
  if (opened.header !== "还没写下委托") {
    console.log("stop", "页首不是还没写下委托，不提交 Action");
    return;
  }
  if (sells.length > 0) {
    console.log("confirmSells", JSON.stringify(await confirmSells(accountId, tradeDate, `${tradeDate}T09:26:00+08:00`, "交易员")));
  }
  if (buys.length > 0) {
    console.log("confirmBuys", JSON.stringify(await confirmBuys(accountId, tradeDate, `${tradeDate}T09:26:00+08:00`, "交易员")));
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
