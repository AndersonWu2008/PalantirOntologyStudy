/** Vertex Graph Profiles — platform Search Around config; domains register hops here. */

export type VertexStarter = {
  objectType: string;
  collection: string;
  primaryKey: string;
  titleKey: string;
  listParams?: Record<string, string>;
  suggestedIds?: string[];
  /** properties shown on the node card */
  readoutProperties?: string[];
};

export type VertexExpand = {
  id: string;
  /** button / long description */
  label: string;
  /** short label drawn on the edge */
  edgeLabel: string;
  linkType: string;
  fromObjectType: string;
  toObjectType: string;
  collection: string;
  filterParam: string;
  filterValueFromParentKey: string;
  idProperty: string;
  titleProperty: string;
  readoutProperties?: string[];
  /** include in one-click deep expand */
  auto?: boolean;
  /** limit rows (e.g. DailyBar) */
  limit?: number;
};

export type VertexProfile = {
  id: string;
  displayName: string;
  domain?: string;
  starters: VertexStarter[];
  expands: VertexExpand[];
  /** one-click Search Around depth from root */
  autoExpandDepth?: number;
};

export const vertexProfiles: VertexProfile[] = [
  {
    id: 'StockTrading.arrangementExplore',
    displayName: 'Arrangement · link explore',
    domain: 'StockTrading',
    autoExpandDepth: 3,
    starters: [
      {
        objectType: 'PreOpenArrangement',
        collection: 'arrangements',
        primaryKey: 'arrangementId',
        titleKey: 'header',
        listParams: { accountId: 'acct-1' },
        suggestedIds: [
          'acct-1|2026-05-25|1',
          'acct-1|2026-05-22|1',
          'acct-1|2026-05-21|2',
          'acct-1|2026-05-20|2',
          'acct-1|2026-05-19|1',
        ],
        readoutProperties: ['header', 'sessionDate'],
      },
    ],
    expands: [
      {
        id: 'sellLines',
        label: 'SellLine（sellLineOnArrangement）',
        edgeLabel: 'sellLine',
        linkType: 'sellLineOnArrangement',
        fromObjectType: 'PreOpenArrangement',
        toObjectType: 'SellLine',
        collection: 'sell-lines',
        filterParam: 'arrangementId',
        filterValueFromParentKey: 'arrangementId',
        idProperty: 'sellLineId',
        titleProperty: 'ticker',
        readoutProperties: ['reason', 'outcome'],
        auto: true,
      },
      {
        id: 'buyLines',
        label: 'BuyLine（buyLineOnArrangement）',
        edgeLabel: 'buyLine',
        linkType: 'buyLineOnArrangement',
        fromObjectType: 'PreOpenArrangement',
        toObjectType: 'BuyLine',
        collection: 'buy-lines',
        filterParam: 'arrangementId',
        filterValueFromParentKey: 'arrangementId',
        idProperty: 'buyLineId',
        titleProperty: 'ticker',
        readoutProperties: ['rank', 'outcome'],
        auto: true,
      },
      {
        id: 'sellOrders',
        label: 'SellOrder（fromSellLine）',
        edgeLabel: 'order',
        linkType: 'fromSellLine',
        fromObjectType: 'SellLine',
        toObjectType: 'SellOrder',
        collection: 'sell-orders',
        filterParam: 'sellLineId',
        filterValueFromParentKey: 'sellLineId',
        idProperty: 'orderId',
        titleProperty: 'executionStatus',
        readoutProperties: ['executionStatus', 'contentStatus'],
        auto: true,
      },
      {
        id: 'buyOrders',
        label: 'BuyOrder（fromBuyLine）',
        edgeLabel: 'order',
        linkType: 'fromBuyLine',
        fromObjectType: 'BuyLine',
        toObjectType: 'BuyOrder',
        collection: 'buy-orders',
        filterParam: 'buyLineId',
        filterValueFromParentKey: 'buyLineId',
        idProperty: 'orderId',
        titleProperty: 'executionStatus',
        readoutProperties: ['executionStatus', 'contentStatus'],
        auto: true,
      },
      {
        id: 'stockFromSellLine',
        label: 'Stock（via ticker）',
        edgeLabel: 'stock',
        linkType: 'positionForStock',
        fromObjectType: 'SellLine',
        toObjectType: 'Stock',
        collection: 'stocks',
        filterParam: 'ticker',
        filterValueFromParentKey: 'ticker',
        idProperty: 'ticker',
        titleProperty: 'displayName',
        readoutProperties: ['ticker', 'board'],
        auto: true,
      },
      {
        id: 'stockFromBuyLine',
        label: 'Stock（via ticker）',
        edgeLabel: 'stock',
        linkType: 'positionForStock',
        fromObjectType: 'BuyLine',
        toObjectType: 'Stock',
        collection: 'stocks',
        filterParam: 'ticker',
        filterValueFromParentKey: 'ticker',
        idProperty: 'ticker',
        titleProperty: 'displayName',
        readoutProperties: ['ticker', 'board'],
        auto: true,
      },
      {
        id: 'positionFromSell',
        label: 'Position（sellLineForPosition）',
        edgeLabel: 'position',
        linkType: 'sellLineForPosition',
        fromObjectType: 'SellLine',
        toObjectType: 'Position',
        collection: 'positions',
        filterParam: 'positionId',
        filterValueFromParentKey: 'positionId',
        idProperty: 'positionId',
        titleProperty: 'ticker',
        readoutProperties: ['exitState', 'quantity'],
        auto: true,
      },
    ],
  },
  {
    id: 'StockTrading.stockExplore',
    displayName: 'Stock · link explore',
    domain: 'StockTrading',
    autoExpandDepth: 2,
    starters: [
      {
        objectType: 'Stock',
        collection: 'stocks',
        primaryKey: 'ticker',
        titleKey: 'displayName',
        suggestedIds: ['002077.SZ', '300323.SZ', '300183.SZ', '002441.SZ'],
        readoutProperties: ['ticker', 'board'],
      },
    ],
    expands: [
      {
        id: 'positions',
        label: 'Position（positionForStock）',
        edgeLabel: 'position',
        linkType: 'positionForStock',
        fromObjectType: 'Stock',
        toObjectType: 'Position',
        collection: 'positions',
        filterParam: 'ticker',
        filterValueFromParentKey: 'ticker',
        idProperty: 'positionId',
        titleProperty: 'ticker',
        readoutProperties: ['exitState', 'quantity'],
        auto: true,
      },
      {
        id: 'fills',
        label: 'Fill（fillForStock）',
        edgeLabel: 'fill',
        linkType: 'fillForStock',
        fromObjectType: 'Stock',
        toObjectType: 'Fill',
        collection: 'fills',
        filterParam: 'ticker',
        filterValueFromParentKey: 'ticker',
        idProperty: 'fillId',
        titleProperty: 'side',
        readoutProperties: ['side', 'sessionDate'],
        auto: true,
      },
      {
        id: 'bars',
        label: 'DailyBar（barForStock）',
        edgeLabel: 'bar',
        linkType: 'barForStock',
        fromObjectType: 'Stock',
        toObjectType: 'DailyBar',
        collection: 'daily-bars',
        filterParam: 'ticker',
        filterValueFromParentKey: 'ticker',
        idProperty: 'barId',
        titleProperty: 'sessionDate',
        readoutProperties: ['close', 'comparisonScore'],
        auto: false,
        limit: 8,
      },
    ],
  },
];

export function getVertexProfile(id: string | null | undefined): VertexProfile {
  return vertexProfiles.find((item) => item.id === id) ?? vertexProfiles[0];
}

export function readoutOf(row: Record<string, unknown>, keys: string[] | undefined): string {
  if (!keys?.length) return '';
  return keys
    .map((key) => {
      const value = row[key];
      if (value == null || value === '') return null;
      return `${key}:${value}`;
    })
    .filter(Boolean)
    .slice(0, 2)
    .join(' · ');
}
