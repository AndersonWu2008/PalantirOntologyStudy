/**
 * GlobalComponents
 * 全局组件包装器 - 在应用根级别渲染全局组件
 *
 * 这些组件在整个应用中只需要渲染一次：
 * - NotificationCenter: 通知中心
 * - QuickToolbar: 快速工具栏
 * - GlobalShortcuts: 全局快捷键处理器
 */

import React from 'react';
import { useGlobalStore } from '@/stores/globalStore';
import './GlobalComponents.less';

/**
 * NotificationCenter - 通知中心组件
 * 显示系统通知和用户消息
 */
const NotificationCenter: React.FC = () => {
  const { notifications } = useGlobalStore();

  return (
    <div className="global-notification-center">
      {/* Placeholder for notification center - integrate with actual notification system */}
      {notifications.length > 0 && (
        <div className="notification-badge">
          {notifications.length}
        </div>
      )}
    </div>
  );
};

/**
 * QuickToolbar - 快速工具栏组件
 * 提供常用操作的快速访问
 */
const QuickToolbar: React.FC = () => {
  const { shortcutsEnabled } = useGlobalStore();

  if (!shortcutsEnabled) {
    return null;
  }

  return (
    <div className="global-quick-toolbar">
      {/* Placeholder for quick toolbar - integrate with actual toolbar */}
    </div>
  );
};

/**
 * GlobalShortcuts - 全局快捷键处理器
 * 注册和管理全局键盘快捷键
 */
const GlobalShortcuts: React.FC = () => {
  const { shortcutsEnabled } = useGlobalStore();

  React.useEffect(() => {
    if (!shortcutsEnabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Global shortcut handlers
      // Cmd/Ctrl + K: Quick search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        // Emit quick search event
        window.dispatchEvent(new CustomEvent('global:quick-search'));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcutsEnabled]);

  return null;
};

/**
 * GlobalComponentsProps
 */
export interface GlobalComponentsProps {
  children?: React.ReactNode;
}

/**
 * GlobalComponents - 全局组件包装器
 *
 * 在应用根级别渲染全局组件一次，
 * 这些组件会在所有页面中共享
 */
export const GlobalComponents: React.FC<GlobalComponentsProps> = ({ children }) => {
  return (
    <>
      {/* Notification center in header area */}
      <NotificationCenter />

      {/* Floating quick toolbar */}
      <QuickToolbar />

      {/* Global keyboard shortcuts */}
      <GlobalShortcuts />

      {/* Page content */}
      {children}
    </>
  );
};

export default GlobalComponents;
