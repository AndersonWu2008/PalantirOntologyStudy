/**
 * Preferences Page
 * 用户偏好设置页面
 *
 * 管理应用全局偏好设置
 */

import React from 'react';
import { Card, Form, Switch, Select, Button, Space, Divider, message } from 'antd';
import { SaveOutlined, ReloadOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useGlobalStore } from '@/stores/globalStore';
import { useThemeStore } from '@/stores/themeStore';
import { ThemeSwitcher } from '@/components/common/ThemeSwitcher';
import './Preferences.less';

const { Option } = Select;

/**
 * PreferencesPage Component
 */
const PreferencesPage: React.FC = () => {
  const { t } = useTranslation();
  const [form] = Form.useForm();

  const globalStore = useGlobalStore();
  const currentTheme = useThemeStore((s) => s.currentTheme);
  const followSystem = useThemeStore((s) => s.followSystem);
  const setTheme = useThemeStore((s) => s.setTheme);
  const setFollowSystem = useThemeStore((s) => s.setFollowSystem);

  // 表单初始值
  const initialValues = {
    theme: currentTheme,
    followSystem,
    shortcutsEnabled: globalStore.shortcutsEnabled,
    sidebarCollapsed: globalStore.sidebarCollapsed,
    language: 'en',
    timezone: 'UTC',
  };

  // 提交表单
  const handleSubmit = async (values: Record<string, unknown>) => {
    try {
      setTheme(values.theme as 'light' | 'dark');
      setFollowSystem(values.followSystem as boolean);
      globalStore.setShortcutsEnabled(values.shortcutsEnabled as boolean);
      globalStore.setSidebarCollapsed(values.sidebarCollapsed as boolean);

      message.success('Preferences saved successfully');
    } catch (error) {
      message.error('Failed to save preferences');
    }
  };

  // 重置表单
  const handleReset = () => {
    form.resetFields();
    setTheme('light');
    setFollowSystem(false);
    globalStore.setShortcutsEnabled(true);
    globalStore.setSidebarCollapsed(false);
    message.info('Preferences reset to defaults');
  };

  return (
    <div className="preferences-page">
      <div className="page-header">
        <h1>Preferences</h1>
        <p>Customize your Ontology experience</p>
      </div>

      <Card className="preferences-card">
        <Form
          form={form}
          layout="vertical"
          initialValues={initialValues}
          onFinish={handleSubmit}
        >
          <Form.Item
            name="theme"
            label="Theme"
            extra="与左侧导航栏同一套 themeStore；也可下方一键切换"
          >
            <Select style={{ width: 200 }}>
              <Option value="light">Light</Option>
              <Option value="dark">Dark</Option>
            </Select>
          </Form.Item>

          <Form.Item label="Quick toggle">
            <ThemeSwitcher mode="button" size="middle" />
          </Form.Item>

          <Form.Item
            name="followSystem"
            label="Follow System Theme"
            valuePropName="checked"
            extra="Automatically match your operating system's theme preference"
          >
            <Switch />
          </Form.Item>

          <Divider />

          <Form.Item
            name="shortcutsEnabled"
            label="Global Shortcuts"
            valuePropName="checked"
            extra="Enable keyboard shortcuts like Cmd/Ctrl+K for quick search"
          >
            <Switch />
          </Form.Item>

          <Form.Item
            name="sidebarCollapsed"
            label="Sidebar Collapsed by Default"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>

          <Divider />

          <Form.Item
            name="language"
            label="Language"
            extra="Select your preferred language for the interface"
          >
            <Select style={{ width: 200 }}>
              <Option value="en">English</Option>
              <Option value="zh-CN">简体中文</Option>
              <Option value="ja">日本語</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="timezone"
            label="Timezone"
            extra="Used for displaying timestamps and scheduled tasks"
          >
            <Select style={{ width: 200 }}>
              <Option value="UTC">UTC</Option>
              <Option value="America/New_York">Eastern Time (ET)</Option>
              <Option value="America/Los_Angeles">Pacific Time (PT)</Option>
              <Option value="Asia/Shanghai">China Standard Time (CST)</Option>
              <Option value="Asia/Tokyo">Japan Standard Time (JST)</Option>
            </Select>
          </Form.Item>

          <Divider />

          <Form.Item>
            <Space>
              <Button type="primary" icon={<SaveOutlined />} htmlType="submit">
                Save Preferences
              </Button>
              <Button icon={<ReloadOutlined />} onClick={handleReset}>
                Reset to Defaults
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default PreferencesPage;
