import { listObjects, postObject } from "./api.ts";
import { runClosePipeline } from "./close-pipeline.ts";

async function enable(strategyId: string) {
  await postObject("/accounts", { pass: "enable", accountId: "acct-1", enabledStrategyId: strategyId });
}

async function closeOnce(label: string) {
  const r = await runClosePipeline("acct-1", "2026-05-20", "2026-05-20T08:00:00+08:00");
  console.log(label, {
    arrangementId: r.arrangementId,
    entryGate: r.entryGate,
    selectionMissing: r.selectionMissing,
    header: r.header,
    regime: r.regime,
  });
  return r;
}

async function main() {
  await enable("v44");
  await closeOnce("v44");

  await enable("v46-huimaqiang");
  await closeOnce("v46");
  const bars = await listObjects("/daily-bars?sessionDate=2026-05-19");
  const withScore = bars.filter((b) => b.scoreZj != null);
  console.log("scoreZj rows", withScore.length);
  if (withScore[0]) {
    console.log("sample", {
      ticker: withScore[0].ticker,
      scoreZj: withScore[0].scoreZj,
      scoreZjRank: withScore[0].scoreZjRank,
      luRecent20d: withScore[0].luRecent20d,
      ddFromHigh20: withScore[0].ddFromHigh20,
      volShrink: withScore[0].volShrink,
    });
  }

  await enable("v44");
  console.log("restored enabledStrategyId=v44");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
