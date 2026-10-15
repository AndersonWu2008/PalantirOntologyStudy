/**
 * Auth Store
 * 认证状态管理
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '@/services/api';

interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: 'admin' | 'editor' | 'viewer';
  permissions?: string[];
}

interface LoginResponse {
  token: string;
  user: User;
}

// Development mode admin user - full permissions
// WARNING: This is ONLY for local development. NEVER commit production credentials.
const DEV_ADMIN_USER: User = {
  id: 'dev-admin-001',
  email: 'admin@example.com',
  name: 'Dev Admin',
  role: 'admin',
  permissions: ['*'], // Full permissions
};

// Generate a random dev token per session (not a fixed value)
const generateDevToken = (): string => {
  // This is ONLY for development - Vite replaces import.meta.env.DEV at build time
  // In production builds, this code path is completely removed
  if (import.meta.env.DEV) {
    return `dev-token-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  }
  return '';
};

interface AuthState {
  // Auth state
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  setUser: (user: User) => void;
  setToken: (token: string) => void;
  fetchCurrentUser: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      isAuthenticated: false,
      user: null,
      token: null,
      isLoading: false,
      error: null,

      // Actions
      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });

        // Development mode: bypass API, auto-login as admin
        if (import.meta.env.DEV) {
          console.warn('[DEV MODE] Authentication bypass active - DO NOT USE IN PRODUCTION');
          await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay
          set({
            isAuthenticated: true,
            user: DEV_ADMIN_USER,
            token: generateDevToken(),
            isLoading: false,
            error: null,
          });
          return;
        }

        // Production: call real API
        try {
          const response = await api.post<LoginResponse>('/auth/login', {
            email,
            password,
          });

          set({
            isAuthenticated: true,
            user: response.user,
            token: response.token,
            isLoading: false,
            error: null,
          });
        } catch (error: any) {
          const errorMessage = error.response?.data?.message || '登录失败，请检查用户名和密码';
          set({
            isAuthenticated: false,
            user: null,
            token: null,
            isLoading: false,
            error: errorMessage,
          });
          throw error;
        }
      },

      logout: () => {
        set({
          isAuthenticated: false,
          user: null,
          token: null,
          error: null,
        });
      },

      setUser: (user: User) => {
        set({ user });
      },

      setToken: (token: string) => {
        set({ token });
      },

      fetchCurrentUser: async () => {
        const token = get().token;
        if (!token) {
          return;
        }

        // Development mode: skip API call, use cached user
        if (import.meta.env.DEV) {
          const user = get().user;
          if (user) {
            set({ isAuthenticated: true });
          }
          return;
        }

        set({ isLoading: true });
        try {
          const user = await api.get<User>('/auth/me');
          set({
            isAuthenticated: true,
            user,
            isLoading: false,
          });
        } catch (error) {
          // Token 可能过期，清除认证状态
          set({
            isAuthenticated: false,
            user: null,
            token: null,
            isLoading: false,
          });
        }
      },

      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        user: state.user,
        token: state.token,
      }),
    }
  )
);
