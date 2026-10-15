/**
 * Analytics Types
 * 分析模块类型定义
 */

/** 分析仪表板 */
export interface Dashboard {
  id: string;
  name: string;
  description: string;
  widgetCount: number;
  lastModified: string;
}

/** 指标 */
export interface Metric {
  id: string;
  name: string;
  value: number;
  change: number;
  unit: string;
  category: string;
}

/** 组件 */
export interface Widget {
  id: string;
  name: string;
  widgetType: string;
  dashboardName: string;
}

/** 计算规则 */
export interface Calculation {
  id: string;
  name: string;
  expression: string;
  inputFields: string[];
  outputField: string;
  description: string;
  status: 'active' | 'draft' | 'deprecated';
  createdAt: string;
  updatedAt: string;
}
