import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Card, Col, Input, Row, Select, Space, Spin, Table, Typography } from 'antd';
import { Link } from 'react-router-dom';
import { FoundrySection, FoundryShell } from './FoundryShell';
import './EvaluationPage.less';

const API = 'http://127.0.0.1:3010';

/** Workshop 最近拉长的 V46 日链窗口（学习对照用，可改）。 */
const DEFAULT_WINDOW = { from: '2026-05-11', to: '2026-08-06' };

type Run = {
  runId: string;
  strategyId: string;
  packId?: string;
  displayName: string;
  startDate: string;
  endDate: string;
  status: string;
  annualReturn?: number;
  maxDrawdown?: number;
  calmar?: number;
  winRate?: number;
  tradeCount?: number;
  finalEquity?: number;
  notes?: string;
};

type Point = { pointId: string; runId: string; sessionDate: string; equity: number; drawdown?: number };
type Trade = {
  tradeId: string;
  runId: string;
  ticker: string;
  side: string;
  entryDate?: string;
  exitDate?: string;
  entryPrice?: number;
  exitPrice?: number;
  pnl?: number;
  exitReason?: string;
};

type WindowStats = {
  pointCount: number;
  startEquity: number | null;
  endEquity: number | null;
  windowReturn: number | null;
  worstDrawdown: number | null;
  entries: number;
  exitsByReason: Record<string, number>;
};

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`读取失败 ${response.status}`);
  return response.json() as Promise<T>;
}

function pct(value: number | undefined | null): string {
  if (value == null || Number.isNaN(value)) return '—';
  return `${(value * 100).toFixed(2)}%`;
}

function money(value: number | undefined | null): string {
  if (value == null || Number.isNaN(value)) return '—';
  return value.toLocaleString('zh-CN', { maximumFractionDigits: 0 });
}

function deltaPct(left: number | null | undefined, right: number | null | undefined): string {
  if (left == null || right == null || Number.isNaN(left) || Number.isNaN(right)) return '—';
  const d = right - left;
  const sign = d > 0 ? '+' : '';
  return `${sign}${(d * 100).toFixed(2)}pp`;
}

function deltaNum(left: number | null | undefined, right: number | null | undefined): string {
  if (left == null || right == null || Number.isNaN(left) || Number.isNaN(right)) return '—';
  const d = right - left;
  const sign = d > 0 ? '+' : '';
  return `${sign}${d.toLocaleString('zh-CN', { maximumFractionDigits: 2 })}`;
}

function windowStats(points: Point[], trades: Trade[], from: string, to: string): WindowStats {
  const pts = points.filter((p) => p.sessionDate >= from && p.sessionDate <= to);
  const entries = trades.filter((t) => (t.entryDate ?? '') >= from && (t.entryDate ?? '') <= to);
  const exitsByReason: Record<string, number> = {};
  for (const t of entries) {
    const reason = String(t.exitReason ?? '未写明');
    exitsByReason[reason] = (exitsByReason[reason] ?? 0) + 1;
  }
  const startEquity = pts[0]?.equity ?? null;
  const endEquity = pts.length ? pts[pts.length - 1].equity : null;
  const windowReturn =
    startEquity != null && endEquity != null && startEquity !== 0 ? endEquity / startEquity - 1 : null;
  const worstDrawdown =
    pts.length === 0
      ? null
      : Math.min(...pts.map((p) => (p.drawdown != null ? Number(p.drawdown) : 0)));
  return {
    pointCount: pts.length,
    startEquity,
    endEquity,
    windowReturn,
    worstDrawdown,
    entries: entries.length,
    exitsByReason,
  };
}

function EquityChart({ points }: { points: Point[] }) {
  if (points.length === 0) {
    return <Typography.Text type="secondary">暂无权益曲线点</Typography.Text>;
  }
  const equities = points.map((p) => p.equity);
  const min = Math.min(...equities);
  const max = Math.max(...equities);
  const span = Math.max(max - min, 1e-9);
  const width = 640;
  const height = 160;
  const path = points
    .map((p, i) => {
      const x = (i / Math.max(points.length - 1, 1)) * (width - 8) + 4;
      const y = height - 4 - ((p.equity - min) / span) * (height - 8);
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  return (
    <svg className="evaluation-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="权益曲线">
      <path d={path} fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

export default function EvaluationPage() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [leftId, setLeftId] = useState<string | null>(null);
  const [rightId, setRightId] = useState<string | null>(null);
  const [pointsByRun, setPointsByRun] = useState<Record<string, Point[]>>({});
  const [tradesByRun, setTradesByRun] = useState<Record<string, Trade[]>>({});
  const [windowFrom, setWindowFrom] = useState(DEFAULT_WINDOW.from);
  const [windowTo, setWindowTo] = useState(DEFAULT_WINDOW.to);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const list = await getJson<Run[]>(`${API}/evaluation-runs?domain=StockTrading`);
        if (cancelled) return;
        const sorted = [...list].sort((a, b) => {
          const rank = (id: string) => (id.includes('oa-engine') ? 0 : id.includes('demo') ? 2 : 1);
          const d = rank(a.runId) - rank(b.runId);
          return d !== 0 ? d : String(a.runId).localeCompare(String(b.runId));
        });
        setRuns(sorted);
        const left = sorted.find((r) => r.runId.includes('v44') && r.runId.includes('oa-engine')) ?? sorted[0];
        const right =
          sorted.find((r) => r.runId.includes('v46') && r.runId.includes('oa-engine')) ??
          sorted.find((r) => r.runId !== left?.runId) ??
          left;
        setLeftId(left?.runId ?? null);
        setRightId(right?.runId ?? null);
        setError(null);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : '加载失败');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const ids = [leftId, rightId].filter((id): id is string => id != null);
    if (ids.length === 0) return;
    let cancelled = false;
    (async () => {
      try {
        const nextPoints: Record<string, Point[]> = { ...pointsByRun };
        const nextTrades: Record<string, Trade[]> = { ...tradesByRun };
        for (const id of ids) {
          if (!nextPoints[id]) {
            const points = await getJson<Point[]>(`${API}/evaluation-points?runId=${encodeURIComponent(id)}&domain=StockTrading`);
            nextPoints[id] = [...points].sort((a, b) => a.sessionDate.localeCompare(b.sessionDate));
          }
          if (!nextTrades[id]) {
            const trades = await getJson<Trade[]>(`${API}/evaluation-trades?runId=${encodeURIComponent(id)}&domain=StockTrading`);
            nextTrades[id] = trades;
          }
        }
        if (!cancelled) {
          setPointsByRun(nextPoints);
          setTradesByRun(nextTrades);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : '加载曲线失败');
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only refetch when selection changes
  }, [leftId, rightId]);

  const left = useMemo(() => runs.find((r) => r.runId === leftId) ?? null, [runs, leftId]);
  const right = useMemo(() => runs.find((r) => r.runId === rightId) ?? null, [runs, rightId]);

  const leftWindow = useMemo(
    () =>
      left
        ? windowStats(pointsByRun[left.runId] ?? [], tradesByRun[left.runId] ?? [], windowFrom, windowTo)
        : null,
    [left, pointsByRun, tradesByRun, windowFrom, windowTo],
  );
  const rightWindow = useMemo(
    () =>
      right
        ? windowStats(pointsByRun[right.runId] ?? [], tradesByRun[right.runId] ?? [], windowFrom, windowTo)
        : null,
    [right, pointsByRun, tradesByRun, windowFrom, windowTo],
  );

  const compareRows = useMemo(() => {
    if (!left || !right) return [];
    return [
      {
        key: 'annual',
        metric: '年化收益（全样本）',
        left: pct(left.annualReturn),
        right: pct(right.annualReturn),
        delta: deltaPct(left.annualReturn, right.annualReturn),
      },
      {
        key: 'mdd',
        metric: '最大回撤（全样本）',
        left: pct(left.maxDrawdown),
        right: pct(right.maxDrawdown),
        delta: deltaPct(left.maxDrawdown, right.maxDrawdown),
      },
      {
        key: 'calmar',
        metric: 'Calmar',
        left: left.calmar?.toFixed(2) ?? '—',
        right: right.calmar?.toFixed(2) ?? '—',
        delta: deltaNum(left.calmar, right.calmar),
      },
      {
        key: 'win',
        metric: '胜率',
        left: pct(left.winRate),
        right: pct(right.winRate),
        delta: deltaPct(left.winRate, right.winRate),
      },
      {
        key: 'trades',
        metric: '成交笔数（全样本）',
        left: String(left.tradeCount ?? '—'),
        right: String(right.tradeCount ?? '—'),
        delta: deltaNum(left.tradeCount, right.tradeCount),
      },
      {
        key: 'equity',
        metric: '最终权益',
        left: money(left.finalEquity),
        right: money(right.finalEquity),
        delta: deltaNum(left.finalEquity, right.finalEquity),
      },
      {
        key: 'wRet',
        metric: `窗口收益 ${windowFrom}→${windowTo}`,
        left: pct(leftWindow?.windowReturn),
        right: pct(rightWindow?.windowReturn),
        delta: deltaPct(leftWindow?.windowReturn, rightWindow?.windowReturn),
      },
      {
        key: 'wDd',
        metric: '窗口最差回撤（曲线点）',
        left: pct(leftWindow?.worstDrawdown),
        right: pct(rightWindow?.worstDrawdown),
        delta: deltaPct(leftWindow?.worstDrawdown, rightWindow?.worstDrawdown),
      },
      {
        key: 'wEntries',
        metric: '窗口入场笔数',
        left: String(leftWindow?.entries ?? '—'),
        right: String(rightWindow?.entries ?? '—'),
        delta: deltaNum(leftWindow?.entries, rightWindow?.entries),
      },
    ];
  }, [left, right, leftWindow, rightWindow, windowFrom, windowTo]);

  const metricCards = (run: Run | null, stats: WindowStats | null) => {
    if (!run) return null;
    return (
      <Row gutter={[12, 12]}>
        <Col span={8}><Card size="small" title="年化收益">{pct(run.annualReturn)}</Card></Col>
        <Col span={8}><Card size="small" title="最大回撤">{pct(run.maxDrawdown)}</Card></Col>
        <Col span={8}><Card size="small" title="Calmar">{run.calmar?.toFixed(2) ?? '—'}</Card></Col>
        <Col span={8}><Card size="small" title="胜率">{pct(run.winRate)}</Card></Col>
        <Col span={8}><Card size="small" title="成交笔数">{run.tradeCount ?? '—'}</Card></Col>
        <Col span={8}><Card size="small" title="最终权益">{money(run.finalEquity)}</Card></Col>
        <Col span={8}><Card size="small" title="窗口收益">{pct(stats?.windowReturn)}</Card></Col>
        <Col span={8}><Card size="small" title="窗口入场">{stats?.entries ?? '—'}</Card></Col>
        <Col span={8}><Card size="small" title="窗口曲线点">{stats?.pointCount ?? '—'}</Card></Col>
      </Row>
    );
  };

  const reasonText = (stats: WindowStats | null) => {
    if (!stats || Object.keys(stats.exitsByReason).length === 0) return '窗口内无入场成交。';
    return Object.entries(stats.exitsByReason)
      .sort((a, b) => b[1] - a[1])
      .map(([reason, count]) => `${reason} ${count}`)
      .join(' · ');
  };

  return (
    <FoundryShell
      app="Ontology"
      title="Evaluation"
      lead="策略回测对照。窗口和涨停回马枪 1 这一段日子对齐。"
      actions={[
        { label: '开盘前安排', to: '/workshop/pre-open?date=2026-08-06' },
        { label: 'Data Health', to: '/data/health' },
      ]}
    >
      {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
      {loading ? (
        <Spin />
      ) : runs.length === 0 ? (
        <Alert
          type="info"
          showIcon
          message="暂无回测运行"
          description="请先写入 EvaluationRun（pipeline/seed-evaluation-runs.ts），或启用策略后用 evaluate-strategy 重跑。"
        />
      ) : (
        <>
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
            message="Workshop 日链 ≠ Evaluation 引擎账本"
            description={
              <ul className="evaluation-diff-notes">
                <li>Evaluation 可记成本/滑点；Workshop 计划限价仍用信号日收盘，人手回报可抄开盘价。</li>
                <li>Workshop 有可用资金约束（买不起就跳过）；引擎按权重配仓，笔数通常更多。</li>
                <li>默认窗口对齐涨停回马枪 1 这一段：{DEFAULT_WINDOW.from} → {DEFAULT_WINDOW.to}（可改）。</li>
              </ul>
            }
          />

          <FoundrySection title="选择对照">
            <Space wrap>
              <span>左侧</span>
              <Select
                style={{ minWidth: 260 }}
                value={leftId ?? undefined}
                options={runs.map((r) => ({ value: r.runId, label: `${r.displayName}（${r.strategyId}）` }))}
                onChange={setLeftId}
              />
              <span>右侧</span>
              <Select
                style={{ minWidth: 260 }}
                value={rightId ?? undefined}
                options={runs.map((r) => ({ value: r.runId, label: `${r.displayName}（${r.strategyId}）` }))}
                onChange={setRightId}
              />
              <span>窗口</span>
              <Input style={{ width: 130 }} value={windowFrom} onChange={(e) => setWindowFrom(e.target.value)} />
              <span>→</span>
              <Input style={{ width: 130 }} value={windowTo} onChange={(e) => setWindowTo(e.target.value)} />
              <Typography.Link
                onClick={() => {
                  setWindowFrom(DEFAULT_WINDOW.from);
                  setWindowTo(DEFAULT_WINDOW.to);
                }}
              >
                日链默认窗
              </Typography.Link>
              <Link to="/workshop/pre-open?date=2026-08-06">开盘前 · 08-06</Link>
            </Space>
          </FoundrySection>

          {left && right ? (
            <FoundrySection title="指标差（右 − 左）">
              <Table
                size="small"
                pagination={false}
                rowKey="key"
                dataSource={compareRows}
                columns={[
                  { title: '指标', dataIndex: 'metric', width: 240 },
                  { title: left.displayName, dataIndex: 'left' },
                  { title: right.displayName, dataIndex: 'right' },
                  { title: '差', dataIndex: 'delta', width: 140 },
                ]}
              />
              <Typography.Paragraph type="secondary" style={{ marginTop: 12, marginBottom: 0 }}>
                窗口出场构成 · 左：{reasonText(leftWindow)}；右：{reasonText(rightWindow)}
              </Typography.Paragraph>
            </FoundrySection>
          ) : null}

          <Row gutter={24}>
            {[
              { run: left, stats: leftWindow },
              { run: right, stats: rightWindow },
            ].map(({ run, stats }, index) => (
              <Col key={index} span={12}>
                <FoundrySection
                  title={run ? run.displayName : '未选择'}
                  eyebrow={
                    run
                      ? `${run.startDate} → ${run.endDate} · Pack ${run.packId ?? '—'}`
                      : undefined
                  }
                >
                  {run ? (
                    <Typography.Paragraph type="secondary" style={{ marginTop: 0 }}>
                      <Link to={`/ontology/object-view?type=Strategy&id=${encodeURIComponent(run.strategyId)}`}>
                        做法 {run.strategyId}
                      </Link>
                    </Typography.Paragraph>
                  ) : null}
                  {metricCards(run, stats)}
                  <div className="evaluation-chart-wrap">
                    <EquityChart
                      points={
                        run
                          ? (pointsByRun[run.runId] ?? []).filter(
                              (p) => p.sessionDate >= windowFrom && p.sessionDate <= windowTo,
                            )
                          : []
                      }
                    />
                    <Typography.Text type="secondary" className="evaluation-chart-caption">
                      上图仅窗口内曲线点（全样本点可能更密）
                    </Typography.Text>
                  </div>
                  {run?.notes && (
                    <Typography.Paragraph type="secondary" style={{ marginTop: 8 }}>
                      {run.notes}
                    </Typography.Paragraph>
                  )}
                  <Table
                    size="small"
                    pagination={{ pageSize: 6 }}
                    rowKey="tradeId"
                    dataSource={
                      run
                        ? (tradesByRun[run.runId] ?? []).filter(
                            (t) => (t.entryDate ?? '') >= windowFrom && (t.entryDate ?? '') <= windowTo,
                          )
                        : []
                    }
                    columns={[
                      { title: '标的', dataIndex: 'ticker' },
                      { title: '方向', dataIndex: 'side' },
                      { title: '入场日', dataIndex: 'entryDate' },
                      { title: '出场日', dataIndex: 'exitDate' },
                      {
                        title: '盈亏',
                        dataIndex: 'pnl',
                        render: (v: number) => (v == null ? '—' : v.toFixed(2)),
                      },
                      { title: '原因', dataIndex: 'exitReason' },
                    ]}
                  />
                </FoundrySection>
              </Col>
            ))}
          </Row>
        </>
      )}
    </FoundryShell>
  );
}
