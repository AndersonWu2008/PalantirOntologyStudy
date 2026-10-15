/**
 * Integration Types
 * 集成模块类型定义
 */

/** 数据源 */
export interface DataSource {
  id: string;
  name: string;
  type: string;
  status: string;
  lastSync: string;
}

/** 同步配置 */
export interface SyncConfig {
  id: string;
  name: string;
  sourceName: string;
  targetName: string;
  frequency: string;
  status: string;
}

/** 数据流 */
export interface DataFlow {
  id: string;
  name: string;
  sourceType: string;
  targetType: string;
  status: string;
}
