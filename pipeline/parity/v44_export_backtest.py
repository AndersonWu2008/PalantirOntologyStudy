#!/usr/bin/env python3
"""导出 V44 冠军引擎回测金标，供 Evaluation 对照。"""
from __future__ import annotations

import json
import os
import sys
from datetime import datetime

import pandas as pd

TRADING = os.environ.get("TRADING_DATA_ROOT")
if not TRADING:
    raise SystemExit("设置 TRADING_DATA_ROOT 指向本地行情研究目录")
sys.path.insert(0, TRADING)

from v42.config import PRICE_MAX, PRICE_MIN  # noqa: E402
from v42.engine import run_backtest as run_backtest_v42  # noqa: E402
from v44.deploy_v44_phase3 import (  # noqa: E402
    CHAMPION_PARAMS,
    EXIT_ON_REGIME_FLIP,
    REGIME_MIN_PERSIST_DAYS,
)
from v44.main import BACKTEST_START, load_deploy_data, prepare_engine_columns  # noqa: E402

OUT = os.path.join(os.path.dirname(__file__), "v44_backtest_gold.json")


def dstr(value) -> str:
    if isinstance(value, datetime):
        return value.strftime("%Y-%m-%d")
    return pd.Timestamp(value).strftime("%Y-%m-%d")


def main() -> None:
    print("加载 V44 部署数据 ...")
    df0, regimes_v36, sentiments, kline_quality = load_deploy_data()
    df = prepare_engine_columns(df0.copy())
    seg = df[df["date"] >= BACKTEST_START].copy()
    print(f"回测 {BACKTEST_START} ~ {dstr(seg['date'].max())} ...")
    result = run_backtest_v42(
        seg,
        regimes_v36=regimes_v36,
        regime_params=CHAMPION_PARAMS,
        sentiments=sentiments or {},
        kline_quality=kline_quality or {},
        price_min=PRICE_MIN,
        price_max=PRICE_MAX,
        scoring_version="ml",
        verbose=False,
        enable_vol_targeting=False,
        regime_min_persist_days=REGIME_MIN_PERSIST_DAYS,
        exit_on_regime_flip=EXIT_ON_REGIME_FLIP,
    )
    equity = []
    peak = 0.0
    for p in result["equity_curve"]:
        eq = float(p["equity"])
        peak = max(peak, eq)
        equity.append(
            {
                "sessionDate": dstr(p["date"]),
                "equity": eq,
                "drawdown": (eq - peak) / peak if peak > 0 else 0.0,
            }
        )
    trades = [
        {
            "ticker": str(t["stock"]),
            "side": "买入→卖出",
            "entryDate": dstr(t["entry_date"]),
            "exitDate": dstr(t["exit_date"]),
            "entryPrice": float(t["entry_price"]),
            "exitPrice": float(t["exit_price"]),
            "pnl": float(t["pnl"]),
            "exitReason": str(t.get("exit_reason", "")),
        }
        for t in result["trades"]
    ]
    max_dd = float(result["max_dd"])
    if abs(max_dd) > 1:
        max_dd = abs(max_dd) / 100.0
    else:
        max_dd = abs(max_dd)
    payload = {
        "strategyId": "v44",
        "packId": "v44Champion",
        "displayName": "V44 冠军 · 部署脚本 引擎",
        "startDate": BACKTEST_START,
        "endDate": equity[-1]["sessionDate"] if equity else BACKTEST_START,
        "annualReturn": float(result["ann"]) / 100.0,
        "maxDrawdown": max_dd,
        "calmar": float(result["calmar"]),
        "winRate": float(result["win_rate"]),
        "tradeCount": int(result["trade_count"]),
        "finalEquity": float(equity[-1]["equity"]) if equity else None,
        "notes": "金标来自 deploy_v44_phase3 + v42.engine（与课 13 同源）。",
        "equity": equity,
        "trades": trades,
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
    print(f"写出 {OUT}: ann={payload['metricsRaw']['ann_pct']:.2f}% trades={payload['tradeCount']}")


if __name__ == "__main__":
    main()
