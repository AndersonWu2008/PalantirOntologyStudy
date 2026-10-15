import { listObjects } from "./api.ts";
import { runClosePipeline, runOpenPipeline } from "./close-pipeline.ts";

async function main() {
  const tradeDate = "2026-10-12";
  const closed = await runClosePipeline("acct-1", tradeDate, `${tradeDate}T08:00:00+08:00`);
  console.log("CLOSE", {
    header: closed.header,
    entryGate: closed.entryGate,
    selectionMissing: closed.selectionMissing,
    regime: closed.regime,
    arrangementId: closed.arrangementId,
  });
  const sells = await listObjects(`/sell-lines?arrangementId=${encodeURIComponent(String(closed.arrangementId))}`);
  const buys = await listObjects(`/buy-lines?arrangementId=${encodeURIComponent(String(closed.arrangementId))}`);
  console.log("sells", sells.length, "buys", buys.length, buys.slice(0, 5).map((b) => b.ticker));
  const opened = await runOpenPipeline("acct-1", tradeDate, `${tradeDate}T09:26:00+08:00`);
  console.log("OPEN", opened);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
