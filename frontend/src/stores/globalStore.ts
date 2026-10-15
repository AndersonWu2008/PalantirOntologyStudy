/**
 * Global Store
 * 全局偏好设置状态管理
 *
 * 管理：
 * - 主题 (light/dark/system)
 * - 通知偏好
 * - 全局快捷键启用/禁用
 * - 侧边栏折叠状态
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ThemeName } from '@/styles/themes';
import { useThemeStore } from './themeStore';

/**
 * 通知类型
 */
export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
}

/**
 * 全局状态接口
 */
export interface GlobalState {
  // Theme
  theme: ThemeName;
  followSystem: boolean;
  setTheme: (theme: ThemeName) => void;
  setFollowSystem: (follow: boolean) => void;
  toggleTheme: () => void;

  // Notifications
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  removeNotification: (id: string) => void;
  markAsRead: (id: string) => void;
  clearNotifications: () => void;

  // Global shortcuts
  shortcutsEnabled: boolean;
  setShortcutsEnabled: (enabled: boolean) => void;
  toggleShortcuts: () => void;

  // Sidebar
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
}

/**
 * 创建全局 Store
 */
export const useGlobalStore = create<GlobalState>()(
  persist(
    (set, get) => ({
      // Theme — 写入时同步 themeStore（单一真相在 themeStore）
      theme: 'light' as ThemeName,
      followSystem: false,

      setTheme: (theme: ThemeName) => {
        useThemeStore.getState().setTheme(theme);
        set({ theme, followSystem: false });
      },

      setFollowSystem: (follow: boolean) => {
        useThemeStore.getState().setFollowSystem(follow);
        set({ followSystem: follow });
      },

      toggleTheme: () => {
        useThemeStore.getState().toggleTheme();
        const next = useThemeStore.getState().currentTheme;
        set({ theme: next, followSystem: false });
      },

      // Notifications
      notifications: [],

      addNotification: (notification) => {
        const newNotification: Notification = {
          ...notification,
          id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: Date.now(),
          read: false,
        };
        set((state) => ({
          notifications: [newNotification, ...state.notifications].slice(0, 100),
        }));
      },

      removeNotification: (id: string) => {
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        }));
      },

      markAsRead: (id: string) => {
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n
          ),
        }));
      },

      clearNotifications: () => {
        set({ notifications: [] });
      },

      // Global shortcuts
      shortcutsEnabled: true,

      setShortcutsEnabled: (enabled: boolean) => {
        set({ shortcutsEnabled: enabled });
      },

      toggleShortcuts: () => {
        set((state) => ({ shortcutsEnabled: !state.shortcutsEnabled }));
      },

      // Sidebar
      sidebarCollapsed: false,

      setSidebarCollapsed: (collapsed: boolean) => {
        set({ sidebarCollapsed: collapsed });
      },

      toggleSidebar: () => {
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed }));
      },
    }),
    {
      name: 'ontology-global-storage-v1',
      partialize: (state) => ({
        shortcutsEnabled: state.shortcutsEnabled,
        sidebarCollapsed: state.sidebarCollapsed,
      }),
    }
  )
);

export default useGlobalStore;
