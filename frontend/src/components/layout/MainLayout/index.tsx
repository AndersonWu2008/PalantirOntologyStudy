/**
 * MainLayout Component
 * 主布局组件，包含 Header、Sidebar 和 Content 区域
 */

import React from 'react';
import { Header } from '../Header';
import { Sidebar } from '../Sidebar';
import { GlobalComponents } from '@/components/GlobalComponents';
import { useUIStore } from '@/stores/uiStore';
import './MainLayout.less';

export interface MainLayoutProps {
  children: React.ReactNode;
}

/**
 * MainLayout - 主布局组件
 *
 * @param children - 页面内容
 *
 * 结构:
 * ┌─────────────────────────────────────────┐
 * │              Header (56px)              │
 * ├──────────┬────────────────────────────┤
 * │          │                            │
 * │ Sidebar  │       Content              │
 * │ (240px)  │       (flex)              │
 * │          │                            │
 * └──────────┴────────────────────────────┘
 */
export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const siderCollapsed = useUIStore((state) => state.siderCollapsed);

  return (
    <GlobalComponents>
      <div className={`app-layout ${siderCollapsed ? 'is-collapsed' : ''}`}>
        <Sidebar />
        <Header />
        <main className="app-layout__content">{children}</main>
      </div>
    </GlobalComponents>
  );
};

export default MainLayout;
