/**
 * Theme System — Indigo–Violet
 * Foundry 运营台密度；蓝紫渐变只作品牌焦点。
 * 见 docs/design/indigo-violet-tokens.md
 */

import { theme } from 'antd';

export type ThemeName = 'dark' | 'light';

export interface DesignTokens {
  colorPrimary: string;
  colorPrimaryHover: string;
  colorPrimaryActive: string;
  colorPrimaryLight: string;
  colorSecondary: string;

  colorSuccess: string;
  colorWarning: string;
  colorError: string;
  colorInfo: string;

  /** 动作色 · 按钮/胶囊（蓝绿黄橙红棕） */
  actionBlue: string;
  actionBlueHover: string;
  actionGreen: string;
  actionGreenHover: string;
  actionYellow: string;
  actionYellowHover: string;
  actionOrange: string;
  actionOrangeHover: string;
  actionRed: string;
  actionRedHover: string;
  actionBrown: string;
  actionBrownHover: string;
  /** 黄/浅棕等浅底上的深字 */
  actionInk: string;

  colorBg: string;
  colorBgElevated: string;
  colorBgContainer: string;
  colorBgLayout: string;
  colorBgMask: string;

  colorText: string;
  colorTextSecondary: string;
  colorTextTertiary: string;
  colorTextQuaternary: string;
  colorTextInverse: string;

  colorBorder: string;
  colorBorderSecondary: string;
  colorBorderTertiary: string;
  colorBorderStrong: string;
  colorBorderLight: string;

  colorFill: string;
  colorFillSecondary: string;
  colorFillTertiary: string;

  shadowSm: string;
  shadowMd: string;
  shadowLg: string;
  shadowXl: string;

  radiusSm: string;
  radiusMd: string;
  radiusLg: string;
  radiusXl: string;
  radiusFull: string;

  spacingXs: string;
  spacingSm: string;
  spacingMd: string;
  spacingLg: string;
  spacingXl: string;
  spacing2xl: string;

  fontFamily: string;
  fontFamilyMono: string;
  fontSizeSm: string;
  fontSizeBase: string;
  fontSizeLg: string;
  fontSizeXl: string;

  sidebarBg: string;
  sidebarText: string;
  sidebarTextActive: string;
  sidebarHover: string;
  sidebarActive: string;

  headerBg: string;
  headerBorder: string;

  /** 渐变停靠色（兼容旧变量名） */
  gradientStart: string;
  gradientMid: string;
  gradientEnd: string;
  /** 完整 CSS linear-gradient，用于 CTA / logo / 左边线 */
  gradientBrand: string;

  transitionFast: string;
  transitionNormal: string;
  transitionSlow: string;

  /** 运营台密度 */
  controlHeight: string;
  tableRowHeight: string;
  capsuleHeight: string;
  headerHeight: string;
  /** 主题切换背景过渡 */
  motionTheme: string;
}

const sharedFont = {
  fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  fontFamilyMono: "'JetBrains Mono', 'SF Mono', Monaco, 'Cascadia Code', monospace",
  fontSizeSm: '14px',
  fontSizeBase: '14px',
  fontSizeLg: '16px',
  fontSizeXl: '20px',
  radiusSm: '6px',
  radiusMd: '8px',
  radiusLg: '10px',
  radiusXl: '14px',
  radiusFull: '9999px',
  spacingXs: '4px',
  spacingSm: '8px',
  spacingMd: '16px',
  spacingLg: '24px',
  spacingXl: '32px',
  spacing2xl: '48px',
  transitionFast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
  transitionNormal: '250ms cubic-bezier(0.4, 0, 0.2, 1)',
  transitionSlow: '400ms cubic-bezier(0.4, 0, 0.2, 1)',
  controlHeight: '32px',
  tableRowHeight: '40px',
  capsuleHeight: '24px',
  headerHeight: '48px',
  motionTheme: '180ms ease',
};

/** 暗色 · indigo-not-black（忌白雾灰底，面用靛蓝实色） */
export const darkTheme: DesignTokens = {
  colorPrimary: '#A5B4FC',
  colorPrimaryHover: '#C7D2FE',
  colorPrimaryActive: '#818CF8',
  // 软高亮用靛蓝，勿用大面积白半透明
  colorPrimaryLight: 'rgba(99, 102, 241, 0.18)',
  colorSecondary: '#D8B4FE',

  colorSuccess: '#34D399',
  colorWarning: '#FBBF24',
  colorError: '#FB7185',
  colorInfo: '#60A5FA',

  actionBlue: '#3B8CF0',
  actionBlueHover: '#60A5FA',
  actionGreen: '#22C55E',
  actionGreenHover: '#4ADE80',
  actionYellow: '#EAB308',
  actionYellowHover: '#FACC15',
  actionOrange: '#F97316',
  actionOrangeHover: '#FB923C',
  actionRed: '#F43F5E',
  actionRedHover: '#FB7185',
  actionBrown: '#C4A484',
  actionBrownHover: '#D6B896',
  actionInk: '#1C1917',

  // Reflect 系：更深、更纯的 indigo，少灰
  colorBg: '#060317',
  colorBgElevated: '#12102A',
  colorBgContainer: '#0C0A1F',
  colorBgLayout: '#060317',
  colorBgMask: 'rgba(4, 2, 16, 0.78)',

  colorText: '#F8F7FF',
  colorTextSecondary: '#C9C3E4',
  colorTextTertiary: '#9189B0',
  colorTextQuaternary: '#5E5780',
  colorTextInverse: '#0E0C1C',

  // 边框用靛色相，避免白边发灰
  colorBorder: 'rgba(165, 180, 252, 0.16)',
  colorBorderSecondary: 'rgba(165, 180, 252, 0.1)',
  colorBorderTertiary: 'rgba(99, 102, 241, 0.08)',
  colorBorderStrong: 'rgba(165, 180, 252, 0.28)',
  colorBorderLight: 'rgba(165, 180, 252, 0.1)',

  // hover/fill：靛蓝轻罩，禁止白雾
  colorFill: 'rgba(99, 102, 241, 0.12)',
  colorFillSecondary: 'rgba(99, 102, 241, 0.08)',
  colorFillTertiary: 'rgba(99, 102, 241, 0.05)',

  shadowSm: '0 1px 2px rgba(0, 0, 0, 0.5)',
  shadowMd: '0 12px 32px rgba(0, 0, 0, 0.55)',
  shadowLg: '0 16px 40px rgba(0, 0, 0, 0.6)',
  shadowXl: '0 24px 48px rgba(0, 0, 0, 0.65)',

  ...sharedFont,

  sidebarBg: '#04020F',
  sidebarText: '#A8A0C8',
  sidebarTextActive: '#FFFFFF',
  sidebarHover: 'rgba(99, 102, 241, 0.14)',
  sidebarActive: 'rgba(99, 102, 241, 0.22)',

  headerBg: 'rgba(6, 3, 23, 0.92)',
  headerBorder: 'rgba(165, 180, 252, 0.12)',

  gradientStart: '#6366F1',
  gradientMid: '#8B5CF6',
  gradientEnd: '#C084FC',
  gradientBrand: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 50%, #C084FC 100%)',
};

/** 亮色 · 纸白底 + 更深字 + 更硬边 */
export const lightTheme: DesignTokens = {
  colorPrimary: '#4338CA',
  colorPrimaryHover: '#3730A3',
  colorPrimaryActive: '#312E81',
  colorPrimaryLight: 'rgba(67, 56, 202, 0.14)',
  colorSecondary: '#6D28D9',

  colorSuccess: '#0F9F6E',
  colorWarning: '#E96A12',
  colorError: '#E11D48',
  colorInfo: '#2B6DE8',

  actionBlue: '#2B6DE8',
  actionBlueHover: '#1E54C8',
  actionGreen: '#0F9F6E',
  actionGreenHover: '#0B7F58',
  actionYellow: '#E4B008',
  actionYellowHover: '#C49706',
  actionOrange: '#E96A12',
  actionOrangeHover: '#C4550E',
  actionRed: '#E11D48',
  actionRedHover: '#BE123C',
  actionBrown: '#8B5E3C',
  actionBrownHover: '#6F4A2F',
  actionInk: '#1C1917',

  colorBg: '#F1EFF8',
  colorBgElevated: '#FFFFFF',
  colorBgContainer: '#E8E4F4',
  colorBgLayout: '#F1EFF8',
  colorBgMask: 'rgba(14, 12, 28, 0.5)',

  colorText: '#0E0C1C',
  colorTextSecondary: '#4A4466',
  colorTextTertiary: '#6F6890',
  colorTextQuaternary: '#A39DBF',
  colorTextInverse: '#F8F7FF',

  colorBorder: '#C8C2E0',
  colorBorderSecondary: '#DAD5EC',
  colorBorderTertiary: '#E8E4F4',
  colorBorderStrong: '#9B94B8',
  colorBorderLight: '#DAD5EC',

  colorFill: 'rgba(14, 12, 28, 0.06)',
  colorFillSecondary: 'rgba(14, 12, 28, 0.04)',
  colorFillTertiary: 'rgba(14, 12, 28, 0.03)',

  shadowSm: '0 1px 2px rgba(14, 12, 28, 0.08)',
  shadowMd: '0 8px 24px rgba(14, 12, 28, 0.12)',
  shadowLg: '0 12px 32px rgba(14, 12, 28, 0.14)',
  shadowXl: '0 20px 40px rgba(14, 12, 28, 0.16)',

  ...sharedFont,

  sidebarBg: '#0E0C1C',
  sidebarText: '#B8B2D4',
  sidebarTextActive: '#FFFFFF',
  sidebarHover: 'rgba(255, 255, 255, 0.08)',
  sidebarActive: 'rgba(99, 102, 241, 0.32)',

  headerBg: 'rgba(241, 239, 248, 0.92)',
  headerBorder: '#C8C2E0',

  gradientStart: '#3730A3',
  gradientMid: '#4F46E5',
  gradientEnd: '#7C3AED',
  gradientBrand: 'linear-gradient(135deg, #3730A3 0%, #4F46E5 42%, #7C3AED 100%)',
};

export const themes: Record<ThemeName, DesignTokens> = {
  dark: darkTheme,
  light: lightTheme,
};

export const themeLabels: Record<ThemeName, string> = {
  dark: 'Dark',
  light: 'Light',
};

export const themeLabelsZh: Record<ThemeName, string> = {
  dark: '暗色',
  light: '亮色',
};

export const themeIcons: Record<ThemeName, string> = {
  dark: '☾',
  light: '☀',
};

function isDarkTokens(tokens: DesignTokens): boolean {
  return tokens.colorBg === darkTheme.colorBg || tokens.colorText === darkTheme.colorText;
}

export function applyThemeToCSS(tokens: DesignTokens): void {
  const root = document.documentElement;

  Object.entries(tokens).forEach(([key, value]) => {
    const cssVar = key.replace(/([A-Z])/g, '-$1').toLowerCase();
    root.style.setProperty(`--${cssVar}`, value);
  });

  root.style.setProperty('--bg-primary', tokens.colorBg);
  root.style.setProperty('--bg-secondary', tokens.colorBgLayout);
  root.style.setProperty('--bg-tertiary', tokens.colorBgContainer);
  root.style.setProperty('--bg-subtle', tokens.colorBgContainer);
  root.style.setProperty('--bg-card', tokens.colorBgElevated);
  root.style.setProperty('--bg-elevated', tokens.colorBgElevated);
  root.style.setProperty('--bg-canvas', tokens.colorBg);
  root.style.setProperty('--bg-hover', tokens.colorFill);
  root.style.setProperty('--bg-active', tokens.colorPrimaryLight);
  root.style.setProperty('--color-fill', tokens.colorFill);
  root.style.setProperty('--color-fill-secondary', tokens.colorFillSecondary);
  root.style.setProperty('--color-fill-tertiary', tokens.colorFillTertiary);

  root.style.setProperty('--text-primary', tokens.colorText);
  root.style.setProperty('--text-secondary', tokens.colorTextSecondary);
  root.style.setProperty('--text-muted', tokens.colorTextTertiary);
  root.style.setProperty('--color-text-primary', tokens.colorText);

  root.style.setProperty('--border-color', tokens.colorBorder);
  root.style.setProperty('--border-primary', tokens.colorBorder);
  root.style.setProperty('--border-default', tokens.colorBorder);
  root.style.setProperty('--border-hover', tokens.colorBorderSecondary);
  root.style.setProperty('--border-active', tokens.colorPrimary);

  root.style.setProperty('--accent-primary', tokens.colorPrimary);
  root.style.setProperty('--accent-secondary', tokens.colorSecondary);
  root.style.setProperty('--accent-success', tokens.colorSuccess);
  root.style.setProperty('--accent-warning', tokens.colorWarning);
  root.style.setProperty('--accent-danger', tokens.colorError);

  const dark = isDarkTokens(tokens);

  root.style.setProperty('--brand', tokens.colorPrimary);
  root.style.setProperty('--brand-muted', tokens.colorPrimaryLight);
  root.style.setProperty('--brand-2', tokens.colorSecondary);
  root.style.setProperty('--gradient-brand', tokens.gradientBrand);
  root.style.setProperty('--brand-gradient', tokens.gradientBrand);
  root.style.setProperty(
    '--brand-glow',
    dark ? 'rgba(165, 180, 252, 0.4)' : 'rgba(67, 56, 202, 0.32)',
  );
  root.style.setProperty(
    '--gradient-brand-soft',
    dark
      ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.14), rgba(139, 92, 246, 0.08))'
      : 'linear-gradient(135deg, rgba(67, 56, 202, 0.14), rgba(124, 58, 237, 0.1))',
  );

  // 胶囊 · 默认 / 品牌软高亮 / 渐变强调（暗色不用白雾底）
  root.style.setProperty(
    '--capsule-bg',
    dark ? 'rgba(99, 102, 241, 0.1)' : 'rgba(14, 12, 28, 0.05)',
  );
  root.style.setProperty('--capsule-border', tokens.colorBorder);
  root.style.setProperty('--capsule-text', tokens.colorTextSecondary);
  root.style.setProperty('--capsule-brand-bg', tokens.colorPrimaryLight);
  root.style.setProperty(
    '--capsule-brand-border',
    dark ? 'rgba(165, 180, 252, 0.45)' : 'rgba(67, 56, 202, 0.35)',
  );
  root.style.setProperty('--capsule-brand-text', tokens.colorPrimary);
  root.style.setProperty('--capsule-emphasis-bg', tokens.gradientBrand);
  root.style.setProperty('--capsule-emphasis-text', '#F8F7FF');
  root.style.setProperty(
    '--capsule-emphasis-shadow',
    dark
      ? '0 0 0 1px rgba(255,255,255,0.12) inset, 0 4px 14px rgba(99, 102, 241, 0.35)'
      : '0 0 0 1px rgba(255,255,255,0.2) inset, 0 4px 12px rgba(67, 56, 202, 0.28)',
  );
  root.style.setProperty('--capsule-success-bg', dark ? 'rgba(34, 197, 94, 0.18)' : 'rgba(15, 159, 110, 0.12)');
  root.style.setProperty('--capsule-success-text', tokens.colorSuccess);
  root.style.setProperty('--capsule-warning-bg', dark ? 'rgba(249, 115, 22, 0.18)' : 'rgba(233, 106, 18, 0.12)');
  root.style.setProperty('--capsule-warning-text', tokens.colorWarning);
  root.style.setProperty('--capsule-danger-bg', dark ? 'rgba(244, 63, 94, 0.18)' : 'rgba(225, 29, 72, 0.1)');
  root.style.setProperty('--capsule-danger-text', tokens.colorError);

  // 动作色 · 按钮填充（宝石色，与蓝紫品牌并立）
  const writeAction = (
    name: string,
    fill: string,
    hover: string,
    onFill: string,
    muted: string,
    gradientTop: string,
    shadowRgb: string,
  ) => {
    root.style.setProperty(`--action-${name}`, fill);
    root.style.setProperty(`--action-${name}-hover`, hover);
    root.style.setProperty(`--action-${name}-text`, onFill);
    root.style.setProperty(`--action-${name}-muted`, muted);
    root.style.setProperty(
      `--action-${name}-gradient`,
      `linear-gradient(180deg, ${gradientTop} 0%, ${fill} 100%)`,
    );
    root.style.setProperty(
      `--action-${name}-shadow`,
      dark
        ? `0 0 0 1px rgba(255,255,255,0.1) inset, 0 4px 12px rgba(${shadowRgb}, 0.4)`
        : `0 0 0 1px rgba(255,255,255,0.22) inset, 0 3px 10px rgba(${shadowRgb}, 0.3)`,
    );
  };

  if (dark) {
    writeAction('blue', tokens.actionBlue, tokens.actionBlueHover, '#FFFFFF', 'rgba(59,140,240,0.2)', '#5AA0F5', '59, 140, 240');
    writeAction('green', tokens.actionGreen, tokens.actionGreenHover, '#FFFFFF', 'rgba(34,197,94,0.2)', '#4ADE80', '34, 197, 94');
    writeAction('yellow', tokens.actionYellow, tokens.actionYellowHover, tokens.actionInk, 'rgba(234,179,8,0.2)', '#FACC15', '234, 179, 8');
    writeAction('orange', tokens.actionOrange, tokens.actionOrangeHover, '#FFFFFF', 'rgba(249,115,22,0.2)', '#FB923C', '249, 115, 22');
    writeAction('red', tokens.actionRed, tokens.actionRedHover, '#FFFFFF', 'rgba(244,63,94,0.2)', '#FB7185', '244, 63, 94');
    writeAction('brown', tokens.actionBrown, tokens.actionBrownHover, tokens.actionInk, 'rgba(196,164,132,0.2)', '#D6B896', '196, 164, 132');
  } else {
    writeAction('blue', tokens.actionBlue, tokens.actionBlueHover, '#FFFFFF', 'rgba(43,109,232,0.12)', '#4B86F0', '43, 109, 232');
    writeAction('green', tokens.actionGreen, tokens.actionGreenHover, '#FFFFFF', 'rgba(15,159,110,0.12)', '#1BB37E', '15, 159, 110');
    writeAction('yellow', tokens.actionYellow, tokens.actionYellowHover, tokens.actionInk, 'rgba(228,176,8,0.16)', '#F0C42A', '228, 176, 8');
    writeAction('orange', tokens.actionOrange, tokens.actionOrangeHover, '#FFFFFF', 'rgba(233,106,18,0.12)', '#F0842E', '233, 106, 18');
    writeAction('red', tokens.actionRed, tokens.actionRedHover, '#FFFFFF', 'rgba(225,29,72,0.1)', '#F0436A', '225, 29, 72');
    writeAction('brown', tokens.actionBrown, tokens.actionBrownHover, '#FFFFFF', 'rgba(139,94,60,0.12)', '#A0724E', '139, 94, 60');
  }

  root.style.setProperty('--color-success', tokens.colorSuccess);
  root.style.setProperty('--color-warning', tokens.colorWarning);
  root.style.setProperty('--color-error', tokens.colorError);
  root.style.setProperty('--color-info', tokens.colorInfo);
  root.style.setProperty('--color-success-light', dark ? 'rgba(34,197,94,0.18)' : 'rgba(15,159,110,0.12)');
  root.style.setProperty('--color-warning-light', dark ? 'rgba(249,115,22,0.18)' : 'rgba(233,106,18,0.12)');
  root.style.setProperty('--color-error-light', dark ? 'rgba(244,63,94,0.18)' : 'rgba(225,29,72,0.1)');
  root.style.setProperty('--color-info-light', dark ? 'rgba(59,140,240,0.2)' : 'rgba(43,109,232,0.12)');
  root.style.setProperty('--color-primary', tokens.colorPrimary);
  root.style.setProperty('--color-primary-hover', tokens.colorPrimaryHover);
  root.style.setProperty('--color-primary-active', tokens.colorPrimaryActive);
  root.style.setProperty('--color-primary-light', tokens.colorPrimaryLight);
  root.style.setProperty('--color-secondary', tokens.colorSecondary);
  root.style.setProperty('--color-bg', tokens.colorBg);
  root.style.setProperty('--color-bg-elevated', tokens.colorBgElevated);
  root.style.setProperty('--color-bg-container', tokens.colorBgContainer);
  root.style.setProperty('--color-bg-layout', tokens.colorBgLayout);
  root.style.setProperty('--color-text', tokens.colorText);
  root.style.setProperty('--color-text-secondary', tokens.colorTextSecondary);
  root.style.setProperty('--color-border', tokens.colorBorder);
  root.style.setProperty('--color-fill-tertiary', tokens.colorFillTertiary);
  root.style.setProperty('--sidebar-bg', tokens.sidebarBg);
  root.style.setProperty('--sidebar-text', tokens.sidebarText);
  root.style.setProperty('--sidebar-text-active', tokens.sidebarTextActive);
  root.style.setProperty('--sidebar-hover', tokens.sidebarHover);
  root.style.setProperty('--sidebar-active', tokens.sidebarActive);
  root.style.setProperty('--header-bg', tokens.headerBg);
  root.style.setProperty('--header-border', tokens.headerBorder);

  root.style.setProperty('--control-height', tokens.controlHeight);
  root.style.setProperty('--table-row-height', tokens.tableRowHeight);
  root.style.setProperty('--capsule-height', tokens.capsuleHeight);
  root.style.setProperty('--header-height', tokens.headerHeight);
  root.style.setProperty('--motion-theme', tokens.motionTheme);

  root.setAttribute('data-theme', dark ? 'dark' : 'light');
  root.style.setProperty('color-scheme', dark ? 'dark' : 'light');
}

export function getAntdTheme(tokens: DesignTokens) {
  const dark = isDarkTokens(tokens);

  return {
    token: {
      colorPrimary: tokens.colorPrimary,
      colorSuccess: tokens.colorSuccess,
      colorWarning: tokens.colorWarning,
      colorError: tokens.colorError,
      colorInfo: tokens.colorInfo,
      colorBgBase: tokens.colorBg,
      colorTextBase: tokens.colorText,
      colorBgContainer: tokens.colorBgElevated,
      colorBgElevated: tokens.colorBgElevated,
      colorBgLayout: tokens.colorBgLayout,
      colorBorder: tokens.colorBorder,
      colorBorderSecondary: tokens.colorBorderSecondary,
      colorText: tokens.colorText,
      colorTextSecondary: tokens.colorTextSecondary,
      colorTextTertiary: tokens.colorTextTertiary,
      colorTextQuaternary: tokens.colorTextQuaternary,
      borderRadius: parseInt(tokens.radiusMd, 10),
      fontFamily: tokens.fontFamily,
      fontSize: parseInt(tokens.fontSizeBase, 10),
      controlHeight: 32,
      lineWidth: 1,
      lineType: 'solid' as const,
      algorithm: dark ? theme.darkAlgorithm : theme.defaultAlgorithm,
    },
    components: {
      Button: {
        borderRadius: parseInt(tokens.radiusMd, 10),
        controlHeight: 32,
        primaryShadow: dark
          ? '0 4px 14px rgba(99, 102, 241, 0.35)'
          : '0 3px 10px rgba(67, 56, 202, 0.28)',
        dangerShadow: dark
          ? '0 4px 12px rgba(244, 63, 94, 0.35)'
          : '0 3px 10px rgba(225, 29, 72, 0.28)',
        defaultBorderColor: tokens.colorBorder,
        defaultColor: tokens.colorText,
        colorPrimary: tokens.colorPrimary,
        colorError: tokens.actionRed,
        colorErrorHover: tokens.actionRedHover,
        colorErrorActive: tokens.actionRedHover,
      },
      Card: {
        borderRadius: parseInt(tokens.radiusLg, 10),
        colorBgContainer: tokens.colorBgElevated,
        colorBorder: tokens.colorBorder,
      },
      Table: {
        borderRadius: parseInt(tokens.radiusLg, 10),
        headerBg: tokens.colorBgContainer,
        headerColor: tokens.colorTextSecondary,
        colorBgContainer: tokens.colorBgElevated,
        colorText: tokens.colorText,
        headerBorderRadius: parseInt(tokens.radiusMd, 10),
      },
      Input: {
        borderRadius: parseInt(tokens.radiusMd, 10),
        controlHeight: 32,
        colorBg: tokens.colorBgElevated,
        colorBorder: tokens.colorBorder,
        colorText: tokens.colorText,
        activeShadow: `0 0 0 2px ${tokens.colorPrimary}20`,
      },
      Select: {
        borderRadius: parseInt(tokens.radiusMd, 10),
        controlHeight: 32,
        colorBg: tokens.colorBgElevated,
        colorBorder: tokens.colorBorder,
        optionSelectedBg: tokens.colorPrimaryLight,
      },
      Menu: {
        borderRadius: parseInt(tokens.radiusMd, 10),
        itemBg: tokens.sidebarBg,
        itemColor: tokens.sidebarText,
        itemSelectedBg: tokens.colorPrimaryLight,
        itemSelectedColor: tokens.sidebarTextActive,
        itemHoverBg: tokens.sidebarHover,
        itemHoverColor: tokens.colorText,
      },
      Layout: {
        headerBg: tokens.headerBg,
        headerColor: tokens.colorText,
        siderBg: tokens.sidebarBg,
        triggerBg: tokens.sidebarBg,
        triggerColor: tokens.sidebarText,
        bodyBg: tokens.colorBg,
      },
      Modal: {
        colorBg: tokens.colorBgElevated,
        colorText: tokens.colorText,
        headerBg: tokens.colorBgElevated,
        contentBg: tokens.colorBgElevated,
        footerBg: tokens.colorBgElevated,
      },
      Dropdown: {
        colorBg: tokens.colorBgElevated,
        colorText: tokens.colorText,
        controlItemBgHover: tokens.sidebarHover,
        controlItemBgActive: tokens.colorPrimaryLight,
      },
      Tooltip: {
        colorBg: tokens.colorPrimary,
        colorText: tokens.colorTextInverse,
      },
      Tabs: {
        itemColor: tokens.colorTextSecondary,
        itemSelectedColor: tokens.colorPrimary,
        itemHoverColor: tokens.colorText,
        inkBarColor: tokens.colorPrimary,
      },
    },
  };
}

export function detectSystemTheme(): ThemeName {
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
}

export function toggleTheme(currentTheme: ThemeName): ThemeName {
  return currentTheme === 'dark' ? 'light' : 'dark';
}

export default themes;
