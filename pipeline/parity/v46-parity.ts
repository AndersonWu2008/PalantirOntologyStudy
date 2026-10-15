/**
 * V46 验收 A：TS Function 与 Python 金标逐票 diff。
 * 前置：python3 pipeline/parity/v46_export_gold.py [N]
 * OHLC 用与金标同一 pickle 导出的 v46_ohlc.csv（保证宇宙/横截面一致）。
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  computeHuimaqiangFactors,
  computeHuimaqiangScore,
  inHuimaqiangPool,
  type HuimaqiangFactors,
} from "../functions/huimaqiang.ts";

const here = dirname(fileURLToPath(import.meta.url));
const GOLD_PATH = join(here, "v46_gold.json");
const OHLC_PATH = join(here, "v46_ohlc.csv");
const REPORT_PATH = join(here, "v46_parity_report.json");

type GoldRow = {
  sessionDate: string;
  ticker: string;
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
  inPool: boolean;
  scoreZj: number | null;
  scoreZjRank: number | null;
  isSt: boolean;
};

type Bar = {
  sessionDate: string;
  close: number | null;
  volume: number | null;
  ticker: string;
  stockName: string;
};

const STRATEGY = {
  priceMin: 5,
  priceMax: 50,
  mainLimitUpPercent: 9.8,
  chinextLimitUpPercent: 19.8,
};

function nearly(a: number | null | undefined, b: number | null | undefined): boolean {
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;
  return Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b)) || Math.abs(a - b) <= 1e-9;
}

function boolEq(a: boolean | null | undefined, b: boolean | null | undefined): boolean {
  return Boolean(a) === Boolean(b);
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cur += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      continue;
    }
    if (ch === ",") {
      out.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out;
}

function loadOhlcCsv(path: string): Map<string, Bar[]> {
  const text = readFileSync(path, "utf8");
  const lines = text.split(/\r?\n/).filter(Boolean);
  const header = lines[0].split(",");
  const idx = Object.fromEntries(header.map((h, i) => [h, i]));
  const byTicker = new Map<string, Bar[]>();
  for (let i = 1; i < lines.length; i += 1) {
    const cols = parseCsvLine(lines[i]);
    if (cols.length < 5) continue;
    const closeRaw = cols[idx.close];
    const volumeRaw = cols[idx.volume];
    const bar: Bar = {
      ticker: cols[idx.ticker],
      sessionDate: cols[idx.sessionDate],
      close: closeRaw === "" ? null : Number(closeRaw),
      volume: volumeRaw === "" ? null : Number(volumeRaw),
      stockName: cols[idx.stockName] ?? "",
    };
    const list = byTicker.get(bar.ticker) ?? [];
    list.push(bar);
    byTicker.set(bar.ticker, list);
  }
  for (const list of byTicker.values()) {
    list.sort((a, b) => a.sessionDate.localeCompare(b.sessionDate));
  }
  return byTicker;
}

async function main() {
  const goldPayload = JSON.parse(readFileSync(GOLD_PATH, "utf8")) as {
    sampleDays: string[];
    gold: GoldRow[];
    stMap: Record<string, boolean>;
  };
  const sampleDays = goldPayload.sampleDays;
  console.log(`金标日 ${sampleDays.length}: ${sampleDays[0]} -> ${sampleDays[sampleDays.length - 1]}`);
  console.log("加载 OHLC CSV ...");
  const byTicker = loadOhlcCsv(OHLC_PATH);
  console.log(`tickers ${byTicker.size}`);

  const goldByDay = new Map<string, GoldRow[]>();
  for (const row of goldPayload.gold) {
    const list = goldByDay.get(row.sessionDate) ?? [];
    list.push(row);
    goldByDay.set(row.sessionDate, list);
  }

  const mismatches: Record<string, unknown>[] = [];
  let compared = 0;

  for (const day of sampleDays) {
    const goldRows = goldByDay.get(day) ?? [];
    const factorMap = new Map<string, HuimaqiangFactors>();

    // 横截面必须覆盖当日全宇宙（与 Python groupby date 一致）
    for (const [ticker, series] of byTicker) {
      const history = series.filter((b) => b.sessionDate <= day);
      if (history.length === 0 || history[history.length - 1].sessionDate !== day) continue;
      const latestName = history[history.length - 1].stockName ?? "";
      const st = latestName.toUpperCase().includes("ST");
      const factors = computeHuimaqiangFactors(history, ticker, STRATEGY, st);
      if (factors) factorMap.set(ticker, factors);
    }

    const scores = computeHuimaqiangScore(factorMap, STRATEGY);

    for (const g of goldRows) {
      const f = factorMap.get(g.ticker);
      if (!f) {
        mismatches.push({ sessionDate: day, ticker: g.ticker, bad: ["missingTsFactors"], gold: g });
        continue;
      }
      compared += 1;
      const score = scores.get(g.ticker);
      const inPool = inHuimaqiangPool(f, STRATEGY);
      const fields: [string, boolean][] = [
        ["dayRet", nearly(f.dayRet, g.dayRet)],
        ["isLimitUp", boolEq(f.isLimitUp, g.isLimitUp)],
        ["excluded", boolEq(f.excluded, g.excluded)],
        ["luRecent20d", nearly(f.luRecent20d, g.luRecent20d)],
        ["luCount60d", nearly(f.luCount60d, g.luCount60d)],
        ["high20d", nearly(f.high20d, g.high20d)],
        ["ddFromHigh20", nearly(f.ddFromHigh20, g.ddFromHigh20)],
        ["volMa5", nearly(f.volMa5, g.volMa5)],
        ["volMax20d", nearly(f.volMax20d, g.volMax20d)],
        ["volShrink", nearly(f.volShrink, g.volShrink)],
        ["inPool", inPool === g.inPool],
        ["scoreZj", nearly(score?.score ?? null, g.scoreZj)],
        ["scoreZjRank", nearly(score?.rank ?? null, g.scoreZjRank)],
      ];
      const bad = fields.filter(([, ok]) => !ok).map(([name]) => name);
      if (bad.length > 0) {
        mismatches.push({
          sessionDate: day,
          ticker: g.ticker,
          bad,
          gold: {
            dayRet: g.dayRet,
            isLimitUp: g.isLimitUp,
            excluded: g.excluded,
            luRecent20d: g.luRecent20d,
            luCount60d: g.luCount60d,
            high20d: g.high20d,
            ddFromHigh20: g.ddFromHigh20,
            volMa5: g.volMa5,
            volMax20d: g.volMax20d,
            volShrink: g.volShrink,
            inPool: g.inPool,
            scoreZj: g.scoreZj,
            scoreZjRank: g.scoreZjRank,
          },
          ts: {
            dayRet: f.dayRet,
            isLimitUp: f.isLimitUp,
            excluded: f.excluded,
            luRecent20d: f.luRecent20d,
            luCount60d: f.luCount60d,
            high20d: f.high20d,
            ddFromHigh20: f.ddFromHigh20,
            volMa5: f.volMa5,
            volMax20d: f.volMax20d,
            volShrink: f.volShrink,
            inPool,
            scoreZj: score?.score ?? null,
            scoreZjRank: score?.rank ?? null,
          },
        });
      }
    }
    console.log(`日 ${day}: mismatch 累计 ${mismatches.length}`);
  }

  const byField: Record<string, number> = {};
  for (const row of mismatches) {
    for (const name of (row.bad as string[]) ?? []) {
      byField[name] = (byField[name] ?? 0) + 1;
    }
  }

  const report = {
    compared,
    mismatchCount: mismatches.length,
    byField,
    sampleDays,
    mismatches: mismatches.slice(0, 40),
  };
  writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ compared, mismatchCount: mismatches.length, byField, report: REPORT_PATH }, null, 2));
  if (mismatches.length > 0) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
