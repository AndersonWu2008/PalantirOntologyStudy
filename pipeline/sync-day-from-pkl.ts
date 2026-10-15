/** 从 TRADING_DATA_ROOT 里的 pickle 同步单日 OHLC（含涨跌幅）进库 */
import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const day = process.argv[2];
const trading = process.env.TRADING_DATA_ROOT;
if (!day || !trading) {
  console.error("用法: TRADING_DATA_ROOT=/path/to/trading npx tsx pipeline/sync-day-from-pkl.ts YYYY-MM-DD");
  process.exit(2);
}

const here = dirname(fileURLToPath(import.meta.url));
const outJson = `/tmp/sync-day-${day}.json`;

const py = `
import json, pickle, pandas as pd
day = ${JSON.stringify(day)}
with open("reports/v43/deploy/prepared_data_v43_updated.pkl", "rb") as f:
    df = pickle.load(f)["df"].copy()
df["date"] = pd.to_datetime(df["date"])
sub = df[df["date"] == pd.Timestamp(day)].copy()
sub = sub.sort_values("stockCode")
# pct change from close vs prev close in full series
df = df.sort_values(["stockCode", "date"])
df["prev"] = df.groupby("stockCode")["close"].shift(1)
df["chg"] = (df["close"] / df["prev"] - 1) * 100
m = df[df["date"] == pd.Timestamp(day)]
rows = []
for _, r in m.iterrows():
    chg = None if pd.isna(r["chg"]) else float(r["chg"])
    rows.append({
        "barId": f'{r["stockCode"]}|{day}',
        "ticker": str(r["stockCode"]),
        "sessionDate": day,
        "open": float(r["open"]) if pd.notna(r["open"]) else None,
        "high": float(r["high"]) if pd.notna(r["high"]) else None,
        "low": float(r["low"]) if pd.notna(r["low"]) else None,
        "close": float(r["close"]) if pd.notna(r["close"]) else None,
        "volume": float(r["volume"]) if pd.notna(r["volume"]) else None,
        "amount": float(r["amount"]) if pd.notna(r.get("amount")) else None,
        "changePercent": chg,
        "publishedIndustry": str(r["industry"]) if pd.notna(r.get("industry")) else None,
    })
print(json.dumps(rows))
print(f"wrote {len(rows)}", file=__import__("sys").stderr)
`;

const result = spawnSync("python3", ["-c", py], {
  cwd: trading,
  env: { ...process.env, PYTHONPATH: trading },
  encoding: "utf8",
  maxBuffer: 50 * 1024 * 1024,
});
if (result.status !== 0) {
  console.error(result.stderr);
  process.exit(result.status ?? 1);
}
const rawRows = JSON.parse(result.stdout) as Record<string, unknown>[];
writeFileSync(outJson, JSON.stringify(rawRows));
console.log("pkl rows", rawRows.length);

async function push() {
  const api = process.env.DATABASE_API ?? "http://127.0.0.1:3010";
  const members = (await (await fetch(`${api}/index-constituents?indexId=pool&domain=StockTrading`)).json()) as {
    ticker: string;
  }[];
  const pool = new Set(members.map((m) => m.ticker));
  const rows = rawRows.filter((row) => pool.has(String(row.ticker)));
  console.log("pool rows", rows.length);
  await fetch(`${api}/trading-days`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ pass: "calendar", sessionDate: day, isTradingDay: true, domain: "StockTrading" }),
  });
  const batch = await fetch(`${api}/daily-bars/batch`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ pass: "source", domain: "StockTrading", rows }),
  });
  if (!batch.ok) throw new Error(`batch ${batch.status} ${await batch.text()}`);
  console.log("batch", await batch.json());
  const prev = await fetch(`${api}/daily-bars/previous-close`, { method: "POST" });
  console.log("previous-close", await prev.json());
}

push().catch((error) => {
  console.error(error);
  process.exit(1);
});
