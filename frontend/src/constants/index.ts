/**
 * Constants Index
 * 常量配置导出入口
 */

// 分页默认值
export const DEFAULT_PAGINATION = {
  page: 1,
  size: 20,
} as const;

// 排序默认值
export const DEFAULT_SORT = {
  field: 'createdAt',
  order: 'desc' as const,
};

// 状态选项
export const STATUS_OPTIONS = [
  { label: 'Active', value: 'active' },
  { label: 'Inactive', value: 'inactive' },
  { label: 'Pending', value: 'pending' },
  { label: 'Deprecated', value: 'deprecated' },
] as const;

// 用户角色
export const USER_ROLES = [
  { label: 'Admin', value: 'admin' },
  { label: 'Editor', value: 'editor' },
  { label: 'Viewer', value: 'viewer' },
  { label: 'Guest', value: 'guest' },
] as const;
