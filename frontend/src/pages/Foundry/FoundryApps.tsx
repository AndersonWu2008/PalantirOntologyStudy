import React, { useMemo } from 'react';
import { Table } from 'antd';
import { useSearchParams } from 'react-router-dom';
import { listCatalogActions, listCatalogFunctions } from '@/pages/DataExplorer/stockFallback';
import { FoundrySection, FoundryShell } from './FoundryShell';

const functionFiles: Record<string, string> = {
  computeBarFeatures: 'pipeline/close-pipeline.ts · computeBarFeatures',
  buildMarketIndex: 'pipeline/close-pipeline.ts',
  computeMarketBreadth: 'pipeline/close-pipeline.ts',
  detectRegime: 'pipeline/close-pipeline.ts · detectRegime',
  computeComparisonScore: 'pipeline/close-pipeline.ts · computeComparisonScore',
  countLimitUps120: 'pipeline/close-pipeline.ts',
  resolveIndustry: 'pipeline/close-pipeline.ts',
  computeLimitPrices: 'pipeline/close-pipeline.ts · runOpenPipeline',
  rollHoldingState: 'pipeline/close-pipeline.ts',
  judgeEntryGate: 'pipeline/close-pipeline.ts · judgeEntryGate',
  selectV44Buys: 'pipeline/close-pipeline.ts · selectV44Buys',
  judgeV44Exits: 'pipeline/close-pipeline.ts · judgeV44Exits',
  computeHuimaqiangFactors: 'pipeline/functions/huimaqiang.ts · computeHuimaqiangFactors',
  computeHuimaqiangScore: 'pipeline/functions/huimaqiang.ts · computeHuimaqiangScore',
  selectHuimaqiangBuys: 'pipeline/functions/huimaqiang.ts · selectHuimaqiangBuys',
  judgeHuimaqiangExits: 'pipeline/close-pipeline.ts（袖套 ATR=0，与引擎一致）',
  writePlannedSellLines: 'pipeline/close-pipeline.ts',
  writePlannedBuyLines: 'pipeline/close-pipeline.ts',
  recordFill: 'pipeline/actions.ts / close-pipeline · recordFill',
  assemblePreOpenPage: 'pipeline/close-pipeline.ts · assemblePreOpenPage',
};

const actionFiles: Record<string, string> = {
  ConfirmSells: 'pipeline/actions.ts · confirmSells',
  ConfirmBuys: 'pipeline/actions.ts · confirmBuys',
  ReportFill: 'pipeline/actions.ts · reportFill',
  PostponeSellLine: 'pipeline/actions.ts（定义；提交视实现）',
  VetoBuyLine: 'pipeline/actions.ts（定义；提交视实现）',
  AcknowledgeNothingToSend: 'pipeline/actions.ts（定义；提交视实现）',
  StopArrangement: 'pipeline/actions.ts（定义；提交视实现）',
  PublishStrategyVersion: 'pipeline/actions.ts（定义；提交视实现）',
  EnableStrategy: 'pipeline/actions.ts（定义；提交视实现）',
};

const runCommands = [
  { name: '同步源行情', command: 'npx tsx pipeline/sync-pool.ts' },
  { name: '补前收', command: 'curl -X POST http://127.0.0.1:3010/daily-bars/previous-close' },
  { name: '灌入因子', command: 'npx tsx pipeline/backfill-factors.ts' },
  { name: '收盘管道', command: 'npx tsx pipeline/close-pipeline.ts' },
  { name: 'Action 服务', command: 'npx tsx pipeline/action-server.ts' },
];

export function WorkshopBuilderPage() {
  const variables = [
    { name: 'accountId', kind: 'string', value: 'acct-1' },
    { name: 'tradeDate', kind: 'string', value: 'URL ?date= 或选择器' },
    { name: 'currentArrangement', kind: 'object', value: '当日未作废 PreOpenArrangement' },
    { name: 'sellLines', kind: 'object set', value: '该安排的 SellLine' },
    { name: 'buyLines', kind: 'object set', value: '该安排的 BuyLine' },
    { name: 'pendingOrders', kind: 'object set', value: '待回报 BuyOrder/SellOrder' },
  ];
  const bindings = [
    { button: '确认卖出', action: 'ConfirmSells', params: 'arrangementId、actor', event: '成功后刷新安排与委托' },
    { button: '确认买入', action: 'ConfirmBuys', params: 'arrangementId、actor', event: '成功后刷新安排与委托' },
    { button: '回报成交', action: 'ReportFill', params: 'orderId、price、quantity、sessionDate', event: '成功后刷新委托与持仓' },
  ];

  return (
    <FoundryShell
      app="Workshop Builder"
      title="建造者配置模块"
      lead="建造者配模块，交易员用模块。按钮只提交 Action Type，不手改股数和限价。完整拖拽编辑器不在本课第一批。"
      actions={[
        { label: '打开交易员模块', to: '/workshop/pre-open', primary: true },
        { label: 'Ontology Manager', to: '/ontology/manager' },
      ]}
    >
      <FoundrySection title="已发布模块" eyebrow="Modules">
        <ul>
          <li>开盘前安排：读 PreOpenArrangement、SellLine、BuyLine、待执行委托</li>
          <li>路由：<span className="foundry-mono">/workshop/pre-open</span></li>
        </ul>
      </FoundrySection>
      <FoundrySection title="Variables" eyebrow="State">
        <Table
          size="small"
          pagination={false}
          rowKey="name"
          dataSource={variables}
          columns={[
            { title: '变量', dataIndex: 'name', width: 180 },
            { title: '种类', dataIndex: 'kind', width: 120 },
            { title: '当前绑定', dataIndex: 'value' },
          ]}
        />
      </FoundrySection>
      <FoundrySection title="Button → Action" eyebrow="Bindings">
        <Table
          size="small"
          pagination={false}
          rowKey="button"
          dataSource={bindings}
          columns={[
            { title: '按钮', dataIndex: 'button', width: 120 },
            { title: 'Action Type', dataIndex: 'action', width: 140 },
            { title: '参数映射', dataIndex: 'params' },
            { title: '事件', dataIndex: 'event' },
          ]}
        />
      </FoundrySection>
      <FoundrySection title="建造规矩" eyebrow="Rules">
        <p>页首不是「还没写下委托」时，确认不可用。成交价由人从券商抄来，系统不代报。</p>
      </FoundrySection>
    </FoundryShell>
  );
}

export function CodeRepositoriesPage() {
  const [params] = useSearchParams();
  const highlight = params.get('fn') ?? '';

  const functionRows = useMemo(
    () =>
      listCatalogFunctions().map((item) => ({
        apiName: item.apiName,
        displayName: item.displayName,
        path: functionFiles[item.apiName] ?? item.code,
      })),
    [],
  );

  const actionRows = useMemo(
    () =>
      listCatalogActions().map((item) => ({
        apiName: item.apiName,
        displayName: item.displayName,
        path: actionFiles[item.apiName] ?? item.code,
      })),
    [],
  );

  const files = [
    { path: 'pipeline/close-pipeline.ts', role: '策略 Function 与收盘/开盘管道' },
    { path: 'pipeline/actions.ts', role: 'ConfirmSells / ConfirmBuys / ReportFill' },
    { path: 'pipeline/sync-pool.ts', role: '源行情同步' },
    { path: 'pipeline/backfill-factors.ts', role: '因子回填' },
    { path: 'pipeline/action-server.ts', role: 'Action 提交 HTTP · :3020' },
    { path: 'database-api/database-api.ts', role: '对象读写与写通道 · :3010' },
    { path: 'ontology/v44/', role: 'Object Type / Link Type / logic.json' },
    { path: 'docs/001_推导/13_V44策略本体.md', role: '唯一公式' },
  ];

  return (
    <FoundryShell
      app="Code Repositories"
      title="Function 的代码在仓库里"
      lead="管道按时间调用 Function。Workshop 只读结果或提交 Action。页上不假装在线编辑。"
      actions={[
        { label: 'Pipeline Builder', to: '/data/pipelines', primary: true },
        { label: 'Ontology Manager', to: '/ontology/manager' },
      ]}
    >
      <FoundrySection title="仓库树" eyebrow="Repository">
        <Table
          size="small"
          pagination={false}
          rowKey="path"
          dataSource={files}
          columns={[
            { title: '路径', dataIndex: 'path' },
            { title: '职责', dataIndex: 'role' },
          ]}
        />
      </FoundrySection>

      <FoundrySection title="Function 索引" eyebrow="Symbols">
        <Table
          size="small"
          pagination={{ pageSize: 10, showSizeChanger: false }}
          rowKey="apiName"
          dataSource={functionRows}
          rowClassName={(row) => (row.apiName === highlight ? 'foundry-row-active' : '')}
          columns={[
            { title: 'apiName', dataIndex: 'apiName', width: 220 },
            { title: '名称', dataIndex: 'displayName', width: 140 },
            { title: '文件 / 符号', dataIndex: 'path' },
          ]}
        />
      </FoundrySection>

      <FoundrySection title="Action 索引" eyebrow="Symbols">
        <Table
          size="small"
          pagination={false}
          rowKey="apiName"
          dataSource={actionRows}
          columns={[
            { title: 'apiName', dataIndex: 'apiName', width: 220 },
            { title: '名称', dataIndex: 'displayName', width: 140 },
            { title: '文件 / 符号', dataIndex: 'path' },
          ]}
        />
      </FoundrySection>

      <FoundrySection title="如何运行" eyebrow="Build">
        <Table
          size="small"
          pagination={false}
          rowKey="name"
          dataSource={runCommands}
          columns={[
            { title: '步骤', dataIndex: 'name', width: 140 },
            {
              title: '命令',
              dataIndex: 'command',
              render: (value: string) => <span className="foundry-mono">{value}</span>,
            },
          ]}
        />
      </FoundrySection>
    </FoundryShell>
  );
}
