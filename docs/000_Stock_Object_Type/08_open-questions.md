# 已拍板 / 仍开放

## 已拍板

1. **只做沪深 A 股。** 不建 GICS Sector、美股、港股、ISO 国家/货币、MIC。交易所只有上交所、深交所。
2. **456 只全部是 Stock object**，经 Index 成员 link 进交易池。
3. **全部计算指标落在 DailyBar property 上**（45 因子 + 中间均线技术 + 换手动态 + v46 rank）。Function 负责算，不负责“算完不存”。
4. **DailyBar 对象，不用 Stock 上的 time series 作为主存储。**
5. **Signal 是 object type**（早盘批准/拒绝）。
6. **制度检测不是 Action。**
7. **不做 A+H 双上市建模。**

## 仍可改、不影响主设计

- 交易池 Index 的 `indexId` 字符串（默认 `ashare-core-456`）。
- 行业数据用申万还是东财 `stock_industry_map.csv`（必须有且仅有一套，并与「每行业 2 只」一致）。
- 研究因子在 Object Explorer 默认 hidden，还是按类别分 tab。
- `SubmitBuyOrder` 的角色是否拆研究/实盘（默认一个 `trader`）。
