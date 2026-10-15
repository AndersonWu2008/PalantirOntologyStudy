/**
 * Data Explorer 导航面板组件
 * 左侧数据类型导航树
 */

import React, { useEffect, useMemo } from 'react';
import {
  Input,
  Tree,
  Badge,
  Spin,
  Empty,
  Tooltip,
} from 'antd';
import {
  SearchOutlined,
  DatabaseOutlined,
  UserOutlined,
  ApartmentOutlined,
  AppstoreOutlined,
  FileTextOutlined,
  LinkOutlined,
  TagOutlined,
  ApiOutlined,
  DownOutlined,
  RightOutlined,
} from '@ant-design/icons';
import { useDataExplorerStore } from '../../store';
import { NavigatorItem } from '../../types';
import './Navigator.less';

const { Search } = Input;

/** 图标映射 */
const iconMapping: Record<string, React.ReactNode> = {
  database: <DatabaseOutlined />,
  user: <UserOutlined />,
  apartment: <ApartmentOutlined />,
  appstore: <AppstoreOutlined />,
  'file-text': <FileTextOutlined />,
  link: <LinkOutlined />,
  tag: <TagOutlined />,
  api: <ApiOutlined />,
};

/** 获取图标 */
const getIcon = (iconName: string): React.ReactNode => {
  return iconMapping[iconName] || <DatabaseOutlined />;
};

/** 状态颜色映射 */
const statusColorMap: Record<string, string> = {
  active: 'success',
  draft: 'warning',
  deprecated: 'error',
};

/** 导航面板组件 */
const Navigator: React.FC = () => {
  const navigatorItems = useDataExplorerStore((state) => state.navigatorItems);
  const selectedItem = useDataExplorerStore((state) => state.selectedItem);
  const expandedKeys = useDataExplorerStore((state) => state.expandedKeys);
  const searchQuery = useDataExplorerStore((state) => state.searchQuery);
  const isLoading = useDataExplorerStore((state) => state.isLoading);
  const setSearchQuery = useDataExplorerStore((state) => state.setSearchQuery);
  const selectItem = useDataExplorerStore((state) => state.selectItem);
  const toggleExpanded = useDataExplorerStore((state) => state.toggleExpanded);
  const fetchNavigatorItems = useDataExplorerStore((state) => state.fetchNavigatorItems);

  // 组件挂载时获取导航数据
  useEffect(() => {
    fetchNavigatorItems();
  }, []); // 只在挂载时执行一次，fetchNavigatorItems 有内部 guard

  // 过滤导航项
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return navigatorItems;

    const filterItems = (items: NavigatorItem[]): NavigatorItem[] => {
      return items.reduce((acc: NavigatorItem[], item) => {
        const matchesSearch =
          item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.display_name.toLowerCase().includes(searchQuery.toLowerCase());

        if (item.children) {
          const filteredChildren = filterItems(item.children);
          if (filteredChildren.length > 0 || matchesSearch) {
            acc.push({ ...item, children: filteredChildren });
          }
        } else if (matchesSearch) {
          acc.push(item);
        }

        return acc;
      }, []);
    };

    return filterItems(navigatorItems);
  }, [navigatorItems, searchQuery]);

  // 转换导航项为 Tree 数据格式
  const treeData = useMemo(() => {
    const convertToTreeData = (items: NavigatorItem[]): any[] => {
      return items.map((item) => ({
        key: item.id,
        title: (
          <div className="navigator-tree-node">
            <span className="node-icon">{getIcon(item.icon)}</span>
            <span className="node-title">{item.display_name}</span>
            {item.count !== undefined && (
              <Badge
                count={item.count}
                style={{
                  backgroundColor: '#e6e6e6',
                  color: '#666',
                  fontSize: '11px',
                  marginLeft: '8px',
                }}
              />
            )}
            <Tooltip title={`Status: ${item.status}`}>
              <Badge
                status={statusColorMap[item.status] as any}
                style={{ marginLeft: 'auto' }}
              />
            </Tooltip>
          </div>
        ),
        children: item.children ? convertToTreeData(item.children) : undefined,
        isLeaf: !item.hasChildren,
      }));
    };

    return convertToTreeData(filteredItems);
  }, [filteredItems]);

  // 处理节点选择
  const handleSelect = (selectedKeys: React.Key[]) => {
    const findItem = (items: NavigatorItem[], key: string): NavigatorItem | null => {
      for (const item of items) {
        if (item.id === key) return item;
        if (item.children) {
          const found = findItem(item.children, key);
          if (found) return found;
        }
      }
      return null;
    };

    if (selectedKeys.length > 0) {
      const item = findItem(navigatorItems, selectedKeys[0] as string);
      if (item) {
        selectItem(item);
      }
    }
  };

  // 处理展开/收起
  const handleExpand = (expandedKeys: React.Key[]) => {
    // 更新展开状态
    const currentExpanded = useDataExplorerStore.getState().expandedKeys;
    const newKey = expandedKeys.find((key) => !currentExpanded.includes(key as string));
    const collapsedKey = currentExpanded.find((key) => !expandedKeys.includes(key));

    if (newKey) {
      toggleExpanded(newKey as string);
    } else if (collapsedKey) {
      toggleExpanded(collapsedKey);
    }
  };

  return (
    <div className="data-explorer-navigator">
      {/* 搜索框 */}
      <div className="navigator-search">
        <Search
          placeholder="Search data types..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          allowClear
          prefix={<SearchOutlined />}
        />
      </div>

      {/* 导航树 */}
      <div className="navigator-tree-container">
        {isLoading ? (
          <div className="navigator-loading">
            <Spin size="large" />
          </div>
        ) : treeData.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="No data types found"
          />
        ) : (
          <Tree
            className="navigator-tree"
            treeData={treeData}
            expandedKeys={expandedKeys}
            selectedKeys={selectedItem ? [selectedItem.id] : []}
            onSelect={handleSelect}
            onExpand={handleExpand}
            showLine={{ showLeafIcon: false }}
            switcherIcon={({ expanded }) =>
              expanded ? <DownOutlined /> : <RightOutlined />
            }
            blockNode
          />
        )}
      </div>

      {/* 底部操作 */}
      <div className="navigator-footer">
        <span className="navigator-stats">
          {navigatorItems.reduce((acc, item) => acc + (item.count || 0), 0)} types
        </span>
      </div>
    </div>
  );
};

export default Navigator;
