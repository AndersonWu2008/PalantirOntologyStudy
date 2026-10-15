/**
 * Settings API Service
 * 设置模块 API 服务 - 使用新的 httpClient
 */

import { http } from './httpClient';
import type { User, Role, AuditLog, WorkspaceSettings } from '@/types';
import type { PaginatedResponse } from './api';

const BASE_URL = '/settings';

export const settingsApi = {
  /** 获取工作区设置 */
  getWorkspaceSettings: () =>
    http.get<WorkspaceSettings>(`${BASE_URL}/workspace`),

  /** 更新工作区设置 */
  updateWorkspaceSettings: (data: Partial<WorkspaceSettings>) =>
    http.put<WorkspaceSettings>(`${BASE_URL}/workspace`, data),

  /** 获取用户列表 */
  getUsers: (params?: { page?: number; size?: number; search?: string }) =>
    http.get<PaginatedResponse<User>>(`${BASE_URL}/users`, { params }),

  /** 获取单个用户 */
  getUser: (id: string) =>
    http.get<User>(`${BASE_URL}/users/${id}`),

  /** 创建用户 */
  createUser: (data: Partial<User>) =>
    http.post<User>(`${BASE_URL}/users`, data),

  /** 更新用户 */
  updateUser: (id: string, data: Partial<User>) =>
    http.put<User>(`${BASE_URL}/users/${id}`, data),

  /** 删除用户 */
  deleteUser: (id: string) =>
    http.delete<void>(`${BASE_URL}/users/${id}`),

  /** 获取角色列表 */
  getRoles: (params?: { page?: number; size?: number }) =>
    http.get<PaginatedResponse<Role>>(`${BASE_URL}/roles`, { params }),

  /** 获取单个角色 */
  getRole: (id: string) =>
    http.get<Role>(`${BASE_URL}/roles/${id}`),

  /** 创建角色 */
  createRole: (data: Partial<Role>) =>
    http.post<Role>(`${BASE_URL}/roles`, data),

  /** 更新角色 */
  updateRole: (id: string, data: Partial<Role>) =>
    http.put<Role>(`${BASE_URL}/roles/${id}`, data),

  /** 删除角色 */
  deleteRole: (id: string) =>
    http.delete<void>(`${BASE_URL}/roles/${id}`),

  /** 获取审计日志 */
  getAuditLogs: (params?: { page?: number; size?: number; action?: string; user?: string }) =>
    http.get<PaginatedResponse<AuditLog>>(`${BASE_URL}/audit-logs`, { params }),
};

export default settingsApi;
