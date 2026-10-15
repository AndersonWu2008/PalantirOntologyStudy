/**
 * ThreeLevelNavPage Component
 * 通用三级导航页面组件
 * 用于 Data、Objects、Types、Workflows 等具有三级导航结构的页面
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Button, Table, Tag, Space } from 'antd';
import {
  PlusOutlined,
  CaretDownOutlined,
  CaretRightOutlined,
  UploadOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { PageHeader, SearchBar } from '@/components';
import type { ColumnsType } from 'antd/es/table';
import './ThreeLevelNavPage.less';

/**
 * 二级菜单项配置
 */
export interface SecondLevelMenuItem {
  key: string;
  icon: React.ReactNode;
  label: string;
  tables: string;
  path: string;
}

/**
 * 三级菜单项配置
 */
export interface ThirdLevelMenuItem {
  key: string;
  icon: React.ReactNode;
  label: string;
  table: string;
  path: string;
}

/**
 * 表格列配置
 */
export interface NavPageColumn<T> {
  key: string;
  title: string;
  dataIndex: keyof T | string;
  render?: (value: any, record: T) => React.ReactNode;
}

/**
 * ThreeLevelNavPage Props
 */
export interface ThreeLevelNavPageProps<T extends { id: string }> {
  /** 页面标题 */
  title: string;
  /** 二级菜单配置 */
  secondLevelMenu: SecondLevelMenuItem[];
  /** 三级菜单配置 */
  thirdLevelMenu: Record<string, ThirdLevelMenuItem[]>;
  /** 表格数据 */
  dataSource: T[];
  /** 表格列配置 */
  columns: ColumnsType<T>;
  /** 创建按钮文本 */
  createButtonText?: string;
  /** 搜索占位符 */
  searchPlaceholder?: string;
  /** 默认选中的二级菜单 */
  defaultSecondLevel?: string;
  /** 数据过滤函数 */
  filterData?: (data: T[], currentThirdLevel: ThirdLevelMenuItem | undefined) => T[];
  /** 页面主类名 */
  className?: string;
  /** 加载状态 */
  loading?: boolean;
  /** 三级菜单切换回调 */
  onThirdLevelChange?: (table: string) => void;
  /** Import 按钮回调 (tableName) => void */
  onImport?: (tableName: string) => void;
  /** Export 按钮回调 (tableName) => void */
  onExport?: (tableName: string) => void;
}

/**
 * 通用三级导航页面组件
 * @param props - 组件属性
 * @returns ReactElement
 */
export function ThreeLevelNavPage<T extends { id: string }>({
  title,
  secondLevelMenu,
  thirdLevelMenu,
  dataSource,
  columns,
  createButtonText = 'Create',
  searchPlaceholder = 'Search...',
  defaultSecondLevel,
  filterData,
  className = '',
  loading = false,
  onThirdLevelChange,
  onImport,
  onExport,
}: ThreeLevelNavPageProps<T>): React.ReactElement {
  const navigate = useNavigate();
  const location = useLocation();
  const pathSegments = location.pathname.split('/').filter(Boolean);
  const currentSecondLevel = pathSegments[1] || defaultSecondLevel || secondLevelMenu[0]?.key;
  const currentThirdLevel = pathSegments[2] || '';

  const [secondLevel, setSecondLevel] = useState(currentSecondLevel);
  const [thirdLevel, setThirdLevel] = useState(currentThirdLevel);
  const [searchValue, setSearchValue] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set([currentSecondLevel]));

  // 同步 URL 变化到状态
  useEffect(() => {
    const segments = location.pathname.split('/').filter(Boolean);
    const newSecondLevel = segments[1] || defaultSecondLevel || secondLevelMenu[0]?.key;
    setSecondLevel(newSecondLevel);
    setThirdLevel(segments[2] || '');
    setExpandedIds(new Set([newSecondLevel]));
  }, [location.pathname, defaultSecondLevel, secondLevelMenu]);

  // 获取当前选中的菜单项
  const currentSecondMenu = useMemo(
    () => secondLevelMenu.find((item) => item.key === secondLevel),
    [secondLevelMenu, secondLevel]
  );

  const currentThirdMenu = useMemo(
    () => thirdLevelMenu[secondLevel] || [],
    [thirdLevelMenu, secondLevel]
  );

  const currentThirdItem = useMemo(
    () => currentThirdMenu.find((item) => item.key === thirdLevel) || currentThirdMenu[0],
    [currentThirdMenu, thirdLevel]
  );

  // 当三级菜单变化时触发回调
  useEffect(() => {
    if (onThirdLevelChange && currentThirdItem?.table) {
      onThirdLevelChange(currentThirdItem.table);
    }
  }, [currentThirdItem, onThirdLevelChange]);

  // 过滤数据
  const filteredData = useMemo(() => {
    let data = dataSource;
    
    // 应用三级菜单过滤
    if (filterData) {
      data = filterData(data, currentThirdItem);
    } else if (currentThirdItem && currentThirdItem.table !== '-') {
      data = data.filter((item: any) => item.table === currentThirdItem.table);
    }
    
    // 应用搜索过滤
    if (searchValue) {
      const lowerSearch = searchValue.toLowerCase();
      data = data.filter((item: any) =>
        Object.values(item).some(
          (val) =>
            typeof val === 'string' && val.toLowerCase().includes(lowerSearch)
        )
      );
    }
    
    return data;
  }, [dataSource, currentThirdItem, filterData, searchValue]);

  // 处理二级菜单点击
  const handleSecondLevelClick = (item: SecondLevelMenuItem) => {
    // 直接导航到二级菜单项的路径，不加载/展开三级导航
    navigate(item.path);
  };

  // 处理三级菜单点击
  const handleThirdLevelClick = (item: ThirdLevelMenuItem) => {
    setThirdLevel(item.key);
    navigate(item.path);
  };

  // 渲染二级菜单
  const renderSecondLevelMenu = () => (
    <div className="three-level-nav__menu-container">
      {secondLevelMenu.map((item) => {
        const hasChildren = thirdLevelMenu[item.key] && thirdLevelMenu[item.key].length > 0;
        const isExpanded = expandedIds.has(item.key);
        const isActive = item.key === secondLevel;
        
        return (
          <div key={item.key} className="nav-group">
            <div
              className={`nav-item ${isActive ? 'nav-item--active' : ''}`}
              onClick={() => handleSecondLevelClick(item)}
            >
              <div className="nav-item__main">
                <span className="nav-item__icon">{item.icon}</span>
                <span className="nav-item__label">{item.label}</span>
                {hasChildren && (
                  <span className="nav-item__expand">
                    {isExpanded ? <CaretDownOutlined /> : <CaretRightOutlined />}
                  </span>
                )}
                <Tag className="nav-item__tag">
                  {item.tables === '-' ? '-' : item.tables.split(',').length}
                </Tag>
              </div>
            </div>

            {hasChildren && isExpanded && (
              <div className="nav-children">
                {thirdLevelMenu[item.key]?.map((child) => {
                  const isChildActive = child.key === thirdLevel;
                  return (
                    <div
                      key={child.key}
                      className={`nav-child ${isChildActive ? 'nav-child--active' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleThirdLevelClick(child);
                      }}
                    >
                      <span className="nav-child__icon">{child.icon}</span>
                      <span className="nav-child__label">{child.label}</span>
                      <Tag color="purple" className="nav-child__tag">
                        {child.table}
                      </Tag>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  // 获取创建按钮文本
  const getCreateButtonText = () => {
    if (createButtonText !== 'Create') return createButtonText;
    return currentThirdItem?.label
      ? `Create ${currentThirdItem.label}`
      : 'Create';
  };

  return (
    <div className={`three-level-nav-page ${className}`}>
      <PageHeader
        title={title}
        description={`${currentSecondMenu?.label || ''} / ${currentThirdItem?.label || 'Select'}
          | Table: ${currentThirdItem?.table || '-'}`}
        actions={
          <Space.Compact>
            <Button type="primary" icon={<PlusOutlined />}>
              {getCreateButtonText()}
            </Button>
            {onImport && (
              <Button
                icon={<UploadOutlined />}
                onClick={() => currentThirdItem?.table && onImport(currentThirdItem.table)}
                disabled={!currentThirdItem?.table}
              >
                Import
              </Button>
            )}
            {onExport && (
              <Button
                icon={<DownloadOutlined />}
                onClick={() => currentThirdItem?.table && onExport(currentThirdItem.table)}
                disabled={!currentThirdItem?.table}
              >
                Export
              </Button>
            )}
          </Space.Compact>
        }
      />
      <div className="three-level-nav__content">
        <div className="three-level-nav__sidebar">
          {renderSecondLevelMenu()}
        </div>
        <div className="three-level-nav__main">
          <SearchBar
            placeholder={searchPlaceholder}
            onSearch={setSearchValue}
          />
          <Table
            columns={columns}
            dataSource={filteredData}
            rowKey="id"
            className="three-level-nav__table"
            pagination={{ pageSize: 10 }}
            loading={loading}
          />
        </div>
      </div>
    </div>
  );
}

export default ThreeLevelNavPage;
