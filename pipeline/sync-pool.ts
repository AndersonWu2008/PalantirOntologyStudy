import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import { readFileSync } from "node:fs";
import { postObject } from "./api.ts";

const apiBase = process.env.DATABASE_API ?? "http://localhost:3010";

type Stock = { ticker: string; displayName: string; board: string | null; isSt: boolean };

async function postBatch(rows: Record<string, unknown>[]): Promise<void> {
  const unique = [...new Map(rows.map((row) => [String(row.barId), row])).values()];
  const response = await fetch(`${apiBase}/daily-bars/batch`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ pass: "source", domain: "StockTrading", rows: unique }),
  });
  if (!response.ok) {
    throw new Error(`source batch ${response.status} ${await response.text()}`);
  }
}

async function main(): Promise<void> {
  const stocks = JSON.parse(readFileSync("/tmp/pool-stocks.json", "utf8")) as Stock[];
  const industries = new Set<string>(["其他"]);
  await postObject("/industries", { industryId: "其他", displayName: "其他" });
  for (const stock of stocks) {
    await postObject("/stocks", {
      ticker: stock.ticker,
      displayName: stock.displayName,
      isSt: stock.isSt,
      ...(stock.board ? { board: stock.board } : {}),
    });
    await postObject("/index-constituents", { indexId: "pool", ticker: stock.ticker });
  }
  const dates = new Set<string>();
  const lines = createInterface({ input: createReadStream("/tmp/pool-bars.jsonl"), crlfDelay: Infinity });
  let batch: Record<string, unknown>[] = [];
  let count = 0;
  for await (const line of lines) {
    if (!line) continue;
    const row = JSON.parse(line) as Record<string, unknown>;
    if (typeof row.publishedIndustry === "string" && row.publishedIndustry !== "unknown") {
      industries.add(row.publishedIndustry);
    }
    dates.add(String(row.sessionDate));
    batch.push(row);
    if (batch.length === 500) {
      await postBatch(batch);
      count += batch.length;
      batch = [];
      if (count % 20000 === 0) console.log("bars", count);
    }
  }
  if (batch.length > 0) {
    await postBatch(batch);
    count += batch.length;
  }
  for (const label of industries) {
    if (label === "其他") continue;
    await postObject("/industries", { industryId: label, displayName: label });
  }
  for (const sessionDate of dates) {
    await postObject("/trading-days", { pass: "calendar", sessionDate, isTradingDay: true });
  }
  console.log("synced", JSON.stringify({ stocks: stocks.length, bars: count, dates: dates.size, industries: industries.size }));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
