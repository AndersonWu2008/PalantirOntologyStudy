/** Data Health rule packs — platform shell; domains register packs here. */

export type HealthSeverity = 'error' | 'warn' | 'info';

export type HealthStatus = 'pass' | 'fail' | 'warn' | 'skip';

export type HealthEvidence = {
  label: string;
  detail?: string;
  href?: string;
};

export type HealthRuleResult = {
  status: HealthStatus;
  summary: string;
  evidence: HealthEvidence[];
};

export type HealthRunContext = {
  domain: string;
  probeDate: string;
  accountId: string;
  apiBase: string;
};

export type HealthRule = {
  id: string;
  displayName: string;
  severity: HealthSeverity;
  description: string;
  run: (ctx: HealthRunContext) => Promise<HealthRuleResult>;
};

export type HealthPack = {
  id: string;
  displayName: string;
  domain?: string;
  description: string;
  rules: HealthRule[];
};

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url} → ${response.status}`);
  return response.json() as Promise<T>;
}

async function findPoolGaps(apiBase: string, domain: string, sessionDate: string): Promise<string[]> {
  const members = await getJson<Record<string, unknown>[]>(
    `${apiBase}/index-constituents?domain=${encodeURIComponent(domain)}&indexId=pool`,
  );
  const tickers = members.map((row) => String(row.ticker));
  const missing: string[] = [];
  for (let index = 0; index < tickers.length; index += 50) {
    const batch = tickers.slice(index, index + 50);
    await Promise.all(
      batch.map(async (ticker) => {
        const bars = await getJson<Record<string, unknown>[]>(
          `${apiBase}/daily-bars?domain=${encodeURIComponent(domain)}&ticker=${encodeURIComponent(ticker)}&sessionDate=${encodeURIComponent(sessionDate)}`,
        );
        const bar = bars[0];
        if (bar == null || bar.close == null || bar.changePercent == null) missing.push(ticker);
      }),
    );
  }
  return missing.sort();
}

export const healthPacks: HealthPack[] = [
  {
    id: 'StockTrading.tradingReadiness',
    displayName: 'StockTrading · trading readiness',
    domain: 'StockTrading',
    description: '池完整性、开仓门、页首与 API。探测日可改。',
    rules: [
      {
        id: 'apiHealth',
        displayName: 'Objects API health',
        severity: 'error',
        description: '数据库对象接口 /health 必须可达。',
        async run(ctx) {
          try {
            const body = await getJson<{ ok?: boolean }>(`${ctx.apiBase}/health`);
            if (body.ok) {
              return { status: 'pass', summary: 'API ok', evidence: [{ label: '/health', href: ctx.apiBase + '/health' }] };
            }
            return { status: 'fail', summary: 'API 返回异常', evidence: [] };
          } catch (reason) {
            return {
              status: 'fail',
              summary: reason instanceof Error ? reason.message : 'API 不可达',
              evidence: [{ label: 'Data Connection', href: '/data/connection' }],
            };
          }
        },
      },
      {
        id: 'poolGapsOnDate',
        displayName: 'Pool gaps on probe date',
        severity: 'error',
        description: '可买池在探测日必须有 close 与 changePercent，否则开仓门会「缺少」。',
        async run(ctx) {
          const missing = await findPoolGaps(ctx.apiBase, ctx.domain, ctx.probeDate);
          if (missing.length === 0) {
            return {
              status: 'pass',
              summary: `${ctx.probeDate} 池无缺口`,
              evidence: [
                {
                  label: 'Dataset Preview',
                  href: `/data/dataset-preview`,
                  detail: `sessionDate=${ctx.probeDate}`,
                },
              ],
            };
          }
          return {
            status: 'fail',
            summary: `${ctx.probeDate} 缺 ${missing.length} 只`,
            evidence: missing.slice(0, 20).map((ticker) => ({
              label: ticker,
              detail: 'missing close or changePercent',
              href: `/ontology/quiver?profile=StockTrading.stockDaily&id=${encodeURIComponent(ticker)}`,
            })),
          };
        },
      },
      {
        id: 'entryGateMissing',
        displayName: 'Entry gate missing recently',
        severity: 'warn',
        description: '探测日及前一交易日不应长期停在 entryGate=缺少。',
        async run(ctx) {
          try {
            const day = await getJson<Record<string, unknown>>(
              `${ctx.apiBase}/trading-days/${encodeURIComponent(ctx.probeDate)}`,
            );
            const gate = String(day.entryGate ?? '');
            const breadth = day.breadth;
            if (gate === '缺少') {
              return {
                status: 'warn',
                summary: `${ctx.probeDate} entryGate=缺少`,
                evidence: [
                  { label: `breadth=${breadth ?? '—'}`, detail: '查池缺口或因子' },
                  { label: 'Pipeline Builder', href: '/data/pipelines' },
                ],
              };
            }
            return {
              status: 'pass',
              summary: `${ctx.probeDate} entryGate=${gate || '—'} · breadth=${breadth ?? '—'}`,
              evidence: [{ label: 'TradingDay', href: `/ontology?focus=TradingDay&sessionDate=${ctx.probeDate}` }],
            };
          } catch (reason) {
            return {
              status: 'fail',
              summary: reason instanceof Error ? reason.message : '读交易日失败',
              evidence: [],
            };
          }
        },
      },
      {
        id: 'emptyChangePercent',
        displayName: 'Empty changePercent share',
        severity: 'warn',
        description: '探测日 DailyBar 无涨跌幅占比过高时，派生因子不可靠。可先 POST /daily-bars/previous-close 再 /daily-bars/change-percent 补全。',
        async run(ctx) {
          const bars = await getJson<Record<string, unknown>[]>(
            `${ctx.apiBase}/daily-bars?domain=${encodeURIComponent(ctx.domain)}&sessionDate=${encodeURIComponent(ctx.probeDate)}`,
          );
          if (bars.length === 0) {
            return { status: 'warn', summary: '探测日无行情行', evidence: [] };
          }
          const empty = bars.filter((row) => row.changePercent == null || row.changePercent === '').length;
          const ratio = empty / bars.length;
          const status: HealthStatus = ratio > 0.05 ? 'warn' : 'pass';
          return {
            status,
            summary: `${ctx.probeDate} 无涨跌幅 ${empty}/${bars.length}（${(ratio * 100).toFixed(1)}%）`,
            evidence: [
              { label: 'Dataset Preview', href: '/data/dataset-preview' },
              { label: '补 previous_close', detail: 'POST /daily-bars/previous-close' },
              { label: '补 change_percent', detail: 'POST /daily-bars/change-percent' },
              { label: 'Data Connection', href: '/data/connection' },
            ],
          };
        },
      },
      {
        id: 'dayChainContinuity',
        displayName: 'Day-chain continuity',
        severity: 'info',
        description: '探测日前若干交易日应有安排页首，便于日链回放与开盘前阅读。',
        async run(ctx) {
          const days = await getJson<Record<string, unknown>[]>(
            `${ctx.apiBase}/trading-days?domain=${encodeURIComponent(ctx.domain)}&isTradingDay=true`,
          );
          const sorted = days
            .map((row) => String(row.sessionDate))
            .filter(Boolean)
            .sort()
            .filter((date) => date <= ctx.probeDate)
            .slice(-5);
          const arrangements = await getJson<Record<string, unknown>[]>(
            `${ctx.apiBase}/arrangements?domain=${encodeURIComponent(ctx.domain)}&accountId=${encodeURIComponent(ctx.accountId)}`,
          );
          const byDate = new Map<string, string>();
          for (const row of arrangements) {
            const date = String(row.sessionDate ?? '');
            if (!sorted.includes(date)) continue;
            const header = String(row.header ?? '');
            if (header === '这份已作废') continue;
            byDate.set(date, header || '（无页首）');
          }
          const missing = sorted.filter((date) => !byDate.has(date));
          if (missing.length === 0) {
            return {
              status: 'pass',
              summary: `近 ${sorted.length} 个交易日均有有效安排`,
              evidence: sorted.map((date) => ({
                label: date,
                detail: byDate.get(date),
                href: `/workshop/pre-open?date=${encodeURIComponent(date)}`,
              })),
            };
          }
          return {
            status: 'warn',
            summary: `${missing.length}/${sorted.length} 日缺有效安排`,
            evidence: missing.map((date) => ({
              label: date,
              detail: '无当前安排',
              href: `/workshop/pre-open?date=${encodeURIComponent(date)}`,
            })),
          };
        },
      },
      {
        id: 'arrangementIncomplete',
        displayName: 'Incomplete arrangements',
        severity: 'warn',
        description: '账户下未作废安排若页首为「没做完」，交易员无法确认。',
        async run(ctx) {
          const rows = await getJson<Record<string, unknown>[]>(
            `${ctx.apiBase}/arrangements?domain=${encodeURIComponent(ctx.domain)}&accountId=${encodeURIComponent(ctx.accountId)}`,
          );
          const superseded = new Set(
            rows.map((row) => row.supersedesArrangementId).filter(Boolean).map(String),
          );
          const current = rows.filter(
            (row) =>
              !superseded.has(String(row.arrangementId))
              && !rows.some((other) => other.supersedesArrangementId === row.arrangementId),
          );
          const bad = current.filter((row) => row.header === '没做完');
          if (bad.length === 0) {
            return {
              status: 'pass',
              summary: `当前安排无「没做完」（${current.length} 份）`,
              evidence: [{ label: 'Workshop', href: '/workshop/pre-open' }],
            };
          }
          return {
            status: 'warn',
            summary: `${bad.length} 份安排页首「没做完」`,
            evidence: bad.slice(0, 10).map((row) => ({
              label: String(row.arrangementId),
              detail: String(row.sessionDate ?? ''),
              href: `/ontology/vertex?profile=StockTrading.arrangementExplore&type=PreOpenArrangement&id=${encodeURIComponent(String(row.arrangementId))}`,
            })),
          };
        },
      },
      {
        id: 'openPricesPending',
        displayName: 'Open prices pending',
        severity: 'info',
        description: '探测日当前安排的买卖行还没有开盘价时，页首应为「等开盘价」，不是「没做完」。',
        async run(ctx) {
          const rows = await getJson<Record<string, unknown>[]>(
            `${ctx.apiBase}/arrangements?domain=${encodeURIComponent(ctx.domain)}&accountId=${encodeURIComponent(ctx.accountId)}&sessionDate=${encodeURIComponent(ctx.probeDate)}`,
          );
          const superseded = new Set(rows.map((row) => row.supersedesArrangementId).filter(Boolean).map(String));
          const current = rows.find(
            (row) =>
              !superseded.has(String(row.arrangementId))
              && !rows.some((other) => other.supersedesArrangementId === row.arrangementId),
          );
          if (!current) {
            return { status: 'skip', summary: `${ctx.probeDate} 无当前安排`, evidence: [] };
          }
          const arrangementId = String(current.arrangementId);
          const [sells, buys] = await Promise.all([
            getJson<Record<string, unknown>[]>(
              `${ctx.apiBase}/sell-lines?domain=${encodeURIComponent(ctx.domain)}&arrangementId=${encodeURIComponent(arrangementId)}`,
            ),
            getJson<Record<string, unknown>[]>(
              `${ctx.apiBase}/buy-lines?domain=${encodeURIComponent(ctx.domain)}&arrangementId=${encodeURIComponent(arrangementId)}`,
            ),
          ]);
          const waiting = [...sells, ...buys].filter((line) => line.openPrice == null && line.outcome == null);
          const href = `/workshop/pre-open?date=${encodeURIComponent(ctx.probeDate)}`;
          if (waiting.length === 0) {
            return {
              status: 'pass',
              summary: `${ctx.probeDate} 开盘价已到或当日无待写行`,
              evidence: [{ label: arrangementId, detail: String(current.header ?? ''), href }],
            };
          }
          return {
            status: 'warn',
            summary: `${ctx.probeDate} 开盘价未到（${waiting.length} 行）`,
            evidence: [
              { label: arrangementId, detail: `页首 ${String(current.header ?? '')}`, href },
              ...waiting.slice(0, 12).map((line) => ({
                label: String(line.ticker),
                detail: 'openPrice 空',
                href,
              })),
            ],
          };
        },
      },
    ],
  },
];

export function getHealthPack(id: string | null | undefined): HealthPack {
  return healthPacks.find((item) => item.id === id) ?? healthPacks[0];
}
