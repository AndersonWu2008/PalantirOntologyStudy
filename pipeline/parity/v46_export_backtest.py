#!/usr/bin/env python3
"""跑 部署脚本 V46 部署回测，导出 Evaluation 金标 + 引擎开仓事件。"""
from __future__ import annotations

import json
import os
import pickle
import sys
from datetime import datetime

import pandas as pd

TRADING = os.environ.get("TRADING_DATA_ROOT")
if not TRADING:
    raise SystemExit("设置 TRADING_DATA_ROOT 指向本地行情研究目录")
sys.path.insert(0, TRADING)

from data_pipeline.regime import V36_REGIME_CONFIG, precompute_regimes  # noqa: E402
from v42.config import PRICE_MAX, PRICE_MIN  # noqa: E402
from v42.engine import run_backtest as run_backtest_v42  # noqa: E402
from v44.deploy_v44_phase3 import EXIT_ON_REGIME_FLIP, REGIME_MIN_PERSIST_DAYS  # noqa: E402
from v44.deploy_v46_huimaqiang import (  # noqa: E402
    BACKTEST_START,
    V46_PARAMS,
    build_v46_factors,
    build_v46_score,
    load_lhb_strong_set,
)

PKL = os.path.join(TRADING, "reports/v43/deploy/prepared_data_v43_updated.pkl")
OUT = os.path.join(os.path.dirname(__file__), "v46_backtest_gold.json")


def dstr(value) -> str:
    if isinstance(value, datetime):
        return value.strftime("%Y-%m-%d")
    return pd.Timestamp(value).strftime("%Y-%m-%d")


def main() -> None:
    print("加载 pickle + 构建 v46 因子/评分 ...")
    with open(PKL, "rb") as f:
        data = pickle.load(f)
    raw = data["df"].copy().sort_values(["stockCode", "date"]).reset_index(drop=True)
    lhb = load_lhb_strong_set()
    df = build_v46_score(build_v46_factors(raw, lhb))
    regimes = precompute_regimes(df, config=V36_REGIME_CONFIG)
    regimes_v36 = {d: {"regime": r} for d, r in regimes.items()}

    seg = df[df["date"] >= BACKTEST_START].copy()
    print(f"回测 {BACKTEST_START} ~ {dstr(seg['date'].max())} ...")
    result = run_backtest_v42(
        seg,
        regimes_v36=regimes_v36,
        regime_params=V46_PARAMS,
        sentiments={},
        kline_quality={},
        price_min=PRICE_MIN,
        price_max=PRICE_MAX,
        scoring_version="ml",
        verbose=False,
        enable_vol_targeting=False,
        regime_min_persist_days=REGIME_MIN_PERSIST_DAYS,
        exit_on_regime_flip=EXIT_ON_REGIME_FLIP,
    )

    equity = [
        {
            "sessionDate": dstr(p["date"]),
            "equity": float(p["equity"]),
            "drawdown": float(p.get("drawdown", 0.0)) / 100.0
            if abs(float(p.get("drawdown", 0.0))) > 1
            else float(p.get("drawdown", 0.0)),
        }
        for p in result["equity_curve"]
    ]
    # engine drawdown in equity_curve may be daily; recompute from equity for Evaluation
    peak = 0.0
    for point in equity:
        peak = max(peak, point["equity"])
        point["drawdown"] = (point["equity"] - peak) / peak if peak > 0 else 0.0

    trades = []
    entries = []
    for t in result["trades"]:
        entry_date = dstr(t["entry_date"])
        exit_date = dstr(t["exit_date"])
        trades.append(
            {
                "ticker": str(t["stock"]),
                "side": "买入→卖出",
                "entryDate": entry_date,
                "exitDate": exit_date,
                "entryPrice": float(t["entry_price"]),
                "exitPrice": float(t["exit_price"]),
                "pnl": float(t["pnl"]),
                "exitReason": str(t.get("exit_reason", "")),
            }
        )
        entries.append({"sessionDate": entry_date, "ticker": str(t["stock"])})

    # max_dd in result is percent
    max_dd = float(result["max_dd"])
    if abs(max_dd) > 1:
        max_dd = max_dd / 100.0

    payload = {
        "strategyId": "v46-huimaqiang",
        "packId": "v46Huimaqiang",
        "displayName": "涨停回马枪 V46 · 部署脚本 引擎",
        "startDate": BACKTEST_START,
        "endDate": equity[-1]["sessionDate"] if equity else BACKTEST_START,
        "annualReturn": float(result["ann"]) / 100.0,
        "maxDrawdown": abs(max_dd),
        "calmar": float(result["calmar"]),
        "winRate": float(result["win_rate"]),
        "tradeCount": int(result["trade_count"]),
        "finalEquity": float(equity[-1]["equity"]) if equity else None,
        "notes": (
            f"金标来自 deploy_v46_huimaqiang + v42.engine；"
            f"引擎价带 {PRICE_MIN}-{PRICE_MAX}；persist={REGIME_MIN_PERSIST_DAYS}；"
            f"无 breadth≥0.45（与信号观察榜不同，与 43 课门控可并存）。"
        ),
        "priceMinEngine": PRICE_MIN,
        "priceMaxEngine": PRICE_MAX,
        "equity": equity,
        "trades": trades,
        "entries": entries,
        "metricsRaw": {
            "ann_pct": float(result["ann"]),
            "max_dd_pct": float(result["max_dd"]),
            "calmar": float(result["calmar"]),
            "win_rate": float(result["win_rate"]),
            "trade_count": int(result["trade_count"]),
        },
    }
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False)
    print(
        f"写出 {OUT}: ann={payload['metricsRaw']['ann_pct']:.2f}% "
        f"dd={payload['metricsRaw']['max_dd_pct']:.2f}% trades={payload['tradeCount']} "
        f"entries={len(entries)} equity_points={len(equity)}"
    )


if __name__ == "__main__":
    main()
