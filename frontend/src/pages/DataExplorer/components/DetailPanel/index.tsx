/**
 * Data Explorer Detail Panel Component
 * Right side panel for displaying selected item details
 */

import React from 'react';
import {
  Card,
  Descriptions,
  Tag,
  Button,
  Space,
  Typography,
  Divider,
  Timeline,
  Badge,
  Empty,
} from 'antd';
import {
  CloseOutlined,
  EditOutlined,
  DeleteOutlined,
  CopyOutlined,
  LinkOutlined,
  HistoryOutlined,
  ShareAltOutlined,
} from '@ant-design/icons';
import { useDataExplorerStore } from '../../store';
import './DetailPanel.less';

const { Title, Text } = Typography;

/** Mock activity data */
const mockActivities = [
  {
    id: '1',
    action: 'Updated',
    field: 'salary',
    oldValue: '$100,000',
    newValue: '$120,000',
    user: 'admin',
    timestamp: '2024-03-10T14:20:00Z',
  },
  {
    id: '2',
    action: 'Created',
    field: null,
    oldValue: null,
    newValue: null,
    user: 'admin',
    timestamp: '2024-01-15T10:30:00Z',
  },
];

/** Mock relationships data */
const mockRelationships = [
  { type: 'works_in', target: 'Acme Corp', targetType: 'organization' },
  { type: 'manages', target: 'Project Alpha', targetType: 'project' },
  { type: 'reports_to', target: 'Jane Smith', targetType: 'user' },
];

const DetailPanel: React.FC = () => {
  const {
    detailPanelVisible,
    selectedInstance,
    setDetailPanelVisible,
  } = useDataExplorerStore();

  // Format timestamp
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Format relative time
  const getRelativeTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return formatTime(timestamp);
  };

  // If panel is not visible, return null
  if (!detailPanelVisible) {
    return null;
  }

  // If no instance is selected, show empty state
  if (!selectedInstance) {
    return (
      <div className="detail-panel">
        <Card
          className="detail-panel-card"
          title="Details"
          extra={
            <Button
              type="text"
              icon={<CloseOutlined />}
              onClick={() => setDetailPanelVisible(false)}
            />
          }
        >
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="Select an item to view details"
          />
        </Card>
      </div>
    );
  }

  const data = selectedInstance;

  return (
    <div className="detail-panel">
      <Card
        className="detail-panel-card"
        title={
          <Space>
            <Text strong>{data.name || data.label || 'Details'}</Text>
            {data.status && (
              <Badge
                status={data.status === 'active' ? 'success' : 'default'}
                text={data.status}
              />
            )}
          </Space>
        }
        extra={
          <Space>
            <Button type="text" icon={<EditOutlined />} />
            <Button
              type="text"
              icon={<CloseOutlined />}
              onClick={() => setDetailPanelVisible(false)}
            />
          </Space>
        }
      >
        {/* Quick Info */}
        <div className="detail-section">
          <Descriptions column={1} size="small">
            {data.id && (
              <Descriptions.Item label="ID">
                <Text copyable>{data.id}</Text>
              </Descriptions.Item>
            )}
            {data.email && (
              <Descriptions.Item label="Email">
                <Text copyable>{data.email}</Text>
              </Descriptions.Item>
            )}
            {data.department && (
              <Descriptions.Item label="Department">
                {data.department}
              </Descriptions.Item>
            )}
            {data.created_at && (
              <Descriptions.Item label="Created">
                {formatTime(data.created_at)}
              </Descriptions.Item>
            )}
          </Descriptions>
        </div>

        <Divider style={{ margin: '12px 0' }} />

        {/* Properties */}
        {data.properties && (
          <div className="detail-section">
            <Title level={5}>Properties</Title>
            <Descriptions column={1} size="small">
              {Object.entries(data.properties).map(([key, value]) => (
                <Descriptions.Item key={key} label={key}>
                  {Array.isArray(value) ? (
                    <Space size={[0, 4]} wrap>
                      {value.map((v, i) => (
                        <Tag key={i}>{v}</Tag>
                      ))}
                    </Space>
                  ) : typeof value === 'object' ? (
                    <Text code>{JSON.stringify(value)}</Text>
                  ) : (
                    String(value)
                  )}
                </Descriptions.Item>
              ))}
            </Descriptions>
            <Button type="link" size="small">
              View All Properties →
            </Button>
          </div>
        )}

        <Divider style={{ margin: '12px 0' }} />

        {/* Relationships */}
        <div className="detail-section">
          <Title level={5}>Relationships</Title>
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            {mockRelationships.map((rel, index) => (
              <Card key={index} size="small" className="relationship-card">
                <Space>
                  <Tag color="blue">{rel.type}</Tag>
                  <Text>→</Text>
                  <Text strong>{rel.target}</Text>
                  <Tag>{rel.targetType}</Tag>
                </Space>
              </Card>
            ))}
          </Space>
          <Button type="link" size="small" icon={<ShareAltOutlined />}>
            View in Graph →
          </Button>
        </div>

        <Divider style={{ margin: '12px 0' }} />

        {/* Activity Timeline */}
        <div className="detail-section">
          <Title level={5}>
            <HistoryOutlined style={{ marginRight: 8 }} />
            Activity
          </Title>
          <Timeline
            items={mockActivities.map((activity) => ({
              children: (
                <div className="timeline-item">
                  <Text strong>{activity.action}</Text>
                  {activity.field && (
                    <Text type="secondary"> field &quot;{activity.field}&quot;</Text>
                  )}
                  <br />
                  {activity.oldValue && activity.newValue && (
                    <Text type="secondary">
                      {activity.oldValue} → {activity.newValue}
                    </Text>
                  )}
                  <br />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    by {activity.user} · {getRelativeTime(activity.timestamp)}
                  </Text>
                </div>
              ),
            }))}
          />
        </div>

        <Divider style={{ margin: '12px 0' }} />

        {/* Actions */}
        <div className="detail-section">
          <Space direction="vertical" style={{ width: '100%' }}>
            <Button type="primary" block icon={<EditOutlined />}>
              Edit
            </Button>
            <Button block icon={<CopyOutlined />}>
              Duplicate
            </Button>
            <Button block icon={<LinkOutlined />}>
              Copy Link
            </Button>
            <Button block danger icon={<DeleteOutlined />}>
              Delete
            </Button>
          </Space>
        </div>
      </Card>
    </div>
  );
};

export default DetailPanel;
