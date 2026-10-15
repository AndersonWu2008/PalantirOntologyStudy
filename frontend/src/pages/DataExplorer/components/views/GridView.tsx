/**
 * Grid View Component
 * Displays data in a card grid format
 */

import React from 'react';
import { Card, Row, Col, Tag, Space, Button, Dropdown, Typography } from 'antd';
import {
  MoreOutlined,
  DatabaseOutlined,
  UserOutlined,
  ApartmentOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import { useDataExplorerStore } from '../../store';

const { Text, Paragraph } = Typography;

/** Mock data for demonstration */
const mockData = [
  {
    key: '1',
    id: 'user',
    name: 'User',
    description: 'User entity definition for managing user accounts',
    properties: 12,
    relations: 5,
    status: 'active',
    icon: 'user',
  },
  {
    key: '2',
    id: 'organization',
    name: 'Organization',
    description: 'Organization entity for company structure',
    properties: 8,
    relations: 3,
    status: 'active',
    icon: 'apartment',
  },
  {
    key: '3',
    id: 'project',
    name: 'Project',
    description: 'Project management entity',
    properties: 15,
    relations: 7,
    status: 'draft',
    icon: 'file-text',
  },
  {
    key: '4',
    id: 'document',
    name: 'Document',
    description: 'Document storage and management',
    properties: 10,
    relations: 4,
    status: 'active',
    icon: 'file-text',
  },
  {
    key: '5',
    id: 'task',
    name: 'Task',
    description: 'Task tracking and management',
    properties: 14,
    relations: 6,
    status: 'active',
    icon: 'database',
  },
  {
    key: '6',
    id: 'comment',
    name: 'Comment',
    description: 'Comment system for entities',
    properties: 6,
    relations: 2,
    status: 'deprecated',
    icon: 'database',
  },
];

/** Icon mapping */
const iconMapping: Record<string, React.ReactNode> = {
  user: <UserOutlined style={{ fontSize: 48, color: '#1890ff' }} />,
  apartment: <ApartmentOutlined style={{ fontSize: 48, color: '#52c41a' }} />,
  'file-text': <FileTextOutlined style={{ fontSize: 48, color: '#faad14' }} />,
  database: <DatabaseOutlined style={{ fontSize: 48, color: '#722ed1' }} />,
};

const GridView: React.FC = () => {
  const { selectInstance } = useDataExplorerStore();

  const getIcon = (iconName: string) => {
    return iconMapping[iconName] || <DatabaseOutlined style={{ fontSize: 48, color: '#999' }} />;
  };

  return (
    <div className="grid-view">
      <Row gutter={[16, 16]}>
        {mockData.map((item) => (
          <Col xs={24} sm={12} md={8} lg={6} key={item.key}>
            <Card
              hoverable
              className="grid-card"
              onClick={() => selectInstance(item)}
              actions={[
                <Button type="link" key="view">View</Button>,
                <Button type="link" key="edit">Edit</Button>,
                <Dropdown
                  key="more"
                  menu={{
                    items: [
                      { key: 'duplicate', label: 'Duplicate' },
                      { key: 'delete', label: 'Delete', danger: true },
                    ],
                  }}
                  placement="bottomRight"
                >
                  <Button type="link" icon={<MoreOutlined />} />
                </Dropdown>,
              ]}
            >
              <Card.Meta
                avatar={getIcon(item.icon)}
                title={
                  <Space>
                    <Text strong>{item.name}</Text>
                    <Tag
                      color={
                        item.status === 'active'
                          ? 'success'
                          : item.status === 'draft'
                          ? 'warning'
                          : 'default'
                      }
                    >
                      {item.status}
                    </Tag>
                  </Space>
                }
                description={
                  <Space direction="vertical" size="small" style={{ width: '100%' }}>
                    <Paragraph
                      ellipsis={{ rows: 2 }}
                      style={{ marginBottom: 0, color: '#666' }}
                    >
                      {item.description}
                    </Paragraph>
                    <Space split="|" style={{ marginTop: 8 }}>
                      <Text type="secondary">Properties: {item.properties}</Text>
                      <Text type="secondary">Relations: {item.relations}</Text>
                    </Space>
                  </Space>
                }
              />
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
};

export default GridView;
