#!/usr/bin/env python3
"""验收 B：引擎开仓票在信号日必须落在 V46 池+评分排序的可买集合内。"""
from __future__ import annotations

import json
import os
import pickle
import sys
from collections import defaultdict
from datetime import datetime

import pandas as pd

TRADING = os.environ.get("TRADING_DATA_ROOT")
if not TRADING:
    raise SystemExit("设置 TRADING_DATA_ROOT 指向本地行情研究目录")
sys.path.insert(0, TRADING)

from v42.config import PRICE_MAX, PRICE_MIN  # noqa: E402
from v44.deploy_v46_huimaqiang import (  # noqa: E402
    _pool_mask,
    build_v46_factors,
    build_v46_score,
    load_lhb_strong_set,
)

HERE = os.path.dirname(__file__)
GOLD = os.path.join(HERE, "v46_backtest_gold.json")
PKL = os.path.join(TRADING, "reports/v43/deploy/prepared_data_v43_updated.pkl")
REPORT = os.path.join(HERE, "v46_entry_parity_report.json")


def dstr(value) -> str:
    if isinstance(value, datetime):
        return value.strftime("%Y-%m-%d")
    return pd.Timestamp(value).strftime("%Y-%m-%d")


def main() -> None:
    backtest = json.load(open(GOLD, encoding="utf-8"))
    entries = backtest["entries"]
    print(f"引擎开仓事件 {len(entries)}")

    with open(PKL, "rb") as f:
        raw = pickle.load(f)["df"].copy().sort_values(["stockCode", "date"]).reset_index(drop=True)
    df = build_v46_score(build_v46_factors(raw, load_lhb_strong_set()))
    df["date_str"] = df["date"].map(dstr)
    df["in_pool"] = _pool_mask(df)

    by_day = defaultdict(list)
    for e in entries:
        by_day[e["sessionDate"]].append(e["ticker"])

    missing_score = []
    not_in_ranked = []
    ok = 0
    for day, tickers in sorted(by_day.items()):
        day_df = df[df["date_str"] == day].copy()
        # 引擎可买：有分 + 价带（与 v42 PRICE_MIN/MAX）+ 非 nan
        eligible = day_df[
            day_df["score_zj"].notna()
            & day_df["close"].between(PRICE_MIN, PRICE_MAX)
        ].sort_values("score_zj", ascending=False)
        ranked = eligible["stockCode"].astype(str).tolist()
        # 涨停无法买 / 流动性不足会跳过前列，窗口放大到 40
        window = set(ranked[: max(40, len(tickers) * 10)])
        for ticker in tickers:
            row = day_df[day_df["stockCode"].astype(str) == ticker]
            if row.empty or pd.isna(row.iloc[0]["score_zj"]):
                missing_score.append({"sessionDate": day, "ticker": ticker})
                continue
            if ticker not in window:
                not_in_ranked.append(
                    {
                        "sessionDate": day,
                        "ticker": ticker,
                        "score": float(row.iloc[0]["score_zj"]),
                        "rankPos": ranked.index(ticker) + 1 if ticker in ranked else None,
                        "close": float(row.iloc[0]["close"]),
                    }
                )
                continue
            ok += 1

    report = {
        "entryEvents": len(entries),
        "ok": ok,
        "missingScore": missing_score[:30],
        "missingScoreCount": len(missing_score),
        "notInTopWindow": not_in_ranked[:30],
        "notInTopWindowCount": len(not_in_ranked),
        "pass": len(missing_score) == 0 and len(not_in_ranked) == 0,
    }
    with open(REPORT, "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=2)
    print(json.dumps({k: report[k] for k in ("entryEvents", "ok", "missingScoreCount", "notInTopWindowCount", "pass")}, ensure_ascii=False, indent=2))
    if not report["pass"]:
        sys.exit(1)


if __name__ == "__main__":
    main()
