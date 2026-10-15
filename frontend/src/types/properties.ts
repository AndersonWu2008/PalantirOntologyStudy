/**
 * Properties Types
 * 属性模块类型定义
 */

/** 实体属性 */
export interface EntityProperty {
  id: string;
  name: string;
  entityType: string;
  valueType: string;
  required: boolean;
}

/** 共享属性 */
export interface SharedProperty {
  id: string;
  name: string;
  propertyType: string;
  description: string;
  usageCount: number;
}
