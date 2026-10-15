/**
 * DataCard Component
 * 数据卡片组件，用于展示列表视图中的卡片项
 */

import React from 'react';
import { Card, Button, Space } from 'antd';
import './DataCard.less';

export interface DataCardProps {
  title: string;
  subtitle?: string;
  content?: React.ReactNode;
  actions?: {
    key: string;
    label: string;
    onClick: () => void;
  }[];
  onClick?: () => void;
  loading?: boolean;
}

/**
 * DataCard - 数据卡片组件
 *
 * 结构:
 * ┌─────────────┐
 * │   Title    │
 * │  ─────────  │
 * │  Subtitle  │
 * │            │
 * │  [Action]  │
 * └─────────────┘
 */
export const DataCard: React.FC<DataCardProps> = ({
  title,
  subtitle,
  content,
  actions,
  onClick,
  loading = false,
}) => {
  return (
    <Card
      className="data-card"
      hoverable={!!onClick}
      onClick={onClick}
      loading={loading}
    >
      <div className="data-card-header">
        <h3 className="data-card-title">{title}</h3>
        {subtitle && <p className="data-card-subtitle">{subtitle}</p>}
      </div>

      {content && <div className="data-card-content">{content}</div>}

      {actions && actions.length > 0 && (
        <div className="data-card-actions">
          <Space>
            {actions.map((action) => (
              <Button
                key={action.key}
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  action.onClick();
                }}
              >
                {action.label}
              </Button>
            ))}
          </Space>
        </div>
      )}
    </Card>
  );
};

export default DataCard;
