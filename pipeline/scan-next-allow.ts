/**
 * 从某交易日之后扫到下一「开仓门允许且有买入行」的日子，并写出安排。
 * 用法: npx tsx pipeline/scan-next-allow.ts --from 2026-07-17 --to 2026-10-12
 */
import { listObjects } from "./api.ts";
import { runClosePipeline, runOpenPipeline } from "./close-pipeline.ts";
import { fillPoolGaps, findPoolGaps } from "./pool-gaps.ts";

function arg(name: string, fallback: string): string {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

async function main(): Promise<void> {
  const fromExclusive = arg("--from", "2026-07-17");
  const toInclusive = arg("--to", "2026-10-12");
  const accountId = arg("--account", "acct-1");

  const calendar = (await listObjects("/trading-days"))
    .filter((day) => day.isTradingDay === true)
    .map((day) => String(day.sessionDate))
    .sort();
  const targets = calendar.filter((day) => day > fromExclusive && day <= toInclusive);
  console.log(JSON.stringify({ fromExclusive, toInclusive, days: targets.length }));

  for (const tradeDate of targets) {
    const priorDate = [...calendar].reverse().find((day) => day < tradeDate);
    if (!priorDate) throw new Error(`没有 ${tradeDate} 的前一交易日`);
    const gaps = await findPoolGaps(priorDate);
    if (gaps.length > 0) {
      console.log(tradeDate, "gaps", gaps.length);
      await fillPoolGaps(priorDate);
    }
    const closed = await runClosePipeline(accountId, tradeDate, `${tradeDate}T08:00:00+08:00`);
    const buys = await listObjects(`/buy-lines?arrangementId=${encodeURIComponent(String(closed.arrangementId))}`);
    const sells = await listObjects(`/sell-lines?arrangementId=${encodeURIComponent(String(closed.arrangementId))}`);
    console.log(
      tradeDate,
      "gate",
      closed.entryGate,
      "regime",
      closed.regime,
      "sells",
      sells.length,
      "buys",
      buys.length,
      "header",
      closed.header,
    );
    const opened = await runOpenPipeline(accountId, tradeDate, `${tradeDate}T09:26:00+08:00`);
    if (closed.entryGate === "允许" && buys.length > 0) {
      console.log("FIRST_ALLOW", JSON.stringify({ tradeDate, arrangementId: opened.arrangementId, header: opened.header }));
      return;
    }
  }
  console.log("SCAN_DONE_NO_ALLOW");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
