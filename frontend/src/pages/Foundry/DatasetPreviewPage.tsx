import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Empty, Input, Space, Spin, Table, Typography } from 'antd';
import { FoundrySection, FoundryShell } from './FoundryShell';

const API = 'http://127.0.0.1:3010';

type Bar = Record<string, unknown>;

const sourceColumns = [
  'ticker',
  'sessionDate',
  'open',
  'high',
  'low',
  'close',
  'volume',
  'amount',
  'changePercent',
  'previousClose',
  'publishedIndustry',
];

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`读取失败 ${response.status}`);
  return response.json() as Promise<T>;
}

export default function DatasetPreviewPage() {
  const [health, setHealth] = useState('读取中…');
  const [stockCount, setStockCount] = useState<number | null>(null);
  const [sessionDate, setSessionDate] = useState('2026-05-18');
  const [ticker, setTicker] = useState('');
  const [applied, setApplied] = useState({ sessionDate: '2026-05-18', ticker: '' });
  const [rows, setRows] = useState<Bar[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getJson<{ ok?: boolean }>(`${API}/health`)
      .then((body) => setHealth(body.ok ? '数据库接口正常' : '数据库接口异常'))
      .catch(() => setHealth('数据库接口连不上'));
    getJson<unknown[]>(`${API}/stocks?domain=StockTrading`)
      .then((body) => setStockCount(Array.isArray(body) ? body.length : null))
      .catch(() => setStockCount(null));
  }, []);

  useEffect(() => {
    if (!applied.sessionDate && !applied.ticker) {
      setError('请填交易日或代码再预览');
      setRows([]);
      return;
    }
    let cancelled = false;
    setRows(null);
    setError(null);
    const query = new URLSearchParams({ domain: 'StockTrading' });
    if (applied.sessionDate) query.set('sessionDate', applied.sessionDate);
    if (applied.ticker) query.set('ticker', applied.ticker);
    getJson<Bar[]>(`${API}/daily-bars?${query}`)
      .then((body) => {
        if (!cancelled) setRows(body);
      })
      .catch((reason: unknown) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : '预览失败');
      });
    return () => {
      cancelled = true;
    };
  }, [applied]);

  const stats = useMemo(() => {
    if (!rows) return null;
    const withChange = rows.filter((row) => row.changePercent != null && row.changePercent !== '').length;
    const withPrevious = rows.filter((row) => row.previousClose != null && row.previousClose !== '').length;
    const withScore = rows.filter((row) => row.comparisonScore != null && row.comparisonScore !== '').length;
    return {
      total: rows.length,
      withChange,
      withoutChange: rows.length - withChange,
      withPrevious,
      withoutPrevious: rows.length - withPrevious,
      withScore,
    };
  }, [rows]);

  const preview = useMemo(() => (rows ?? []).slice(0, 50), [rows]);

  return (
    <FoundryShell
      app="Dataset Preview"
      title="先看见一张表"
      lead="表是 Dataset。打开对象、跑策略、提交 Action，都发生在 Ontology 层。这一页只预览源行情行。"
      actions={[
        { label: 'Object Explorer', to: '/ontology?focus=DailyBar', primary: true },
        { label: 'Contour', to: '/data/contour?analysis=StockTrading.dailyBarBoard' },
        { label: 'Pipeline Builder', to: '/data/pipelines' },
        { label: 'Data Lineage', to: '/data/lineage' },
      ]}
    >
      <FoundrySection title="About" eyebrow="Dataset">
        <p>源 dataset：DailyBar 源属性（由 pickle 同步）</p>
        <p>连接：{health}</p>
        <p>可买范围内股票对象：{stockCount == null ? '—' : stockCount}</p>
        <p className="foundry-mono">库 stock_ontology · 域 StockTrading · 全表约 35 万行</p>
      </FoundrySection>

      <FoundrySection title="Schema · 源列 → DailyBar" eyebrow="Details">
        <Table
          size="small"
          pagination={false}
          rowKey="column"
          dataSource={[
            { column: 'ticker', maps: 'Stock.ticker / DailyBar.ticker', type: 'string' },
            { column: 'sessionDate', maps: 'DailyBar.sessionDate', type: 'date' },
            { column: 'open / high / low / close', maps: '源价格', type: 'double' },
            { column: 'volume / amount', maps: '源量额', type: 'double' },
            { column: 'changePercent', maps: '源涨跌幅；空则保持空', type: 'double?' },
            { column: 'publishedIndustry', maps: '源行业；unknown 存空', type: 'string?' },
            { column: 'previousClose', maps: '同步管道补上一交易日收盘', type: 'double?' },
          ]}
          columns={[
            { title: '列', dataIndex: 'column', width: 240 },
            { title: '类型', dataIndex: 'type', width: 100 },
            { title: '落到', dataIndex: 'maps' },
          ]}
        />
      </FoundrySection>

      <FoundrySection title="行预览" eyebrow="Preview">
        <Space wrap style={{ marginBottom: 12 }}>
          <Input
            style={{ width: 160 }}
            value={sessionDate}
            onChange={(event) => setSessionDate(event.target.value)}
            placeholder="交易日"
            onPressEnter={() => setApplied({ sessionDate, ticker })}
          />
          <Input
            style={{ width: 140 }}
            value={ticker}
            onChange={(event) => setTicker(event.target.value)}
            placeholder="代码（可选）"
            onPressEnter={() => setApplied({ sessionDate, ticker })}
          />
          <Button type="primary" onClick={() => setApplied({ sessionDate, ticker })}>
            加载预览
          </Button>
        </Space>
        {error ? <Alert type="error" showIcon message={error} /> : null}
        {!error && rows == null ? <Spin /> : null}
        {!error && rows && rows.length === 0 ? <Empty description="没有行" /> : null}
        {!error && preview.length > 0 ? (
          <>
            <Typography.Text type="secondary">显示前 {preview.length} 行 · 共匹配 {rows?.length ?? 0} 行</Typography.Text>
            <Table
              style={{ marginTop: 12 }}
              size="small"
              rowKey={(row) => String(row.barId)}
              pagination={false}
              scroll={{ x: 1400 }}
              dataSource={preview}
              columns={sourceColumns.map((key) => ({
                title: key,
                dataIndex: key,
                width: key === 'publishedIndustry' ? 140 : 110,
                render: (value: unknown) => (value == null || value === '' ? '—' : String(value)),
              }))}
            />
          </>
        ) : null}
      </FoundrySection>

      <FoundrySection title="Health（当前过滤结果）" eyebrow="Checks">
        {stats == null ? (
          <p>加载后显示计数</p>
        ) : (
          <ul>
            <li>匹配行：{stats.total}</li>
            <li>有涨跌幅：{stats.withChange} · 无涨跌幅：{stats.withoutChange}</li>
            <li>有前收：{stats.withPrevious} · 缺前收：{stats.withoutPrevious}</li>
            <li>有比较数（派生，已写出）：{stats.withScore}</li>
          </ul>
        )}
      </FoundrySection>
    </FoundryShell>
  );
}
