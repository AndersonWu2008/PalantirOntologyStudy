/** Strategy Pack 注册表 — 平台只认 packId，公式见各法律文件 */

export type PackId = "v44Champion" | "v46Huimaqiang";

export type StrategyPack = {
  packId: PackId;
  formulaDoc: string;
  displayName: string;
  /** V46 部署默认不加广度门 */
  requireBreadthGate: boolean;
  /** 评分横截面：universe=可买范围；allBars=当日有 bar 的全库（对齐 pickle 宇宙） */
  scoreUniverse: "universe" | "allBars";
};

const PACKS: Record<PackId, StrategyPack> = {
  v44Champion: {
    packId: "v44Champion",
    formulaDoc: "docs/001_推导/13_V44策略本体.md",
    displayName: "V44 冠军",
    requireBreadthGate: true,
    scoreUniverse: "universe",
  },
  v46Huimaqiang: {
    packId: "v46Huimaqiang",
    formulaDoc: "docs/001_推导/43_V46策略本体.md",
    displayName: "涨停回马枪 1",
    requireBreadthGate: false,
    scoreUniverse: "allBars",
  },
};

export function resolvePackId(strategy: Record<string, unknown>): PackId {
  const explicit = strategy.packId != null && strategy.packId !== "" ? String(strategy.packId) : null;
  if (explicit === "v46Huimaqiang" || explicit === "v44Champion") return explicit;
  const id = String(strategy.strategyId ?? "");
  if (id.startsWith("v46") || id.includes("huimaqiang")) return "v46Huimaqiang";
  return "v44Champion";
}

export function resolvePack(strategy: Record<string, unknown>): StrategyPack {
  return PACKS[resolvePackId(strategy)];
}

export function listPacks(): StrategyPack[] {
  return Object.values(PACKS);
}
