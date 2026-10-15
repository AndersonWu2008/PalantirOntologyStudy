/**
 * Storage 模块入口
 * 统一导出所有存储相关功能
 */

// 常量
export {
  StorageNamespace,
  StorageModule,
  StoragePurpose,
  STORAGE_KEYS,
} from './constants';

// 类型
export type {
  WizardType,
  CreationMode,
  StorageOptions,
  StorageWrapper,
  StorageStats,
} from './constants';

// LocalStorageManager
export {
  LocalStorageManager,
  StorageError,
  storageManager,
} from './LocalStorageManager';
