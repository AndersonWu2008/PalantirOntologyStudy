# V46 一致性验收

研究目录由环境变量 `TRADING_DATA_ROOT` 指定，不放进本仓库。

## 验收 A — 因子 / 池 / 评分

```bash
cd "$TRADING_DATA_ROOT" && PYTHONPATH=. python3 /path/to/pipeline/parity/v46_export_gold.py 20
cd pipeline && npx tsx parity/v46-parity.ts
```

期望：`mismatchCount: 0`（≥20 日，逐票 diff ≤ 1e-9）。

## 验收 B — 引擎开仓 ⊆ 评分可买集

```bash
cd "$TRADING_DATA_ROOT" && PYTHONPATH=. python3 /path/to/pipeline/parity/v46_export_backtest.py
PYTHONPATH=. python3 /path/to/pipeline/parity/v46_entry_parity.py
```

期望：`pass: true`（开仓票均有 `score_zj`，且落在引擎价带排序前列窗口）。

## 验收 C — 退出

回测金标中 `atr_stop` 笔数应为 0（V46 ATR 倍=0）；原因分布为止盈 / 到期 / 制度离场 / 放量风控。

## Evaluation 写入

```bash
npx tsx pipeline/evaluate-strategy.ts
```

页：`/ontology/evaluation`。
