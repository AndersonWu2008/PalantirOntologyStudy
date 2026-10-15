/**
 * Route Guards
 * 路由守卫 - 保护需要认证的路由
 *
 * 功能:
 * - 检查用户是否已登录
 * - 未登录用户重定向到登录页
 * - 记录用户尝试访问的路径，登录后可以跳回
 */

import React, { Suspense, lazy } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Spin } from 'antd';
import { useAuthStore } from '@/stores/authStore';

// 懒加载登录页面
const LoginPage = lazy(() => import('@/pages/Login'));

/**
 * 加载中组件
 */
const LoadingFallback: React.FC = () => (
  <div
    style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      background: 'var(--color-bg)',
    }}
  >
    <Spin size="large" tip="加载中..." />
  </div>
);

/**
 * ProtectedRoute - 保护需要认证的路由
 *
 * @param children - 受保护的子组件
 * @param fallbackPath - 未登录时跳转的路径（默认: /login）
 */
interface ProtectedRouteProps {
  children: React.ReactNode;
  fallbackPath?: string;
}

/**
 * 受保护的路由组件
 * 只有登录用户才能访问
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  fallbackPath = '/login',
}) => {
  const location = useLocation();
  const { isAuthenticated, isLoading } = useAuthStore();

  // 开发模式：跳过认证检查 (Vite replaces import.meta.env.DEV at build time)
  // In production builds, this code path is completely removed
  if (import.meta.env.DEV) {
    console.warn('[DEV MODE] Route guard bypass active - authentication disabled in development');
    return <>{children}</>;
  }

  // 如果正在检查认证状态，显示加载中
  if (isLoading) {
    return <LoadingFallback />;
  }

  // 如果未登录，重定向到登录页，并记录当前路径
  if (!isAuthenticated) {
    return (
      <Navigate
        to={fallbackPath}
        state={{ from: location }}
        replace
      />
    );
  }

  // 已登录，渲染受保护的内容
  return <>{children}</>;
};

/**
 * PublicRoute - 公共路由
 *
 * 已登录用户访问公共路由（如登录页）时，跳转到首页
 */
interface PublicRouteProps {
  children: React.ReactNode;
  redirectTo?: string;
}

/**
 * 公共路由组件
 * 已登录用户不应该访问的路由（如登录页）
 */
export const PublicRoute: React.FC<PublicRouteProps> = ({
  children,
  redirectTo = '/',
}) => {
  const location = useLocation();
  const { isAuthenticated, isLoading } = useAuthStore();

  // 如果正在检查认证状态，显示加载中
  if (isLoading) {
    return <LoadingFallback />;
  }

  // 如果已登录，跳转到首页或指定路径
  if (isAuthenticated) {
    // 检查是否是从其他页面跳转过来的
    const from = (location.state as any)?.from?.pathname;
    // 如果是从受保护页面跳转过来，跳回原页面；否则跳转到首页
    const targetPath = from && from !== '/login' ? from : redirectTo;

    return (
      <Navigate
        to={targetPath}
        replace
      />
    );
  }

  // 未登录，渲染公共内容（如登录页）
  return <>{children}</>;
};

/**
 * GuestRoute - 访客路由
 *
 * 只有未登录用户才能访问
 * 已登录用户会被重定向
 */
interface GuestRouteProps {
  children: React.ReactNode;
  redirectTo?: string;
}

/**
 * 访客路由组件
 * 与 PublicRoute 功能相同，语义更明确
 */
export const GuestRoute: React.FC<GuestRouteProps> = ({
  children,
  redirectTo = '/',
}) => {
  return (
    <PublicRoute redirectTo={redirectTo}>
      {children}
    </PublicRoute>
  );
};

/**
 * LazyLoginPage - 懒加载的登录页
 * 用于需要动态导入登录页的场景
 */
export const LazyLoginPage: React.FC = () => {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <LoginPage />
    </Suspense>
  );
};

/**
 * createProtectedRoute - 创建受保护路由的工厂函数
 *
 * @param fallbackPath - 未登录时的跳转路径
 */
export const createProtectedRoute = (fallbackPath?: string) => {
  const ProtectedRouteWrapper = (props: Omit<ProtectedRouteProps, 'fallbackPath'>) => (
    <ProtectedRoute fallbackPath={fallbackPath} {...props} />
  );
  ProtectedRouteWrapper.displayName = 'ProtectedRouteWrapper';
  return ProtectedRouteWrapper;
};

/**
 * createPublicRoute - 创建公共路由的工厂函数
 *
 * @param redirectTo - 已登录用户时的跳转路径
 */
export const createPublicRoute = (redirectTo?: string) => {
  const PublicRouteWrapper = (props: Omit<PublicRouteProps, 'redirectTo'>) => (
    <PublicRoute redirectTo={redirectTo} {...props} />
  );
  PublicRouteWrapper.displayName = 'PublicRouteWrapper';
  return PublicRouteWrapper;
};

export default {
  ProtectedRoute,
  PublicRoute,
  GuestRoute,
  LazyLoginPage,
  createProtectedRoute,
  createPublicRoute,
};
