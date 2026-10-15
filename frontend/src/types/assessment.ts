/**
 * Assessment Types
 * 评估模块类型定义
 */

/** 评估 */
export interface Assessment {
  id: string;
  name: string;
  type: string;
  status: string;
  createdAt: string;
}

/** 审查 */
export interface Review {
  id: string;
  title: string;
  reviewer: string;
  status: string;
  submittedAt: string;
}
