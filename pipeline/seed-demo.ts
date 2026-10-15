/** 写入一键 demo 用的最小一套对象。已有的行保持不动。 */
const api = process.env.DATABASE_API ?? "http://127.0.0.1:3010";

const strategyId = "v46-huimaqiang";
const sessionDate = "2026-10-15";
const arrangementId = "demo-2026-10-15";

async function post(path: string, body: Record<string, unknown>): Promise<void> {
  const response = await fetch(`${api}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (response.ok || response.status === 409) return;
  const text = await response.text();
  throw new Error(`${path} ${response.status} ${text}`);
}

async function main(): Promise<void> {
  await post("/trading-days", {
    pass: "calendar",
    sessionDate,
    isTradingDay: true,
  });
  await post("/accounts", {
    pass: "snapshot",
    accountId: "acct-1",
    displayName: "演示账户",
    availableCash: 200000,
    totalAssets: 200000,
  });
  await post("/strategies", {
    strategyId,
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
  });
  await post("/accounts", {
    pass: "enable",
    accountId: "acct-1",
    enabledStrategyId: strategyId,
  });
  await post("/arrangements", {
    pass: "page",
    arrangementId,
    accountId: "acct-1",
    sessionDate,
    strategyId,
    handedOverAt: `${sessionDate}T08:00:00+08:00`,
    header: "还没写下委托",
  });
  console.log("demo objects ready");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
