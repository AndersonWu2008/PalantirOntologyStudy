/**
 * 05-27：门关闭，页首「今天没有要执行的」→ 无 Confirm。
 * 推进：补 05-27 池缺口 → 组 05-28 收盘/开盘；有可写入卖出则确认+回报；可写入买入只打印（需人确认限价）。
 */
import { listObjects } from "./api.ts";
import { confirmBuys, confirmSells, reportFill } from "./actions.ts";
import { runClosePipeline, runOpenPipeline } from "./close-pipeline.ts";
import { fillPoolGaps, findPoolGaps } from "./pool-gaps.ts";

const priorDate = "2026-05-27";
const nextDate = "2026-05-28";

async function main(): Promise<void> {
  console.log("GAPS_BEFORE", await findPoolGaps(priorDate));
  console.log("GAPS_FILLED", await fillPoolGaps(priorDate));

  const closed = await runClosePipeline("acct-1", nextDate, `${nextDate}T08:00:00+08:00`);
  const sells = await listObjects(`/sell-lines?arrangementId=${encodeURIComponent(String(closed.arrangementId))}`);
  const buys = await listObjects(`/buy-lines?arrangementId=${encodeURIComponent(String(closed.arrangementId))}`);
  console.log(
    "CLOSE_0528",
    JSON.stringify({
      arrangementId: closed.arrangementId,
      header: closed.header,
      entryGate: closed.entryGate,
      selectionMissing: closed.selectionMissing,
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
  console.log("OPEN_0528", JSON.stringify(opened));

  const openSells = await listObjects(`/sell-lines?arrangementId=${encodeURIComponent(String(opened.arrangementId))}`);
  const openBuys = await listObjects(`/buy-lines?arrangementId=${encodeURIComponent(String(opened.arrangementId))}`);
  console.log(
    "OPEN_LINES",
    JSON.stringify({
      sells: openSells.map((line) => ({
        ticker: line.ticker,
        outcome: line.outcome,
        reason: line.reason,
      })),
      buys: openBuys.map((line) => ({
        ticker: line.ticker,
        outcome: line.outcome,
      })),
    }),
  );

  const writableSells = openSells.filter((line) =>
    ["可写入委托", "挂涨停价", "卖掉可卖的其余今天卖不掉"].includes(String(line.outcome ?? "")),
  );
  const writableBuys = openBuys.filter((line) => line.outcome === "可写入委托");

  if (writableSells.length > 0) {
    const confirmed = await confirmSells("acct-1", nextDate, `${nextDate}T09:26:00+08:00`, "交易员");
    console.log("CONFIRM_SELLS", JSON.stringify(confirmed));
    const orders = await listObjects("/sell-orders");
    const ours = orders.filter(
      (order) => String(order.orderId).includes(`${nextDate}|`) && String(order.executionStatus) === "未执行",
    );
    for (const order of ours) {
      const ticker = String(order.sellLineId).split("|").pop();
      const filled = await reportFill({
        orderId: String(order.orderId),
        side: "卖出",
        price: Number(order.limitPrice),
        quantity: Number(order.quantity),
        sessionDate: nextDate,
        actor: "交易员",
      });
      console.log("FILL_SELL", JSON.stringify({ ticker, ...filled }));
    }
  } else {
    console.log("NO_WRITABLE_SELLS");
  }

  if (writableBuys.length > 0) {
    const confirmed = await confirmBuys("acct-1", nextDate, `${nextDate}T09:26:00+08:00`, "交易员");
    console.log("CONFIRM_BUYS", JSON.stringify(confirmed));
    const orders = await listObjects("/buy-orders");
    const ours = orders.filter(
      (order) => String(order.orderId).includes(`${nextDate}|`) && String(order.executionStatus) === "未执行",
    );
    for (const order of ours) {
      const ticker = String(order.buyLineId).split("|").pop();
      const filled = await reportFill({
        orderId: String(order.orderId),
        side: "买入",
        price: Number(order.limitPrice),
        quantity: Number(order.quantity),
        sessionDate: nextDate,
        actor: "交易员",
      });
      console.log("FILL_BUY", JSON.stringify({ ticker, price: order.limitPrice, quantity: order.quantity, ...filled }));
    }
  } else {
    console.log("NO_WRITABLE_BUYS");
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
          daysHeld: row.daysHeld,
          exitState: row.exitState,
          exitReason: row.exitReason,
          entryDate: row.entryDate,
        })),
    ),
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
