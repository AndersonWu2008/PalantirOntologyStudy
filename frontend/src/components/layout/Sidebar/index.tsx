/**
 * Platform sidebar.
 * Dark application rail: one row per app, theme toggle + account pinned at the bottom.
 */

import React from 'react';
import { Dropdown } from 'antd';
import type { MenuProps } from 'antd';
import { useLocation, useNavigate } from 'react-router-dom';
import { MenuFoldOutlined, MenuUnfoldOutlined, MoonOutlined, SunOutlined } from '@ant-design/icons';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';
import { useThemeStore } from '@/stores/themeStore';
import { sidebarNavConfig, type NavItem } from './SidebarNavConfig';
import './Sidebar.less';

function destination(item: NavItem): string {
  return item.children?.[0]?.path ?? item.path;
}

function isCurrent(item: NavItem, pathname: string): boolean {
  if (pathname === item.path || pathname.startsWith(`${item.path}/`)) return true;
  return item.children?.some((child) => pathname === child.path || pathname.startsWith(`${child.path}/`)) ?? false;
}

export const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { siderCollapsed, toggleSider } = useUIStore();
  const { user, logout } = useAuthStore();
  const getEffectiveTheme = useThemeStore((s) => s.getEffectiveTheme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  const effectiveTheme = getEffectiveTheme();
  const isDark = effectiveTheme === 'dark';

  const accountMenu: MenuProps['items'] = [
    { key: 'settings', label: 'Settings', onClick: () => navigate('/settings') },
    { key: 'preferences', label: 'Preferences', onClick: () => navigate('/preferences') },
    { type: 'divider' },
    {
      key: 'logout',
      label: 'Sign out',
      onClick: () => {
        logout();
        navigate('/login');
      },
    },
  ];

  return (
    <aside className={`rail ${siderCollapsed ? 'is-collapsed' : ''}`}>
      <div className="rail__top">
        <button type="button" className="rail__mark" onClick={() => navigate('/ontology')} aria-label="Object Explorer">
          <span />
        </button>
        <button
          type="button"
          className="rail__collapse"
          onClick={() => toggleSider()}
          title={siderCollapsed ? '展开' : '收起'}
        >
          {siderCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
        </button>
      </div>

      <div className="rail__section">Applications</div>
      <nav className="rail__nav">
        {sidebarNavConfig.map((item) => {
          const active = isCurrent(item, location.pathname);
          return (
            <button
              key={item.id}
              type="button"
              className={`rail__item ${active ? 'is-active' : ''}`}
              title={item.label}
              onClick={() => navigate(destination(item))}
            >
              <span className="rail__icon">{item.icon}</span>
              <span className="rail__label">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="rail__footer">
        <button
          type="button"
          className="rail__theme"
          onClick={() => toggleTheme()}
          title={isDark ? '切换到亮色' : '切换到暗色'}
          aria-pressed={isDark}
          aria-label={isDark ? '当前暗色，点击切换亮色' : '当前亮色，点击切换暗色'}
        >
          <span className="rail__icon">{isDark ? <SunOutlined /> : <MoonOutlined />}</span>
          <span className="rail__label">{isDark ? '亮色' : '暗色'}</span>
        </button>

        <Dropdown menu={{ items: accountMenu }} placement="topRight" trigger={['click']}>
          <button type="button" className="rail__account" title="Account">
            <span className="rail__avatar">{user?.name?.charAt(0) || user?.email?.charAt(0) || 'A'}</span>
            <span className="rail__label">{user?.name || 'Account'}</span>
          </button>
        </Dropdown>
      </div>
    </aside>
  );
};

export default Sidebar;
