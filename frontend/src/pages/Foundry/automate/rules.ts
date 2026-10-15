/** Automate rules — Condition + Effect; domains register automations here. */

export type AutomationConditionKind = 'objectsModified' | 'objectsAddedToSet';

export type AutomationCondition = {
  kind: AutomationConditionKind;
  objectType: string;
  watchProperties: string[];
  /** When set, only fire if the watched property equals one of these after change (or on baseline). */
  matchValues?: string[];
  accountId: string;
};

export type AutomationEffect = {
  kind: 'notification';
  titleTemplate: string;
  bodyTemplate: string;
  hrefTemplate: string;
};

export type Automation = {
  id: string;
  displayName: string;
  domain?: string;
  description: string;
  condition: AutomationCondition;
  effect: AutomationEffect;
  pollSeconds: number;
};

export type ArrangementSnapshot = {
  arrangementId: string;
  sessionDate: string;
  header: string;
};

export type AutomationNotification = {
  id: string;
  automationId: string;
  at: string;
  title: string;
  body: string;
  href: string;
  arrangementId: string;
  header: string;
  previousHeader?: string;
};

function fill(template: string, vars: Record<string, string>): string {
  let out = template;
  for (const [key, value] of Object.entries(vars)) {
    out = out.replaceAll(`{${key}}`, value);
  }
  return out;
}

export const automations: Automation[] = [
  {
    id: 'StockTrading.headerNeedsOrders',
    displayName: 'Header → needs orders',
    domain: 'StockTrading',
    description:
      'Notify when the current PreOpenArrangement header becomes 「还没写下委托」. Effect is notification only — never Confirm*.',
    pollSeconds: 30,
    condition: {
      kind: 'objectsModified',
      objectType: 'PreOpenArrangement',
      watchProperties: ['header'],
      matchValues: ['还没写下委托'],
      accountId: 'acct-1',
    },
    effect: {
      kind: 'notification',
      titleTemplate: 'Arrangement ready to confirm',
      bodyTemplate: '{arrangementId} header is 「{header}」. Open Workshop — do not auto-confirm.',
      hrefTemplate: '/workshop/pre-open?date={date}',
    },
  },
  {
    id: 'StockTrading.headerIncomplete',
    displayName: 'Header → incomplete',
    domain: 'StockTrading',
    description:
      'Notify when header becomes 「没做完」. Point operators to Data Health / pool gaps, not Confirm buttons.',
    pollSeconds: 30,
    condition: {
      kind: 'objectsModified',
      objectType: 'PreOpenArrangement',
      watchProperties: ['header'],
      matchValues: ['没做完'],
      accountId: 'acct-1',
    },
    effect: {
      kind: 'notification',
      titleTemplate: 'Arrangement incomplete',
      bodyTemplate: '{arrangementId} header is 「{header}」. Check Data Health before confirming.',
      hrefTemplate: '/data/health',
    },
  },
  {
    id: 'StockTrading.headerAnyChange',
    displayName: 'Header any change',
    domain: 'StockTrading',
    description: 'Notify on any header change vs last snapshot for the current (non-superseded) arrangement.',
    pollSeconds: 30,
    condition: {
      kind: 'objectsModified',
      objectType: 'PreOpenArrangement',
      watchProperties: ['header'],
      accountId: 'acct-1',
    },
    effect: {
      kind: 'notification',
      titleTemplate: 'Page header changed',
      bodyTemplate: '{arrangementId}: 「{previousHeader}」 → 「{header}」',
      hrefTemplate: '/workshop/pre-open?date={date}',
    },
  },
];

export function getAutomation(id: string | null | undefined): Automation {
  return automations.find((item) => item.id === id) ?? automations[0];
}

export function currentArrangement(rows: Record<string, unknown>[]): ArrangementSnapshot | null {
  const superseded = new Set(
    rows
      .map((row) => row.supersedesArrangementId)
      .filter((id) => id != null && id !== '')
      .map(String),
  );
  const byDate = [...rows].sort((left, right) =>
    String(right.sessionDate).localeCompare(String(left.sessionDate)),
  );
  const page = byDate.find(
    (row) =>
      !superseded.has(String(row.arrangementId))
      && !rows.some((other) => other.supersedesArrangementId === row.arrangementId),
  );
  if (!page) return null;
  return {
    arrangementId: String(page.arrangementId),
    sessionDate: String(page.sessionDate ?? ''),
    header: String(page.header ?? ''),
  };
}

const SNAPSHOT_KEY = 'foundry.automate.headerSnapshots';

export function loadSnapshots(): Record<string, string> {
  try {
    const raw = localStorage.getItem(SNAPSHOT_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return {};
  }
}

export function saveSnapshots(map: Record<string, string>) {
  localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(map));
}

/**
 * Evaluate one automation against the current arrangement.
 * Returns a notification when the condition fires; otherwise null + reason.
 */
export function evaluateAutomation(
  automation: Automation,
  arrangement: ArrangementSnapshot | null,
  snapshots: Record<string, string>,
): { notification: AutomationNotification | null; reason: string; nextSnapshots: Record<string, string> } {
  const next = { ...snapshots };
  if (!arrangement) {
    return { notification: null, reason: '无当前未作废安排', nextSnapshots: next };
  }

  const snapKey = `${automation.id}::${arrangement.arrangementId}`;
  const previous = snapshots[snapKey];
  const header = arrangement.header;
  const matchValues = automation.condition.matchValues;

  let fires = false;
  let reason = '';

  if (previous === undefined) {
    // Baseline: seed snapshot; only fire matchValues rules if already in target state.
    next[snapKey] = header;
    if (matchValues?.includes(header)) {
      fires = true;
      reason = `基线命中 matchValues「${header}」`;
    } else {
      return {
        notification: null,
        reason: `已记录基线 header「${header}」（无变化通知）`,
        nextSnapshots: next,
      };
    }
  } else if (previous === header) {
    if (matchValues?.includes(header)) {
      return {
        notification: null,
        reason: `仍为「${header}」，已通知过快照，无新变化`,
        nextSnapshots: next,
      };
    }
    return { notification: null, reason: `header 未变「${header}」`, nextSnapshots: next };
  } else {
    next[snapKey] = header;
    if (matchValues && matchValues.length > 0) {
      fires = matchValues.includes(header);
      reason = fires
        ? `「${previous}」→「${header}」命中 matchValues`
        : `「${previous}」→「${header}」未命中 matchValues`;
    } else {
      fires = true;
      reason = `「${previous}」→「${header}」`;
    }
  }

  if (!fires) {
    return { notification: null, reason, nextSnapshots: next };
  }

  const vars = {
    arrangementId: arrangement.arrangementId,
    date: arrangement.sessionDate,
    header,
    previousHeader: previous ?? '(none)',
  };

  const notification: AutomationNotification = {
    id: `${automation.id}-${arrangement.arrangementId}-${Date.now()}`,
    automationId: automation.id,
    at: new Date().toISOString(),
    title: fill(automation.effect.titleTemplate, vars),
    body: fill(automation.effect.bodyTemplate, vars),
    href: fill(automation.effect.hrefTemplate, vars),
    arrangementId: arrangement.arrangementId,
    header,
    previousHeader: previous,
  };

  return { notification, reason, nextSnapshots: next };
}
