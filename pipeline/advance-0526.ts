/**
 * 05-25：两笔买入均为今天不买（涨停 / 限价买不进），无卖出行 → 不 Confirm* / ReportFill。
 * 推进：补 05-25 池缺口 → 组 05-26 收盘页 → 开盘。
 */
import { listObjects } from "./api.ts";
import { runClosePipeline, runOpenPipeline } from "./close-pipeline.ts";
import { fillPoolGaps, findPoolGaps } from "./pool-gaps.ts";

const priorDate = "2026-05-25";
const nextDate = "2026-05-26";

async function main(): Promise<void> {
  const page = (await listObjects(`/arrangements?accountId=acct-1&sessionDate=${priorDate}`)).find(
    (row) => !String(row.header).includes("已作废"),
  );
  if (!page) throw new Error(`没有 ${priorDate} 安排`);
  const buys = await listObjects(`/buy-lines?arrangementId=${encodeURIComponent(String(page.arrangementId))}`);
  const sells = await listObjects(`/sell-lines?arrangementId=${encodeURIComponent(String(page.arrangementId))}`);
  console.log(
    "PRIOR_0525",
    JSON.stringify({
      arrangementId: page.arrangementId,
      header: page.header,
      sells: sells.map((line) => ({ ticker: line.ticker, outcome: line.outcome, reason: line.reason })),
      buys: buys.map((line) => ({ ticker: line.ticker, outcome: line.outcome })),
    }),
  );

  const writableBuys = buys.filter((line) => line.outcome === "可写入委托");
  const writableSells = sells.filter((line) =>
    ["可写入委托", "挂涨停价", "卖掉可卖的其余今天卖不掉"].includes(String(line.outcome ?? "")),
  );
  if (writableBuys.length > 0 || writableSells.length > 0) {
    throw new Error("05-25 仍有可写入委托，应先 Confirm*/ReportFill，不要直接推进");
  }

  console.log("GAPS_BEFORE", await findPoolGaps(priorDate));
  console.log("GAPS_FILLED", await fillPoolGaps(priorDate));
  console.log("GAPS_AFTER", await findPoolGaps(priorDate));

  const closed = await runClosePipeline("acct-1", nextDate, `${nextDate}T08:00:00+08:00`);
  const nextSells = await listObjects(`/sell-lines?arrangementId=${encodeURIComponent(String(closed.arrangementId))}`);
  const nextBuys = await listObjects(`/buy-lines?arrangementId=${encodeURIComponent(String(closed.arrangementId))}`);
  console.log(
    "CLOSE_0526",
    JSON.stringify({
      arrangementId: closed.arrangementId,
      header: closed.header,
      entryGate: closed.entryGate,
      selectionMissing: closed.selectionMissing,
      sells: nextSells.map((line) => ({
        ticker: line.ticker,
        reason: line.reason,
        quantity: line.plannedQuantity,
        limit: line.plannedLimitPrice,
      })),
      buys: nextBuys.map((line) => ({
        ticker: line.ticker,
        rank: line.rank,
        quantity: line.plannedQuantity,
        limit: line.plannedLimitPrice,
      })),
    }),
  );

  const opened = await runOpenPipeline("acct-1", nextDate, `${nextDate}T09:26:00+08:00`);
  console.log("OPEN_0526", JSON.stringify(opened));

  const openBuys = await listObjects(`/buy-lines?arrangementId=${encodeURIComponent(String(opened.arrangementId))}`);
  const openSells = await listObjects(`/sell-lines?arrangementId=${encodeURIComponent(String(opened.arrangementId))}`);
  console.log(
    "OPEN_LINES",
    JSON.stringify({
      sells: openSells.map((line) => ({ ticker: line.ticker, outcome: line.outcome, reason: line.reason })),
      buys: openBuys.map((line) => ({ ticker: line.ticker, outcome: line.outcome })),
    }),
  );

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
        })),
    ),
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
