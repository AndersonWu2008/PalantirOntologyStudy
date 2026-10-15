import { execSync } from "node:child_process";
import { postObject, listObjects, getObject } from "./api.ts";
import { cents, lotShares, recordFill, runClosePipeline, runOpenPipeline } from "./close-pipeline.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function weekdayDates(start: string, count: number): string[] {
  const dates: string[] = [];
  const cursor = new Date(`${start}T00:00:00Z`);
  while (dates.length < count) {
    const day = cursor.getUTCDay();
    if (day !== 0 && day !== 6) dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
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

function resetDatabase(): void {
  execSync(
    `docker exec stock_ontology psql -U ontology -d stock_ontology -c "DELETE FROM sell_order; DELETE FROM buy_order; DELETE FROM sell_line; DELETE FROM buy_line; DELETE FROM signal; DELETE FROM pre_open_arrangement; DELETE FROM fill; DELETE FROM position; DELETE FROM daily_bar; DELETE FROM index_constituent; DELETE FROM strategy_excluded_stock; DELETE FROM account; DELETE FROM strategy; DELETE FROM trading_day; DELETE FROM stock; DELETE FROM industry; DELETE FROM tradable_range;"`,
    { stdio: "ignore" },
  );
}

const strategy = {
  strategyId: "v44",
  displayName: "V44",
  universeIndexId: "pool",
  breadthMin: 0.45,
  regimeMinPersistDays: 2,
  exitOnRegimeFlip: true,
  priceMin: 10,
  priceMax: 20,
  maxPerIndustry: 2,
  limitUpCountMin: 0,
  consecutiveLimitDownDays: 2,
  limitDownPercent: -9.5,
  limitUpCountPercent: 9.5,
  chinextLimitUpPercent: 19.5,
  mainLimitUpPercent: 9.5,
  bullStopLoss: 0,
  bullTrailingActivate: 0.04,
  bullTrailingStop: 0.03,
  bullMaxHoldDays: 7,
  bullMaxPositions: 5,
  bullSinglePositionPct: 0.2,
  bullMinScore: 0,
  bullAtrMultiple: 2,
  highVolStopLoss: 0,
  highVolTrailingActivate: 0.03,
  highVolTrailingStop: 0.025,
  highVolMaxHoldDays: 5,
  highVolMaxPositions: 5,
  highVolSinglePositionPct: 0.2,
  highVolMinScore: 0,
  highVolAtrMultiple: 2,
  sidewaysStopLoss: 0,
  sidewaysTrailingActivate: 0.02,
  sidewaysTrailingStop: 0.02,
  sidewaysMaxHoldDays: 3,
  sidewaysMaxPositions: 2,
  sidewaysSinglePositionPct: 0.1,
  sidewaysMinScore: 0.7,
  sidewaysAtrMultiple: 1.5,
  bearMaxPositions: 0,
  maShort: 20,
  maMid: 60,
  maLong: 120,
  adxBullMin: 0.15,
  adxBearMin: 0.1,
  risingRatioBull: 0.5,
  risingRatioBear: 0.45,
  volWindow: 20,
  volPercentileHigh: 0.8,
  limitDownBearRatio: 0.03,
  amountMaWindow: 20,
  amountShrinkWarn: 0.3,
  minHistoryDays: 60,
  indexLookback: 252,
  limitUpOverheat: 0.05,
  limitUpIce: 0.01,
};

async function masters(tickers: string[]): Promise<void> {
  await postObject("/tradable-ranges", { indexId: "pool", displayName: "可买范围" });
  await postObject("/strategies", strategy);
  await postObject("/accounts", {
    pass: "snapshot",
    accountId: "acct-1",
    displayName: "主账户",
    availableCash: 500000,
    totalAssets: 1000000,
  });
  await postObject("/accounts", { pass: "enable", accountId: "acct-1", enabledStrategyId: "v44" });
  for (const ticker of tickers) {
    await postObject("/stocks", { ticker, displayName: ticker, isSt: false, board: "主板" });
    await postObject("/industries", { industryId: `ind-${ticker}`, displayName: ticker });
    await postObject("/index-constituents", { indexId: "pool", ticker });
  }
}

async function calendars(dates: string[]): Promise<void> {
  await pool(dates, 8, async (sessionDate) => {
    await postObject("/trading-days", { pass: "calendar", sessionDate, isTradingDay: true });
  });
}

async function risingBars(ticker: string, dates: string[], industry: string): Promise<number> {
  let price = 12;
  for (const sessionDate of dates) {
    const previous = price;
    price = cents(price * 1.002);
    await postObject("/daily-bars", {
      pass: "close",
      barId: `${ticker}|${sessionDate}`,
      ticker,
      sessionDate,
      high: price,
      low: previous,
      close: price,
      volume: 100000,
      changePercent: Number((((price - previous) / previous) * 100).toFixed(4)),
      previousClose: previous,
      publishedIndustry: industry,
      suspended: false,
    });
  }
  return price;
}

async function case1And5And2(): Promise<void> {
  const dates = weekdayDates("2025-06-02", 141);
  const history = dates.slice(0, 140);
  const tradeDate = dates[140];
  const names = Array.from({ length: 11 }, (_, index) => `60000${index + 1}.SH`.replace("6000010.SH", "600010.SH").replace("6000011.SH", "600011.SH"));
  const held = "600036.SH";
  const tickers = [...names, held];
  await masters(tickers);
  await calendars(dates);
  const closes = new Map<string, number>();
  await pool(names, 4, async (ticker) => {
    closes.set(ticker, await risingBars(ticker, history, `ind-${ticker}`));
  });
  let heldPrice = 15.2;
  for (let index = 0; index < history.length; index += 1) {
    const sessionDate = history[index];
    const previous = heldPrice;
    const last = index === history.length - 1;
    heldPrice = last ? 14.5 : 15.2;
    await postObject("/daily-bars", {
      pass: "close",
      barId: `${held}|${sessionDate}`,
      ticker: held,
      sessionDate,
      high: last ? 15 : 15.2,
      low: heldPrice,
      close: heldPrice,
      volume: 100000,
      changePercent: Number((((heldPrice - previous) / previous) * 100).toFixed(4)),
      previousClose: previous,
      publishedIndustry: `ind-${held}`,
      suspended: false,
    });
  }
  const entryDate = history[history.length - 5];
  await postObject("/positions", {
    pass: "book",
    positionId: "pos-1",
    accountId: "acct-1",
    ticker: held,
    quantity: 1000,
    sellableQuantity: 1000,
  });
  await postObject("/positions", {
    pass: "entry",
    positionId: "pos-1",
    entryPrice: 16,
    entryDate,
    atrAtEntry: 0.5,
    regimeAtEntry: "牛市趋势",
    highSinceEntry: 16.2,
    daysHeld: 0,
    entryFieldsMissing: false,
  });
  const closed = await runClosePipeline("acct-1", tradeDate, `${tradeDate}T08:00:00+08:00`);
  const sellLines = await listObjects(`/sell-lines?arrangementId=${encodeURIComponent(String(closed.arrangementId))}`);
  const buyLines = await listObjects(`/buy-lines?arrangementId=${encodeURIComponent(String(closed.arrangementId))}`);
  assert(closed.entryGate === "允许", `开仓门应允许，实际 ${String(closed.entryGate)} 制度 ${String(closed.regime)}`);
  assert(closed.selectionMissing === false, "齐全时不应写不出来");
  assert(sellLines.length === 1, `应有一行卖出，实际 ${sellLines.length}`);
  assert(sellLines[0].reason === "止损", `卖出原因应为止损，实际 ${String(sellLines[0].reason)}`);
  assert(sellLines[0].plannedQuantity === 1000, "卖出股数应为持仓股数");
  assert(sellLines[0].plannedLimitPrice === 15, `止损限价应为 15，实际 ${String(sellLines[0].plannedLimitPrice)}`);
  assert(buyLines.length === 4, `已持有 1 只、上限 5，应再买 4 只，实际 ${buyLines.length}`);
  for (const line of buyLines) {
    const close = closes.get(String(line.ticker));
    assert(close != null, "买入行没有对应收盘");
    assert(line.plannedLimitPrice === cents(close), `${String(line.ticker)} 计划限价应等于收盘`);
    assert(line.plannedQuantity === lotShares(1000000, 0.2, close), `${String(line.ticker)} 计划股数没有按单只占比取整手`);
    assert(line.ticker !== held, "已持有的股票不应再买");
  }
  console.log("1 齐全且开仓门打开：卖出限价 15，买入 4 行与收盘复算一致");

  for (const ticker of tickers) {
    const previous = ticker === held ? 14.5 : closes.get(ticker);
    assert(previous != null, "缺少前收");
    const limitDown = cents(previous * 0.9);
    const open = ticker === held ? limitDown : previous;
    await postObject("/daily-bars", {
      pass: "open",
      barId: `${ticker}|${tradeDate}`,
      ticker,
      sessionDate: tradeDate,
      open,
      suspended: false,
    });
    await postObject("/daily-bars", {
      pass: "close",
      barId: `${ticker}|${tradeDate}`,
      ticker,
      sessionDate: tradeDate,
      previousClose: previous,
    });
  }
  await runOpenPipeline("acct-1", tradeDate, `${tradeDate}T09:26:00+08:00`);
  const opened = await getObject(`/sell-lines/${encodeURIComponent(`${closed.arrangementId}|${held}`)}`);
  assert(opened.reason === "止损", "跌停后原因被改掉了");
  assert(opened.outcome === "跌停今天不报", `跌停应今天不报，实际 ${String(opened.outcome)}`);
  assert(opened.submitLimitPrice == null, "跌停不应写成排队限价");
  assert(opened.plannedLimitPrice === 15, "计划限价应留着对照");
  console.log("5 开盘跌停：今天不报，原因仍是止损，没有跌停价");

  await postObject("/stocks", { ticker: "600099.SH", displayName: "缺收盘", isSt: false, board: "主板" });
  await postObject("/industries", { industryId: "ind-600099.SH", displayName: "缺收盘" });
  await postObject("/index-constituents", { indexId: "pool", ticker: "600099.SH" });
  const incomplete = await runClosePipeline("acct-1", tradeDate, `${tradeDate}T08:00:00+08:00`);
  const incompleteSells = await listObjects(`/sell-lines?arrangementId=${encodeURIComponent(String(incomplete.arrangementId))}`);
  const incompleteBuys = await listObjects(`/buy-lines?arrangementId=${encodeURIComponent(String(incomplete.arrangementId))}`);
  assert(incomplete.header === "没做完", `缺收盘页首应为没做完，实际 ${String(incomplete.header)}`);
  assert(incompleteSells.length === 0 && incompleteBuys.length === 0, "缺收盘不应写出可以确认的行");
  console.log("2 缺一只收盘：页首没做完，没有买卖行");
}

async function case3(): Promise<void> {
  resetDatabase();
  const dates = weekdayDates("2025-06-02", 71);
  const history = dates.slice(0, 70);
  const tradeDate = dates[70];
  const tickers = Array.from({ length: 12 }, (_, index) => `600${100 + index}.SH`);
  await masters(tickers);
  await calendars(dates);
  await pool(tickers, 4, async (ticker) => {
    let price = 15;
    for (let index = 0; index < history.length; index += 1) {
      const sessionDate = history[index];
      const previous = price;
      const last = index === history.length - 1;
      price = last ? cents(previous * 0.9) : cents(previous * 1.001);
      await postObject("/daily-bars", {
        pass: "close",
        barId: `${ticker}|${sessionDate}`,
        ticker,
        sessionDate,
        high: Math.max(previous, price),
        low: Math.min(previous, price),
        close: price,
        volume: 100000,
        changePercent: last ? -10 : Number((((price - previous) / previous) * 100).toFixed(4)),
        previousClose: previous,
        publishedIndustry: `ind-${ticker}`,
        suspended: false,
      });
    }
  });
  const closed = await runClosePipeline("acct-1", tradeDate, `${tradeDate}T08:00:00+08:00`);
  const buyLines = await listObjects(`/buy-lines?arrangementId=${encodeURIComponent(String(closed.arrangementId))}`);
  assert(closed.entryGate === "关闭", `跌停占比过高时应关闭开仓，实际 ${String(closed.entryGate)} 制度 ${String(closed.regime)}`);
  assert(closed.selectionMissing === false, "开仓门关闭不是没做完");
  assert(closed.header !== "没做完", `关闭开仓的页首不应是没做完，实际 ${String(closed.header)}`);
  assert(buyLines.length === 0, "开仓门关闭不应有买入行");
  console.log("3 开仓门关闭：没有买入行，页首不是没做完");
}

async function case4(): Promise<void> {
  resetDatabase();
  const dates = weekdayDates("2026-09-01", 11);
  const history = dates.slice(0, 10);
  const tradeDate = dates[10];
  const ticker = "600036.SH";
  await masters([ticker]);
  await calendars(dates);
  for (const sessionDate of history) {
    await postObject("/daily-bars", {
      pass: "close",
      barId: `${ticker}|${sessionDate}`,
      ticker,
      sessionDate,
      high: 16,
      low: 15,
      close: 15.5,
      volume: 100000,
      changePercent: 0.2,
      previousClose: 15.4,
      publishedIndustry: `ind-${ticker}`,
      suspended: false,
    });
  }
  await postObject("/positions", {
    pass: "book",
    positionId: "pos-1",
    accountId: "acct-1",
    ticker,
    quantity: 1000,
    sellableQuantity: 1000,
  });
  await postObject("/fills", {
    fillId: "fill-1",
    accountId: "acct-1",
    ticker,
    sessionDate: history[history.length - 1],
    side: "买入",
    price: 15.5,
    quantity: 1000,
    positionId: "pos-1",
  });
  await recordFill("fill-1");
  const position = await getObject("/positions/pos-1");
  assert(position.entryFieldsMissing === true, "入场日没有 ATR 时应记下缺少");
  const closed = await runClosePipeline("acct-1", tradeDate, `${tradeDate}T08:00:00+08:00`);
  const again = await getObject("/positions/pos-1");
  const sellLines = await listObjects(`/sell-lines?arrangementId=${encodeURIComponent(String(closed.arrangementId))}`);
  assert(again.exitState === "缺少", `下一轮退出应为缺少，实际 ${String(again.exitState)}`);
  assert(sellLines.length === 0, "缺少退出判定不应写出卖出行");
  assert(closed.header === "没做完", `页首应为没做完，实际 ${String(closed.header)}`);
  console.log("4 入场日没有 ATR：退出缺少，页首没做完");
}

async function main(): Promise<void> {
  resetDatabase();
  await case1And5And2();
  await case3();
  await case4();
  resetDatabase();
  console.log("五笔验收通过");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
