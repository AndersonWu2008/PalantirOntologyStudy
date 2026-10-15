/**
 * Actions Types
 * 动作模块类型定义
 */

/** 元动作 */
export interface MetaAction {
  id: string;
  name: string;
  actionType: string;
  targetType: string;
  status: string;
}

/** 对象动作 */
export interface ObjectAction {
  id: string;
  name: string;
  objectType: string;
  actionType: string;
  status: string;
}

/** 查询 */
export interface Query {
  id: string;
  name: string;
  queryType: string;
  entityType: string;
  lastRun: string;
}
