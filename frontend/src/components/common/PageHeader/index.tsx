/**
 * PageHeader Component
 * 页面标题组件，包含返回按钮、标题、描述和操作按钮
 */

import React from 'react';
import { Typography, Space, Button } from 'antd';
import { LeftOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import './PageHeader.less';

const { Title, Text } = Typography;

export interface PageHeaderProps {
  title: string;
  description?: string;
  backLink?: string;
  actions?: React.ReactNode;
  showBack?: boolean;
  icon?: React.ReactNode;
}

/**
 * PageHeader - 页面标题组件
 *
 * 结构:
 * ┌─────────────────────────────────────────────────────────────┐
 * │ [← Back]  Page Title                    [Actions ▼]      │
 * │ Description text here                                        │
 * └─────────────────────────────────────────────────────────────┘
 */
export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  backLink,
  actions,
  showBack = true,
  icon,
}) => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (backLink) {
      navigate(backLink);
    } else {
      navigate(-1);
    }
  };

  return (
    <div className="page-header">
      <div className="page-header-main">
        {showBack && (
          <Button
            type="text"
            icon={<LeftOutlined />}
            onClick={handleBack}
            className="back-button"
          />
        )}
        <div className="page-header-content">
          {icon && <span className="page-header-icon">{icon}</span>}
          <Title level={4} className="page-header-title">
            {title}
          </Title>
          {description && (
            <Text className="page-header-description">{description}</Text>
          )}
        </div>
      </div>
      {actions && <Space className="page-header-actions">{actions}</Space>}
    </div>
  );
};

export default PageHeader;
