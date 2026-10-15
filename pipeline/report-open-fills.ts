import { listObjects } from "./api.ts";
import { reportFill } from "./actions.ts";

/** 人手从券商抄回：三笔待执行买入按当日开盘价全部成交。 */
const reports = [
  { orderId: "acct-1|2026-05-19|1|300183.SZ|order", price: 13.245, quantity: 15000 },
  { orderId: "acct-1|2026-05-19|1|002441.SZ|order", price: 10.19, quantity: 19500 },
  { orderId: "acct-1|2026-05-19|1|002077.SZ|order", price: 17.1, quantity: 11500 },
] as const;

async function main(): Promise<void> {
  const written = [];
  for (const row of reports) {
    written.push(
      await reportFill({
        orderId: row.orderId,
        side: "买入",
        price: row.price,
        quantity: row.quantity,
        sessionDate: "2026-05-19",
        actor: "交易员",
      }),
    );
  }
  const positions = await listObjects("/positions?accountId=acct-1");
  console.log(JSON.stringify({
    fills: written.map((row) => ({
      fillId: row.fillId,
      ticker: row.ticker,
      price: row.price,
      quantity: row.quantity,
      entryPrice: (row.position as Record<string, unknown> | null)?.entryPrice,
      atrAtEntry: (row.position as Record<string, unknown> | null)?.atrAtEntry,
      regimeAtEntry: (row.position as Record<string, unknown> | null)?.regimeAtEntry,
      entryFieldsMissing: (row.position as Record<string, unknown> | null)?.entryFieldsMissing,
    })),
    positions: positions.map((row) => ({
      positionId: row.positionId,
      ticker: row.ticker,
      quantity: row.quantity,
      entryPrice: row.entryPrice,
      entryDate: row.entryDate,
      regimeAtEntry: row.regimeAtEntry,
    })),
  }, null, 2));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
