import logic from '@ontology/v44/logic.json';
import accountType from '@ontology/v44/object-types/Account.json';
import stockType from '@ontology/v44/object-types/Stock.json';
import industryType from '@ontology/v44/object-types/Industry.json';
import rangeType from '@ontology/v44/object-types/TradableRange.json';
import strategyType from '@ontology/v44/object-types/Strategy.json';
import dayType from '@ontology/v44/object-types/TradingDay.json';
import barType from '@ontology/v44/object-types/DailyBar.json';
import positionType from '@ontology/v44/object-types/Position.json';
import fillType from '@ontology/v44/object-types/Fill.json';
import signalType from '@ontology/v44/object-types/Signal.json';
import arrangementType from '@ontology/v44/object-types/PreOpenArrangement.json';
import sellLineType from '@ontology/v44/object-types/SellLine.json';
import buyLineType from '@ontology/v44/object-types/BuyLine.json';
import sellOrderType from '@ontology/v44/object-types/SellOrder.json';
import buyOrderType from '@ontology/v44/object-types/BuyOrder.json';
import evaluationRunType from '@ontology/v44/object-types/EvaluationRun.json';
import { explainProperty, propertySetReason } from '@/pages/Course/propertyExplain';
import type { NavigatorItem } from './types';
import { runtimeSchema, type RuntimeLink, type RuntimeObject } from './runtimeSchema';

type AuthoredProperty = {
  apiName?: string;
  displayName?: string;
  description?: string;
  valueType?: string;
  baseType?: { type?: string };
};

type AuthoredType = {
  apiName: string;
  displayName?: string;
  description?: string;
  properties?: Record<string, AuthoredProperty>;
};

const authoredTypes = [
  accountType,
  stockType,
  industryType,
  rangeType,
  strategyType,
  dayType,
  barType,
  positionType,
  fillType,
  signalType,
  arrangementType,
  sellLineType,
  buyLineType,
  sellOrderType,
  buyOrderType,
  evaluationRunType,
] as AuthoredType[];

const authoredByType = new Map(authoredTypes.map((type) => [type.apiName, type]));

function authoredProperty(typeName: string, apiName: string): AuthoredProperty | undefined {
  return authoredByType.get(typeName)?.properties?.[apiName];
}

const shortNames: Record<string, Record<string, string>> = {
  EvaluationPoint: {
    pointId: '评估点身份',
    runId: '评估',
    sessionDate: '交易日',
    equity: '权益',
    drawdown: '回撤',
    domain: '域',
  },
  EvaluationTrade: {
    tradeId: '评估成交身份',
    runId: '评估',
    ticker: '代码',
    side: '方向',
    entryDate: '进场日',
    exitDate: '出场日',
    entryPrice: '进场价',
    exitPrice: '出场价',
    pnl: '盈亏',
    exitReason: '退出原因',
    domain: '域',
  },
};

export function typeTitle(typeName: string): string {
  return authoredByType.get(typeName)?.displayName
    || (typeName === 'EvaluationPoint' ? '评估点' : '')
    || (typeName === 'EvaluationTrade' ? '评估成交' : '')
    || typeName;
}

export function propertyTitle(typeName: string, apiName: string): string {
  return authoredProperty(typeName, apiName)?.displayName
    || shortNames[typeName]?.[apiName]
    || apiName;
}

function propertySentence(typeName: string, apiName: string): string {
  return explainProperty(typeName, apiName) || authoredProperty(typeName, apiName)?.description || '';
}

export type PropertyRow = {
  apiName: string;
  displayName: string;
  column: string;
  dataType: string;
  valueType: string;
  required: boolean;
  description: string;
  writeChannel: string;
};

export type LinkRow = {
  apiName: string;
  displayName: string;
  cardinality: string;
  sourceType: string;
  targetType: string;
  sourceApiName: string;
  targetApiName: string;
  description: string;
};

export type CatalogObject = {
  kind: 'object';
  apiName: string;
  displayName: string;
  description: string;
  rid: string;
  status: string;
  primaryKey: string;
  titleKey: string;
  resource: string;
  properties: PropertyRow[];
  links: LinkRow[];
};

export type CatalogFunction = {
  kind: 'function';
  apiName: string;
  displayName: string;
  reads: string;
  writes: string;
  whyNotAction: string;
  code: string;
};

export type CatalogAction = {
  kind: 'action';
  apiName: string;
  displayName: string;
  who: string;
  parameters: string;
  condition: string;
  rule: string;
  functionBacked: boolean;
  code: string;
};

export type CatalogLink = {
  kind: 'link';
  apiName: string;
  displayName: string;
  description: string;
  cardinality: string;
  sourceType: string;
  targetType: string;
  sourceApiName: string;
  targetApiName: string;
  sourceSideName: string;
  targetSideName: string;
};

function propertyRows(type: RuntimeObject): PropertyRow[] {
  return type.properties.map((property) => {
    const authored = authoredProperty(type.apiName, property.apiName);
    return {
      apiName: property.apiName,
      displayName: propertyTitle(type.apiName, property.apiName),
      column: property.column,
      dataType: authored?.baseType?.type || property.column,
      valueType: authored?.valueType || '',
      required: property.required,
      description: propertySentence(type.apiName, property.apiName),
      writeChannel: property.writeChannel,
    };
  });
}

function linkRow(link: RuntimeLink): LinkRow {
  return {
    apiName: link.apiName,
    displayName: link.displayName,
    cardinality: link.cardinality,
    sourceType: link.sourceType,
    targetType: link.targetType,
    sourceApiName: link.sourceProperty,
    targetApiName: link.targetProperty,
    description: link.description,
  };
}

const functions = logic.functions;
const actionTypes = logic.actionTypes;

export function catalogDetail(id: string): CatalogObject | CatalogLink | CatalogFunction | CatalogAction | null {
  const schema = runtimeSchema();
  if (id.startsWith('object-type:')) {
    const apiName = id.slice('object-type:'.length);
    const type = schema?.objectTypes.find((item) => item.apiName === apiName);
    if (!type || !schema) return null;
    return {
      kind: 'object',
      apiName: type.apiName,
      displayName: authoredByType.get(type.apiName)?.displayName || type.displayName,
      description:
        propertySetReason[type.apiName]?.answers
        || authoredByType.get(type.apiName)?.description
        || '',
      rid: '',
      status: 'active',
      primaryKey: type.primaryKey,
      titleKey: type.titleKey,
      resource: type.resource,
      properties: propertyRows(type),
      links: schema.linkTypes
        .filter((link) => link.sourceType === apiName || link.targetType === apiName)
        .map(linkRow),
    };
  }
  if (id.startsWith('link-type:')) {
    const apiName = id.slice('link-type:'.length);
    const link = schema?.linkTypes.find((item) => item.apiName === apiName);
    if (!link) return null;
    return {
      kind: 'link',
      apiName: link.apiName,
      displayName: link.displayName,
      description: link.description,
      cardinality: link.cardinality,
      sourceType: link.sourceType,
      targetType: link.targetType,
      sourceApiName: link.sourceProperty,
      targetApiName: link.targetProperty,
      sourceSideName: link.sourceProperty,
      targetSideName: link.targetProperty,
    };
  }
  if (id.startsWith('function:')) {
    const apiName = id.slice('function:'.length);
    const item = functions.find((row) => row.apiName === apiName);
    return item ? { kind: 'function', ...item } : null;
  }
  if (id.startsWith('action-type:')) {
    const apiName = id.slice('action-type:'.length);
    const item = actionTypes.find((row) => row.apiName === apiName);
    return item ? { kind: 'action', ...item } : null;
  }
  return null;
}

const now = () => new Date().toISOString();

const leaf = (
  prefix: string,
  item: { apiName: string; displayName: string; description?: string },
  type: NavigatorItem['type'],
  icon: string,
): NavigatorItem => ({
  id: `${prefix}:${item.apiName}`,
  name: item.apiName,
  display_name: item.displayName,
  type,
  icon,
  hasChildren: false,
  isExpanded: false,
  isSelected: false,
  status: 'active',
  lastModified: now(),
  metadata: {
    apiName: item.apiName,
    description: item.description,
  },
});

export function listCatalogObjects(): CatalogObject[] {
  return (runtimeSchema()?.objectTypes ?? []).map(
    (type) => catalogDetail(`object-type:${type.apiName}`) as CatalogObject,
  );
}

export function listCatalogLinks(): CatalogLink[] {
  return (runtimeSchema()?.linkTypes ?? []).map(
    (link) => catalogDetail(`link-type:${link.apiName}`) as CatalogLink,
  );
}

export function listCatalogFunctions(): CatalogFunction[] {
  return functions.map((item) => ({ kind: 'function' as const, ...item }));
}

export function listCatalogActions(): CatalogAction[] {
  return actionTypes.map((item) => ({ kind: 'action' as const, ...item }));
}

export function relatedFunctions(apiName: string): CatalogFunction[] {
  const needle = apiName.toLowerCase();
  return listCatalogFunctions().filter((item) => {
    const blob = `${item.reads} ${item.writes} ${item.displayName} ${item.apiName}`.toLowerCase();
    if (apiName === 'DailyBar') {
      return /ma20|atr|比较|行情|涨停|行业|涨跌停|因子|feature|comparison|limitup|industry|bar/.test(blob);
    }
    if (apiName === 'PreOpenArrangement') {
      return /安排|页首|assemble|header|broker|continue|conflict/.test(blob);
    }
    if (apiName === 'Position') {
      return /持仓|exit|fill|rollholding|入场/.test(blob);
    }
    if (apiName === 'BuyLine' || apiName === 'SellLine') {
      return /买入行|卖出行|line|outcome|signal|planned/.test(blob);
    }
    if (apiName === 'TradingDay') {
      return /制度|广度|指数|regime|breadth|gate|entry/.test(blob);
    }
    return blob.includes(needle) || blob.includes(apiName.replace(/([A-Z])/g, ' $1').trim().toLowerCase());
  });
}

export function relatedActions(apiName: string): CatalogAction[] {
  const map: Record<string, string[]> = {
    PreOpenArrangement: ['ConfirmSells', 'ConfirmBuys', 'AcknowledgeNothingToSend', 'StopArrangement'],
    SellLine: ['ConfirmSells', 'PostponeSellLine'],
    BuyLine: ['ConfirmBuys', 'VetoBuyLine'],
    BuyOrder: ['ReportFill'],
    SellOrder: ['ReportFill'],
    Fill: ['ReportFill'],
    Position: ['ReportFill'],
    Strategy: ['PublishStrategyVersion', 'EnableStrategy'],
  };
  const names = new Set(map[apiName] ?? []);
  return listCatalogActions().filter((item) => names.has(item.apiName));
}

export function usageOf(apiName: string): string[] {
  const map: Record<string, string[]> = {
    PreOpenArrangement: ['Workshop · 开盘前安排', 'pipeline/close-pipeline.ts', 'pipeline/actions.ts'],
    DailyBar: ['pipeline/sync-pool.ts', 'pipeline/close-pipeline.ts', 'pipeline/backfill-factors.ts'],
    Position: ['Workshop · 回报成交', 'pipeline/actions.ts · ReportFill', 'judgeV44Exits'],
    BuyLine: ['Workshop · 开盘前安排', 'ConfirmBuys'],
    SellLine: ['Workshop · 开盘前安排', 'ConfirmSells'],
    Stock: ['Object Explorer', 'Object View'],
    TradingDay: ['detectRegime', 'judgeEntryGate'],
    Strategy: ['PublishStrategyVersion', 'EnableStrategy'],
  };
  return map[apiName] ?? ['Object Explorer'];
}

export function buildStockNavigatorItems(): NavigatorItem[] {
  const objects = listCatalogObjects();
  const links = listCatalogLinks();
  const properties = objects.flatMap((type) =>
    type.properties.map((property) =>
      leaf(
        'property',
        {
          apiName: `${type.apiName}.${property.apiName}`,
          displayName: `${type.displayName} · ${property.displayName}`,
          description: property.description || `${property.displayName}`,
        },
        'property',
        'tag',
      ),
    ),
  );

  return [
    {
      id: 'object_type_group',
      name: 'object_types',
      display_name: 'Object Types',
      type: 'object_type',
      icon: 'database',
      count: objects.length,
      hasChildren: true,
      isExpanded: true,
      isSelected: false,
      status: 'active',
      lastModified: now(),
      children: objects.map((type) => leaf('object-type', type, 'object_type', 'database')),
      metadata: { description: '主键、属性和写通道来自数据库正在执行的资源定义' },
    },
    {
      id: 'link_type_group',
      name: 'link_types',
      display_name: 'Link Types',
      type: 'link_type',
      icon: 'link',
      count: links.length,
      hasChildren: true,
      isExpanded: true,
      isSelected: false,
      status: 'active',
      lastModified: now(),
      children: links.map((type) => leaf('link-type', type, 'link_type', 'link')),
      metadata: {},
    },
    {
      id: 'function_group',
      name: 'functions',
      display_name: 'Functions',
      type: 'interface',
      icon: 'function',
      count: functions.length,
      hasChildren: true,
      isExpanded: true,
      isSelected: false,
      status: 'active',
      lastModified: now(),
      children: functions.map((item) => leaf('function', item, 'interface', 'function')),
      metadata: { description: '只读、只写 domain 为 StockTrading 的对象' },
    },
    {
      id: 'action_type_group',
      name: 'action_types',
      display_name: 'Action Types',
      type: 'interface',
      icon: 'thunderbolt',
      count: actionTypes.length,
      hasChildren: true,
      isExpanded: true,
      isSelected: false,
      status: 'active',
      lastModified: now(),
      children: actionTypes.map((item) => leaf('action-type', item, 'interface', 'thunderbolt')),
      metadata: { description: '一次允许的编辑。某一次提交是 Action，不是这里的一行' },
    },
    {
      id: 'property_group',
      name: 'properties',
      display_name: 'Properties',
      type: 'property',
      icon: 'tag',
      count: properties.length,
      hasChildren: true,
      isExpanded: false,
      isSelected: false,
      status: 'active',
      lastModified: now(),
      children: properties,
      metadata: {},
    },
    {
      id: 'interface_group',
      name: 'interfaces',
      display_name: 'Interfaces',
      type: 'interface',
      icon: 'api',
      count: 0,
      hasChildren: false,
      isExpanded: false,
      isSelected: false,
      status: 'active',
      lastModified: now(),
      children: [],
      metadata: {},
    },
  ];
}
