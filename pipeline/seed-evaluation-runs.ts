/**
 * 写入对照用 EvaluationRun（中文展示页只读）。
 * 汇总数字来自部署报告口径的占位对照；曲线为示意，完整重跑见 evaluate-strategy。
 */
import { postObject } from "./api.ts";

function linspaceEquity(runId: string, start: string, days: number, startEq: number, endEq: number, maxDd: number) {
  const points: Record<string, unknown>[] = [];
  const startDate = new Date(`${start}T00:00:00Z`);
  for (let i = 0; i < days; i += 1) {
    const t = i / Math.max(days - 1, 1);
    const equity = startEq + (endEq - startEq) * t;
    const drawdown = Math.sin(t * Math.PI) * maxDd;
    const d = new Date(startDate);
    d.setUTCDate(d.getUTCDate() + i);
    const sessionDate = d.toISOString().slice(0, 10);
    points.push({
      pointId: `${runId}|${sessionDate}`,
      runId,
      sessionDate,
      equity: Math.round(equity * 100) / 100,
      drawdown: Math.round(drawdown * 10000) / 10000,
    });
  }
  return points;
}

async function main() {
  const runs = [
    {
      runId: "eval-v44-demo-2024h2",
      strategyId: "v44",
      packId: "v44Champion",
      displayName: "V44 冠军 · 示意对照",
      startDate: "2024-07-01",
      endDate: "2025-06-30",
      status: "完成",
      annualReturn: 0.12,
      maxDrawdown: 0.18,
      calmar: 0.67,
      winRate: 0.52,
      tradeCount: 48,
      finalEquity: 1_120_000,
      notes: "示意 Run：完整引擎重跑后替换。对照用，非交易信号金标。",
      points: linspaceEquity("eval-v44-demo-2024h2", "2024-07-01", 40, 1_000_000, 1_120_000, 0.18),
      trades: [
        {
          tradeId: "eval-v44-demo-2024h2|t1",
          runId: "eval-v44-demo-2024h2",
          ticker: "000001.SZ",
          side: "买入→卖出",
          entryDate: "2024-08-12",
          exitDate: "2024-08-20",
          entryPrice: 12.3,
          exitPrice: 12.8,
          pnl: 0.04,
          exitReason: "止盈",
        },
      ],
    },
    {
      runId: "eval-v46-demo-2024h2",
      strategyId: "v46-huimaqiang",
      packId: "v46Huimaqiang",
      displayName: "涨停回马枪 · 示意对照",
      startDate: "2024-07-01",
      endDate: "2025-06-30",
      status: "完成",
      annualReturn: 0.15,
      maxDrawdown: 0.2,
      calmar: 0.75,
      winRate: 0.5,
      tradeCount: 55,
      finalEquity: 1_150_000,
      notes: "示意 Run：对齐 deploy_v46_huimaqiang 期望区间示意；正式数字由 evaluate-strategy 写出。",
      points: linspaceEquity("eval-v46-demo-2024h2", "2024-07-01", 40, 1_000_000, 1_150_000, 0.2),
      trades: [
        {
          tradeId: "eval-v46-demo-2024h2|t1",
          runId: "eval-v46-demo-2024h2",
          ticker: "300001.SZ",
          side: "买入→卖出",
          entryDate: "2024-09-03",
          exitDate: "2024-09-10",
          entryPrice: 18.5,
          exitPrice: 19.1,
          pnl: 0.032,
          exitReason: "到期",
        },
      ],
    },
  ];

  for (const run of runs) {
    const { points, trades, ...meta } = run;
    await postObject("/evaluation-runs", meta);
    for (const point of points) await postObject("/evaluation-points", point);
    for (const trade of trades) await postObject("/evaluation-trades", trade);
    console.log("已写入", meta.runId, meta.displayName);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
