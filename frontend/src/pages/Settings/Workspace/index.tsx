/**
 * WorkspaceSettings Page
 * 工作区设置页面
 */

import React from 'react';
import { Card, Form, Input, Button, Switch, Divider, Menu } from 'antd';
import {
  SaveOutlined,
  SettingOutlined,
  UserOutlined,
  TeamOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import TwoLevelNavPage from '@/components/layout/TwoLevelNavPage';
import './WorkspaceSettings.less';

const WorkspaceSettingsPage: React.FC = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();

  const sideNav = (
    <Menu
      mode="inline"
      selectedKeys={['/settings/workspace']}
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

  const onFinish = (values: any) => {
    console.log('Success:', values);
  };

  return (
    <TwoLevelNavPage
      title="Workspace Settings"
      description="Configure your workspace settings"
      sideNav={sideNav}
    >
      <Card>
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={{
            workspaceName: 'My Workspace',
            description: 'Main workspace',
            timezone: 'UTC',
            language: 'en',
          }}
        >
          <Divider orientation="left">General</Divider>
          <Form.Item label="Workspace Name" name="workspaceName">
            <Input />
          </Form.Item>
          <Form.Item label="Description" name="description">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Divider orientation="left">Preferences</Divider>
          <Form.Item label="Timezone" name="timezone">
            <Input />
          </Form.Item>
          <Form.Item label="Language" name="language">
            <Input />
          </Form.Item>
          <Divider orientation="left">Notifications</Divider>
          <Form.Item label="Email Notifications" name="emailNotifications" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item label="Push Notifications" name="pushNotifications" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item>
            <Button type="primary" icon={<SaveOutlined />} htmlType="submit">
              Save Changes
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </TwoLevelNavPage>
  );
};

export { WorkspaceSettingsPage };
