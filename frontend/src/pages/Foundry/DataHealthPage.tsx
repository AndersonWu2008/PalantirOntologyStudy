import React, { useMemo, useState } from 'react';
import { Alert, Button, Input, Select, Space, Table, Tag, Typography } from 'antd';
import { Link } from 'react-router-dom';
import { FoundrySection, FoundryShell } from './FoundryShell';
import {
  getHealthPack,
  healthPacks,
  type HealthPack,
  type HealthRuleResult,
  type HealthStatus,
} from './health/packs';

const API = 'http://127.0.0.1:3010';

type RowResult = {
  id: string;
  displayName: string;
  severity: string;
  description: string;
  status: HealthStatus | 'pending' | 'running';
  summary: string;
  evidence: { label: string; detail?: string; href?: string }[];
};

function statusTag(status: RowResult['status']) {
  if (status === 'pass') return <Tag className="ds-capsule ds-capsule--success" color="success">pass</Tag>;
  if (status === 'fail') return <Tag className="ds-capsule ds-capsule--danger" color="error">fail</Tag>;
  if (status === 'warn') return <Tag className="ds-capsule ds-capsule--warning" color="warning">warn</Tag>;
  if (status === 'running') return <Tag className="ds-capsule ds-capsule--blue" color="processing">running</Tag>;
  if (status === 'skip') return <Tag className="ds-capsule">skip</Tag>;
  return <Tag className="ds-capsule">pending</Tag>;
}

export default function DataHealthPage() {
  const [packId, setPackId] = useState(healthPacks[0].id);
  const pack = getHealthPack(packId);
  const [probeDate, setProbeDate] = useState('2026-05-22');
  const [accountId, setAccountId] = useState('acct-1');
  const [rows, setRows] = useState<RowResult[]>(() =>
    pack.rules.map((rule) => ({
      id: rule.id,
      displayName: rule.displayName,
      severity: rule.severity,
      description: rule.description,
      status: 'pending',
      summary: '尚未运行',
      evidence: [],
    })),
  );
  const [running, setRunning] = useState(false);
  const [repairing, setRepairing] = useState(false);
  const [repairNote, setRepairNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const counts = useMemo(() => {
    const tally = { pass: 0, fail: 0, warn: 0, other: 0 };
    for (const row of rows) {
      if (row.status === 'pass') tally.pass += 1;
      else if (row.status === 'fail') tally.fail += 1;
      else if (row.status === 'warn') tally.warn += 1;
      else tally.other += 1;
    }
    return tally;
  }, [rows]);

  function selectPack(next: HealthPack) {
    setPackId(next.id);
    setRows(
      next.rules.map((rule) => ({
        id: rule.id,
        displayName: rule.displayName,
        severity: rule.severity,
        description: rule.description,
        status: 'pending',
        summary: '尚未运行',
        evidence: [],
      })),
    );
  }

  async function repairChangePercent() {
    setRepairing(true);
    setRepairNote(null);
    setError(null);
    try {
      const prev = await fetch(`${API}/daily-bars/previous-close`, { method: 'POST' });
      const prevBody = (await prev.json()) as { written?: number; error?: string };
      if (!prev.ok) throw new Error(prevBody.error ?? `previous-close ${prev.status}`);
      const chg = await fetch(`${API}/daily-bars/change-percent`, { method: 'POST' });
      const chgBody = (await chg.json()) as { written?: number; error?: string };
      if (!chg.ok) throw new Error(chgBody.error ?? `change-percent ${chg.status}`);
      setRepairNote(
        `已补 previous_close ${prevBody.written ?? 0} 行 · change_percent ${chgBody.written ?? 0} 行。缺口仍在则重跑开盘管道 / advance-day。`,
      );
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '补涨跌幅失败');
    } finally {
      setRepairing(false);
    }
  }

  async function runAll() {
    setRunning(true);
    setError(null);
    const ctx = {
      domain: pack.domain ?? 'StockTrading',
      probeDate,
      accountId,
      apiBase: API,
    };
    setRows((prev) => prev.map((row) => ({ ...row, status: 'running', summary: '…' })));
    const nextRows: RowResult[] = [];
    try {
      for (const rule of pack.rules) {
        let result: HealthRuleResult;
        try {
          result = await rule.run(ctx);
        } catch (reason) {
          result = {
            status: 'fail',
            summary: reason instanceof Error ? reason.message : '规则抛错',
            evidence: [],
          };
        }
        nextRows.push({
          id: rule.id,
          displayName: rule.displayName,
          severity: rule.severity,
          description: rule.description,
          status: result.status,
          summary: result.summary,
          evidence: result.evidence,
        });
        setRows([...nextRows, ...pack.rules.slice(nextRows.length).map((rule) => ({
          id: rule.id,
          displayName: rule.displayName,
          severity: rule.severity,
          description: rule.description,
          status: 'pending' as const,
          summary: '排队',
          evidence: [],
        }))]);
      }
      setRows(nextRows);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '运行失败');
    } finally {
      setRunning(false);
    }
  }

  return (
    <FoundryShell
      app="Data Health"
      title="Ontology / 数据质量检查"
      lead="通用健康检查：Rule Pack 挂在域上。股票域的池缺口与开仓门是规则，不是专用监控台。"
      actions={[
        { label: 'Data Connection', to: '/data/connection', primary: true },
        { label: 'Dataset Preview', to: '/data/dataset-preview' },
        { label: 'Pipeline Builder', to: '/data/pipelines' },
      ]}
    >
      <FoundrySection title="Pack" eyebrow="Rules">
        <Space wrap>
          <Select
            style={{ minWidth: 320 }}
            value={pack.id}
            options={healthPacks.map((item) => ({ value: item.id, label: item.displayName }))}
            onChange={(value: string) => selectPack(getHealthPack(value))}
          />
          <Input
            style={{ width: 140 }}
            value={probeDate}
            onChange={(event) => setProbeDate(event.target.value)}
            placeholder="probeDate"
          />
          <Input
            style={{ width: 120 }}
            value={accountId}
            onChange={(event) => setAccountId(event.target.value)}
            placeholder="accountId"
          />
          <Button type="primary" className="ds-btn--blue" loading={running} onClick={() => void runAll()}>
            Run pack
          </Button>
          <Button type="primary" className="ds-btn--orange" loading={repairing} onClick={() => void repairChangePercent()}>
            一键补涨跌幅
          </Button>
          <Typography.Text type="secondary">
            pass {counts.pass} · warn {counts.warn} · fail {counts.fail}
          </Typography.Text>
        </Space>
        <Typography.Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0 }}>
          {pack.description}
        </Typography.Paragraph>
      </FoundrySection>

      {error ? <Alert type="error" showIcon message={error} style={{ marginBottom: 12 }} /> : null}
      {repairNote ? <Alert type="success" showIcon message={repairNote} style={{ marginBottom: 12 }} /> : null}

      <FoundrySection title="Results" eyebrow="Checks">
        <Table
          size="small"
          pagination={false}
          rowKey="id"
          dataSource={rows}
          columns={[
            {
              title: 'Status',
              dataIndex: 'status',
              width: 88,
              render: (value: RowResult['status']) => statusTag(value),
            },
            { title: 'Rule', dataIndex: 'displayName', width: 220 },
            { title: 'Severity', dataIndex: 'severity', width: 88 },
            { title: 'Summary', dataIndex: 'summary' },
            {
              title: 'Evidence',
              key: 'evidence',
              render: (_: unknown, row: RowResult) => (
                <Space wrap size={[4, 4]}>
                  {row.evidence.length === 0 ? '—' : null}
                  {row.evidence.map((item, index) =>
                    item.href ? (
                      <Link key={`${row.id}-${index}`} to={item.href}>
                        {item.label}
                        {item.detail ? ` (${item.detail})` : ''}
                      </Link>
                    ) : (
                      <Typography.Text key={`${row.id}-${index}`} type="secondary">
                        {item.label}
                        {item.detail ? ` · ${item.detail}` : ''}
                      </Typography.Text>
                    ),
                  )}
                </Space>
              ),
            },
          ]}
          expandable={{
            expandedRowRender: (row) => <Typography.Text type="secondary">{row.description}</Typography.Text>,
          }}
        />
      </FoundrySection>

      <FoundrySection title="How this stays generic" eyebrow="Platform">
        <p>
          Pack <span className="foundry-mono">{pack.id}</span> 只是一组{' '}
          <span className="foundry-mono">HealthRule.run(ctx)</span>。
          换域注册新 Pack，不必改壳。
        </p>
      </FoundrySection>
    </FoundryShell>
  );
}
