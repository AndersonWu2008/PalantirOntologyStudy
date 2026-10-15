import { listObjects } from "./api.ts";
import { confirmSells, reportFill } from "./actions.ts";
import { runClosePipeline, runOpenPipeline } from "./close-pipeline.ts";
import { fillPoolGaps, findPoolGaps } from "./pool-gaps.ts";

const sellDate = "2026-05-22";
const nextDate = "2026-05-23";

async function main(): Promise<void> {
  const confirmed = await confirmSells("acct-1", sellDate, `${sellDate}T09:26:00+08:00`, "交易员");
  console.log("CONFIRM_SELLS", JSON.stringify(confirmed));

  const orders = await listObjects("/sell-orders");
  const ours = orders.filter((order) => String(order.orderId).includes(`${sellDate}|1`));
  if (ours.length === 0) throw new Error("没有 05-22|1 的卖出委托");

  for (const order of ours) {
    const ticker = String(order.sellLineId).split("|").pop();
    const filled = await reportFill({
      orderId: String(order.orderId),
      side: "卖出",
      price: Number(order.limitPrice),
      quantity: Number(order.quantity),
      sessionDate: sellDate,
      actor: "交易员",
    });
    console.log("FILL_SELL", JSON.stringify({ ticker, ...filled }));
  }

  const closeDate = "2026-05-22";
  console.log("GAPS", await findPoolGaps(closeDate));
  console.log("FILLED_GAPS", await fillPoolGaps(closeDate));

  const closed = await runClosePipeline("acct-1", nextDate, `${nextDate}T08:00:00+08:00`);
  const sells = await listObjects(`/sell-lines?arrangementId=${encodeURIComponent(String(closed.arrangementId))}`);
  const buys = await listObjects(`/buy-lines?arrangementId=${encodeURIComponent(String(closed.arrangementId))}`);
  console.log(
    "CLOSE_0523",
    JSON.stringify({
      ...closed,
      sells: sells.map((line) => ({ ticker: line.ticker, reason: line.reason })),
      buys: buys.map((line) => ({ ticker: line.ticker, rank: line.rank })),
    }),
  );
  console.log("OPEN_0523", JSON.stringify(await runOpenPipeline("acct-1", nextDate, `${nextDate}T09:26:00+08:00`)));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
