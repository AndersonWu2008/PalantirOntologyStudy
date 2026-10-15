/**
 * TwoLevelNavPage Component
 * 通用两级导航页面组件
 * 用于带有侧边导航的子页面
 */

import React, { useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Table, Input, Button } from 'antd';
import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import './TwoLevelNavPage.less';

/** 导航菜单项 */
export interface NavMenuItem {
  key: string;
  icon?: React.ReactNode;
  label: string;
  description?: string;
}

/** 高级 TwoLevelNavPageProps - 支持菜单和表格 */
export interface TwoLevelNavPageProps {
  /** 页面标题 */
  title: string;
  /** 页面描述 */
  description?: string;
  /** 侧边导航内容（自定义） */
  sideNav?: React.ReactNode;
  /** 菜单配置（用于自动生成侧边导航） */
  menuItems?: NavMenuItem[];
  /** 表格数据源 */
  dataSource?: any[];
  /** 表格列配置 */
  columns?: ColumnsType<any>;
  /** 数据过滤函数 */
  filterData?: (data: any[], activeKey: string) => any[];
  /** 默认选中的菜单 key */
  defaultActiveKey?: string;
  /** 搜索框占位符 */
  searchPlaceholder?: string;
  /** 创建按钮点击回调 */
  onCreate?: (activeKey: string) => void;
  /** 页面操作按钮（位于标题右侧） */
  actions?: React.ReactNode;
  /** 主内容（当使用 children 时，表格不会自动渲染） */
  children?: React.ReactNode;
}

/**
 * 通用两级导航页面组件
 * 提供带有侧边导航的页面布局结构
 */
const TwoLevelNavPage: React.FC<TwoLevelNavPageProps> = ({
  title,
  description,
  sideNav,
  menuItems,
  dataSource,
  columns,
  filterData,
  defaultActiveKey = 'entity',
  searchPlaceholder = 'Search...',
  onCreate,
  actions,
  children,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchText, setSearchText] = useState('');
  const [activeKey, setActiveKey] = useState(defaultActiveKey);

  // 从 URL 路径确定当前活动菜单项
  const currentPath = location.pathname;
  const activeMenuItem = useMemo(() => {
    if (menuItems && menuItems.length > 0) {
      const found = menuItems.find(item =>
        currentPath.includes(item.key) ||
        currentPath.includes(item.key.replace('-', ''))
      );
      return found || menuItems.find(item => item.key === defaultActiveKey);
    }
    return null;
  }, [currentPath, menuItems, defaultActiveKey]);

  // 渲染侧边导航菜单
  const renderSideNav = () => {
    // 如果提供了自定义 sideNav，优先使用
    if (sideNav) {
      return sideNav;
    }

    // 如果提供了菜单配置，生成菜单
    if (menuItems && menuItems.length > 0) {
      return (
        <nav className="side-nav">
          <div className="side-nav__header">
            <span className="side-nav__title">{title}</span>
          </div>
          <ul className="side-nav__menu">
            {menuItems.map((item) => (
              <li key={item.key} className="side-nav__item">
                <a
                  href="#"
                  className={`side-nav__link ${activeMenuItem?.key === item.key ? 'active' : ''}`}
                  onClick={(e) => {
                    e.preventDefault();
                    setActiveKey(item.key);
                    navigate(`/properties/${item.key}`);
                  }}
                >
                  {item.icon && <span className="side-nav__icon">{item.icon}</span>}
                  <span className="side-nav__label">{item.label}</span>
                </a>
              </li>
            ))}
          </ul>
        </nav>
      );
    }

    return null;
  };

  // 过滤数据
  const filteredData = useMemo(() => {
    if (!dataSource || !filterData) return [];

    let data = filterData(dataSource, activeKey);

    // 应用搜索过滤
    if (searchText) {
      const lowerSearch = searchText.toLowerCase();
      data = data.filter((item: any) =>
        Object.values(item).some((value) =>
          String(value).toLowerCase().includes(lowerSearch)
        )
      );
    }

    return data;
  }, [dataSource, filterData, activeKey, searchText]);

  // 获取当前菜单项对应的操作按钮
  const getCurrentActions = () => {
    if (actions) return actions;
    if (onCreate) {
      return (
        <Button type="primary" icon={<PlusOutlined />} onClick={() => onCreate(activeKey)}>
          Create New
        </Button>
      );
    }
    return null;
  };

  // 获取当前页面标题
  const getCurrentTitle = () => {
    if (activeMenuItem) {
      return activeMenuItem.label;
    }
    return title;
  };

  // 获取当前页面描述
  const getCurrentDescription = () => {
    if (activeMenuItem?.description) {
      return activeMenuItem.description;
    }
    return description;
  };

  // 渲染内容
  const renderContent = () => {
    // 如果提供了 children，直接渲染
    if (children) {
      return children;
    }

    // 如果提供了表格配置，渲染表格
    if (columns && columns.length > 0) {
      return (
        <>
          <div className="page__search">
            <Input
              placeholder={searchPlaceholder}
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="page__search-input"
            />
          </div>
          <Table
            columns={columns}
            dataSource={filteredData}
            rowKey="id"
            pagination={{ pageSize: 10 }}
          />
        </>
      );
    }

    return null;
  };

  return (
    <div className="page-with-sidenav">
      <aside className="page-sidenav">
        {renderSideNav()}
      </aside>
      <main className="page-main">
        <div className="page__header">
          <div className="page__header-top">
            <div className="page__header-left">
              <h1 className="page__header-title">{getCurrentTitle()}</h1>
              {getCurrentDescription() && (
                <p className="page__header-description">{getCurrentDescription()}</p>
              )}
            </div>
            {getCurrentActions() && (
              <div className="page__header-actions">{getCurrentActions()}</div>
            )}
          </div>
        </div>
        <div className="page__content">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default TwoLevelNavPage;
