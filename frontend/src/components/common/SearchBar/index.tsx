/**
 * SearchBar Component
 * 搜索栏组件
 */

import React from 'react';
import { Input, Button, Space } from 'antd';
import { SearchOutlined, FilterOutlined, ReloadOutlined } from '@ant-design/icons';
import './SearchBar.less';

export interface SearchBarProps {
  placeholder?: string;
  onSearch?: (value: string) => void;
  onFilter?: () => void;
  onReset?: () => void;
  showFilter?: boolean;
  showReset?: boolean;
  loading?: boolean;
}

/**
 * SearchBar - 搜索栏组件
 *
 * 结构:
 * ┌─────────────────────────────────────────────────────────────┐
 * │ [🔍 Search... (⌘K)]              [Filter] [Reset]        │
 * └─────────────────────────────────────────────────────────────┘
 */
export const SearchBar: React.FC<SearchBarProps> = ({
  placeholder = 'Search...',
  onSearch,
  onFilter,
  onReset,
  showFilter = true,
  showReset = true,
  loading = false,
}) => {
  const handleSearch = (value: string) => {
    onSearch?.(value);
  };

  return (
    <div className="search-bar">
      <Input.Search
        placeholder={placeholder}
        allowClear
        enterButton={<SearchOutlined />}
        onSearch={handleSearch}
        loading={loading}
        className="search-bar-input"
      />

      <Space className="search-bar-actions">
        {showFilter && onFilter && (
          <Button icon={<FilterOutlined />} onClick={onFilter}>
            Filter
          </Button>
        )}
        {showReset && onReset && (
          <Button icon={<ReloadOutlined />} onClick={onReset}>
            Reset
          </Button>
        )}
      </Space>
    </div>
  );
};

export default SearchBar;
