# Object types（仅沪深 A 股）

主键都是 **单个** property。`ticker + 日期` 这类复合事实压成一个字符串 id。

## 标的与分类

### Stock

一只在上交所或深交所上市的 A 股。交易池里 **456 只，一只一个 object**。

- **apiName** `Stock` · **primary key** `ticker`（`000001.SZ` / `603016.SH`）· **title key** `name`
- **board**：主板（±10%）或创业板（±20%）。科创板、北交所不进交易池，不为它们建市场类型。
- **不是**：公司、当天 K 线、行业名称、任何因子值。

### Company

该上市主体。一只 A 股对应一家公司即可。不建 H 股、美股对象，也不为 A+H 预留第二套市场。

### Exchange

仅 **上交所**、**深交所**。主键用 `sse` / `szse`（不要 MIC/ISO 国家码）。

### Industry

申万（或东财行业，与 `stock_industry_map.csv` 一致）节点。行业上限「每行业最多 2 只 / 账面 40%」走 `inIndustry`。

- 层级用 **link** `parentIndustry`，不要把「银行」写成 Stock 上的字符串。
- **没有** GICS Sector 类型。

### Index

股票池定义。交易用的那一个叫例如 `ashare-core-456`：456 条 `constituentOf` link。过滤规则在 `universe.py`（价格、市值、换手、上市满 200 日等）是 **Function**；入池结果是 link，不是 Stock 上的布尔大杂烩。

沪深 300 若只做对照基准，可以第二个 Index；不是交易池。

## 市场时间

### TradingDay

A 股 **全市场** 的一个交易日（含休市表之外的交易日）。

- **primary key** `sessionDate`
- 制度 `regime`、广度、涨停家数等 **全市场** 数放这里。不要复制到 456 只 Stock 上。

### DailyBar

**一只股票 × 一个交易日**。这是行情和 **全部指标** 的家。

- **primary key** `barId` = `ticker:date`
- 完整列见 [09_indicators.md](./09_indicators.md)
- 交易池 456 只每天 456 条；停牌日仍可有 bar（volume=0）或当日无 object，由 pipeline 约定一种并保持。

不做分钟线、逐笔 object。

## 交易运行

### Account

实盘资金账户（如 20 万账户）。币种固定人民币，不必做 currency 类型。

### Strategy

命名策略（v46 评分 + 门控）。`version` 是 property，不要按版本拆 object type。

### Signal

某策略、某日、某股票的一张交易卡片。操作员早上看这个。

- **primary key** `signalId` = `strategyId:date:ticker`

### Order / Fill / Position

指令、成交、持仓。已平仓 Position 保留 `status=closed`，不要删。

## 明确不是 object type

| 想建成类型 | 实际做法 |
|------------|----------|
| 因子 / 指标 | DailyBar property + Function |
| 制度 | TradingDay.regime |
| 涨停 | Function `isLimitUp` |
| 股票池名单 | Index + `constituentOf`（456 条 link） |
| 美股 Sector / 货币 / 国家 | **不建** |
| LightGBM 文件 | Function 实现 |
| 龙虎榜一行 | 以后再说；现在可忽略或以后加 property |
