import React, { useState } from 'react';
import { Descriptions, Typography } from 'antd';
import { FoundrySection, FoundryShell } from './FoundryShell';
import './PipelineBuilderPage.less';

type Node = {
  id: string;
  title: string;
  kind: 'input' | 'transform' | 'output';
  script: string;
  writes: string;
  when: string;
  sample: string;
};

const nodes: Node[] = [
  {
    id: 'sync',
    title: '同步源行情',
    kind: 'input',
    script: 'pipeline/sync-pool.ts',
    writes: 'Stock、TradableRange、Industry、TradingDay 日历、DailyBar 源属性',
    when: '手工 / 开发时跑',
    sample: 'POST /daily-bars/batch pass=source；列映射见 Dataset Preview',
  },
  {
    id: 'previous',
    title: '补前收',
    kind: 'transform',
    script: 'database-api · POST /daily-bars/previous-close',
    writes: 'DailyBar.previousClose（已有值不覆盖）',
    when: '源同步之后',
    sample: '用上一交易日 close 填今天 previousClose',
  },
  {
    id: 'factors',
    title: '灌入因子',
    kind: 'transform',
    script: 'pipeline/backfill-factors.ts',
    writes: 'ma20、atr14、比较数、涨停次数、resolvedIndustry、regime…',
    when: '有涨跌幅的行；缺则跳过派生',
    sample: '调用 computeBarFeatures / computeComparisonScore / detectRegime…',
  },
  {
    id: 'close',
    title: '收盘管道',
    kind: 'transform',
    script: 'pipeline/close-pipeline.ts · runClosePipeline',
    writes: '开仓门、Signal、SellLine/BuyLine、PreOpenArrangement',
    when: '收盘后、下一交易日前',
    sample: 'judgeEntryGate → selectV44Buys → judgeV44Exits → assemblePreOpenPage',
  },
  {
    id: 'open',
    title: '开盘管道',
    kind: 'transform',
    script: 'pipeline/close-pipeline.ts · runOpenPipeline',
    writes: 'limitUp/limitDown、行 outcome、页首',
    when: '开盘前 / 开盘后核对',
    sample: 'computeLimitPrices → sellLineOutcome / buyLineOutcome → pageHeader',
  },
  {
    id: 'fill',
    title: '成交管道',
    kind: 'output',
    script: 'pipeline/actions.ts · ReportFill → recordFill',
    writes: 'Fill；Position 入场字段或股数',
    when: '交易员回报成交之后',
    sample: 'Action 写入 Fill，再调 recordFill Function',
  },
];

export default function PipelineBuilderPage() {
  const [selectedId, setSelectedId] = useState(nodes[0].id);
  const selected = nodes.find((node) => node.id === selectedId) ?? nodes[0];

  return (
    <FoundryShell
      app="Pipeline Builder"
      title="管道只编排顺序"
      lead="公式在 Function 里，只有一处。管道到点调用 Function，或把源表映射进源属性。点节点看脚本与写入种类。"
      actions={[
        { label: 'Data Lineage', to: '/data/lineage', primary: true },
        { label: 'Code Repositories', to: '/code/repositories' },
        { label: 'Dataset Preview', to: '/data/dataset-preview' },
      ]}
    >
      <FoundrySection title="管道图" eyebrow="Graph">
        <div className="pipeline-graph">
          {nodes.map((node, index) => (
            <React.Fragment key={node.id}>
              <button
                type="button"
                className={`pipeline-node pipeline-node--${node.kind}${node.id === selectedId ? ' is-active' : ''}`}
                onClick={() => setSelectedId(node.id)}
              >
                <span className="pipeline-node__kind">{node.kind}</span>
                <span className="pipeline-node__title">{node.title}</span>
              </button>
              {index < nodes.length - 1 ? <span className="pipeline-arrow" aria-hidden>→</span> : null}
            </React.Fragment>
          ))}
        </div>
      </FoundrySection>

      <FoundrySection title={selected.title} eyebrow="Node">
        <Descriptions column={1} size="small" bordered>
          <Descriptions.Item label="脚本">{selected.script}</Descriptions.Item>
          <Descriptions.Item label="写入">{selected.writes}</Descriptions.Item>
          <Descriptions.Item label="何时跑">{selected.when}</Descriptions.Item>
          <Descriptions.Item label="样例 / 说明">{selected.sample}</Descriptions.Item>
        </Descriptions>
        <Typography.Paragraph type="secondary" style={{ marginTop: 12 }}>
          构建与调度在本课用本地脚本；界面不假装在线调度器。
        </Typography.Paragraph>
      </FoundrySection>
    </FoundryShell>
  );
}
