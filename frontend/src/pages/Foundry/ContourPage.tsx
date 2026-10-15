import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Input, Select, Space, Spin, Table, Tag, Typography } from 'antd';
import { Link, useSearchParams } from 'react-router-dom';
import { FoundrySection, FoundryShell } from './FoundryShell';
import {
  contourAnalyses,
  getContourAnalysis,
  runAggregate,
  runFilter,
  type AggregateRow,
  type ContourAnalysis,
  type ContourStep,
} from './contour/analyses';
import './ContourPage.less';

const API = 'http://127.0.0.1:3010';

type Row = Record<string, unknown>;

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`读取失败 ${response.status}`);
  return response.json() as Promise<T>;
}

function AggregateChart({ rows, labelKey, valueKey }: { rows: AggregateRow[]; labelKey: string; valueKey: string }) {
  if (rows.length === 0) return <Typography.Text type="secondary">无汇总行</Typography.Text>;
  const max = Math.max(...rows.map((row) => Number(row[valueKey as keyof AggregateRow] ?? 0)), 1);
  return (
    <div className="contour-chart">
      {rows.map((row) => {
        const label = String(row[labelKey as keyof AggregateRow] ?? '');
        const value = Number(row[valueKey as keyof AggregateRow] ?? 0);
        const width = Math.max(4, Math.round((value / max) * 100));
        return (
          <div key={label} className="contour-chart__row">
            <div className="contour-chart__label" title={label}>
              {label}
            </div>
            <div className="contour-chart__track">
              <div className="contour-chart__bar" style={{ width: `${width}%` }} />
            </div>
            <div className="contour-chart__value">{value}</div>
          </div>
        );
      })}
    </div>
  );
}

export default function ContourPage() {
  const [params, setParams] = useSearchParams();
  const analysis = getContourAnalysis(params.get('analysis'));
  const [sessionDate, setSessionDate] = useState(
    () => params.get('sessionDate') ?? analysis.board.defaultParams.sessionDate ?? '',
  );
  const [ticker, setTicker] = useState(
    () => params.get('ticker') ?? analysis.board.defaultParams.ticker ?? '',
  );
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeStepId, setActiveStepId] = useState<string | null>(analysis.path[0]?.id ?? null);

  useEffect(() => {
    // Reset params defaults when switching analysis if URL lacks overrides.
    const nextDate = params.get('sessionDate') ?? analysis.board.defaultParams.sessionDate ?? '';
    const nextTicker = params.get('ticker') ?? analysis.board.defaultParams.ticker ?? '';
    setSessionDate(nextDate);
    setTicker(nextTicker);
    setActiveStepId(analysis.path[0]?.id ?? null);
  }, [analysis.id]); // eslint-disable-line react-hooks/exhaustive-deps -- intentional on analysis switch

  useEffect(() => {
    let cancelled = false;
    if (!sessionDate && !ticker) {
      setRows([]);
      setError('请填 sessionDate 或 ticker');
      return;
    }
    setLoading(true);
    setError(null);
    const query = new URLSearchParams({ domain: analysis.domain ?? 'StockTrading' });
    if (sessionDate) query.set('sessionDate', sessionDate);
    if (ticker) query.set('ticker', ticker);
    getJson<Row[]>(`${API}/${analysis.board.collection}?${query}`)
      .then((body) => {
        if (!cancelled) setRows(body);
      })
      .catch((reason: unknown) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : '读取表失败');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [analysis, sessionDate, ticker]);

  const stepResults = useMemo(() => {
    if (!rows) return new Map<string, AggregateRow[] | Row[]>();
    const map = new Map<string, AggregateRow[] | Row[]>();
    for (const step of analysis.path) {
      if (step.kind === 'filter') {
        map.set(step.id, runFilter(rows, step));
      } else if (step.kind === 'aggregate') {
        map.set(step.id, runAggregate(rows, step));
      } else if (step.kind === 'chart') {
        const source = map.get(step.fromStepId);
        map.set(step.id, Array.isArray(source) ? source : []);
      }
    }
    return map;
  }, [analysis.path, rows]);

  const activeStep: ContourStep | undefined =
    analysis.path.find((step) => step.id === activeStepId) ?? analysis.path[0];

  function selectAnalysis(next: ContourAnalysis) {
    setParams({
      analysis: next.id,
      ...(next.board.defaultParams.sessionDate
        ? { sessionDate: next.board.defaultParams.sessionDate }
        : {}),
      ...(next.board.defaultParams.ticker ? { ticker: next.board.defaultParams.ticker } : {}),
    });
  }

  function applyBoardParams() {
    const next: Record<string, string> = { analysis: analysis.id };
    if (sessionDate) next.sessionDate = sessionDate;
    if (ticker) next.ticker = ticker;
    setParams(next);
  }

  const previewHref = `/data/dataset-preview`;
  const nullChangeCount =
    rows == null ? 0 : rows.filter((row) => row.changePercent == null || row.changePercent === '').length;

  return (
    <FoundryShell
      app="Contour"
      title={analysis.displayName}
      lead={analysis.lead}
      actions={[
        { label: 'Dataset Preview', to: previewHref, primary: true },
        { label: 'Quiver (objects)', to: analysis.quiverContrastHref ?? '/ontology/quiver' },
        { label: 'Data Health', to: '/data/health' },
      ]}
    >
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message="Dataset vs Ontology"
        description="Contour 分析的是表（DailyBar 行）。同一票的对象时序去 Quiver；质量规则去 Data Health。本页不提交 Action。"
      />

      <FoundrySection title="Analysis" eyebrow="Contour">
        <Space wrap>
          <Select
            style={{ minWidth: 360 }}
            value={analysis.id}
            options={contourAnalyses.map((item) => ({
              value: item.id,
              label: `${item.displayName} · ${item.id}`,
            }))}
            onChange={(value: string) => selectAnalysis(getContourAnalysis(value))}
          />
          {analysis.domain ? <Tag>{analysis.domain}</Tag> : null}
        </Space>
      </FoundrySection>

      <FoundrySection title="Board" eyebrow="Dataset">
        <Space wrap>
          <Typography.Text type="secondary">
            board <span className="foundry-mono">{analysis.board.displayName}</span>
          </Typography.Text>
          <Input
            style={{ width: 140 }}
            placeholder="sessionDate"
            value={sessionDate}
            onChange={(event) => setSessionDate(event.target.value)}
          />
          <Input
            style={{ width: 140 }}
            placeholder="ticker"
            value={ticker}
            onChange={(event) => setTicker(event.target.value)}
          />
          <Button type="primary" className="ds-btn--blue" onClick={applyBoardParams}>
            Load board
          </Button>
          {rows ? (
            <Typography.Text type="secondary">
              {rows.length} rows · missing changePercent {nullChangeCount}
            </Typography.Text>
          ) : null}
        </Space>
      </FoundrySection>

      {error ? <Alert type="error" showIcon message={error} style={{ marginBottom: 12 }} /> : null}
      {loading ? <Spin /> : null}

      <div className="contour-layout">
        <FoundrySection title="Path" eyebrow="Steps">
          <ol className="contour-path">
            {analysis.path.map((step, index) => (
              <li key={step.id}>
                <Button
                  type={activeStep?.id === step.id ? 'primary' : 'default'}
                  size="small"
                  block
                  onClick={() => setActiveStepId(step.id)}
                >
                  {index + 1}. {step.kind} · {step.label}
                </Button>
              </li>
            ))}
          </ol>
        </FoundrySection>

        <div className="contour-main">
          {activeStep?.kind === 'filter' ? (
            <FoundrySection title={activeStep.label} eyebrow="Filter">
              <Table
                size="small"
                pagination={{ pageSize: 8, showSizeChanger: false }}
                rowKey={(row, index) => String(row.barId ?? index)}
                dataSource={(stepResults.get(activeStep.id) as Row[] | undefined) ?? []}
                locale={{ emptyText: '没有命中行' }}
                columns={analysis.board.columns.map((col) => ({
                  title: col,
                  dataIndex: col,
                  ellipsis: true,
                  render: (value: unknown) => (value == null || value === '' ? '—' : String(value)),
                }))}
                scroll={{ x: 1100 }}
              />
            </FoundrySection>
          ) : null}

          {activeStep?.kind === 'aggregate' ? (
            <FoundrySection title={activeStep.label} eyebrow="Aggregate">
              <Table
                size="small"
                pagination={false}
                rowKey="group"
                dataSource={(stepResults.get(activeStep.id) as AggregateRow[] | undefined) ?? []}
                columns={[
                  { title: activeStep.groupBy, dataIndex: 'group' },
                  { title: activeStep.metric, dataIndex: 'value', width: 140 },
                ]}
              />
            </FoundrySection>
          ) : null}

          {activeStep?.kind === 'chart' ? (
            <FoundrySection title={activeStep.label} eyebrow="Chart">
              <AggregateChart
                rows={(stepResults.get(activeStep.id) as AggregateRow[] | undefined) ?? []}
                labelKey={activeStep.labelKey}
                valueKey={activeStep.valueKey}
              />
            </FoundrySection>
          ) : null}

          <FoundrySection title="Board sample" eyebrow="Table">
            <Table
              size="small"
              pagination={{ pageSize: 6, showSizeChanger: false }}
              rowKey={(row, index) => String(row.barId ?? index)}
              dataSource={rows ?? []}
              loading={loading}
              columns={analysis.board.columns.map((col) => ({
                title: col,
                dataIndex: col,
                ellipsis: true,
                width: col === 'publishedIndustry' ? 160 : 100,
                render: (value: unknown) => (value == null || value === '' ? '—' : String(value)),
              }))}
              scroll={{ x: 1100 }}
            />
          </FoundrySection>
        </div>
      </div>

      <FoundrySection title="How this stays generic" eyebrow="Platform">
        <p>
          Analysis <span className="foundry-mono">{analysis.id}</span> 只是 Board + Path 配置。
          换域注册新 Analysis；壳不写死股票语义以外的表名。对照对象分析请用{' '}
          <Link to={analysis.quiverContrastHref ?? '/ontology/quiver'}>Quiver</Link>。
        </p>
      </FoundrySection>
    </FoundryShell>
  );
}
