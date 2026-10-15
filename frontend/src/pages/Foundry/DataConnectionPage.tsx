import React, { useCallback, useState } from 'react';
import { Alert, Button, Descriptions, Table } from 'antd';
import { FoundrySection, FoundryShell } from './FoundryShell';

const API = 'http://127.0.0.1:3010';

type Status = {
  health: string;
  stocks: number | null;
  barsOnProbeDate: number | null;
  withChange: number | null;
  withPrevious: number | null;
  probedAt: string;
};

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`读取失败 ${response.status}`);
  return response.json() as Promise<T>;
}

export default function DataConnectionPage() {
  const [status, setStatus] = useState<Status | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const probeDate = '2026-05-18';

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const health = await getJson<{ ok?: boolean }>(`${API}/health`);
      const stocks = await getJson<unknown[]>(`${API}/stocks?domain=StockTrading`);
      const bars = await getJson<Record<string, unknown>[]>(
        `${API}/daily-bars?domain=StockTrading&sessionDate=${probeDate}`,
      );
      setStatus({
        health: health.ok ? '数据库接口正常' : '数据库接口异常',
        stocks: Array.isArray(stocks) ? stocks.length : null,
        barsOnProbeDate: bars.length,
        withChange: bars.filter((row) => row.changePercent != null && row.changePercent !== '').length,
        withPrevious: bars.filter((row) => row.previousClose != null && row.previousClose !== '').length,
        probedAt: new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }),
      });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '检查失败');
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <FoundryShell
      app="Data Connection"
      title="把外部行情登记成数据源"
      lead="同步进平台之前，下载文件还是 Dataset，不是 Ontology 里的对象。这一页看源身份、列映射、库里当前有没有同步结果。"
      actions={[
        { label: 'Dataset Preview', to: '/data/dataset-preview', primary: true },
        { label: 'Pipeline Builder', to: '/data/pipelines' },
      ]}
    >
      <FoundrySection title="数据源" eyebrow="Source">
        <Descriptions column={1} size="small" bordered>
          <Descriptions.Item label="文件">
            <span className="foundry-mono">prepared_data_v43_updated_1009.pkl</span>
          </Descriptions.Item>
          <Descriptions.Item label="写入脚本">
            <span className="foundry-mono">pipeline/sync-pool.ts</span> →{' '}
            <span className="foundry-mono">POST /daily-bars/batch</span>（pass source）
          </Descriptions.Item>
          <Descriptions.Item label="库">localhost:5436 / stock_ontology · 域 StockTrading</Descriptions.Item>
        </Descriptions>
      </FoundrySection>

      <FoundrySection title="列映射" eyebrow="Schema">
        <Table
          size="small"
          pagination={false}
          rowKey="from"
          dataSource={[
            { from: 'stockCode', to: 'ticker' },
            { from: 'stockName', to: 'Stock.displayName' },
            { from: 'date', to: 'sessionDate' },
            { from: 'open/high/low/close/volume/amount', to: '同名源属性' },
            { from: 'changePercent', to: 'changePercent（可空）' },
            { from: 'industry', to: 'publishedIndustry（unknown→空）' },
          ]}
          columns={[
            { title: 'pickle 列', dataIndex: 'from' },
            { title: '落到', dataIndex: 'to' },
          ]}
        />
      </FoundrySection>

      <FoundrySection title="同步状态（读库探测）" eyebrow="Sync">
        <Button
          type="primary"
          className="ds-btn--blue"
          loading={loading}
          onClick={() => void refresh()}
          style={{ marginBottom: 12 }}
        >
          检查同步状态
        </Button>
        {error ? <Alert type="error" showIcon message={error} style={{ marginBottom: 12 }} /> : null}
        {status ? (
          <ul>
            <li>探测时间：{status.probedAt}</li>
            <li>接口：{status.health}</li>
            <li>股票对象：{status.stocks ?? '—'}</li>
            <li>
              探测日 {probeDate} DailyBar：{status.barsOnProbeDate ?? '—'}（有涨跌幅 {status.withChange ?? '—'} · 有前收{' '}
              {status.withPrevious ?? '—'}）
            </li>
          </ul>
        ) : (
          <p>点「检查同步状态」读取当前库证据。全量重跑不在浏览器里执行。</p>
        )}
        <p style={{ marginTop: 12 }}>
          重跑源同步（本机终端）：
          <span className="foundry-mono"> npx tsx pipeline/sync-pool.ts</span>
        </p>
      </FoundrySection>

      <FoundrySection title="边界" eyebrow="Not here">
        <p>不算均线、比较数、制度。那些是 Function，由 Pipeline 调用后写回派生属性。本课不代报券商，不做写回外部。</p>
      </FoundrySection>
    </FoundryShell>
  );
}
