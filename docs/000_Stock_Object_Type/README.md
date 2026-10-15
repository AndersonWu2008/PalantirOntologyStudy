# A 股交易 Ontology

本目录只设计 **沪深 A 股** 的 Ontology。不包含美股、港股、GICS、ISO 货币/国家码，也不为其他市场预留平行类型。从最终目标反推到下载、日频/周月工作流、以及每步如何分类，见 [`../000_Overview/`](../000_Overview/README.md)。

覆盖目标来自 `本地行情研究目录`：

- **股票池**：文档与回测写明的 **456 只** 沪深 A 股（主板 + 创业板；科创板、北交所、新三板不进交易池）。每一只都是一个 **Stock** object，经 `constituentOf` 挂在股票池 **Index** 上。
- **行情与指标**：每一只、每一个交易日一条 **DailyBar**。K 线、涨跌停、换手，以及 `v42/factors.py` 注册的 **全部 45 个因子**、均线/RSI/ATR 等中间指标、换手三层动态、v46 评分用的截面 rank，都作为 DailyBar 的 **property** 落库。计算公式是 **Function**；算完的数必须能在 Object Explorer 里按股票、按日查到。
- **交易闭环**：TradingDay 制度、Signal、Account、Position、Order、Fill、Strategy。

## 每日工作流

1. Pipeline 刷新 456 只股票的 DailyBar（OHLCV + 全部指标）。
2. Function 写 TradingDay 的制度与广度。
3. Function 对当日截面打分、开门控、出 Signal。
4. 操作员/Agent 用 Action 批准并下单。
5. 持仓按 ATR / trailing / 行业上限管理。

## 文档

| 文件 | 内容 |
|------|------|
| [01_classification.md](./01_classification.md) | Object type / Property / Link / Action / Function |
| [02_object-types.md](./02_object-types.md) | 类型目录（仅 A 股） |
| [03_properties.md](./03_properties.md) | 非指标类 property |
| [04_link-types.md](./04_link-types.md) | 关系 |
| [05_actions.md](./05_actions.md) | 人/Agent 提交的变更 |
| [06_functions.md](./06_functions.md) | 计算入口 |
| [07_strategy-coverage.md](./07_strategy-coverage.md) | 对 v42/v46 字段的覆盖 |
| [08_open-questions.md](./08_open-questions.md) | 已拍板与仍开放的点 |
| [09_indicators.md](./09_indicators.md) | **456×日 的完整指标清单** |

## 刻意不做

分钟/逐笔、期权、融资融券对象、美股/港股、GICS Sector、把 45 个因子做成独立 Object type（会变成「股票×日×因子」爆炸）。
