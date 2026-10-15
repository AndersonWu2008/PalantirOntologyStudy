import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Empty, Select, Space, Spin, Table, Typography } from 'antd';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { FoundrySection, FoundryShell } from './FoundryShell';
import { propertyTitle, typeTitle } from '@/pages/DataExplorer/stockFallback';
import { StrategyPlaybookMap } from './playbookPicture';
import './ObjectViewPage.less';

const API = 'http://127.0.0.1:3010';

type Kind = 'PreOpenArrangement' | 'Position' | 'Stock' | 'Strategy';

type GroupName = '身份' | '源' | '派生' | '决策' | '其他';

const collections: Record<Kind, string> = {
  PreOpenArrangement: 'arrangements',
  Position: 'positions',
  Stock: 'stocks',
  Strategy: 'strategies',
};

const primaryKeys: Record<Kind, string> = {
  PreOpenArrangement: 'arrangementId',
  Position: 'positionId',
  Stock: 'ticker',
  Strategy: 'strategyId',
};

const titleKeys: Record<Kind, string> = {
  PreOpenArrangement: 'arrangementId',
  Position: 'positionId',
  Stock: 'displayName',
  Strategy: 'displayName',
};

const defaultIds: Record<Kind, string> = {
  PreOpenArrangement: 'acct-1|2026-06-03|1',
  Position: 'acct-1|300097.SZ',
  Stock: '300097.SZ',
  Strategy: 'v46-huimaqiang',
};

const labels: Record<string, string> = {
  domain: '域',
  arrangementId: '安排身份',
  accountId: '账户',
  sessionDate: '交易日',
  strategyId: '做法',
  supersedesArrangementId: '作废了哪一页',
  handedOverAt: '交出时间',
  header: '页首',
  headerAtConfirm: '确认时页首',
  totalAssetsShown: '总资产',
  totalAssetsAtConfirm: '确认时总资产',
  cashShown: '可用资金',
  cashAtConfirm: '确认时可用资金',
  continueCount: '继续拿只数',
  positionCountAgrees: '持仓只数对得上',
  playbookChanged: '做法变了',
  stopped: '今天停止',
  nothingToSendAcknowledged: '承认没有要执行的',
  sellConfirmedBy: '卖出确认人',
  sellConfirmedAt: '卖出确认时间',
  buyConfirmedBy: '买入确认人',
  buyConfirmedAt: '买入确认时间',
  positionId: '持仓身份',
  ticker: '代码',
  quantity: '股数',
  sellableQuantity: '可卖股数',
  entryPrice: '入场价',
  entryDate: '入场日',
  atrAtEntry: '入场 ATR',
  regimeAtEntry: '入场制度',
  highSinceEntry: '入场后最高',
  daysHeld: '持有天数',
  entryFieldsMissing: '入场字段缺少',
  exitState: '退出状态',
  exitJudgedOn: '退出判定日',
  exitReason: '退出原因',
  displayName: '简称',
  isSt: 'ST',
  board: '板块',
  packId: '计算包',
  universeIndexId: '可买范围',
  breadthMin: '广度下限',
  regimeMinPersistDays: '连续几天',
  exitOnRegimeFlip: '离开就走',
  priceMin: '价格下限',
  priceMax: '价格上限',
  maxPerIndustry: '每行业几只',
  bullTrailingActivate: '牛市跟踪',
  bullTrailingStop: '牛市回落',
  bullMaxHoldDays: '牛市天数',
  bullMaxPositions: '牛市只数',
  bullSinglePositionPct: '牛市占比',
  bullMinScore: '牛市名次',
  bullStopLoss: '牛市止损',
  bullAtrMultiple: '牛市波动倍数',
  highVolTrailingActivate: '高波动跟踪',
  highVolTrailingStop: '高波动回落',
  highVolMaxHoldDays: '高波动天数',
  highVolMaxPositions: '高波动只数',
  highVolSinglePositionPct: '高波动占比',
  highVolMinScore: '高波动名次',
  highVolStopLoss: '高波动止损',
  highVolAtrMultiple: '高波动波动倍数',
  sidewaysTrailingActivate: '震荡跟踪',
  sidewaysTrailingStop: '震荡回落',
  sidewaysMaxHoldDays: '震荡天数',
  sidewaysMaxPositions: '震荡只数',
  sidewaysSinglePositionPct: '震荡占比',
  sidewaysMinScore: '震荡名次',
  sidewaysStopLoss: '震荡止损',
  sidewaysAtrMultiple: '震荡波动倍数',
  bearMaxPositions: '熊市只数',
};

const groupsByKind: Record<Kind, Partial<Record<string, GroupName>>> = {
  PreOpenArrangement: {
    domain: '身份',
    arrangementId: '身份',
    accountId: '身份',
    sessionDate: '身份',
    strategyId: '身份',
    supersedesArrangementId: '身份',
    handedOverAt: '派生',
    header: '派生',
    totalAssetsShown: '派生',
    cashShown: '派生',
    continueCount: '派生',
    positionCountAgrees: '派生',
    playbookChanged: '派生',
    headerAtConfirm: '决策',
    totalAssetsAtConfirm: '决策',
    cashAtConfirm: '决策',
    stopped: '决策',
    nothingToSendAcknowledged: '决策',
    sellConfirmedBy: '决策',
    sellConfirmedAt: '决策',
    buyConfirmedBy: '决策',
    buyConfirmedAt: '决策',
  },
  Position: {
    domain: '身份',
    positionId: '身份',
    accountId: '身份',
    ticker: '身份',
    quantity: '源',
    sellableQuantity: '源',
    entryPrice: '派生',
    entryDate: '派生',
    atrAtEntry: '派生',
    regimeAtEntry: '派生',
    highSinceEntry: '派生',
    daysHeld: '派生',
    entryFieldsMissing: '派生',
    exitState: '派生',
    exitJudgedOn: '派生',
    exitReason: '派生',
  },
  Stock: {
    domain: '身份',
    ticker: '身份',
    displayName: '源',
    isSt: '源',
    board: '源',
  },
  Strategy: {
    domain: '身份',
    strategyId: '身份',
    displayName: '身份',
    packId: '身份',
    universeIndexId: '身份',
  },
};

type LinkKind =
  | Kind
  | 'BuyLine'
  | 'SellLine'
  | 'BuyOrder'
  | 'SellOrder'
  | 'Fill'
  | 'DailyBar'
  | 'Account'
  | 'App';

type LinkRow = {
  label: string;
  kind: LinkKind;
  id: string;
  title: string;
  meta?: string;
  /** Optional app path when kind === 'App' or for Workshop shortcuts. */
  href?: string;
};

function cell(value: unknown): string {
  if (value == null || value === '') return '—';
  if (typeof value === 'boolean') return value ? '是' : '否';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`读取失败 ${response.status}`);
  return response.json() as Promise<T>;
}

export default function ObjectViewPage() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const kind = (params.get('type') as Kind | null) ?? 'PreOpenArrangement';
  const id = params.get('id') ?? defaultIds[kind] ?? defaultIds.PreOpenArrangement;

  const [object, setObject] = useState<Record<string, unknown> | null>(null);
  const [links, setLinks] = useState<LinkRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [picker, setPicker] = useState<{ kind: Kind; options: { value: string; label: string }[] }>({
    kind: 'PreOpenArrangement',
    options: [],
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [arrangements, positions, stocks, strategies] = await Promise.all([
          getJson<Record<string, unknown>[]>(`${API}/arrangements?domain=StockTrading&accountId=acct-1`),
          getJson<Record<string, unknown>[]>(`${API}/positions?domain=StockTrading&accountId=acct-1`),
          getJson<Record<string, unknown>[]>(`${API}/stocks?domain=StockTrading`),
          getJson<Record<string, unknown>[]>(`${API}/strategies?domain=StockTrading`),
        ]);
        if (cancelled) return;
        const byKind: Record<Kind, { value: string; label: string }[]> = {
          PreOpenArrangement: arrangements.map((row) => ({
            value: String(row.arrangementId),
            label: `${row.arrangementId} · ${row.header ?? ''}`,
          })),
          Position: [...positions]
            .sort((left, right) => Number(right.quantity) - Number(left.quantity))
            .map((row) => ({
              value: String(row.positionId),
              label: `${row.ticker} · ${row.quantity} 股 · ${row.exitState ?? '—'}`,
            })),
          Strategy: strategies.map((row) => ({
            value: String(row.strategyId),
            label: `${row.displayName ?? row.strategyId} · ${row.packId ?? ''}`,
          })),
          Stock: (() => {
            const favorites = ['300097.SZ', '000070.SZ', '300183.SZ', '002441.SZ', '300601.SZ', '002077.SZ'];
            const favored = stocks.filter((row) => favorites.includes(String(row.ticker)));
            const rest = stocks
              .filter((row) => !favorites.includes(String(row.ticker)))
              .slice(0, 24);
            return [...favored, ...rest].map((row) => ({
              value: String(row.ticker),
              label: `${row.displayName ?? row.ticker} · ${row.ticker}`,
            }));
          })(),
        };
        setPicker({ kind, options: byKind[kind] ?? [] });
      } catch {
        if (!cancelled) setPicker({ kind, options: [] });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [kind]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setObject(null);
    setLinks([]);

    (async () => {
      try {
        if (!collections[kind]) throw new Error('这个类型还没有 Object View');
        const row = await getJson<Record<string, unknown>>(
          `${API}/${collections[kind]}/${encodeURIComponent(id)}`,
        );
        if (cancelled) return;
        if (row.domain && row.domain !== 'StockTrading') throw new Error('对象不在 StockTrading');
        setObject(row);

        const nextLinks: LinkRow[] = [];
        if (kind === 'PreOpenArrangement') {
          const arrangementId = String(row.arrangementId);
          const sessionDate = String(row.sessionDate ?? '');
          nextLinks.push({
            label: '账户',
            kind: 'Account',
            id: String(row.accountId ?? 'acct-1'),
            title: String(row.accountId ?? 'acct-1'),
            meta: 'Workshop 模块按账户过滤',
            href: sessionDate ? `/workshop/pre-open?date=${encodeURIComponent(sessionDate)}` : '/workshop/pre-open',
          });
          if (row.supersedesArrangementId) {
            nextLinks.push({
              label: '作废了',
              kind: 'PreOpenArrangement',
              id: String(row.supersedesArrangementId),
              title: String(row.supersedesArrangementId),
              meta: '上一页安排',
            });
          }
          const [buys, sells, buyOrders, sellOrders, fills] = await Promise.all([
            getJson<Record<string, unknown>[]>(`${API}/buy-lines?domain=StockTrading&arrangementId=${encodeURIComponent(arrangementId)}`),
            getJson<Record<string, unknown>[]>(`${API}/sell-lines?domain=StockTrading&arrangementId=${encodeURIComponent(arrangementId)}`),
            getJson<Record<string, unknown>[]>(`${API}/buy-orders?domain=StockTrading`),
            getJson<Record<string, unknown>[]>(`${API}/sell-orders?domain=StockTrading`),
            getJson<Record<string, unknown>[]>(`${API}/fills?domain=StockTrading`),
          ]);
          for (const line of [...sells].sort((a, b) => String(a.ticker).localeCompare(String(b.ticker)))) {
            nextLinks.push({
              label: '卖出行',
              kind: 'SellLine',
              id: String(line.sellLineId),
              title: String(line.ticker),
              meta: `${line.reason ?? ''} · ${line.outcome ?? line.plannedQuantity ?? ''}`,
              href: sessionDate ? `/workshop/pre-open?date=${encodeURIComponent(sessionDate)}` : undefined,
            });
            const order = sellOrders.find((item) => item.sellLineId === line.sellLineId);
            if (order) {
              nextLinks.push({
                label: '卖出委托',
                kind: 'SellOrder',
                id: String(order.orderId),
                title: String(line.ticker),
                meta: `${order.contentStatus}/${order.executionStatus} · ${order.quantity}@${order.limitPrice}`,
                href: sessionDate ? `/workshop/pre-open?date=${encodeURIComponent(sessionDate)}` : undefined,
              });
              const fill = fills.find((item) => item.orderId === order.orderId || String(item.fillId).startsWith(String(order.orderId)));
              if (fill) {
                nextLinks.push({
                  label: '成交',
                  kind: 'Fill',
                  id: String(fill.fillId),
                  title: `${fill.side} ${fill.quantity}@${fill.price}`,
                  meta: String(fill.sessionDate),
                });
              }
            }
            nextLinks.push({
              label: '股票',
              kind: 'Stock',
              id: String(line.ticker),
              title: String(line.ticker),
              meta: 'Stock Object View',
            });
          }
          for (const line of [...buys].sort((a, b) => Number(a.rank) - Number(b.rank))) {
            nextLinks.push({
              label: '买入行',
              kind: 'BuyLine',
              id: String(line.buyLineId),
              title: String(line.ticker),
              meta: `名次 ${line.rank} · ${line.outcome ?? line.plannedQuantity ?? ''}`,
              href: sessionDate ? `/workshop/pre-open?date=${encodeURIComponent(sessionDate)}` : undefined,
            });
            const order = buyOrders.find((item) => item.buyLineId === line.buyLineId);
            if (order) {
              nextLinks.push({
                label: '买入委托',
                kind: 'BuyOrder',
                id: String(order.orderId),
                title: String(line.ticker),
                meta: `${order.contentStatus}/${order.executionStatus} · ${order.quantity}@${order.limitPrice}`,
                href: sessionDate ? `/workshop/pre-open?date=${encodeURIComponent(sessionDate)}` : undefined,
              });
              const fill = fills.find((item) => item.orderId === order.orderId || String(item.fillId).startsWith(String(order.orderId)));
              if (fill) {
                nextLinks.push({
                  label: '成交',
                  kind: 'Fill',
                  id: String(fill.fillId),
                  title: `${fill.side} ${fill.quantity}@${fill.price}`,
                  meta: String(fill.sessionDate),
                });
                if (fill.positionId) {
                  nextLinks.push({
                    label: '持仓',
                    kind: 'Position',
                    id: String(fill.positionId),
                    title: String(fill.positionId),
                    meta: '由买入成交写回',
                  });
                }
              }
            }
            nextLinks.push({
              label: '股票',
              kind: 'Stock',
              id: String(line.ticker),
              title: String(line.ticker),
              meta: 'Stock Object View',
            });
          }
          nextLinks.push({
            label: '应用',
            kind: 'App',
            id: 'lineage',
            title: 'Data Lineage',
            meta: '安排上下游',
            href: `/data/lineage?arrangementId=${encodeURIComponent(arrangementId)}`,
          });
          nextLinks.push({
            label: '应用',
            kind: 'App',
            id: 'notepad',
            title: 'Notepad morning brief',
            meta: sessionDate,
            href: sessionDate
              ? `/notepad?template=StockTrading.morningBrief&date=${encodeURIComponent(sessionDate)}`
              : '/notepad?template=StockTrading.morningBrief',
          });
        }
        if (kind === 'Position') {
          const ticker = String(row.ticker);
          const fills = await getJson<Record<string, unknown>[]>(`${API}/fills?domain=StockTrading&ticker=${encodeURIComponent(ticker)}`);
          for (const fill of fills.filter((item) => item.positionId === row.positionId)) {
            nextLinks.push({
              label: '成交',
              kind: 'Fill',
              id: String(fill.fillId),
              title: `${fill.side} ${fill.quantity}@${fill.price}`,
              meta: String(fill.sessionDate),
              href: fill.sessionDate
                ? `/workshop/pre-open?date=${encodeURIComponent(String(fill.sessionDate))}`
                : undefined,
            });
          }
          nextLinks.push({
            label: '股票',
            kind: 'Stock',
            id: ticker,
            title: ticker,
            meta: 'Stock Object View',
          });
          if (row.entryDate) {
            nextLinks.push({
              label: '入场日行情',
              kind: 'DailyBar',
              id: `${ticker}|${row.entryDate}`,
              title: `${ticker} · ${row.entryDate}`,
              meta: 'DailyBar',
            });
            nextLinks.push({
              label: '入场日安排',
              kind: 'App',
              id: 'entry-workshop',
              title: `Workshop · ${row.entryDate}`,
              meta: '开盘前安排',
              href: `/workshop/pre-open?date=${encodeURIComponent(String(row.entryDate))}`,
            });
          }
          nextLinks.push({
            label: '应用',
            kind: 'App',
            id: 'quiver',
            title: 'Quiver',
            meta: 'OHLC + Fill 标记',
            href: `/ontology/quiver?profile=${encodeURIComponent('StockTrading.stockDaily')}&id=${encodeURIComponent(ticker)}`,
          });
        }
        if (kind === 'Stock') {
          const ticker = String(row.ticker);
          const [positions, bars] = await Promise.all([
            getJson<Record<string, unknown>[]>(`${API}/positions?domain=StockTrading&ticker=${encodeURIComponent(ticker)}`),
            getJson<Record<string, unknown>[]>(`${API}/daily-bars?domain=StockTrading&ticker=${encodeURIComponent(ticker)}`),
          ]);
          for (const position of positions) {
            nextLinks.push({
              label: '持仓',
              kind: 'Position',
              id: String(position.positionId),
              title: String(position.positionId),
              meta: `${position.quantity} 股 · ${position.exitState ?? '未判定'}`,
            });
          }
          const recent = [...bars]
            .sort((left, right) => String(right.sessionDate).localeCompare(String(left.sessionDate)))
            .slice(0, 8);
          for (const bar of recent) {
            nextLinks.push({
              label: '日行情',
              kind: 'DailyBar',
              id: String(bar.barId ?? `${ticker}|${bar.sessionDate}`),
              title: String(bar.sessionDate),
              meta: `收 ${bar.close} · 比较数 ${bar.comparisonScore ?? '—'}`,
            });
          }
        }
        if (kind === 'Strategy' && String(row.packId) === 'v46Huimaqiang') {
          nextLinks.push({
            label: '计算包',
            kind: 'App',
            id: 'v46Huimaqiang',
            title: '回马枪怎么挑',
            meta: 'Function',
            href: '/ontology/manager?section=function&type=computeHuimaqiangFactors&kind=function',
          });
        }
        if (!cancelled) setLinks(nextLinks);
      } catch (reason) {
        if (!cancelled) setError(reason instanceof Error ? reason.message : '读取对象失败');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [kind, id]);

  const grouped = useMemo(() => {
    if (!object) return [] as { group: GroupName; rows: { key: string; label: string; value: string }[] }[];
    const buckets: Record<GroupName, { key: string; label: string; value: string }[]> = {
      身份: [],
      源: [],
      派生: [],
      决策: [],
      其他: [],
    };
    const map = groupsByKind[kind] ?? {};
    for (const [key, value] of Object.entries(object)) {
      const group = map[key] ?? (kind === 'Strategy' ? '决策' : '其他');
      const label = kind === 'Strategy' && key === 'displayName'
        ? '名称'
        : kind === 'Strategy' && key === 'strategyId'
          ? '做法身份'
          : (labels[key] ?? propertyTitle(kind, key));
      buckets[group].push({ key, label, value: cell(value) });
    }
    return (['身份', '源', '派生', '决策', '其他'] as GroupName[])
      .filter((group) => buckets[group].length > 0)
      .map((group) => ({ group, rows: buckets[group] }));
  }, [object, kind]);

  const title = object
    ? String(object[titleKeys[kind]] ?? object[primaryKeys[kind]] ?? id)
    : id;

  function openLink(link: LinkRow) {
    if (link.kind === 'Stock' || link.kind === 'Position' || link.kind === 'PreOpenArrangement') {
      setParams({ type: link.kind, id: link.id });
      return;
    }
    if (link.kind === 'App' && link.href) {
      navigate(link.href);
      return;
    }
    if (link.kind === 'BuyLine' || link.kind === 'SellLine') {
      if (link.title.includes('.')) {
        setParams({ type: 'Stock', id: link.title });
        return;
      }
      if (link.href) {
        navigate(link.href);
        return;
      }
    }
    if (link.href && (link.kind === 'BuyOrder' || link.kind === 'SellOrder' || link.kind === 'Account' || link.kind === 'Fill')) {
      navigate(link.href);
      return;
    }
    if (link.kind === 'Fill') {
      navigate('/workshop/pre-open');
      return;
    }
    if (link.kind === 'DailyBar') {
      const [ticker, sessionDate] = link.id.split('|');
      const query = new URLSearchParams({ focus: 'DailyBar' });
      if (ticker) query.set('ticker', ticker);
      if (sessionDate) query.set('sessionDate', sessionDate);
      navigate(`/ontology?${query}`);
      return;
    }
    navigate('/ontology');
  }

  const linkSummary = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const link of links) {
      counts[link.label] = (counts[link.label] ?? 0) + 1;
    }
    return Object.entries(counts)
      .map(([label, count]) => `${label} ${count}`)
      .join(' · ');
  }, [links]);

  return (
    <FoundryShell
      app="Object View"
      title={loading ? '正在打开对象…' : String(title)}
      lead={
        kind === 'Strategy'
          ? '这一版钉死的数。点一个词，看这一套。'
          : '某一个对象的标准页：属性按写通道分组；链接沿安排→行→委托→成交→持仓→股票走；相关应用打开 Workshop / Quiver / Vertex。'
      }
      actions={[
        { label: 'Object Explorer', to: '/ontology' },
        {
          label: '开盘前安排',
          to:
            kind === 'PreOpenArrangement' && object?.sessionDate
              ? `/workshop/pre-open?date=${encodeURIComponent(String(object.sessionDate))}`
              : kind === 'Position' && object?.entryDate
                ? `/workshop/pre-open?date=${encodeURIComponent(String(object.entryDate))}`
                : '/workshop/pre-open',
          primary: true,
        },
      ]}
    >
      <div className="object-view-picker">
        <Space wrap>
          <Select
            style={{ width: 200 }}
            value={kind}
            options={[
              { value: 'PreOpenArrangement', label: '开盘安排' },
              { value: 'Position', label: '持仓' },
              { value: 'Stock', label: '股票' },
              { value: 'Strategy', label: '做法' },
            ]}
            onChange={(value: Kind) => {
              setParams({ type: value, id: defaultIds[value] });
            }}
          />
          <Select
            style={{ minWidth: 360 }}
            showSearch
            optionFilterProp="label"
            value={id}
            options={picker.options}
            onChange={(value: string) => setParams({ type: kind, id: value })}
          />
        </Space>
      </div>

      {error ? <Alert type="error" showIcon message={error} /> : null}
      {loading ? <Spin /> : null}
      {!loading && !error && !object ? <Empty description="没有这个对象" /> : null}

      {!loading && object ? (
        <>
          {kind === 'Strategy' ? (
            <FoundrySection title="这一版" eyebrow="做法">
              <StrategyPlaybookMap strategy={object} />
            </FoundrySection>
          ) : null}

          <FoundrySection title={`${typeTitle(kind)} · ${propertyTitle(kind, primaryKeys[kind])}`} eyebrow="身份">
            <p className="foundry-mono">{String(object[primaryKeys[kind]])}</p>
            <p>域 {cell(object.domain)} · 类型 {typeTitle(kind)}</p>
          </FoundrySection>

          {grouped.map((bucket) => (
            <FoundrySection key={bucket.group} title={bucket.group} eyebrow="属性">
              <Table
                size="small"
                pagination={false}
                rowKey="key"
                dataSource={bucket.rows}
                columns={[
                  { title: '属性', dataIndex: 'label', width: 180 },
                  { title: 'apiName', dataIndex: 'key', width: 200, render: (value: string) => <span className="foundry-mono">{value}</span> },
                  { title: '值', dataIndex: 'value' },
                ]}
              />
            </FoundrySection>
          ))}

          <FoundrySection title="链接" eyebrow="链接">
            {linkSummary ? (
              <Typography.Paragraph type="secondary" style={{ marginTop: 0 }}>
                {links.length} 条 · {linkSummary}
              </Typography.Paragraph>
            ) : null}
            {links.length === 0 ? (
              <p>这一端还没有可展示的链接对象。</p>
            ) : (
              <Table
                size="small"
                pagination={{ pageSize: 12, showSizeChanger: false }}
                rowKey={(row, index) => `${row.label}-${row.id}-${index}`}
                dataSource={links}
                onRow={(row) => ({
                  onClick: () => openLink(row),
                  style: { cursor: 'pointer' },
                })}
                columns={[
                  { title: '关系', dataIndex: 'label', width: 120 },
                  {
                    title: '对象',
                    dataIndex: 'title',
                    render: (value: string, row: LinkRow) => (
                      <span>
                        {value}
                        {row.kind !== 'App' ? (
                          <Typography.Text type="secondary" className="foundry-mono" style={{ marginLeft: 8, fontSize: 12 }}>
                            {row.kind}
                          </Typography.Text>
                        ) : null}
                      </span>
                    ),
                  },
                  { title: '说明', dataIndex: 'meta' },
                  {
                    title: '',
                    width: 88,
                    render: (_: unknown, row: LinkRow) => (
                      <Button type="link" onClick={(event) => { event.stopPropagation(); openLink(row); }}>
                        打开
                      </Button>
                    ),
                  },
                ]}
              />
            )}
          </FoundrySection>

          <FoundrySection title="相关应用" eyebrow="应用">
            <Space wrap>
              <Link
                to={
                  kind === 'PreOpenArrangement' && object.sessionDate
                    ? `/workshop/pre-open?date=${encodeURIComponent(String(object.sessionDate))}`
                    : kind === 'Position' && object.entryDate
                      ? `/workshop/pre-open?date=${encodeURIComponent(String(object.entryDate))}`
                      : '/workshop/pre-open'
                }
              >
                <Button type="primary">Workshop · 开盘前安排</Button>
              </Link>
              <Link to="/ontology"><Button>Object Explorer</Button></Link>
              {kind === 'Stock' || kind === 'Position' ? (
                <Link
                  to={`/ontology/quiver?profile=${encodeURIComponent('StockTrading.stockDaily')}&id=${encodeURIComponent(String(object.ticker))}`}
                >
                  <Button>Quiver</Button>
                </Link>
              ) : null}
              {kind === 'Stock' ? (
                <Link
                  to={`/ontology/vertex?profile=${encodeURIComponent('StockTrading.stockExplore')}&type=Stock&id=${encodeURIComponent(String(object.ticker))}`}
                >
                  <Button>Vertex</Button>
                </Link>
              ) : null}
              {kind === 'Position' ? (
                <Link
                  to={`/ontology/vertex?profile=${encodeURIComponent('StockTrading.stockExplore')}&type=Stock&id=${encodeURIComponent(String(object.ticker))}`}
                >
                  <Button>Vertex · Stock</Button>
                </Link>
              ) : null}
              {kind === 'PreOpenArrangement' ? (
                <Link
                  to={`/ontology/vertex?profile=${encodeURIComponent('StockTrading.arrangementExplore')}&type=PreOpenArrangement&id=${encodeURIComponent(String(object.arrangementId))}`}
                >
                  <Button>Vertex</Button>
                </Link>
              ) : null}
              {kind === 'PreOpenArrangement' && object.sessionDate ? (
                <Link
                  to={`/notepad?template=StockTrading.morningBrief&date=${encodeURIComponent(String(object.sessionDate))}`}
                >
                  <Button>Notepad</Button>
                </Link>
              ) : null}
              {kind === 'PreOpenArrangement' ? (
                <Link to={`/data/lineage?arrangementId=${encodeURIComponent(String(object.arrangementId))}`}>
                  <Button>Lineage</Button>
                </Link>
              ) : null}
              {kind === 'PreOpenArrangement' ? (
                <Typography.Text type="secondary">安排交易日 {cell(object.sessionDate)}</Typography.Text>
              ) : null}
            </Space>
          </FoundrySection>
        </>
      ) : null}
    </FoundryShell>
  );
}
