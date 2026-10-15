/**
 * Skeleton Component
 * Loading placeholder with shimmer animation
 */

import React from 'react';
import './Skeleton.less';

interface SkeletonProps {
  /** Width of skeleton */
  width?: string | number;
  /** Height of skeleton */
  height?: string | number;
  /** Border radius */
  borderRadius?: string | number;
  /** Additional class name */
  className?: string;
  /** Whether to show animation */
  animate?: boolean;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width,
  height,
  borderRadius = '6px',
  className = '',
  animate = true,
}) => {
  const style: React.CSSProperties = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
    borderRadius: typeof borderRadius === 'number' ? `${borderRadius}px` : borderRadius,
  };

  return (
    <div
      className={`skeleton ${animate ? 'skeleton--animate' : ''} ${className}`}
      style={style}
    />
  );
};

interface SkeletonTextProps {
  /** Number of lines */
  rows?: number;
  /** Width of last line (percentage) */
  lastLineWidth?: string | number;
  className?: string;
}

export const SkeletonText: React.FC<SkeletonTextProps> = ({
  rows = 3,
  lastLineWidth = '60%',
  className = '',
}) => {
  return (
    <div className={`skeleton-text-wrapper ${className}`}>
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton
          key={index}
          height={14}
          width={index === rows - 1 ? lastLineWidth : '100%'}
        />
      ))}
    </div>
  );
};

interface SkeletonCardProps {
  /** Show avatar */
  avatar?: boolean;
  /** Show title */
  title?: boolean;
  /** Show description lines */
  description?: boolean;
  className?: string;
}

export const SkeletonCard: React.FC<SkeletonCardProps> = ({
  avatar = false,
  title = true,
  description = true,
  className = '',
}) => {
  return (
    <div className={`skeleton-card ${className}`}>
      {avatar && <Skeleton width={40} height={40} borderRadius="50%" className="skeleton-card__avatar" />}
      {title && <Skeleton height={20} width="60%" className="skeleton-card__title" />}
      {description && (
        <div className="skeleton-card__description">
          <SkeletonText rows={2} />
        </div>
      )}
    </div>
  );
};

export default Skeleton;
