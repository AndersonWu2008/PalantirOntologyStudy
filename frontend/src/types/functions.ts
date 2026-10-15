/**
 * Functions Types
 * 函数模块类型定义
 */

/** 函数 */
export interface Function {
  id: string;
  name: string;
  functionType: string;
  description: string;
  status: string;
}

/** 派生属性 */
export interface DerivedProperty {
  id: string;
  name: string;
  entityType: string;
  expression: string;
  status: string;
}
