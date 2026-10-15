/**
 * LocalStorage 管理器
 * 统一管理所有 localStorage 操作，提供类型安全、命名空间隔离、自动清理等功能
 */

import {
  StorageNamespace,
  WizardType,
  StorageOptions,
  StorageWrapper,
  StorageStats,
  STORAGE_KEYS,
} from './constants';

export class LocalStorageManager {
  private static instance: LocalStorageManager;
  private prefix: string = 'ontology_';

  private constructor() {}

  static getInstance(): LocalStorageManager {
    if (!LocalStorageManager.instance) {
      LocalStorageManager.instance = new LocalStorageManager();
    }
    return LocalStorageManager.instance;
  }

  // ========== 基础操作 ==========

  /**
   * 设置值
   */
  set<T>(key: string, value: T, options?: StorageOptions): void {
    const fullKey = this.getFullKey(key);
    const data: StorageWrapper<T> = {
      version: '1.0.0',
      timestamp: Date.now(),
      expiresAt: options?.ttl ? Date.now() + options.ttl : undefined,
      data: value,
    };

    try {
      localStorage.setItem(fullKey, JSON.stringify(data));
    } catch (e) {
      console.error(`Failed to set ${key}:`, e);
      throw new StorageError(`Failed to set ${key}: ${(e as Error).message}`);
    }
  }

  /**
   * 获取值
   */
  get<T>(key: string): T | null {
    const fullKey = this.getFullKey(key);

    try {
      const raw = localStorage.getItem(fullKey);
      if (!raw) return null;

      const wrapper: StorageWrapper<T> = JSON.parse(raw);

      // 检查是否过期
      if (wrapper.expiresAt && Date.now() > wrapper.expiresAt) {
        this.remove(key);
        return null;
      }

      return wrapper.data;
    } catch (e) {
      console.error(`Failed to get ${key}:`, e);
      return null;
    }
  }

  /**
   * 删除值
   */
  remove(key: string): void {
    const fullKey = this.getFullKey(key);
    localStorage.removeItem(fullKey);
  }

  /**
   * 检查是否存在
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  // ========== 批量操作 ==========

  /**
   * 根据命名空间清除
   */
  clearByNamespace(namespace: StorageNamespace): void {
    const keys = this.getAllKeys();
    keys.forEach((key) => {
      if (key.startsWith(`${this.prefix}${namespace}`)) {
        localStorage.removeItem(key);
      }
    });
  }

  /**
   * 清除所有 Wizard 相关数据
   */
  clearAllWizardData(): void {
    this.clearByNamespace(StorageNamespace.WIZARD);
  }

  /**
   * 清除所有 Workflow 相关数据
   */
  clearAllWorkflowData(): void {
    this.clearByNamespace(StorageNamespace.WORKFLOW);
  }

  /**
   * 清除所有 Scanner 相关数据
   */
  clearAllScannerData(): void {
    this.clearByNamespace(StorageNamespace.SCANNER);
  }

  /**
   * 清除所有数据（慎用）
   */
  clearAll(): void {
    const keys = this.getAllKeys();
    keys.forEach((key) => localStorage.removeItem(key));
  }

  // ========== Wizard 相关操作 ==========

  /**
   * 清理指定 Wizard 的数据
   */
  clearWizardData(wizardType: WizardType): void {
    this.remove(`wizard_${wizardType}_state`);
    this.remove(`wizard_${wizardType}_data`);
    this.remove(`wizard_${wizardType}_draft`);
  }

  /**
   * 清理所有 Wizard 数据
   */
  clearAllWizardStorage(): void {
    const wizardTypes: WizardType[] = [
      'metaEntity',
      'classEntity',
      'metaRelation',
      'classRelation',
    ];
    wizardTypes.forEach((type) => this.clearWizardData(type));
  }

  // ========== Workflow 相关操作 ==========

  /**
   * 清理所有 Workflow Context
   */
  clearAllWorkflowContexts(): void {
    this.remove(STORAGE_KEYS.WORKFLOW_START_NODE_CONTEXT);
    this.remove(STORAGE_KEYS.WORKFLOW_PROCESS_NODE_CONTEXT);
  }

  /**
   * 流程完成后的清理
   */
  onWorkflowComplete(): void {
    this.clearAllWizardStorage();
    this.clearAllWorkflowContexts();
    // scanner_* 数据保留
  }

  /**
   * Blueprint 切换时的清理
   */
  onBlueprintChange(newBlueprintRid: string): void {
    const currentBlueprint = this.get<string>(
      STORAGE_KEYS.SCANNER_CURRENT_BLUEPRINT
    );
    if (currentBlueprint && currentBlueprint !== newBlueprintRid) {
      // 清理画布状态
      this.remove(STORAGE_KEYS.SCANNER_CANVAS_STATE);
      // 清理执行状态
      this.remove(STORAGE_KEYS.SCANNER_EXECUTION_STATE);
      // 清理 Workflow 和 Wizard 数据
      this.clearAllWorkflowContexts();
      this.clearAllWizardStorage();
    }
    this.set(STORAGE_KEYS.SCANNER_CURRENT_BLUEPRINT, newBlueprintRid);
  }

  /**
   * 开始新执行时的清理
   */
  onStartNewExecution(): void {
    // 清理执行状态
    this.remove(STORAGE_KEYS.SCANNER_EXECUTION_STATE);
    // 清理 Workflow 和 Wizard 数据
    this.clearAllWorkflowContexts();
    this.clearAllWizardStorage();
  }

  // ========== 草稿相关操作 ==========

  /**
   * 保存草稿
   */
  saveDraft<T>(wizardType: WizardType, data: T, ttl?: number): void {
    const draftKey = `wizard_${wizardType}_draft`;
    this.set(draftKey, data, { ttl: ttl || 24 * 60 * 60 * 1000 }); // 默认24小时
  }

  /**
   * 获取草稿
   */
  getDraft<T>(wizardType: WizardType): T | null {
    const draftKey = `wizard_${wizardType}_draft`;
    return this.get<T>(draftKey);
  }

  /**
   * 清理过期草稿
   */
  cleanupExpiredDrafts(): void {
    const draftPattern = /^ontology_wizard_.*_draft$/;

    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && draftPattern.test(key)) {
        try {
          const raw = localStorage.getItem(key);
          if (raw) {
            const draft: StorageWrapper<unknown> = JSON.parse(raw);
            if (draft.expiresAt && Date.now() > draft.expiresAt) {
              localStorage.removeItem(key);
              console.log(`Cleaned up expired draft: ${key}`);
            }
          }
        } catch (e) {
          localStorage.removeItem(key);
        }
      }
    }
  }

  // ========== 工具方法 ==========

  /**
   * 获取所有键
   */
  getAllKeys(): string[] {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(this.prefix)) {
        keys.push(key);
      }
    }
    return keys;
  }

  /**
   * 获取存储统计
   */
  getStats(): StorageStats {
    const keys = this.getAllKeys();
    const stats: StorageStats = {
      totalKeys: keys.length,
      byNamespace: {},
      totalSize: 0,
    };

    keys.forEach((key) => {
      const value = localStorage.getItem(key) || '';
      stats.totalSize += value.length * 2; // UTF-16 encoding

      const parts = key.replace(this.prefix, '').split('_');
      const namespace = parts[0];
      if (namespace) {
        stats.byNamespace[namespace] = (stats.byNamespace[namespace] || 0) + 1;
      }
    });

    return stats;
  }

  /**
   * 获取所有存储内容（用于调试）
   */
  getAllContents(): Record<string, unknown> {
    const contents: Record<string, unknown> = {};
    const keys = this.getAllKeys();

    keys.forEach((key) => {
      const shortKey = key.replace(this.prefix, '');
      const value = this.get(shortKey);
      if (value !== null) {
        contents[shortKey] = value;
      }
    });

    return contents;
  }

  // ========== 私有方法 ==========

  private getFullKey(key: string): string {
    return `${this.prefix}${key}`;
  }
}

// 存储错误类
export class StorageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StorageError';
  }
}

// 导出单例
export const storageManager = LocalStorageManager.getInstance();
