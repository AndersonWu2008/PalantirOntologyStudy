# A 股交易 Ontology 边界

只为沪深 A 股建模。股票池 456 只全部是 Stock，经 Index 成员进入交易。行情与 `v42/factors.py` 注册的全部指标写在 DailyBar 上（Function 计算、property 落库），制度在 TradingDay，行业用申万/东财 Industry + `inIndustry`。不建 GICS、其他市场或 Factor 独立 object type。
