import { listObjects } from "./api.ts";
import { confirmBuys, reportFill } from "./actions.ts";
import { runClosePipeline, runOpenPipeline } from "./close-pipeline.ts";

const tradeDate = "2026-05-20";
const nextDate = "2026-05-21";
const asOfConfirm = `${tradeDate}T09:26:00+08:00`;

async function main(): Promise<void> {
  const confirmed = await confirmBuys("acct-1", tradeDate, asOfConfirm, "交易员");
  console.log("CONFIRM_BUYS", JSON.stringify(confirmed));

  const orders = await listObjects("/buy-orders");
  const ours = orders.filter((order) => String(order.orderId).includes(`${tradeDate}|2`));
  if (ours.length === 0) throw new Error("没有 05-20|2 的买入委托");

  for (const order of ours) {
    const parts = String(order.buyLineId).split("|");
    const ticker = parts[parts.length - 1];
    const price = Number(order.limitPrice);
    const quantity = Number(order.quantity);
    const filled = await reportFill({
      orderId: String(order.orderId),
      side: "买入",
      price,
      quantity,
      sessionDate: tradeDate,
      actor: "交易员",
    });
    console.log("FILL", JSON.stringify({ ticker, price, quantity, ...filled }));
  }

  const closed = await runClosePipeline("acct-1", nextDate, `${nextDate}T08:00:00+08:00`);
  const sells = await listObjects(`/sell-lines?arrangementId=${encodeURIComponent(String(closed.arrangementId))}`);
  const buys = await listObjects(`/buy-lines?arrangementId=${encodeURIComponent(String(closed.arrangementId))}`);
  console.log(
    "CLOSE_0521",
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

  const opened = await runOpenPipeline("acct-1", nextDate, `${nextDate}T09:26:00+08:00`);
  console.log("OPEN_0521", JSON.stringify(opened));

  const positions = await listObjects("/positions?accountId=acct-1");
  console.log(
    "POSITIONS",
    JSON.stringify(
      positions.map((row) => ({
        ticker: row.ticker,
        quantity: row.quantity,
        entryDate: row.entryDate,
        entryPrice: row.entryPrice,
        daysHeld: row.daysHeld,
        highSinceEntry: row.highSinceEntry,
        exitState: row.exitState,
        exitReason: row.exitReason,
        entryFieldsMissing: row.entryFieldsMissing,
      })),
    ),
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
