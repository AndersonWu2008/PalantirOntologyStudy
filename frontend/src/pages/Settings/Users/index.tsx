/**
 * UserManagement Page
 * 用户管理页面
 */

import React, { useState } from 'react';
import { Button, Space, Table, Tag, Avatar, Menu } from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  EyeOutlined,
  DeleteOutlined,
  UserOutlined,
  SettingOutlined,
  TeamOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import TwoLevelNavPage from '@/components/layout/TwoLevelNavPage';
import './Users.less';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  lastLogin: string;
}

const UsersPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading] = useState(false);

  const users: User[] = [
    { id: '1', name: 'John Doe', email: 'john@example.com', role: 'Admin', status: 'active', lastLogin: '2024-01-20 10:00' },
    { id: '2', name: 'Jane Smith', email: 'jane@example.com', role: 'Editor', status: 'active', lastLogin: '2024-01-19 15:30' },
    { id: '3', name: 'Bob Wilson', email: 'bob@example.com', role: 'Viewer', status: 'inactive', lastLogin: '2024-01-15 09:00' },
  ];

  const getStatusColor = (status: string) => {
    return status === 'active' ? 'green' : 'default';
  };

  const columns = [
    {
      key: 'name',
      title: 'User',
      dataIndex: 'name',
      render: (t: string) => (
        <Space>
          <Avatar icon={<UserOutlined />} />
          <span>{t}</span>
        </Space>
      )
    },
    { key: 'email', title: 'Email', dataIndex: 'email' },
    { key: 'role', title: 'Role', dataIndex: 'role', render: (t: string) => <Tag>{t}</Tag> },
    { key: 'status', title: 'Status', dataIndex: 'status', render: (s: string) => <Tag color={getStatusColor(s)}>{s}</Tag> },
    { key: 'lastLogin', title: 'Last Login', dataIndex: 'lastLogin' },
    {
      key: 'actions',
      title: 'Actions',
      render: (_: any, record: User) => (
        <Space>
          <Button size="small" icon={<EyeOutlined />} onClick={() => navigate(`/settings/user/${record.id}`)}>View</Button>
          <Button size="small" icon={<EditOutlined />} onClick={() => navigate(`/settings/user/${record.id}/edit`)}>Edit</Button>
          <Button size="small" icon={<DeleteOutlined />} danger onClick={() => {}}>Delete</Button>
        </Space>
      ),
    },
  ];

  const sideNav = (
    <Menu
      mode="inline"
      selectedKeys={['/settings/users']}
      items={[
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
      ]}
      onClick={({ key }) => navigate(key)}
      style={{ borderRight: 0 }}
    />
  );

  return (
    <TwoLevelNavPage
      title="User Management"
      description="Manage users and their access"
      sideNav={sideNav}
      actions={
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/settings/user/new')}>
          Add User
        </Button>
      }
    >
      <Table columns={columns} dataSource={users} loading={loading} rowKey="id" />
    </TwoLevelNavPage>
  );
};

export { UsersPage };
