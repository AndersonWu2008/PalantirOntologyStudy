/**
 * Documents Types
 * 文档模块类型定义
 */

/** 文档 */
export interface Document {
  id: string;
  name: string;
  type: string;
  folder: string;
  modifiedAt: string;
}

/** 文件夹 */
export interface Folder {
  id: string;
  name: string;
  parentFolder: string;
  documentCount: number;
}

/** 文件元数据 */
export interface FileMetadata {
  id: string;
  name: string;
  type: string;
  size: string;
  folder: string;
  uploadedBy: string;
  uploadedAt: string;
  status: 'active' | 'archived';
}

/** 事件类型 */
export interface EventType {
  id: string;
  name: string;
  code: string;
  category: string;
  description: string;
  schema: string;
  status: 'active' | 'deprecated';
  createdAt: string;
}

/** 事件日志 */
export interface EventLog {
  id: string;
  eventType: string;
  description: string;
  user: string;
  timestamp: string;
}
