/**
 * Theme Store
 * 主题状态管理 - 简化版（仅支持深色和浅色）
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  ThemeName,
  DesignTokens,
  themes,
  applyThemeToCSS,
  getAntdTheme,
  detectSystemTheme,
  toggleTheme,
} from '@/styles/themes';

export interface ThemeState {
  // 当前主题名称
  currentTheme: ThemeName;

  // 是否跟随系统
  followSystem: boolean;

  // 获取当前主题配置
  getTheme: () => DesignTokens;

  // 设置主题
  setTheme: (theme: ThemeName) => void;

  // 切换主题（深色/浅色）
  toggleTheme: () => void;

  // 设置是否跟随系统
  setFollowSystem: (follow: boolean) => void;

  // 应用主题到 DOM
  applyTheme: () => void;

  // 获取 Ant Design 主题配置
  getAntdTheme: () => ReturnType<typeof getAntdTheme>;

  // 获取当前主题名称（考虑跟随系统的情况）
  getEffectiveTheme: () => ThemeName;
}

/**
 * 创建主题 Store
 */
export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      // 初始状态 - 默认使用深色主题
      currentTheme: 'light',
      followSystem: false,

      /**
       * 获取当前生效的主题名称
       */
      getEffectiveTheme: () => {
        const { currentTheme, followSystem } = get();
        if (followSystem) {
          return detectSystemTheme();
        }
        return currentTheme;
      },

      /**
       * 获取当前主题配置
       */
      getTheme: () => {
        const effectiveTheme = get().getEffectiveTheme();
        return themes[effectiveTheme];
      },

      /**
       * 设置主题
       */
      setTheme: (theme: ThemeName) => {
        set({ currentTheme: theme, followSystem: false });
        // 延迟应用，确保状态更新
        setTimeout(() => get().applyTheme(), 0);
      },

      /**
       * 切换主题（深色/浅色）
       */
      toggleTheme: () => {
        const { currentTheme, followSystem } = get();
        // 如果当前是跟随系统模式，先获取实际主题
        const effectiveTheme = followSystem ? detectSystemTheme() : currentTheme;
        const nextTheme = toggleTheme(effectiveTheme);
        get().setTheme(nextTheme);
      },

      /**
       * 设置是否跟随系统主题
       */
      setFollowSystem: (follow: boolean) => {
        set({ followSystem: follow });
        setTimeout(() => get().applyTheme(), 0);
      },

      /**
       * 应用主题到 DOM
       */
      applyTheme: () => {
        const tokens = get().getTheme();
        applyThemeToCSS(tokens);

        // 设置 body class 用于特定主题的样式覆盖
        const effectiveTheme = get().getEffectiveTheme();
        document.body.className = document.body.className
          .replace(/theme-\w+/g, '')
          .trim();
        document.body.classList.add(`theme-${effectiveTheme}`);
      },

      /**
       * 获取 Ant Design 主题配置
       */
      getAntdTheme: () => {
        const tokens = get().getTheme();
        return getAntdTheme(tokens);
      },
    }),
    {
      name: 'ontology-theme-storage-v9',
      partialize: (state) => ({
        currentTheme: state.currentTheme,
        followSystem: state.followSystem,
      }),
    }
  )
);

/**
 * 初始化主题
 * 在应用启动时调用
 */
export function initTheme(): void {
  const store = useThemeStore.getState();

  // 应用保存的主题
  store.applyTheme();

  // 监听系统主题变化
  if (window.matchMedia) {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', () => {
      if (store.followSystem) {
        store.applyTheme();
      }
    });
  }
}

/**
 * 获取当前主题的 CSS 变量（用于 styled-components 或 CSS-in-JS）
 */
export function getThemeCSSVariables(): Record<string, string> {
  const store = useThemeStore.getState();
  const tokens = store.getTheme();
  const variables: Record<string, string> = {};

  Object.entries(tokens).forEach(([key, value]) => {
    const cssVar = key.replace(/([A-Z])/g, '-$1').toLowerCase();
    variables[`--${cssVar}`] = value;
  });

  return variables;
}

export default useThemeStore;
