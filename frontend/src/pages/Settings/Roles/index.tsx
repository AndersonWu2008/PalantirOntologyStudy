/**
 * Roles Page
 * 角色管理页面
 */

import React, { useState } from 'react';
import { Button, Space, Table, Tag, Menu } from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  EyeOutlined,
  DeleteOutlined,
  SettingOutlined,
  UserOutlined,
  TeamOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import TwoLevelNavPage from '@/components/layout/TwoLevelNavPage';
import './Roles.less';

interface Role {
  id: string;
  name: string;
  description: string;
  userCount: number;
  permissions: string[];
}

const RolesPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading] = useState(false);

  const roles: Role[] = [
    { id: '1', name: 'Admin', description: 'Full access to all features', userCount: 3, permissions: ['read', 'write', 'delete', 'admin'] },
    { id: '2', name: 'Editor', description: 'Can edit content', userCount: 5, permissions: ['read', 'write'] },
    { id: '3', name: 'Viewer', description: 'Read-only access', userCount: 12, permissions: ['read'] },
  ];

  const columns = [
    { key: 'name', title: 'Role Name', dataIndex: 'name' },
    { key: 'description', title: 'Description', dataIndex: 'description' },
    { key: 'userCount', title: 'Users', dataIndex: 'userCount' },
    {
      key: 'permissions',
      title: 'Permissions',
      dataIndex: 'permissions',
      render: (perms: string[]) => (
        <Space wrap>
          {perms.map((p) => (
            <Tag key={p} color="blue">{p}</Tag>
          ))}
        </Space>
      )
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (_: any, record: Role) => (
        <Space>
          <Button size="small" icon={<EyeOutlined />} onClick={() => navigate(`/settings/role/${record.id}`)}>View</Button>
          <Button size="small" icon={<EditOutlined />} onClick={() => navigate(`/settings/role/${record.id}/edit`)}>Edit</Button>
          <Button size="small" icon={<DeleteOutlined />} danger onClick={() => {}}>Delete</Button>
        </Space>
      ),
    },
  ];

  const sideNav = (
    <Menu
      mode="inline"
      selectedKeys={['/settings/roles']}
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
      title="Role Management"
      description="Manage roles and permissions"
      sideNav={sideNav}
      actions={
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/settings/role/new')}>
          Create Role
        </Button>
      }
    >
      <Table columns={columns} dataSource={roles} loading={loading} rowKey="id" />
    </TwoLevelNavPage>
  );
};

export { RolesPage };
