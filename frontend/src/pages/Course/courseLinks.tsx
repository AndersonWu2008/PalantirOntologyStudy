import React from 'react';
import { Link } from 'react-router-dom';
import { derivationChapters } from './courseDerivation';

export type CourseTarget =
  | { kind: 'type'; type: string }
  | { kind: 'chapter'; id: string }
  | { kind: 'verbs'; apiName?: string }
  | { kind: 'edge'; apiName: string };

type Phrase = { text: string; target: CourseTarget };

const typeName = (text: string, type: string): Phrase => ({ text, target: { kind: 'type', type } });
const verbs = (text: string, apiName?: string): Phrase => ({ text, target: { kind: 'verbs', apiName } });
const edge = (text: string): Phrase => ({ text, target: { kind: 'edge', apiName: text } });

const phrases: Phrase[] = [
  verbs('确认今天没有要送的', 'AcknowledgeNothingToSend'),
  typeName('开盘安排', 'PreOpenArrangement'),
  typeName('PreOpenArrangement', 'PreOpenArrangement'),
  typeName('卖出委托', 'SellOrder'),
  typeName('买入委托', 'BuyOrder'),
  typeName('可买范围', 'TradableRange'),
  typeName('TradableRange', 'TradableRange'),
  typeName('交易策略', 'Strategy'),
  typeName('卖出行', 'SellLine'),
  typeName('买入行', 'BuyLine'),
  typeName('日行情', 'DailyBar'),
  typeName('交易日', 'TradingDay'),
  typeName('SellOrder', 'SellOrder'),
  typeName('BuyOrder', 'BuyOrder'),
  typeName('DailyBar', 'DailyBar'),
  typeName('TradingDay', 'TradingDay'),
  typeName('SellLine', 'SellLine'),
  typeName('BuyLine', 'BuyLine'),
  typeName('Position', 'Position'),
  typeName('Strategy', 'Strategy'),
  typeName('Industry', 'Industry'),
  typeName('Account', 'Account'),
  typeName('Signal', 'Signal'),
  verbs('推迟卖出', 'PostponeSellLine'),
  verbs('否决买入', 'VetoBuyLine'),
  verbs('停止今天', 'StopArrangement'),
  verbs('确认卖出', 'ConfirmSells'),
  verbs('确认买入', 'ConfirmBuys'),
  verbs('成交回报', 'ReportFill'),
  verbs('detectRegime', 'detectRegime'),
  verbs('computeLimitPrices', 'computeLimitPrices'),
  verbs('computeMarketBreadth', 'computeMarketBreadth'),
  verbs('judgeEntryGate', 'judgeEntryGate'),
  verbs('syncDailyBars', 'syncDailyBars'),
  verbs('recordFill', 'recordFill'),
  verbs('ReportFill', 'ReportFill'),
  edge('positionForStock'),
  edge('enabledStrategy'),
  edge('forTradingDay'),
  edge('usesStrategy'),
  edge('excludesStock'),
  edge('usesUniverse'),
  edge('fromSellLine'),
  edge('fromBuyLine'),
  edge('supersedes'),
  edge('forAccount'),
  edge('inAccount'),
  typeName('持仓', 'Position'),
  typeName('账户', 'Account'),
  typeName('股票', 'Stock'),
  typeName('信号', 'Signal'),
  typeName('行业', 'Industry'),
  typeName('做法', 'Strategy'),
  typeName('回马枪', 'Strategy'),
  typeName('一次回测', 'EvaluationRun'),
  typeName('这次回测', 'EvaluationRun'),
  typeName('权益上的一个点', 'EvaluationPoint'),
  typeName('里面的一笔', 'EvaluationTrade'),
  typeName('Stock', 'Stock'),
  typeName('Fill', 'Fill'),
];

const pages = [
  { text: '2026-10-13 那一页', href: '/workshop/pre-open' },
  { text: '明早那一页', href: '/workshop/pre-open' },
  { text: '明早这页', href: '/workshop/pre-open' },
  { text: '评估页', href: '/ontology/evaluation' },
];

const readyAt: Record<string, number> = {
  开盘安排: 5,
  PreOpenArrangement: 5,
  forAccount: 5,
  forTradingDay: 5,
  usesStrategy: 5,
  supersedes: 5,
  账户: 6,
  Account: 6,
  enabledStrategy: 6,
  交易日: 7,
  TradingDay: 7,
  detectRegime: 7,
  computeMarketBreadth: 7,
  judgeEntryGate: 7,
  做法: 8,
  回马枪: 8,
  交易策略: 8,
  Strategy: 8,
  excludesStock: 8,
  usesUniverse: 8,
  持仓: 9,
  Position: 9,
  inAccount: 9,
  positionForStock: 9,
  股票: 10,
  Stock: 10,
  卖出行: 12,
  买入行: 12,
  SellLine: 12,
  BuyLine: 12,
  卖出委托: 13,
  买入委托: 13,
  SellOrder: 13,
  BuyOrder: 13,
  fromSellLine: 13,
  fromBuyLine: 13,
  确认卖出: 13,
  确认买入: 13,
  推迟卖出: 13,
  否决买入: 13,
  停止今天: 13,
  确认今天没有要送的: 13,
  日行情: 14,
  DailyBar: 14,
  computeLimitPrices: 14,
  syncDailyBars: 14,
  成交: 15,
  Fill: 15,
  成交回报: 15,
  ReportFill: 15,
  recordFill: 15,
  信号: 16,
  Signal: 16,
  行业: 17,
  Industry: 17,
  可买范围: 17,
  TradableRange: 17,
  一次回测: 24,
  这次回测: 24,
  '权益上的一个点': 24,
  '里面的一笔': 24,
};

const chapterId = new Map(derivationChapters.map((item) => [item.number, item.id]));

function escapeReg(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const byText = new Map<string, CourseTarget>();
for (const item of [...phrases].sort((a, b) => b.text.length - a.text.length)) {
  if (!byText.has(item.text)) byText.set(item.text, item.target);
}
const pageByText = new Map(pages.map((item) => [item.text, item.href]));
const alternation = [...pages.map((item) => item.text), ...byText.keys()]
  .sort((a, b) => b.length - a.length)
  .map(escapeReg)
  .join('|');
const pattern = new RegExp(`${alternation}|成交(?!价|量|额|回)|第\\s*(\\d+)\\s*章`, 'g');

type Piece =
  | { kind: 'text'; text: string }
  | { kind: 'page'; text: string; href: string }
  | { kind: 'target'; text: string; target: CourseTarget };

function splitCourseText(text: string, chapterNumber: number): Piece[] {
  const pieces: Piece[] = [];
  let cursor = 0;
  for (const match of text.matchAll(pattern)) {
    const start = match.index ?? 0;
    if (start < cursor) continue;
    if (start > cursor) pieces.push({ kind: 'text', text: text.slice(cursor, start) });
    const raw = match[0];
    const mentioned = match[1];
    const tooEarly = (name: string) => (readyAt[name] ?? 1) > chapterNumber;
    if (mentioned) {
      const number = Number(mentioned);
      const id = chapterId.get(number);
      if (id && number <= chapterNumber) pieces.push({ kind: 'target', text: raw, target: { kind: 'chapter', id } });
      else pieces.push({ kind: 'text', text: raw });
    } else if (raw === '成交') {
      if (tooEarly('成交')) pieces.push({ kind: 'text', text: raw });
      else pieces.push({ kind: 'target', text: raw, target: { kind: 'type', type: 'Fill' } });
    } else if (pageByText.has(raw)) {
      pieces.push({ kind: 'page', text: raw, href: pageByText.get(raw)! });
    } else if (tooEarly(raw)) {
      pieces.push({ kind: 'text', text: raw });
    } else {
      const target = byText.get(raw);
      if (target) pieces.push({ kind: 'target', text: raw, target });
      else pieces.push({ kind: 'text', text: raw });
    }
    cursor = start + raw.length;
  }
  if (cursor < text.length) pieces.push({ kind: 'text', text: text.slice(cursor) });
  return pieces;
}

export function LinkedText({
  text,
  chapterNumber,
  onOpen,
}: {
  text: string;
  chapterNumber: number;
  onOpen: (target: CourseTarget) => void;
}) {
  return (
    <>
      {splitCourseText(text, chapterNumber).map((piece, index) => {
        if (piece.kind === 'text') return <React.Fragment key={index}>{piece.text}</React.Fragment>;
        if (piece.kind === 'page') {
          return (
            <Link key={index} className="course-inline" to={piece.href}>
              {piece.text}
            </Link>
          );
        }
        return (
          <button key={index} type="button" className="course-inline" onClick={() => onOpen(piece.target)}>
            {piece.text}
          </button>
        );
      })}
    </>
  );
}
