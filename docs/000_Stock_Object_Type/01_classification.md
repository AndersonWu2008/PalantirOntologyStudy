# Classification rules

- **Object type** — 能单独搜到的实体或事件（一只股票、一天、一张信号卡）。
- **Property** — 只属于某一个 object 的特征（这只股票的简称；这条 DailyBar 的 RSI）。
- **Link type** — 两个 object type 之间的关系。
- **Action type** — 人/Agent **提交**的一次改 Ontology。
- **Function** — 读 Ontology 的计算；pipeline 用同一套公式在无人值守时写回 property。

## 测试顺序（碰到第一个“是”就停）

1. Object Explorer 会搜它吗？→ **object type**。456 只股票每一只都是；某一日的 RSI 不会被当成独立对象搜。
2. 它只是别的东西上的一个值吗？→ **property**。全部指标都是 DailyBar 的 property。
3. 是两个可命名事物之间的关系吗？→ **link**。股票∈行业、股票∈456 池。
4. 有人在做决定并提交吗？→ **action**。下单、批准信号。夜间算因子不是 action。
5. 是一段逻辑吗？→ **function**。公式在 function；算出的 45 个因子值仍要写回 DailyBar，否则历史截面丢了。

## 本仓库里的落点

| 部署脚本 里的东西 | 分类 | 原因 |
|---------------------------|------|------|
| 456 只代码 | 456 个 **Stock** + Index 成员 link | 每只能点开、下单、挂 K 线 |
| 公司名 | **Company** property + `issuedBy` | 不要把发行人堆在 Stock 上 |
| OHLCV、涨跌停价 | **DailyBar** property | 属于某一日 |
| `FACTOR_REGISTRY` 45 个因子 + 均线/RSI/换手动态 | **Function 计算 + DailyBar 全量 property** | 必须能回放任意一天任意一只的全部指标；不做成 Factor object |
| v46 的 f1–f4 rank / score | DailyBar `liveScore` 组 + Signal 快照 | 交易卡片要看 |
| `regime: sideways` | **TradingDay.regime** | 全市场一天一个值 |
| 广度 | Function 对当日 456 条 bar 聚合，写入 TradingDay | |
| 新宏泰 91.7 分 | Signal.score | |
| `gate_open` | Function，不存源 | |
| 申万「银行」 | **Industry** + `inIndustry` | 每行业最多 2 只 |
| ST | Stock.specialTreatment | |
| 开 20% 多 | Action SubmitBuyOrder | |
| ATR 止损价 | Function；平仓是 Action | |

## 反模式（按 A 股约束重写）

- **Kitchen sink on Stock** — 45 个因子不要挂在 Stock 上。挂在 **DailyBar** 上。
- **God object** — Stock 不是 K 线、不是持仓、不是信号。
- **Golden hammer** — 不要用 Action 每晚重算 MA20。
- **Time machine** — 不要 `Stock_2026-10-09` 这种类型。
- **Wrong market** — 不要 GICS、ISO 国家、美元、MIC、A+H。这是沪深 A 股 Ontology。
