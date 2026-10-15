/**
 * API Service
 * 基础 API 配置和服务
 * 包含请求拦截、错误处理、类型定义
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { useAuthStore } from '@/stores/authStore';

// ==================== 错误类型定义 ====================

/** API 错误码枚举 */
export enum ApiErrorCode {
  // 客户端错误
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  CONFLICT = 409,
  UNPROCESSABLE_ENTITY = 422,

  // 服务端错误
  INTERNAL_SERVER_ERROR = 500,
  BAD_GATEWAY = 502,
  SERVICE_UNAVAILABLE = 503,
}

/** API 错误接口 */
export interface ApiError {
  code: ApiErrorCode;
  message: string;
  details?: any;
  status: number;
}

/** 请求配置扩展 */
export interface ApiRequestConfig extends AxiosRequestConfig {
  /** 是否忽略错误处理 */
  ignoreError?: boolean;
  /** 自定义错误消息 */
  customErrorMessage?: string;
}

// ==================== 创建 axios 实例 ====================

const apiClient: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ==================== 请求拦截器 ====================

// 请求拦截器 - 添加认证 token
apiClient.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// ==================== 响应拦截器 - 错误处理 ====================

/**
 * 解析 Axios 错误为统一的 API 错误格式
 */
const parseAxiosError = (error: AxiosError): ApiError => {
  const status = error.response?.status || 500;
  const data = error.response?.data as any;

  let message = error.message;
  let details: any = undefined;

  // 尝试从响应中提取错误信息
  if (data) {
    if (typeof data === 'string') {
      message = data;
    } else if (data.detail) {
      message = data.detail;
    } else if (data.message) {
      message = data.message;
    } else if (Array.isArray(data)) {
      message = data.map((e: any) => e.msg || JSON.stringify(e)).join(', ');
    }
    details = data;
  }

  // 根据状态码设置默认消息
  switch (status) {
    case ApiErrorCode.UNAUTHORIZED:
      message = message || '登录已过期，请重新登录';
      break;
    case ApiErrorCode.FORBIDDEN:
      message = message || '没有权限访问此资源';
      break;
    case ApiErrorCode.NOT_FOUND:
      message = message || '请求的资源不存在';
      break;
    case ApiErrorCode.CONFLICT:
      message = message || '资源冲突';
      break;
    case ApiErrorCode.INTERNAL_SERVER_ERROR:
      message = message || '服务器内部错误';
      break;
    case ApiErrorCode.SERVICE_UNAVAILABLE:
      message = message || '服务暂时不可用';
      break;
    default:
      if (!message) {
        message = '请求失败';
      }
  }

  return {
    code: status as ApiErrorCode,
    message,
    details,
    status,
  };
};

/**
 * 全局错误处理函数
 */
const handleApiError = (error: unknown): never => {
  if (axios.isAxiosError(error)) {
    const apiError = parseAxiosError(error);

    // 401 错误时清除认证状态
    if (apiError.status === ApiErrorCode.UNAUTHORIZED) {
      useAuthStore.getState().logout();
    }

    throw apiError;
  }

  // 非 Axios 错误
  throw {
    code: ApiErrorCode.INTERNAL_SERVER_ERROR,
    message: error instanceof Error ? error.message : '未知错误',
    status: 500,
  };
};

apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error) => {
    return Promise.reject(handleApiError(error));
  }
);

// ==================== 通用请求方法 ====================

export const api = {
  /**
   * GET 请求
   */
  get: <T = any>(url: string, config?: ApiRequestConfig): Promise<T> =>
    apiClient.get(url, config).then((res) => res.data),

  /**
   * POST 请求
   */
  post: <T = any>(url: string, data?: any, config?: ApiRequestConfig): Promise<T> =>
    apiClient.post(url, data, config).then((res) => res.data),

  /**
   * PUT 请求
   */
  put: <T = any>(url: string, data?: any, config?: ApiRequestConfig): Promise<T> =>
    apiClient.put(url, data, config).then((res) => res.data),

  /**
   * DELETE 请求
   */
  delete: <T = any>(url: string, config?: ApiRequestConfig): Promise<T> =>
    apiClient.delete(url, config).then((res) => res.data),

  /**
   * PATCH 请求
   */
  patch: <T = any>(url: string, data?: any, config?: ApiRequestConfig): Promise<T> =>
    apiClient.patch(url, data, config).then((res) => res.data),
};

// ==================== 通用类型定义 ====================

/** 分页参数类型 */
export interface PaginationParams {
  page: number;
  page_size: number;
  sort?: string;
  search?: string;
}

/** 分页响应类型 */
export interface PaginatedResponse<T> {
  content: T[];
  total: number;
  page: number;
  size: number;
  totalPages: number;
}

/** 排序参数 */
export interface SortParams {
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/** 筛选参数 */
export interface FilterParams {
  [key: string]: any;
}

/** 基础实体接口 */
export interface BaseEntity {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  version?: number;
  is_locked?: boolean;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  updated_by?: string;
  workspace_id?: string;
}

/** 状态枚举 */
export type EntityStatus = 'active' | 'draft' | 'deprecated';

/** API 响应包装类型 */
export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

/** 批量操作请求 */
export interface BatchOperationRequest {
  ids: string[];
  action: 'delete' | 'update' | 'activate' | 'deactivate';
  data?: any;
}

/** 批量操作响应 */
export interface BatchOperationResponse {
  success: number;
  failed: number;
  errors: Array<{ id: string; message: string }>;
}

// ==================== 导出 ====================

export { apiClient };
export default api;
