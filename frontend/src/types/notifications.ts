/**
 * Notifications Types
 * 通知模块类型定义
 */

/** 通知 */
export interface Notification {
  id: string;
  title: string;
  type: string;
  status: string;
  createdAt: string;
}

/** 通知模板 */
export interface NotificationTemplate {
  id: string;
  name: string;
  channel: 'email' | 'sms' | 'push' | 'webhook';
  subject: string;
  eventType: string;
  status: 'active' | 'draft';
  lastModified: string;
}

/** Webhook */
export interface Webhook {
  id: string;
  name: string;
  url: string;
  eventType: string;
  status: string;
}
