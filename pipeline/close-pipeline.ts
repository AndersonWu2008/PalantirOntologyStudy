import { api, getObject, listObjects, postObject, stockTradingDomain } from "./api.ts";
import { resolvePack } from "./strategy-packs/index.ts";
import {
  computeHuimaqiangFactors,
  computeHuimaqiangScore,
  selectHuimaqiangBuys,
  type HuimaqiangFactors,
} from "./functions/huimaqiang.ts";

type Bar = Record<string, unknown>;
type Strategy = Record<string, unknown>;

const BULL = "牛市趋势";
const HIGH = "高波动";
const SIDE = "震荡";
const BEAR = "熊市趋势";

export function num(value: unknown): number | null {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function text(value: unknown): string | null {
  if (value == null || value === "") return null;
  return String(value);
}

function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function sampleStd(values: number[]): number | null {
  if (values.length < 2) return null;
  const center = mean(values);
  if (center == null) return null;
  const square = values.reduce((sum, value) => sum + (value - center) ** 2, 0);
  return Math.sqrt(square / (values.length - 1));
}

function populationStd(values: number[]): number | null {
  if (values.length === 0) return null;
  const center = mean(values);
  if (center == null) return null;
  const square = values.reduce((sum, value) => sum + (value - center) ** 2, 0);
  return Math.sqrt(square / values.length);
}

export function cents(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function lotShares(assets: number, weight: number, close: number): number {
  if (!(assets > 0) || !(weight > 0) || !(close > 0)) return 0;
  return Math.floor((weight * assets) / close / 100) * 100;
}

function rankPct(rows: { id: string; value: number | null }[]): Map<string, number> {
  const ranked = rows.filter((row) => row.value != null).sort((left, right) => left.value! - right.value!);
  const scores = new Map<string, number>();
  let index = 0;
  while (index < ranked.length) {
    let end = index;
    while (end < ranked.length && ranked[end].value === ranked[index].value) end += 1;
    const average = (index + 1 + end) / 2;
    for (let cursor = index; cursor < end; cursor += 1) {
      scores.set(ranked[cursor].id, average / ranked.length);
    }
    index = end;
  }
  for (const row of rows) {
    if (!scores.has(row.id)) scores.set(row.id, 0.5);
  }
  return scores;
}

function shanghaiMinutes(asOf: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Shanghai",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(asOf));
  const hour = Number(parts.find((part) => part.type === "hour")?.value);
  const minute = Number(parts.find((part) => part.type === "minute")?.value);
  return hour * 60 + minute;
}

function byTickerDate(bars: Bar[]): Map<string, Bar[]> {
  const grouped = new Map<string, Bar[]>();
  for (const bar of bars) {
    const ticker = text(bar.ticker);
    if (!ticker) continue;
    const list = grouped.get(ticker) ?? [];
    list.push(bar);
    grouped.set(ticker, list);
  }
  for (const list of grouped.values()) {
    list.sort((left, right) => String(left.sessionDate).localeCompare(String(right.sessionDate)));
  }
  return grouped;
}

function trueRange(bar: Bar, previousClose: number | null): number | null {
  const high = num(bar.high);
  const low = num(bar.low);
  if (high == null || low == null || previousClose == null) return null;
  return Math.max(high - low, Math.abs(high - previousClose), Math.abs(low - previousClose));
}

export function computeBarFeatures(history: Bar[]): {
  ma20: number | null;
  atr14: number | null;
  volRatio: number | null;
  aboveMa20: boolean | null;
  volatility: number | null;
  amountZ: number | null;
} {
  const closes = history.map((bar) => num(bar.close));
  const ma20 = closes.length >= 20 && closes.slice(-20).every((value) => value != null)
    ? mean(closes.slice(-20) as number[])
    : null;
  const ranges: number[] = [];
  for (let index = 1; index < history.length; index += 1) {
    const previous = num(history[index].previousClose) ?? num(history[index - 1].close);
    const range = trueRange(history[index], previous);
    if (range == null) {
      ranges.push(Number.NaN);
    } else {
      ranges.push(range);
    }
  }
  const recentRanges = ranges.slice(-14);
  const atr14 = recentRanges.length === 14 && recentRanges.every((value) => Number.isFinite(value))
    ? mean(recentRanges)
    : null;
  const volumes = history.map((bar) => num(bar.volume)).filter((value): value is number => value != null);
  const todayVolume = num(history[history.length - 1].volume);
  const volWindow = history.slice(-5).map((bar) => num(bar.volume)).filter((value): value is number => value != null);
  const volMean = mean(volWindow);
  const volRatio = todayVolume == null || volMean == null || volMean === 0 ? 1 : todayVolume / volMean;
  const close = num(history[history.length - 1].close);
  const aboveMa20 = close != null && ma20 != null ? close > ma20 : null;
  let volatility: number | null = null;
  if (atr14 != null && close != null && close !== 0) volatility = atr14 / close;
  else if (closes.length >= 14 && closes.slice(-14).every((value) => value != null) && close != null && close !== 0) {
    const deviation = sampleStd(closes.slice(-14) as number[]);
    volatility = deviation == null ? null : deviation / close;
  }
  const logs = history.map((bar) => {
    const volume = num(bar.volume);
    const price = num(bar.close);
    if (volume == null || price == null || volume * price <= 0) return null;
    return Math.log(volume * price);
  });
  const recentLogs = logs.slice(-20);
  let amountZ: number | null = null;
  if (recentLogs.length === 20 && recentLogs.every((value) => value != null)) {
    const series = recentLogs as number[];
    const center = mean(series);
    const deviation = sampleStd(series);
    const latest = series[series.length - 1];
    if (center != null && deviation != null && deviation !== 0) amountZ = -(latest - center) / deviation;
  }
  return { ma20, atr14, volRatio: volumes.length === 0 ? 1 : volRatio, aboveMa20, volatility, amountZ };
}

function sleeve(strategy: Strategy, regime: string | null) {
  if (regime === BULL) {
    return {
      stopLoss: num(strategy.bullStopLoss) ?? 0,
      activate: num(strategy.bullTrailingActivate),
      trail: num(strategy.bullTrailingStop),
      maxHold: num(strategy.bullMaxHoldDays),
      maxPositions: num(strategy.bullMaxPositions),
      weight: num(strategy.bullSinglePositionPct),
      minScore: num(strategy.bullMinScore) ?? 0,
      atrMultiple: num(strategy.bullAtrMultiple),
    };
  }
  if (regime === HIGH) {
    return {
      stopLoss: num(strategy.highVolStopLoss) ?? 0,
      activate: num(strategy.highVolTrailingActivate),
      trail: num(strategy.highVolTrailingStop),
      maxHold: num(strategy.highVolMaxHoldDays),
      maxPositions: num(strategy.highVolMaxPositions),
      weight: num(strategy.highVolSinglePositionPct),
      minScore: num(strategy.highVolMinScore) ?? 0,
      atrMultiple: num(strategy.highVolAtrMultiple),
    };
  }
  if (regime === SIDE) {
    return {
      stopLoss: num(strategy.sidewaysStopLoss) ?? 0,
      activate: num(strategy.sidewaysTrailingActivate),
      trail: num(strategy.sidewaysTrailingStop),
      maxHold: num(strategy.sidewaysMaxHoldDays),
      maxPositions: num(strategy.sidewaysMaxPositions),
      weight: num(strategy.sidewaysSinglePositionPct),
      minScore: num(strategy.sidewaysMinScore) ?? 0,
      atrMultiple: num(strategy.sidewaysAtrMultiple),
    };
  }
  return {
    stopLoss: 0,
    activate: null,
    trail: null,
    maxHold: null,
    maxPositions: num(strategy.bearMaxPositions) ?? 0,
    weight: null,
    minScore: null,
    atrMultiple: null,
  };
}

async function context(accountId: string, asOfDate: string) {
  const account = await getObject(`/accounts/${encodeURIComponent(accountId)}`);
  const strategyId = text(account.enabledStrategyId);
  if (!strategyId) throw new Error("账户没有启用的做法");
  const strategy = await getObject(`/strategies/${encodeURIComponent(strategyId)}`);
  const indexId = text(strategy.universeIndexId);
  if (!indexId) throw new Error("做法没有可买范围");
  const members = await listObjects(`/index-constituents?indexId=${encodeURIComponent(indexId)}`);
  const excluded = await listObjects(`/strategy-excluded-stocks?strategyId=${encodeURIComponent(strategyId)}`);
  const tickers = members.map((row) => text(row.ticker)).filter((ticker): ticker is string => ticker != null);
  const universe = new Set(tickers);
  // 回看约 280 自然日（覆盖制度 252 + 因子 60），走瘦身窗口接口
  const from = shiftCalendarDays(asOfDate, -280);
  const bars = (await api(
    "GET",
    `/daily-bars/window?domain=${stockTradingDomain}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(asOfDate)}`,
  )) as Record<string, unknown>[];
  const days = await listObjects("/trading-days");
  const stocks = await listObjects("/stocks");
  const industries = await listObjects("/industries");
  const positions = await listObjects(`/positions?accountId=${encodeURIComponent(accountId)}`);
  return {
    account,
    strategy,
    strategyId,
    tickers: universe,
    excluded: new Set(excluded.map((row) => text(row.ticker)).filter((ticker): ticker is string => ticker != null)),
    bars,
    days: days.filter((day) => day.isTradingDay === true).map((day) => String(day.sessionDate)).sort(),
    stocks,
    industries,
    positions: positions.filter((position) => num(position.quantity) != null && num(position.quantity)! > 0),
  };
}

function shiftCalendarDays(isoDate: string, delta: number): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + delta);
  return date.toISOString().slice(0, 10);
}

function previousDate(days: string[], tradeDate: string): string | null {
  const prior = days.filter((day) => day < tradeDate);
  return prior.length === 0 ? null : prior[prior.length - 1];
}

function requireThresholds(strategy: Strategy): boolean {
  const keys = [
    "maShort", "maMid", "maLong", "adxBullMin", "adxBearMin", "risingRatioBull", "risingRatioBear",
    "volWindow", "volPercentileHigh", "limitDownPercent", "limitUpCountPercent", "limitDownBearRatio",
    "minHistoryDays", "indexLookback", "amountMaWindow", "amountShrinkWarn", "limitUpOverheat", "limitUpIce",
  ];
  return keys.every((key) => num(strategy[key]) != null || key === "limitDownPercent");
}

export function detectRegime(strategy: Strategy, days: string[], grouped: Map<string, Bar[]>, tickers: string[]) {
  const closes: number[] = [];
  const amounts: number[] = [];
  const regimes: { date: string; regime: string | null; breadthInputs: Bar[] }[] = [];
  const written: { date: string; regime: string | null; limitUpRatio: number | null; limitDownRatio: number | null; adx: number | null; risingRatio: number | null; volPercentile: number | null; amountDeviation: number | null; indexClose: number | null; indexVolume: number | null; totalAmount: number | null }[] = [];
  const minHistory = num(strategy.minHistoryDays) ?? 60;
  const lookback = num(strategy.indexLookback) ?? 252;
  for (const date of days) {
    const todays: Bar[] = [];
    for (const ticker of tickers) {
      const bar = (grouped.get(ticker) ?? []).find((item) => String(item.sessionDate) === date);
      if (bar && num(bar.close) != null) todays.push(bar);
    }
    let indexClose: number | null = null;
    let indexVolume: number | null = null;
    let totalAmount: number | null = null;
    if (todays.length >= 10) {
      indexClose = mean(todays.map((bar) => num(bar.close) as number));
      const volumes = todays.map((bar) => num(bar.volume)).filter((value): value is number => value != null);
      indexVolume = mean(volumes);
      const amountValues = todays.map((bar) => num(bar.amount));
      const maxAmount = Math.max(...amountValues.map((value) => value ?? 0));
      if (amountValues.every((value) => value != null) && maxAmount > 0) {
        totalAmount = amountValues.reduce((sum, value) => sum + (value ?? 0), 0);
      } else {
        totalAmount = todays.reduce((sum, bar) => sum + (num(bar.close) ?? 0) * (num(bar.volume) ?? 0), 0);
      }
    }
    if (indexClose != null) closes.push(indexClose);
    if (totalAmount != null) amounts.push(totalAmount);
    const windowCloses = closes.slice(-lookback);
    let regime: string | null = null;
    let adx: number | null = null;
    let risingRatio: number | null = null;
    let volPercentile: number | null = null;
    let limitUpRatio: number | null = null;
    let limitDownRatio: number | null = null;
    let amountDeviation: number | null = null;
    const changes = todays.map((bar) => num(bar.changePercent));
    if (changes.length > 0 && changes.every((value) => value != null)) {
      const upLevel = num(strategy.limitUpCountPercent) ?? 9.5;
      const downLevel = num(strategy.limitDownPercent) ?? -9.5;
      limitUpRatio = changes.filter((value) => (value as number) >= upLevel).length / changes.length;
      limitDownRatio = changes.filter((value) => (value as number) <= downLevel).length / changes.length;
    }
    if (!requireThresholds(strategy) || windowCloses.length < minHistory) {
      regime = null;
    } else {
      const downLimit = num(strategy.limitDownBearRatio) ?? 0.03;
      const maShort = num(strategy.maShort) ?? 20;
      const maMid = num(strategy.maMid) ?? 60;
      const maLong = num(strategy.maLong) ?? 120;
      const ma = (period: number) => windowCloses.length >= period ? mean(windowCloses.slice(-period)) : null;
      const short = ma(maShort);
      const mid = ma(maMid);
      const long = ma(maLong);
      const maBull = short != null && mid != null && long != null && short > mid && mid > long;
      const maBear = short != null && mid != null && long != null && short < mid && mid < long;
      if (windowCloses.length >= 60) {
        const last60 = windowCloses.slice(-60);
        const high = Math.max(...last60);
        const low = Math.min(...last60);
        adx = high > low ? Math.abs(last60[last60.length - 1] - last60[0]) / (high - low) : 0;
      }
      const returns: number[] = [];
      for (let index = 1; index < windowCloses.length; index += 1) {
        const previous = windowCloses[index - 1];
        if (previous !== 0) returns.push((windowCloses[index] - previous) / previous);
      }
      risingRatio = returns.length >= 20 ? returns.slice(-20).filter((value) => value > 0).length / 20 : null;
      const volWindow = num(strategy.volWindow) ?? 20;
      if (returns.length >= volWindow * 2) {
        const current = populationStd(returns.slice(-volWindow));
        const history: number[] = [];
        for (let index = volWindow; index < returns.length; index += 1) {
          const value = populationStd(returns.slice(index - volWindow, index));
          if (value != null) history.push(value);
        }
        volPercentile = current == null || history.length === 0 ? null : history.filter((value) => value < current).length / history.length;
      }
      const amountWindow = num(strategy.amountMaWindow) ?? 20;
      if (amounts.length >= amountWindow) {
        const amountMean = mean(amounts.slice(-amountWindow));
        const latestAmount = amounts[amounts.length - 1];
        amountDeviation = amountMean != null && amountMean !== 0 ? latestAmount / amountMean - 1 : null;
      }
      if (limitDownRatio == null || adx == null || risingRatio == null) regime = null;
      else if (limitDownRatio > downLimit) regime = BEAR;
      else if (maBull && adx > (num(strategy.adxBullMin) ?? 0.15) && risingRatio > (num(strategy.risingRatioBull) ?? 0.5)) regime = BULL;
      else if (maBear && adx > (num(strategy.adxBearMin) ?? 0.1) && risingRatio < (num(strategy.risingRatioBear) ?? 0.45)) regime = BEAR;
      else if (volPercentile != null && volPercentile > (num(strategy.volPercentileHigh) ?? 0.8)) regime = HIGH;
      else if (volPercentile == null && returns.length < volWindow * 2) regime = null;
      else regime = SIDE;
    }
    written.push({ date, regime, limitUpRatio, limitDownRatio, adx, risingRatio, volPercentile, amountDeviation, indexClose, indexVolume, totalAmount });
    regimes.push({ date, regime, breadthInputs: todays });
  }
  return written;
}

function streak(written: { date: string; regime: string | null }[], date: string): number | null {
  const index = written.findIndex((row) => row.date === date);
  if (index < 0 || written[index].regime == null) return null;
  let count = 0;
  for (let cursor = index; cursor >= 0; cursor -= 1) {
    const regime = written[cursor].regime;
    if (regime !== BULL && regime !== HIGH) break;
    count += 1;
  }
  return count;
}

function limitUpThreshold(ticker: string, strategy: Strategy): number {
  return ticker.startsWith("300") || ticker.startsWith("301")
    ? num(strategy.chinextLimitUpPercent) ?? 19.5
    : num(strategy.mainLimitUpPercent) ?? 9.5;
}

export function countLimitUps120(history: Bar[], ticker: string, strategy: Strategy): number | null {
  const window = history.slice(-120);
  const changes = window.map((bar) => num(bar.changePercent));
  if (changes.filter((value) => value != null).length < 20) return null;
  const level = limitUpThreshold(ticker, strategy);
  return changes.filter((value) => value != null && value >= level).length;
}

export function resolvedIndustry(history: Bar[], industries: Bar[]): string | null {
  for (let index = history.length - 1; index >= 0; index -= 1) {
    const label = text(history[index].publishedIndustry);
    if (!label || label === "unknown") continue;
    const match = industries.find((industry) => industry.industryId === label || industry.displayName === label);
    if (match) return String(match.industryId);
  }
  const other = industries.find((industry) => industry.industryId === "其他" || industry.displayName === "其他");
  return other ? "其他" : null;
}

function heldDays(days: string[], entryDate: string, closeDate: string): number {
  return days.filter((day) => day > entryDate && day <= closeDate).length;
}

export function computeComparisonScore(
  rows: { id: string; day: number | null; vol: number | null; volatility: number | null; amountZ: number | null }[],
  breadth: number | null,
): Map<string, { score: number | null; rank: number | null; f1: number; f2: number; f3: number; f4: number }> {
  const f1 = rankPct(rows.map((row) => ({ id: row.id, value: row.day })));
  const volRank = rankPct(rows.map((row) => ({ id: row.id, value: row.vol })));
  const f2 = rankPct(rows.map((row) => ({ id: row.id, value: row.day == null || row.vol == null ? null : (f1.get(row.id) ?? 0.5) - (volRank.get(row.id) ?? 0.5) })));
  const f3 = rankPct(rows.map((row) => ({ id: row.id, value: row.volatility })));
  const f4 = rankPct(rows.map((row) => ({ id: row.id, value: row.amountZ })));
  const momentum = breadth == null ? null : breadth > 0.6 ? 0.7 : breadth < 0.4 ? 0.15 : 0.4;
  const scored = rows.map((row) => {
    if (momentum == null) return { id: row.id, score: null as number | null };
    const reversal = 1 - momentum;
    const score =
      (f1.get(row.id) ?? 0.5) * 100 * 0.7 * momentum +
      (f2.get(row.id) ?? 0.5) * 100 * 0.3 * momentum +
      (f3.get(row.id) ?? 0.5) * 100 * 0.4 * reversal +
      (f4.get(row.id) ?? 0.5) * 100 * 0.6 * reversal;
    return { id: row.id, score };
  });
  const ranks = rankPct(scored.map((row) => ({ id: row.id, value: row.score })));
  const scores = new Map<string, { score: number | null; rank: number | null; f1: number; f2: number; f3: number; f4: number }>();
  for (const row of scored) {
    scores.set(row.id, {
      score: row.score,
      rank: row.score == null ? null : ranks.get(row.id) ?? null,
      f1: f1.get(row.id) ?? 0.5,
      f2: f2.get(row.id) ?? 0.5,
      f3: f3.get(row.id) ?? 0.5,
      f4: f4.get(row.id) ?? 0.5,
    });
  }
  return scores;
}

export async function recordFill(fillId: string): Promise<Record<string, unknown>> {
  const fill = await getObject(`/fills/${encodeURIComponent(fillId)}`);
  const positionId = text(fill.positionId);
  if (!positionId) throw new Error("成交没有持仓");
  const position = await getObject(`/positions/${encodeURIComponent(positionId)}`);
  if (fill.side === "卖出") return position;
  if (position.entryPrice != null) return position;
  const bars = await listObjects(`/daily-bars?ticker=${encodeURIComponent(String(fill.ticker))}&sessionDate=${encodeURIComponent(String(fill.sessionDate))}`);
  const bar = bars[0];
  let regime: string | null = null;
  try {
    const day = await getObject(`/trading-days/${encodeURIComponent(String(fill.sessionDate))}`);
    regime = text(day.regime);
  } catch {
    regime = null;
  }
  const atr = num(bar?.atr14);
  const high = num(bar?.high);
  const missing = num(fill.price) == null || atr == null || regime == null || high == null;
  return postObject("/positions", {
    pass: "entry",
    positionId,
    entryPrice: fill.price,
    entryDate: fill.sessionDate,
    ...(atr != null ? { atrAtEntry: atr } : {}),
    ...(regime != null ? { regimeAtEntry: regime } : {}),
    ...(high != null ? { highSinceEntry: high } : {}),
    daysHeld: 0,
    entryFieldsMissing: missing,
  });
}

function headerSentence(input: {
  asOf: string;
  stopped: boolean;
  playbookWrong: boolean;
  contradictory: boolean;
  unwritable: number;
  selectionMissing: boolean;
  countAgrees: boolean;
  sellCount: number;
  buyCount: number;
}): string {
  if (input.stopped) return "今天停止";
  if (input.playbookWrong) return "做法不对";
  if (input.contradictory) return "互相矛盾";
  if (input.unwritable > 0 || input.selectionMissing) return "没做完";
  if (!input.countAgrees) return "持仓只数对不上";
  if (shanghaiMinutes(input.asOf) < 9 * 60 + 25) return "等开盘价";
  if (input.sellCount === 0 && input.buyCount === 0) return "今天没有要执行的";
  return "还没写下委托";
}

export async function runClosePipeline(accountId: string, tradeDate: string, asOf: string): Promise<Record<string, unknown>> {
  const state = await context(accountId, tradeDate);
  const pack = resolvePack(state.strategy);
  const closeDate = previousDate(state.days, tradeDate);
  if (!closeDate) throw new Error("没有前一交易日");
  const grouped = byTickerDate(state.bars);
  const tickers = [...state.tickers];
  const missingClose = tickers.filter((ticker) => {
    const bar = (grouped.get(ticker) ?? []).find((item) => String(item.sessionDate) === closeDate);
    return num(bar?.close) == null || num(bar?.changePercent) == null;
  });
  // 制度 / 广度仍按可买范围（与 13/18 一致）
  const regimes = detectRegime(state.strategy, state.days.filter((day) => day <= closeDate), grouped, tickers);
  for (const row of regimes) {
    await postObject("/trading-days", {
      pass: "derived",
      sessionDate: row.date,
      indexClose: row.indexClose,
      indexVolume: row.indexVolume,
      totalAmount: row.totalAmount,
      regime: row.regime,
      limitUpRatio: row.limitUpRatio,
      limitDownRatio: row.limitDownRatio,
      adx: row.adx,
      risingRatio: row.risingRatio,
      volPercentile: row.volPercentile,
      amountDeviation: row.amountDeviation,
    });
  }
  const closeRegime = regimes.find((row) => row.date === closeDate) ?? null;
  const featureRows = new Map<string, ReturnType<typeof computeBarFeatures> & { close: number | null; change: number | null; high: number | null }>();
  let withMa = 0;
  let above = 0;
  for (const ticker of tickers) {
    const history = (grouped.get(ticker) ?? []).filter((bar) => String(bar.sessionDate) <= closeDate);
    if (history.length === 0 || String(history[history.length - 1].sessionDate) !== closeDate) continue;
    const computed = computeBarFeatures(history);
    const latest = history[history.length - 1];
    featureRows.set(ticker, { ...computed, close: num(latest.close), change: num(latest.changePercent), high: num(latest.high) });
    if (computed.ma20 != null) withMa += 1;
    if (computed.aboveMa20 === true) above += 1;
    if (missingClose.length === 0) {
      await postObject("/daily-bars", {
        pass: "derived",
        barId: latest.barId,
        ticker,
        sessionDate: closeDate,
        ma20: computed.ma20,
        atr14: computed.atr14,
        volRatio: computed.volRatio,
        aboveMa20: computed.aboveMa20,
        limitUpCount120: countLimitUps120(history, ticker, state.strategy),
        resolvedIndustryId: resolvedIndustry(history, state.industries),
      });
    }
  }
  const breadth = withMa === 0 ? null : above / withMa;
  const bullHvStreak = streak(regimes, closeDate);
  let entryGate: string = "缺少";
  const bearBlocked = closeRegime?.regime === BEAR || sleeve(state.strategy, closeRegime?.regime ?? null).maxPositions === 0;
  const breadthOk = !pack.requireBreadthGate || (breadth != null && breadth >= (num(state.strategy.breadthMin) ?? 0.45));
  // V46 对齐引擎：缺广度不挡门；仍写 breadth 供诊断。V44 缺广度 → 缺少。
  const gateInputsMissing =
    missingClose.length > 0 ||
    bullHvStreak == null ||
    closeRegime?.regime == null ||
    (pack.requireBreadthGate && breadth == null);
  if (gateInputsMissing) entryGate = "缺少";
  else if (bullHvStreak >= (num(state.strategy.regimeMinPersistDays) ?? 2) && breadthOk && !bearBlocked) entryGate = "允许";
  else entryGate = "关闭";

  const held = new Set(state.positions.map((position) => String(position.ticker)));
  const book = sleeve(state.strategy, closeRegime?.regime ?? null);
  let selectionMissing = false;
  let picks: { ticker: string; rank: number; close: number }[] = [];

  if (pack.packId === "v46Huimaqiang") {
    const factorMap = new Map<string, HuimaqiangFactors>();
    // 横截面：当日有收盘的全库（对齐 pickle）；入选仍限制在可买范围
    const scoreTickers =
      pack.scoreUniverse === "allBars"
        ? [...grouped.keys()].filter((ticker) => {
            const history = grouped.get(ticker) ?? [];
            return history.some((bar) => String(bar.sessionDate) === closeDate && num(bar.close) != null);
          })
        : tickers;
    for (const ticker of scoreTickers) {
      const history = (grouped.get(ticker) ?? []).filter((bar) => String(bar.sessionDate) <= closeDate);
      if (history.length === 0 || String(history[history.length - 1].sessionDate) !== closeDate) continue;
      const stock = state.stocks.find((item) => item.ticker === ticker);
      const factors = computeHuimaqiangFactors(history, ticker, state.strategy, stock?.isSt === true);
      if (!factors) continue;
      factorMap.set(ticker, factors);
      if (missingClose.length === 0 && history[history.length - 1].barId != null) {
        const latest = history[history.length - 1];
        await postObject("/daily-bars", {
          pass: "derived",
          barId: latest.barId,
          ticker,
          sessionDate: closeDate,
          dayRet: factors.dayRet,
          isLimitUp: factors.isLimitUp,
          excluded: factors.excluded,
          luRecent20d: factors.luRecent20d,
          luCount60d: factors.luCount60d,
          high20d: factors.high20d,
          ddFromHigh20: factors.ddFromHigh20,
          volMa5: factors.volMa5,
          volMax20d: factors.volMax20d,
          volShrink: factors.volShrink,
          ret3d: factors.ret3d,
          ma60: factors.ma60,
        });
      }
    }
    const scores = computeHuimaqiangScore(factorMap, state.strategy);
    if (missingClose.length === 0) {
      for (const [ticker, score] of scores) {
        const latest = (grouped.get(ticker) ?? []).find((bar) => String(bar.sessionDate) === closeDate);
        if (!latest?.barId) continue;
        await postObject("/daily-bars", {
          pass: "derived",
          barId: latest.barId,
          ticker,
          sessionDate: closeDate,
          scoreZj: score.score,
          scoreZjRank: score.rank,
        });
      }
    }
    selectionMissing = missingClose.length > 0 || entryGate === "缺少";
    const selected = selectHuimaqiangBuys({
      strategy: state.strategy,
      regime: closeRegime?.regime ?? null,
      entryGate,
      selectionMissing,
      held,
      excluded: state.excluded,
      universe: state.tickers,
      stocks: state.stocks,
      factorMap,
      scores,
      maxPositions: book.maxPositions ?? 0,
      minScore: book.minScore,
    });
    selectionMissing = selected.selectionMissing;
    picks = (selectionMissing || entryGate !== "允许" ? [] : selected.picks).filter((candidate) => {
      const shares = lotShares(num(state.account.totalAssets) ?? 0, book.weight ?? 0, candidate.close);
      return shares >= 100;
    });
  } else {
    const scoreRows = tickers.filter((ticker) => featureRows.has(ticker)).map((ticker) => {
      const row = featureRows.get(ticker)!;
      return { id: ticker, day: row.change, vol: row.volRatio, volatility: row.volatility, amountZ: row.amountZ };
    });
    const scores = computeComparisonScore(scoreRows, breadth);
    if (missingClose.length === 0) {
      for (const ticker of featureRows.keys()) {
        const latest = (grouped.get(ticker) ?? []).find((bar) => String(bar.sessionDate) === closeDate);
        const score = scores.get(ticker);
        if (!latest || !score) continue;
        await postObject("/daily-bars", {
          pass: "derived",
          barId: latest.barId,
          ticker,
          sessionDate: closeDate,
          f1: score.f1,
          f2: score.f2,
          f3: score.f3,
          f4: score.f4,
          comparisonScore: score.score,
          comparisonRank: score.rank,
        });
      }
    }
    const countsMissing = tickers.some((ticker) => {
      const history = (grouped.get(ticker) ?? []).filter((bar) => String(bar.sessionDate) <= closeDate);
      return countLimitUps120(history, ticker, state.strategy) == null;
    });
    const industryMissing = tickers.some((ticker) => {
      const history = (grouped.get(ticker) ?? []).filter((bar) => String(bar.sessionDate) <= closeDate);
      return resolvedIndustry(history, state.industries) == null;
    });
    selectionMissing = missingClose.length > 0 || entryGate === "缺少" || countsMissing || industryMissing || (entryGate === "允许" && scores.size > 0 && [...scores.values()].some((row) => row.rank == null));
    const candidates: { ticker: string; rank: number; close: number; industry: string }[] = [];
    if (entryGate === "允许" && !selectionMissing) {
      for (const ticker of tickers) {
        if (held.has(ticker) || state.excluded.has(ticker)) continue;
        const stock = state.stocks.find((item) => item.ticker === ticker);
        if (stock?.isSt === true) continue;
        const row = featureRows.get(ticker);
        const score = scores.get(ticker);
        const close = row?.close ?? null;
        const change = row?.change ?? null;
        if (close == null || change == null || score?.rank == null) {
          selectionMissing = true;
          break;
        }
        if (close < (num(state.strategy.priceMin) ?? 10) || close > (num(state.strategy.priceMax) ?? 20)) continue;
        if (change >= (num(state.strategy.limitUpCountPercent) ?? 9.5)) continue;
        if (closeRegime?.regime === SIDE && score.rank < (book.minScore ?? 0)) continue;
        const history = (grouped.get(ticker) ?? []).filter((bar) => String(bar.sessionDate) <= closeDate);
        const count = countLimitUps120(history, ticker, state.strategy);
        if (count == null) {
          selectionMissing = true;
          break;
        }
        if (count < (num(state.strategy.limitUpCountMin) ?? 0)) continue;
        const industry = resolvedIndustry(history, state.industries);
        if (!industry) {
          selectionMissing = true;
          break;
        }
        candidates.push({ ticker, rank: score.rank, close, industry });
      }
    }
    candidates.sort((left, right) => right.rank - left.rank || left.ticker.localeCompare(right.ticker));
    const perIndustry = num(state.strategy.maxPerIndustry) ?? 2;
    const kept: typeof candidates = [];
    const industryCounts = new Map<string, number>();
    for (const candidate of candidates) {
      const used = industryCounts.get(candidate.industry) ?? 0;
      if (used >= perIndustry) continue;
      industryCounts.set(candidate.industry, used + 1);
      kept.push(candidate);
    }
    const room = Math.max(0, (book.maxPositions ?? 0) - held.size);
    picks = selectionMissing || entryGate !== "允许" ? [] : kept.slice(0, room).filter((candidate) => {
      const shares = lotShares(num(state.account.totalAssets) ?? 0, book.weight ?? 0, candidate.close);
      return shares >= 100;
    });
  }
  const exits = new Map<string, { state: string; reason: string | null; limit: number | null; quantity: number }>();
  for (const position of state.positions) {
    const ticker = String(position.ticker);
    const row = featureRows.get(ticker);
    const missingBar = row?.close == null || row.high == null;
    if (position.entryFieldsMissing === true || text(position.entryPrice) == null || missingBar) {
      exits.set(String(position.positionId), { state: "缺少", reason: null, limit: null, quantity: num(position.quantity) ?? 0 });
      await postObject("/positions", { pass: "exit", positionId: position.positionId, exitState: "缺少", exitJudgedOn: closeDate, exitReason: null });
      continue;
    }
    const entryDate = text(position.entryDate);
    if (entryDate == null || entryDate === closeDate) {
      await postObject("/positions", {
        pass: "roll",
        positionId: position.positionId,
        highSinceEntry: Math.max(num(position.highSinceEntry) ?? row!.high!, row!.high!),
        daysHeld: 0,
      });
    } else if (row?.high == null) {
      exits.set(String(position.positionId), { state: "缺少", reason: null, limit: null, quantity: num(position.quantity) ?? 0 });
      await postObject("/positions", { pass: "exit", positionId: position.positionId, exitState: "缺少", exitJudgedOn: closeDate, exitReason: null });
      continue;
    } else {
      await postObject("/positions", {
        pass: "roll",
        positionId: position.positionId,
        highSinceEntry: Math.max(num(position.highSinceEntry) ?? row.high, row.high),
        daysHeld: heldDays(state.days, entryDate, closeDate),
      });
    }
    const rolled = await getObject(`/positions/${encodeURIComponent(String(position.positionId))}`);
    const params = sleeve(state.strategy, text(rolled.regimeAtEntry));
    const close = row!.close as number;
    const entry = num(rolled.entryPrice) as number;
    const high = num(rolled.highSinceEntry);
    const daysHeld = num(rolled.daysHeld) ?? 0;
    const atr = num(rolled.atrAtEntry);
    let reason: string | null = null;
    let limit: number | null = null;
    if (params.stopLoss > 0 && close <= entry * (1 - params.stopLoss)) {
      reason = "止损";
      limit = cents(entry * (1 - params.stopLoss));
    } else if (params.activate != null && params.trail != null && high != null && high >= entry * (1 + params.activate) && close <= high * (1 - params.trail)) {
      reason = "止盈";
      limit = cents(high * (1 - params.trail));
    } else if (params.maxHold != null && daysHeld >= params.maxHold) {
      reason = "到期";
      limit = cents(close);
    } else if (params.atrMultiple != null && params.atrMultiple > 0 && atr != null && atr > 0 && close <= entry - params.atrMultiple * atr) {
      reason = "止损";
      limit = cents(entry - params.atrMultiple * atr);
    } else if ((row!.volRatio != null && row!.change != null) && ((row!.volRatio > 3 && row!.change < -2) || (row!.volRatio > 5 && row!.change > 5))) {
      reason = "止损";
      limit = cents(close);
    } else if (state.strategy.exitOnRegimeFlip === true && closeRegime?.regime !== BULL && closeRegime?.regime !== HIGH) {
      reason = "制度离场";
      limit = cents(close);
    } else {
      const history = (grouped.get(ticker) ?? []).filter((bar) => String(bar.sessionDate) <= closeDate);
      const need = num(state.strategy.consecutiveLimitDownDays) ?? 2;
      const recent = history.slice(-need);
      const level = num(state.strategy.limitDownPercent) ?? -9.5;
      if (recent.length === need && recent.every((bar) => (num(bar.changePercent) ?? 0) <= level)) {
        reason = "止损";
        limit = cents(close);
      }
    }
    const stateName = reason ? "已写入卖出行" : "继续拿";
    exits.set(String(position.positionId), { state: stateName, reason, limit, quantity: num(position.quantity) ?? 0 });
    await postObject("/positions", {
      pass: "exit",
      positionId: position.positionId,
      exitState: stateName,
      exitJudgedOn: closeDate,
      exitReason: reason,
    });
  }
  const unwritable = [...exits.values()].filter((row) => row.state === "缺少").length;
  if (unwritable > 0) selectionMissing = selectionMissing || false;
  const pageIncomplete = missingClose.length > 0 || selectionMissing || unwritable > 0;
  await postObject("/trading-days", {
    pass: "derived",
    sessionDate: closeDate,
    breadth,
    bullHvStreak,
    entryGate,
    selectionMissing: pageIncomplete && entryGate !== "关闭" ? true : entryGate === "缺少" || selectionMissing || missingClose.length > 0,
  });
  const existing = await listObjects(`/arrangements?accountId=${encodeURIComponent(accountId)}&sessionDate=${encodeURIComponent(tradeDate)}`);
  const superseded = new Set(existing.map((row) => text(row.supersedesArrangementId)).filter((id): id is string => id != null));
  const current = existing.find((row) => !superseded.has(String(row.arrangementId)) && !existing.some((other) => other.supersedesArrangementId === row.arrangementId));
  const arrangementId = `${accountId}|${tradeDate}|${existing.length + 1}`;
  const sellPlans = pageIncomplete ? [] : [...exits.entries()].filter(([, row]) => row.state === "已写入卖出行" && row.reason && row.limit != null);
  const buyPlans = pageIncomplete ? [] : picks;
  const contradictory = sellPlans.some(([positionId]) => {
    const position = state.positions.find((item) => item.positionId === positionId);
    return position != null && buyPlans.some((buy) => buy.ticker === position.ticker);
  });
  const continueCount = state.positions.length - sellPlans.length - unwritable;
  const countAgrees = continueCount + sellPlans.length + unwritable === state.positions.length;
  const sentence = headerSentence({
    asOf,
    stopped: false,
    playbookWrong: text(state.account.enabledStrategyId) !== state.strategyId,
    contradictory,
    unwritable,
    selectionMissing: pageIncomplete,
    countAgrees,
    sellCount: sellPlans.length,
    buyCount: buyPlans.length,
  });
  await postObject("/arrangements", {
    pass: "page",
    arrangementId,
    accountId,
    sessionDate: tradeDate,
    strategyId: state.strategyId,
    ...(current ? { supersedesArrangementId: current.arrangementId } : {}),
    handedOverAt: asOf,
    header: sentence,
    totalAssetsShown: state.account.totalAssets,
    cashShown: state.account.availableCash,
    continueCount,
    positionCountAgrees: countAgrees && unwritable === 0,
    playbookChanged: false,
  });
  if (current) {
    await postObject("/arrangements", { pass: "page", arrangementId: current.arrangementId, header: "这份已作废" });
  }
  for (const [positionId, plan] of sellPlans) {
    const position = state.positions.find((item) => item.positionId === positionId);
    if (!position || plan.limit == null || plan.reason == null) continue;
    await postObject("/sell-lines", {
      pass: "page",
      sellLineId: `${arrangementId}|${position.ticker}`,
      arrangementId,
      ticker: position.ticker,
      positionId,
      reason: plan.reason,
      plannedQuantity: plan.quantity,
      plannedLimitPrice: plan.limit,
    });
  }
  for (let index = 0; index < buyPlans.length; index += 1) {
    const pick = buyPlans[index];
    const shares = lotShares(num(state.account.totalAssets) ?? 0, book.weight ?? 0, pick.close);
    await postObject("/buy-lines", {
      pass: "page",
      buyLineId: `${arrangementId}|${pick.ticker}`,
      arrangementId,
      ticker: pick.ticker,
      rank: index + 1,
      plannedQuantity: shares,
      plannedLimitPrice: cents(pick.close),
    });
  }
  const dayGate = await getObject(`/trading-days/${encodeURIComponent(closeDate)}`);
  return { arrangementId, closeDate, tradeDate, entryGate: dayGate.entryGate, selectionMissing: dayGate.selectionMissing, header: sentence, regime: closeRegime?.regime ?? null };
}

export async function runOpenPipeline(accountId: string, tradeDate: string, asOf: string): Promise<Record<string, unknown>> {
  const arrangements = await listObjects(`/arrangements?accountId=${encodeURIComponent(accountId)}&sessionDate=${encodeURIComponent(tradeDate)}`);
  const superseded = new Set(arrangements.map((row) => text(row.supersedesArrangementId)).filter((id): id is string => id != null));
  const current = arrangements.find((row) => !superseded.has(String(row.arrangementId)) && !arrangements.some((other) => other.supersedesArrangementId === row.arrangementId));
  if (!current) throw new Error("没有这一天的开盘安排");
  const stocks = await listObjects("/stocks");
  const sellLines = await listObjects(`/sell-lines?arrangementId=${encodeURIComponent(String(current.arrangementId))}`);
  const buyLines = await listObjects(`/buy-lines?arrangementId=${encodeURIComponent(String(current.arrangementId))}`);
  let incomplete = false;
  let awaitingOpen = false;
  for (const line of [...sellLines, ...buyLines]) {
    const ticker = String(line.ticker);
    const bars = await listObjects(`/daily-bars?ticker=${encodeURIComponent(ticker)}&sessionDate=${encodeURIComponent(tradeDate)}`);
    const bar = bars[0];
    const stock = stocks.find((item) => item.ticker === ticker);
    const previous = num(bar?.previousClose);
    const board = text(stock?.board);
    let limitUp: number | null = null;
    let limitDown: number | null = null;
    if (previous != null && previous > 0 && (board === "主板" || board === "创业板")) {
      const span = board === "创业板" ? 0.2 : 0.1;
      limitUp = cents(previous * (1 + span));
      limitDown = cents(previous * (1 - span));
      if (bar) {
        await postObject("/daily-bars", {
          pass: "derived",
          barId: bar.barId,
          ticker,
          sessionDate: tradeDate,
          limitUp,
          limitDown,
        });
      }
    }
    const open = num(bar?.open);
    if (open == null) {
      awaitingOpen = true;
      continue;
    }
    if (limitUp == null || limitDown == null) {
      incomplete = true;
      continue;
    }
    if (line.sellLineId) {
      let outcome = "可写入委托";
      let submitLimit: number | null = open;
      if (bar?.suspended === true) {
        outcome = "停牌今天不写入";
        submitLimit = null;
      } else if (open <= limitDown) {
        outcome = "跌停今天不报";
        submitLimit = null;
      } else if (open >= limitUp) {
        outcome = "挂涨停价";
        submitLimit = limitUp;
      }
      await postObject("/sell-lines", {
        pass: "page",
        sellLineId: line.sellLineId,
        openPrice: open,
        submitLimitPrice: submitLimit,
        submitQuantity: submitLimit == null ? null : line.plannedQuantity,
        outcome,
      });
    } else {
      let outcome = "可写入委托";
      let submitLimit: number | null = open;
      if (bar?.suspended === true) {
        outcome = "今天不买停牌";
        submitLimit = null;
      } else if (open >= limitUp) {
        outcome = "今天不买开盘涨停";
        submitLimit = null;
      } else if (open > num(line.plannedLimitPrice)!) {
        outcome = "今天不买这个限价买不进";
        submitLimit = null;
      }
      await postObject("/buy-lines", {
        pass: "page",
        buyLineId: line.buyLineId,
        openPrice: open,
        submitLimitPrice: submitLimit,
        submitQuantity: submitLimit == null ? null : line.plannedQuantity,
        outcome,
      });
    }
  }
  let header = incomplete
    ? "没做完"
    : awaitingOpen || shanghaiMinutes(asOf) < 9 * 60 + 25
      ? "等开盘价"
      : sellLines.length + buyLines.length === 0
        ? "今天没有要执行的"
        : "还没写下委托";
  if (!incomplete && !awaitingOpen && sellLines.length + buyLines.length === 0) {
    const calendar = (await listObjects("/trading-days")).filter((day) => day.isTradingDay === true).map((day) => String(day.sessionDate)).sort();
    const closeDate = [...calendar].reverse().find((date) => date < tradeDate);
    if (closeDate) {
      try {
        const closeDay = await getObject(`/trading-days/${encodeURIComponent(closeDate)}`);
        if (closeDay.entryGate === "缺少" || closeDay.selectionMissing === true) header = "没做完";
      } catch {
        /* keep header */
      }
    }
  }
  await postObject("/arrangements", { pass: "page", arrangementId: current.arrangementId, header });
  return { arrangementId: current.arrangementId, header };
}
