/** Quiver Analysis Profiles — platform config; domains register here, Quiver shell stays generic. */

export type PlotKind = 'line' | 'ohlc';

export type AxisSlot = 'primary' | 'secondary';

export type QuiverPlot = {
  id: string;
  kind: PlotKind;
  /** line: one value property; ohlc: open/high/low/close */
  properties: Record<string, string>;
  axis?: AxisSlot;
  label: string;
  color?: string;
};

export type QuiverEventSource = {
  id: string;
  objectType: string;
  collection: string;
  filterParam: string;
  timeProperty: string;
  labelProperty: string;
  valueProperty?: string;
  colorBy?: { property: string; map: Record<string, string> };
  label: string;
};

export type QuiverProfile = {
  id: string;
  displayName: string;
  domain?: string;
  subject: {
    objectType: string;
    primaryKey: string;
    titleKey: string;
    collection: string;
  };
  series: {
    objectType: string;
    collection: string;
    filterParam: string;
    timeProperty: string;
    plots: QuiverPlot[];
  };
  events?: QuiverEventSource[];
  /** default subject ids to pin in picker */
  suggestedSubjectIds?: string[];
  timeWindow?: { from?: string; to?: string };
};

export const quiverProfiles: QuiverProfile[] = [
  {
    id: 'StockTrading.stockDaily',
    displayName: 'Stock · DailyBar time series',
    domain: 'StockTrading',
    subject: {
      objectType: 'Stock',
      primaryKey: 'ticker',
      titleKey: 'displayName',
      collection: 'stocks',
    },
    series: {
      objectType: 'DailyBar',
      collection: 'daily-bars',
      filterParam: 'ticker',
      timeProperty: 'sessionDate',
      plots: [
        {
          id: 'ohlc',
          kind: 'ohlc',
          properties: { open: 'open', high: 'high', low: 'low', close: 'close' },
          axis: 'primary',
          label: 'OHLC',
        },
        {
          id: 'ma20',
          kind: 'line',
          properties: { value: 'ma20' },
          axis: 'primary',
          label: 'ma20',
          color: '#2563eb',
        },
        {
          id: 'comparisonScore',
          kind: 'line',
          properties: { value: 'comparisonScore' },
          axis: 'secondary',
          label: 'comparisonScore',
          color: '#b45309',
        },
      ],
    },
    events: [
      {
        id: 'fills',
        objectType: 'Fill',
        collection: 'fills',
        filterParam: 'ticker',
        timeProperty: 'sessionDate',
        labelProperty: 'side',
        valueProperty: 'price',
        colorBy: {
          property: 'side',
          map: { 买入: 'var(--action-green)', 卖出: 'var(--action-red)' },
        },
        label: 'Fill events',
      },
    ],
    suggestedSubjectIds: ['002077.SZ', '300183.SZ', '002441.SZ', '300601.SZ', '300323.SZ', '002413.SZ'],
    timeWindow: { from: '2026-04-01', to: '2026-05-30' },
  },
];

export function getQuiverProfile(id: string | null | undefined): QuiverProfile {
  return quiverProfiles.find((item) => item.id === id) ?? quiverProfiles[0];
}
