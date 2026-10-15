/** 开盘前安排：把对象字段翻成中文「计划 + 原因」 */

export type BriefContext = {
  tradeDate: string;
  closeDate: string | null;
  strategyId: string | null;
  strategyName: string | null;
  packId: string | null;
  regime: string | null;
  entryGate: string | null;
  breadth: number | null;
  bullHvStreak: number | null;
  regimeMinPersistDays: number | null;
  breadthMin: number | null;
  requireBreadthGate: boolean;
  header: string;
  sellCount: number;
  buyCount: number;
  continueCount: number;
  sellReasons: string[];
};

export function explainSellReason(reason: unknown): string {
  switch (String(reason ?? '')) {
    case '到期':
      return '持有天数已达该制度袖套上限，按规则到期卖出。';
    case '止盈':
      return '自入场最高价回落触及移动止盈带，锁定浮盈离场。';
    case '止损':
      return '触发止损（固定、放量异动或连续跌停等），削减亏损。';
    case '制度离场':
      return '制度已离开牛市/高波动，按 exitOnRegimeFlip 清仓。';
    default:
      return reason ? `卖出原因：${reason}` : '卖出原因未写明。';
  }
}

export function explainBuyWhy(row: {
  rank?: unknown;
  outcome?: unknown;
  scoreHint?: string | null;
}): string {
  const outcome = String(row.outcome ?? '');
  if (outcome.startsWith('今天不买')) {
    return `${outcome}（开盘后无法按计划限价成交，本行不提交）。`;
  }
  if (outcome === '可写入委托') {
    const rank = row.rank != null ? `评分排序第 ${row.rank} 名` : '评分入选';
    return `${rank}；开仓门允许且在池内价带，计划按信号日收盘价挂限价买入。`;
  }
  return outcome || '等开盘再看能不能写成委托。';
}

export function explainGate(ctx: BriefContext): { title: string; detail: string } {
  const streakNeed = ctx.regimeMinPersistDays ?? 2;
  const streak = ctx.bullHvStreak;
  const regime = ctx.regime ?? '未知';

  if (ctx.entryGate === '缺少') {
    return {
      title: '开仓门：缺少（算不完）',
      detail: '前一收盘日行情不齐（缺收盘或涨跌幅等），制度/广度写不出，因此不能判断能不能开新仓。',
    };
  }
  if (ctx.entryGate === '关闭') {
    const bits: string[] = [];
    bits.push(`昨日制度「${regime}」`);
    if (streak != null) bits.push(`牛/高波连续 ${streak} 天（需要 ≥${streakNeed} 才开门）`);
    if (ctx.requireBreadthGate && ctx.breadth != null) {
      bits.push(`广度 ${(ctx.breadth * 100).toFixed(1)}%（门槛 ${((ctx.breadthMin ?? 0.45) * 100).toFixed(0)}%）`);
    } else if (!ctx.requireBreadthGate) {
      bits.push('本策略不加广度门');
    }
    if (regime === '熊市趋势') bits.push('熊市最大持仓为 0');
    if (regime === '震荡' && (streak ?? 0) < streakNeed) {
      bits.push('震荡会打断牛/高波连续天数，故通常不开新仓');
    }
    return {
      title: '开仓门：关闭（今日不新开）',
      detail: bits.join('。') + '。',
    };
  }
  if (ctx.entryGate === '允许') {
    const bits = [`昨日制度「${regime}」`, `连续天数 ${streak ?? '—'} ≥ ${streakNeed}`];
    if (ctx.requireBreadthGate && ctx.breadth != null) {
      bits.push(`广度 ${(ctx.breadth * 100).toFixed(1)}% 达标`);
    }
    return {
      title: '开仓门：允许（可以新开）',
      detail: bits.join('；') + '。',
    };
  }
  return {
    title: '开仓门：未写入',
    detail: '交易日上还没有 entryGate，可能尚未跑收盘管道。',
  };
}

export function buildBriefParagraphs(ctx: BriefContext): string[] {
  const lines: string[] = [];
  const strategy = ctx.strategyName ?? ctx.strategyId ?? '未知名做法';
  const close = ctx.closeDate ?? '（未知前收日）';
  lines.push(
    `交易日 ${ctx.tradeDate} 的安排，依据前一收盘日 ${close} 算完的制度与评分（做法：${strategy}${ctx.packId ? ` / ${ctx.packId}` : ''}）。`,
  );

  const gate = explainGate(ctx);
  lines.push(`${gate.title} — ${gate.detail}`);

  if (ctx.sellCount > 0) {
    const reasonSet = [...new Set(ctx.sellReasons.filter(Boolean))];
    lines.push(
      `计划卖出 ${ctx.sellCount} 只` +
        (reasonSet.length ? `（原因：${reasonSet.join('、')}）` : '') +
        '。打开盘后按行上的限价与 outcome 决定能否写入委托。',
    );
  } else {
    lines.push('计划卖出：无。');
  }

  if (ctx.entryGate === '关闭' || ctx.entryGate === '缺少') {
    lines.push('计划买入：无新开（门未开或算不完）。');
  } else if (ctx.buyCount > 0) {
    lines.push(`计划买入：${ctx.buyCount} 只（按回马枪/冠军评分排序入选，限价用信号日收盘）。`);
  } else {
    lines.push('计划买入：门允许但今日名单为空（池内无合格票、或仓位已满、或手数不足一手）。');
  }

  lines.push(`继续拿：${ctx.continueCount} 只（未触发卖出规则的持仓）。`);

  if (ctx.header === '还没写下委托') {
    lines.push('页首「还没写下委托」：你可以在规则允许的时钟内确认卖出/买入，再人手回报成交。');
  } else if (ctx.header === '今天没有要执行的') {
    lines.push('页首「今天没有要执行的」：没有需要确认的买卖行。');
  } else if (ctx.header === '没做完') {
    lines.push('页首「没做完」：先补齐行情缺口（见 Data Health），再重跑收开盘管道。');
  } else if (ctx.header === '等开盘价') {
    lines.push('页首「等开盘价」：计划可以看。当日开盘价到达并重跑开盘管道后，页首才会变成「还没写下委托」，那时才能确认。');
  } else if (ctx.header) {
    lines.push(`页首「${ctx.header}」：模块可能只读页首，暂不展示或不可提交买卖行。`);
  }

  return lines;
}

export function packRequiresBreadth(packId: string | null | undefined): boolean {
  if (!packId) return true;
  return packId !== 'v46Huimaqiang';
}
