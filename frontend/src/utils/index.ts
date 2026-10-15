/**
 * Utils Index
 * 工具函数导出入口
 */

// 日期格式化
export const formatDate = (date: Date | string | number, format: string = 'YYYY-MM-DD'): string => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');

  return format
    .replace('YYYY', String(year))
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds);
};

export const formatDateTime = (date: Date | string | number): string => {
  return formatDate(date, 'YYYY-MM-DD HH:mm:ss');
};

// 函数工具
export const debounce = <T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
};

export const throttle = <T extends (...args: any[]) => any>(
  fn: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle = false;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

// 数据处理
export const groupBy = <T>(array: T[], key: keyof T): Record<string, T[]> => {
  return array.reduce((result, item) => {
    const groupKey = String(item[key]);
    if (!result[groupKey]) {
      result[groupKey] = [];
    }
    result[groupKey].push(item);
    return result;
  }, {} as Record<string, T[]>);
};

export const uniqueBy = <T>(array: T[], key: keyof T): T[] => {
  const seen = new Set();
  return array.filter((item) => {
    const val = item[key];
    if (seen.has(val)) return false;
    seen.add(val);
    return true;
  });
};

// 类型检查
export const isEmpty = (value: any): boolean => {
  if (value == null) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
};

export const isObject = (value: any): value is Record<string, any> => {
  return value != null && typeof value === 'object' && !Array.isArray(value);
};

// URL 处理
export const buildQueryString = (params: Record<string, any>): string => {
  const query = Object.entries(params)
    .filter(([, value]) => value != null && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&');
  return query ? `?${query}` : '';
};

export const parseQueryString = (search: string): Record<string, string> => {
  const params: Record<string, string> = {};
  const query = search.startsWith('?') ? search.slice(1) : search;
  if (!query) return params;

  query.split('&').forEach((param) => {
    const [key, value] = param.split('=');
    if (key) {
      params[decodeURIComponent(key)] = decodeURIComponent(value || '');
    }
  });
  return params;
};

// 本地存储
export const storage = {
  get: <T>(key: string, defaultValue?: T): T | undefined => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch {
      return defaultValue;
    }
  },
  set: <T>(key: string, value: T): void => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('Storage set error:', error);
    }
  },
  remove: (key: string): void => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Storage remove error:', error);
    }
  },
  clear: (): void => {
    try {
      localStorage.clear();
    } catch (error) {
      console.error('Storage clear error:', error);
    }
  },
};
