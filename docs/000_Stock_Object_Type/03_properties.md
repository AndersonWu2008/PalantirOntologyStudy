# Properties

指标类全部在 [09_indicators.md](./09_indicators.md)。本文件只写 **身份、状态、账户** 等非因子字段。

## Shared

| apiName | Base type | 用在 |
|---------|-----------|------|
| `sessionDate` | date | TradingDay, DailyBar, Signal |
| `ticker` | string | Stock；DailyBar 可冗余一份给 pipeline，身份仍以 link 为准 |

不要 shared `country` / `currency`：全部是 A 股、人民币。

## Stock

| apiName | 说明 |
|---------|------|
| `ticker` | 主键。`000001.SZ` |
| `name` | 证券简称，title key |
| `board` | 主板 / 创业板（value type `Board`）。决定涨跌停幅度 |
| `listingStatus` | 正常 / 停牌 / 退市 |
| `specialTreatment` | 空 / `ST` / `*ST` |
| `listDate` | 上市日；universe 要满 200 个交易日 |
| `sharesOutstanding` `floatShares` | 总股本 / 流通股本；换手与市值 |

不要：close、MA、score、regime、行业名、GICS、currency。

## TradingDay

| apiName | 说明 |
|---------|------|
| `sessionDate` | 主键 |
| `regime` | bull_trend / high_volatility / sideways / bear_trend |
| `regimeStreak` | 连续天数 |
| `breadth` | close>MA20 占比（对 **当日股票池 456 只** 计） |
| `upCount` `downCount` `flatCount` | |
| `limitUpCount` `limitDownCount` | |
| `medianChangePercent` | |

`gateOpen` **不算** 源数据。Function 读 TradingDay + Strategy 参数现算，改参数不必改写历史日。

## Signal

| apiName | 说明 |
|---------|------|
| `score` | 与 DailyBar.scoreV2 一致的快照 |
| `rank` | 当日截面名次 |
| `status` | proposed / approved / rejected / expired / executed |
| `reason` | 门控失败原因 |
| `inBacktestUniverse` | 信号卡 bt_covered |

因子明细以 DailyBar 为准；Signal 只快照评分卡上那几项（dd、volShrink、ret3d、lu20、score），避免和 45 列双源。

## Position / Order / Fill / Account / Strategy

与引擎一致：入场价、股数、入场后最高价、持有天数、**regimeAtEntry**（快照，不要链到“今天的制度”）；订单方向与状态；成交价量；账户现金与是否暂停；策略版本与 `regimeParameters` struct。

## Company / Exchange / Industry / Index

法律名称；交易所 `sse`/`szse`；行业代码与层级；Index 的 `indexId` 与显示名（`ashare-core-456`）。

## Value types

- `Board` — 主板 / 创业板
- `ListingStatus`
- `MarketRegime`
- `OrderSide` `OrderStatus` `SignalStatus` `PositionStatus`
- `SpecialTreatment` — 空 / ST / *ST

**不建**：Iso3166、Iso4217、Mic、GicsSectorCode。

## 不是 property

- 行业、发行主体、所属股票池 → **link**
- 是否涨停、建议止损、gateOpen → **function**（可把结果写进 Signal.reason）
- 下载时间戳、ETL hash → 留在 pipeline
