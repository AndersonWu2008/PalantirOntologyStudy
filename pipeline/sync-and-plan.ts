/**
 * 拉计划日所读的那一根收盘，再跑收盘管道和开盘管道。不确认委托。
 * 回退：本地 pickle → 东方财富日 K → 腾讯日 K。三路都没有这一天，不改已有安排。
 */
import { spawn } from "node:child_process";
import { listObjects, postObject, api } from "./api.ts";
import { decidePlan, shanghaiParts } from "./ashare-calendar.ts";
import { runClosePipeline, runOpenPipeline } from "./close-pipeline.ts";
import { fillPoolGaps } from "./pool-gaps.ts";

type BarRow = {
  barId: string;
  ticker: string;
  sessionDate: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number | null;
  amount: number | null;
  changePercent: number | null;
  publishedIndustry: string | null;
};

export type SyncPlanResult = {
  planDate: string;
  barDate: string;
  source: string;
  bars: number;
  gaps: number;
  header: string;
  arrangementId: string;
};

const EAST_MONEY = "https://push2his.eastmoney.com/api/qt/stock/kline/get";

function num(value: unknown): number | null {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function eastSecId(ticker: string): string | null {
  const [code, exchange] = ticker.split(".");
  if (!code || !exchange) return null;
  if (exchange === "SH") return `1.${code}`;
  if (exchange === "SZ" || exchange === "BJ") return `0.${code}`;
  return null;
}

function tencentSymbol(ticker: string): string | null {
  const [code, exchange] = ticker.split(".");
  if (!code || !exchange) return null;
  if (exchange === "SH") return `sh${code}`;
  if (exchange === "SZ") return `sz${code}`;
  if (exchange === "BJ") return `bj${code}`;
  return null;
}

async function fetchText(url: string, referer: string): Promise<string> {
  let last: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: {
          "user-agent": "Mozilla/5.0",
          referer,
        },
        signal: AbortSignal.timeout(12000),
      });
      if (!response.ok) throw new Error(String(response.status));
      return await response.text();
    } catch (error) {
      last = error;
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
  throw last instanceof Error ? last : new Error("行情请求失败");
}

async function mapPool<T>(
  items: string[],
  limit: number,
  run: (item: string) => Promise<T | null>,
): Promise<T[]> {
  const out: T[] = [];
  let index = 0;
  async function worker(): Promise<void> {
    while (index < items.length) {
      const current = index;
      index += 1;
      try {
        const value = await run(items[current]);
        if (value) out.push(value);
      } catch {
        /* 这一只换下一路 */
      }
    }
  }
  const workers = Math.min(limit, items.length);
  await Promise.all(Array.from({ length: workers }, () => worker()));
  return out;
}

function barFromParts(
  ticker: string,
  day: string,
  open: number | null,
  close: number | null,
  high: number | null,
  low: number | null,
  volume: number | null,
  amount: number | null,
  changePercent: number | null,
): BarRow | null {
  if (open == null || close == null || high == null || low == null) return null;
  return {
    barId: `${ticker}|${day}`,
    ticker,
    sessionDate: day,
    open,
    high,
    low,
    close,
    volume,
    amount,
    changePercent,
    publishedIndustry: null,
  };
}

async function readPickleDay(day: string, pool: Set<string>): Promise<BarRow[]> {
  const trading = process.env.TRADING_DATA_ROOT;
  if (!trading) return [];
  const py = `
import json, pickle, pandas as pd, sys
day = ${JSON.stringify(day)}
try:
    with open("reports/v43/deploy/prepared_data_v43_updated.pkl", "rb") as f:
        df = pickle.load(f)["df"].copy()
except Exception as exc:
    print(json.dumps({"error": str(exc)}))
    sys.exit(0)
df["date"] = pd.to_datetime(df["date"])
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
        "open": None if pd.isna(r["open"]) else float(r["open"]),
        "high": None if pd.isna(r["high"]) else float(r["high"]),
        "low": None if pd.isna(r["low"]) else float(r["low"]),
        "close": None if pd.isna(r["close"]) else float(r["close"]),
        "volume": None if pd.isna(r["volume"]) else float(r["volume"]),
        "amount": None if pd.isna(r.get("amount")) else float(r["amount"]),
        "changePercent": chg,
        "publishedIndustry": None if pd.isna(r.get("industry")) or str(r.get("industry")) == "unknown" else str(r["industry"]),
    })
print(json.dumps(rows))
`;
  const stdout = await new Promise<string>((resolve, reject) => {
    const child = spawn("python3", ["-c", py], {
      cwd: trading,
      env: { ...process.env, PYTHONPATH: trading },
    });
    const chunks: Buffer[] = [];
    const errors: Buffer[] = [];
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error("pickle 超时"));
    }, 90_000);
    child.stdout.on("data", (chunk: Buffer) => chunks.push(chunk));
    child.stderr.on("data", (chunk: Buffer) => errors.push(chunk));
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        reject(new Error(Buffer.concat(errors).toString("utf8") || `pickle 退出 ${code}`));
        return;
      }
      resolve(Buffer.concat(chunks).toString("utf8"));
    });
  });
  const parsed: unknown = JSON.parse(stdout);
  if (!Array.isArray(parsed)) return [];
  return parsed.flatMap((row) => {
    if (!row || typeof row !== "object") return [];
    const record = row as Record<string, unknown>;
    const ticker = String(record.ticker ?? "");
    if (!pool.has(ticker)) return [];
    const built = barFromParts(
      ticker,
      day,
      num(record.open),
      num(record.close),
      num(record.high),
      num(record.low),
      num(record.volume),
      num(record.amount),
      num(record.changePercent),
    );
    if (!built) return [];
    built.publishedIndustry = record.publishedIndustry == null ? null : String(record.publishedIndustry);
    return [built];
  });
}

function parseEastLine(ticker: string, day: string, line: string): BarRow | null {
  const parts = line.split(",");
  if (parts[0] !== day) return null;
  const close = num(parts[2]);
  const open = num(parts[1]);
  return barFromParts(ticker, day, open, close, num(parts[3]), num(parts[4]), num(parts[5]), num(parts[6]), num(parts[8]));
}

async function readEastMoney(ticker: string, day: string): Promise<BarRow | null> {
  const secid = eastSecId(ticker);
  if (!secid) return null;
  const ymd = day.replaceAll("-", "");
  const url = `${EAST_MONEY}?secid=${secid}&fields1=f1,f2,f3,f4,f5,f6&fields2=f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61&klt=101&fqt=0&beg=${ymd}&end=${ymd}`;
  const text = await fetchText(url, "https://quote.eastmoney.com/");
  const parsed = JSON.parse(text) as { data?: { klines?: string[] } | null };
  const line = parsed.data?.klines?.find((item) => item.startsWith(day));
  if (!line) return null;
  return parseEastLine(ticker, day, line);
}

async function readTencent(ticker: string, day: string): Promise<BarRow | null> {
  const symbol = tencentSymbol(ticker);
  if (!symbol) return null;
  const url = `https://web.ifzq.gtimg.cn/appstock/app/kline/kline?param=${symbol},day,,,40,`;
  const text = await fetchText(url, "https://gu.qq.com/");
  const parsed = JSON.parse(text) as { data?: Record<string, { day?: string[][] }> };
  const days = parsed.data?.[symbol]?.day ?? [];
  const index = days.findIndex((row) => row[0] === day);
  if (index < 0) return null;
  const row = days[index];
  const close = num(row[2]);
  const previous = index > 0 ? num(days[index - 1][2]) : null;
  const changePercent = close != null && previous != null && previous !== 0 ? (close / previous - 1) * 100 : null;
  return barFromParts(ticker, day, num(row[1]), close, num(row[3]), num(row[4]), num(row[5]), null, changePercent);
}

async function observedSessions(): Promise<Set<string>> {
  const observed = new Set<string>();
  const days = await listObjects("/trading-days");
  for (const row of days) {
    if (row.isTradingDay === true && row.sessionDate != null) {
      observed.add(String(row.sessionDate).slice(0, 10));
    }
  }
  try {
    const { day } = shanghaiParts();
    const url = `${EAST_MONEY}?secid=1.600000&fields1=f1,f2,f3,f4,f5,f6&fields2=f51&klt=101&fqt=0&end=${day.replaceAll("-", "")}&lmt=40`;
    const text = await fetchText(url, "https://quote.eastmoney.com/");
    const parsed = JSON.parse(text) as { data?: { klines?: string[] } | null };
    for (const line of parsed.data?.klines ?? []) {
      const session = line.split(",")[0]?.slice(0, 10);
      if (session) observed.add(session);
    }
  } catch {
    /* 名单补不上就用库里的交易日和周末休市 */
  }
  return observed;
}

async function poolTickers(): Promise<string[]> {
  const members = await listObjects("/index-constituents?indexId=pool");
  return [...new Set(members.map((row) => String(row.ticker ?? "")).filter(Boolean))].sort();
}

async function writeBars(rows: BarRow[]): Promise<void> {
  for (let index = 0; index < rows.length; index += 200) {
    const slice = rows.slice(index, index + 200);
    const response = await fetch(`${process.env.DATABASE_API ?? "http://127.0.0.1:3010"}/daily-bars/batch`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ pass: "source", domain: "StockTrading", rows: slice }),
    });
    if (!response.ok) throw new Error(`写入行情失败 ${response.status} ${await response.text()}`);
  }
}

async function ensureTradingDay(sessionDate: string): Promise<void> {
  await postObject("/trading-days", { pass: "calendar", sessionDate, isTradingDay: true });
}

export async function syncAndPlan(accountId = "acct-1"): Promise<SyncPlanResult> {
  const { day, minutes } = shanghaiParts();
  const observed = await observedSessions();
  const { planDate, barDate } = decidePlan(day, minutes, observed);
  const tickers = await poolTickers();
  if (tickers.length === 0) throw new Error("没有可买范围，拉不到行情");
  const pool = new Set(tickers);

  let source = "";
  const byTicker = new Map<string, BarRow>();
  try {
    const pickled = await readPickleDay(barDate, pool);
    if (pickled.length > 0) {
      source = "本地行情";
      for (const row of pickled) byTicker.set(row.ticker, row);
    }
  } catch (error) {
    console.warn("pickle 跳过", error instanceof Error ? error.message : error);
  }

  if (byTicker.size === 0) {
    const east = await mapPool(tickers, 8, (ticker) => readEastMoney(ticker, barDate));
    if (east.length > 0) source = "东方财富";
    for (const row of east) byTicker.set(row.ticker, row);
  }

  const stillMissing = tickers.filter((ticker) => !byTicker.has(ticker));
  if (stillMissing.length > 0 && source !== "本地行情") {
    const tencent = await mapPool(stillMissing, 8, (ticker) => readTencent(ticker, barDate));
    if (tencent.length > 0) source = source ? `${source}、腾讯` : "腾讯";
    for (const row of tencent) byTicker.set(row.ticker, row);
  }

  const rows = [...byTicker.values()];
  if (rows.length === 0) {
    throw new Error(`${barDate} 这天本地行情、东方财富、腾讯都没有，安排没改`);
  }
  if (rows.length < tickers.length * 0.8) {
    throw new Error(`${barDate} 只拉到 ${rows.length}/${tickers.length} 只，安排没改`);
  }

  await ensureTradingDay(barDate);
  await ensureTradingDay(planDate);
  await writeBars(rows);
  await api("POST", "/daily-bars/previous-close");
  const gaps = await fillPoolGaps(barDate);
  const closed = await runClosePipeline(accountId, planDate, `${planDate}T08:00:00+08:00`);
  const opened = await runOpenPipeline(accountId, planDate, `${planDate}T09:26:00+08:00`);
  return {
    planDate,
    barDate,
    source,
    bars: rows.length,
    gaps: gaps.length,
    header: String(opened.header ?? closed.header ?? ""),
    arrangementId: String(opened.arrangementId ?? closed.arrangementId ?? ""),
  };
}
