/**
 * Evaluation Runner：从 TRADING_DATA_ROOT 的回测金标写入 Evaluation*。
 *
 *   npx tsx pipeline/evaluate-strategy.ts
 *   npx tsx pipeline/evaluate-strategy.ts --skip-python   # 仅导入已有 JSON
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const skipPython = process.argv.includes("--skip-python");
const trading = process.env.TRADING_DATA_ROOT;
if (!skipPython && !trading) {
  throw new Error("设置 TRADING_DATA_ROOT 指向本地行情研究目录，或加上 --skip-python");
}

function runPython(script: string, root: string) {
  const result = spawnSync("python3", [script], {
    cwd: root,
    env: { ...process.env, PYTHONPATH: root },
    stdio: "inherit",
  });
  if (result.status !== 0) {
    throw new Error(`${script} failed with ${result.status}`);
  }
}

async function main() {
  if (!skipPython) {
    console.log("导出 V46 回测金标 ...");
    runPython(join(here, "parity/v46_export_backtest.py"), trading);
    console.log("导出 V44 回测金标 ...");
    runPython(join(here, "parity/v44_export_backtest.py"), trading);
  } else {
    if (!existsSync(join(here, "parity/v46_backtest_gold.json"))) {
      throw new Error("缺少 v46_backtest_gold.json");
    }
  }
  const seed = spawnSync("npx", ["tsx", join(here, "seed-evaluation-from-backtest.ts")], {
    cwd: here,
    stdio: "inherit",
  });
  if (seed.status !== 0) throw new Error("seed-evaluation-from-backtest failed");
  console.log("完成。打开 /ontology/evaluation 查看中文对照。");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
