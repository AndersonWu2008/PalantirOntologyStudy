import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)));
const objectDir = join(root, "object-types");
const valueDir = join(root, "value-types");
const linkDir = join(root, "link-types");

function kebab(apiName) {
  return apiName
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/([A-Za-z])(\d)/g, "$1-$2")
    .toLowerCase();
}

function prop(objectId, apiName, displayName, baseType, extra = {}) {
  const id = kebab(apiName);
  const property = {
    id,
    rid: `ri.ontology.study.property.${objectId}.${id}`,
    apiName,
    displayName,
    status: "experimental",
    visibility: extra.visibility ?? "normal",
    baseType: { type: baseType },
    required: extra.required ?? false,
    renderHints: extra.renderHints ?? { searchable: true, sortable: true },
  };
  if (extra.description) property.description = extra.description;
  if (extra.valueType) property.valueType = extra.valueType;
  if (extra.sharedProperty) property.sharedProperty = extra.sharedProperty;
  if (extra.typeClasses) property.typeClasses = extra.typeClasses;
  if (extra.valueFormatting) property.valueFormatting = extra.valueFormatting;
  return property;
}

const write = (name) => [{ kind: "write", name }];
const money = { kind: "numeric", numeric: { style: "currency", currency: "CNY", useGrouping: true } };
const day = { kind: "dateTime", dateTime: { pattern: "date" } };
const hiddenId = { visibility: "hidden", required: true, renderHints: { searchable: true, sortable: true, identifier: true } };

function objectType(id, apiName, displayName, plural, description, primaryKey, titleKey, properties, icon) {
  const withDomain = [
    prop(id, "domain", "域", "string", {
      required: true,
      valueType: "Domain",
      sharedProperty: "domain",
      description: "这一对象属于哪个域。当前交易域是 StockTrading。查询时用它过滤。",
      typeClasses: write("identity"),
      renderHints: { searchable: true, sortable: true, selectable: true, lowCardinality: true },
    }),
    ...properties,
  ];
  return {
    $schema: "../../schema/object-type.schema.json",
    id,
    rid: `ri.ontology.study.object-type.${id}`,
    apiName,
    displayName,
    pluralDisplayName: plural,
    description,
    groups: ["a-share"],
    icon,
    status: "experimental",
    visibility: "prominent",
    primaryKey,
    titleKey,
    properties: Object.fromEntries(withDomain.map((item) => [item.apiName, item])),
  };
}

function valueType(id, apiName, displayName, description, values) {
  return {
    $schema: "../../schema/value-type.schema.json",
    id,
    rid: `ri.ontology.study.value-type.${id}`,
    apiName,
    displayName,
    description,
    baseType: { type: "string" },
    constraints: [{ type: "enum", values }],
  };
}

function linkType(apiName, displayName, description, cardinality, source, target) {
  return { apiName, displayName, description, cardinality, source, target };
}

const values = {
  Board: ["主板", "创业板"],
  RegimeLabel: ["牛市趋势", "高波动", "震荡", "熊市趋势"],
  EntryGate: ["允许", "关闭", "缺少"],
  SellReason: ["止损", "止盈", "到期", "制度离场"],
  ExitState: ["继续拿", "缺少", "已写入卖出行"],
  FillSide: ["买入", "卖出"],
  OrderContentStatus: ["待执行", "不执行"],
  ExecutionStatus: ["未执行", "已提交执行", "已受理", "被拒绝"],
  HeaderSentence: [
    "还没写下委托",
    "等开盘价",
    "和券商对不上",
    "没做完",
    "这份已作废",
    "做法不对",
    "互相矛盾",
    "持仓只数对不上",
    "今天停止",
    "委托已写下、待程序执行",
    "程序已提交执行",
    "今天没有要执行的",
  ],
  SellOutcome: [
    "可写入委托",
    "挂涨停价",
    "跌停今天不报",
    "停牌今天不写入",
    "今天卖不掉可卖是 0",
    "卖掉可卖的其余今天卖不掉",
    "今天先不卖你推迟了",
    "已写入待执行",
    "今天未写入",
  ],
  BuyOutcome: [
    "可写入委托",
    "今天不买开盘涨停",
    "今天不买停牌",
    "今天不买这个限价买不进",
    "今天不买你否决了",
    "今天不买已过 9:30",
    "今天不买钱不够",
    "今天不买超过约定只数",
    "今天不买不在范围",
    "今天不买不是整手",
    "已写入待执行",
  ],
};

const valueMeta = {
  Board: "沪深主板或创业板。其他板块不填。",
  RegimeLabel: "这一天的市场制度。空着表示缺少，不是震荡。",
  EntryGate: "明天许不许开新仓。",
  SellReason: "卖出安排上的一句原因。",
  ExitState: "这只持仓这一日的退出结论。",
  FillSide: "成交回报是买入还是卖出。",
  OrderContentStatus: "委托内容是否待程序执行。",
  ExecutionStatus: "程序把委托送到券商之后的状态。",
  HeaderSentence: "开盘安排页首允许出现的句子。",
  SellOutcome: "开盘之后这一行卖出变成怎样。",
  BuyOutcome: "开盘之后这一行买入变成怎样。",
};

const px = (objectId, apiName, displayName, channel, extra = {}) =>
  prop(objectId, apiName, displayName, "double", {
    ...extra,
    typeClasses: write(channel),
    valueFormatting: money,
  });

const objects = [];

objects.push(
  objectType(
    "account",
    "Account",
    "账户",
    "账户",
    "券商账本上的现金和总资产。同步替换最新数，不在这里留历史。确认当时的数抄在开盘安排上。",
    "accountId",
    "displayName",
    [
      prop("account", "accountId", "账户身份", "string", { ...hiddenId, typeClasses: write("identity") }),
      prop("account", "displayName", "户名", "string", { required: true, visibility: "prominent", typeClasses: write("identity") }),
      prop("account", "availableCash", "可用资金", "double", { required: true, typeClasses: write("snapshot"), valueFormatting: money, description: "账户同步每次替换。缺了不写成 0。" }),
      prop("account", "totalAssets", "总资产", "double", { required: true, typeClasses: write("snapshot"), valueFormatting: money }),
      prop("account", "enabledStrategyId", "启用的做法", "string", { typeClasses: write("decision"), description: "只有启用一版做法时改。" }),
    ],
    { name: "wallet", color: "#1677ff" },
  ),
);

objects.push(
  objectType(
    "stock",
    "Stock",
    "股票",
    "股票",
    "一只沪深 A 股。代码是身份。板块和是否 ST 来自证券资料同步。",
    "ticker",
    "displayName",
    [
      prop("stock", "ticker", "代码", "string", { ...hiddenId, visibility: "prominent", description: "例如 600036.SH。" }),
      prop("stock", "displayName", "简称", "string", { required: true, visibility: "prominent", typeClasses: write("security") }),
      prop("stock", "isSt", "是否 ST", "boolean", { required: true, typeClasses: write("security") }),
      prop("stock", "board", "板块", "string", { valueType: "Board", typeClasses: write("security"), description: "主板或创业板。其他板块留空。" }),
    ],
    { name: "line-chart", color: "#faad14" },
  ),
);

objects.push(
  objectType(
    "industry",
    "Industry",
    "行业",
    "行业",
    "供行业上限点名的行业。不把空行业收成一类。",
    "industryId",
    "displayName",
    [
      prop("industry", "industryId", "行业身份", "string", { ...hiddenId }),
      prop("industry", "displayName", "行业名称", "string", { required: true, visibility: "prominent" }),
    ],
    { name: "apartment", color: "#722ed1" },
  ),
);

objects.push(
  objectType(
    "tradable-range",
    "TradableRange",
    "可买范围",
    "可买范围",
    "广度、比较数和买入入选用的同一个范围。文档 25 里称作 Index。不另造打分池。",
    "indexId",
    "displayName",
    [
      prop("tradable-range", "indexId", "范围身份", "string", { ...hiddenId }),
      prop("tradable-range", "displayName", "范围名称", "string", { required: true, visibility: "prominent" }),
    ],
    { name: "appstore", color: "#13c2c2" },
  ),
);

const strategyNumbers = [
  ["breadthMin", "广度下限"],
  ["priceMin", "价格下限"],
  ["priceMax", "价格上限"],
  ["limitDownPercent", "跌停计数百分点"],
  ["limitUpCountPercent", "涨停家数百分点"],
  ["chinextLimitUpPercent", "创业板涨停计数百分点"],
  ["mainLimitUpPercent", "其余涨停计数百分点"],
  ["bullStopLoss", "牛市固定止损比例"],
  ["bullTrailingActivate", "牛市移动止盈激活"],
  ["bullTrailingStop", "牛市自高点回落"],
  ["bullSinglePositionPct", "牛市单只占比"],
  ["bullMinScore", "牛市最低比较分位"],
  ["bullAtrMultiple", "牛市 ATR 倍数"],
  ["highVolStopLoss", "高波动固定止损比例"],
  ["highVolTrailingActivate", "高波动移动止盈激活"],
  ["highVolTrailingStop", "高波动自高点回落"],
  ["highVolSinglePositionPct", "高波动单只占比"],
  ["highVolMinScore", "高波动最低比较分位"],
  ["highVolAtrMultiple", "高波动 ATR 倍数"],
  ["sidewaysStopLoss", "震荡固定止损比例"],
  ["sidewaysTrailingActivate", "震荡移动止盈激活"],
  ["sidewaysTrailingStop", "震荡自高点回落"],
  ["sidewaysSinglePositionPct", "震荡单只占比"],
  ["sidewaysMinScore", "震荡最低比较分位"],
  ["sidewaysAtrMultiple", "震荡 ATR 倍数"],
  ["adxBullMin", "牛市趋势强度下限"],
  ["adxBearMin", "熊市趋势强度下限"],
  ["risingRatioBull", "牛市上涨比例下限"],
  ["risingRatioBear", "熊市上涨比例上限"],
  ["volPercentileHigh", "高波动分位"],
  ["limitDownBearRatio", "跌停家数占比门槛"],
  ["amountShrinkWarn", "缩量警告"],
  ["limitUpOverheat", "涨停过热"],
  ["limitUpIce", "涨停冰点"],
];
const strategyInts = [
  ["regimeMinPersistDays", "制度连续天数"],
  ["maxPerIndustry", "每行业最多只数"],
  ["limitUpCountMin", "涨停次数下限"],
  ["consecutiveLimitDownDays", "连续跌停天数"],
  ["bullMaxHoldDays", "牛市最长持有天数"],
  ["bullMaxPositions", "牛市最多只数"],
  ["highVolMaxHoldDays", "高波动最长持有天数"],
  ["highVolMaxPositions", "高波动最多只数"],
  ["sidewaysMaxHoldDays", "震荡最长持有天数"],
  ["sidewaysMaxPositions", "震荡最多只数"],
  ["bearMaxPositions", "熊市最多只数"],
  ["maShort", "短均线"],
  ["maMid", "中均线"],
  ["maLong", "长均线"],
  ["volWindow", "波动率窗口"],
  ["amountMaWindow", "成交额均线"],
  ["minHistoryDays", "最少历史天数"],
  ["indexLookback", "指数回看天数"],
];

objects.push(
  objectType(
    "strategy",
    "Strategy",
    "做法版本",
    "做法版本",
    "一版参数。发布后不改这些数。换参数是新建一个对象。",
    "strategyId",
    "displayName",
    [
      prop("strategy", "strategyId", "做法身份", "string", { ...hiddenId, typeClasses: write("decision") }),
      prop("strategy", "displayName", "做法名称", "string", { required: true, visibility: "prominent", typeClasses: write("decision") }),
      prop("strategy", "universeIndexId", "可买范围", "string", { typeClasses: write("decision") }),
      prop("strategy", "exitOnRegimeFlip", "离开牛市和高波动时离场", "boolean", { typeClasses: write("decision") }),
      ...strategyNumbers.map(([apiName, displayName]) =>
        prop("strategy", apiName, displayName, "double", { typeClasses: write("decision") }),
      ),
      ...strategyInts.map(([apiName, displayName]) =>
        prop("strategy", apiName, displayName, "integer", { typeClasses: write("decision") }),
      ),
    ],
    { name: "control", color: "#2f54eb" },
  ),
);

objects.push(
  objectType(
    "trading-day",
    "TradingDay",
    "交易日",
    "交易日",
    "交易所日历上的一天，以及这一天由池内行情算出的等权指数、广度和制度。",
    "sessionDate",
    "sessionDate",
    [
      prop("trading-day", "sessionDate", "日期", "date", { required: true, visibility: "prominent", typeClasses: write("calendar"), valueFormatting: day }),
      prop("trading-day", "isTradingDay", "是否交易日", "boolean", { required: true, typeClasses: write("calendar") }),
      prop("trading-day", "indexClose", "等权指数收盘", "double", { typeClasses: write("derived") }),
      prop("trading-day", "indexVolume", "等权均量", "double", { typeClasses: write("derived") }),
      prop("trading-day", "totalAmount", "总成交额", "double", { typeClasses: write("derived"), valueFormatting: money }),
      prop("trading-day", "breadth", "广度", "double", { typeClasses: write("derived") }),
      prop("trading-day", "regime", "制度", "string", { valueType: "RegimeLabel", typeClasses: write("derived") }),
      prop("trading-day", "bullHvStreak", "牛市或高波动连续天数", "integer", { typeClasses: write("derived") }),
      prop("trading-day", "entryGate", "开仓门", "string", { valueType: "EntryGate", typeClasses: write("derived") }),
      prop("trading-day", "selectionMissing", "入选写不出来", "boolean", { typeClasses: write("derived") }),
      prop("trading-day", "limitUpRatio", "涨停家数占比", "double", { typeClasses: write("derived") }),
      prop("trading-day", "limitDownRatio", "跌停家数占比", "double", { typeClasses: write("derived") }),
      prop("trading-day", "adx", "趋势强度", "double", { typeClasses: write("derived") }),
      prop("trading-day", "risingRatio", "上涨比例", "double", { typeClasses: write("derived") }),
      prop("trading-day", "volPercentile", "波动率分位", "double", { typeClasses: write("derived") }),
      prop("trading-day", "amountDeviation", "成交额偏离", "double", { typeClasses: write("derived") }),
    ],
    { name: "calendar", color: "#52c41a" },
  ),
);

objects.push(
  objectType(
    "daily-bar",
    "DailyBar",
    "当日行情",
    "当日行情",
    "一只股票一个交易日一行。开盘同步写开盘价，收盘同步写收盘和量，计算再写派生数。已经写下的价格不能改成另一个数。",
    "barId",
    "barId",
    [
      prop("daily-bar", "barId", "行情身份", "string", { ...hiddenId, description: "代码|交易日，例如 600036.SH|2026-10-09。", typeClasses: write("identity") }),
      prop("daily-bar", "ticker", "代码", "string", { required: true, typeClasses: write("identity") }),
      prop("daily-bar", "sessionDate", "交易日", "date", { required: true, typeClasses: write("identity"), valueFormatting: day }),
      px("daily-bar", "open", "开盘价", "source-open", { description: "9:25 写入。已有值再送来不同的价则拒绝。" }),
      px("daily-bar", "high", "最高价", "source-close"),
      px("daily-bar", "low", "最低价", "source-close"),
      px("daily-bar", "close", "收盘价", "source-close"),
      prop("daily-bar", "volume", "成交量", "double", { typeClasses: write("source-close") }),
      px("daily-bar", "amount", "成交额", "source-close"),
      prop("daily-bar", "changePercent", "涨跌幅", "double", { typeClasses: write("source-close"), description: "材料里已经写明的百分点。不在这里用前收再除一遍。" }),
      px("daily-bar", "previousClose", "前收", "source-close"),
      prop("daily-bar", "suspended", "是否停牌", "boolean", { typeClasses: write("source-close"), description: "开盘同步只在空着时写入。收盘同步可以改，因为盘中可能停牌。" }),
      prop("daily-bar", "publishedIndustry", "当日行业标签", "string", { typeClasses: write("source-close"), description: "这一日资料上的原文。空着不覆盖已有标签。" }),
      px("daily-bar", "limitUp", "涨停价", "derived"),
      px("daily-bar", "limitDown", "跌停价", "derived"),
      prop("daily-bar", "ma20", "20 日均线", "double", { typeClasses: write("derived") }),
      prop("daily-bar", "atr14", "14 日 ATR", "double", { typeClasses: write("derived") }),
      prop("daily-bar", "volRatio", "量比", "double", { typeClasses: write("derived") }),
      prop("daily-bar", "aboveMa20", "收盘高于均线", "boolean", { typeClasses: write("derived") }),
      prop("daily-bar", "f1", "涨幅分位", "double", { typeClasses: write("derived") }),
      prop("daily-bar", "f2", "量价背离分位", "double", { typeClasses: write("derived") }),
      prop("daily-bar", "f3", "波动分位", "double", { typeClasses: write("derived") }),
      prop("daily-bar", "f4", "低换手分位", "double", { typeClasses: write("derived") }),
      prop("daily-bar", "comparisonScore", "比较数", "double", { typeClasses: write("derived") }),
      prop("daily-bar", "comparisonRank", "比较数分位", "double", { typeClasses: write("derived") }),
      prop("daily-bar", "limitUpCount120", "近 120 日涨停次数", "integer", { typeClasses: write("derived") }),
      prop("daily-bar", "resolvedIndustryId", "供上限使用的行业", "string", { typeClasses: write("derived") }),
    ],
    { name: "bar-chart", color: "#14b8a6" },
  ),
);

objects.push(
  objectType(
    "position",
    "Position",
    "持仓",
    "持仓",
    "一户里的一只持仓。股数由账户同步替换。入场字段只写一次。最高价和持有天数由日更改。",
    "positionId",
    "positionId",
    [
      prop("position", "positionId", "持仓身份", "string", { ...hiddenId, typeClasses: write("identity") }),
      prop("position", "accountId", "账户", "string", { required: true, typeClasses: write("identity") }),
      prop("position", "ticker", "代码", "string", { required: true, typeClasses: write("identity") }),
      prop("position", "quantity", "持仓股数", "long", { required: true, typeClasses: write("snapshot") }),
      prop("position", "sellableQuantity", "可卖股数", "long", { required: true, typeClasses: write("snapshot") }),
      px("position", "entryPrice", "入场价", "once"),
      prop("position", "entryDate", "入场日", "date", { typeClasses: write("once"), valueFormatting: day }),
      prop("position", "atrAtEntry", "入场日 ATR", "double", { typeClasses: write("once") }),
      prop("position", "regimeAtEntry", "入场制度", "string", { valueType: "RegimeLabel", typeClasses: write("once") }),
      px("position", "highSinceEntry", "自入场最高价", "roll"),
      prop("position", "daysHeld", "持有天数", "integer", { typeClasses: write("roll") }),
      prop("position", "entryFieldsMissing", "入场字段缺少", "boolean", { typeClasses: write("once") }),
      prop("position", "exitState", "退出结论", "string", { valueType: "ExitState", typeClasses: write("derived") }),
      prop("position", "exitJudgedOn", "结论所属交易日", "date", { typeClasses: write("derived"), valueFormatting: day }),
      prop("position", "exitReason", "退出原因", "string", { valueType: "SellReason", typeClasses: write("derived") }),
    ],
    { name: "container", color: "#eb2f96" },
  ),
);

objects.push(
  objectType(
    "fill",
    "Fill",
    "成交回报",
    "成交回报",
    "券商回报里的一笔成交。同一编号只插入一次。价或股数不同则拒绝，不改成新的一笔。",
    "fillId",
    "fillId",
    [
      prop("fill", "fillId", "成交编号", "string", { ...hiddenId, typeClasses: write("once") }),
      prop("fill", "accountId", "账户", "string", { required: true, typeClasses: write("once") }),
      prop("fill", "ticker", "代码", "string", { required: true, typeClasses: write("once") }),
      prop("fill", "sessionDate", "成交日", "date", { required: true, typeClasses: write("once"), valueFormatting: day }),
      prop("fill", "side", "方向", "string", { required: true, valueType: "FillSide", typeClasses: write("once") }),
      px("fill", "price", "成交价", "once", { required: true }),
      prop("fill", "quantity", "成交股数", "long", { required: true, typeClasses: write("once") }),
      prop("fill", "positionId", "持仓", "string", { typeClasses: write("link-once"), description: "空着时可以补上持仓链接。已有链接再改到另一笔则拒绝。" }),
    ],
    { name: "swap", color: "#fa541c" },
  ),
);

objects.push(
  objectType(
    "signal",
    "Signal",
    "买入入选",
    "买入入选",
    "收盘后这一版做法提议新开的一只。还不是页上的买入行。开仓门关闭时不创建。",
    "signalId",
    "signalId",
    [
      prop("signal", "signalId", "入选身份", "string", { ...hiddenId, typeClasses: write("derived") }),
      prop("signal", "strategyId", "做法", "string", { required: true, typeClasses: write("derived") }),
      prop("signal", "sessionDate", "交易日", "date", { required: true, typeClasses: write("derived"), valueFormatting: day }),
      prop("signal", "ticker", "代码", "string", { required: true, typeClasses: write("derived") }),
      prop("signal", "rank", "顺序", "integer", { required: true, visibility: "prominent", typeClasses: write("derived") }),
      prop("signal", "plannedQuantity", "计划股数", "long", { required: true, typeClasses: write("derived") }),
      px("signal", "plannedLimitPrice", "计划限价", "derived", { required: true }),
    ],
    { name: "rise", color: "#a0d911" },
  ),
);

objects.push(
  objectType(
    "pre-open-arrangement",
    "PreOpenArrangement",
    "开盘安排",
    "开盘安排",
    "一个账户、一个交易日、一次交出的那一页。",
    "arrangementId",
    "arrangementId",
    [
      prop("pre-open-arrangement", "arrangementId", "安排身份", "string", { ...hiddenId }),
      prop("pre-open-arrangement", "accountId", "账户", "string", { required: true }),
      prop("pre-open-arrangement", "sessionDate", "交易日", "date", { required: true, valueFormatting: day }),
      prop("pre-open-arrangement", "strategyId", "做法", "string", { required: true }),
      prop("pre-open-arrangement", "supersedesArrangementId", "作废的上一页", "string"),
      prop("pre-open-arrangement", "handedOverAt", "交出时间", "timestamp", { required: true }),
      prop("pre-open-arrangement", "header", "页首", "string", { valueType: "HeaderSentence", typeClasses: write("derived"), visibility: "prominent" }),
      prop("pre-open-arrangement", "headerAtConfirm", "确认当时的页首", "string", { valueType: "HeaderSentence", typeClasses: write("decision") }),
      px("pre-open-arrangement", "totalAssetsShown", "展示的总资产", "derived"),
      px("pre-open-arrangement", "totalAssetsAtConfirm", "确认当时的总资产", "decision"),
      px("pre-open-arrangement", "cashShown", "展示的可用资金", "derived"),
      px("pre-open-arrangement", "cashAtConfirm", "确认当时的可用资金", "decision"),
      prop("pre-open-arrangement", "continueCount", "继续拿只数", "integer", { typeClasses: write("derived") }),
      prop("pre-open-arrangement", "positionCountAgrees", "持仓只数对齐", "boolean", { typeClasses: write("derived") }),
      prop("pre-open-arrangement", "playbookChanged", "做法换了", "boolean", { typeClasses: write("derived") }),
      prop("pre-open-arrangement", "stopped", "今天停止", "boolean", { required: true, typeClasses: write("decision") }),
      prop("pre-open-arrangement", "nothingToSendAcknowledged", "确认今天没有要执行的", "boolean", { required: true, typeClasses: write("decision") }),
      prop("pre-open-arrangement", "sellConfirmedBy", "谁确认了卖出", "string", { typeClasses: write("decision") }),
      prop("pre-open-arrangement", "sellConfirmedAt", "何时确认了卖出", "timestamp", { typeClasses: write("decision") }),
      prop("pre-open-arrangement", "buyConfirmedBy", "谁确认了买入", "string", { typeClasses: write("decision") }),
      prop("pre-open-arrangement", "buyConfirmedAt", "何时确认了买入", "timestamp", { typeClasses: write("decision") }),
    ],
    { name: "file-text", color: "#1677ff" },
  ),
);

function linePrices(objectId) {
  return [
    prop(objectId, "plannedQuantity", "计划股数", "long", { required: true, typeClasses: write("derived") }),
    prop(objectId, "submitQuantity", "实际股数", "long", { typeClasses: write("derived") }),
    px(objectId, "plannedLimitPrice", "计划限价", "derived", { required: true }),
    px(objectId, "submitLimitPrice", "实际限价", "derived"),
    px(objectId, "openPrice", "开盘价", "derived"),
    prop(objectId, "openChange", "开盘涨跌幅", "double", { typeClasses: write("derived") }),
    px(objectId, "amount", "金额", "derived"),
    prop(objectId, "weight", "占账户", "double", { typeClasses: write("derived") }),
  ];
}

objects.push(
  objectType(
    "sell-line",
    "SellLine",
    "卖出安排",
    "卖出安排",
    "一页上要卖的一行。止盈的回落价放在计划限价里，不另设止盈价。",
    "sellLineId",
    "sellLineId",
    [
      prop("sell-line", "sellLineId", "行身份", "string", { ...hiddenId }),
      prop("sell-line", "arrangementId", "开盘安排", "string", { required: true }),
      prop("sell-line", "ticker", "代码", "string", { required: true }),
      prop("sell-line", "positionId", "持仓", "string", { required: true }),
      prop("sell-line", "reason", "原因", "string", { required: true, visibility: "prominent", valueType: "SellReason", typeClasses: write("derived") }),
      ...linePrices("sell-line"),
      prop("sell-line", "brokerSellable", "当时可卖", "long", { typeClasses: write("derived") }),
      prop("sell-line", "outcome", "这一行现在怎样", "string", { valueType: "SellOutcome", typeClasses: write("derived") }),
      prop("sell-line", "outcomeAtConfirm", "确认当时怎样", "string", { valueType: "SellOutcome", typeClasses: write("decision") }),
      prop("sell-line", "postponed", "他推迟了", "boolean", { required: true, typeClasses: write("decision") }),
    ],
    { name: "fall", color: "#f5222d" },
  ),
);

objects.push(
  objectType(
    "buy-line",
    "BuyLine",
    "买入安排",
    "买入安排",
    "一页上要新开的一行，顺序从买入入选抄来。",
    "buyLineId",
    "buyLineId",
    [
      prop("buy-line", "buyLineId", "行身份", "string", { ...hiddenId }),
      prop("buy-line", "arrangementId", "开盘安排", "string", { required: true }),
      prop("buy-line", "ticker", "代码", "string", { required: true }),
      prop("buy-line", "rank", "顺序", "integer", { required: true, visibility: "prominent", typeClasses: write("derived") }),
      ...linePrices("buy-line"),
      prop("buy-line", "outcome", "这一行现在怎样", "string", { valueType: "BuyOutcome", typeClasses: write("derived") }),
      prop("buy-line", "outcomeAtConfirm", "确认当时怎样", "string", { valueType: "BuyOutcome", typeClasses: write("decision") }),
      prop("buy-line", "vetoed", "他否决了", "boolean", { required: true, typeClasses: write("decision") }),
    ],
    { name: "rise", color: "#52c41a" },
  ),
);

function orderProps(objectId, lineKey, lineLabel) {
  return [
    prop(objectId, "orderId", "委托身份", "string", { ...hiddenId }),
    prop(objectId, lineKey, lineLabel, "string", { required: true }),
    prop(objectId, "quantity", "股数", "long", { required: true, typeClasses: write("decision") }),
    px(objectId, "limitPrice", "限价", "decision", { required: true }),
    prop(objectId, "contentStatus", "内容状态", "string", { required: true, valueType: "OrderContentStatus", typeClasses: write("decision") }),
    prop(objectId, "brokerOrderId", "券商受理号", "string", { typeClasses: write("execution") }),
    prop(objectId, "executionStatus", "执行状态", "string", { required: true, valueType: "ExecutionStatus", typeClasses: write("execution") }),
    prop(objectId, "executionWrittenAt", "执行回写时间", "timestamp", { typeClasses: write("execution") }),
  ];
}

objects.push(
  objectType("sell-order", "SellOrder", "卖出委托", "卖出委托", "已经写好内容、可供程序执行的一笔卖出。程序只回写受理号和执行状态。", "orderId", "orderId", orderProps("sell-order", "sellLineId", "卖出行"), { name: "export", color: "#f5222d" }),
);
objects.push(
  objectType("buy-order", "BuyOrder", "买入委托", "买入委托", "已经写好内容、可供程序执行的一笔买入。程序只回写受理号和执行状态。", "orderId", "orderId", orderProps("buy-order", "buyLineId", "买入行"), { name: "import", color: "#52c41a" }),
);

const links = [
  linkType("inAccount", "持仓在哪个账户", "一笔持仓属于一个账户。", "many-to-one", { objectType: "Position", apiName: "account", displayName: "账户" }, { objectType: "Account", apiName: "positions", displayName: "持仓" }),
  linkType("positionForStock", "持仓是哪只股票", "一笔持仓对应一只股票。", "many-to-one", { objectType: "Position", apiName: "stock", displayName: "股票" }, { objectType: "Stock", apiName: "positions", displayName: "持仓" }),
  linkType("enabledStrategy", "启用的做法", "这一户当前启用的一版做法。", "many-to-one", { objectType: "Account", apiName: "enabledStrategy", displayName: "启用的做法" }, { objectType: "Strategy", apiName: "accounts", displayName: "账户" }),
  linkType("usesUniverse", "做法用哪个范围", "这一版做法的可买范围。", "many-to-one", { objectType: "Strategy", apiName: "universe", displayName: "可买范围" }, { objectType: "TradableRange", apiName: "strategies", displayName: "做法" }),
  linkType("excludesStock", "做法不买哪只", "黑名单。", "many-to-many", { objectType: "Strategy", apiName: "excludedStocks", displayName: "黑名单" }, { objectType: "Stock", apiName: "excludedBy", displayName: "排除这只的做法" }),
  linkType("barForStock", "行情是哪只股票", "一条当日行情属于一只股票。", "many-to-one", { objectType: "DailyBar", apiName: "stock", displayName: "股票" }, { objectType: "Stock", apiName: "dailyBars", displayName: "当日行情" }),
  linkType("barOnTradingDay", "行情在哪一天", "一条当日行情属于一个交易日。", "many-to-one", { objectType: "DailyBar", apiName: "tradingDay", displayName: "交易日" }, { objectType: "TradingDay", apiName: "dailyBars", displayName: "当日行情" }),
  linkType("resolvedInIndustry", "供上限使用的行业", "最近一次非空行业。可以空。", "many-to-one", { objectType: "DailyBar", apiName: "resolvedIndustry", displayName: "行业" }, { objectType: "Industry", apiName: "dailyBars", displayName: "当日行情" }),
  linkType("constituentOf", "在哪个可买范围里", "已公布的成分。", "many-to-many", { objectType: "Stock", apiName: "ranges", displayName: "可买范围" }, { objectType: "TradableRange", apiName: "constituents", displayName: "成分" }),
  linkType("signalUsesStrategy", "入选用哪一版做法", "买入入选属于一版做法。", "many-to-one", { objectType: "Signal", apiName: "strategy", displayName: "做法" }, { objectType: "Strategy", apiName: "signals", displayName: "买入入选" }),
  linkType("signalForTradingDay", "入选在哪一天", "一只入选属于一个交易日。", "many-to-one", { objectType: "Signal", apiName: "tradingDay", displayName: "交易日" }, { objectType: "TradingDay", apiName: "signals", displayName: "买入入选" }),
  linkType("signalForStock", "入选哪只股票", "一只入选对应一只股票。", "many-to-one", { objectType: "Signal", apiName: "stock", displayName: "股票" }, { objectType: "Stock", apiName: "signals", displayName: "买入入选" }),
  linkType("fillForAccount", "成交在哪一户", "一笔成交回报属于一个账户。", "many-to-one", { objectType: "Fill", apiName: "account", displayName: "账户" }, { objectType: "Account", apiName: "fills", displayName: "成交回报" }),
  linkType("fillForStock", "成交是哪只股票", "一笔成交回报对应一只股票。", "many-to-one", { objectType: "Fill", apiName: "stock", displayName: "股票" }, { objectType: "Stock", apiName: "fills", displayName: "成交回报" }),
  linkType("fillForTradingDay", "成交在哪一天", "一笔成交回报属于一个交易日。日期就是这条链接，不另存一个可以对不上的日期。", "many-to-one", { objectType: "Fill", apiName: "tradingDay", displayName: "交易日" }, { objectType: "TradingDay", apiName: "fills", displayName: "成交回报" }),
  linkType("fillForPosition", "成交写进哪笔持仓", "成交可以在持仓出现之后补上这条链接。", "many-to-one", { objectType: "Fill", apiName: "position", displayName: "持仓" }, { objectType: "Position", apiName: "fills", displayName: "成交回报" }),
  linkType("forAccount", "安排属于哪个账户", "一页安排交给一个账户。", "many-to-one", { objectType: "PreOpenArrangement", apiName: "account", displayName: "账户" }, { objectType: "Account", apiName: "arrangements", displayName: "开盘安排" }),
  linkType("forTradingDay", "安排用在哪一天", "一页安排用于一个交易日。", "many-to-one", { objectType: "PreOpenArrangement", apiName: "tradingDay", displayName: "交易日" }, { objectType: "TradingDay", apiName: "arrangements", displayName: "开盘安排" }),
  linkType("usesStrategy", "安排按哪一版做法", "一页安排声明自己用的做法版本。", "many-to-one", { objectType: "PreOpenArrangement", apiName: "strategy", displayName: "做法" }, { objectType: "Strategy", apiName: "arrangements", displayName: "开盘安排" }),
  linkType("supersedes", "新页作废哪一页", "后一页指向被作废的前一页。", "many-to-one", { objectType: "PreOpenArrangement", apiName: "previous", displayName: "上一页" }, { objectType: "PreOpenArrangement", apiName: "replacements", displayName: "后页" }),
  linkType("sellLineOnArrangement", "卖出行在哪一页", "一行卖出属于一页安排。", "many-to-one", { objectType: "SellLine", apiName: "arrangement", displayName: "开盘安排" }, { objectType: "PreOpenArrangement", apiName: "sellLines", displayName: "卖出安排" }),
  linkType("sellLineForPosition", "卖的是哪笔持仓", "一行卖出指向一笔持仓。", "many-to-one", { objectType: "SellLine", apiName: "position", displayName: "持仓" }, { objectType: "Position", apiName: "sellLines", displayName: "卖出安排" }),
  linkType("buyLineOnArrangement", "买入行在哪一页", "一行买入属于一页安排。", "many-to-one", { objectType: "BuyLine", apiName: "arrangement", displayName: "开盘安排" }, { objectType: "PreOpenArrangement", apiName: "buyLines", displayName: "买入安排" }),
  linkType("fromSellLine", "卖出委托来自哪一行", "一笔卖出委托来自一行卖出安排。", "many-to-one", { objectType: "SellOrder", apiName: "sellLine", displayName: "卖出安排" }, { objectType: "SellLine", apiName: "orders", displayName: "卖出委托" }),
  linkType("fromBuyLine", "买入委托来自哪一行", "一笔买入委托来自一行买入安排。", "many-to-one", { objectType: "BuyOrder", apiName: "buyLine", displayName: "买入安排" }, { objectType: "BuyLine", apiName: "orders", displayName: "买入委托" }),
];

const resourceId = /^[a-z][a-z0-9-]*$/;
const propertyId = /^[A-Za-z][A-Za-z0-9_-]*$/;
const objectApi = /^[A-Z][A-Za-z0-9]*$/;
const propertyApi = /^[a-z][A-Za-z0-9]*$/;
const ridPattern = /^ri\.[a-z0-9.-]+\.[a-z0-9.-]+\.[a-z0-9.-]+\.[A-Za-z0-9._-]+$/;
const valueNames = new Set([...Object.keys(values), "Domain"]);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

for (const object of objects) {
  assert(resourceId.test(object.id), `bad id ${object.id}`);
  assert(objectApi.test(object.apiName), `bad api ${object.apiName}`);
  assert(ridPattern.test(object.rid), `bad rid ${object.rid}`);
  assert(object.properties.domain?.required === true, `${object.apiName} requires domain`);
  const primary = object.properties[object.primaryKey];
  assert(primary, `${object.apiName} primary key missing`);
  assert(primary.required === true, `${object.apiName}.${object.primaryKey} must be required`);
  assert(object.properties[object.titleKey], `${object.apiName} title key missing`);
  for (const [key, property] of Object.entries(object.properties)) {
    assert(key === property.apiName, `${object.apiName} key ${key}`);
    assert(propertyApi.test(property.apiName), `bad property api ${property.apiName}`);
    assert(propertyId.test(property.id), `bad property id ${property.id}`);
    assert(ridPattern.test(property.rid), `bad property rid ${property.rid}`);
    if (property.valueType) {
      assert(valueNames.has(property.valueType), `unknown value type ${property.valueType}`);
    }
  }
}

function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

const valueDisplay = {
  Board: "板块",
  RegimeLabel: "制度",
  EntryGate: "开仓门",
  SellReason: "卖出原因",
  ExitState: "退出结论",
  FillSide: "成交方向",
  OrderContentStatus: "委托内容状态",
  ExecutionStatus: "执行状态",
  HeaderSentence: "页首句子",
  SellOutcome: "卖出结果",
  BuyOutcome: "买入结果",
};

writeJson(join(valueDir, "Domain.json"), {
  $schema: "../../schema/value-type.schema.json",
  id: "domain",
  rid: "ri.ontology.study.value-type.domain",
  apiName: "Domain",
  displayName: "域",
  description: "对象属于哪一个领域。名称用 PascalCase。当前交易域是 StockTrading。",
  baseType: { type: "string" },
  constraints: [{ type: "regex", pattern: "^[A-Z][A-Za-z0-9]*$" }],
});
writeJson(join(root, "shared-properties", "domain.json"), {
  $schema: "../../schema/shared-property.schema.json",
  id: "domain",
  rid: "ri.ontology.study.shared-property.domain",
  apiName: "domain",
  displayName: "域",
  description: "每个对象都有的共享属性，用来按领域过滤。当前交易域是 StockTrading。",
  status: "experimental",
  visibility: "normal",
  baseType: { type: "string" },
  valueType: "Domain",
  typeClasses: [{ kind: "write", name: "identity" }],
  renderHints: { searchable: true, sortable: true, selectable: true, lowCardinality: true },
});

for (const [apiName, enumValues] of Object.entries(values)) {
  const id = kebab(apiName);
  writeJson(
    join(valueDir, `${apiName}.json`),
    valueType(id, apiName, valueDisplay[apiName], valueMeta[apiName], enumValues),
  );
}
for (const object of objects) {
  writeJson(join(objectDir, `${object.apiName}.json`), object);
}
for (const link of links) {
  writeJson(join(linkDir, `${link.apiName}.json`), link);
}
writeJson(join(root, "index.json"), {
  apiName: "aShareOntology",
  displayName: "沪深 A 股本体",
  description: "领域是 StockTrading。每个对象都有共享属性 domain，查询时用它过滤。交易数据的写入通道见各属性的 typeClasses.write，规则见 docs/001_推导/26_交易数据的保存与更新.md。",
  domain: "StockTrading",
  objectTypes: objects.map((object) => object.apiName),
  linkTypes: links.map((link) => link.apiName),
  sharedProperties: ["domain"],
  valueTypes: ["Domain", ...Object.keys(values)],
});
