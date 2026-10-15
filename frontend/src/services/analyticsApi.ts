/**
 * Analytics API Service
 * 分析模块 API 服务 - 使用新的 httpClient
 */

import { http } from './httpClient';
import type { Dashboard, Metric, Widget, Calculation } from '@/types';
import type { PaginatedResponse } from './api';

const BASE_URL = '/analytics';

export const analyticsApi = {
  /** 获取仪表板列表 */
  getDashboards: (params?: { page?: number; size?: number }) =>
    http.get<PaginatedResponse<Dashboard>>(`${BASE_URL}/dashboards`, { params }),

  /** 获取单个仪表板 */
  getDashboard: (id: string) =>
    http.get<Dashboard>(`${BASE_URL}/dashboards/${id}`),

  /** 创建仪表板 */
  createDashboard: (data: Partial<Dashboard>) =>
    http.post<Dashboard>(`${BASE_URL}/dashboards`, data),

  /** 更新仪表板 */
  updateDashboard: (id: string, data: Partial<Dashboard>) =>
    http.put<Dashboard>(`${BASE_URL}/dashboards/${id}`, data),

  /** 删除仪表板 */
  deleteDashboard: (id: string) =>
    http.delete<void>(`${BASE_URL}/dashboards/${id}`),

  /** 获取指标列表 */
  getMetrics: (params?: { page?: number; size?: number; category?: string }) =>
    http.get<PaginatedResponse<Metric>>(`${BASE_URL}/metrics`, { params }),

  /** 获取单个指标 */
  getMetric: (id: string) =>
    http.get<Metric>(`${BASE_URL}/metrics/${id}`),

  /** 获取组件列表 */
  getWidgets: (params?: { page?: number; size?: number; dashboardId?: string }) =>
    http.get<PaginatedResponse<Widget>>(`${BASE_URL}/widgets`, { params }),

  /** 获取计算规则列表 */
  getCalculations: (params?: { page?: number; size?: number; status?: string }) =>
    http.get<PaginatedResponse<Calculation>>(`${BASE_URL}/calculations`, { params }),

  /** 获取单个计算规则 */
  getCalculation: (id: string) =>
    http.get<Calculation>(`${BASE_URL}/calculations/${id}`),

  /** 创建计算规则 */
  createCalculation: (data: Partial<Calculation>) =>
    http.post<Calculation>(`${BASE_URL}/calculations`, data),

  /** 更新计算规则 */
  updateCalculation: (id: string, data: Partial<Calculation>) =>
    http.put<Calculation>(`${BASE_URL}/calculations/${id}`, data),

  /** 删除计算规则 */
  deleteCalculation: (id: string) =>
    http.delete<void>(`${BASE_URL}/calculations/${id}`),
};

export default analyticsApi;
