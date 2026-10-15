/**
 * Settings Types
 * 设置模块类型定义
 */

/** 审计日志 */
export interface AuditLog {
  id: string;
  action: string;
  user: string;
  resource: string;
  resourceType: string;
  ipAddress: string;
  status: 'success' | 'failed' | 'warning';
  details: string;
  timestamp: string;
}

/** 角色 */
export interface Role {
  id: string;
  name: string;
  description: string;
  userCount: number;
  permissions: string[];
}

/** 用户 */
export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  lastLogin: string;
}

/** 工作区设置 */
export interface WorkspaceSettings {
  workspaceName: string;
  description: string;
  timezone: string;
  language: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
}
