/** Contour analyses — dataset boards + path steps; domains register here. */

export type ContourBoard = {
  id: string;
  displayName: string;
  collection: 'daily-bars';
  defaultParams: { sessionDate?: string; ticker?: string };
  columns: string[];
};

export type ContourStep =
  | {
      id: string;
      kind: 'filter';
      label: string;
      nullishColumns?: string[];
    }
  | {
      id: string;
      kind: 'aggregate';
      label: string;
      groupBy: string;
      metric: 'count' | 'avgChangePercent' | 'nullChangePercent';
      topN?: number;
    }
  | {
      id: string;
      kind: 'chart';
      label: string;
      fromStepId: string;
      valueKey: string;
      labelKey: string;
    };

export type ContourAnalysis = {
  id: string;
  displayName: string;
  domain?: string;
  lead: string;
  board: ContourBoard;
  path: ContourStep[];
  quiverContrastHref?: string;
};

const dailyColumns = [
  'ticker',
  'sessionDate',
  'open',
  'high',
  'low',
  'close',
  'changePercent',
  'previousClose',
  'publishedIndustry',
  'comparisonScore',
  'ma20',
  'atr14',
];

export const contourAnalyses: ContourAnalysis[] = [
  {
    id: 'StockTrading.dailyBarBoard',
    displayName: 'DailyBar board · one session',
    domain: 'StockTrading',
    lead:
      'Table analysis on DailyBar for one sessionDate: null changePercent filter, industry counts, changePercent buckets. Contrast with Quiver on a single Stock.',
    board: {
      id: 'daily-bars-session',
      displayName: 'daily_bars',
      collection: 'daily-bars',
      defaultParams: { sessionDate: '2026-05-22' },
      columns: dailyColumns,
    },
    path: [
      {
        id: 'null-change',
        kind: 'filter',
        label: 'Rows missing changePercent',
        nullishColumns: ['changePercent'],
      },
      {
        id: 'by-industry',
        kind: 'aggregate',
        label: 'Count by publishedIndustry',
        groupBy: 'publishedIndustry',
        metric: 'count',
        topN: 12,
      },
      {
        id: 'industry-chart',
        kind: 'chart',
        label: 'Industry counts',
        fromStepId: 'by-industry',
        labelKey: 'group',
        valueKey: 'value',
      },
      {
        id: 'change-buckets',
        kind: 'aggregate',
        label: 'changePercent buckets',
        groupBy: 'changePercentBucket',
        metric: 'count',
      },
    ],
    quiverContrastHref: '/ontology/quiver?profile=StockTrading.stockDaily&id=300183.SZ',
  },
  {
    id: 'StockTrading.tickerBoard',
    displayName: 'DailyBar board · one ticker',
    domain: 'StockTrading',
    lead: 'Tabular slice for one ticker across dates. Use beside Quiver OHLC for the same subject.',
    board: {
      id: 'daily-bars-ticker',
      displayName: 'daily_bars',
      collection: 'daily-bars',
      defaultParams: { ticker: '300097.SZ', sessionDate: '' },
      columns: dailyColumns,
    },
    path: [
      {
        id: 'null-change',
        kind: 'filter',
        label: 'Rows missing changePercent',
        nullishColumns: ['changePercent'],
      },
      {
        id: 'by-date',
        kind: 'aggregate',
        label: 'Recent session counts (sanity)',
        groupBy: 'sessionDate',
        metric: 'count',
        topN: 15,
      },
      {
        id: 'date-chart',
        kind: 'chart',
        label: 'Rows per sessionDate',
        fromStepId: 'by-date',
        labelKey: 'group',
        valueKey: 'value',
      },
    ],
    quiverContrastHref: '/ontology/quiver?profile=StockTrading.stockDaily&id=300097.SZ',
  },
];

export function getContourAnalysis(id: string | null | undefined): ContourAnalysis {
  return contourAnalyses.find((item) => item.id === id) ?? contourAnalyses[0];
}

export type AggregateRow = { group: string; value: number };

export function isNullish(value: unknown): boolean {
  return value == null || value === '';
}

export function changePercentBucket(value: unknown): string {
  if (isNullish(value)) return 'null';
  const n = Number(value);
  if (!Number.isFinite(n)) return 'null';
  if (n <= -5) return '≤ -5%';
  if (n <= -2) return '-5% … -2%';
  if (n < 0) return '-2% … 0%';
  if (n === 0) return '0%';
  if (n < 2) return '0% … 2%';
  if (n < 5) return '2% … 5%';
  return '≥ 5%';
}

export function runFilter(
  rows: Record<string, unknown>[],
  step: Extract<ContourStep, { kind: 'filter' }>,
): Record<string, unknown>[] {
  const cols = step.nullishColumns ?? [];
  if (cols.length === 0) return rows;
  return rows.filter((row) => cols.some((col) => isNullish(row[col])));
}

export function runAggregate(
  rows: Record<string, unknown>[],
  step: Extract<ContourStep, { kind: 'aggregate' }>,
): AggregateRow[] {
  const groups = new Map<string, { sum: number; count: number; nullChange: number }>();
  for (const row of rows) {
    const key =
      step.groupBy === 'changePercentBucket'
        ? changePercentBucket(row.changePercent)
        : String(row[step.groupBy] ?? '(empty)');
    const bucket = groups.get(key) ?? { sum: 0, count: 0, nullChange: 0 };
    bucket.count += 1;
    if (isNullish(row.changePercent)) bucket.nullChange += 1;
    const change = Number(row.changePercent);
    if (Number.isFinite(change)) bucket.sum += change;
    groups.set(key, bucket);
  }
  let out: AggregateRow[] = [...groups.entries()].map(([group, stats]) => {
    let value = stats.count;
    if (step.metric === 'avgChangePercent') {
      const finite = stats.count - stats.nullChange;
      value = finite > 0 ? stats.sum / finite : 0;
    } else if (step.metric === 'nullChangePercent') {
      value = stats.nullChange;
    }
    return { group, value };
  });
  out.sort((left, right) => right.value - left.value);
  if (step.topN != null) out = out.slice(0, step.topN);
  if (step.groupBy === 'changePercentBucket') {
    const order = ['null', '≤ -5%', '-5% … -2%', '-2% … 0%', '0%', '0% … 2%', '2% … 5%', '≥ 5%'];
    out.sort((left, right) => order.indexOf(left.group) - order.indexOf(right.group));
  }
  if (step.groupBy === 'sessionDate') {
    out.sort((left, right) => right.group.localeCompare(left.group));
    if (step.topN != null) out = out.slice(0, step.topN);
  }
  return out;
}
