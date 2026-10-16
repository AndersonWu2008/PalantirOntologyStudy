import type { RuntimeSchema } from '@/pages/DataExplorer/runtimeSchema';

const apiBase = 'http://127.0.0.1:3010';

type DemoSnapshot = {
  schema: RuntimeSchema;
  collections: Record<string, Record<string, unknown>[]>;
};

let pending: Promise<DemoSnapshot> | null = null;

export function usesPublishedSnapshot(): boolean {
  return import.meta.env.VITE_STATIC_DATA === 'true';
}

function loadSnapshot(): Promise<DemoSnapshot> {
  if (!pending) {
    const base = import.meta.env.BASE_URL;
    pending = Promise.all([
      fetch(`${base}snapshot/schema.json`).then((response) => {
        if (!response.ok) throw new Error('在线类型读不出来');
        return response.json() as Promise<RuntimeSchema>;
      }),
      fetch(`${base}snapshot/demo.json`).then((response) => {
        if (!response.ok) throw new Error('在线对象读不出来');
        return response.json() as Promise<Record<string, Record<string, unknown>[]>>;
      }),
    ])
      .then(([schema, collections]) => ({ schema, collections }))
      .catch((error) => {
        pending = null;
        throw error;
      });
  }
  return pending;
}

function matches(row: Record<string, unknown>, params: URLSearchParams): boolean {
  for (const [key, value] of params) {
    if (String(row[key] ?? '') !== value) return false;
  }
  return true;
}

async function readSnapshot(path: string): Promise<unknown> {
  const snapshot = await loadSnapshot();
  const url = new URL(path, 'http://snapshot.local');
  const parts = url.pathname.split('/').filter(Boolean);
  if (parts.length === 1 && parts[0] === 'schema') return snapshot.schema;
  if (parts.length === 1) {
    const rows = snapshot.collections[parts[0]];
    if (!rows) throw new Error('在线页面没有带上这种对象');
    return rows.filter((row) => matches(row, url.searchParams));
  }
  if (parts.length === 2) {
    const rows = snapshot.collections[parts[0]];
    if (!rows) throw new Error('在线页面没有带上这种对象');
    const type = snapshot.schema.objectTypes.find((item) => item.resource === parts[0]);
    const key = type?.primaryKey ?? '';
    const id = decodeURIComponent(parts[1]);
    const hit = rows.find((row) => key && String(row[key] ?? '') === id);
    if (!hit) throw new Error('读取失败 404');
    return hit;
  }
  throw new Error('读取失败 404');
}

/** 在线页面读打进站点的 JSON。本机开发仍读 127.0.0.1:3010。 */
export async function publishedGet<T>(path: string): Promise<T> {
  if (usesPublishedSnapshot()) return readSnapshot(path) as Promise<T>;
  const response = await fetch(`${apiBase}${path}`);
  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as { error?: string };
    throw new Error(body.error ?? `读取失败 ${response.status}`);
  }
  return response.json() as Promise<T>;
}
