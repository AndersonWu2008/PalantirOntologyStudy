/**
 * 用本地回测金标覆盖 Evaluation*。
 * 前置：python3 pipeline/parity/v46_export_backtest.py
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { postObject } from "./api.ts";

const here = dirname(fileURLToPath(import.meta.url));

type BacktestGold = {
  strategyId: string;
  packId: string;
  displayName: string;
  startDate: string;
  endDate: string;
  annualReturn: number;
  maxDrawdown: number;
  calmar: number;
  winRate: number;
  tradeCount: number;
  finalEquity: number;
  notes: string;
  equity: { sessionDate: string; equity: number; drawdown: number }[];
  trades: {
    ticker: string;
    side: string;
    entryDate: string;
    exitDate: string;
    entryPrice: number;
    exitPrice: number;
    pnl: number;
    exitReason: string;
  }[];
};

async function upsertRun(runId: string, gold: BacktestGold) {
  await postObject("/evaluation-runs", {
    runId,
    strategyId: gold.strategyId,
    packId: gold.packId,
    displayName: gold.displayName,
    startDate: gold.startDate,
    endDate: gold.endDate,
    status: "完成",
    annualReturn: gold.annualReturn,
    maxDrawdown: Math.abs(gold.maxDrawdown),
    calmar: gold.calmar,
    winRate: gold.winRate,
    tradeCount: gold.tradeCount,
    finalEquity: gold.finalEquity,
    notes: gold.notes,
  });

  // 曲线降采样，页上可读
  const step = Math.max(1, Math.floor(gold.equity.length / 120));
  const points = gold.equity.filter((_, i) => i % step === 0 || i === gold.equity.length - 1);
  for (const point of points) {
    await postObject("/evaluation-points", {
      pointId: `${runId}|${point.sessionDate}`,
      runId,
      sessionDate: point.sessionDate,
      equity: point.equity,
      drawdown: point.drawdown,
    });
  }

  for (let i = 0; i < gold.trades.length; i += 1) {
    const t = gold.trades[i];
    await postObject("/evaluation-trades", {
      tradeId: `${runId}|${i}|${t.ticker}|${t.entryDate}`,
      runId,
      ticker: t.ticker,
      side: t.side,
      entryDate: t.entryDate,
      exitDate: t.exitDate,
      entryPrice: t.entryPrice,
      exitPrice: t.exitPrice,
      pnl: t.pnl,
      exitReason: mapReason(t.exitReason),
    });
  }
  console.log(`已写入 ${runId}: 点 ${points.length}, 成交 ${gold.trades.length}`);
}

function mapReason(reason: string): string {
  const map: Record<string, string> = {
    stop_loss: "止损",
    trailing_stop: "止盈",
    max_hold: "到期",
    atr_stop: "止损",
    regime_flip: "制度离场",
    risk_vol_spike_dump: "止损",
    risk_vol_spike_top: "止损",
    structure_ma20: "止损",
  };
  return map[reason] ?? reason;
}

async function main() {
  const v46 = JSON.parse(readFileSync(join(here, "parity/v46_backtest_gold.json"), "utf8")) as BacktestGold;
  await upsertRun("eval-v46-oa-engine", v46);

  // 若有 V44 对照金标则一并写入；否则保留示意 v44 或跳过
  try {
    const v44path = join(here, "parity/v44_backtest_gold.json");
    const v44 = JSON.parse(readFileSync(v44path, "utf8")) as BacktestGold;
    await upsertRun("eval-v44-oa-engine", v44);
  } catch {
    console.log("无 v44_backtest_gold.json，跳过 V44 引擎金标");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
