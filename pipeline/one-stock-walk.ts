import { readFileSync } from "node:fs";
import { getObject, listObjects, postObject } from "./api.ts";
import { runClosePipeline } from "./close-pipeline.ts";

type BarRow = {
  sessionDate: string;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  volume: number | null;
  amount: number | null;
  changePercent: number | null;
  publishedIndustry: string | null;
};

const file = JSON.parse(readFileSync("/tmp/one-stock-000007.json", "utf8")) as {
  ticker: string;
  displayName: string;
  board: string;
  isSt: boolean;
  rows: BarRow[];
};

const ticker = file.ticker;
const tradeDate = "2026-10-12";
const closeDate = "2026-10-09";

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

function present(value: number | null): number | undefined {
  return value == null ? undefined : value;
}

async function main(): Promise<void> {
  const industries = [...new Set(file.rows.map((row) => row.publishedIndustry).filter((label): label is string => label != null))];
  await postObject("/stocks", { ticker, displayName: file.displayName, isSt: file.isSt, board: file.board });
  for (const label of industries) {
    await postObject("/industries", { industryId: label, displayName: label });
  }
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
  await postObject("/index-constituents", { indexId: "pool", ticker });

  const dates = [...new Set(file.rows.map((row) => row.sessionDate)), tradeDate];
  await pool(dates, 8, async (sessionDate) => {
    await postObject("/trading-days", { pass: "calendar", sessionDate, isTradingDay: true });
  });
  await pool(file.rows, 8, async (row) => {
    const barId = `${ticker}|${row.sessionDate}`;
    await postObject("/daily-bars", {
      pass: "open",
      barId,
      ticker,
      sessionDate: row.sessionDate,
      open: present(row.open),
    });
    await postObject("/daily-bars", {
      pass: "close",
      barId,
      ticker,
      sessionDate: row.sessionDate,
      high: present(row.high),
      low: present(row.low),
      close: present(row.close),
      volume: present(row.volume),
      amount: present(row.amount),
      changePercent: present(row.changePercent),
      publishedIndustry: row.publishedIndustry ?? undefined,
    });
  });

  const saved = await getObject(`/daily-bars/${encodeURIComponent(`${ticker}|${closeDate}`)}`);
  const count = await listObjects(`/daily-bars?ticker=${encodeURIComponent(ticker)}`);
  console.log("saved", ticker, "bars", count.length, "last", JSON.stringify({
    sessionDate: saved.sessionDate,
    open: saved.open,
    high: saved.high,
    low: saved.low,
    close: saved.close,
    volume: saved.volume,
    amount: saved.amount,
    changePercent: saved.changePercent,
    publishedIndustry: saved.publishedIndustry,
    domain: saved.domain,
  }));

  const page = await runClosePipeline("acct-1", tradeDate, `${tradeDate}T08:00:00+08:00`);
  const day = await getObject(`/trading-days/${encodeURIComponent(closeDate)}`);
  const bar = await getObject(`/daily-bars/${encodeURIComponent(`${ticker}|${closeDate}`)}`);
  const sells = await listObjects(`/sell-lines?arrangementId=${encodeURIComponent(String(page.arrangementId))}`);
  const buys = await listObjects(`/buy-lines?arrangementId=${encodeURIComponent(String(page.arrangementId))}`);
  console.log("close", JSON.stringify({
    tradeDate,
    closeDate,
    regime: day.regime,
    indexClose: day.indexClose,
    breadth: day.breadth,
    entryGate: day.entryGate,
    selectionMissing: day.selectionMissing,
    header: page.header,
    ma20: bar.ma20,
    atr14: bar.atr14,
    comparisonScore: bar.comparisonScore,
    sellLines: sells.length,
    buyLines: buys.length,
  }));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
