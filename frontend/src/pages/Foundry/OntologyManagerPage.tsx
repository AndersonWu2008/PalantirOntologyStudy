import React, { useEffect, useMemo, useState } from 'react';
import { Button, Card, Descriptions, Empty, Space, Table, Tabs } from 'antd';
import {
  ApartmentOutlined,
  AppstoreOutlined,
  CodeOutlined,
  LinkOutlined,
  SearchOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  catalogDetail,
  listCatalogActions,
  listCatalogFunctions,
  listCatalogLinks,
  listCatalogObjects,
  relatedActions,
  relatedFunctions,
  typeTitle,
  usageOf,
  type CatalogAction,
  type CatalogFunction,
  type CatalogObject,
} from '@/pages/DataExplorer/stockFallback';
import { ensureRuntimeSchema } from '@/pages/DataExplorer/runtimeSchema';
import { HuimaqiangFlow, isHuimaqiangFunction } from './playbookPicture';
import './OntologyManagerPage.less';

const roles: Record<string, string> = {
  Account: '账户',
  Stock: '股票',
  Industry: '行业',
  TradableRange: '可买范围',
  Strategy: '做法',
  TradingDay: '交易日',
  DailyBar: '日行情',
  Position: '持仓',
  Fill: '成交',
  Signal: '信号',
  PreOpenArrangement: '开盘安排',
  SellLine: '卖出行',
  BuyLine: '买入行',
  SellOrder: '卖出委托',
  BuyOrder: '买入委托',
};

function ObjectTypePanel({ detail }: { detail: CatalogObject }) {
  const navigate = useNavigate();
  const functions = relatedFunctions(detail.apiName);
  const actions = relatedActions(detail.apiName);
  const usage = usageOf(detail.apiName);

  return (
    <Tabs
      items={[
        {
          key: 'overview',
          label: 'Overview',
          children: (
            <Card size="small">
              <Descriptions column={2} size="small">
                <Descriptions.Item label="状态">{detail.status}</Descriptions.Item>
                <Descriptions.Item label="域">StockTrading</Descriptions.Item>
                <Descriptions.Item label="主键">{detail.primaryKey}</Descriptions.Item>
                <Descriptions.Item label="标题">{detail.titleKey}</Descriptions.Item>
                <Descriptions.Item label="属性">{detail.properties.length}</Descriptions.Item>
                <Descriptions.Item label="链接">{detail.links.length}</Descriptions.Item>
                <Descriptions.Item label="说明" span={2}>{detail.description || '—'}</Descriptions.Item>
                <Descriptions.Item label="Dependents / Usage" span={2}>
                  {usage.join(' · ')}
                </Descriptions.Item>
              </Descriptions>
              <Space style={{ marginTop: 12 }}>
                <Button type="primary" onClick={() => navigate(`/ontology?focus=${detail.apiName}`)}>
                  Object Explorer
                </Button>
                {detail.apiName === 'PreOpenArrangement' || detail.apiName === 'Position' || detail.apiName === 'Stock' || detail.apiName === 'Strategy' ? (
                  <Button onClick={() => navigate(`/ontology/object-view?type=${detail.apiName}`)}>
                    Object View
                  </Button>
                ) : null}
                <Button onClick={() => navigate('/code/repositories')}>Code Repositories</Button>
              </Space>
            </Card>
          ),
        },
        {
          key: 'properties',
          label: `Properties (${detail.properties.length})`,
          children: (
            <Table
              size="small"
              rowKey="apiName"
              pagination={false}
              scroll={{ x: 1100 }}
              dataSource={detail.properties}
              columns={[
                { title: 'apiName', dataIndex: 'apiName', width: 180 },
                { title: '名称', dataIndex: 'displayName', width: 140 },
                { title: 'data type', dataIndex: 'dataType', width: 100 },
                { title: '值类型', dataIndex: 'valueType', width: 120 },
                { title: '写通道', dataIndex: 'writeChannel', width: 220 },
                {
                  title: '必填',
                  dataIndex: 'required',
                  width: 64,
                  render: (required: boolean) => (required ? '是' : ''),
                },
                { title: '说明', dataIndex: 'description' },
              ]}
            />
          ),
        },
        {
          key: 'links',
          label: `Link types (${detail.links.length})`,
          children: (
            <Table
              size="small"
              rowKey="apiName"
              pagination={false}
              dataSource={detail.links}
              columns={[
                { title: 'apiName', dataIndex: 'apiName' },
                { title: '名称', dataIndex: 'displayName' },
                { title: '从', dataIndex: 'sourceType', render: (value: string) => typeTitle(value) },
                { title: '到', dataIndex: 'targetType', render: (value: string) => typeTitle(value) },
                { title: '基数', dataIndex: 'cardinality', width: 120 },
                { title: '说明', dataIndex: 'description' },
              ]}
            />
          ),
        },
        {
          key: 'functions',
          label: `Functions (${functions.length})`,
          children: functions.length === 0 ? (
            <Empty description="这一类型上没有挂住的 Function（或尚未标注）" />
          ) : (
            <Table
              size="small"
              rowKey="apiName"
              pagination={false}
              dataSource={functions}
              columns={[
                { title: 'apiName', dataIndex: 'apiName', width: 200 },
                { title: '名称', dataIndex: 'displayName', width: 140 },
                { title: '读', dataIndex: 'reads' },
                { title: '写下', dataIndex: 'writes' },
                {
                  title: '',
                  width: 100,
                  render: (_: unknown, row: CatalogFunction) => (
                    <Link to={`/code/repositories?fn=${encodeURIComponent(row.apiName)}`}>代码落点</Link>
                  ),
                },
              ]}
            />
          ),
        },
        {
          key: 'actions',
          label: `Actions (${actions.length})`,
          children: actions.length === 0 ? (
            <Empty description="这一类型上没有挂住的 Action Type" />
          ) : (
            <Table
              size="small"
              rowKey="apiName"
              pagination={false}
              dataSource={actions}
              columns={[
                { title: 'apiName', dataIndex: 'apiName', width: 200 },
                { title: '名称', dataIndex: 'displayName', width: 140 },
                { title: '参数', dataIndex: 'parameters' },
                { title: '提交条件', dataIndex: 'condition' },
                { title: '现在能否提交', dataIndex: 'code' },
              ]}
            />
          ),
        },
      ]}
    />
  );
}

type Kind = 'object' | 'link' | 'action' | 'function';
type Section = 'overview' | 'search' | Kind;

type Hit = {
  kind: Kind;
  apiName: string;
  title: string;
  subtitle: string;
};

const sections: { id: Section; label: string; icon: React.ReactNode }[] = [
  { id: 'overview', label: 'Overview', icon: <AppstoreOutlined /> },
  { id: 'search', label: 'Search results', icon: <SearchOutlined /> },
  { id: 'object', label: 'Object types', icon: <ApartmentOutlined /> },
  { id: 'link', label: 'Link types', icon: <LinkOutlined /> },
  { id: 'action', label: 'Action types', icon: <ThunderboltOutlined /> },
  { id: 'function', label: 'Functions', icon: <CodeOutlined /> },
];

function highlight(text: string, query: string): React.ReactNode {
  const needle = query.trim();
  if (!needle) return text;
  const lower = text.toLowerCase();
  const target = needle.toLowerCase();
  const parts: React.ReactNode[] = [];
  let cursor = 0;
  let key = 0;
  while (cursor < text.length) {
    const at = lower.indexOf(target, cursor);
    if (at < 0) {
      parts.push(text.slice(cursor));
      break;
    }
    if (at > cursor) parts.push(text.slice(cursor, at));
    parts.push(
      <mark key={key} className="om-mark">
        {text.slice(at, at + needle.length)}
      </mark>,
    );
    key += 1;
    cursor = at + needle.length;
  }
  return parts;
}

export default function OntologyManagerPage() {
  const [params, setParams] = useSearchParams();
  const query = params.get('q') ?? '';
  const section = (params.get('section') as Section | null) ?? (query ? 'search' : 'search');
  const selected = params.get('type');
  const selectedKind = (params.get('kind') as Kind | null) ?? 'object';
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    ensureRuntimeSchema()
      .then(() => {
        if (live) setReady(true);
      })
      .catch(() => {
        if (live) setFailed(true);
      });
    return () => {
      live = false;
    };
  }, []);

  const objects = useMemo(() => (ready ? listCatalogObjects() : []), [ready]);
  const links = useMemo(() => (ready ? listCatalogLinks() : []), [ready]);
  const functions = useMemo(() => listCatalogFunctions(), []);
  const actions = useMemo(() => listCatalogActions(), []);

  const hits = useMemo<Hit[]>(() => {
    const rows: Hit[] = [
      ...objects.map((item) => ({
        kind: 'object' as const,
        apiName: item.apiName,
        title: item.apiName,
        subtitle: roles[item.apiName] ?? item.displayName,
      })),
      ...links.map((item) => ({
        kind: 'link' as const,
        apiName: item.apiName,
        title: item.apiName,
        subtitle: `${typeTitle(item.sourceType)} → ${typeTitle(item.targetType)}`,
      })),
      ...actions.map((item) => ({
        kind: 'action' as const,
        apiName: item.apiName,
        title: item.apiName,
        subtitle: item.displayName,
      })),
      ...functions.map((item) => ({
        kind: 'function' as const,
        apiName: item.apiName,
        title: item.apiName,
        subtitle: item.displayName,
      })),
    ];
    const needle = query.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((row) =>
      `${row.title} ${row.subtitle} ${row.apiName}`.toLowerCase().includes(needle),
    );
  }, [actions, functions, links, objects, query]);

  const totals: Record<Section, number> = {
    overview: hits.length,
    search: hits.length,
    object: objects.length,
    link: links.length,
    action: actions.length,
    function: functions.length,
  };

  const visible = section === 'search' || section === 'overview'
    ? hits
    : hits.filter((row) => row.kind === section);

  const showSelection = Boolean(selected) && section !== 'search' && section !== 'overview';
  const detail = showSelection && selected && selectedKind === 'object'
    ? (catalogDetail(`object-type:${selected}`) as CatalogObject | null)
    : null;
  const selectedHit = showSelection
    ? hits.find((row) => row.apiName === selected && row.kind === selectedKind) ?? null
    : null;

  const openSection = (next: Section) => {
    const paramsNext = new URLSearchParams(params);
    paramsNext.set('section', next);
    paramsNext.delete('type');
    paramsNext.delete('kind');
    setParams(paramsNext, { replace: true });
  };

  const openHit = (hit: Hit) => {
    const paramsNext = new URLSearchParams(params);
    paramsNext.set('section', hit.kind);
    paramsNext.set('type', hit.apiName);
    paramsNext.set('kind', hit.kind);
    setParams(paramsNext);
  };

  return (
    <div className="om-app">
      <aside className="om-nav">
        {sections.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`om-nav__item ${section === item.id ? 'is-active' : ''}`}
            onClick={() => openSection(item.id)}
          >
            <span className="om-nav__icon">{item.icon}</span>
            <span className="om-nav__label">{item.label}</span>
            {item.id !== 'overview' ? <span className="om-nav__count">{totals[item.id]}</span> : null}
          </button>
        ))}
      </aside>

      <section className="om-main">
        {failed ? (
          <Empty description="读不到库里的资源定义" />
        ) : !ready ? (
          <Empty description="正在读取库里的资源定义" />
        ) : detail ? (
          <div className="om-detail">
            <button type="button" className="om-back" onClick={() => openSection(section === 'overview' ? 'search' : section)}>
              {sections.find((item) => item.id === section)?.label ?? 'Search results'}
            </button>
            <h1>{detail.displayName} · {detail.apiName}</h1>
            <ObjectTypePanel detail={detail} />
          </div>
        ) : selectedHit && selectedKind !== 'object' ? (
          <div className="om-detail">
            <button type="button" className="om-back" onClick={() => openSection(section)}>
              {sections.find((item) => item.id === section)?.label ?? 'Search results'}
            </button>
            <h1>{selectedHit.title}</h1>
            <p className="om-detail__sub">{selectedHit.subtitle}</p>
            <HitFacts hit={selectedHit} functions={functions} actions={actions} links={links} />
          </div>
        ) : section === 'overview' ? (
          <div className="om-overview">
            <h1>Overview</h1>
            <p>只读定义。类型变更走 Proposals，不在此页改仓库。</p>
            <div className="om-stats">
              {(['object', 'link', 'action', 'function'] as Kind[]).map((kind) => (
                <button key={kind} type="button" onClick={() => openSection(kind)}>
                  <strong>{totals[kind]}</strong>
                  <span>{sections.find((item) => item.id === kind)?.label}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="om-list">
            {visible.length === 0 ? (
              <Empty description={query ? '没有匹配的资源' : '这一类还没有资源'} />
            ) : (
              visible.map((hit) => (
                <button
                  key={`${hit.kind}:${hit.apiName}`}
                  type="button"
                  className="om-row"
                  onClick={() => openHit(hit)}
                >
                  <KindMark kind={hit.kind} />
                  <span className="om-row__text">
                    <span className="om-row__title">{highlight(hit.title, query)}</span>
                    {hit.subtitle ? (
                      <span className="om-row__sub">{highlight(hit.subtitle, query)}</span>
                    ) : null}
                  </span>
                </button>
              ))
            )}
          </div>
        )}
      </section>
    </div>
  );
}

function KindMark({ kind }: { kind: Kind }) {
  if (kind === 'function') return <span className="om-fx">fx</span>;
  const icon = kind === 'link'
    ? <LinkOutlined />
    : kind === 'action'
      ? <ThunderboltOutlined />
      : <ApartmentOutlined />;
  return <span className="om-kind">{icon}</span>;
}

function HitFacts({
  hit,
  functions,
  actions,
  links,
}: {
  hit: Hit;
  functions: CatalogFunction[];
  actions: CatalogAction[];
  links: ReturnType<typeof listCatalogLinks>;
}) {
  if (hit.kind === 'function') {
    const row = functions.find((item) => item.apiName === hit.apiName);
    if (!row) return null;
    return (
      <>
      {isHuimaqiangFunction(row.apiName) ? <HuimaqiangFlow apiName={row.apiName} /> : null}
      <Descriptions column={1} size="small" bordered>
        <Descriptions.Item label="读">{row.reads || '—'}</Descriptions.Item>
        <Descriptions.Item label="写下">{row.writes || '—'}</Descriptions.Item>
        <Descriptions.Item label="为什么不是 Action">{row.whyNotAction || '—'}</Descriptions.Item>
      </Descriptions>
      </>
    );
  }
  if (hit.kind === 'action') {
    const row = actions.find((item) => item.apiName === hit.apiName);
    if (!row) return null;
    return (
      <Descriptions column={1} size="small" bordered>
        <Descriptions.Item label="谁能用">{row.who || '—'}</Descriptions.Item>
        <Descriptions.Item label="参数">{row.parameters || '—'}</Descriptions.Item>
        <Descriptions.Item label="提交条件">{row.condition || '—'}</Descriptions.Item>
        <Descriptions.Item label="现在能否提交">{row.code || '—'}</Descriptions.Item>
      </Descriptions>
    );
  }
  const row = links.find((item) => item.apiName === hit.apiName);
  if (!row) return null;
  return (
    <Descriptions column={1} size="small" bordered>
      <Descriptions.Item label="从">{typeTitle(row.sourceType)}</Descriptions.Item>
      <Descriptions.Item label="到">{typeTitle(row.targetType)}</Descriptions.Item>
      <Descriptions.Item label="基数">{row.cardinality}</Descriptions.Item>
      <Descriptions.Item label="说明">{row.description || '—'}</Descriptions.Item>
    </Descriptions>
  );
}
