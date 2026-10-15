/**
 * useTheme Hook
 * 薄封装：唯一真相在 themeStore（Indigo–Violet）
 */

import { useThemeStore } from '@/stores/themeStore';
import { themes, type DesignTokens, type ThemeName } from '@/styles/themes';

/**
 * 主题 Hook（转发 themeStore，避免双写 localStorage）
 */
export function useTheme() {
  const currentTheme = useThemeStore((s) => s.currentTheme);
  const setTheme = useThemeStore((s) => s.setTheme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  const getAntdTheme = useThemeStore((s) => s.getAntdTheme);
  const getEffectiveTheme = useThemeStore((s) => s.getEffectiveTheme);

  const effective = getEffectiveTheme();
  const tokens: DesignTokens = themes[effective];

  return {
    currentTheme: currentTheme as ThemeName,
    tokens,
    setTheme,
    toggleTheme,
    antdTheme: getAntdTheme(),
  };
}

export default useTheme;
