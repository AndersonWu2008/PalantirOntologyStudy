/**
 * HTTP client for this app.
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

const getBaseUrl = () => {
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  if (import.meta.env.DEV) {
    return '/api/v1';
  }
  return 'http://localhost:8080/api/v1';
};

const getOntologyBaseUrl = () => {
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL + '/ontology';
  }
  if (import.meta.env.DEV) {
    return '/api/v1/ontology';
  }
  return 'http://localhost:8080/api/v1/ontology';
};

const API_GATEWAY = {
  host: '0.0.0.0',
  port: 8080,
  url: getBaseUrl(),
};

const ONTOLOGY_SERVICE = {
  url: getOntologyBaseUrl(),
};

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface CreateHttpClientOptions {
  baseURL?: string;
  timeout?: number;
  retries?: number;
}

declare module 'axios' {
  export interface AxiosRequestConfig {
    _retry?: boolean;
  }
}

function createHttpClient(options: CreateHttpClientOptions = {}): AxiosInstance {
  const {
    baseURL = `${API_GATEWAY.url}/ontology`,
    timeout = 30000,
    retries = 3,
  } = options;

  const client = axios.create({
    baseURL,
    timeout,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  client.interceptors.request.use(
    (config) => {
      // In dev mode, skip adding auth token to avoid 401 errors
      if (import.meta.env.DEV) {
        console.debug('[DEV MODE] Skipping auth token');
        return config;
      }
      const token = localStorage.getItem('auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  client.interceptors.response.use(
    (response: AxiosResponse) => response,
    async (error) => {
      const originalRequest = error.config;

      if (error.response?.status === 401) {
        // In dev mode, don't redirect to login - auth is bypassed
        if (import.meta.env.DEV) {
          console.warn('[DEV MODE] 401 received, skipping redirect to login');
          return Promise.reject(error);
        }
        localStorage.removeItem('auth_token');
        window.location.href = '/login';
        return Promise.reject(error);
      }

      if (retries > 0 && !originalRequest._retry) {
        originalRequest._retry = retries;
        return client(originalRequest);
      }

      return Promise.reject(error);
    }
  );

  return client;
}

export const http = createHttpClient();

export const defaultClient = createHttpClient({
  baseURL: '/api/v1',
});

export const ontologyClient = createHttpClient({
  baseURL: '/api/v1',
});

export { createHttpClient };
