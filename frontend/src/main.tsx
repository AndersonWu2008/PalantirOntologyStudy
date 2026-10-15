/**
 * Main Entry Point
 * 应用渲染入口
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import './i18n'; // 国际化配置

/**
 * 创建 QueryClient 实例
 * 配置 React Query 全局选项
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 数据缓存时间（毫秒）
      staleTime: 1000 * 60 * 5, // 5 分钟
      // 失败重试次数
      retry: 1,
      // 窗口重新聚焦时是否重新获取数据
      refetchOnWindowFocus: false,
      // 网络重连时是否重新获取数据
      refetchOnReconnect: true,
    },
    mutations: {
      // 失败重试次数
      retry: 0,
    },
  },
});

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
);
