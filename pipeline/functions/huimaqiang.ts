/** V46 涨停回马枪 — 对齐 deploy_v46_huimaqiang.py；公式唯一出处见 docs/001_推导/43_V46策略本体.md */

export type Bar = Record<string, unknown>;
export type Strategy = Record<string, unknown>;

export type HuimaqiangFactors = {
  dayRet: number | null;
  isLimitUp: boolean | null;
  excluded: boolean;
  luRecent20d: number | null;
  luCount60d: number | null;
  high20d: number | null;
  ddFromHigh20: number | null;
  volMa5: number | null;
  volMax20d: number | null;
  volShrink: number | null;
  ret3d: number | null;
  ma60: number | null;
  close: number | null;
};

export type HuimaqiangScore = {
  f1: number;
  f2: number;
  score: number | null;
  rank: number | null;
};

function num(value: unknown): number | null {
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

/** 6 位证券代码（去掉 .SH/.SZ/.BJ） */
export function code6(ticker: string): string {
  const bare = ticker.replace(/\.(SH|SZ|BJ)$/i, "");
  return bare.padStart(6, "0").slice(-6);
}

export function is20cmBoard(ticker: string): boolean {
  const code = code6(ticker);
  const prefix3 = code.slice(0, 3);
  return prefix3 === "300" || prefix3 === "301" || prefix3 === "302" || prefix3 === "688" || prefix3 === "689";
}

export function isBeijingBoard(ticker: string): boolean {
  const first = code6(ticker)[0];
  return first === "8" || first === "4" || first === "9";
}

export function limitUpThreshold(ticker: string, strategy: Strategy): number {
  if (is20cmBoard(ticker)) {
    const pct = num(strategy.chinextLimitUpPercent);
    return pct != null ? pct / 100 : num(strategy.limitUpThr20cm) ?? 0.198;
  }
  const pct = num(strategy.mainLimitUpPercent);
  return pct != null ? pct / 100 : num(strategy.limitUpThrMain) ?? 0.098;
}

function rollingSum(flags: boolean[], window: number, minPeriods: number): (number | null)[] {
  const out: (number | null)[] = [];
  for (let i = 0; i < flags.length; i += 1) {
    const start = Math.max(0, i - window + 1);
    const slice = flags.slice(start, i + 1);
    if (slice.length < minPeriods) {
      out.push(null);
      continue;
    }
    out.push(slice.filter(Boolean).length);
  }
  return out;
}

function rollingMax(values: (number | null)[], window: number, minPeriods: number): (number | null)[] {
  const out: (number | null)[] = [];
  for (let i = 0; i < values.length; i += 1) {
    const start = Math.max(0, i - window + 1);
    const slice = values.slice(start, i + 1).filter((v): v is number => v != null);
    if (slice.length < minPeriods) {
      out.push(null);
      continue;
    }
    out.push(Math.max(...slice));
  }
  return out;
}

function rollingMean(values: (number | null)[], window: number, minPeriods: number): (number | null)[] {
  const out: (number | null)[] = [];
  for (let i = 0; i < values.length; i += 1) {
    const start = Math.max(0, i - window + 1);
    const slice = values.slice(start, i + 1).filter((v): v is number => v != null);
    if (slice.length < minPeriods) {
      out.push(null);
      continue;
    }
    out.push(mean(slice));
  }
  return out;
}

function rankPct(values: { id: string; value: number | null }[]): Map<string, number> {
  const ranked = values.filter((row) => row.value != null).sort((a, b) => a.value! - b.value!);
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
  for (const row of values) {
    if (!scores.has(row.id)) scores.set(row.id, 0.5);
  }
  return scores;
}

/** 对单票截至 closeDate 的历史计算因子（只返回末日一行） */
export function computeHuimaqiangFactors(
  history: Bar[],
  ticker: string,
  strategy: Strategy,
  isSt: boolean,
): HuimaqiangFactors | null {
  if (history.length === 0) return null;
  const closes = history.map((bar) => num(bar.close));
  const volumes = history.map((bar) => num(bar.volume));
  const dayRets: (number | null)[] = closes.map((close, i) => {
    if (i === 0 || close == null || closes[i - 1] == null || closes[i - 1] === 0) return null;
    return close / (closes[i - 1] as number) - 1;
  });
  const thr = limitUpThreshold(ticker, strategy);
  const excluded = isSt || isBeijingBoard(ticker);
  const isLimitUps = dayRets.map((ret) => {
    if (isSt || ret == null) return false;
    return ret >= thr;
  });
  const lu20 = rollingSum(isLimitUps, 20, 5);
  const lu60 = rollingSum(isLimitUps, 60, 10);
  const high20 = rollingMax(closes, 20, 5);
  const volMa5 = rollingMean(volumes, 5, 3);
  const volMax20 = rollingMax(volumes, 20, 5);
  const ma60 = rollingMean(closes, 60, 20);
  const last = history.length - 1;
  const close = closes[last];
  const high = high20[last];
  const v5 = volMa5[last];
  const vmax = volMax20[last];
  let ret3d: number | null = null;
  if (last >= 3 && close != null && closes[last - 3] != null && closes[last - 3] !== 0) {
    ret3d = close / (closes[last - 3] as number) - 1;
  }
  return {
    dayRet: dayRets[last],
    isLimitUp: dayRets[last] == null ? null : isLimitUps[last],
    excluded,
    luRecent20d: lu20[last],
    luCount60d: lu60[last],
    high20d: high,
    ddFromHigh20: close != null && high != null && high !== 0 ? close / high - 1 : null,
    volMa5: v5,
    volMax20d: vmax,
    volShrink: v5 != null && vmax != null ? v5 / (vmax + 1e-10) : null,
    ret3d,
    ma60: ma60[last],
    close,
  };
}

export function inHuimaqiangPool(factors: HuimaqiangFactors, strategy: Strategy): boolean {
  if (factors.excluded) return false;
  const close = factors.close;
  const priceMin = num(strategy.priceMin) ?? 5;
  const priceMax = num(strategy.priceMax) ?? 50;
  if (close == null || close < priceMin || close > priceMax) return false;
  if (factors.luRecent20d == null || factors.luRecent20d < 1) return false;
  if (factors.luCount60d == null || factors.luCount60d > 5) return false;
  const dd = factors.ddFromHigh20;
  if (dd == null || dd < -0.12 || dd > 0.005) return false;
  return true;
}

/** 横截面评分：仅池内；池 <5 则全部分为空 */
export function computeHuimaqiangScore(
  factorMap: Map<string, HuimaqiangFactors>,
  strategy: Strategy,
): Map<string, HuimaqiangScore> {
  const poolIds = [...factorMap.entries()]
    .filter(([, f]) => inHuimaqiangPool(f, strategy))
    .map(([id]) => id);
  const result = new Map<string, HuimaqiangScore>();
  for (const id of factorMap.keys()) {
    result.set(id, { f1: 0.5, f2: 0.5, score: null, rank: null });
  }
  if (poolIds.length < 5) return result;

  const ddRows = poolIds.map((id) => ({ id, value: factorMap.get(id)!.ddFromHigh20 }));
  const gaussian = poolIds.map((id) => {
    const dd = factorMap.get(id)!.ddFromHigh20 ?? 0;
    return { id, value: Math.exp(-((dd + 0.05) ** 2) / (2 * 0.03 ** 2)) };
  });
  const f1 = rankPct(gaussian);
  const shrinkRows = poolIds.map((id) => {
    const shrink = factorMap.get(id)!.volShrink;
    const clipped = shrink == null ? null : Math.min(1, Math.max(0, shrink));
    return { id, value: clipped == null ? null : 1 - clipped };
  });
  const f2 = rankPct(shrinkRows);
  const scored = poolIds.map((id) => {
    const s = ((f1.get(id) ?? 0.5) * 0.5 + (f2.get(id) ?? 0.5) * 0.5) * 100;
    return { id, value: s };
  });
  const ranks = rankPct(scored);
  for (const row of scored) {
    result.set(row.id, {
      f1: f1.get(row.id) ?? 0.5,
      f2: f2.get(row.id) ?? 0.5,
      score: row.value,
      rank: ranks.get(row.id) ?? null,
    });
  }
  // silence unused
  void ddRows;
  return result;
}

export type BuyPick = { ticker: string; rank: number; close: number };

export function selectHuimaqiangBuys(input: {
  strategy: Strategy;
  regime: string | null;
  entryGate: string;
  selectionMissing: boolean;
  held: Set<string>;
  excluded: Set<string>;
  universe?: Set<string>;
  stocks: { ticker?: unknown; isSt?: unknown }[];
  factorMap: Map<string, HuimaqiangFactors>;
  scores: Map<string, HuimaqiangScore>;
  maxPositions: number;
  minScore: number | null;
}): { picks: BuyPick[]; selectionMissing: boolean } {
  if (input.entryGate !== "允许" || input.selectionMissing) {
    return { picks: [], selectionMissing: input.selectionMissing };
  }
  let selectionMissing = input.selectionMissing;
  const candidates: BuyPick[] = [];
  for (const [ticker, factors] of input.factorMap) {
    if (input.universe && !input.universe.has(ticker)) continue;
    if (input.held.has(ticker) || input.excluded.has(ticker)) continue;
    const stock = input.stocks.find((item) => String(item.ticker) === ticker);
    if (stock?.isSt === true) continue;
    if (!inHuimaqiangPool(factors, input.strategy)) continue;
    const score = input.scores.get(ticker);
    const close = factors.close;
    if (close == null || score?.rank == null || score.score == null) {
      selectionMissing = true;
      break;
    }
    if (input.regime === "震荡" && input.minScore != null && score.rank < input.minScore) continue;
    candidates.push({ ticker, rank: score.score, close });
  }
  candidates.sort((a, b) => b.rank - a.rank || a.ticker.localeCompare(b.ticker));
  const room = Math.max(0, input.maxPositions - input.held.size);
  return { picks: candidates.slice(0, room), selectionMissing };
}

export function textExport(value: unknown): string | null {
  return text(value);
}
