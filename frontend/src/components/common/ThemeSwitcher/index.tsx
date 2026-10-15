/**
 * Theme Switcher Component
 * 主题切换组件 - 简化版（仅支持深色和浅色）
 */

import React from 'react';
import { Button, Tooltip, Switch } from 'antd';
import {
  MoonOutlined,
  SunOutlined,
} from '@ant-design/icons';
import { themeLabels, themeLabelsZh } from '@/styles/themes';
import { useThemeStore } from '@/stores/themeStore';

interface ThemeSwitcherProps {
  /** 显示模式：button | switch */
  mode?: 'button' | 'switch';
  /** 按钮大小 */
  size?: 'small' | 'middle' | 'large';
  /** 自定义类名 */
  className?: string;
  /** 是否显示中文标签 */
  showChinese?: boolean;
}

/**
 * 主题切换组件
 */
export const ThemeSwitcher: React.FC<ThemeSwitcherProps> = ({
  mode = 'button',
  size = 'middle',
  className,
  showChinese = true,
}) => {
  const { currentTheme, toggleTheme } = useThemeStore();

  /**
   * 获取当前主题标签
   */
  const getCurrentLabel = () => {
    return showChinese ? themeLabelsZh[currentTheme] : themeLabels[currentTheme];
  };

  /**
   * Button 模式 - 循环切换
   */
  if (mode === 'button') {
    return (
      <Tooltip title={`${showChinese ? '切换主题' : 'Toggle Theme'} (当前: ${getCurrentLabel()})`}>
        <Button
          type="text"
          icon={currentTheme === 'dark' ? <SunOutlined /> : <MoonOutlined />}
          size={size}
          className={className}
          onClick={toggleTheme}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            color: 'var(--color-text)',
          }}
        >
          <span className="theme-label">{getCurrentLabel()}</span>
        </Button>
      </Tooltip>
    );
  }

  /**
   * Switch 模式 - 仅切换 dark/light
   */
  if (mode === 'switch') {
    const isDark = currentTheme === 'dark';

    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
        className={className}
      >
        <SunOutlined
          style={{
            color: isDark ? 'var(--color-text-tertiary)' : '#f59e0b',
            fontSize: 16,
          }}
        />
        <Switch
          checked={isDark}
          onChange={() => toggleTheme()}
          size={size === 'small' ? 'small' : 'default'}
          checkedChildren={<MoonOutlined />}
          unCheckedChildren={<SunOutlined />}
        />
        <MoonOutlined
          style={{
            color: isDark ? '#6366f1' : 'var(--color-text-tertiary)',
            fontSize: 16,
          }}
        />
      </div>
    );
  }

  return null;
};

export default ThemeSwitcher;
