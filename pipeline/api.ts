const base = process.env.DATABASE_API ?? "http://localhost:3010";

/** 当前交易域。这一层的 Function 与 Action 只读写这个域里的对象。 */
export const stockTradingDomain = "StockTrading";

function withDomainQuery(path: string): string {
  const [pathname, query = ""] = path.split("?");
  const params = new URLSearchParams(query);
  params.set("domain", stockTradingDomain);
  return `${pathname}?${params.toString()}`;
}

export async function api(method: string, path: string, body?: Record<string, unknown>): Promise<unknown> {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  const parsed: unknown = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const message = parsed && typeof parsed === "object" && "error" in parsed ? String(parsed.error) : text;
    throw new Error(`${method} ${path} ${response.status} ${message}`);
  }
  return parsed;
}

export async function getObject(path: string): Promise<Record<string, unknown>> {
  const object = (await api("GET", path)) as Record<string, unknown>;
  if (object.domain !== stockTradingDomain) {
    throw new Error(`${path} is outside ${stockTradingDomain}`);
  }
  return object;
}

export async function listObjects(path: string): Promise<Record<string, unknown>[]> {
  return (await api("GET", withDomainQuery(path))) as Record<string, unknown>[];
}

export async function postObject(path: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
  return (await api("POST", path, { ...body, domain: stockTradingDomain })) as Record<string, unknown>;
}
