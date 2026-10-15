# Link types

| apiName | Source | Target | Cardinality | 为什么不是字符串 |
|---------|--------|--------|-------------|------------------|
| `issuedBy` | Stock | Company | many-to-one | 发行人 |
| `listedOn` | Stock | Exchange | many-to-one | 上交所或深交所 |
| `inIndustry` | Stock | Industry | many-to-one | 行业上限遍历这条 |
| `parentIndustry` | Industry | Industry | many-to-one | 申万层级 |
| `constituentOf` | Stock | Index | many-to-many | **456 只进交易池**；一只股票只应在核心池里一次 |
| `hasDailyBar` | Stock | DailyBar | one-to-many | 历史行情+指标 |
| `barOnDay` | DailyBar | TradingDay | many-to-one | 当日 456 条 bar 算广度 |
| `signalForStock` | Signal | Stock | many-to-one | |
| `signalOnDay` | Signal | TradingDay | many-to-one | |
| `producedBy` | Signal | Strategy | many-to-one | |
| `positionOf` | Position | Stock | many-to-one | |
| `heldIn` | Position | Account | many-to-one | |
| `openedBy` | Position | Order | many-to-one | |
| `orderForStock` | Order | Stock | many-to-one | |
| `placedIn` | Order | Account | many-to-one | |
| `fillOf` | Fill | Order | many-to-one | |
| `fromSignal` | Order | Signal | many-to-one | 审计 |

没有 `inSector`（GICS）。行业只有 `inIndustry`。

## 股票池

`filter_universe` 是 Function。通过过滤的股票与 Index `ashare-core-456` 建 `constituentOf`。池子调整（剔除 ST、补新股）改 **link**，不改 Stock 类型。

## 行业上限

1. Signal → Stock → Industry  
2. 同账户 open Position 沿 `inIndustry` 计数  
3. Function 与策略上限（2 只 / 40% NAV）比较  
4. `SubmitBuyOrder` 提交条件失败则不下单  
