/**
 * App Component
 * 应用根组件 - Indigo–Violet 统一设计系统
 */

import { ConfigProvider, App as AntApp } from 'antd';
import { RouterProvider } from 'react-router-dom';
import { useEffect } from 'react';
import { router } from './routes';
import { useThemeStore, initTheme } from './stores/themeStore';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';

import './styles/unified-design-system.less';

function App() {
  const currentTheme = useThemeStore((s) => s.currentTheme);
  const followSystem = useThemeStore((s) => s.followSystem);
  const getAntdTheme = useThemeStore((s) => s.getAntdTheme);
  const getEffectiveTheme = useThemeStore((s) => s.getEffectiveTheme);
  const applyTheme = useThemeStore((s) => s.applyTheme);

  const effectiveTheme = getEffectiveTheme();

  useEffect(() => {
    initTheme();
  }, []);

  useEffect(() => {
    applyTheme();
  }, [currentTheme, followSystem, applyTheme]);

  return (
    <ErrorBoundary>
      <ConfigProvider key={effectiveTheme} theme={getAntdTheme()}>
        <AntApp>
          <RouterProvider router={router} />
        </AntApp>
      </ConfigProvider>
    </ErrorBoundary>
  );
}

export default App;
