/**
 * Audit Logs Page
 * 审计日志页面 - 连接 Audit Service (8030)
 */

import React, { useEffect, useState, useCallback } from 'react';
import { Card, Table, Tag, Button, Space, Select, DatePicker, Input, Row, Col, Statistic, message, Spin, Menu } from 'antd';
import { SearchOutlined, ExportOutlined, ReloadOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useNavigate } from 'react-router-dom';
import {
  SettingOutlined,
  UserOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import TwoLevelNavPage from '@/components/layout/TwoLevelNavPage';
import { auditApi, AuditLog, AuditStats } from '@/services/auditApi';

const { RangePicker } = DatePicker;
const { Option } = Select;

// 默认 workspace_id
const DEFAULT_WORKSPACE = 'ws-001';

const AuditLogsPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [workspaceId] = useState(DEFAULT_WORKSPACE);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);

  // 筛选条件
  const [userId, setUserId] = useState<string | undefined>();
  const [action, setAction] = useState<string | undefined>();
  const [resourceType, setResourceType] = useState<string | undefined>();
  const [level, setLevel] = useState<string | undefined>();
  const [dateRange, setDateRange] = useState<[string?, string?]>([]);

  // 加载日志
  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {
        workspace_id: workspaceId,
        page,
        size: pageSize,
      };
      if (userId) params.user_id = userId;
      if (action) params.action = action;
      if (resourceType) params.resource_type = resourceType;
      if (level) params.level = level;
      if (dateRange[0]) params.start_time = dateRange[0];
      if (dateRange[1]) params.end_time = dateRange[1];

      const res = await auditApi.queryLogs(params);
      setLogs(res.content || []);
      setTotal(res.total || 0);
    } catch (error) {
      console.error('Failed to load audit logs:', error);
      message.error('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  }, [workspaceId, page, pageSize, userId, action, resourceType, level, dateRange]);

  // 加载统计
  const loadStats = useCallback(async () => {
    try {
      const res = await auditApi.getDashboardStats(workspaceId, 7);
      setStats(res);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  }, [workspaceId]);

  useEffect(() => {
    loadLogs();
    loadStats();
  }, [loadLogs, loadStats]);

  // 处理筛选
  const handleFilterChange = () => {
    setPage(1);
    loadLogs();
  };

  // 处理分页
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const columns: ColumnsType<AuditLog> = [
    {
      title: 'Timestamp',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 180,
      render: (timestamp: string) => new Date(timestamp).toLocaleString(),
    },
    {
      title: 'Action',
      dataIndex: 'action',
      key: 'action',
      render: (act: string) => {
        const color = act === 'create' ? 'green' : act === 'update' ? 'blue' : act === 'delete' ? 'red' : 'orange';
        return <Tag color={color}>{act.toUpperCase()}</Tag>;
      },
    },
    {
      title: 'User ID',
      dataIndex: 'user_id',
      key: 'user_id',
      render: (id: string) => <code>{id}</code>,
    },
    {
      title: 'Resource Type',
      dataIndex: 'resource_type',
      key: 'resource_type',
      render: (type: string) => <Tag>{type}</Tag>,
    },
    {
      title: 'Resource ID',
      dataIndex: 'resource_id',
      key: 'resource_id',
      ellipsis: true,
      render: (id: string) => id || '-',
    },
    {
      title: 'Level',
      dataIndex: 'level',
      key: 'level',
      render: (lvl: string) => {
        const color = lvl === 'info' ? 'blue' : lvl === 'warning' ? 'orange' : lvl === 'error' ? 'red' : 'default';
        return <Tag color={color}>{lvl}</Tag>;
      },
    },
    {
      title: 'IP Address',
      dataIndex: 'ip_address',
      key: 'ip_address',
      render: (ip: string) => ip || '-',
    },
  ];

  const sideNav = (
    <Menu
      mode="inline"
      selectedKeys={['/settings/audit']}
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
      title="Audit Logs"
      description="View system activity and security events"
      sideNav={sideNav}
      actions={
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => { loadLogs(); loadStats(); }}>
            Refresh
          </Button>
          <Button icon={<ExportOutlined />}>Export</Button>
        </Space>
      }
    >
      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Events (7d)"
              value={stats?.total_events || 0}
              prefix={<SafetyCertificateOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Unique Users"
              value={Object.keys(stats?.by_action || {}).length}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Errors"
              value={stats?.by_level?.error || 0}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Warnings"
              value={stats?.by_level?.warning || 0}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
      </Row>

      <Card title="Audit Logs">
        <Space style={{ marginBottom: 16 }} wrap>
          <Input
            placeholder="Search by user ID"
            prefix={<SearchOutlined />}
            style={{ width: 200 }}
            onChange={(e) => setUserId(e.target.value || undefined)}
            onPressEnter={handleFilterChange}
          />
          <Select
            placeholder="Action"
            style={{ width: 120 }}
            allowClear
            onChange={(v) => { setAction(v); handleFilterChange(); }}
          >
            <Option value="create">CREATE</Option>
            <Option value="read">READ</Option>
            <Option value="update">UPDATE</Option>
            <Option value="delete">DELETE</Option>
            <Option value="login">LOGIN</Option>
            <Option value="logout">LOGOUT</Option>
            <Option value="export">EXPORT</Option>
          </Select>
          <Select
            placeholder="Resource Type"
            style={{ width: 150 }}
            allowClear
            onChange={(v) => { setResourceType(v); handleFilterChange(); }}
          >
            <Option value="object_type">Object type</Option>
            <Option value="link_type">Link type</Option>
            <Option value="action_type">Action type</Option>
            <Option value="user">User</Option>
          </Select>
          <Select
            placeholder="Level"
            style={{ width: 100 }}
            allowClear
            onChange={(v) => { setLevel(v); handleFilterChange(); }}
          >
            <Option value="info">Info</Option>
            <Option value="warning">Warning</Option>
            <Option value="error">Error</Option>
            <Option value="critical">Critical</Option>
          </Select>
          <RangePicker
            showTime
            onChange={(_, dateStrings) => {
              setDateRange([dateStrings[0], dateStrings[1]]);
              handleFilterChange();
            }}
          />
        </Space>

        <Spin spinning={loading}>
          <Table
            columns={columns}
            dataSource={logs}
            rowKey="id"
            pagination={{
              current: page,
              pageSize: pageSize,
              total: total,
              onChange: handlePageChange,
              showTotal: (t) => `Total ${t} items`,
            }}
          />
        </Spin>
      </Card>
    </TwoLevelNavPage>
  );
};

export { AuditLogsPage };
