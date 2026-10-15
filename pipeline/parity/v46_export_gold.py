#!/usr/bin/env python3
"""从 部署脚本 pickle 用 deploy_v46 原函数写出金标（因子/池/分）。"""
from __future__ import annotations

import json
import os
import pickle
import sys
from datetime import datetime

import numpy as np
import pandas as pd

TRADING = os.environ.get("TRADING_DATA_ROOT")
if not TRADING:
    raise SystemExit("设置 TRADING_DATA_ROOT 指向本地行情研究目录")
sys.path.insert(0, TRADING)

from v44.deploy_v46_huimaqiang import (  # noqa: E402
    _pool_mask,
    build_v46_factors,
    build_v46_score,
)

PKL = os.path.join(TRADING, "reports/v43/deploy/prepared_data_v43_updated.pkl")
OUT = os.path.join(os.path.dirname(__file__), "v46_gold.json")
OHLC_OUT = os.path.join(os.path.dirname(__file__), "v46_ohlc.csv")


def to_date_str(value) -> str:
    if isinstance(value, datetime):
        return value.strftime("%Y-%m-%d")
    ts = pd.Timestamp(value)
    return ts.strftime("%Y-%m-%d")


def main() -> None:
    n_days = int(sys.argv[1]) if len(sys.argv) > 1 else 20
    print(f"加载 {PKL} ...")
    with open(PKL, "rb") as f:
        data = pickle.load(f)
    df = data["df"].copy()
    df = df.sort_values(["stockCode", "date"]).reset_index(drop=True)
    # 只要金标需要的列
    base = df[["stockCode", "date", "close", "volume", "stockName", "open", "high", "low"]].copy()
    print("build_v46_factors ...")
    scored = build_v46_score(build_v46_factors(base, lhb_set=set()))
    scored["in_pool"] = _pool_mask(scored)
    scored["date_str"] = scored["date"].map(to_date_str)

    # 取末尾有池内评分的交易日
    days = (
        scored.dropna(subset=["score_zj"])
        .groupby("date_str")
        .size()
        .sort_index()
        .index.tolist()
    )
    sample_days = days[-n_days:] if len(days) >= n_days else days
    print(f"抽样日 {len(sample_days)}: {sample_days[0]} -> {sample_days[-1]}")

    # ST 快照（与 Python _board_masks 一致：最新名称含 ST）
    st_names = (
        base.sort_values("date")
        .groupby("stockCode")
        .tail(1)[["stockCode", "stockName"]]
        .assign(isSt=lambda x: x["stockName"].astype(str).str.upper().str.contains("ST", na=False))
    )
    st_map = {str(r.stockCode): bool(r.isSt) for r in st_names.itertuples(index=False)}

    gold_rows = []
    for day in sample_days:
        sub = scored[scored["date_str"] == day]
        for r in sub.itertuples(index=False):
            gold_rows.append(
                {
                    "sessionDate": day,
                    "ticker": str(r.stockCode),
                    "close": None if pd.isna(r.close) else float(r.close),
                    "dayRet": None if pd.isna(r.day_ret) else float(r.day_ret),
                    "isLimitUp": None if pd.isna(r.is_limit_up) else bool(r.is_limit_up),
                    "excluded": bool(r.excluded),
                    "luRecent20d": None if pd.isna(r.lu_recent_20d) else float(r.lu_recent_20d),
                    "luCount60d": None if pd.isna(r.lu_count_60d) else float(r.lu_count_60d),
                    "high20d": None if pd.isna(r.high_20d) else float(r.high_20d),
                    "ddFromHigh20": None if pd.isna(r.dd_from_high20) else float(r.dd_from_high20),
                    "volMa5": None if pd.isna(r.vol_ma5) else float(r.vol_ma5),
                    "volMax20d": None if pd.isna(r.vol_max_20d) else float(r.vol_max_20d),
                    "volShrink": None if pd.isna(r.vol_shrink) else float(r.vol_shrink),
                    "inPool": bool(r.in_pool),
                    "scoreZj": None if pd.isna(r.score_zj) else float(r.score_zj),
                    "scoreZjRank": None if pd.isna(r.score_zj_rank) else float(r.score_zj_rank),
                    "isSt": st_map.get(str(r.stockCode), False),
                }
            )

    # OHLC 供 TS 在同一宇宙上重算（避免「仅池内横截面」与全样本金标分位不一致）
    ohlc = base.copy()
    ohlc["sessionDate"] = ohlc["date"].map(to_date_str)
    ohlc_export = ohlc.rename(columns={"stockCode": "ticker"})[
        ["ticker", "sessionDate", "close", "volume", "stockName"]
    ]
    ohlc_export.to_csv(OHLC_OUT, index=False)
    print(f"写出 {OHLC_OUT}: rows={len(ohlc_export)}")

    payload = {
        "source": "deploy_v46_huimaqiang.build_v46_factors+score",
        "pkl": PKL,
        "sampleDays": sample_days,
        "gold": gold_rows,
        "stMap": st_map,
    }
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(payload, f)
    print(f"写出 {OUT}: gold={len(gold_rows)} days={len(sample_days)}")


if __name__ == "__main__":
    main()
