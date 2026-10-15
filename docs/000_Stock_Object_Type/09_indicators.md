# Indicators on DailyBar

456 只 A 股、每一个交易日，一条 DailyBar。下面每一列都是 **DailyBar 的 property**。计算它们的代码是 Function（或夜间 pipeline 调用同一套公式）；**结果必须持久化**，否则 Object Explorer 看不到历史截面。

不要把这些数挂在 Stock 上（Stock 没有“某一天的 RSI”）。不要为每个因子建 Object type。

Object Explorer 分组：`session`（行情）prominent；`liveScore`（v46 正在用的）prominent；其余 `research` **hidden**，搜索与函数仍可用。

## Session（行情与 A 股交易约束）

| apiName | 来源 | 说明 |
|---------|------|------|
| `open` `high` `low` `close` | K 线 | |
| `volume` | K 线 | 股 |
| `amount` | K 线 | 成交额，f4 |
| `turnoverRate` | 行情 | 日换手 |
| `changePercent` | 计算 | 涨跌幅；≥9.5% 当日不买入 |
| `limitUp` `limitDown` | A 股规则 | 按板块 10%/20% 算出的价格 |
| `volumeRatio` | 行情或量/均量 | f2、放量风控 |
| `peTtm` `pb` `marketCap` | 行情可选 | 选股池市值过滤 |

## Intermediate（评分与因子会读到的中间列）

| apiName | 窗口 | 谁用 |
|---------|------|------|
| `ma5` `ma10` `ma20` `ma60` | 收盘均线 | 广度 close>MA20；`score_trend` |
| `volumeMa5` `volumeMa20` | 量均 | 放量 |
| `rsi14` | 14 | 趋势分 |
| `atr14` | 14 | 止损；相对 ATR 因子用 atr14/close |
| `return1d` `return3d` `return5d` | 收益 | 信号卡 ret3d |
| `drawdownFromHigh` | 相对近期高点 | 信号卡 dd |
| `limitUpCount20` | 20 日涨停次数 | 信号卡 lu20 |
| `volumeShrink` | 量相对均量 | 信号卡 vol_shrink |

## Universe dynamics（`universe.py` 三层换手）

选股池过滤要读这些数，必须落在当日 DailyBar 上。

| apiName | 层 |
|---------|----|
| `turnoverAvg20d` | A 基础活跃 |
| `turnoverRatio` | B 当日/20 日均 |
| `turnoverPctRank` | B 近 60 日百分位 |
| `turnoverTrend` | C 5 日均 vs 20 日均 |
| `turnoverPeakRatio` | C 相对峰值衰减 |

## Live score（v46 正在交易）

截面 **百分位** 与合成分。每天对 456 只一起算，写回每一条 DailyBar，同时抄到当日 Signal。

| apiName | 对应 |
|---------|------|
| `oneDayReturnRank` | f1 |
| `volumePriceDivergenceRank` | f2 |
| `atr14OverPriceRank` | f3 |
| `negLogAmountRank` | f4 |
| `scoreV2` | 制度加权总分 |
| `inBacktestUniverse` | 信号卡 `bt_covered` |

## Research factors（`FACTOR_REGISTRY` 全部 45 个）

Python 列名保持可对账；Ontology `apiName` 用 camelCase。

### 动量 (7)

| python | apiName |
|--------|---------|
| `factor_mom_1m` | `factorMom1m` |
| `factor_mom_3m` | `factorMom3m` |
| `factor_mom_6m` | `factorMom6m` |
| `factor_mom_12m_1m` | `factorMom12mEx1m` |
| `factor_mom_ema_cross` | `factorMomEmaCross` |
| `factor_mom_macd` | `factorMomMacd` |
| `factor_mom_rs_12m` | `factorMomRs12m` |

### 反转 (6)

| python | apiName |
|--------|---------|
| `factor_rev_5d` | `factorRev5d` |
| `factor_rev_10d` | `factorRev10d` |
| `factor_rev_max_5d` | `factorRevMax5d` |
| `factor_rev_min_5d` | `factorRevMin5d` |
| `factor_rev_rsj` | `factorRevRsj` |
| `factor_rev_turnover_ret` | `factorRevTurnoverRet` |

### 波动率 (6)

| python | apiName |
|--------|---------|
| `factor_vol_5d` | `factorVol5d` |
| `factor_vol_20d` | `factorVol20d` |
| `factor_vol_60d` | `factorVol60d` |
| `factor_vol_ratio_5_20` | `factorVolRatio5To20` |
| `factor_vol_max_20d` | `factorVolMax20d` |
| `factor_vol_beta` | `factorVolBeta` |

### 量价 (5)

| python | apiName |
|--------|---------|
| `factor_vp_volume_ratio_1m` | `factorVpVolumeRatio1m` |
| `factor_vp_vwap_dist` | `factorVpVwapDist` |
| `factor_vp_price_volume_corr` | `factorVpPriceVolumeCorr` |
| `factor_vp_up_volume_ratio` | `factorVpUpVolumeRatio` |
| `factor_vp_volume_shock` | `factorVpVolumeShock` |

### 流动性 (4)

| python | apiName |
|--------|---------|
| `factor_liq_amihud` | `factorLiqAmihud` |
| `factor_liq_turnover` | `factorLiqTurnover` |
| `factor_liq_dollar_volume` | `factorLiqDollarVolume` |
| `factor_liq_turnover_std` | `factorLiqTurnoverStd` |

### 技术 (8)

| python | apiName |
|--------|---------|
| `factor_tech_rsi_14` | `factorTechRsi14` |
| `factor_tech_atr_14` | `factorTechAtr14` |
| `factor_tech_bollinger_pctb` | `factorTechBollingerPctb` |
| `factor_tech_bollinger_width` | `factorTechBollingerWidth` |
| `factor_tech_adx` | `factorTechAdx` |
| `factor_tech_ma_distance` | `factorTechMaDistance` |
| `factor_tech_kdj_k` | `factorTechKdjK` |
| `factor_tech_williams_r` | `factorTechWilliamsR` |

### 截面 (4)

这些已经是 **当日 456 只里的百分位**，仍写在 DailyBar 上（同一天才能比）。

| python | apiName |
|--------|---------|
| `factor_cs_momentum_rank` | `factorCsMomentumRank` |
| `factor_cs_volatility_rank` | `factorCsVolatilityRank` |
| `factor_cs_price_rank` | `factorCsPriceRank` |
| `factor_cs_volume_rank` | `factorCsVolumeRank` |

### 趋势强度 (5)

| python | apiName |
|--------|---------|
| `factor_trend_ma_alignment` | `factorTrendMaAlignment` |
| `factor_trend_price_vs_ma` | `factorTrendPriceVsMa` |
| `factor_trend_slope_20d` | `factorTrendSlope20d` |
| `factor_trend_ma_distance_ratio` | `factorTrendMaDistanceRatio` |
| `factor_trend_consecutive_updown` | `factorTrendConsecutiveUpdown` |

## 规模

456 只 × ~1500 个交易日 ≈ 70 万 DailyBar。每条约 80 个数值 property。这是可接受的对象量；拆成 FactorValue（70 万 × 45）不可接受。

`computeAllFactors` 一次写入当日全池。新增因子：先加 Function + `FACTOR_REGISTRY`，再在本表加一行 DailyBar property。
