/**
 * Table View Component
 * Displays data in a tabular format
 */

import React from 'react';
import { Table, Tag, Space, Button, Dropdown } from 'antd';
import { EditOutlined, DeleteOutlined, MoreOutlined, EyeOutlined } from '@ant-design/icons';
import { useDataExplorerStore } from '../../store';

/** Mock data for demonstration */
const mockData = [
  {
    key: '1',
    id: 'emp_001',
    name: 'John Doe',
    email: 'john.doe@company.com',
    department: 'Engineering',
    status: 'active',
    created_at: '2024-01-15',
  },
  {
    key: '2',
    id: 'emp_002',
    name: 'Jane Smith',
    email: 'jane.smith@company.com',
    department: 'Marketing',
    status: 'active',
    created_at: '2024-02-20',
  },
  {
    key: '3',
    id: 'emp_003',
    name: 'Bob Wilson',
    email: 'bob.wilson@company.com',
    department: 'Sales',
    status: 'inactive',
    created_at: '2023-11-10',
  },
  {
    key: '4',
    id: 'emp_004',
    name: 'Alice Brown',
    email: 'alice.brown@company.com',
    department: 'Engineering',
    status: 'active',
    created_at: '2024-03-05',
  },
  {
    key: '5',
    id: 'emp_005',
    name: 'Charlie Davis',
    email: 'charlie.davis@company.com',
    department: 'HR',
    status: 'active',
    created_at: '2024-01-28',
  },
];

const TableView: React.FC = () => {
  const { selectInstance } = useDataExplorerStore();

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 120,
    },
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      sorter: (a: any, b: any) => a.name.localeCompare(b.name),
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: 'Department',
      dataIndex: 'department',
      key: 'department',
      filters: [
        { text: 'Engineering', value: 'Engineering' },
        { text: 'Marketing', value: 'Marketing' },
        { text: 'Sales', value: 'Sales' },
        { text: 'HR', value: 'HR' },
      ],
      onFilter: (value: any, record: any) => record.department === value,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'active' ? 'success' : 'default'}>
          {status.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Created At',
      dataIndex: 'created_at',
      key: 'created_at',
      sorter: (a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_: any, record: any) => (
        <Space size="small">
          <Button
            type="text"
            icon={<EyeOutlined />}
            onClick={() => selectInstance(record)}
          />
          <Dropdown
            menu={{
              items: [
                { key: 'edit', icon: <EditOutlined />, label: 'Edit' },
                { key: 'delete', icon: <DeleteOutlined />, label: 'Delete', danger: true },
              ],
            }}
            placement="bottomRight"
          >
            <Button type="text" icon={<MoreOutlined />} />
          </Dropdown>
        </Space>
      ),
    },
  ];

  return (
    <div className="table-view">
      <Table
        columns={columns}
        dataSource={mockData}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showTotal: (total) => `Total ${total} items`,
        }}
        rowSelection={{
          type: 'checkbox',
          onChange: (selectedRowKeys, selectedRows) => {
            console.log('Selected:', selectedRowKeys, selectedRows);
          },
        }}
        onRow={(record) => ({
          onClick: () => selectInstance(record),
          style: { cursor: 'pointer' },
        })}
      />
    </div>
  );
};

export default TableView;
