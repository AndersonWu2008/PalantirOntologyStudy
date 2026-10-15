import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import './playbookPicture.less';

const FUNCTION_HREF =
  '/ontology/manager?section=function&type=computeHuimaqiangFactors&kind=function';

const HUIMAQIANG_HERE: Record<string, string[]> = {
  computeHuimaqiangFactors: ['涨停过', '回落一截'],
  computeHuimaqiangScore: ['量缩了', '够 5 只才打分'],
  selectHuimaqiangBuys: ['门开才买'],
  judgeHuimaqiangExits: ['卖出'],
};

type PictureNode = {
  name: string;
  line: string;
  more?: string;
};

function finite(value: unknown): number | null {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function whole(value: unknown): string | null {
  const n = finite(value);
  return n == null ? null : String(n);
}

function percent(value: unknown): string | null {
  const n = finite(value);
  if (n == null) return null;
  const shown = Math.round(n * 1000) / 10;
  return `${shown}%`;
}

function yuan(value: unknown): string | null {
  const n = whole(value);
  return n == null ? null : `${n} 元`;
}

function on(value: unknown): boolean | null {
  if (value === true || value === 1 || value === '1' || value === 'true') return true;
  if (value === false || value === 0 || value === '0' || value === 'false') return false;
  return null;
}

function missing(): string {
  return '这一套上有数空着，缺了就不许算。';
}

function sleeveLine(row: Record<string, unknown>, prefix: 'bull' | 'highVol' | 'sideways'): string {
  const activate = percent(row[`${prefix}TrailingActivate`]);
  const trail = percent(row[`${prefix}TrailingStop`]);
  const days = whole(row[`${prefix}MaxHoldDays`]);
  const positions = whole(row[`${prefix}MaxPositions`]);
  const share = percent(row[`${prefix}SinglePositionPct`]);
  if (!activate || !trail || !days || !positions || !share) return missing();
  const minScore = finite(row[`${prefix}MinScore`]);
  const rank = minScore != null && minScore > 0 ? `，名次低于 ${minScore} 不买` : '';
  return `赚到 ${activate} 才跟踪，回落 ${trail} 就卖，最多拿 ${days} 天、${positions} 只、单只 ${share}${rank}。`;
}

function bearLine(row: Record<string, unknown>): string {
  const positions = finite(row.bearMaxPositions);
  if (positions == null) return missing();
  if (positions === 0) return '最多 0 只，所以不新开。';
  return `最多 ${positions} 只。`;
}

function priceLine(row: Record<string, unknown>): string {
  const low = yuan(row.priceMin);
  const high = yuan(row.priceMax);
  if (!low || !high) return missing();
  return `${low}到${high}。`;
}

function gateLine(row: Record<string, unknown>): string {
  const days = whole(row.regimeMinPersistDays);
  if (!days) return missing();
  if (on(row.exitOnRegimeFlip) === true) {
    return `牛市或高波动要连续至少 ${days} 天，离开就离场。`;
  }
  return `牛市或高波动要连续至少 ${days} 天。`;
}

function packLine(row: Record<string, unknown>): string {
  const pack = row.packId == null || row.packId === '' ? '' : String(row.packId);
  if (!pack) return '这一版还没写下用哪一套计算包。';
  if (pack === 'v46Huimaqiang') return '挑股票按涨停回马枪这一套，点过去看 Function。';
  return `挑股票的话在 ${pack}。`;
}

export function playbookNodes(row: Record<string, unknown>): PictureNode[] {
  return [
    { name: '这一版', line: '这是写下那页时的那一版。', more: '改一处是新的一版。' },
    { name: '牛市', line: sleeveLine(row, 'bull') },
    { name: '高波动', line: sleeveLine(row, 'highVol') },
    { name: '震荡', line: sleeveLine(row, 'sideways') },
    { name: '熊市', line: bearLine(row) },
    { name: '价带', line: priceLine(row) },
    { name: '门', line: gateLine(row) },
    { name: '计算包', line: packLine(row) },
  ];
}

const FLOW: PictureNode[] = [
  { name: '涨停过', line: '近 20 日至少 1 次，近 60 日不超过 5 次。' },
  { name: '回落一截', line: '离 20 日高点在跌 12% 到涨 0.5%。' },
  { name: '量缩了', line: '回落和缩量各占一半。' },
  { name: '够 5 只才打分', line: '少了就不硬排第一。' },
  { name: '门开才买', line: '门和止盈读这一版对象上的数，不写在这个函数里。' },
];

const SELL: PictureNode = {
  name: '卖出',
  line: '止盈和天数读买进那天那一套。',
};

function NodeButton({
  name,
  on,
  here,
  hub,
  onClick,
}: {
  name: string;
  on: boolean;
  here?: boolean;
  hub?: boolean;
  onClick: () => void;
}) {
  const className = [
    hub ? 'playbook__hub' : 'playbook__node',
    on ? 'is-on' : '',
    here ? 'is-here' : '',
  ].filter(Boolean).join(' ');
  return (
    <button type="button" className={className} aria-pressed={on} onClick={onClick}>
      {name}
    </button>
  );
}

function SpokenLine({ node }: { node: PictureNode }) {
  const [more, setMore] = useState(false);
  const packLink = node.name === '计算包' && node.line.includes('Function');
  const [before, after] = packLink ? node.line.split('Function') : [node.line, ''];
  return (
    <div className="playbook__line">
      <p>
        {before}
        {packLink ? <Link to={FUNCTION_HREF}>Function</Link> : null}
        {packLink ? after : null}
      </p>
      {node.more ? (
        more ? (
          <p className="playbook__more-line">{node.more}</p>
        ) : (
          <button type="button" className="playbook__more" onClick={() => setMore(true)}>
            再看一句
          </button>
        )
      ) : null}
    </div>
  );
}

function usePick(resetKey: string) {
  const [name, setName] = useState<string | null>(null);
  useEffect(() => {
    setName(null);
  }, [resetKey]);
  function pick(next: string) {
    setName((current) => (current === next ? null : next));
  }
  return { name, pick };
}

export function StrategyPlaybookMap({ strategy }: { strategy: Record<string, unknown> }) {
  const nodes = playbookNodes(strategy);
  const hub = nodes[0];
  const sleeves = nodes.slice(1, 5);
  const rest = nodes.slice(5);
  const { name, pick } = usePick(String(strategy.strategyId ?? ''));
  const selected = nodes.find((node) => node.name === name) ?? null;

  return (
    <div className="playbook">
      <div className="playbook__ring">
        {sleeves.map((node) => (
          <NodeButton
            key={node.name}
            name={node.name}
            on={name === node.name}
            onClick={() => pick(node.name)}
          />
        ))}
      </div>
      <div className="playbook__hub-row">
        <NodeButton hub name={hub.name} on={name != null} onClick={() => pick(hub.name)} />
      </div>
      <div className="playbook__ring">
        {rest.map((node) => (
          <NodeButton
            key={node.name}
            name={node.name}
            on={name === node.name}
            onClick={() => pick(node.name)}
          />
        ))}
      </div>
      {selected ? <SpokenLine key={selected.name} node={selected} /> : null}
    </div>
  );
}

export function isHuimaqiangFunction(apiName: string): boolean {
  return apiName in HUIMAQIANG_HERE;
}

export function HuimaqiangFlow({ apiName }: { apiName?: string }) {
  const here = new Set(apiName ? HUIMAQIANG_HERE[apiName] ?? [] : []);
  const { name, pick } = usePick(apiName ?? '');
  const selected = [...FLOW, SELL].find((node) => node.name === name) ?? null;

  return (
    <div className="playbook">
      <div className="playbook__flow">
        {FLOW.map((node, index) => (
          <React.Fragment key={node.name}>
            {index > 0 ? <span className="playbook__arrow">→</span> : null}
            <NodeButton
              name={node.name}
              on={name === node.name}
              here={here.has(node.name)}
              onClick={() => pick(node.name)}
            />
          </React.Fragment>
        ))}
      </div>
      <div className="playbook__aside">
        <NodeButton
          name={SELL.name}
          on={name === SELL.name}
          here={here.has(SELL.name)}
          onClick={() => pick(SELL.name)}
        />
      </div>
      {selected ? <SpokenLine key={selected.name} node={selected} /> : null}
    </div>
  );
}
