/**
 * Write channels the database actually enforces.
 * save* functions and GET /schema both read this file.
 */

export type WriteChannel = {
  identity: string[];
  once: string[];
  replace: string[];
  clearable: string[];
  latch?: string[];
  requireExisting: boolean;
  insertRequires: string[];
};

export const dailyBarDerived = [
  "limitUp",
  "limitDown",
  "ma20",
  "atr14",
  "volRatio",
  "aboveMa20",
  "f1",
  "f2",
  "f3",
  "f4",
  "comparisonScore",
  "comparisonRank",
  "limitUpCount120",
  "resolvedIndustryId",
  "dayRet",
  "isLimitUp",
  "excluded",
  "luRecent20d",
  "luCount60d",
  "high20d",
  "ddFromHigh20",
  "volMa5",
  "volMax20d",
  "volShrink",
  "ret3d",
  "ma60",
  "scoreZj",
  "scoreZjRank",
];

export const tradingDayDerived = [
  "indexClose",
  "indexVolume",
  "totalAmount",
  "breadth",
  "regime",
  "bullHvStreak",
  "entryGate",
  "selectionMissing",
  "limitUpRatio",
  "limitDownRatio",
  "adx",
  "risingRatio",
  "volPercentile",
  "amountDeviation",
];

const arrangementDerived = [
  "header",
  "totalAssetsShown",
  "cashShown",
  "continueCount",
  "positionCountAgrees",
  "playbookChanged",
];

const arrangementDecision = [
  "headerAtConfirm",
  "totalAssetsAtConfirm",
  "cashAtConfirm",
  "sellConfirmedBy",
  "sellConfirmedAt",
  "buyConfirmedBy",
  "buyConfirmedAt",
];

const lineDerived = [
  "plannedQuantity",
  "submitQuantity",
  "plannedLimitPrice",
  "submitLimitPrice",
  "openPrice",
  "openChange",
  "amount",
  "weight",
  "outcome",
];

const barIdentity = ["barId", "ticker", "sessionDate"];

export const channelBook: Record<string, Record<string, WriteChannel>> = {
  "daily-bars": {
    open: {
      identity: barIdentity,
      once: ["open", "suspended"],
      replace: [],
      clearable: [],
      requireExisting: false,
      insertRequires: [],
    },
    close: {
      identity: barIdentity,
      once: ["high", "low", "close", "volume", "amount", "changePercent", "previousClose", "publishedIndustry"],
      replace: ["suspended"],
      clearable: [],
      requireExisting: false,
      insertRequires: [],
    },
    derived: {
      identity: barIdentity,
      once: [],
      replace: [],
      clearable: dailyBarDerived,
      requireExisting: true,
      insertRequires: [],
    },
  },
  "trading-days": {
    calendar: {
      identity: ["sessionDate"],
      once: ["isTradingDay"],
      replace: [],
      clearable: [],
      requireExisting: false,
      insertRequires: ["isTradingDay"],
    },
    derived: {
      identity: ["sessionDate"],
      once: [],
      replace: [],
      clearable: tradingDayDerived,
      requireExisting: true,
      insertRequires: [],
    },
  },
  accounts: {
    snapshot: {
      identity: ["accountId"],
      once: ["displayName"],
      replace: ["availableCash", "totalAssets"],
      clearable: [],
      requireExisting: false,
      insertRequires: ["displayName", "availableCash", "totalAssets"],
    },
    enable: {
      identity: ["accountId"],
      once: [],
      replace: ["enabledStrategyId"],
      clearable: [],
      requireExisting: true,
      insertRequires: [],
    },
  },
  positions: {
    book: {
      identity: ["positionId", "accountId", "ticker"],
      once: [],
      replace: ["quantity", "sellableQuantity"],
      clearable: [],
      requireExisting: false,
      insertRequires: ["quantity", "sellableQuantity"],
    },
    entry: {
      identity: ["positionId"],
      once: ["entryPrice", "entryDate", "atrAtEntry", "regimeAtEntry", "highSinceEntry", "daysHeld", "entryFieldsMissing"],
      replace: [],
      clearable: [],
      requireExisting: true,
      insertRequires: [],
    },
    roll: {
      identity: ["positionId"],
      once: [],
      replace: ["highSinceEntry", "daysHeld"],
      clearable: [],
      requireExisting: true,
      insertRequires: [],
    },
    exit: {
      identity: ["positionId"],
      once: [],
      replace: [],
      clearable: ["exitState", "exitJudgedOn", "exitReason"],
      requireExisting: true,
      insertRequires: [],
    },
  },
  arrangements: {
    page: {
      identity: ["arrangementId"],
      once: ["accountId", "sessionDate", "strategyId", "handedOverAt", "supersedesArrangementId"],
      replace: [],
      clearable: arrangementDerived,
      requireExisting: false,
      insertRequires: ["accountId", "sessionDate", "strategyId", "handedOverAt", "header"],
    },
    decision: {
      identity: ["arrangementId"],
      once: arrangementDecision,
      replace: [],
      clearable: [],
      latch: ["stopped", "nothingToSendAcknowledged"],
      requireExisting: true,
      insertRequires: [],
    },
  },
  "sell-lines": {
    page: {
      identity: ["sellLineId"],
      once: ["arrangementId", "ticker", "positionId"],
      replace: [],
      clearable: ["reason", ...lineDerived, "brokerSellable"],
      requireExisting: false,
      insertRequires: ["arrangementId", "ticker", "positionId", "reason", "plannedQuantity", "plannedLimitPrice"],
    },
    decision: {
      identity: ["sellLineId"],
      once: ["outcomeAtConfirm"],
      replace: [],
      clearable: [],
      latch: ["postponed"],
      requireExisting: true,
      insertRequires: [],
    },
  },
  "buy-lines": {
    page: {
      identity: ["buyLineId"],
      once: ["arrangementId", "ticker"],
      replace: [],
      clearable: ["rank", ...lineDerived],
      requireExisting: false,
      insertRequires: ["arrangementId", "ticker", "rank", "plannedQuantity", "plannedLimitPrice"],
    },
    decision: {
      identity: ["buyLineId"],
      once: ["outcomeAtConfirm"],
      replace: [],
      clearable: [],
      latch: ["vetoed"],
      requireExisting: true,
      insertRequires: [],
    },
  },
  signals: {
    write: {
      identity: ["signalId"],
      once: ["strategyId", "sessionDate", "ticker"],
      replace: ["rank", "plannedQuantity", "plannedLimitPrice"],
      clearable: [],
      requireExisting: false,
      insertRequires: ["strategyId", "sessionDate", "ticker", "rank", "plannedQuantity", "plannedLimitPrice"],
    },
  },
  "sell-orders": {
    content: {
      identity: ["orderId"],
      once: ["sellLineId", "quantity", "limitPrice", "contentStatus", "executionStatus"],
      replace: [],
      clearable: [],
      requireExisting: false,
      insertRequires: ["sellLineId", "quantity", "limitPrice", "contentStatus", "executionStatus"],
    },
    execution: {
      identity: ["orderId"],
      once: [],
      replace: ["brokerOrderId", "executionStatus"],
      clearable: ["executionWrittenAt"],
      requireExisting: true,
      insertRequires: [],
    },
  },
  "buy-orders": {
    content: {
      identity: ["orderId"],
      once: ["buyLineId", "quantity", "limitPrice", "contentStatus", "executionStatus"],
      replace: [],
      clearable: [],
      requireExisting: false,
      insertRequires: ["buyLineId", "quantity", "limitPrice", "contentStatus", "executionStatus"],
    },
    execution: {
      identity: ["orderId"],
      once: [],
      replace: ["brokerOrderId", "executionStatus"],
      clearable: ["executionWrittenAt"],
      requireExisting: true,
      insertRequires: [],
    },
  },
};

export const fillOnce = ["accountId", "ticker", "sessionDate", "side", "price", "quantity"];

export function strategyChannel(columnJsons: string[]): WriteChannel {
  return {
    identity: ["strategyId"],
    once: columnJsons.filter((json) => json !== "strategyId"),
    replace: [],
    clearable: [],
    requireExisting: false,
    insertRequires: ["displayName"],
  };
}

export function channelFor(resource: string, pass: unknown): WriteChannel | undefined {
  if (typeof pass !== "string") return undefined;
  return channelBook[resource]?.[pass];
}

type Column = { json: string; column: string };

type ResourceShape = {
  table: string;
  columns: Column[];
  conflict: string[];
};

const objectMeta: Record<string, { apiName: string; displayName: string; titleKey: string }> = {
  accounts: { apiName: "Account", displayName: "账户", titleKey: "displayName" },
  stocks: { apiName: "Stock", displayName: "股票", titleKey: "displayName" },
  industries: { apiName: "Industry", displayName: "行业", titleKey: "displayName" },
  "tradable-ranges": { apiName: "TradableRange", displayName: "可买范围", titleKey: "displayName" },
  strategies: { apiName: "Strategy", displayName: "做法", titleKey: "displayName" },
  "trading-days": { apiName: "TradingDay", displayName: "交易日", titleKey: "sessionDate" },
  "daily-bars": { apiName: "DailyBar", displayName: "日行情", titleKey: "barId" },
  positions: { apiName: "Position", displayName: "持仓", titleKey: "positionId" },
  fills: { apiName: "Fill", displayName: "成交", titleKey: "fillId" },
  signals: { apiName: "Signal", displayName: "信号", titleKey: "signalId" },
  arrangements: { apiName: "PreOpenArrangement", displayName: "开盘安排", titleKey: "arrangementId" },
  "sell-lines": { apiName: "SellLine", displayName: "卖出行", titleKey: "sellLineId" },
  "buy-lines": { apiName: "BuyLine", displayName: "买入行", titleKey: "buyLineId" },
  "sell-orders": { apiName: "SellOrder", displayName: "卖出委托", titleKey: "orderId" },
  "buy-orders": { apiName: "BuyOrder", displayName: "买入委托", titleKey: "orderId" },
  "evaluation-runs": { apiName: "EvaluationRun", displayName: "评估", titleKey: "displayName" },
  "evaluation-points": { apiName: "EvaluationPoint", displayName: "评估点", titleKey: "pointId" },
  "evaluation-trades": { apiName: "EvaluationTrade", displayName: "评估成交", titleKey: "tradeId" },
};

type LinkSpec = {
  apiName: string;
  displayName: string;
  description: string;
  cardinality: "many-to-one" | "many-to-many";
  sourceType: string;
  sourceProperty: string;
  targetType: string;
  targetProperty: string;
};

const links: LinkSpec[] = [
  { apiName: "inAccount", displayName: "持仓在哪个账户", description: "持仓.accountId 指向账户。", cardinality: "many-to-one", sourceType: "Position", sourceProperty: "accountId", targetType: "Account", targetProperty: "accountId" },
  { apiName: "positionForStock", displayName: "持仓是哪只股票", description: "持仓.ticker 指向股票。", cardinality: "many-to-one", sourceType: "Position", sourceProperty: "ticker", targetType: "Stock", targetProperty: "ticker" },
  { apiName: "enabledStrategy", displayName: "账户启用的做法", description: "账户.enabledStrategyId 指向做法。", cardinality: "many-to-one", sourceType: "Account", sourceProperty: "enabledStrategyId", targetType: "Strategy", targetProperty: "strategyId" },
  { apiName: "usesUniverse", displayName: "做法用哪个范围", description: "做法.universeIndexId 指向可买范围。", cardinality: "many-to-one", sourceType: "Strategy", sourceProperty: "universeIndexId", targetType: "TradableRange", targetProperty: "indexId" },
  { apiName: "excludesStock", displayName: "做法排除的股票", description: "表 strategy_excluded_stock，键是 strategyId 与 ticker。", cardinality: "many-to-many", sourceType: "Strategy", sourceProperty: "strategyId", targetType: "Stock", targetProperty: "ticker" },
  { apiName: "barForStock", displayName: "行情属于哪只股票", description: "日行情.ticker 指向股票。", cardinality: "many-to-one", sourceType: "DailyBar", sourceProperty: "ticker", targetType: "Stock", targetProperty: "ticker" },
  { apiName: "barOnTradingDay", displayName: "行情在哪一天", description: "日行情.sessionDate 指向交易日。", cardinality: "many-to-one", sourceType: "DailyBar", sourceProperty: "sessionDate", targetType: "TradingDay", targetProperty: "sessionDate" },
  { apiName: "resolvedInIndustry", displayName: "行情归到哪个行业", description: "日行情.resolvedIndustryId 指向行业。", cardinality: "many-to-one", sourceType: "DailyBar", sourceProperty: "resolvedIndustryId", targetType: "Industry", targetProperty: "industryId" },
  { apiName: "constituentOf", displayName: "范围里的成分", description: "表 index_constituent，键是 indexId 与 ticker。", cardinality: "many-to-many", sourceType: "TradableRange", sourceProperty: "indexId", targetType: "Stock", targetProperty: "ticker" },
  { apiName: "signalUsesStrategy", displayName: "信号用哪个做法", description: "信号.strategyId 指向做法。", cardinality: "many-to-one", sourceType: "Signal", sourceProperty: "strategyId", targetType: "Strategy", targetProperty: "strategyId" },
  { apiName: "signalForTradingDay", displayName: "信号在哪一天", description: "信号.sessionDate 指向交易日。", cardinality: "many-to-one", sourceType: "Signal", sourceProperty: "sessionDate", targetType: "TradingDay", targetProperty: "sessionDate" },
  { apiName: "signalForStock", displayName: "信号是哪只股票", description: "信号.ticker 指向股票。", cardinality: "many-to-one", sourceType: "Signal", sourceProperty: "ticker", targetType: "Stock", targetProperty: "ticker" },
  { apiName: "fillForAccount", displayName: "成交在哪个账户", description: "成交.accountId 指向账户。", cardinality: "many-to-one", sourceType: "Fill", sourceProperty: "accountId", targetType: "Account", targetProperty: "accountId" },
  { apiName: "fillForStock", displayName: "成交是哪只股票", description: "成交.ticker 指向股票。", cardinality: "many-to-one", sourceType: "Fill", sourceProperty: "ticker", targetType: "Stock", targetProperty: "ticker" },
  { apiName: "fillForTradingDay", displayName: "成交在哪一天", description: "成交.sessionDate 指向交易日。", cardinality: "many-to-one", sourceType: "Fill", sourceProperty: "sessionDate", targetType: "TradingDay", targetProperty: "sessionDate" },
  { apiName: "fillForPosition", displayName: "成交记到哪笔持仓", description: "成交.positionId 指向持仓。写入后不能改。", cardinality: "many-to-one", sourceType: "Fill", sourceProperty: "positionId", targetType: "Position", targetProperty: "positionId" },
  { apiName: "forAccount", displayName: "安排属于哪个账户", description: "开盘安排.accountId 指向账户。", cardinality: "many-to-one", sourceType: "PreOpenArrangement", sourceProperty: "accountId", targetType: "Account", targetProperty: "accountId" },
  { apiName: "forTradingDay", displayName: "安排在哪一天", description: "开盘安排.sessionDate 指向交易日。", cardinality: "many-to-one", sourceType: "PreOpenArrangement", sourceProperty: "sessionDate", targetType: "TradingDay", targetProperty: "sessionDate" },
  { apiName: "usesStrategy", displayName: "安排用哪个做法", description: "开盘安排.strategyId 指向做法。", cardinality: "many-to-one", sourceType: "PreOpenArrangement", sourceProperty: "strategyId", targetType: "Strategy", targetProperty: "strategyId" },
  { apiName: "supersedes", displayName: "这份安排取代哪一份", description: "开盘安排.supersedesArrangementId 指向另一份安排。", cardinality: "many-to-one", sourceType: "PreOpenArrangement", sourceProperty: "supersedesArrangementId", targetType: "PreOpenArrangement", targetProperty: "arrangementId" },
  { apiName: "sellLineOnArrangement", displayName: "卖出行属于哪份安排", description: "卖出行.arrangementId 指向开盘安排。", cardinality: "many-to-one", sourceType: "SellLine", sourceProperty: "arrangementId", targetType: "PreOpenArrangement", targetProperty: "arrangementId" },
  { apiName: "sellLineForPosition", displayName: "卖出行针对哪笔持仓", description: "卖出行.positionId 指向持仓。", cardinality: "many-to-one", sourceType: "SellLine", sourceProperty: "positionId", targetType: "Position", targetProperty: "positionId" },
  { apiName: "sellLineForStock", displayName: "卖出行是哪只股票", description: "卖出行.ticker 指向股票。", cardinality: "many-to-one", sourceType: "SellLine", sourceProperty: "ticker", targetType: "Stock", targetProperty: "ticker" },
  { apiName: "buyLineOnArrangement", displayName: "买入行属于哪份安排", description: "买入行.arrangementId 指向开盘安排。", cardinality: "many-to-one", sourceType: "BuyLine", sourceProperty: "arrangementId", targetType: "PreOpenArrangement", targetProperty: "arrangementId" },
  { apiName: "buyLineForStock", displayName: "买入行是哪只股票", description: "买入行.ticker 指向股票。", cardinality: "many-to-one", sourceType: "BuyLine", sourceProperty: "ticker", targetType: "Stock", targetProperty: "ticker" },
  { apiName: "fromSellLine", displayName: "卖出委托来自哪一行", description: "卖出委托.sellLineId 指向卖出行。", cardinality: "many-to-one", sourceType: "SellOrder", sourceProperty: "sellLineId", targetType: "SellLine", targetProperty: "sellLineId" },
  { apiName: "fromBuyLine", displayName: "买入委托来自哪一行", description: "买入委托.buyLineId 指向买入行。", cardinality: "many-to-one", sourceType: "BuyOrder", sourceProperty: "buyLineId", targetType: "BuyLine", targetProperty: "buyLineId" },
  { apiName: "evaluationForStrategy", displayName: "评估用哪个做法", description: "评估.strategyId 指向做法。", cardinality: "many-to-one", sourceType: "EvaluationRun", sourceProperty: "strategyId", targetType: "Strategy", targetProperty: "strategyId" },
  { apiName: "pointOnRun", displayName: "评估点属于哪次评估", description: "评估点.runId 指向评估。", cardinality: "many-to-one", sourceType: "EvaluationPoint", sourceProperty: "runId", targetType: "EvaluationRun", targetProperty: "runId" },
  { apiName: "tradeOnRun", displayName: "评估成交属于哪次评估", description: "评估成交.runId 指向评估。", cardinality: "many-to-one", sourceType: "EvaluationTrade", sourceProperty: "runId", targetType: "EvaluationRun", targetProperty: "runId" },
  { apiName: "tradeForStock", displayName: "评估成交是哪只股票", description: "评估成交.ticker 指向股票。", cardinality: "many-to-one", sourceType: "EvaluationTrade", sourceProperty: "ticker", targetType: "Stock", targetProperty: "ticker" },
];

const joinResources = new Set(["strategy-excluded-stocks", "index-constituents"]);

const modeWord: Record<string, string> = {
  identity: "身份",
  once: "一次",
  replace: "可替换",
  clearable: "可清空",
  latch: "闩住",
};

function propertyPasses(
  resourceName: string,
  json: string,
  strategy: WriteChannel | null,
): string {
  const parts: string[] = [];
  const book = resourceName === "strategies" && strategy
    ? { save: strategy }
    : channelBook[resourceName];
  if (book) {
    for (const [pass, channel] of Object.entries(book)) {
      const mode = (["identity", "once", "replace", "clearable", "latch"] as const).find((key) =>
        (channel[key] ?? []).includes(json),
      );
      if (mode) parts.push(`${pass} ${modeWord[mode]}`);
    }
  }
  if (resourceName === "fills") {
    if (json === "fillId") parts.push("record 身份");
    else if (fillOnce.includes(json)) parts.push("record 一次");
    else if (json === "positionId") parts.push("record 一次");
  }
  if (parts.length === 0) {
    return joinResources.has(resourceName) || !channelBook[resourceName] && resourceName !== "fills" && resourceName !== "strategies"
      ? "整行写入"
      : "—";
  }
  return parts.join(" · ");
}

export function ontologySchema(resources: Record<string, ResourceShape>) {
  const byApi = new Map<string, { resource: string; columns: Set<string> }>();
  for (const [name, meta] of Object.entries(objectMeta)) {
    const resource = resources[name];
    if (!resource) throw new Error(`schema object ${name} is not a resource`);
    byApi.set(meta.apiName, { resource: name, columns: new Set(resource.columns.map((column) => column.json)) });
  }
  for (const name of Object.keys(resources)) {
    if (!objectMeta[name] && !joinResources.has(name)) {
      throw new Error(`resource ${name} is missing from the schema`);
    }
  }
  for (const [name, passes] of Object.entries(channelBook)) {
    const columns = new Set(resources[name]?.columns.map((column) => column.json) ?? []);
    for (const channel of Object.values(passes)) {
      const keys = [
        ...channel.identity,
        ...channel.once,
        ...channel.replace,
        ...channel.clearable,
        ...(channel.latch ?? []),
        ...channel.insertRequires,
      ];
      for (const key of keys) {
        if (!columns.has(key)) throw new Error(`${name} channel writes ${key}, which is not a column`);
      }
    }
  }
  const strategy = strategyChannel(resources.strategies.columns.map((column) => column.json));
  for (const key of [...strategy.identity, ...strategy.once, ...strategy.insertRequires]) {
    if (!resources.strategies.columns.some((column) => column.json === key)) {
      throw new Error(`strategies channel writes ${key}, which is not a column`);
    }
  }
  for (const link of links) {
    const source = byApi.get(link.sourceType);
    const target = byApi.get(link.targetType);
    if (!source || !source.columns.has(link.sourceProperty)) {
      throw new Error(`link ${link.apiName} source ${link.sourceType}.${link.sourceProperty} is not a column`);
    }
    if (!target || !target.columns.has(link.targetProperty)) {
      throw new Error(`link ${link.apiName} target ${link.targetType}.${link.targetProperty} is not a column`);
    }
  }

  const objectTypes = Object.entries(objectMeta).map(([resourceName, meta]) => {
    const resource = resources[resourceName];
    const primary = resource.conflict.map((column) => resource.columns.find((item) => item.column === column)?.json ?? column);
    return {
      apiName: meta.apiName,
      displayName: meta.displayName,
      resource: resourceName,
      table: resource.table,
      primaryKey: primary.join(" + "),
      titleKey: meta.titleKey,
      properties: resource.columns.map((column) => ({
        apiName: column.json,
        column: column.column,
        displayName: column.json,
        writeChannel: propertyPasses(resourceName, column.json, resourceName === "strategies" ? strategy : null),
        required: primary.includes(column.json),
      })),
    };
  });

  return {
    domain: "StockTrading",
    objectTypes,
    linkTypes: links,
  };
}
