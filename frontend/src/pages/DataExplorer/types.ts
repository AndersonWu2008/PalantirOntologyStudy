/**
 * Data Explorer 类型定义
 * 定义数据浏览器中使用的所有类型
 */

/** 数据类型枚举 */
export type DataType =
  | 'object_type'
  | 'link_type'
  | 'property'
  | 'interface';

/** 视图模式 */
export type ViewMode = 'table' | 'grid' | 'graph' | 'json' | 'kanban' | 'gallery';

/** 导航项 */
export interface NavigatorItem {
  id: string;
  name: string;
  display_name: string;
  type: DataType;
  icon: string;
  count?: number;
  hasChildren: boolean;
  isExpanded: boolean;
  isSelected: boolean;
  status: 'active' | 'draft' | 'deprecated';
  lastModified: string;
  children?: NavigatorItem[];
  metadata: {
    rid?: string;
    apiName?: string;
    description?: string;
  };
}

/** 表格列配置 */
export interface TableColumn {
  key: string;
  title: string;
  dataType: 'string' | 'number' | 'boolean' | 'date' | 'enum' | 'object' | 'array';
  width?: number;
  sortable: boolean;
  filterable: boolean;
  visible: boolean;
  formatter?: (value: any) => string;
}

/** 视图配置 */
export interface ViewConfig {
  dataType: DataType;
  defaultView: ViewMode;
  availableViews: ViewMode[];
  tabs: TabConfig[];
  columns: TableColumn[];
  actions: ActionConfig[];
}

/** Tab 配置 */
export interface TabConfig {
  id: string;
  label: string;
  component: string;
}

/** 操作配置 */
export interface ActionConfig {
  id: string;
  label: string;
  icon: string;
  handler: () => void;
}

/** 关系显示配置 */
export interface RelationDisplayConfig {
  showInbound: boolean;
  showOutbound: boolean;
  maxDepth: number;
}

/** 图谱节点 */
export interface GraphNode {
  id: string;
  type: string;
  label: string;
  properties: Record<string, any>;
  x?: number;
  y?: number;
}

/** 图谱边 */
export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  label: string;
}

/** 图谱数据 */
export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

/** 筛选条件 */
export interface FilterCondition {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'contains' | 'startsWith' | 'endsWith';
  value: any;
}

/** 排序配置 */
export interface SortConfig {
  field: string;
  order: 'asc' | 'desc';
}

/** 分页配置 */
export interface PaginationConfig {
  page: number;
  pageSize: number;
  total: number;
}

/** 数据类型统计 */
export interface DataTypeStats {
  total: number;
  active: number;
  draft: number;
  deprecated: number;
}
