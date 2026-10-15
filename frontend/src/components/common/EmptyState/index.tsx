/**
 * Empty State Component
 * Friendly placeholder when no content is available
 */

import React from 'react';
import { Button } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import './EmptyState.less';

interface EmptyStateProps {
  /** Icon to display (use SVG/Lucide icon, not emoji) */
  icon?: React.ReactNode;
  /** Title text */
  title: string;
  /** Description text */
  description?: string;
  /** Primary action button text */
  actionText?: string;
  /** Primary action callback */
  onAction?: () => void;
  /** Secondary action callback */
  secondaryActionText?: string;
  /** Secondary action callback */
  onSecondaryAction?: () => void;
  /** Additional class name */
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionText,
  onAction,
  secondaryActionText,
  onSecondaryAction,
  className = '',
}) => {
  return (
    <div className={`empty-state ${className}`}>
      {icon && <div className="empty-state__icon">{icon}</div>}
      <h3 className="empty-state__title">{title}</h3>
      {description && <p className="empty-state__description">{description}</p>}
      {(actionText || secondaryActionText) && (
        <div className="empty-state__actions">
          {actionText && (
            <Button type="primary" onClick={onAction} icon={<PlusOutlined />}>
              {actionText}
            </Button>
          )}
          {secondaryActionText && (
            <Button onClick={onSecondaryAction}>{secondaryActionText}</Button>
          )}
        </div>
      )}
    </div>
  );
};

// Preset empty states for common scenarios
export const NoDataEmptyState: React.FC<{
  onAction?: () => void;
  className?: string;
}> = ({ onAction, className }) => (
  <EmptyState
    icon={
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    }
    title="No data yet"
    description="Start by adding some data to see it appear here."
    actionText="Add Data"
    onAction={onAction}
    className={className}
  />
);

export const NoResultsEmptyState: React.FC<{
  onClearFilters?: () => void;
  className?: string;
}> = ({ onClearFilters, className }) => (
  <EmptyState
    icon={
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="11" cy="11" r="8" />
        <path d="M21 21l-4.35-4.35" />
        <path d="M8 8l6 6M14 8l-6 6" />
      </svg>
    }
    title="No results found"
    description="Try adjusting your search or filter criteria."
    actionText="Clear Filters"
    onAction={onClearFilters}
    className={className}
  />
);

export const ErrorEmptyState: React.FC<{
  onRetry?: () => void;
  className?: string;
}> = ({ onRetry, className }) => (
  <EmptyState
    icon={
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v4M12 16h.01" />
      </svg>
    }
    title="Something went wrong"
    description="We couldn't load this content. Please try again."
    actionText="Retry"
    onAction={onRetry}
    className={className}
  />
);

export default EmptyState;
