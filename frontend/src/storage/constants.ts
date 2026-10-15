/**
 * LocalStorage 常量定义
 * 定义所有存储键和枚举类型
 */

// 命名空间
export enum StorageNamespace {
  WORKFLOW = 'workflow',
  WIZARD = 'wizard',
  SCANNER = 'scanner',
  TEMP = 'temp',
}

// 模块
export enum StorageModule {
  META_ENTITY = 'metaEntity',
  CLASS_ENTITY = 'classEntity',
  META_RELATION = 'metaRelation',
  CLASS_RELATION = 'classRelation',
  START_NODE = 'startNode',
  PROCESS_NODE = 'processNode',
  SCANNER = 'scanner',
}

// 用途
export enum StoragePurpose {
  CONTEXT = 'context',
  STATE = 'state',
  DATA = 'data',
  PROGRESS = 'progress',
  HISTORY = 'history',
  CACHE = 'cache',
  DRAFT = 'draft',
}

// 存储键定义
export const STORAGE_KEYS = {
  // Workflow Context
  WORKFLOW_START_NODE_CONTEXT: 'workflow_startNode_context',
  WORKFLOW_PROCESS_NODE_CONTEXT: 'workflow_processNode_context',

  // Wizard State
  WIZARD_META_ENTITY_STATE: 'wizard_metaEntity_state',
  WIZARD_CLASS_ENTITY_STATE: 'wizard_classEntity_state',
  WIZARD_META_RELATION_STATE: 'wizard_metaRelation_state',
  WIZARD_CLASS_RELATION_STATE: 'wizard_classRelation_state',

  // Wizard Data
  WIZARD_META_ENTITY_DATA: 'wizard_metaEntity_data',
  WIZARD_CLASS_ENTITY_DATA: 'wizard_classEntity_data',
  WIZARD_META_RELATION_DATA: 'wizard_metaRelation_data',
  WIZARD_CLASS_RELATION_DATA: 'wizard_classRelation_data',

  // Wizard Draft
  WIZARD_META_ENTITY_DRAFT: 'wizard_metaEntity_draft',
  WIZARD_CLASS_ENTITY_DRAFT: 'wizard_classEntity_draft',

  // Scanner
  SCANNER_CANVAS_STATE: 'scanner_canvas_state',
  SCANNER_EXECUTION_STATE: 'scanner_execution_state',
  SCANNER_CURRENT_BLUEPRINT: 'scanner_current_blueprint_rid',

  // Temp
  TEMP_WIZARD_BACKUP: 'temp_wizard_backup',
} as const;

// Wizard 类型
export type WizardType =
  | 'metaEntity'
  | 'classEntity'
  | 'metaRelation'
  | 'classRelation';

// 创建模式
export type CreationMode =
  | 'standalone'
  | 'from_start_node'
  | 'from_process_node';

// 存储选项
export interface StorageOptions {
  ttl?: number; // 过期时间（毫秒）
}

// 存储包装器
export interface StorageWrapper<T> {
  version: string;
  timestamp: number;
  expiresAt?: number;
  data: T;
}

// 存储统计
export interface StorageStats {
  totalKeys: number;
  byNamespace: Record<string, number>;
  totalSize: number;
}
