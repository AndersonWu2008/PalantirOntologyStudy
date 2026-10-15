import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Button, InputNumber, Select, Space, Table, Tag, Typography } from 'antd';
import { Link, useSearchParams } from 'react-router-dom';
import { decidePlan, shanghaiParts } from '../../../../pipeline/ashare-calendar';
import {
  buildBriefParagraphs,
  explainBuyWhy,
  explainGate,
  explainSellReason,
  packRequiresBreadth,
  type BriefContext,
} from './preOpenBrief';
import './PreOpenPage.less';

const OBJECTS = 'http://127.0.0.1:3010';
const ACTIONS = 'http://127.0.0.1:3020';

const sentenceOnly = new Set([
  '没做完',
  '和券商对不上',
  '这份已作废',
  '做法不对',
  '互相矛盾',
  '持仓只数对不上',
  '今天停止',
]);

type Row = Record<string, unknown>;

type Arrangement = {
  arrangementId: string;
  accountId: string;
  sessionDate: string;
  strategyId?: string | null;
  header: string;
  supersedesArrangementId?: string | null;
  totalAssetsShown?: number | null;
  cashShown?: number | null;
  continueCount?: number | null;
  sellConfirmedBy?: string | null;
  buyConfirmedBy?: string | null;
};

type PendingOrder = {
  orderId: string;
  side: '买入' | '卖出';
  ticker: string;
  quantity: number;
  limitPrice: number;
  executionStatus: string;
  defaultPrice: number;
};

function currentArrangement(rows: Arrangement[]): Arrangement | undefined {
  const superseded = new Set(
    rows.map((row) => row.supersedesArrangementId).filter((id): id is string => id != null && id !== ''),
  );
  return rows.find(
    (row) =>
      !superseded.has(row.arrangementId) &&
      !rows.some((other) => other.supersedesArrangementId === row.arrangementId),
  );
}

function money(value: unknown): string {
  if (value == null || value === '') return '—';
  const number = Number(value);
  if (!Number.isFinite(number)) return '—';
  return number.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function count(value: unknown): string {
  if (value == null || value === '') return '—';
  const number = Number(value);
  if (!Number.isFinite(number)) return '—';
  return number.toLocaleString('zh-CN');
}

function minutesOf(asOf: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Shanghai',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(asOf));
  const hour = Number(parts.find((part) => part.type === 'hour')?.value);
  const minute = Number(parts.find((part) => part.type === 'minute')?.value);
  return hour * 60 + minute;
}

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`读取失败 ${response.status}`);
  return response.json() as Promise<T>;
}

function preferredDate(dates: string[], hint?: string | null): string | undefined {
  if (hint && dates.includes(hint)) return hint;
  return dates[0];
}

function topScores(rows: Row[]): Row[] {
  return rows
    .filter((row) => row.scoreZj != null && row.scoreZj !== '')
    .sort((left, right) => Number(right.scoreZj) - Number(left.scoreZj) || String(left.ticker).localeCompare(String(right.ticker)))
    .slice(0, 10);
}

function planWord(ticker: string, sellRows: Row[], buyRows: Row[]): string {
  if (sellRows.some((row) => String(row.ticker) === ticker)) return '卖出';
  if (buyRows.some((row) => String(row.ticker) === ticker)) return '买入';
  return '不动';
}

function holdWord(ticker: string, sellRows: Row[]): string {
  return sellRows.some((row) => String(row.ticker) === ticker) ? '卖出' : '继续拿';
}

const PreOpenPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [arrangements, setArrangements] = useState<Arrangement[]>([]);
  const [accountName, setAccountName] = useState('账户');
  const [names, setNames] = useState<Record<string, string>>({});
  const [tradeDate, setTradeDate] = useState(() => searchParams.get('date') ?? '');
  const [sells, setSells] = useState<Row[]>([]);
  const [buys, setBuys] = useState<Row[]>([]);
  const [pending, setPending] = useState<PendingOrder[]>([]);
  const [fillDraft, setFillDraft] = useState<Record<string, { price: number; quantity: number }>>({});
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<'sell' | 'buy' | string | null>(null);
  const [liveCash, setLiveCash] = useState<number | null>(null);
  const [liveAssets, setLiveAssets] = useState<number | null>(null);
  const [linesReady, setLinesReady] = useState(false);
  const [sessionDays, setSessionDays] = useState<string[]>([]);
  const [scored, setScored] = useState<Row[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [holds, setHolds] = useState<Row[]>([]);
  const [briefExtra, setBriefExtra] = useState<{
    closeDate: string | null;
    strategyName: string | null;
    packId: string | null;
    regime: string | null;
    entryGate: string | null;
    breadth: number | null;
    bullHvStreak: number | null;
    regimeMinPersistDays: number | null;
    breadthMin: number | null;
  } | null>(null);

  const page = useMemo(() => {
    if (!tradeDate) return undefined;
    const sameDay = arrangements.filter((row) => row.sessionDate === tradeDate);
    return currentArrangement(sameDay);
  }, [arrangements, tradeDate]);

  const dates = useMemo(
    () => [...new Set(arrangements.map((row) => row.sessionDate))].sort().reverse(),
    [arrangements],
  );

  const asOf = `${tradeDate || '2026-05-19'}T09:26:00+08:00`;
  const clock = minutesOf(asOf);
  const headerOk = page?.header === '还没写下委托';
  const clockSellOk = clock >= 9 * 60 + 25 && clock < 15 * 60;
  const clockBuyOk = clock >= 9 * 60 + 25 && clock < 9 * 60 + 30;
  const canSell = Boolean(headerOk && clockSellOk);
  const canBuy = Boolean(headerOk && clockBuyOk);
  const showLines = page != null && !sentenceOnly.has(page.header);

  const writableSells = sells.filter((row) =>
    ['可写入委托', '挂涨停价', '卖掉可卖的其余今天卖不掉'].includes(String(row.outcome ?? '')),
  ).length;
  const writableBuys = buys.filter((row) => row.outcome === '可写入委托').length;

  const load = useCallback(async () => {
    const [pages, accounts, stocks, days, positions] = await Promise.all([
      getJson<Arrangement[]>(`${OBJECTS}/arrangements?domain=StockTrading&accountId=acct-1`),
      getJson<Row[]>(`${OBJECTS}/accounts?domain=StockTrading`),
      getJson<Row[]>(`${OBJECTS}/stocks?domain=StockTrading`),
      getJson<Row[]>(`${OBJECTS}/trading-days?domain=StockTrading&isTradingDay=true`),
      getJson<Row[]>(`${OBJECTS}/positions?domain=StockTrading&accountId=acct-1`),
    ]);
    setArrangements(pages);
    setHolds(
      positions
        .filter((row) => Number(row.quantity) > 0)
        .sort((left, right) => String(left.ticker).localeCompare(String(right.ticker))),
    );
    setSessionDays(days.map((row) => String(row.sessionDate).slice(0, 10)));
    const account = accounts.find((row) => row.accountId === 'acct-1');
    setAccountName(String(account?.displayName ?? 'acct-1'));
    setLiveCash(account?.availableCash != null ? Number(account.availableCash) : null);
    setLiveAssets(account?.totalAssets != null ? Number(account.totalAssets) : null);
    const nextNames: Record<string, string> = {};
    for (const stock of stocks) {
      nextNames[String(stock.ticker)] = String(stock.displayName ?? stock.ticker);
    }
    setNames(nextNames);
  }, []);

  const loadPending = useCallback(async (arrangementId: string) => {
    const [buyOrders, sellOrders, buyLines, sellLines] = await Promise.all([
      getJson<Row[]>(`${OBJECTS}/buy-orders?domain=StockTrading`),
      getJson<Row[]>(`${OBJECTS}/sell-orders?domain=StockTrading`),
      getJson<Row[]>(`${OBJECTS}/buy-lines?domain=StockTrading&arrangementId=${encodeURIComponent(arrangementId)}`),
      getJson<Row[]>(`${OBJECTS}/sell-lines?domain=StockTrading&arrangementId=${encodeURIComponent(arrangementId)}`),
    ]);
    const buyByLine = new Map(buyLines.map((line) => [String(line.buyLineId), line]));
    const sellByLine = new Map(sellLines.map((line) => [String(line.sellLineId), line]));
    const next: PendingOrder[] = [];
    for (const order of buyOrders) {
      if (order.contentStatus !== '待执行') continue;
      if (order.executionStatus === '已受理' || order.executionStatus === '被拒绝') continue;
      const line = buyByLine.get(String(order.buyLineId));
      if (!line) continue;
      next.push({
        orderId: String(order.orderId),
        side: '买入',
        ticker: String(line.ticker),
        quantity: Number(order.quantity),
        limitPrice: Number(order.limitPrice),
        executionStatus: String(order.executionStatus),
        defaultPrice: Number(line.openPrice ?? order.limitPrice),
      });
    }
    for (const order of sellOrders) {
      if (order.contentStatus !== '待执行') continue;
      if (order.executionStatus === '已受理' || order.executionStatus === '被拒绝') continue;
      const line = sellByLine.get(String(order.sellLineId));
      if (!line) continue;
      next.push({
        orderId: String(order.orderId),
        side: '卖出',
        ticker: String(line.ticker),
        quantity: Number(order.quantity),
        limitPrice: Number(order.limitPrice),
        executionStatus: String(order.executionStatus),
        defaultPrice: Number(line.openPrice ?? order.limitPrice),
      });
    }
    setPending(next);
    setFillDraft((prior) => {
      const draft: Record<string, { price: number; quantity: number }> = { ...prior };
      for (const order of next) {
        if (!draft[order.orderId]) {
          draft[order.orderId] = { price: order.defaultPrice, quantity: order.quantity };
        }
      }
      return draft;
    });
  }, []);

  useEffect(() => {
    load().catch((reason: unknown) => setError(reason instanceof Error ? reason.message : '读取安排失败'));
  }, [load]);

  useEffect(() => {
    if (syncing || dates.length === 0) return;
    const next = preferredDate(dates, searchParams.get('date') ?? (tradeDate || null));
    if (!next) return;
    if (next !== tradeDate) setTradeDate(next);
    if (searchParams.get('date') !== next) {
      setSearchParams({ date: next }, { replace: true });
    }
  }, [dates, searchParams, setSearchParams, syncing, tradeDate]);

  useEffect(() => {
    if (!page) {
      setSells([]);
      setBuys([]);
      setPending([]);
      setBriefExtra(null);
      setLinesReady(false);
      setScored([]);
      return;
    }
    setLinesReady(false);
    setBriefExtra(null);
    const id = encodeURIComponent(page.arrangementId);
    Promise.all([
      getJson<Row[]>(`${OBJECTS}/sell-lines?domain=StockTrading&arrangementId=${id}`),
      getJson<Row[]>(`${OBJECTS}/buy-lines?domain=StockTrading&arrangementId=${id}`),
    ])
      .then(([sellRows, buyRows]) => {
        setSells(sellRows);
        setBuys([...buyRows].sort((left, right) => Number(left.rank) - Number(right.rank)));
        setLinesReady(true);
      })
      .catch((reason: unknown) => {
        setLinesReady(true);
        setError(reason instanceof Error ? reason.message : '读取买卖行失败');
      });
    loadPending(page.arrangementId).catch((reason: unknown) =>
      setError(reason instanceof Error ? reason.message : '读取委托失败'),
    );

    void (async () => {
      try {
        const days = await getJson<Row[]>(`${OBJECTS}/trading-days?domain=StockTrading&isTradingDay=true`);
        const sorted = days
          .map((row) => String(row.sessionDate))
          .filter(Boolean)
          .sort();
        const closeDate = [...sorted].reverse().find((date) => date < page.sessionDate) ?? null;
        const closeKey = closeDate ? closeDate.slice(0, 10) : null;
        if (closeKey) {
          const bars = await getJson<Row[]>(
            `${OBJECTS}/daily-bars?domain=StockTrading&sessionDate=${encodeURIComponent(closeKey)}`,
          );
          setScored(topScores(bars));
        } else {
          setScored([]);
        }
        const closeDay = closeDate
          ? await getJson<Row>(`${OBJECTS}/trading-days/${encodeURIComponent(closeDate)}`)
          : null;
        const strategyId = String(page.strategyId ?? '');
        let strategy: Row | null = null;
        if (strategyId) {
          try {
            strategy = await getJson<Row>(`${OBJECTS}/strategies/${encodeURIComponent(strategyId)}`);
          } catch {
            strategy = null;
          }
        }
        setBriefExtra({
          closeDate,
          strategyName: strategy ? String(strategy.displayName ?? strategyId) : strategyId || null,
          packId: strategy?.packId != null ? String(strategy.packId) : null,
          regime: closeDay?.regime != null ? String(closeDay.regime) : null,
          entryGate: closeDay?.entryGate != null ? String(closeDay.entryGate) : null,
          breadth: closeDay?.breadth != null ? Number(closeDay.breadth) : null,
          bullHvStreak: closeDay?.bullHvStreak != null ? Number(closeDay.bullHvStreak) : null,
          regimeMinPersistDays:
            strategy?.regimeMinPersistDays != null ? Number(strategy.regimeMinPersistDays) : null,
          breadthMin: strategy?.breadthMin != null ? Number(strategy.breadthMin) : null,
        });
      } catch {
        setScored([]);
        setBriefExtra({
          closeDate: null,
          strategyName: page.strategyId ? String(page.strategyId) : null,
          packId: null,
          regime: null,
          entryGate: null,
          breadth: null,
          bullHvStreak: null,
          regimeMinPersistDays: null,
          breadthMin: null,
        });
      }
    })();
  }, [page, loadPending]);

  async function syncPlan() {
    setSyncing(true);
    setNotice(null);
    setError(null);
    try {
      const response = await fetch(`${ACTIONS}/sync-and-plan`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ accountId: 'acct-1' }),
      });
      const body = await response.json() as { error?: string; planDate?: string; barDate?: string; source?: string };
      if (!response.ok) throw new Error(body.error ?? '这次没有拉下来');
      const planDate = body.planDate ?? '';
      setNotice(`已写入 ${body.barDate ?? ''} 的行情（${body.source ?? '行情'}），计划在 ${planDate}。`);
      await load();
      if (planDate) {
        setTradeDate(planDate);
        setSearchParams({ date: planDate });
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '这次没有拉下来');
    } finally {
      setSyncing(false);
    }
  }

  function selectDate(date: string) {
    setTradeDate(date);
    setSearchParams({ date });
    setNotice(null);
    setError(null);
  }

  async function submit(kind: 'sell' | 'buy') {
    if (!page) return;
    setSubmitting(kind);
    setNotice(null);
    setError(null);
    try {
      const response = await fetch(kind === 'sell' ? `${ACTIONS}/confirm-sells` : `${ACTIONS}/confirm-buys`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          accountId: page.accountId,
          tradeDate: page.sessionDate,
          asOf,
          actor: '交易员',
        }),
      });
      const body = await response.json() as { error?: string; orders?: string[] };
      if (!response.ok) throw new Error(body.error ?? '这次提交不发生');
      const countWritten = body.orders?.length ?? 0;
      setNotice(countWritten === 0 ? '没有新的待执行委托' : `写下 ${countWritten} 笔待执行委托`);
      await load();
      await loadPending(page.arrangementId);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '这次提交不发生');
    } finally {
      setSubmitting(null);
    }
  }

  async function submitFill(order: PendingOrder) {
    if (!page) return;
    const draft = fillDraft[order.orderId] ?? { price: order.defaultPrice, quantity: order.quantity };
    setSubmitting(order.orderId);
    setNotice(null);
    setError(null);
    try {
      const response = await fetch(`${ACTIONS}/report-fill`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          orderId: order.orderId,
          side: order.side,
          price: draft.price,
          quantity: draft.quantity,
          sessionDate: page.sessionDate,
          actor: '交易员',
        }),
      });
      const body = await response.json() as { error?: string; ticker?: string; fillId?: string };
      if (!response.ok) throw new Error(body.error ?? '这次回报不发生');
      setNotice(`已回报 ${names[order.ticker] ?? order.ticker} 的成交`);
      await load();
      await loadPending(page.arrangementId);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '这次回报不发生');
    } finally {
      setSubmitting(null);
    }
  }

  const clockNow = shanghaiParts();
  const planChoice = decidePlan(clockNow.day, clockNow.minutes, new Set(sessionDays));
  const syncLabel = planChoice.planDate === clockNow.day ? '更新并看当日计划' : '更新并看下一日计划';
  const syncHint = planChoice.planDate === clockNow.day
    ? `不到 15:00，拉 ${planChoice.barDate} 的收盘，看今天的计划。`
    : `拉 ${planChoice.barDate} 的收盘，看 ${planChoice.planDate} 的计划。`;

  const assets = liveAssets ?? Number(page?.totalAssetsShown ?? 0);
  const cashShown = liveCash ?? page?.cashShown;
  const briefCtx: BriefContext | null = page
    ? {
        tradeDate: page.sessionDate,
        closeDate: briefExtra?.closeDate ?? null,
        strategyId: page.strategyId ? String(page.strategyId) : null,
        strategyName: briefExtra?.strategyName ?? null,
        packId: briefExtra?.packId ?? null,
        regime: briefExtra?.regime ?? null,
        entryGate: briefExtra?.entryGate ?? null,
        breadth: briefExtra?.breadth ?? null,
        bullHvStreak: briefExtra?.bullHvStreak ?? null,
        regimeMinPersistDays: briefExtra?.regimeMinPersistDays ?? null,
        breadthMin: briefExtra?.breadthMin ?? null,
        requireBreadthGate: packRequiresBreadth(briefExtra?.packId),
        header: page.header,
        sellCount: sells.length,
        buyCount: buys.length,
        continueCount: Number(page.continueCount ?? 0),
        sellReasons: sells.map((row) => String(row.reason ?? '')).filter(Boolean),
      }
    : null;
  const briefLines = briefCtx ? buildBriefParagraphs(briefCtx) : [];
  const gateExplain = briefCtx ? explainGate(briefCtx) : null;
  const objectViewHref = page
    ? `/ontology/object-view?type=PreOpenArrangement&id=${encodeURIComponent(page.arrangementId)}`
    : '/ontology/object-view?type=PreOpenArrangement';
  const vertexHref = page
    ? `/ontology/vertex?profile=StockTrading.arrangementExplore&type=PreOpenArrangement&id=${encodeURIComponent(page.arrangementId)}`
    : '/ontology/vertex?profile=StockTrading.arrangementExplore';
  const notepadHref = tradeDate
    ? `/notepad?template=StockTrading.morningBrief&date=${encodeURIComponent(tradeDate)}`
    : '/notepad?template=StockTrading.morningBrief';

  return (
    <div className="pre-open-page">
      <header className="pre-open-chrome">
        <div>
          <div className="pre-open-app">Workshop</div>
          <Typography.Title level={3} className="pre-open-title">开盘前安排</Typography.Title>
          <p className="pre-open-lead">
            先看懂「明天打算做什么、为什么」，再确认委托、人手回报成交。系统不改股数限价，不代报券商。
          </p>
        </div>
        <span className="pre-open-domain">StockTrading</span>
      </header>

      <div className="pre-open-sync">
        <Button
          type="primary"
          className="ds-btn--blue"
          loading={syncing}
          onClick={() => void syncPlan()}
        >
          {syncLabel}
        </Button>
        <span>{syncHint}</span>
      </div>

      <Space size="middle" wrap className="pre-open-meta">
        <span>{accountName}</span>
        <Select
          value={dates.includes(tradeDate) ? tradeDate : undefined}
          placeholder="交易日"
          style={{ width: 160 }}
          options={dates.map((date) => ({ value: date, label: date }))}
          onChange={selectDate}
        />
        <span>提交时钟按 09:26</span>
        <span>总资产 {money(assets || page?.totalAssetsShown)}</span>
        <span>可用资金 {money(cashShown)}</span>
        {briefExtra?.strategyName ? <span>做法 {briefExtra.strategyName}</span> : null}
        {page ? (
          <Typography.Text type="secondary" className="foundry-mono">
            {page.arrangementId}
          </Typography.Text>
        ) : null}
      </Space>

      <Space wrap className="pre-open-deeplinks">
        <Link to={objectViewHref}><Button size="small">Object View</Button></Link>
        <Link to={vertexHref}><Button size="small">Vertex</Button></Link>
        <Link to={notepadHref}><Button size="small">Notepad brief</Button></Link>
        <Link to="/automate?id=StockTrading.headerNeedsOrders"><Button size="small">Automate</Button></Link>
        <Link to="/data/health"><Button size="small">Data Health</Button></Link>
        <Link to="/workshop/builder"><Button size="small">Builder</Button></Link>
      </Space>

      {error ? <Alert type="error" showIcon message={error} style={{ marginBottom: 12 }} /> : null}
      {notice ? <Alert type="success" showIcon message={notice} style={{ marginBottom: 12 }} /> : null}

      {page && linesReady && briefExtra && briefLines.length > 0 ? (
        <section className="pre-open-brief">
          <div className="pre-open-brief__label">下一日交易计划（白话）</div>
          {gateExplain ? (
            <div className="pre-open-brief__gate">
              <strong>{gateExplain.title}</strong>
              <span>{gateExplain.detail}</span>
            </div>
          ) : null}
          <ol className="pre-open-brief__list">
            {briefLines.map((line) => (
              <li key={line.slice(0, 48)}>{line}</li>
            ))}
          </ol>
          <div className="pre-open-brief__chips">
            <Tag className="ds-capsule ds-capsule--brand">卖出 {sells.length}</Tag>
            <Tag className="ds-capsule ds-capsule--emphasis">买入 {buys.length}</Tag>
            <Tag className="ds-capsule">继续拿 {page.continueCount ?? 0}</Tag>
            {briefExtra.entryGate ? (
              <Tag
                className={`ds-capsule ${briefExtra.entryGate === '允许' ? 'ds-capsule--success' : ''}`}
                color={briefExtra.entryGate === '允许' ? 'success' : 'default'}
              >
                门·{briefExtra.entryGate}
              </Tag>
            ) : null}
            {briefExtra.regime ? <Tag className="ds-capsule ds-capsule--brand">制度·{briefExtra.regime}</Tag> : null}
          </div>
        </section>
      ) : page ? (
        <section className="pre-open-brief pre-open-brief--loading">
          <div className="pre-open-brief__label">下一日交易计划（白话）</div>
          <p className="pre-open-section__why">正在拼计划叙事（制度门 + 买卖行）…</p>
        </section>
      ) : null}

      <div className="pre-open-header">
        {page ? (
          <Link to={objectViewHref} className="pre-open-header-link">
            {page.header}
          </Link>
        ) : (
          '这一天还没有安排'
        )}
      </div>

      <div className="pre-open-criteria">
        <div className="pre-open-criteria__label">今天能不能提交</div>
        <ul>
          <li>
            确认卖出 · 页首「还没写下委托」{headerOk ? <Tag color="success">可</Tag> : <Tag>否</Tag>}
            · 时钟 09:25–15:00 {clockSellOk ? <Tag color="success">可</Tag> : <Tag>否</Tag>}
            · 可写入 {writableSells}
            · {canSell ? <Tag color="processing">按钮可用</Tag> : <Tag>按钮禁用</Tag>}
          </li>
          <li>
            确认买入 · 页首「还没写下委托」{headerOk ? <Tag color="success">可</Tag> : <Tag>否</Tag>}
            · 时钟 09:25–09:30 {clockBuyOk ? <Tag color="success">可</Tag> : <Tag>否</Tag>}
            · 可写入 {writableBuys}
            · {canBuy ? <Tag color="processing">按钮可用</Tag> : <Tag>按钮禁用</Tag>}
          </li>
        </ul>
      </div>

      {page ? (
        <section className="pre-open-section">
          <div className="pre-open-section__head">
            <Typography.Title level={5}>持仓</Typography.Title>
            <Typography.Text type="secondary">{holds.length} 只</Typography.Text>
          </div>
          <p className="pre-open-section__why">已经拿着的。要卖的在下面，这里不下单。</p>
          <Table
            size="small"
            pagination={false}
            rowKey={(row) => String(row.positionId ?? row.ticker)}
            dataSource={holds}
            locale={{ emptyText: '现在没有持仓' }}
            columns={[
              {
                title: '简称',
                dataIndex: 'ticker',
                render: (ticker: string) => (
                  <Link to={`/ontology/object-view?type=Stock&id=${encodeURIComponent(ticker)}`}>
                    {names[ticker] ?? ticker}
                  </Link>
                ),
              },
              {
                title: '代码',
                dataIndex: 'ticker',
                width: 120,
                render: (ticker: string) => (
                  <Link to={`/ontology/object-view?type=Stock&id=${encodeURIComponent(ticker)}`}>{ticker}</Link>
                ),
              },
              {
                title: '股数',
                dataIndex: 'quantity',
                width: 100,
                render: (value: unknown) => count(value),
              },
              {
                title: '入场价',
                dataIndex: 'entryPrice',
                width: 88,
                render: (value: unknown) => money(value),
              },
              {
                title: '拿了几天',
                dataIndex: 'daysHeld',
                width: 96,
                render: (value: unknown) => count(value),
              },
              {
                title: '判定',
                width: 96,
                render: (_: unknown, row: Row) => {
                  const word = holdWord(String(row.ticker), sells);
                  const tone = word === '卖出' ? 'ds-capsule--warning' : '';
                  return <Tag className={`ds-capsule ${tone}`}>{word}</Tag>;
                },
              },
            ]}
          />
        </section>
      ) : null}

      {showLines ? (
        <>
          <section className="pre-open-section">
            <div className="pre-open-section__head">
              <Typography.Title level={5}>卖出计划</Typography.Title>
              <Typography.Text type="secondary">{sells.length} 行 · 可写入 {writableSells}</Typography.Text>
            </div>
            <p className="pre-open-section__why">
              为何卖：到期 / 止盈 / 止损 / 制度离场 — 见每只标的下方说明。开盘价到了以后，看「开盘后」能不能写成委托。
            </p>
            <Table
              size="small"
              pagination={false}
              scroll={{ x: 920 }}
              rowKey={(row) => String(row.sellLineId)}
              dataSource={sells}
              locale={{ emptyText: '没有要卖出的' }}
              rowClassName={(row) =>
                ['可写入委托', '挂涨停价', '卖掉可卖的其余今天卖不掉'].includes(String(row.outcome ?? ''))
                  ? 'pre-open-row-writable ds-row-writable'
                  : ''
              }
              columns={lineColumns(names, assets, 'sell')}
            />
            <p className="pre-open-continue">
              其余 {page?.continueCount ?? 0} 只继续拿（未触发卖出规则，不出现在上表）。
            </p>
          </section>
          <section className="pre-open-section">
            <div className="pre-open-section__head">
              <Typography.Title level={5}>买入计划</Typography.Title>
              <Typography.Text type="secondary">{buys.length} 行 · 可写入 {writableBuys}</Typography.Text>
            </div>
            <p className="pre-open-section__why">
              为何买：开仓门允许时，按做法评分排序入选；限价用信号日收盘。门关闭时本表应为空。
            </p>
            <Table
              size="small"
              pagination={false}
              scroll={{ x: 920 }}
              rowKey={(row) => String(row.buyLineId)}
              dataSource={buys}
              locale={{ emptyText: '没有要买入的（门未开、仓满、或池内无合格票）' }}
              rowClassName={(row) =>
                row.outcome === '可写入委托' ? 'pre-open-row-writable ds-row-writable' : ''
              }
              columns={lineColumns(names, assets, 'buy')}
            />
          </section>
        </>
      ) : page ? (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message="页首不允许展示买卖行"
          description={
            page.header === '没做完' ? (
              <span>
                先查 <Link to="/data/health">Data Health</Link> / 池缺口，再重跑开盘管道。
              </span>
            ) : page.header === '今天没有要执行的' ? (
              '今天没有要确认的卖出或买入。'
            ) : (
              `当前页首「${page.header}」，模块只读页首。`
            )
          }
        />
      ) : null}

      {page ? (
        <section className="pre-open-section">
          <div className="pre-open-section__head">
            <Typography.Title level={5}>评分前 10</Typography.Title>
            <Typography.Text type="secondary">{briefExtra?.closeDate ?? '收盘日'} · {scored.length} 只</Typography.Text>
          </div>
          <p className="pre-open-section__why">
            这 10 只按分数排，跟买不买无关。
          </p>
          <Table
            size="small"
            pagination={false}
            rowKey={(row) => String(row.ticker)}
            dataSource={scored}
            locale={{ emptyText: '这一天还没有评分' }}
            columns={[
              {
                title: '名次',
                width: 72,
                render: (_: unknown, __: Row, index: number) => index + 1,
              },
              {
                title: '简称',
                dataIndex: 'ticker',
                render: (ticker: string) => (
                  <Link to={`/ontology/object-view?type=Stock&id=${encodeURIComponent(ticker)}`}>
                    {names[ticker] ?? ticker}
                  </Link>
                ),
              },
              {
                title: '代码',
                dataIndex: 'ticker',
                width: 120,
                render: (ticker: string) => (
                  <Link to={`/ontology/object-view?type=Stock&id=${encodeURIComponent(ticker)}`}>{ticker}</Link>
                ),
              },
              {
                title: '分数',
                dataIndex: 'scoreZj',
                width: 88,
                render: (value: unknown) => {
                  const number = Number(value);
                  return Number.isFinite(number) ? number.toFixed(2) : '—';
                },
              },
              {
                title: '策略说法',
                width: 96,
                render: (_: unknown, row: Row) => {
                  const word = planWord(String(row.ticker), sells, buys);
                  const tone = word === '买入' ? 'ds-capsule--success' : word === '卖出' ? 'ds-capsule--warning' : '';
                  return <Tag className={`ds-capsule ${tone}`}>{word}</Tag>;
                },
              },
            ]}
          />
        </section>
      ) : null}

      <Space className="pre-open-actions">
        <Button
          type="primary"
          className="ds-btn--orange"
          disabled={!canSell}
          loading={submitting === 'sell'}
          onClick={() => void submit('sell')}
        >
          确认卖出
        </Button>
        <Button
          type="primary"
          className="ds-btn--green"
          disabled={!canBuy}
          loading={submitting === 'buy'}
          onClick={() => void submit('buy')}
        >
          确认买入
        </Button>
      </Space>
      {page?.sellConfirmedBy ? <p className="pre-open-confirm-note">卖出已由 {page.sellConfirmedBy} 确认</p> : null}
      {page?.buyConfirmedBy ? <p className="pre-open-confirm-note">买入已由 {page.buyConfirmedBy} 确认</p> : null}

      <section className="pre-open-section" style={{ marginTop: 24 }}>
        <div className="pre-open-section__head">
          <Typography.Title level={5}>人手回报成交</Typography.Title>
          <Typography.Text type="secondary">待回报 {pending.length}</Typography.Text>
        </div>
        <p className="pre-open-continue" style={{ marginBottom: 12 }}>从券商抄成交价和股数，告诉系统。系统不代报。</p>
        <Table
          size="small"
          pagination={false}
          scroll={{ x: 980 }}
          rowKey={(row) => row.orderId}
          dataSource={pending}
          locale={{ emptyText: '没有待回报的委托' }}
          columns={[
            { title: '方向', dataIndex: 'side', width: 72 },
            {
              title: '简称',
              dataIndex: 'ticker',
              render: (ticker: string) => (
                <Link to={`/ontology/object-view?type=Stock&id=${encodeURIComponent(ticker)}`}>
                  {names[ticker] ?? ticker}
                </Link>
              ),
            },
            {
              title: '代码',
              dataIndex: 'ticker',
              width: 120,
              render: (ticker: string) => (
                <Link to={`/ontology/object-view?type=Stock&id=${encodeURIComponent(ticker)}`}>{ticker}</Link>
              ),
            },
            { title: '委托股数', dataIndex: 'quantity', width: 100, render: (value: number) => count(value) },
            { title: '委托限价', dataIndex: 'limitPrice', width: 100, render: (value: number) => money(value) },
            {
              title: '成交股数',
              width: 120,
              render: (_: unknown, row: PendingOrder) => (
                <InputNumber
                  min={100}
                  step={100}
                  value={fillDraft[row.orderId]?.quantity ?? row.quantity}
                  onChange={(value) =>
                    setFillDraft((prior) => ({
                      ...prior,
                      [row.orderId]: {
                        price: prior[row.orderId]?.price ?? row.defaultPrice,
                        quantity: Number(value ?? row.quantity),
                      },
                    }))
                  }
                />
              ),
            },
            {
              title: '成交价',
              width: 120,
              render: (_: unknown, row: PendingOrder) => (
                <InputNumber
                  min={0.01}
                  step={0.01}
                  value={fillDraft[row.orderId]?.price ?? row.defaultPrice}
                  onChange={(value) =>
                    setFillDraft((prior) => ({
                      ...prior,
                      [row.orderId]: {
                        quantity: prior[row.orderId]?.quantity ?? row.quantity,
                        price: Number(value ?? row.defaultPrice),
                      },
                    }))
                  }
                />
              ),
            },
            {
              title: '',
              width: 120,
              render: (_: unknown, row: PendingOrder) => (
                <Button
                  type="primary"
                  className="ds-btn--blue"
                  loading={submitting === row.orderId}
                  onClick={() => void submitFill(row)}
                >
                  回报成交
                </Button>
              ),
            },
          ]}
        />
      </section>
    </div>
  );
};

function lineColumns(names: Record<string, string>, assets: number, kind: 'sell' | 'buy') {
  return [
    {
      title: kind === 'buy' ? '买入标的' : '卖出标的',
      width: 220,
      render: (_: unknown, row: Row) => {
        const ticker = String(row.ticker ?? '');
        const why = kind === 'sell' ? explainSellReason(row.reason) : explainBuyWhy(row);
        return (
          <div className="pre-open-namecell">
            <div className="pre-open-namecell__title">
              {kind === 'buy' && row.rank != null ? <span className="pre-open-namecell__rank">#{String(row.rank)}</span> : null}
              {kind === 'sell' && row.reason != null ? <Tag>{String(row.reason)}</Tag> : null}
              <Link to={`/ontology/object-view?type=Stock&id=${encodeURIComponent(ticker)}`}>
                {names[ticker] ?? ticker}
              </Link>
              <Typography.Text type="secondary" className="foundry-mono">
                {ticker}
              </Typography.Text>
            </div>
            <div className="pre-open-namecell__why">{why}</div>
          </div>
        );
      },
    },
    {
      title: '股数',
      width: 88,
      render: (_: unknown, row: Row) => count(row.submitQuantity ?? row.plannedQuantity),
    },
    {
      title: '限价',
      width: 88,
      render: (_: unknown, row: Row) => money(row.submitLimitPrice ?? row.plannedLimitPrice),
    },
    {
      title: '金额',
      width: 108,
      render: (_: unknown, row: Row) => {
        const quantity = Number(row.submitQuantity ?? row.plannedQuantity);
        const limit = Number(row.submitLimitPrice ?? row.plannedLimitPrice);
        return money(quantity * limit);
      },
    },
    {
      title: '占账户',
      width: 88,
      render: (_: unknown, row: Row) => {
        const quantity = Number(row.submitQuantity ?? row.plannedQuantity);
        const limit = Number(row.submitLimitPrice ?? row.plannedLimitPrice);
        if (!assets) return '—';
        return `${((quantity * limit) / assets * 100).toFixed(2)}%`;
      },
    },
    {
      title: '开盘价',
      width: 88,
      render: (_: unknown, row: Row) => money(row.openPrice),
    },
    {
      title: '开盘后',
      dataIndex: 'outcome',
      width: 160,
      render: (value: unknown) => {
        const text = value == null || value === '' ? '等开盘' : String(value);
        if (text === '可写入委托') {
          return (
            <Tag className="ds-capsule ds-capsule--blue" color="processing">
              {text}
            </Tag>
          );
        }
        if (text.startsWith('今天不买')) return <Tag className="ds-capsule">{text}</Tag>;
        return text;
      },
    },
  ];
}

export default PreOpenPage;
