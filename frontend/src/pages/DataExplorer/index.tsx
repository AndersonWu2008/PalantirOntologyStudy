/**
 * Data Explorer Page
 * Main entry point for the Data Explorer feature
 */

import React, { useEffect } from 'react';
import { Spin, Button, Result } from 'antd';
import { useSearchParams } from 'react-router-dom';
import { useDataExplorerStore } from './store';
import type { NavigatorItem } from './types';
import Navigator from './components/Navigator';
import ContentArea from './components/ContentArea';
import DetailPanel from './components/DetailPanel';
import './index.less';

function findNavigatorItem(items: NavigatorItem[], id: string): NavigatorItem | null {
  for (const item of items) {
    if (item.id === id) return item;
    if (item.children) {
      const hit = findNavigatorItem(item.children, id);
      if (hit) return hit;
    }
  }
  return null;
}

/**
 * Data Explorer 页面组件
 * 三栏布局：左侧导航 + 主内容区 + 右侧详情面板
 */
const DataExplorerPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { isLoading, error, fetchNavigatorItems, navigatorItems, selectItem, selectedItem } = useDataExplorerStore();

  useEffect(() => {
    const focus = searchParams.get('focus') ?? searchParams.get('type');
    const hint = searchParams.get('hint');
    let targetId: string | null = null;
    if (focus) {
      targetId = focus.startsWith('object-type:') ? focus : `object-type:${focus}`;
    } else if (hint?.includes('|')) {
      targetId = 'object-type:DailyBar';
    }
    if (!targetId || navigatorItems.length === 0) return;
    if (selectedItem?.id === targetId) return;
    const item = findNavigatorItem(navigatorItems, targetId);
    if (item) selectItem(item);
  }, [searchParams, navigatorItems, selectItem, selectedItem?.id]);

  // Error state - show retry option
  if (error && !isLoading) {
    return (
      <div className="data-explorer-page">
        <div className="page-error">
          <Result
            status="error"
            title="Failed to load Data Explorer"
            subTitle={error}
            extra={
              <Button type="primary" onClick={() => fetchNavigatorItems()}>
                Retry
              </Button>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="data-explorer-page">
      {isLoading ? (
        <div className="page-loading">
          <Spin size="large" tip="Loading Data Explorer..." />
        </div>
      ) : (
        <div className="data-explorer-layout">
          {/* 左侧导航面板 */}
          <div className="navigator-section">
            <Navigator />
          </div>

          {/* 主内容区域 */}
          <div className="content-section">
            <ContentArea />
          </div>

          {/* 右侧详情面板 */}
          <DetailPanel />
        </div>
      )}
    </div>
  );
};

export default DataExplorerPage;
