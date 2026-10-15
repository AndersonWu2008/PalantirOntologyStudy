import React, { useEffect, useMemo, useState } from 'react';
import { Button, Card, Checkbox, Descriptions, Empty, Input, Space, Table, Tabs, Typography } from 'antd';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  catalogDetail,
  typeTitle,
  type CatalogAction,
  type CatalogFunction,
  type CatalogLink,
  type CatalogObject,
} from '../stockFallback';
import { ensureRuntimeSchema } from '../runtimeSchema';
import { useDataExplorerStore } from '../store';
import { HuimaqiangFlow, StrategyPlaybookMap, isHuimaqiangFunction } from '@/pages/Foundry/playbookPicture';

type FilterField = {
  key: string;
  label: string;
  server?: boolean;
  defaultValue?: string;
  present?: boolean;
};

const explorerFilters: Record<string, FilterField[]> = {
  DailyBar: [
    { key: 'sessionDate', label: '交易日', server: true, defaultValue: '2026-05-18' },
    { key: 'ticker', label: '代码', server: true },
    { key: 'hasComparisonScore', label: '有比较数', present: true },
  ],
  PreOpenArrangement: [
    { key: 'sessionDate', label: '交易日', server: true },
    { key: 'accountId', label: '账户', server: true, defaultValue: 'acct-1' },
  ],
  BuyLine: [
    { key: 'arrangementId', label: '安排身份', server: true },
    { key: 'ticker', label: '代码', server: true },
  ],
  SellLine: [
    { key: 'arrangementId', label: '安排身份', server: true },
    { key: 'ticker', label: '代码', server: true },
  ],
  Stock: [{ key: 'ticker', label: '代码', server: true }],
  Position: [
    { key: 'accountId', label: '账户', server: true, defaultValue: 'acct-1' },
    { key: 'ticker', label: '代码', server: true },
    { key: 'exitState', label: '退出状态', server: true },
  ],
  Fill: [
    { key: 'sessionDate', label: '交易日', server: true },
    { key: 'ticker', label: '代码', server: true },
  ],
  TradingDay: [
    { key: 'sessionDate', label: '交易日', server: true },
    { key: 'regime', label: '制度', server: true },
  ],
};

const viewableTypes = new Set(['PreOpenArrangement', 'Position', 'Stock', 'Strategy']);
const noFilters: FilterField[] = [];

const apiBase = 'http://127.0.0.1:3010';

const { Title, Text } = Typography;

const propertyColumns = [
  { title: 'apiName', dataIndex: 'apiName', key: 'apiName' },
  { title: '名称', dataIndex: 'displayName', key: 'displayName' },
  { title: 'data type', dataIndex: 'dataType', key: 'dataType' },
  { title: '值类型', dataIndex: 'valueType', key: 'valueType' },
  { title: '写通道', dataIndex: 'writeChannel', key: 'writeChannel', width: 220 },
  {
    title: '必填',
    dataIndex: 'required',
    key: 'required',
    render: (required: boolean) => (required ? '是' : ''),
  },
  { title: '说明', dataIndex: 'description', key: 'description' },
];

const linkColumns = [
  { title: 'apiName', dataIndex: 'apiName', key: 'apiName' },
  { title: '名称', dataIndex: 'displayName', key: 'displayName' },
  { title: '从', dataIndex: 'sourceType', key: 'sourceType', render: (value: string) => typeTitle(value) },
  { title: '源端 apiName', dataIndex: 'sourceApiName', key: 'sourceApiName' },
  { title: '到', dataIndex: 'targetType', key: 'targetType', render: (value: string) => typeTitle(value) },
  { title: '目标端 apiName', dataIndex: 'targetApiName', key: 'targetApiName' },
  { title: '基数', dataIndex: 'cardinality', key: 'cardinality' },
  { title: '说明', dataIndex: 'description', key: 'description' },
];

function cell(value: unknown): string {
  if (value == null || value === '') return '';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function ObjectSet({ detail }: { detail: CatalogObject }) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectItem = useDataExplorerStore((state) => state.selectItem);
  const navigatorItems = useDataExplorerStore((state) => state.navigatorItems);
  const collection = detail.resource;
  const fields = explorerFilters[detail.apiName] ?? noFilters;
  const openable = viewableTypes.has(detail.apiName);

  const initialFilters = useMemo(() => {
    const next: Record<string, string> = {};
    for (const field of fields) {
      const fromUrl = searchParams.get(field.key);
      if (fromUrl != null && fromUrl !== '') next[field.key] = fromUrl;
      else if (field.defaultValue) next[field.key] = field.defaultValue;
      else if (field.present) next[field.key] = '1';
      else next[field.key] = '';
    }
    return next;
  }, [detail.apiName]); // eslint-disable-line react-hooks/exhaustive-deps -- seed once per type

  const [draft, setDraft] = useState(initialFilters);
  const [applied, setApplied] = useState(initialFilters);
  const [keyword, setKeyword] = useState('');
  const [rows, setRows] = useState<Record<string, unknown>[] | null>(null);
  const [linkedBuys, setLinkedBuys] = useState<Record<string, unknown>[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [picked, setPicked] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    setDraft(initialFilters);
    setApplied(initialFilters);
    setKeyword('');
    setPicked(null);
    setLinkedBuys(null);
  }, [initialFilters]);

  useEffect(() => {
    if (!collection) {
      setError('这个类型还没有对象集合');
      setRows([]);
      return;
    }
    if (detail.apiName === 'DailyBar' && !applied.sessionDate && !applied.ticker) {
      setError('DailyBar 请先填交易日或代码，再查（全表太大）');
      setRows([]);
      return;
    }
    let cancelled = false;
    setRows(null);
    setPicked(null);
    setError(null);
    const query = new URLSearchParams({ domain: 'StockTrading' });
    for (const field of fields) {
      if (!field.server) continue;
      const value = applied[field.key]?.trim();
      if (value) query.set(field.key, value);
    }
    fetch(`${apiBase}/${collection}?${query}`)
      .then(async (response) => {
        if (!response.ok) {
          const body = await response.json().catch(() => ({})) as { error?: string };
          throw new Error(body.error ?? `读取失败 ${response.status}`);
        }
        return response.json() as Promise<Record<string, unknown>[]>;
      })
      .then((body) => {
        if (!cancelled) setRows(body);
      })
      .catch((reason: unknown) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : '读取对象失败');
      });
    return () => {
      cancelled = true;
    };
  }, [collection, detail.apiName, applied, fields]);

  const visible = useMemo(() => {
    if (!rows) return null;
    let next = rows;
    if (applied.hasComparisonScore === '1') {
      next = next.filter((row) => row.comparisonScore != null && row.comparisonScore !== '');
    }
    const needle = keyword.trim().toLowerCase();
    if (needle) {
      next = next.filter((row) =>
        Object.values(row).some((value) => String(value ?? '').toLowerCase().includes(needle)),
      );
    }
    return next;
  }, [rows, applied.hasComparisonScore, keyword]);

  function applyFilters() {
    setApplied({ ...draft });
    const next = new URLSearchParams(searchParams);
    next.delete('hint');
    for (const field of fields) {
      const value = draft[field.key]?.trim();
      if (value) next.set(field.key, value);
      else next.delete(field.key);
    }
    setSearchParams(next, { replace: true });
  }

  function openObjectView(row: Record<string, unknown>) {
    navigate(
      `/ontology/object-view?type=${detail.apiName}&id=${encodeURIComponent(String(row[detail.primaryKey]))}`,
    );
  }

  function pivotToBuyLines(arrangementId: string) {
    const find = (items: typeof navigatorItems): typeof navigatorItems[number] | null => {
      for (const item of items) {
        if (item.id === 'object-type:BuyLine') return item;
        if (item.children) {
          const hit = find(item.children);
          if (hit) return hit;
        }
      }
      return null;
    };
    const target = find(navigatorItems);
    if (target) selectItem(target);
    setSearchParams({ arrangementId }, { replace: true });
  }

  async function showBuyLines(arrangementId: string) {
    setLinkedBuys(null);
    const response = await fetch(
      `${apiBase}/buy-lines?domain=StockTrading&arrangementId=${encodeURIComponent(arrangementId)}`,
    );
    if (!response.ok) {
      setError(`买入行读取失败 ${response.status}`);
      return;
    }
    setLinkedBuys(await response.json() as Record<string, unknown>[]);
  }

  if (!collection) return <Empty description="这个类型还没有对象集合" />;

  const columns = detail.properties.map((property) => ({
    title: property.displayName,
    dataIndex: property.apiName,
    key: property.apiName,
    render: (value: unknown) => cell(value),
  }));

  return (
    <>
      <Space wrap style={{ marginBottom: 12 }} size="middle">
        <Input
          allowClear
          placeholder="关键词（简称、代码、身份…）"
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          style={{ width: 220 }}
        />
        {fields.map((field) =>
          field.present ? (
            <Checkbox
              key={field.key}
              checked={draft[field.key] === '1'}
              onChange={(event) =>
                setDraft((prev) => ({ ...prev, [field.key]: event.target.checked ? '1' : '' }))
              }
            >
              {field.label}
            </Checkbox>
          ) : (
            <Input
              key={field.key}
              allowClear
              placeholder={field.label}
              value={draft[field.key] ?? ''}
              onChange={(event) => setDraft((prev) => ({ ...prev, [field.key]: event.target.value }))}
              onPressEnter={applyFilters}
              style={{ width: field.key.includes('arrangement') ? 260 : 160 }}
            />
          ),
        )}
        <Button type="primary" onClick={applyFilters}>
          应用过滤
        </Button>
        {detail.apiName === 'PreOpenArrangement' && picked ? (
          <>
            <Button onClick={() => void showBuyLines(String(picked.arrangementId))}>看这一页买入行</Button>
            <Button onClick={() => pivotToBuyLines(String(picked.arrangementId))}>转到 BuyLine 过滤</Button>
          </>
        ) : null}
        {detail.apiName === 'PreOpenArrangement' && picked ? (
          <Button onClick={() => navigate(`/workshop/pre-open?date=${encodeURIComponent(String(picked.sessionDate))}`)}>
            Workshop
          </Button>
        ) : null}
      </Space>

      {error ? <Empty description={error} /> : null}
      {!error && !visible ? <Empty description="正在读取这个类型的对象" /> : null}
      {!error && visible && visible.length === 0 ? (
        <Empty description="没有符合过滤条件的对象" />
      ) : null}

      {!error && visible && visible.length > 0 ? (
        <>
          <Text type="secondary">
            共 {visible.length} 个对象 · 域 StockTrading
            {openable ? ' · 双击行打开 Object View' : ' · 点一行看属性'}
          </Text>
          <Table
            style={{ marginTop: 12 }}
            size="small"
            rowKey={(row) => String(row[detail.primaryKey])}
            pagination={{ pageSize: 20, showSizeChanger: false }}
            scroll={{ x: Math.max(960, detail.properties.length * 140) }}
            columns={columns}
            dataSource={visible}
            onRow={(row) => ({
              onClick: () => setPicked(row),
              onDoubleClick: () => {
                if (openable) openObjectView(row);
              },
              style: {
                cursor: 'pointer',
                background:
                  picked && String(picked[detail.primaryKey]) === String(row[detail.primaryKey])
                    ? 'rgba(15, 118, 110, 0.12)'
                    : undefined,
              },
            })}
          />
        </>
      ) : null}

      {picked ? (
        <Card
          size="small"
          title={`Object View · ${String(picked[detail.titleKey] ?? picked[detail.primaryKey])}`}
          extra={
            openable ? (
              <Button type="link" onClick={() => openObjectView(picked)}>
                打开完整 Object View
              </Button>
            ) : (
              <Text type="secondary">StockTrading</Text>
            )
          }
          style={{ marginTop: 16 }}
        >
          {detail.apiName === 'Strategy' ? <StrategyPlaybookMap strategy={picked} /> : null}
          <Descriptions column={2} size="small" bordered>
            {detail.properties.map((property) => (
              <Descriptions.Item key={property.apiName} label={property.displayName}>
                {cell(picked[property.apiName])}
              </Descriptions.Item>
            ))}
          </Descriptions>
        </Card>
      ) : null}

      {linkedBuys ? (
        <Card size="small" title={`买入行 · ${linkedBuys.length} 条`} style={{ marginTop: 16 }}>
          <Table
            size="small"
            pagination={false}
            rowKey={(row) => String(row.buyLineId)}
            dataSource={linkedBuys}
            columns={[
              { title: '名次', dataIndex: 'rank', width: 72 },
              { title: '代码', dataIndex: 'ticker' },
              { title: '股数', dataIndex: 'plannedQuantity' },
              { title: '限价', dataIndex: 'plannedLimitPrice' },
              { title: '这一行', dataIndex: 'outcome' },
              {
                title: '',
                width: 100,
                render: (_: unknown, row: Record<string, unknown>) => (
                  <Button
                    type="link"
                    onClick={() =>
                      navigate(`/ontology/object-view?type=Stock&id=${encodeURIComponent(String(row.ticker))}`)
                    }
                  >
                    股票 View
                  </Button>
                ),
              },
            ]}
          />
        </Card>
      ) : null}
    </>
  );
}

function ObjectDetail({ detail }: { detail: CatalogObject }) {
  return (
    <div className="content-area">
      <div className="content-header">
        <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>
          Ontology Manager · Object Type
        </Text>
        <Title level={4} style={{ margin: 0 }}>
          {detail.displayName}
        </Title>
        <Text type="secondary" style={{ fontFamily: 'var(--font-family-mono)' }}>{detail.apiName}</Text>
        <div style={{ marginTop: 8 }}>
          <Text type="secondary">{detail.description}</Text>
        </div>
        {detail.rid ? <Text type="secondary" copyable style={{ display: 'block', marginTop: 4 }}>{detail.rid}</Text> : null}
      </div>
      <Tabs
        style={{ marginTop: 16 }}
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
                </Descriptions>
              </Card>
            ),
          },
          {
            key: 'objects',
            label: 'Objects',
            children: <ObjectSet detail={detail} />,
          },
          {
            key: 'properties',
            label: `Properties (${detail.properties.length})`,
            children: (
              <Table
                rowKey="apiName"
                size="small"
                pagination={false}
                scroll={{ x: 960 }}
                columns={propertyColumns}
                dataSource={detail.properties}
              />
            ),
          },
          {
            key: 'links',
            label: `Link types (${detail.links.length})`,
            children: (
              <Table
                rowKey="apiName"
                size="small"
                pagination={false}
                columns={linkColumns}
                dataSource={detail.links}
              />
            ),
          },
        ]}
      />
    </div>
  );
}

function sideCount(cardinality: string, end: 'source' | 'target'): string {
  const [left, right] = cardinality.split('-to-');
  const word = end === 'source' ? left : right;
  if (word === 'many') return '多';
  if (word === 'one') return '一';
  return cardinality;
}

function SideCard({
  role,
  objectType,
  apiName,
  sideName,
  count,
}: {
  role: string;
  objectType: string;
  apiName: string;
  sideName: string;
  count: string;
}) {
  return (
    <Card size="small" title={role} style={{ flex: '1 1 240px' }}>
      <Descriptions column={1} size="small">
        <Descriptions.Item label="对象类型">{objectType}</Descriptions.Item>
        <Descriptions.Item label="这一端的 apiName">{apiName}</Descriptions.Item>
        <Descriptions.Item label="这一端的名称">{sideName}</Descriptions.Item>
        <Descriptions.Item label="这一端有几个">{count}</Descriptions.Item>
      </Descriptions>
    </Card>
  );
}

function LinkDetail({ detail }: { detail: CatalogLink }) {
  return (
    <div className="content-area">
      <div className="content-header">
        <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>
          Ontology Manager · Link Type
        </Text>
        <Title level={4} style={{ margin: 0 }}>
          {detail.displayName}
        </Title>
        <Text type="secondary" style={{ fontFamily: 'var(--font-family-mono)' }}>{detail.apiName}</Text>
        <div style={{ marginTop: 8 }}>
          <Text type="secondary">{detail.description}</Text>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 16, alignItems: 'stretch', flexWrap: 'wrap', marginTop: 16 }}>
        <SideCard
          role="源"
          objectType={detail.sourceType}
          apiName={detail.sourceApiName}
          sideName={detail.sourceSideName}
          count={sideCount(detail.cardinality, 'source')}
        />
        <Card
          size="small"
          style={{
            flex: '0 0 160px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(15, 118, 110, 0.08)',
            borderColor: 'rgba(45, 212, 191, 0.35)',
          }}
        >
          <Text strong style={{ color: 'var(--brand)' }}>{detail.cardinality}</Text>
        </Card>
        <SideCard
          role="目标"
          objectType={detail.targetType}
          apiName={detail.targetApiName}
          sideName={detail.targetSideName}
          count={sideCount(detail.cardinality, 'target')}
        />
      </div>
    </div>
  );
}

function FunctionDetail({ detail }: { detail: CatalogFunction }) {
  return (
    <div className="content-area">
      <div className="content-header">
        <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>
          Ontology Manager · Function
        </Text>
        <Title level={4} style={{ margin: 0 }}>
          {detail.displayName}
        </Title>
        <Text type="secondary" style={{ fontFamily: 'var(--font-family-mono)' }}>{detail.apiName}</Text>
      </div>
      {isHuimaqiangFunction(detail.apiName) ? <HuimaqiangFlow apiName={detail.apiName} /> : null}
      <Tabs
        style={{ marginTop: 16 }}
        items={[
          {
            key: 'overview',
            label: 'Overview',
            children: (
              <Card size="small">
                <Descriptions column={1} size="small">
                  <Descriptions.Item label="读">{detail.reads}</Descriptions.Item>
                  <Descriptions.Item label="写下">{detail.writes}</Descriptions.Item>
                  <Descriptions.Item label="域">只读、只写 StockTrading</Descriptions.Item>
                  <Descriptions.Item label="为什么不是 Action type">{detail.whyNotAction}</Descriptions.Item>
                </Descriptions>
              </Card>
            ),
          },
          {
            key: 'configuration',
            label: 'Configuration',
            children: (
              <Card size="small">
                <Descriptions column={1} size="small">
                  <Descriptions.Item label="现在能不能单独调用">{detail.code}</Descriptions.Item>
                </Descriptions>
              </Card>
            ),
          },
        ]}
      />
    </div>
  );
}

function ActionTypeDetail({ detail }: { detail: CatalogAction }) {
  return (
    <div className="content-area">
      <div className="content-header">
        <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>
          Ontology Manager · Action Type
        </Text>
        <Title level={4} style={{ margin: 0 }}>
          {detail.displayName}
        </Title>
        <Text type="secondary" style={{ fontFamily: 'var(--font-family-mono)' }}>{detail.apiName}</Text>
        <div style={{ marginTop: 8 }}>
          <Text type="secondary">
            {detail.functionBacked ? 'function-backed action type' : '规则直接编辑 Ontology'}
          </Text>
        </div>
      </div>
      <Tabs
        style={{ marginTop: 16 }}
        items={[
          {
            key: 'overview',
            label: 'Overview',
            children: (
              <Card size="small">
                <Descriptions column={1} size="small">
                  <Descriptions.Item label="谁能用">{detail.who}</Descriptions.Item>
                  <Descriptions.Item label="参数">{detail.parameters}</Descriptions.Item>
                  <Descriptions.Item label="提交条件">{detail.condition}</Descriptions.Item>
                </Descriptions>
              </Card>
            ),
          },
          {
            key: 'logic',
            label: 'Logic',
            children: (
              <Card size="small">
                <Descriptions column={1} size="small">
                  <Descriptions.Item label="规则">{detail.rule}</Descriptions.Item>
                  <Descriptions.Item label="副作用">无。规则停在 Ontology。把委托送到券商是程序，不是这个 Action type。</Descriptions.Item>
                  <Descriptions.Item label="域">只改 StockTrading。参数指到另一个域时，这次提交不发生。</Descriptions.Item>
                  <Descriptions.Item label="现在能不能提交">{detail.code}</Descriptions.Item>
                </Descriptions>
              </Card>
            ),
          },
        ]}
      />
    </div>
  );
}

const TypeDetail: React.FC<{ id: string }> = ({ id }) => {
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
  if (failed) return <Empty description="读不到库里的资源定义" />;
  if (!ready) return null;
  const detail = catalogDetail(id);
  if (!detail) return null;
  if (detail.kind === 'object') return <ObjectDetail detail={detail} />;
  if (detail.kind === 'link') return <LinkDetail detail={detail} />;
  if (detail.kind === 'function') return <FunctionDetail detail={detail} />;
  return <ActionTypeDetail detail={detail} />;
};

export default TypeDetail;
