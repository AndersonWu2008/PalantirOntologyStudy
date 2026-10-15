/**
 * FilterBar Component
 * 过滤器组件
 */

import React from 'react';
import { Select, DatePicker, Button, Space } from 'antd';
import { FilterOutlined, ReloadOutlined } from '@ant-design/icons';
import './FilterBar.less';

const { RangePicker } = DatePicker;

export interface FilterOption {
  key: string;
  label: string;
  type: 'select' | 'date' | 'range';
  options?: { label: string; value: string | number }[];
  placeholder?: string;
}

export interface FilterBarProps {
  filters: FilterOption[];
  values?: Record<string, any>;
  onChange?: (values: Record<string, any>) => void;
  onReset?: () => void;
}

/**
 * FilterBar - 过滤器组件
 *
 * 结构:
 * ┌─────────────────────────────────────────────────────────────┐
 * │ [Status: All ▼] [Type: All ▼] [Date Range] [Apply]      │
 * └─────────────────────────────────────────────────────────────┘
 */
export const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  values = {},
  onChange,
  onReset,
}) => {
  const handleFilterChange = (key: string, value: any) => {
    onChange?.({ ...values, [key]: value });
  };

  const renderFilter = (filter: FilterOption) => {
    const value = values[filter.key];

    switch (filter.type) {
      case 'select':
        return (
          <Select
            key={filter.key}
            placeholder={filter.placeholder || filter.label}
            value={value}
            onChange={(val) => handleFilterChange(filter.key, val)}
            allowClear
            className="filter-bar__select"
            options={[
              { label: `All ${filter.label}`, value: '' },
              ...(filter.options || []),
            ]}
          />
        );

      case 'date':
        return (
          <DatePicker
            key={filter.key}
            placeholder={filter.placeholder || filter.label}
            value={value}
            onChange={(val) => handleFilterChange(filter.key, val)}
          />
        );

      case 'range':
        return (
          <RangePicker
            key={filter.key}
            placeholder={[filter.placeholder || 'Start', 'End']}
            value={value}
            onChange={(val) => handleFilterChange(filter.key, val)}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="filter-bar">
      <Space size="middle" wrap>
        <FilterOutlined className="filter-icon" />
        {filters.map(renderFilter)}
      </Space>

      {onReset && (
        <Button icon={<ReloadOutlined />} onClick={onReset}>
          Reset
        </Button>
      )}
    </div>
  );
};

export default FilterBar;
