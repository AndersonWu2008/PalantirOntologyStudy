# 对 部署脚本 的覆盖

只覆盖沪深 A 股实盘/回测，不覆盖其他市场。

## 股票池（456）

| 来源 | Ontology |
|------|----------|
| OVERVIEW「A 股 456 只」 | Index `ashare-core-456` + 456 条 `constituentOf` + 456 个 Stock |
| `universe.py` 过滤 | Function `filterUniverse`；结果更新成员 link |
| 主板/创业板，排除 688/北交所/新三板 | Stock.board + 根本不建那些市场的 Exchange |

缺任何一只池内代码，Object Explorer 与当日截面 rank 都不完整。

## 指标

见 [09_indicators.md](./09_indicators.md)。`FACTOR_REGISTRY` 45 列、均线/RSI/ATR、换手动态、v46 rank 全部是 DailyBar property。没有「研究因子留在 pickle」这条缺口。

## Daily signal JSON

| JSON | 家 |
|------|----|
| `version` | Strategy.version |
| `date` | TradingDay |
| `regime` `streak` | TradingDay |
| `data_sources` | pipeline 元数据，不进 Ontology |
| `breadth.*` | TradingDay + `computeBreadth` |
| `regime_params` | Strategy.regimeParameters |
| `gate_open` | Function `gateOpen` |
| `regime_traj` | 历史 TradingDay.regime |
| `top10[].code/name/close` | Stock + DailyBar |
| `dd` `vol_shrink` `ret3d` `lu20` `score` | DailyBar + Signal 快照 |
| `bt_covered` | DailyBar.inBacktestUniverse |

## STRATEGY_CARD_V2

| 规则 | Ontology |
|------|----------|
| f1–f4 | Function `computeLiveRanks` → DailyBar |
| 制度权重 | `scoreV2` 读 Strategy |
| p2 / br45 / 空仓熊市 | `gateOpen` |
| ATR / trailing / 持有天数 | Function on Position |
| 每行业最多 2 只 | `inIndustry` |
| 涨停不买 | `isLimitUp` |

## 引擎持仓与 risk.py

Position 字段与 RISK 文档一致；`regimeAtEntry` 是快照 property。七条风控：读 DailyBar/Stock/link，提交靠 Close/Reduce/Pause/Submit 的 submission criteria。

## 已关闭的缺口

不再需要：美股 ticker、GICS、ISO 货币。需要且本设计已给家：A 股代码与板块、申万行业、TradingDay、DailyBar 全指标、流通股本、账户订单链、456 成员。
