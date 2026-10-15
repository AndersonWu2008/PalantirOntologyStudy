/**
 * Data Explorer 内容区域组件
 * 主内容展示区，支持动态视图切换
 */

import React from 'react';
import {
  Card,
  Empty,
  Tabs,
  Button,
  Space,
  Dropdown,
  Tooltip,
  Badge,
  Typography,
  Row,
  Col,
  Statistic,
} from 'antd';
import {
  TableOutlined,
  AppstoreOutlined,
  ShareAltOutlined,
  CodeOutlined,
  FilterOutlined,
  SortAscendingOutlined,
  DownloadOutlined,
  PlusOutlined,
  MoreOutlined,
  DatabaseOutlined,
  EditOutlined,
  DeleteOutlined,
  CopyOutlined,
} from '@ant-design/icons';
import { useDataExplorerStore } from '../../store';
import { catalogDetail } from '../../stockFallback';
import TypeDetail from '../TypeDetail';
import { ViewMode, DataType } from '../../types';
import TableView from '../views/TableView';
import GridView from '../views/GridView';
import GraphView from '../views/GraphView';
import JsonView from '../views/JsonView';
import './ContentArea.less';

const { Title, Text, Paragraph } = Typography;

/** 视图配置映射 */
const viewConfigMap: Record<DataType, { defaultView: ViewMode; availableViews: ViewMode[] }> = {
  object_type: {
    defaultView: 'grid',
    availableViews: ['grid', 'table', 'graph'],
  },
  link_type: {
    defaultView: 'table',
    availableViews: ['table', 'graph'],
  },
  property: {
    defaultView: 'table',
    availableViews: ['table'],
  },
  interface: {
    defaultView: 'grid',
    availableViews: ['grid', 'table'],
  },
};

/** 视图图标映射 */
const viewIcons: Record<ViewMode, React.ReactNode> = {
  table: <TableOutlined />,
  grid: <AppstoreOutlined />,
  graph: <ShareAltOutlined />,
  json: <CodeOutlined />,
  kanban: <AppstoreOutlined />,
  gallery: <AppstoreOutlined />,
};

/** 视图标签映射 */
const viewLabels: Record<ViewMode, string> = {
  table: 'Table',
  grid: 'Grid',
  graph: 'Graph',
  json: 'JSON',
  kanban: 'Kanban',
  gallery: 'Gallery',
};

/** Tab 配置 */
const getTabsConfig = (dataType: DataType) => {
  const commonTabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'history', label: 'History' },
    { key: 'api', label: 'API' },
  ];

  switch (dataType) {
    case 'object_type':
      return [
        { key: 'overview', label: 'Overview' },
        { key: 'properties', label: 'Properties' },
        { key: 'relations', label: 'Relations' },
        { key: 'interfaces', label: 'Interfaces' },
        ...commonTabs.slice(1),
      ];
    case 'link_type':
      return [
        { key: 'overview', label: 'Overview' },
        { key: 'configuration', label: 'Configuration' },
        { key: 'usage', label: 'Usage' },
        ...commonTabs.slice(1),
      ];
    case 'property':
      return [
        { key: 'overview', label: 'Overview' },
        { key: 'configuration', label: 'Configuration' },
        { key: 'usage', label: 'Usage' },
        { key: 'history', label: 'History' },
      ];
    case 'interface':
      return [
        { key: 'overview', label: 'Overview' },
        { key: 'properties', label: 'Properties' },
        { key: 'implementations', label: 'Implementations' },
        ...commonTabs.slice(1),
      ];
    default:
      return commonTabs;
  }
};

/** 内容区域组件 */
const ContentArea: React.FC = () => {
  const {
    selectedItem,
    currentView,
    activeTab,
    setCurrentView,
    setActiveTab,
  } = useDataExplorerStore();

  // 获取当前数据类型的视图配置
  const viewConfig = selectedItem
    ? viewConfigMap[selectedItem.type]
    : { defaultView: 'table' as ViewMode, availableViews: ['table'] as ViewMode[] };

  // 处理视图切换
  const handleViewChange = (view: ViewMode) => {
    setCurrentView(view);
  };

  // 处理 Tab 切换
  const handleTabChange = (key: string) => {
    setActiveTab(key);
  };

  // 渲染视图内容
  const renderViewContent = () => {
    switch (currentView) {
      case 'table':
        return <TableView />;
      case 'grid':
        return <GridView />;
      case 'graph':
        return <GraphView />;
      case 'json':
        return <JsonView />;
      default:
        return <TableView />;
    }
  };

  // 渲染空状态
  if (!selectedItem) {
    return (
      <div className="content-area-empty">
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <Space direction="vertical" size="large" align="center">
              <Text type="secondary">Select a data type from the navigator to explore</Text>
              <Button type="primary" icon={<PlusOutlined />}>
                Create New Type
              </Button>
            </Space>
          }
        />
      </div>
    );
  }

  if (catalogDetail(selectedItem.id)) {
    return <TypeDetail id={selectedItem.id} />;
  }

  const tabsConfig = getTabsConfig(selectedItem.type);

  return (
    <div className="content-area">
      {/* 页面头部 */}
      <div className="content-header">
        <Row justify="space-between" align="middle">
          <Col>
            <Space direction="vertical" size="small">
              <Space align="center">
                <Title level={4} style={{ margin: 0 }}>
                  {selectedItem.display_name}
                </Title>
                <Badge
                  status={selectedItem.status === 'active' ? 'success' : 'warning'}
                  text={selectedItem.status}
                />
              </Space>
              <Text type="secondary" className="content-description">
                {selectedItem.metadata.description || `${selectedItem.type} definition`}
              </Text>
              {selectedItem.metadata.rid && (
                <Text type="secondary" copyable className="content-rid">
                  RID: {selectedItem.metadata.rid}
                </Text>
              )}
            </Space>
          </Col>
          <Col>
            <Space>
              <Button icon={<DownloadOutlined />}>Export</Button>
              <Button type="primary" icon={<PlusOutlined />}>
                Create
              </Button>
              <Dropdown
                menu={{
                  items: [
                    { key: 'edit', icon: <EditOutlined />, label: 'Edit' },
                    { key: 'duplicate', icon: <CopyOutlined />, label: 'Duplicate' },
                    { key: 'delete', icon: <DeleteOutlined />, label: 'Delete', danger: true },
                  ],
                }}
                placement="bottomRight"
              >
                <Button icon={<MoreOutlined />} />
              </Dropdown>
            </Space>
          </Col>
        </Row>
      </div>

      {/* 统计信息 */}
      <div className="content-stats">
        <Row gutter={16}>
          <Col span={6}>
            <Card size="small">
              <Statistic
                title="Total Instances"
                value={selectedItem.count || 0}
                prefix={<DatabaseOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic title="Properties" value={12} />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic title="Relations" value={5} />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic title="Last Modified" value="2h ago" />
            </Card>
          </Col>
        </Row>
      </div>

      {/* 视图工具栏 */}
      <div className="content-toolbar">
        <Row justify="space-between" align="middle">
          <Col>
            <Space>
              <Text type="secondary">View:</Text>
              <Space.Compact>
                {viewConfig.availableViews.map((view) => (
                  <Tooltip key={view} title={viewLabels[view]}>
                    <Button
                      type={currentView === view ? 'primary' : 'default'}
                      icon={viewIcons[view]}
                      onClick={() => handleViewChange(view)}
                    >
                      {viewLabels[view]}
                    </Button>
                  </Tooltip>
                ))}
              </Space.Compact>
            </Space>
          </Col>
          <Col>
            <Space>
              <Button icon={<FilterOutlined />}>Filter</Button>
              <Button icon={<SortAscendingOutlined />}>Sort</Button>
              <Button icon={<DownloadOutlined />}>Export</Button>
            </Space>
          </Col>
        </Row>
      </div>

      {/* Tab 内容 */}
      <div className="content-tabs">
        <Tabs
          activeKey={activeTab}
          onChange={handleTabChange}
          items={tabsConfig.map((tab) => ({
            key: tab.key,
            label: tab.label,
            children: (
              <div className="tab-content">
                {tab.key === 'overview' && renderViewContent()}
                {tab.key === 'properties' && <TableView />}
                {tab.key === 'relations' && <GraphView />}
                {tab.key === 'instances' && <TableView />}
                {tab.key === 'configuration' && (
                  <Card>
                    <Paragraph>Configuration settings will be displayed here.</Paragraph>
                  </Card>
                )}
                {tab.key === 'usage' && (
                  <Card>
                    <Paragraph>Usage statistics will be displayed here.</Paragraph>
                  </Card>
                )}
                {tab.key === 'interfaces' && (
                  <Card>
                    <Paragraph>Implemented interfaces will be displayed here.</Paragraph>
                  </Card>
                )}
                {tab.key === 'implementations' && (
                  <Card>
                    <Paragraph>Implementation status will be displayed here.</Paragraph>
                  </Card>
                )}
                {tab.key === 'history' && (
                  <Card>
                    <Paragraph>Change history will be displayed here.</Paragraph>
                  </Card>
                )}
                {tab.key === 'api' && (
                  <Card>
                    <Paragraph>API documentation will be displayed here.</Paragraph>
                  </Card>
                )}
              </div>
            ),
          }))}
        />
      </div>
    </div>
  );
};

export default ContentArea;
