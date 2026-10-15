/**
 * Audit Service API
 * 连接后端 Audit Service 服务 (8030)
 */

import { api } from './api';

export interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  level: string;
  details?: Record<string, any>;
  ip_address?: string;
  timestamp: string;
}

export interface AuditLogsResponse {
  content: AuditLog[];
  total: number;
  page: number;
  size: number;
}

export interface SecurityAlert {
  type: string;
  severity: string;
  message: string;
  details: Record<string, any>;
}

export interface ComplianceReport {
  workspace_id: string;
  period: { start: string; end: string };
  summary: {
    total_events: number;
    unique_users: number;
    unique_resources: number;
  };
  action_breakdown: Record<string, number>;
  user_activity: Record<string, number>;
  resource_activity: Record<string, number>;
  generated_at: string;
}

export interface AccessReview {
  workspace_id: string;
  review_period_days: number;
  total_users: number;
  inactive_users: string[];
  active_users: string[];
  generated_at: string;
}

export interface AuditStats {
  workspace_id: string;
  period_days: number;
  total_events: number;
  by_level: Record<string, number>;
  by_action: Record<string, number>;
}

export const auditApi = {
  // 记录审计事件
  logEvent: (data: {
    workspace_id: string;
    user_id: string;
    action: string;
    resource_type: string;
    resource_id?: string;
    level?: string;
    details?: Record<string, any>;
    ip_address?: string;
    user_agent?: string;
  }) =>
    api.post<AuditLog>('/audit/logs', data),

  // 批量记录
  logEventsBatch: (events: any[]) =>
    api.post<{ logged: number; total: number }>('/audit/logs/batch', { events }),

  // 查询日志
  queryLogs: (params: {
    workspace_id: string;
    user_id?: string;
    action?: string;
    resource_type?: string;
    start_time?: string;
    end_time?: string;
    level?: string;
    page?: number;
    size?: number;
  }) =>
    api.get<AuditLogsResponse>('/audit/logs', { params }),

  // 安全审计
  checkFailedLogins: (workspaceId: string, threshold?: number) =>
    api.get<{ workspace_id: string; failed_logins: any[]; alert: boolean }>(
      '/audit/security/failed-logins',
      { params: { workspace_id: workspaceId, threshold } }
    ),

  checkSuspiciousActivity: (workspaceId: string, userId: string) =>
    api.get<{ user_id: string; suspicious: boolean; risk_score: number; recent_actions: number }>(
      '/audit/security/suspicious-activity',
      { params: { workspace_id: workspaceId, user_id: userId } }
    ),

  getSecurityAlerts: (workspaceId: string) =>
    api.get<SecurityAlert[]>('/audit/security/alerts', { params: { workspace_id: workspaceId } }),

  // 合规报表
  getComplianceReport: (workspaceId: string, startDate: string, endDate: string) =>
    api.get<ComplianceReport>('/audit/compliance/report', {
      params: { workspace_id: workspaceId, start_date: startDate, end_date: endDate }
    }),

  // 访问审查
  getAccessReview: (workspaceId: string, days?: number) =>
    api.get<AccessReview>('/audit/access-review', { params: { workspace_id: workspaceId, days } }),

  // 数据导出审计
  logDataExport: (data: {
    workspace_id: string;
    user_id: string;
    resource_type: string;
    resource_ids: string[];
    export_format: string;
    row_count: number;
  }) =>
    api.post<AuditLog>('/audit/export-audit', data),

  // 保留策略
  getRetentionPolicy: (workspaceId: string) =>
    api.get<{ workspace_id: string; retention_days: number; archive_after_days: number; delete_after_days: number }>(
      '/audit/retention/policy',
      { params: { workspace_id: workspaceId } }
    ),

  // 归档旧日志
  archiveOldLogs: (workspaceId: string, beforeDate: string) =>
    api.post<{ workspace_id: string; archived_count: number; before_date: string }>(
      '/audit/retention/archive',
      { workspace_id: workspaceId, before_date: beforeDate }
    ),

  // 仪表盘统计
  getDashboardStats: (workspaceId: string, days?: number) =>
    api.get<AuditStats>('/audit/stats/dashboard', { params: { workspace_id: workspaceId, days } }),
};
