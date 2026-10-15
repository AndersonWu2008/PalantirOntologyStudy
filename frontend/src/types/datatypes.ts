/**
 * DataTypes Types
 * 数据类型模块类型定义
 */

/** 对象类型 */
export interface ObjectType {
  id: string;
  name: string;
  displayName: string;
  description: string;
  category: string;
  status: string;
}

/** 链接类型 */
export interface LinkType {
  id: string;
  name: string;
  sourceType: string;
  targetType: string;
  cardinality: string;
}

/** 分类 */
export interface Category {
  id: string;
  name: string;
  description: string;
  entityCount: number;
}

/** 枚举类型 */
export interface EnumType {
  id: string;
  name: string;
  values: string[];
  description: string;
}

/** 值类型 */
export interface ValueType {
  id: string;
  name: string;
  baseType: string;
  description: string;
  validation: string;
}
