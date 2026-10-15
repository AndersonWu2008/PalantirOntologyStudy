/**
 * 通用日链：补 prior 池缺口 → 收盘组页 → 开盘 → 可选 Confirm* + ReportFill。
 *
 * 用法:
 *   npx tsx pipeline/advance-day.ts --to 2026-05-29
 *   npx tsx pipeline/advance-day.ts --from 2026-05-28 --to 2026-05-29 --fill
 *   npx tsx pipeline/advance-day.ts --from 2026-05-28 --to 2026-05-30 --fill-sells
 *
 * --from/--to：推进开区间 (from, to] 内每个交易日（to 必填；from 默认真 to 的前一交易日）。
 * --fill：可写入卖出与买入都确认并按委托限价回报（学习用；非券商真成交）。
 * --fill-sells / --fill-buys：只做一侧。
 * --dry-run：只跑缺口+收开盘，不提交 Action。
 * --account：默认 acct-1。
 */
import { listObjects } from "./api.ts";
import { confirmBuys, confirmSells, reportFill } from "./actions.ts";
import { runClosePipeline, runOpenPipeline } from "./close-pipeline.ts";
import { fillPoolGaps, findPoolGaps } from "./pool-gaps.ts";

type Args = {
  from?: string;
  to: string;
  accountId: string;
  fillSells: boolean;
  fillBuys: boolean;
  dryRun: boolean;
};

const WRITABLE_SELL = new Set(["可写入委托", "挂涨停价", "卖掉可卖的其余今天卖不掉"]);

function parseArgs(argv: string[]): Args {
  const get = (name: string): string | undefined => {
    const index = argv.indexOf(name);
    if (index < 0) return undefined;
    return argv[index + 1];
  };
  const to = get("--to");
  if (!to) {
    console.error("需要 --to YYYY-MM-DD");
    process.exit(2);
  }
  const fillAll = argv.includes("--fill");
  return {
    from: get("--from"),
    to,
    accountId: get("--account") ?? "acct-1",
    fillSells: fillAll || argv.includes("--fill-sells"),
    fillBuys: fillAll || argv.includes("--fill-buys"),
    dryRun: argv.includes("--dry-run"),
  };
}

async function tradingCalendar(): Promise<string[]> {
  return (await listObjects("/trading-days"))
    .filter((day) => day.isTradingDay === true)
    .map((day) => String(day.sessionDate))
    .sort();
}

function previousTradingDay(calendar: string[], date: string): string {
  const prior = [...calendar].reverse().find((day) => day < date);
  if (!prior) throw new Error(`没有 ${date} 的前一交易日`);
  return prior;
}

function daysInOpenInterval(calendar: string[], fromExclusive: string, toInclusive: string): string[] {
  return calendar.filter((day) => day > fromExclusive && day <= toInclusive);
}

function openPositions(rows: Record<string, unknown>[]) {
  return rows
    .filter((row) => Number(row.quantity) > 0)
    .map((row) => ({
      ticker: row.ticker,
      quantity: row.quantity,
      daysHeld: row.daysHeld,
      exitState: row.exitState,
      exitReason: row.exitReason,
      entryDate: row.entryDate,
    }));
}

async function advanceOneDay(opts: {
  accountId: string;
  tradeDate: string;
  priorDate: string;
  fillSells: boolean;
  fillBuys: boolean;
  dryRun: boolean;
}): Promise<void> {
  const { accountId, tradeDate, priorDate, fillSells, fillBuys, dryRun } = opts;
  const label = tradeDate.replaceAll("-", "").slice(4);

  console.log(`\n=== ADVANCE ${tradeDate} (prior close ${priorDate}) ===`);
  console.log("GAPS_BEFORE", await findPoolGaps(priorDate));
  console.log("GAPS_FILLED", await fillPoolGaps(priorDate));

  const closed = await runClosePipeline(accountId, tradeDate, `${tradeDate}T08:00:00+08:00`);
  const closeSells = await listObjects(`/sell-lines?arrangementId=${encodeURIComponent(String(closed.arrangementId))}`);
  const closeBuys = await listObjects(`/buy-lines?arrangementId=${encodeURIComponent(String(closed.arrangementId))}`);
  console.log(
    `CLOSE_${label}`,
    JSON.stringify({
      arrangementId: closed.arrangementId,
      header: closed.header,
      entryGate: closed.entryGate,
      selectionMissing: closed.selectionMissing,
      sells: closeSells.map((line) => ({
        ticker: line.ticker,
        reason: line.reason,
        quantity: line.plannedQuantity,
        limit: line.plannedLimitPrice,
      })),
      buys: closeBuys.map((line) => ({
        ticker: line.ticker,
        rank: line.rank,
        quantity: line.plannedQuantity,
        limit: line.plannedLimitPrice,
      })),
    }),
  );

  const opened = await runOpenPipeline(accountId, tradeDate, `${tradeDate}T09:26:00+08:00`);
  console.log(`OPEN_${label}`, JSON.stringify(opened));
  const arrangementId = String(opened.arrangementId);

  const openSells = await listObjects(`/sell-lines?arrangementId=${encodeURIComponent(arrangementId)}`);
  const openBuys = await listObjects(`/buy-lines?arrangementId=${encodeURIComponent(arrangementId)}`);
  console.log(
    "OPEN_LINES",
    JSON.stringify({
      sells: openSells.map((line) => ({ ticker: line.ticker, outcome: line.outcome, reason: line.reason })),
      buys: openBuys.map((line) => ({ ticker: line.ticker, outcome: line.outcome })),
    }),
  );

  const writableSells = openSells.filter((line) => WRITABLE_SELL.has(String(line.outcome ?? "")));
  const writableBuys = openBuys.filter((line) => line.outcome === "可写入委托");

  if (dryRun) {
    console.log("DRY_RUN skip Confirm*/ReportFill", {
      writableSells: writableSells.map((line) => line.ticker),
      writableBuys: writableBuys.map((line) => line.ticker),
    });
  } else {
    if (fillSells && writableSells.length > 0) {
      const confirmed = await confirmSells(accountId, tradeDate, `${tradeDate}T09:26:00+08:00`, "交易员");
      console.log("CONFIRM_SELLS", JSON.stringify(confirmed));
      const orders = await listObjects("/sell-orders");
      const ours = orders.filter(
        (order) =>
          String(order.orderId).startsWith(`${arrangementId}|`) && String(order.executionStatus) === "未执行",
      );
      for (const order of ours) {
        const ticker = String(order.sellLineId).split("|").pop();
        const filled = await reportFill({
          orderId: String(order.orderId),
          side: "卖出",
          price: Number(order.limitPrice),
          quantity: Number(order.quantity),
          sessionDate: tradeDate,
          actor: "交易员",
        });
        console.log("FILL_SELL", JSON.stringify({ ticker, price: order.limitPrice, quantity: order.quantity, ...filled }));
      }
    } else if (writableSells.length > 0) {
      console.log("SKIP_SELLS (pass --fill or --fill-sells)", writableSells.map((line) => line.ticker));
    } else {
      console.log("NO_WRITABLE_SELLS");
    }

    if (fillBuys && writableBuys.length > 0) {
      const confirmed = await confirmBuys(accountId, tradeDate, `${tradeDate}T09:26:00+08:00`, "交易员");
      console.log("CONFIRM_BUYS", JSON.stringify(confirmed));
      const orders = await listObjects("/buy-orders");
      const ours = orders.filter(
        (order) =>
          String(order.orderId).startsWith(`${arrangementId}|`) && String(order.executionStatus) === "未执行",
      );
      const account = (await listObjects(`/accounts?accountId=${encodeURIComponent(accountId)}`))[0];
      let cashLeft = Number(account?.availableCash ?? 0);
      for (const order of ours) {
        const ticker = String(order.buyLineId).split("|").pop();
        const price = Number(order.limitPrice);
        const quantity = Number(order.quantity);
        const notional = price * quantity;
        if (!(notional > 0) || cashLeft < notional) {
          console.log("SKIP_BUY_CASH", JSON.stringify({ ticker, price, quantity, cashLeft, notional }));
          continue;
        }
        const filled = await reportFill({
          orderId: String(order.orderId),
          side: "买入",
          price,
          quantity,
          sessionDate: tradeDate,
          actor: "交易员",
        });
        cashLeft = Number(filled.availableCash ?? cashLeft - notional);
        console.log("FILL_BUY", JSON.stringify({ ticker, price, quantity, ...filled }));
      }
    } else if (writableBuys.length > 0) {
      console.log("SKIP_BUYS (pass --fill or --fill-buys)", writableBuys.map((line) => line.ticker));
    } else {
      console.log("NO_WRITABLE_BUYS");
    }
  }

  const positions = await listObjects(`/positions?accountId=${encodeURIComponent(accountId)}`);
  console.log("POSITIONS", JSON.stringify(openPositions(positions)));
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const calendar = await tradingCalendar();
  if (!calendar.includes(args.to)) throw new Error(`${args.to} 不是交易日或不在日历`);

  const fromExclusive = args.from ?? previousTradingDay(calendar, args.to);
  if (args.from && !calendar.includes(args.from) && args.from !== fromExclusive) {
    // allow from to be a trading day that exists
  }
  if (args.from && !calendar.includes(args.from)) {
    throw new Error(`${args.from} 不是交易日或不在日历`);
  }

  const targets = daysInOpenInterval(calendar, fromExclusive, args.to);
  if (targets.length === 0) {
    throw new Error(`(${fromExclusive}, ${args.to}] 内没有交易日可推进`);
  }

  console.log(
    JSON.stringify({
      accountId: args.accountId,
      fromExclusive,
      toInclusive: args.to,
      targets,
      fillSells: args.fillSells,
      fillBuys: args.fillBuys,
      dryRun: args.dryRun,
    }),
  );

  for (const tradeDate of targets) {
    const priorDate = previousTradingDay(calendar, tradeDate);
    await advanceOneDay({
      accountId: args.accountId,
      tradeDate,
      priorDate,
      fillSells: args.fillSells,
      fillBuys: args.fillBuys,
      dryRun: args.dryRun,
    });
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
