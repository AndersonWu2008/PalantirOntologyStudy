import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Select, Space, Spin, Table, Tag, Typography } from 'antd';
import { Link, useSearchParams } from 'react-router-dom';
import { FoundrySection, FoundryShell } from './FoundryShell';
import {
  fillText,
  getNotepadTemplate,
  notepadTemplates,
  type NotepadBlock,
  type NotepadTemplate,
} from './notepad/templates';
import './NotepadPage.less';

const API = 'http://127.0.0.1:3010';

type Row = Record<string, unknown>;

type LiveContext = {
  arrangement: Row;
  sellLines: Row[];
  buyLines: Row[];
  positions: Row[];
  vars: Record<string, string>;
};

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`读取失败 ${response.status}`);
  return response.json() as Promise<T>;
}

function isCurrent(rows: Row[], row: Row): boolean {
  const superseded = new Set(
    rows.map((item) => item.supersedesArrangementId).filter((id) => id != null && id !== '').map(String),
  );
  return (
    !superseded.has(String(row.arrangementId))
    && !rows.some((other) => other.supersedesArrangementId === row.arrangementId)
  );
}

function pickArrangement(
  rows: Row[],
  opts: { date?: string | null; prefix?: string },
): Row | undefined {
  const current = rows.filter((row) => isCurrent(rows, row));
  const byDate = [...current].sort((left, right) =>
    String(right.sessionDate).localeCompare(String(left.sessionDate)),
  );
  if (opts.date) {
    return byDate.find((row) => String(row.sessionDate) === opts.date) ?? byDate[0];
  }
  if (opts.prefix) {
    const preferred = byDate.find((row) => String(row.sessionDate).startsWith(opts.prefix!));
    if (preferred) return preferred;
  }
  return byDate[0];
}

function pickFields(row: Row, fields: string[]): { key: string; value: string }[] {
  return fields.map((key) => ({
    key,
    value: row[key] == null || row[key] === '' ? '—' : String(row[key]),
  }));
}

function BlockView({ block, live }: { block: NotepadBlock; live: LiveContext }) {
  if (block.kind === 'heading') {
    const text = fillText(block.text ?? '', live.vars);
    return block.level === 3 ? (
      <Typography.Title level={4}>{text}</Typography.Title>
    ) : (
      <Typography.Title level={3}>{text}</Typography.Title>
    );
  }

  if (block.kind === 'paragraph') {
    return <Typography.Paragraph>{fillText(block.text ?? '', live.vars)}</Typography.Paragraph>;
  }

  if (block.kind === 'link') {
    const to = fillText(block.hrefTemplate ?? '/', live.vars);
    return (
      <p className="notepad-link">
        <Link to={to}>
          <Button type="link">{block.label ?? to}</Button>
        </Link>
      </p>
    );
  }

  if (block.kind === 'objectField' && block.object === 'arrangement') {
    const fields = pickFields(live.arrangement, block.fields ?? []);
    return (
      <div className="notepad-field-block">
        {block.label ? <div className="notepad-field-block__label">{block.label}</div> : null}
        <dl className="notepad-dl">
          {fields.map((item) => (
            <React.Fragment key={item.key}>
              <dt>{item.key}</dt>
              <dd>
                {item.key === 'header' ? <Typography.Text strong>{item.value}</Typography.Text> : item.value}
              </dd>
            </React.Fragment>
          ))}
        </dl>
      </div>
    );
  }

  if (block.kind === 'objectTable') {
    let rows: Row[] = [];
    if (block.object === 'sellLines') rows = live.sellLines;
    if (block.object === 'buyLines') rows = live.buyLines;
    if (block.object === 'positions') rows = live.positions;
    const fields = block.fields ?? [];
    return (
      <div className="notepad-table-block">
        {block.label ? <div className="notepad-field-block__label">{block.label}</div> : null}
        {rows.length === 0 ? (
          <Typography.Text type="secondary">（空）</Typography.Text>
        ) : (
          <Table
            size="small"
            pagination={false}
            rowKey={(row, index) => String(row.buyLineId ?? row.sellLineId ?? row.positionId ?? index)}
            dataSource={rows}
            columns={fields.map((field) => ({
              title: field,
              dataIndex: field,
              render: (value: unknown) => (value == null || value === '' ? '—' : String(value)),
            }))}
          />
        )}
      </div>
    );
  }

  return null;
}

export default function NotepadPage() {
  const [params, setParams] = useSearchParams();
  const template = getNotepadTemplate(params.get('template'));
  const dateParam = params.get('date');
  const [dateOptions, setDateOptions] = useState<string[]>([]);
  const [live, setLive] = useState<LiveContext | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const accountId = template.context.accountId;
    const domain = template.domain ?? 'StockTrading';
    (async () => {
      try {
        const [arrangements, positions] = await Promise.all([
          getJson<Row[]>(`${API}/arrangements?domain=${encodeURIComponent(domain)}&accountId=${encodeURIComponent(accountId)}`),
          getJson<Row[]>(`${API}/positions?domain=${encodeURIComponent(domain)}&accountId=${encodeURIComponent(accountId)}`),
        ]);
        if (cancelled) return;
        const dates = [...new Set(arrangements.map((row) => String(row.sessionDate)))].sort().reverse();
        setDateOptions(dates);
        const page = pickArrangement(arrangements, {
          date: dateParam,
          prefix: template.context.sessionDatePrefix,
        });
        if (!page) {
          setLive(null);
          return;
        }
        if (!dateParam && page.sessionDate) {
          setParams(
            (prev) => {
              const next = new URLSearchParams(prev);
              next.set('template', template.id);
              next.set('date', String(page.sessionDate));
              return next;
            },
            { replace: true },
          );
        }
        const arrangementId = String(page.arrangementId);
        const [sellLines, buyLines] = await Promise.all([
          getJson<Row[]>(`${API}/sell-lines?domain=${encodeURIComponent(domain)}&arrangementId=${encodeURIComponent(arrangementId)}`),
          getJson<Row[]>(`${API}/buy-lines?domain=${encodeURIComponent(domain)}&arrangementId=${encodeURIComponent(arrangementId)}`),
        ]);
        if (cancelled) return;
        setLive({
          arrangement: page,
          sellLines,
          buyLines,
          positions: positions.filter((row) => Number(row.quantity) > 0),
          vars: {
            accountId,
            arrangementId,
            date: String(page.sessionDate ?? ''),
            header: String(page.header ?? ''),
          },
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
  }, [template, dateParam, setParams]);

  const workshopHref = useMemo(() => {
    if (!live) return '/workshop/pre-open';
    return `/workshop/pre-open?date=${encodeURIComponent(live.vars.date)}`;
  }, [live]);

  function selectTemplate(next: NotepadTemplate) {
    setParams((prev) => {
      const nextParams = new URLSearchParams(prev);
      nextParams.set('template', next.id);
      return nextParams;
    });
  }

  function selectDate(date: string) {
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('template', template.id);
      next.set('date', date);
      return next;
    });
  }

  return (
    <FoundryShell
      app="Notepad"
      title={template.displayName}
      lead={template.lead}
      actions={[
        { label: 'Workshop', to: workshopHref, primary: true },
        { label: 'Carbon', to: '/carbon' },
        { label: 'Automate', to: '/automate' },
      ]}
    >
      <FoundrySection title="Template" eyebrow="Notepad">
        <Space wrap>
          <Select
            style={{ minWidth: 320 }}
            value={template.id}
            options={notepadTemplates.map((item) => ({
              value: item.id,
              label: `${item.displayName} · ${item.audience}`,
            }))}
            onChange={(value: string) => selectTemplate(getNotepadTemplate(value))}
          />
          <Select
            style={{ minWidth: 160 }}
            placeholder="sessionDate"
            value={dateParam ?? live?.vars.date}
            options={dateOptions.map((date) => ({ value: date, label: date }))}
            onChange={selectDate}
          />
          {template.domain ? <Tag>{template.domain}</Tag> : null}
          <Typography.Text type="secondary">{template.audience}</Typography.Text>
        </Space>
      </FoundrySection>

      {error ? <Alert type="error" showIcon message={error} style={{ marginBottom: 12 }} /> : null}
      {loading ? <Spin /> : null}

      {!loading && !live ? (
        <Alert type="info" showIcon message="无当前未作废安排，无法渲染模板。" />
      ) : null}

      {live ? (
        <FoundrySection title="Document" eyebrow="Rendered">
          <article className="notepad-doc">
            {template.blocks.map((block) => (
              <BlockView key={block.id} block={block} live={live} />
            ))}
          </article>
        </FoundrySection>
      ) : null}

      <FoundrySection title="How this stays generic" eyebrow="Platform">
        <p>
          Template <span className="foundry-mono">{template.id}</span> 只是 Block 清单 + 上下文绑定。
          换域注册新 Template；壳不写死早报文案以外的交易逻辑。
        </p>
      </FoundrySection>
    </FoundryShell>
  );
}
