/**
 * Error Boundary Component
 * 错误边界组件 - 捕获子组件渲染错误
 */

import React, { Component, ReactNode } from 'react';
import { Result, Button } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

/**
 * 错误边界组件
 * 捕获子组件的 JavaScript 错误，防止整个应用崩溃
 */
class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // 可以在这里记录错误日志到服务端
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Result
          status="error"
          title="页面渲染出错"
          subTitle={this.state.error?.message || '发生了未知错误，请刷新页面重试'}
          extra={
            <Button
              type="primary"
              icon={<ReloadOutlined />}
              onClick={this.handleReset}
            >
              重新加载
            </Button>
          }
        />
      );
    }

    return this.props.children;
  }
}

export { ErrorBoundary };
export default ErrorBoundary;
