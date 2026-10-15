/**
 * Settings Layout
 * 设置页面布局 - 使用 TwoLevelNavPage 组件
 */

import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Menu } from 'antd';
import {
  SettingOutlined,
  UserOutlined,
  TeamOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import TwoLevelNavPage from '@/components/layout/TwoLevelNavPage';

export interface SettingsLayoutProps {
  children: React.ReactNode;
}

const SettingsLayout: React.FC<SettingsLayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();

  // Determine active key based on current path
  const getSelectedKey = () => {
    const path = location.pathname;
    if (path.includes('/workspace')) return '/settings/workspace';
    if (path.includes('/users')) return '/settings/users';
    if (path.includes('/roles')) return '/settings/roles';
    if (path.includes('/audit')) return '/settings/audit';
    return '/settings/workspace';
  };

  const menuItems: MenuProps['items'] = [
    {
      key: '/settings/workspace',
      icon: <SettingOutlined />,
      label: 'Workspace',
    },
    {
      key: '/settings/users',
      icon: <UserOutlined />,
      label: 'Users',
    },
    {
      key: '/settings/roles',
      icon: <TeamOutlined />,
      label: 'Roles',
    },
    {
      key: '/settings/audit',
      icon: <SafetyCertificateOutlined />,
      label: 'Audit Logs',
    },
  ];

  const handleMenuClick: MenuProps['onClick'] = ({ key }) => {
    navigate(key);
  };

  const sideNav = (
    <Menu
      mode="inline"
      selectedKeys={[getSelectedKey()]}
      items={menuItems}
      onClick={handleMenuClick}
      style={{ borderRight: 0 }}
    />
  );

  return (
    <TwoLevelNavPage
      title="Settings"
      description="Manage your workspace settings, users, and permissions"
      sideNav={sideNav}
    >
      {children}
    </TwoLevelNavPage>
  );
};

export default SettingsLayout;
