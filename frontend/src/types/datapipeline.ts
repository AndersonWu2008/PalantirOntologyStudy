/**
 * DataPipeline Types
 * 数据管道模块类型定义
 */

/** 数据集 */
export interface Dataset {
  id: string;
  name: string;
  type: string;
  recordCount: number;
  lastUpdated: string;
}

/** 用户选择 */
export interface UserSelection {
  id: string;
  name: string;
  entityType: string;
  recordCount: number;
  createdAt: string;
}
