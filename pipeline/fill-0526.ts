/** ConfirmBuys + ReportFill for 2026-05-26（两笔可写入委托）. */
import { listObjects } from "./api.ts";
import { confirmBuys, reportFill } from "./actions.ts";

const tradeDate = "2026-05-26";
const asOfConfirm = `${tradeDate}T09:26:00+08:00`;

async function main(): Promise<void> {
  const confirmed = await confirmBuys("acct-1", tradeDate, asOfConfirm, "交易员");
  console.log("CONFIRM_BUYS", JSON.stringify(confirmed));

  const orders = await listObjects("/buy-orders");
  const ours = orders.filter(
    (order) => String(order.orderId).includes(`${tradeDate}|1`) && String(order.executionStatus) === "未执行",
  );
  if (ours.length === 0) throw new Error("没有 05-26|1 的待执行买入委托");

  for (const order of ours) {
    const ticker = String(order.buyLineId).split("|").pop();
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

  const positions = await listObjects("/positions?accountId=acct-1");
  console.log(
    "POSITIONS",
    JSON.stringify(
      positions
        .filter((row) => Number(row.quantity) > 0)
        .map((row) => ({
          ticker: row.ticker,
          quantity: row.quantity,
          entryDate: row.entryDate,
          entryPrice: row.entryPrice,
          daysHeld: row.daysHeld,
          exitState: row.exitState,
          atrAtEntry: row.atrAtEntry,
          regimeAtEntry: row.regimeAtEntry,
          entryFieldsMissing: row.entryFieldsMissing,
        })),
    ),
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
