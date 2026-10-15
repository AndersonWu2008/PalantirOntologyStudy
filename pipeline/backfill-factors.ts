import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import { getObject, postObject } from "./api.ts";
import { computeBarFeatures, computeComparisonScore, countLimitUps120, detectRegime, resolvedIndustry } from "./close-pipeline.ts";

const apiBase = process.env.DATABASE_API ?? "http://localhost:3010";

type Bar = Record<string, unknown>;

async function postDerived(rows: Record<string, unknown>[]): Promise<void> {
  const response = await fetch(`${apiBase}/daily-bars/batch`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ pass: "derived", domain: "StockTrading", rows }),
  });
  if (!response.ok) throw new Error(`derived batch ${response.status} ${await response.text()}`);
}

async function main(): Promise<void> {
  const grouped = new Map<string, Bar[]>();
  const seen = new Set<string>();
  const industries = new Map<string, Bar>();
  industries.set("其他", { industryId: "其他", displayName: "其他" });
  const lines = createInterface({ input: createReadStream("/tmp/pool-bars.jsonl"), crlfDelay: Infinity });
  for await (const line of lines) {
    if (!line) continue;
    const row = JSON.parse(line) as Bar;
    const barId = String(row.barId);
    if (seen.has(barId)) continue;
    seen.add(barId);
    const ticker = String(row.ticker);
    const list = grouped.get(ticker) ?? [];
    list.push(row);
    grouped.set(ticker, list);
    const label = row.publishedIndustry;
    if (typeof label === "string" && label !== "" && label !== "unknown") {
      industries.set(label, { industryId: label, displayName: label });
    }
  }
  for (const list of grouped.values()) {
    list.sort((left, right) => String(left.sessionDate).localeCompare(String(right.sessionDate)));
  }
  const tickers = [...grouped.keys()].sort();
  const dates = [...new Set(tickers.flatMap((ticker) => (grouped.get(ticker) ?? []).map((bar) => String(bar.sessionDate))))].sort();
  const strategy = await getObject("/strategies/v44");
  const industryRows = [...industries.values()];
  const cursor = new Map<string, number>();
  let written = 0;
  let skipped = 0;
  for (const date of dates) {
    const inputs: { id: string; day: number | null; vol: number | null; volatility: number | null; amountZ: number | null }[] = [];
    const computed = new Map<string, ReturnType<typeof computeBarFeatures> & { barId: string; limitUpCount120: number | null; resolvedIndustryId: string | null }>();
    let withMa = 0;
    let above = 0;
    for (const ticker of tickers) {
      const list = grouped.get(ticker) ?? [];
      let end = cursor.get(ticker) ?? 0;
      while (end < list.length && String(list[end].sessionDate) <= date) end += 1;
      cursor.set(ticker, end);
      const history = list.slice(0, end);
      const latest = history[history.length - 1];
      if (!latest || String(latest.sessionDate) !== date) continue;
      if (latest.close == null || latest.changePercent == null) {
        skipped += 1;
        continue;
      }
      const features = computeBarFeatures(history);
      if (features.ma20 != null) withMa += 1;
      if (features.aboveMa20 === true) above += 1;
      const row = {
        ...features,
        barId: String(latest.barId),
        limitUpCount120: countLimitUps120(history, ticker, strategy),
        resolvedIndustryId: resolvedIndustry(history, industryRows),
      };
      computed.set(ticker, row);
      inputs.push({ id: ticker, day: Number(latest.changePercent), vol: features.volRatio, volatility: features.volatility, amountZ: features.amountZ });
    }
    const breadth = withMa === 0 ? null : above / withMa;
    const scores = computeComparisonScore(inputs, breadth);
    const rows = [...computed.entries()].map(([ticker, row]) => {
      const score = scores.get(ticker);
      return {
        barId: row.barId,
        ma20: row.ma20,
        atr14: row.atr14,
        volRatio: row.volRatio,
        aboveMa20: row.aboveMa20,
        f1: score?.f1 ?? null,
        f2: score?.f2 ?? null,
        f3: score?.f3 ?? null,
        f4: score?.f4 ?? null,
        comparisonScore: score?.score ?? null,
        comparisonRank: score?.rank ?? null,
        limitUpCount120: row.limitUpCount120,
        resolvedIndustryId: row.resolvedIndustryId,
      };
    });
    if (rows.length > 0) await postDerived(rows);
    written += rows.length;
    if (written > 0 && written % 20000 < rows.length) console.log("derived", written);
  }
  const regimes = detectRegime(strategy, dates, grouped, tickers);
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
  const scoredDays = regimes.filter((row) => row.regime != null).length;
  console.log("backfill", JSON.stringify({ bars: written, skipped, days: dates.length, regimes: scoredDays }));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
