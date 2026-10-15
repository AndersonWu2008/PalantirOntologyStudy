import { listObjects } from "./api.ts";
import { confirmSells, reportFill } from "./actions.ts";
import { runClosePipeline, runOpenPipeline } from "./close-pipeline.ts";
import { fillPoolGaps, findPoolGaps } from "./pool-gaps.ts";

const sellDate = "2026-05-21";
const nextDate = "2026-05-22";

async function main(): Promise<void> {
  const confirmed = await confirmSells("acct-1", sellDate, `${sellDate}T09:26:00+08:00`, "交易员");
  console.log("CONFIRM_SELLS", JSON.stringify(confirmed));

  const orders = await listObjects("/sell-orders");
  const ours = orders.filter((order) => String(order.orderId).includes(`${sellDate}|2`));
  if (ours.length === 0) throw new Error("没有 05-21|2 的卖出委托");

  for (const order of ours) {
    const parts = String(order.sellLineId).split("|");
    const ticker = parts[parts.length - 1];
    const filled = await reportFill({
      orderId: String(order.orderId),
      side: "卖出",
      price: Number(order.limitPrice),
      quantity: Number(order.quantity),
      sessionDate: sellDate,
      actor: "交易员",
    });
    console.log("FILL_SELL", JSON.stringify({ ticker, price: order.limitPrice, quantity: order.quantity, ...filled }));
  }

  const closeDate = "2026-05-21";
  const before = await findPoolGaps(closeDate);
  console.log("GAPS_BEFORE", before);
  const filledGaps = await fillPoolGaps(closeDate);
  console.log("GAPS_FILLED", filledGaps);

  const closed = await runClosePipeline("acct-1", nextDate, `${nextDate}T08:00:00+08:00`);
  const sells = await listObjects(`/sell-lines?arrangementId=${encodeURIComponent(String(closed.arrangementId))}`);
  const buys = await listObjects(`/buy-lines?arrangementId=${encodeURIComponent(String(closed.arrangementId))}`);
  console.log(
    "CLOSE_0522",
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

  if (String(closed.entryGate) === "缺少" || closed.selectionMissing === true) {
    console.log("retry after gaps still missing?", await findPoolGaps(closeDate));
  }

  const opened = await runOpenPipeline("acct-1", nextDate, `${nextDate}T09:26:00+08:00`);
  console.log("OPEN_0522", JSON.stringify(opened));

  const positions = await listObjects("/positions?accountId=acct-1");
  console.log(
    "POSITIONS",
    JSON.stringify(
      positions.map((row) => ({
        ticker: row.ticker,
        quantity: row.quantity,
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
