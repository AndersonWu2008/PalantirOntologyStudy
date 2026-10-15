/**
 * UI Store
 * UI 状态管理，包含侧边栏折叠状态等
 */

import { create } from 'zustand';

interface UIState {
  // Sidebar state
  siderCollapsed: boolean;
  setSiderCollapsed: (collapsed: boolean) => void;
  toggleSider: () => void;

  // Theme
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;

  // Loading state
  globalLoading: boolean;
  setGlobalLoading: (loading: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  // Sidebar
  siderCollapsed: false,
  setSiderCollapsed: (collapsed) => set({ siderCollapsed: collapsed }),
  toggleSider: () => set((state) => ({ siderCollapsed: !state.siderCollapsed })),

  // Theme
  theme: 'light',
  setTheme: (theme) => set({ theme }),

  // Loading
  globalLoading: false,
  setGlobalLoading: (loading) => set({ globalLoading: loading }),
}));
