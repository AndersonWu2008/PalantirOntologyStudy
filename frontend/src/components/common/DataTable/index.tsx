/**
 * DataTable Component
 * 数据表格组件，支持排序、分页、自定义列渲染
 */

import React from 'react';
import { Table, TableProps } from 'antd';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import './DataTable.less';

export interface DataTableColumn<T> {
  key: string;
  title: string;
  dataIndex?: keyof T;
  width?: number | string;
  render?: (value: any, record: T, index: number) => React.ReactNode;
  sortable?: boolean;
  ellipsis?: boolean;
}

export interface DataTableProps<T> extends Omit<TableProps<T>, 'columns'> {
  columns: DataTableColumn<T>[];
  data: T[];
  loading?: boolean;
  rowKey: keyof T | ((record: T) => string);
  pagination?: TablePaginationConfig | false;
  onRowClick?: (record: T) => void;
}

/**
 * DataTable - 数据表格组件
 *
 * 结构:
 * ┌─────────────────────────────────────────────────────────────┐
 * │  Column A    │ Column B    │ Column C    │ Actions         │
 * │  ────────────┼─────────────┼─────────────┼─────────────────│
 * │  Value 1     │ Value 2     │ Value 3     │ [Edit][Delete] │
 * │  Value 4     │ Value 5     │ Value 6     │ [Edit][Delete] │
 * └─────────────────────────────────────────────────────────────┘
 */
export function DataTable<T extends object>({
  columns,
  data,
  loading = false,
  rowKey,
  pagination,
  onRowClick,
  ...rest
}: DataTableProps<T>) {
  // 转换列配置 - using type assertion to avoid complex type issues
  const tableColumns = columns.map((col) => ({
    key: col.key,
    title: col.title,
    dataIndex: col.dataIndex,
    width: col.width,
    render: col.render,
    sorter: col.sortable ? true : undefined,
    ellipsis: col.ellipsis,
  })) as ColumnsType<T>;

  // 处理 rowKey
  const getRowKey = (record: T): string => {
    if (typeof rowKey === 'function') {
      return rowKey(record);
    }
    return String(record[rowKey]);
  };

  return (
    <Table<T>
      className="data-table"
      columns={tableColumns}
      dataSource={data}
      loading={loading}
      rowKey={getRowKey}
      pagination={pagination}
      onRow={(record) => ({
        onClick: () => onRowClick?.(record),
        style: onRowClick ? { cursor: 'pointer' } : {},
      })}
      {...rest}
    />
  );
}

export default DataTable;
