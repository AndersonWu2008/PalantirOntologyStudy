/** Carbon workspaces — curated module lists; domains register workspaces here. */

export type CarbonApp =
  | 'Workshop'
  | 'Quiver'
  | 'Vertex'
  | 'ObjectView'
  | 'Explorer'
  | 'Health'
  | 'Lineage'
  | 'Connection'
  | 'Automate'
  | 'Notepad'
  | 'Approvals'
  | 'Contour';

export type CarbonModule = {
  id: string;
  label: string;
  app: CarbonApp;
  path: string;
  description: string;
  primary?: boolean;
};

export type CarbonWorkspace = {
  id: string;
  displayName: string;
  audience: string;
  domain?: string;
  homeLead: string;
  modules: CarbonModule[];
  context?: {
    kind: 'arrangement+positions';
    accountId: string;
  };
};

export const carbonWorkspaces: CarbonWorkspace[] = [
  {
    id: 'StockTrading.operatorDesk',
    displayName: 'Operator desk',
    audience: 'Operational user · trading day',
    domain: 'StockTrading',
    homeLead:
      'Curated modules for the trading-day loop: Workshop decisions, Vertex links, Quiver series, Data Health. Full platform remains in the side nav for builders.',
    context: { kind: 'arrangement+positions', accountId: 'acct-1' },
    modules: [
      {
        id: 'pre-open',
        label: 'Pre-open arrangement',
        app: 'Workshop',
        path: '/workshop/pre-open',
        description: 'Read arrangement lines; submit Confirm* / ReportFill.',
        primary: true,
      },
      {
        id: 'vertex-arrangement',
        label: 'Arrangement graph',
        app: 'Vertex',
        path: '/ontology/vertex?profile=StockTrading.arrangementExplore&type=PreOpenArrangement',
        description: 'Search Around from the current PreOpenArrangement.',
      },
      {
        id: 'quiver-sample',
        label: 'Stock time series',
        app: 'Quiver',
        path: '/ontology/quiver?profile=StockTrading.stockDaily&id=300183.SZ',
        description: 'OHLC + overlays + Fill markers for a subject Stock.',
      },
      {
        id: 'health',
        label: 'Trading readiness',
        app: 'Health',
        path: '/data/health',
        description: 'Run StockTrading Data Health pack.',
      },
      {
        id: 'automate',
        label: 'Header notifications',
        app: 'Automate',
        path: '/automate?id=StockTrading.headerNeedsOrders',
        description: 'Notify when page header changes — never auto-confirm.',
      },
      {
        id: 'notepad',
        label: 'Morning brief',
        app: 'Notepad',
        path: '/notepad?template=StockTrading.morningBrief',
        description: 'Read-only brief embedding the current arrangement.',
      },
      {
        id: 'explorer',
        label: 'Object Explorer',
        app: 'Explorer',
        path: '/ontology?focus=PreOpenArrangement',
        description: 'Filter object sets in the Ontology.',
      },
      {
        id: 'lineage',
        label: 'Data Lineage',
        app: 'Lineage',
        path: '/data/lineage',
        description: 'Pipeline upstream/downstream for an arrangement.',
      },
    ],
  },
  {
    id: 'StockTrading.builderDesk',
    displayName: 'Builder desk',
    audience: 'Builder · ontology & pipelines',
    domain: 'StockTrading',
    homeLead: 'Modules for defining types, checking data, and reading Function code. Not the trader loop.',
    modules: [
      {
        id: 'oma',
        label: 'Ontology Manager',
        app: 'Explorer',
        path: '/ontology/manager',
        description: 'Object / Link / Action / Function definitions.',
        primary: true,
      },
      {
        id: 'approvals',
        label: 'Ontology proposals',
        app: 'Approvals',
        path: '/approvals',
        description: 'Review type-change requests before invoke.',
      },
      {
        id: 'connection',
        label: 'Data Connection',
        app: 'Connection',
        path: '/data/connection',
        description: 'Source registration and sync probe.',
      },
      {
        id: 'pipelines',
        label: 'Pipeline Builder',
        app: 'Lineage',
        path: '/data/pipelines',
        description: 'Ordered transforms and Function calls.',
      },
      {
        id: 'repos',
        label: 'Code Repositories',
        app: 'Explorer',
        path: '/code/repositories',
        description: 'Function / Action symbol index.',
      },
      {
        id: 'health',
        label: 'Data Health',
        app: 'Health',
        path: '/data/health',
        description: 'Quality rules before handoff to operators.',
      },
      {
        id: 'contour',
        label: 'DailyBar Contour',
        app: 'Contour',
        path: '/data/contour?analysis=StockTrading.dailyBarBoard',
        description: 'Table analysis on DailyBar — contrast with Quiver.',
      },
    ],
  },
];

export function getCarbonWorkspace(id: string | null | undefined): CarbonWorkspace {
  return carbonWorkspaces.find((item) => item.id === id) ?? carbonWorkspaces[0];
}
