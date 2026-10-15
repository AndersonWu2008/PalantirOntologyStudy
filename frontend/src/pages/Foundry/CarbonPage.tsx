import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, Select, Space, Spin, Tag, Typography } from 'antd';
import { Link, useSearchParams } from 'react-router-dom';
import { FoundrySection, FoundryShell } from './FoundryShell';
import {
  carbonWorkspaces,
  getCarbonWorkspace,
  type CarbonModule,
  type CarbonWorkspace,
} from './carbon/workspaces';
import './CarbonPage.less';

const API = 'http://127.0.0.1:3010';

type Row = Record<string, unknown>;

type LiveContext = {
  arrangementId: string;
  header: string;
  sessionDate: string;
  positionCount: number;
  openPositions: number;
};

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`读取失败 ${response.status}`);
  return response.json() as Promise<T>;
}

function currentArrangement(rows: Row[]): Row | undefined {
  const superseded = new Set(
    rows.map((row) => row.supersedesArrangementId).filter((id) => id != null && id !== '').map(String),
  );
  const byDate = [...rows].sort((left, right) =>
    String(right.sessionDate).localeCompare(String(left.sessionDate)),
  );
  return byDate.find(
    (row) =>
      !superseded.has(String(row.arrangementId))
      && !rows.some((other) => other.supersedesArrangementId === row.arrangementId),
  );
}

function resolvePath(module: CarbonModule, live: LiveContext | null): string {
  let path = module.path;
  if (live) {
    path = path
      .replaceAll('{arrangementId}', encodeURIComponent(live.arrangementId))
      .replaceAll('{date}', encodeURIComponent(live.sessionDate));
    if (module.app === 'Vertex' && !path.includes('id=')) {
      path += `&id=${encodeURIComponent(live.arrangementId)}`;
    }
    if (module.app === 'Workshop' && live.sessionDate && !path.includes('date=')) {
      path += path.includes('?') ? `&date=${encodeURIComponent(live.sessionDate)}` : `?date=${encodeURIComponent(live.sessionDate)}`;
    }
  }
  return path;
}

function ModuleCard({
  module,
  live,
}: {
  module: CarbonModule;
  live: LiveContext | null;
}) {
  const to = resolvePath(module, live);
  return (
    <Card size="small" className={`carbon-module${module.primary ? ' is-primary' : ''}`}>
      <div className="carbon-module__app">{module.app}</div>
      <Typography.Title level={5} style={{ margin: '4px 0 8px' }}>
        {module.label}
      </Typography.Title>
      <Typography.Paragraph type="secondary" style={{ minHeight: 44 }}>
        {module.description}
      </Typography.Paragraph>
      <Link to={to}>
        <Button type={module.primary ? 'primary' : 'default'} block>
          Open module
        </Button>
      </Link>
    </Card>
  );
}

export default function CarbonPage() {
  const [params, setParams] = useSearchParams();
  const workspace = getCarbonWorkspace(params.get('workspace'));
  const [live, setLive] = useState<LiveContext | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (workspace.context?.kind !== 'arrangement+positions') {
      setLive(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    const accountId = workspace.context.accountId;
    const domain = workspace.domain ?? 'StockTrading';
    (async () => {
      try {
        const [arrangements, positions] = await Promise.all([
          getJson<Row[]>(`${API}/arrangements?domain=${encodeURIComponent(domain)}&accountId=${encodeURIComponent(accountId)}`),
          getJson<Row[]>(`${API}/positions?domain=${encodeURIComponent(domain)}&accountId=${encodeURIComponent(accountId)}`),
        ]);
        if (cancelled) return;
        const page = currentArrangement(arrangements);
        const openPositions = positions.filter((row) => Number(row.quantity) > 0).length;
        if (!page) {
          setLive(null);
          return;
        }
        setLive({
          arrangementId: String(page.arrangementId),
          header: String(page.header ?? ''),
          sessionDate: String(page.sessionDate ?? ''),
          positionCount: positions.length,
          openPositions,
        });
      } catch (reason) {
        if (!cancelled) setError(reason instanceof Error ? reason.message : '上下文读取失败');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [workspace]);

  const anchored = useMemo(
    () => workspace.modules.filter((module) => module.primary).concat(workspace.modules.filter((module) => !module.primary).slice(0, 3)),
    [workspace],
  );

  function selectWorkspace(next: CarbonWorkspace) {
    setParams({ workspace: next.id });
  }

  return (
    <FoundryShell
      app="Carbon"
      title={workspace.displayName}
      lead={workspace.homeLead}
      actions={[
        { label: 'Workshop', to: resolvePath(workspace.modules[0], live), primary: true },
        { label: 'Full platform nav', to: '/ontology/manager' },
      ]}
    >
      <FoundrySection title="Workspace" eyebrow="Carbon">
        <Space wrap>
          <Select
            style={{ minWidth: 320 }}
            value={workspace.id}
            options={carbonWorkspaces.map((item) => ({
              value: item.id,
              label: `${item.displayName} · ${item.audience}`,
            }))}
            onChange={(value: string) => selectWorkspace(getCarbonWorkspace(value))}
          />
          {workspace.domain ? <Tag>{workspace.domain}</Tag> : null}
          <Typography.Text type="secondary">{workspace.audience}</Typography.Text>
        </Space>
      </FoundrySection>

      <div className="carbon-menubar">
        <span className="carbon-menubar__label">Anchored modules</span>
        <Space wrap>
          {anchored.map((module) => (
            <Link key={module.id} to={resolvePath(module, live)}>
              <Button size="small" type={module.primary ? 'primary' : 'default'}>
                {module.app}: {module.label}
              </Button>
            </Link>
          ))}
        </Space>
      </div>

      {error ? <Alert type="error" showIcon message={error} style={{ marginBottom: 12 }} /> : null}
      {loading ? <Spin /> : null}

      {live ? (
        <FoundrySection title="Live context" eyebrow="Ontology">
          <Space direction="vertical" size={4}>
            <Typography.Text>
              Current arrangement{' '}
              <span className="foundry-mono">{live.arrangementId}</span>
            </Typography.Text>
            <Typography.Text>
              Header: <Typography.Text strong>{live.header}</Typography.Text> · session {live.sessionDate}
            </Typography.Text>
            <Typography.Text type="secondary">
              Positions on book: {live.openPositions} open / {live.positionCount} rows
            </Typography.Text>
            <Space wrap>
              <Link to={`/workshop/pre-open?date=${encodeURIComponent(live.sessionDate)}`}>
                <Button type="link">Open Workshop for this date</Button>
              </Link>
              <Link
                to={`/ontology/vertex?profile=StockTrading.arrangementExplore&type=PreOpenArrangement&id=${encodeURIComponent(live.arrangementId)}`}
              >
                <Button type="link">Open Vertex for this arrangement</Button>
              </Link>
            </Space>
          </Space>
        </FoundrySection>
      ) : null}

      <FoundrySection title="Home modules" eyebrow="Modules">
        <div className="carbon-grid">
          {workspace.modules.map((module) => (
            <ModuleCard key={module.id} module={module} live={live} />
          ))}
        </div>
      </FoundrySection>

      <FoundrySection title="How this stays generic" eyebrow="Platform">
        <p>
          Workspace <span className="foundry-mono">{workspace.id}</span> is only a curated module list + optional
          context loader. Swap audience by registering another workspace — do not fork the shell into a trading app.
        </p>
      </FoundrySection>
    </FoundryShell>
  );
}
