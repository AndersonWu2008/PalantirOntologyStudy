/**
 * Common Types
 * 通用类型定义
 */

// 重新导出所有模块类型
export * from './settings';
export * from './notifications';
export * from './code';
export * from './assessment';
export * from './documents';
export * from './integration';
export * from './analytics';
export * from './workflows';
export * from './datapipeline';
export * from './functions';
export * from './actions';
export * from './interfaces';
export * from './properties';
export * from './datatypes';

// 基础类型
export type ID = string;

export type Timestamp = string;

export type Status = 'active' | 'inactive' | 'pending' | 'deprecated';

// 分页
export interface Pagination {
  page: number;
  size: number;
  total: number;
}

export interface Paginated<T> {
  content: T[];
  pagination: Pagination;
}

// 筛选
export interface Filter {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'like' | 'in';
  value: any;
}

export interface Sort {
  field: string;
  order: 'asc' | 'desc';
}

// 查询参数
export interface QueryParams {
  page?: number;
  size?: number;
  search?: string;
  filters?: Filter[];
  sort?: Sort[];
}

// 响应
export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

// 实体基础
export interface EntityBase {
  id: ID;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy?: string;
  updatedBy?: string;
}

// 用户相关
export interface User extends EntityBase {
  email: string;
  name: string;
  avatar?: string;
  role: UserRole;
  status: Status;
  lastLoginAt?: Timestamp;
}

export type UserRole = 'admin' | 'editor' | 'viewer' | 'guest';

// 工作空间相关
export interface Workspace extends EntityBase {
  name: string;
  displayName: string;
  description?: string;
  timezone: string;
  locale: string;
}

// 本体相关
export interface ObjectType extends EntityBase {
  name: string;
  displayName: string;
  description?: string;
  category?: string;
  icon?: string;
  status: Status;
  properties: Property[];
  relations: Relation[];
}

export interface Property extends EntityBase {
  name: string;
  displayName: string;
  description?: string;
  valueType: ValueType;
  required: boolean;
  defaultValue?: any;
}

export type ValueType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'date'
  | 'timestamp'
  | 'array'
  | 'object'
  | 'enum'
  | 'reference';

export interface Relation extends EntityBase {
  name: string;
  displayName: string;
  sourceType: string;
  targetType: string;
  cardinality: 'ONE_TO_ONE' | 'ONE_TO_MANY' | 'MANY_TO_MANY';
  description?: string;
}

// 工作流相关
export interface Workflow extends EntityBase {
  name: string;
  displayName: string;
  description?: string;
  status: Status;
  triggerType: TriggerType;
  definition?: WorkflowDefinition;
  lastRunAt?: Timestamp;
  totalRuns: number;
}

export type TriggerType = 'manual' | 'schedule' | 'webhook' | 'event' | 'data_change';

export interface WorkflowDefinition {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

export interface WorkflowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: Record<string, any>;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  type?: string;
  data?: Record<string, any>;
}

export interface WorkflowExecution extends EntityBase {
  workflowId: string;
  status: ExecutionStatus;
  startedAt: Timestamp;
  completedAt?: Timestamp;
  duration?: number;
  inputs?: Record<string, any>;
  outputs?: Record<string, any>;
  error?: string;
}

export type ExecutionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

// 数据管道相关
export interface Pipeline extends EntityBase {
  name: string;
  displayName: string;
  description?: string;
  status: Status;
  targetType: string;
  steps: PipelineStep[];
  lastRunAt?: Timestamp;
  totalRuns: number;
}

export interface PipelineStep {
  id: string;
  name: string;
  type: string;
  config: Record<string, any>;
  order: number;
}

export interface PipelineExecution extends EntityBase {
  pipelineId: string;
  status: ExecutionStatus;
  startedAt: Timestamp;
  completedAt?: Timestamp;
  recordsProcessed?: number;
  errors?: number;
}

// 分析相关
export interface Dashboard extends EntityBase {
  name: string;
  displayName: string;
  description?: string;
  widgets: Widget[];
  layout: DashboardLayout;
}

export interface Widget {
  id: string;
  type: string;
  title: string;
  config: Record<string, any>;
  position: { x: number; y: number };
  size: { width: number; height: number };
}

export interface DashboardLayout {
  type: 'grid' | 'free';
  columns?: number;
}

export interface Metric extends EntityBase {
  name: string;
  displayName: string;
  description?: string;
  category: string;
  type: MetricType;
  value: number;
  unit?: string;
}

export type MetricType = 'counter' | 'gauge' | 'ratio' | 'sum' | 'average' | 'percentile';
