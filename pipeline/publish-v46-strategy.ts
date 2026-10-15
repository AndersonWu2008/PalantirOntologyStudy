/** 发布 v46-huimaqiang Strategy（袖套 = V46_PARAMS，见 43）；制度门槛从 v44 复制 */
import { getObject, postObject } from "./api.ts";

async function main() {
  const v44 = await getObject("/strategies/v44");
  const body: Record<string, unknown> = {
    ...v44,
    strategyId: "v46-huimaqiang",
    displayName: "涨停回马枪",
    packId: "v46Huimaqiang",
    priceMin: 5,
    priceMax: 50,
    maxPerIndustry: 99,
    chinextLimitUpPercent: 19.8,
    mainLimitUpPercent: 9.8,
    bullAtrMultiple: 0,
    highVolAtrMultiple: 0,
    sidewaysAtrMultiple: 0,
    bullStopLoss: 0,
    highVolStopLoss: 0,
    sidewaysStopLoss: 0,
    bullTrailingActivate: 0.04,
    bullTrailingStop: 0.03,
    bullMaxHoldDays: 7,
    bullMaxPositions: 5,
    bullSinglePositionPct: 0.2,
    bullMinScore: 0,
    highVolTrailingActivate: 0.03,
    highVolTrailingStop: 0.025,
    highVolMaxHoldDays: 5,
    highVolMaxPositions: 5,
    highVolSinglePositionPct: 0.2,
    highVolMinScore: 0,
    sidewaysTrailingActivate: 0.02,
    sidewaysTrailingStop: 0.02,
    sidewaysMaxHoldDays: 3,
    sidewaysMaxPositions: 2,
    sidewaysSinglePositionPct: 0.1,
    sidewaysMinScore: 0.7,
    bearMaxPositions: 0,
    breadthMin: 0.45,
    regimeMinPersistDays: 2,
    exitOnRegimeFlip: true,
  };
  delete body.domain;

  try {
    const existing = await getObject(`/strategies/${encodeURIComponent(String(body.strategyId))}`);
    console.log("已存在", existing.strategyId, existing.packId, existing.displayName);
  } catch {
    const saved = await postObject("/strategies", body);
    console.log("已发布", saved.strategyId, saved.packId, saved.displayName);
  }

  const excludedRes = await fetch("http://127.0.0.1:3010/strategy-excluded-stocks?strategyId=v44");
  const excluded = (await excludedRes.json()) as { ticker: string }[];
  for (const row of excluded) {
    await postObject("/strategy-excluded-stocks", {
      strategyId: body.strategyId,
      ticker: row.ticker,
    });
  }
  console.log("黑名单", excluded.length);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
