const apiBase = 'http://127.0.0.1:3010';

export type RuntimeProperty = {
  apiName: string;
  column: string;
  displayName: string;
  writeChannel: string;
  required: boolean;
};

export type RuntimeObject = {
  apiName: string;
  displayName: string;
  resource: string;
  table: string;
  primaryKey: string;
  titleKey: string;
  properties: RuntimeProperty[];
};

export type RuntimeLink = {
  apiName: string;
  displayName: string;
  description: string;
  cardinality: string;
  sourceType: string;
  sourceProperty: string;
  targetType: string;
  targetProperty: string;
};

export type RuntimeSchema = {
  domain: string;
  objectTypes: RuntimeObject[];
  linkTypes: RuntimeLink[];
};

let cached: RuntimeSchema | null = null;
let pending: Promise<RuntimeSchema> | null = null;

export function runtimeSchema(): RuntimeSchema | null {
  return cached;
}

export function ensureRuntimeSchema(): Promise<RuntimeSchema> {
  if (cached) return Promise.resolve(cached);
  if (!pending) {
    pending = fetch(`${apiBase}/schema`)
      .then((response) => {
        if (!response.ok) throw new Error(`schema ${response.status}`);
        return response.json() as Promise<RuntimeSchema>;
      })
      .then((schema) => {
        cached = schema;
        return schema;
      })
      .catch((error) => {
        pending = null;
        throw error;
      });
  }
  return pending;
}
