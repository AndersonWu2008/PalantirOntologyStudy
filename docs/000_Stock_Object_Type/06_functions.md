# Functions

公式在 function；**指标输出写入 DailyBar**（全清单见 09）。Action 需要时再读这些 property。

## 批量计算（pipeline 每夜/盘后调用）

| apiName | 输入 | 写入 |
|---------|------|------|
| `computeAllFactors` | 一只股票的 DailyBar 序列（或当日全池） | 45 个 `factor*` |
| `computeOverlays` | 同上 | ma5/10/20/60, rsi14, atr14, volumeMa*, 收益与回撤 |
| `computeTurnoverDynamics` | DailyBar.turnoverRate | universe 三层换手列 |
| `computeLiveRanks` | **当日 456 条** DailyBar | f1–f4 rank、scoreV2 |
| `computeBreadth` | 当日股票池 DailyBar | TradingDay.breadth 与涨跌家数 |
| `detectRegime` | TradingDay 历史广度 | TradingDay.regime、regimeStreak |

`computeLiveRanks` 必须吃 **全池截面**，不能按单只算百分位。

## 门控与涨跌停

| apiName | 输出 | 规则 |
|---------|------|------|
| `limitBand` | 0.10 / 0.20 | Stock.board |
| `isLimitUp` | boolean | close vs limitUp，或 changePercent vs 板块幅度；≥9.5% 不买 |
| `gateOpen` | boolean | 制度连板 + 广度≥45% + 非熊 |
| `inTradableUniverse` | boolean | 读 `constituentOf` + ST/停牌 |

## 组合

| apiName | 输出 |
|---------|------|
| `rankUniverse` | 当日 Signal 对象集 |
| `suggestedStopPrice` / `trailingStopHit` / `maxHoldExceeded` | 持仓规则 |
| `industryNameCount` / `industryNavWeight` | 行业约束 |
| `preTradeRisk` | 放量、ST、连跌停、暂停 |
| `sizePosition` | 股数（5×20% 或 2×10%） |
| `dailyDrawdown` | 日亏暂停 |
| `filterUniverse` | 建议的 constituent 变更（价格/市值/换手/上市日） |

实现应对齐 `v42/factors.py`、`scoring.py`、`data_pipeline/universe.py`、`regime.py`、`risk.py`、`v44/deploy_v44_phase3.py`，入参改成 Stock / DailyBar / TradingDay，不要靠 DataFrame 列名漂移。
