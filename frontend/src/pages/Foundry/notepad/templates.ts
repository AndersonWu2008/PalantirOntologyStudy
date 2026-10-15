/** Notepad templates — curated document blocks; domains register templates here. */

export type NotepadObjectKind = 'arrangement' | 'sellLines' | 'buyLines' | 'positions';

export type NotepadBlock = {
  id: string;
  kind: 'heading' | 'paragraph' | 'objectField' | 'objectTable' | 'link';
  label?: string;
  text?: string;
  object?: NotepadObjectKind;
  fields?: string[];
  hrefTemplate?: string;
  level?: 2 | 3;
};

export type NotepadTemplate = {
  id: string;
  displayName: string;
  audience: string;
  domain?: string;
  lead: string;
  context: {
    kind: 'arrangement+positions';
    accountId: string;
    /** Prefer arrangements whose sessionDate starts with this (domain template hint). */
    sessionDatePrefix?: string;
  };
  blocks: NotepadBlock[];
};

export const notepadTemplates: NotepadTemplate[] = [
  {
    id: 'StockTrading.morningBrief',
    displayName: 'Morning brief',
    audience: 'Operator · pre-open handoff',
    domain: 'StockTrading',
    lead: 'Embed the current PreOpenArrangement into a readable brief. Decisions still happen in Workshop.',
    context: { kind: 'arrangement+positions', accountId: 'acct-1', sessionDatePrefix: '2026-05' },
    blocks: [
      {
        id: 'title',
        kind: 'heading',
        level: 2,
        text: '开盘前安排 · {date}',
      },
      {
        id: 'lede',
        kind: 'paragraph',
        text: '账户 {accountId} · 安排 {arrangementId}。页首与行来自 Ontology；本页只阅读。',
      },
      {
        id: 'header',
        kind: 'objectField',
        label: '页首',
        object: 'arrangement',
        fields: ['header'],
      },
      {
        id: 'metrics',
        kind: 'objectField',
        label: '资金示意',
        object: 'arrangement',
        fields: ['cashShown', 'totalAssetsShown', 'continueCount'],
      },
      {
        id: 'sells',
        kind: 'objectTable',
        label: '卖出区',
        object: 'sellLines',
        fields: ['ticker', 'reason', 'outcome', 'submitQuantity', 'submitLimitPrice'],
      },
      {
        id: 'buys',
        kind: 'objectTable',
        label: '买入区',
        object: 'buyLines',
        fields: ['ticker', 'rank', 'outcome', 'submitQuantity', 'submitLimitPrice'],
      },
      {
        id: 'positions',
        kind: 'objectTable',
        label: '账上持仓（股数>0）',
        object: 'positions',
        fields: ['ticker', 'quantity', 'daysHeld', 'exitState', 'entryDate', 'entryPrice'],
      },
      {
        id: 'workshop',
        kind: 'link',
        label: 'Open Workshop for this date',
        hrefTemplate: '/workshop/pre-open?date={date}',
      },
      {
        id: 'carbon',
        kind: 'link',
        label: 'Open Carbon operator desk',
        hrefTemplate: '/carbon?workspace=StockTrading.operatorDesk',
      },
    ],
  },
  {
    id: 'StockTrading.builderHandoff',
    displayName: 'Builder handoff note',
    audience: 'Builder · status snapshot',
    domain: 'StockTrading',
    lead: 'Short status for builders: which arrangement is live and whether the header blocks confirms.',
    context: { kind: 'arrangement+positions', accountId: 'acct-1', sessionDatePrefix: '2026-05' },
    blocks: [
      {
        id: 'title',
        kind: 'heading',
        level: 2,
        text: 'Builder handoff · {date}',
      },
      {
        id: 'header',
        kind: 'objectField',
        label: 'Live header',
        object: 'arrangement',
        fields: ['header', 'arrangementId', 'sessionDate'],
      },
      {
        id: 'note',
        kind: 'paragraph',
        text: 'If header is 「没做完」, run Data Health. If 「还没写下委托」, operator confirms in Workshop — Automate only notifies.',
      },
      {
        id: 'health',
        kind: 'link',
        label: 'Data Health pack',
        hrefTemplate: '/data/health',
      },
      {
        id: 'automate',
        kind: 'link',
        label: 'Automate header rules',
        hrefTemplate: '/automate?id=StockTrading.headerNeedsOrders',
      },
    ],
  },
];

export function getNotepadTemplate(id: string | null | undefined): NotepadTemplate {
  return notepadTemplates.find((item) => item.id === id) ?? notepadTemplates[0];
}

export function fillText(template: string, vars: Record<string, string>): string {
  let out = template;
  for (const [key, value] of Object.entries(vars)) {
    out = out.replaceAll(`{${key}}`, value);
  }
  return out;
}
