/**
 * Notifications API Service
 * 通知模块 API 服务 - 使用新的 httpClient
 */

import { http } from './httpClient';
import type { Notification, NotificationTemplate, Webhook } from '@/types';
import type { PaginatedResponse } from './api';

const BASE_URL = '/notifications';

export const notificationsApi = {
  /** 获取通知列表 */
  getNotifications: (params?: { page?: number; size?: number; status?: string }) =>
    http.get<PaginatedResponse<Notification>>(BASE_URL, { params }),

  /** 获取单个通知 */
  getNotification: (id: string) =>
    http.get<Notification>(`${BASE_URL}/${id}`),

  /** 标记通知为已读 */
  markAsRead: (id: string) =>
    http.patch<void>(`${BASE_URL}/${id}/read`),

  /** 标记所有通知为已读 */
  markAllAsRead: () =>
    http.patch<void>(`${BASE_URL}/read-all`),

  /** 获取通知模板列表 */
  getTemplates: (params?: { page?: number; size?: number; channel?: string }) =>
    http.get<PaginatedResponse<NotificationTemplate>>(`${BASE_URL}/templates`, { params }),

  /** 获取单个模板 */
  getTemplate: (id: string) =>
    http.get<NotificationTemplate>(`${BASE_URL}/templates/${id}`),

  /** 创建模板 */
  createTemplate: (data: Partial<NotificationTemplate>) =>
    http.post<NotificationTemplate>(`${BASE_URL}/templates`, data),

  /** 更新模板 */
  updateTemplate: (id: string, data: Partial<NotificationTemplate>) =>
    http.put<NotificationTemplate>(`${BASE_URL}/templates/${id}`, data),

  /** 删除模板 */
  deleteTemplate: (id: string) =>
    http.delete<void>(`${BASE_URL}/templates/${id}`),

  /** 获取 Webhook 列表 */
  getWebhooks: (params?: { page?: number; size?: number }) =>
    http.get<PaginatedResponse<Webhook>>(`${BASE_URL}/webhooks`, { params }),

  /** 获取单个 Webhook */
  getWebhook: (id: string) =>
    http.get<Webhook>(`${BASE_URL}/webhooks/${id}`),

  /** 创建 Webhook */
  createWebhook: (data: Partial<Webhook>) =>
    http.post<Webhook>(`${BASE_URL}/webhooks`, data),

  /** 更新 Webhook */
  updateWebhook: (id: string, data: Partial<Webhook>) =>
    http.put<Webhook>(`${BASE_URL}/webhooks/${id}`, data),

  /** 删除 Webhook */
  deleteWebhook: (id: string) =>
    http.delete<void>(`${BASE_URL}/webhooks/${id}`),

  /** 测试 Webhook */
  testWebhook: (id: string) =>
    http.post<void>(`${BASE_URL}/webhooks/${id}/test`),
};

export default notificationsApi;
