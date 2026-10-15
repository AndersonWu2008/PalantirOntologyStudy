/**
 * Login Page
 * Split-screen layout with dark theme, PaperWork/Linear inspired aesthetic
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Form, Input, Button, Checkbox, Alert } from 'antd';
import { MailOutlined, LockOutlined, UserOutlined } from '@ant-design/icons';
import { useAuthStore } from '@/stores/authStore';
import { ThemeSwitcher } from '@/components/common/ThemeSwitcher';
import './index.less';

interface LoginFormValues {
  email: string;
  password: string;
  username?: string;
  fullName?: string;
  remember?: boolean;
}

interface LocationState {
  from?: {
    pathname: string;
  };
}

// Dev mode credentials
const DEV_EMAIL = 'admin@example.com';
const DEV_PASSWORD = 'admin123';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isLoading, error, clearError, isAuthenticated } = useAuthStore();

  const [isRegister, setIsRegister] = useState(false);
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  const from = (location.state as LocationState | null)?.from?.pathname || '/';
  const isDev = import.meta.env.DEV;

  // Auto-fill credentials in development mode
  useEffect(() => {
    if (isDev) {
      form.setFieldsValue({ email: DEV_EMAIL, password: DEV_PASSWORD });
    }
  }, [isDev, form]);

  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);

  useEffect(() => {
    return () => {
      clearError();
    };
  }, [clearError]);

  const toggleMode = () => {
    setIsRegister(!isRegister);
    clearError();
  };

  const handleSubmit = async (values: LoginFormValues) => {
    setSubmitting(true);
    try {
      await login(values.email, values.password);
    } catch {
      // Error handled in authStore
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      {/* Left Side - Visual Panel (PaperWork Style) */}
      <div className="login-visual-side">
        <div className="login-visual-grid" aria-hidden />
        <div className="login-visual-beam" aria-hidden />
        <div className="login-visual-content">
          {/* Gradient Logo */}
          <div className="login-visual-logo">
            <div className="login-visual-logo-circle">
              <span>O</span>
            </div>
            <span className="login-visual-logo-text">Ontology</span>
          </div>

          {/* Tagline */}
          <div className="login-visual-tagline">
            <h1>Build intelligent ontology with AI</h1>
            <p>Recursive feature engineering and automated data pipeline management</p>
          </div>

          {/* Feature highlights */}
          <div className="login-visual-features">
            <div className="feature-item">
              <div className="feature-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                  <path d="M2 17l10 5 10-5"/>
                  <path d="M2 12l10 5 10-5"/>
                </svg>
              </div>
              <div className="feature-text">
                <h3>Object types</h3>
                <p>Define objects, properties, and link types</p>
              </div>
            </div>
            <div className="feature-item">
              <div className="feature-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M12 1v6m0 6v10"/>
                  <path d="M21 12h-6m-6 0H1"/>
                </svg>
              </div>
              <div className="feature-text">
                <h3>Workshop</h3>
                <p>Hand a decision to a person, then record what they did</p>
              </div>
            </div>
            <div className="feature-item">
              <div className="feature-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                </svg>
              </div>
              <div className="feature-text">
                <h3>Actions</h3>
                <p>Submit a decision only when the criteria hold</p>
              </div>
            </div>
          </div>
        </div>

        {/* Grain texture overlay */}
        <div className="grain-overlay" />
      </div>

      {/* Right Side - Form */}
      <div className="login-form-side">
        <div className="login-form-container">
          <div className="login-theme-row">
            <ThemeSwitcher mode="button" size="small" />
          </div>
          {/* Logo */}
          <div className="login-logo">
            <div className="login-logo-icon">
              <span>O</span>
            </div>
            <span className="login-logo-text">Ontology</span>
          </div>

          {/* Dev Mode Badge */}
          {isDev && (
            <div className="dev-badge">
              <span className="dev-badge__dot" />
              Development Mode
            </div>
          )}

          {/* Title */}
          <div className="login-title-section">
            <h2>{isRegister ? 'Create Account' : 'Welcome back'}</h2>
            <p>{isRegister ? 'Enter your details to get started.' : 'Enter your credentials to access your workspace.'}</p>
          </div>

          {/* Error Alert */}
          {(error || isLoading) && (
            <Alert
              message={error || 'Signing in...'}
              type={error ? 'error' : 'info'}
              showIcon
              className="login-alert"
              closable
              onClose={clearError}
            />
          )}

          {/* Form */}
          <Form
            form={form}
            name="login"
            onFinish={handleSubmit}
            layout="vertical"
            requiredMark={false}
            size="large"
            className="login-form"
          >
            {isRegister && (
              <>
                <Form.Item
                  name="fullName"
                  rules={[{ required: true, message: 'Please enter your full name' }]}
                >
                  <Input
                    prefix={<UserOutlined className="form-icon" />}
                    placeholder="Full Name"
                    autoComplete="name"
                  />
                </Form.Item>

                <Form.Item
                  name="username"
                  rules={[{ required: true, message: 'Please choose a username' }]}
                >
                  <Input
                    prefix={<UserOutlined className="form-icon" />}
                    placeholder="Username"
                    autoComplete="username"
                  />
                </Form.Item>
              </>
            )}

            <Form.Item
              name="email"
              rules={[
                { required: true, message: 'Please enter your email' },
                { type: 'email', message: 'Please enter a valid email' },
              ]}
            >
              <Input
                prefix={<MailOutlined className="form-icon" />}
                placeholder="Email address"
                autoComplete="email"
              />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[
                { required: true, message: 'Please enter your password' },
                { min: 6, message: 'Password must be at least 6 characters' },
              ]}
            >
              <Input.Password
                prefix={<LockOutlined className="form-icon" />}
                placeholder="Password"
                autoComplete={isRegister ? 'new-password' : 'current-password'}
              />
            </Form.Item>

            {!isRegister && (
              <div className="login-options">
                <Form.Item name="remember" valuePropName="checked" noStyle>
                  <Checkbox>Remember me</Checkbox>
                </Form.Item>
                <a href="#" className="login-forgot">Forgot password?</a>
              </div>
            )}

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={submitting || isLoading}
                block
                className="login-submit-btn"
              >
                {isRegister ? 'Sign Up' : 'Sign In'}
              </Button>
            </Form.Item>
          </Form>

          {/* Divider */}
          <div className="login-divider">
            <span>Or continue with</span>
          </div>

          {/* SSO Buttons */}
          <div className="login-sso">
            <Button className="sso-btn">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Google
            </Button>
            <Button className="sso-btn">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              GitHub
            </Button>
          </div>

          {/* Toggle */}
          <p className="login-toggle-text">
            {isRegister ? 'Already have an account?' : "Don't have an account?"}
            <a href="#" onClick={(e) => { e.preventDefault(); toggleMode(); }}>
              {isRegister ? ' Log in' : ' Sign up'}
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
