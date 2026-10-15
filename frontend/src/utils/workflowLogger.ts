/**
 * WorkflowLogger - 工作流日志系统
 *
 * 记录工作流的完整执行过程，便于调试、审计和故障排查
 * 支持控制台输出和持久化存储
 */

// ========================================
// Types
// ========================================

/** 日志级别 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/** 日志类别 */
export type LogCategory = 
  | 'workflow_init'
  | 'step_transition'
  | 'api_call'
  | 'data_update'
  | 'error'
  | 'user_action'
  | 'system';

/** 日志条目 */
export interface LogEntry {
  /** 唯一ID */
  id: string;
  
  /** 时间戳 */
  timestamp: number;
  
  /** 日志级别 */
  level: LogLevel;
  
  /** 日志类别 */
  category: LogCategory;
  
  /** 工作流类型 */
  workflowType?: 'start_node' | 'process_node';
  
  /** 工作流ID */
  workflowId?: string;
  
  /** 当前步骤 */
  step?: string;
  
  /** 日志消息 */
  message: string;
  
  /** 附加数据 */
  data?: Record<string, any>;
  
  /** 错误堆栈 */
  stackTrace?: string;
  
  /** 耗时（毫秒） */
  duration?: number;
}

/** 日志配置 */
export interface LoggerConfig {
  /** 最小日志级别 */
  minLevel: LogLevel;
  
  /** 是否启用控制台输出 */
  enableConsole: boolean;
  
  /** 是否启用持久化 */
  enablePersistence: boolean;
  
  /** 最大日志条目数 */
  maxEntries: number;
  
  /** 是否包含堆栈跟踪 */
  includeStackTrace: boolean;
}

// ========================================
// Configuration
// ========================================

const DEFAULT_CONFIG: LoggerConfig = {
  minLevel: 'info',
  enableConsole: true,
  enablePersistence: true,
  maxEntries: 1000,
  includeStackTrace: true,
};

const LOG_STORAGE_KEY = 'workflow_logs_v1';

// ========================================
// Logger Class
// ========================================

class WorkflowLogger {
  private config: LoggerConfig;
  private logs: LogEntry[] = [];
  private workflowId: string | null = null;
  private workflowType: 'start_node' | 'process_node' | null = null;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.loadFromStorage();
  }

  // ========================================
  // Initialization
  // ========================================

  /**
   * 初始化工作流日志
   */
  initWorkflow(type: 'start_node' | 'process_node', id: string): void {
    this.workflowType = type;
    this.workflowId = id;
    
    this.info('workflow_init', `工作流初始化: ${type}`, {
      workflowId: id,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * 清理工作流日志
   */
  clearWorkflow(): void {
    this.workflowId = null;
    this.workflowType = null;
  }

  // ========================================
  // Logging Methods
  // ========================================

  /**
   * 记录调试日志
   */
  debug(category: LogCategory, message: string, data?: Record<string, any>): void {
    this.log('debug', category, message, data);
  }

  /**
   * 记录信息日志
   */
  info(category: LogCategory, message: string, data?: Record<string, any>): void {
    this.log('info', category, message, data);
  }

  /**
   * 记录警告日志
   */
  warn(category: LogCategory, message: string, data?: Record<string, any>): void {
    this.log('warn', category, message, data);
  }

  /**
   * 记录错误日志
   */
  error(category: LogCategory, message: string, error?: Error, data?: Record<string, any>): void {
    this.log('error', category, message, {
      ...data,
      errorMessage: error?.message,
      stackTrace: this.config.includeStackTrace ? error?.stack : undefined,
    });
  }

  /**
   * 记录步骤转换
   */
  logStepTransition(fromStep: string, toStep: string, data?: Record<string, any>): void {
    this.info('step_transition', `步骤转换: ${fromStep} -> ${toStep}`, {
      fromStep,
      toStep,
      ...data,
    });
  }

  /**
   * 记录API调用
   */
  logApiCall(apiName: string, params: any, startTime: number, success: boolean, response?: any): void {
    const duration = Date.now() - startTime;
    const level = success ? 'info' : 'error';
    
    this.log(level, 'api_call', `API调用: ${apiName} ${success ? '成功' : '失败'}`, {
      apiName,
      params: this.sanitizeParams(params),
      duration,
      success,
      response: success ? this.truncateData(response) : undefined,
    });
  }

  /**
   * 记录数据更新
   */
  logDataUpdate(entityType: string, action: 'create' | 'update' | 'delete', entityId: string, data?: any): void {
    this.info('data_update', `数据更新: ${entityType} ${action}`, {
      entityType,
      action,
      entityId,
      data: this.truncateData(data),
    });
  }

  /**
   * 记录用户操作
   */
  logUserAction(action: string, target: string, data?: Record<string, any>): void {
    this.info('user_action', `用户操作: ${action}`, {
      action,
      target,
      ...data,
    });
  }

  // ========================================
  // Core Logging
  // ========================================

  private log(level: LogLevel, category: LogCategory, message: string, data?: Record<string, any>): void {
    // 检查日志级别
    if (!this.shouldLog(level)) {
      return;
    }

    const entry: LogEntry = {
      id: this.generateId(),
      timestamp: Date.now(),
      level,
      category,
      workflowType: this.workflowType || undefined,
      workflowId: this.workflowId || undefined,
      message,
      data,
    };

    // 添加到内存
    this.logs.push(entry);

    // 限制日志数量
    if (this.logs.length > this.config.maxEntries) {
      this.logs = this.logs.slice(-this.config.maxEntries);
    }

    // 控制台输出
    if (this.config.enableConsole) {
      this.outputToConsole(entry);
    }

    // 持久化
    if (this.config.enablePersistence) {
      this.saveToStorage();
    }
  }

  // ========================================
  // Query Methods
  // ========================================

  /**
   * 获取所有日志
   */
  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  /**
   * 按级别筛选日志
   */
  getLogsByLevel(level: LogLevel): LogEntry[] {
    return this.logs.filter(log => log.level === level);
  }

  /**
   * 按类别筛选日志
   */
  getLogsByCategory(category: LogCategory): LogEntry[] {
    return this.logs.filter(log => log.category === category);
  }

  /**
   * 获取当前工作流的日志
   */
  getCurrentWorkflowLogs(): LogEntry[] {
    if (!this.workflowId) return [];
    return this.logs.filter(log => log.workflowId === this.workflowId);
  }

  /**
   * 获取最近的日志
   */
  getRecentLogs(count: number = 10): LogEntry[] {
    return this.logs.slice(-count);
  }

  /**
   * 获取日志统计
   */
  getStats(): {
    total: number;
    byLevel: Record<LogLevel, number>;
    byCategory: Record<LogCategory, number>;
    errors: number;
  } {
    const stats = {
      total: this.logs.length,
      byLevel: { debug: 0, info: 0, warn: 0, error: 0 },
      byCategory: {
        workflow_init: 0,
        step_transition: 0,
        api_call: 0,
        data_update: 0,
        error: 0,
        user_action: 0,
        system: 0,
      },
      errors: 0,
    };

    this.logs.forEach(log => {
      stats.byLevel[log.level]++;
      stats.byCategory[log.category]++;
      if (log.level === 'error') stats.errors++;
    });

    return stats;
  }

  // ========================================
  // Export Methods
  // ========================================

  /**
   * 导出日志为JSON
   */
  exportToJSON(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  /**
   * 导出当前工作流日志
   */
  exportCurrentWorkflowToJSON(): string {
    return JSON.stringify(this.getCurrentWorkflowLogs(), null, 2);
  }

  /**
   * 导出日志为文本
   */
  exportToText(): string {
    return this.logs.map(log => this.formatLogEntry(log)).join('\n');
  }

  // ========================================
  // Management
  // ========================================

  /**
   * 清空日志
   */
  clear(): void {
    this.logs = [];
    localStorage.removeItem(LOG_STORAGE_KEY);
    this.info('system', '日志已清空');
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  // ========================================
  // Private Helpers
  // ========================================

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    return levels.indexOf(level) >= levels.indexOf(this.config.minLevel);
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private outputToConsole(entry: LogEntry): void {
    const timestamp = new Date(entry.timestamp).toLocaleTimeString();
    const prefix = `[${timestamp}] [${entry.level.toUpperCase()}] [${entry.category}]`;
    
    const styles: Record<LogLevel, string> = {
      debug: 'color: #666',
      info: 'color: #1890ff',
      warn: 'color: #faad14',
      error: 'color: #f5222d; font-weight: bold',
    };

    // eslint-disable-next-line no-console
    console.log(`%c${prefix}`, styles[entry.level], entry.message, entry.data || '');
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(this.logs));
    } catch (e) {
      // 存储空间不足，清理旧日志
      if (e instanceof Error && e.name === 'QuotaExceededError') {
        this.logs = this.logs.slice(-Math.floor(this.config.maxEntries / 2));
        localStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(this.logs));
      }
    }
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(LOG_STORAGE_KEY);
      if (stored) {
        this.logs = JSON.parse(stored);
      }
    } catch (e) {
      console.error('Failed to load logs from storage:', e);
    }
  }

  private formatLogEntry(entry: LogEntry): string {
    const timestamp = new Date(entry.timestamp).toISOString();
    return `[${timestamp}] [${entry.level.toUpperCase()}] ${entry.message}`;
  }

  private sanitizeParams(params: any): any {
    if (!params) return params;
    
    // 移除敏感信息
    const sensitiveKeys = ['password', 'token', 'secret', 'key'];
    const sanitized = { ...params };
    
    sensitiveKeys.forEach(key => {
      if (key in sanitized) {
        sanitized[key] = '***';
      }
    });
    
    return sanitized;
  }

  private truncateData(data: any, maxLength: number = 500): any {
    if (!data) return data;
    
    const str = JSON.stringify(data);
    if (str.length > maxLength) {
      return str.substring(0, maxLength) + '... [truncated]';
    }
    return data;
  }
}

// ========================================
// Singleton Instance
// ========================================

let loggerInstance: WorkflowLogger | null = null;

export const getWorkflowLogger = (config?: Partial<LoggerConfig>): WorkflowLogger => {
  if (!loggerInstance) {
    loggerInstance = new WorkflowLogger(config);
  }
  return loggerInstance;
};

export const resetWorkflowLogger = (): void => {
  loggerInstance = null;
};

// ========================================
// React Hook
// ========================================

import { useCallback } from 'react';

export const useWorkflowLogger = () => {
  const logger = getWorkflowLogger();

  const logStep = useCallback((step: string, message: string, data?: Record<string, any>) => {
    logger.info('step_transition', `[${step}] ${message}`, data);
  }, [logger]);

  const logApi = useCallback(async <T>(
    apiName: string,
    apiCall: () => Promise<T>,
    params?: any
  ): Promise<T> => {
    const startTime = Date.now();
    try {
      const result = await apiCall();
      logger.logApiCall(apiName, params, startTime, true, result);
      return result;
    } catch (error) {
      logger.logApiCall(apiName, params, startTime, false);
      throw error;
    }
  }, [logger]);

  const logError = useCallback((message: string, error: Error, data?: Record<string, any>) => {
    logger.error('error', message, error, data);
  }, [logger]);

  return {
    logger,
    logStep,
    logApi,
    logError,
  };
};

export default WorkflowLogger;
