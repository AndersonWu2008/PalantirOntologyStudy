import React, { useEffect, useState } from 'react';
import { Alert, Button, Empty, Select, Space, Spin, Table, Typography } from 'antd';
import { Link } from 'react-router-dom';
import { FoundrySection, FoundryShell } from './FoundryShell';

const API = 'http://127.0.0.1:3010';

type Row = Record<string, unknown>;

type NodeRow = {
  key: string;
  side: '上游' | '本对象' | '下游';
  kind: string;
  id: string;
  title: string;
  status: string;
  open?: string;
};

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`读取失败 ${response.status}`);
  return response.json() as Promise<T>;
}

export default function DataLineagePage() {
  const [arrangementId, setArrangementId] = useState('acct-1|2026-05-19|1');
  const [options, setOptions] = useState<{ value: string; label: string }[]>([]);
  const [nodes, setNodes] = useState<NodeRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getJson<Row[]>(`${API}/arrangements?domain=StockTrading&accountId=acct-1`)
      .then((rows) =>
        setOptions(
          rows.map((row) => ({
            value: String(row.arrangementId),
            label: `${row.arrangementId} · ${row.header ?? ''}`,
          })),
        ),
      )
      .catch(() => setOptions([]));
  }, []);

  async function load(id: string) {
    setLoading(true);
    setError(null);
    setNodes(null);
    try {
      const arrangement = await getJson<Row>(`${API}/arrangements/${encodeURIComponent(id)}`);
      const sessionDate = String(arrangement.sessionDate ?? '');
      const [tradingDays, buys, sells, buyOrders, sellOrders, fills, positions] = await Promise.all([
        getJson<Row[]>(`${API}/trading-days?domain=StockTrading&sessionDate=${encodeURIComponent(sessionDate)}`),
        getJson<Row[]>(`${API}/buy-lines?domain=StockTrading&arrangementId=${encodeURIComponent(id)}`),
        getJson<Row[]>(`${API}/sell-lines?domain=StockTrading&arrangementId=${encodeURIComponent(id)}`),
        getJson<Row[]>(`${API}/buy-orders?domain=StockTrading`),
        getJson<Row[]>(`${API}/sell-orders?domain=StockTrading`),
        getJson<Row[]>(`${API}/fills?domain=StockTrading&sessionDate=${encodeURIComponent(sessionDate)}`),
        getJson<Row[]>(`${API}/positions?domain=StockTrading&accountId=acct-1`),
      ]);
      const day = tradingDays[0];
      const next: NodeRow[] = [
        {
          key: 'day',
          side: '上游',
          kind: 'TradingDay',
          id: sessionDate,
          title: `制度 ${day?.regime ?? '—'} · 门 ${day?.entryGate ?? '—'}`,
          status: day?.regime ? '有' : '缺',
          open: `/ontology?focus=TradingDay&sessionDate=${encodeURIComponent(sessionDate)}`,
        },
        {
          key: 'bars',
          side: '上游',
          kind: 'DailyBar',
          id: `${sessionDate} 池内行情`,
          title: '收盘因子与比较数（上一交易日决策用）',
          status: '源+派生',
          open: `/ontology?focus=DailyBar&sessionDate=${encodeURIComponent(sessionDate)}`,
        },
        {
          key: 'self',
          side: '本对象',
          kind: 'PreOpenArrangement',
          id: String(arrangement.arrangementId),
          title: String(arrangement.header ?? ''),
          status: String(arrangement.header ?? ''),
          open: `/ontology/object-view?type=PreOpenArrangement&id=${encodeURIComponent(String(arrangement.arrangementId))}`,
        },
      ];
      for (const line of sells) {
        next.push({
          key: `sell-${line.sellLineId}`,
          side: '下游',
          kind: 'SellLine',
          id: String(line.sellLineId),
          title: `${line.ticker} · ${line.reason ?? ''}`,
          status: String(line.outcome ?? '计划'),
        });
        const order = sellOrders.find((item) => item.sellLineId === line.sellLineId);
        if (order) {
          next.push({
            key: `sell-order-${order.orderId}`,
            side: '下游',
            kind: 'SellOrder',
            id: String(order.orderId),
            title: String(line.ticker),
            status: String(order.executionStatus),
          });
        }
      }
      for (const line of buys) {
        next.push({
          key: `buy-${line.buyLineId}`,
          side: '下游',
          kind: 'BuyLine',
          id: String(line.buyLineId),
          title: `${line.ticker} · 名次 ${line.rank}`,
          status: String(line.outcome ?? '计划'),
          open: `/ontology/object-view?type=Stock&id=${encodeURIComponent(String(line.ticker))}`,
        });
        const order = buyOrders.find((item) => item.buyLineId === line.buyLineId);
        if (order) {
          next.push({
            key: `buy-order-${order.orderId}`,
            side: '下游',
            kind: 'BuyOrder',
            id: String(order.orderId),
            title: String(line.ticker),
            status: String(order.executionStatus),
          });
          const fill = fills.find((item) => item.ticker === line.ticker);
          if (fill) {
            next.push({
              key: `fill-${fill.fillId}`,
              side: '下游',
              kind: 'Fill',
              id: String(fill.fillId),
              title: `${fill.side} ${fill.quantity}@${fill.price}`,
              status: String(fill.sessionDate),
            });
          }
          const position = positions.find((item) => item.ticker === line.ticker);
          if (position) {
            next.push({
              key: `pos-${position.positionId}`,
              side: '下游',
              kind: 'Position',
              id: String(position.positionId),
              title: `${position.quantity} 股`,
              status: String(position.exitState ?? '未判定'),
              open: `/ontology/object-view?type=Position&id=${encodeURIComponent(String(position.positionId))}`,
            });
          }
        }
      }
      setNodes(next);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '展开失败');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load(arrangementId);
  }, [arrangementId]);

  return (
    <FoundryShell
      app="Data Lineage"
      title="从一个对象看见上下游"
      lead="点开一份安排，展开上游交易日/行情与下游行→委托→成交→持仓。"
      actions={[
        { label: 'Object Explorer', to: '/ontology', primary: true },
        { label: 'Workshop', to: '/workshop/pre-open' },
        { label: 'Object View', to: `/ontology/object-view?type=PreOpenArrangement&id=${encodeURIComponent(arrangementId)}` },
      ]}
    >
      <FoundrySection title="起点对象" eyebrow="Search">
        <Space wrap>
          <Select
            style={{ minWidth: 420 }}
            showSearch
            optionFilterProp="label"
            value={arrangementId}
            options={options}
            onChange={setArrangementId}
          />
          <Button onClick={() => void load(arrangementId)}>重新展开</Button>
        </Space>
      </FoundrySection>

      <FoundrySection title="上下游" eyebrow="Graph">
        {error ? <Alert type="error" showIcon message={error} /> : null}
        {loading ? <Spin /> : null}
        {!loading && !error && nodes == null ? <Empty description="还没有展开" /> : null}
        {!loading && nodes ? (
          <Table
            size="small"
            pagination={false}
            rowKey="key"
            dataSource={nodes}
            columns={[
              { title: '侧', dataIndex: 'side', width: 80 },
              { title: '类型', dataIndex: 'kind', width: 160 },
              {
                title: '身份',
                dataIndex: 'id',
                render: (value: string) => <span className="foundry-mono">{value}</span>,
              },
              { title: '说明', dataIndex: 'title' },
              {
                title: '状态',
                dataIndex: 'status',
                width: 160,
                render: (value: string) => {
                  const tone = value.includes('没做完') || value === '缺'
                    ? 'danger'
                    : value.includes('已受理') || value === '有'
                      ? 'success'
                      : undefined;
                  return (
                    <Typography.Text type={tone === 'danger' ? 'danger' : tone === 'success' ? 'success' : undefined}>
                      {value}
                    </Typography.Text>
                  );
                },
              },
              {
                title: '',
                width: 88,
                render: (_: unknown, row: NodeRow) =>
                  row.open ? <Link to={row.open}>打开</Link> : null,
              },
            ]}
          />
        ) : null}
      </FoundrySection>
    </FoundryShell>
  );
}
