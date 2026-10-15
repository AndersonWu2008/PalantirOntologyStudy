import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Empty, Select, Space, Spin, Table, Tag, Typography } from 'antd';
import { Link, useSearchParams } from 'react-router-dom';
import { FoundrySection, FoundryShell } from './FoundryShell';
import { getQuiverProfile, quiverProfiles, type QuiverProfile } from './quiver/profiles';
import './QuiverPage.less';

const API = 'http://127.0.0.1:3010';

type Row = Record<string, unknown>;

type EventPoint = {
  time: string;
  label: string;
  value: number | null;
  color: string;
  id: string;
};

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`读取失败 ${response.status}`);
  return response.json() as Promise<T>;
}

function num(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function TimeSeriesChart({
  rows,
  timeKey,
  profile,
  events,
}: {
  rows: Row[];
  timeKey: string;
  profile: QuiverProfile;
  events: EventPoint[];
}) {
  const width = 720;
  const height = 280;
  const pad = { top: 16, right: 48, bottom: 28, left: 48 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const n = rows.length;
  if (n < 2) return <Empty description="时间序列点不够" />;

  const ohlc = profile.series.plots.find((plot) => plot.kind === 'ohlc');
  const primaryLines = profile.series.plots.filter((plot) => plot.kind === 'line' && (plot.axis ?? 'primary') === 'primary');
  const secondaryLines = profile.series.plots.filter((plot) => plot.kind === 'line' && plot.axis === 'secondary');

  const primaryValues: number[] = [];
  for (const row of rows) {
    if (ohlc) {
      for (const key of Object.values(ohlc.properties)) {
        const value = num(row[key]);
        if (value != null) primaryValues.push(value);
      }
    }
    for (const plot of primaryLines) {
      const value = num(row[plot.properties.value]);
      if (value != null) primaryValues.push(value);
    }
    for (const event of events) {
      if (event.value != null) primaryValues.push(event.value);
    }
  }
  if (primaryValues.length === 0) return <Empty description="主轴没有数值" />;

  const pMin = Math.min(...primaryValues);
  const pMax = Math.max(...primaryValues);
  const pSpan = pMax - pMin || 1;

  const secondaryValues = secondaryLines
    .flatMap((plot) => rows.map((row) => num(row[plot.properties.value])))
    .filter((value): value is number => value != null);
  const sMin = secondaryValues.length ? Math.min(...secondaryValues) : 0;
  const sMax = secondaryValues.length ? Math.max(...secondaryValues) : 1;
  const sSpan = sMax - sMin || 1;

  const xAt = (index: number) => pad.left + (index / (n - 1)) * innerW;
  const yPrimary = (value: number) => pad.top + innerH - ((value - pMin) / pSpan) * innerH;
  const ySecondary = (value: number) => pad.top + innerH - ((value - sMin) / sSpan) * innerH;
  const candleW = Math.max(3, Math.min(10, innerW / n - 1));

  const eventByTime = new Map<string, EventPoint[]>();
  for (const event of events) {
    const list = eventByTime.get(event.time) ?? [];
    list.push(event);
    eventByTime.set(event.time, list);
  }

  return (
    <div className="quiver-chart">
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" role="img" aria-label="time series chart">
        {/* grid */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const y = pad.top + innerH * (1 - ratio);
          return (
            <line
              key={ratio}
              x1={pad.left}
              x2={width - pad.right}
              y1={y}
              y2={y}
              stroke="rgba(148,163,184,0.35)"
              strokeWidth="1"
            />
          );
        })}

        {ohlc
          ? rows.map((row, index) => {
              const open = num(row[ohlc.properties.open]);
              const high = num(row[ohlc.properties.high]);
              const low = num(row[ohlc.properties.low]);
              const close = num(row[ohlc.properties.close]);
              if (open == null || high == null || low == null || close == null) return null;
              const x = xAt(index);
              const up = close >= open;
              const color = up ? 'var(--action-green)' : 'var(--action-red)';
              const yHigh = yPrimary(high);
              const yLow = yPrimary(low);
              const yOpen = yPrimary(open);
              const yClose = yPrimary(close);
              const bodyTop = Math.min(yOpen, yClose);
              const bodyH = Math.max(1, Math.abs(yClose - yOpen));
              return (
                <g key={String(row.barId ?? index)}>
                  <line x1={x} x2={x} y1={yHigh} y2={yLow} stroke={color} strokeWidth="1" />
                  <rect
                    x={x - candleW / 2}
                    y={bodyTop}
                    width={candleW}
                    height={bodyH}
                    fill={color}
                    opacity={0.85}
                  />
                </g>
              );
            })
          : null}

        {primaryLines.map((plot) => {
          const points = rows
            .map((row, index) => {
              const value = num(row[plot.properties.value]);
              return value == null ? null : `${xAt(index)},${yPrimary(value)}`;
            })
            .filter(Boolean);
          if (points.length < 2) return null;
          return (
            <polyline
              key={plot.id}
              fill="none"
              stroke={plot.color ?? '#2563eb'}
              strokeWidth="2"
              points={points.join(' ')}
            />
          );
        })}

        {secondaryLines.map((plot) => {
          const points = rows
            .map((row, index) => {
              const value = num(row[plot.properties.value]);
              return value == null ? null : `${xAt(index)},${ySecondary(value)}`;
            })
            .filter(Boolean);
          if (points.length < 2) return null;
          return (
            <polyline
              key={plot.id}
              fill="none"
              stroke={plot.color ?? '#b45309'}
              strokeWidth="1.5"
              strokeDasharray="4 3"
              points={points.join(' ')}
            />
          );
        })}

        {rows.map((row, index) => {
          const time = String(row[timeKey] ?? '');
          const dayEvents = eventByTime.get(time);
          if (!dayEvents?.length) return null;
          return dayEvents.map((event, eventIndex) => {
            const y =
              event.value != null
                ? yPrimary(event.value)
                : pad.top + 12 + eventIndex * 10;
            const x = xAt(index);
            return (
              <g key={`${event.id}-${eventIndex}`}>
                <circle cx={x} cy={y} r={5} fill={event.color} stroke="#fff" strokeWidth="1.5" />
                <title>{`${event.time} · ${event.label}${event.value != null ? ` @ ${event.value}` : ''}`}</title>
              </g>
            );
          });
        })}

        <text x={pad.left} y={12} fontSize="11" fill="#64748b">
          {pMax.toFixed(2)}
        </text>
        <text x={pad.left} y={height - 8} fontSize="11" fill="#64748b">
          {pMin.toFixed(2)}
        </text>
        {secondaryValues.length > 0 ? (
          <>
            <text x={width - pad.right} y={12} fontSize="11" fill="#b45309" textAnchor="end">
              {sMax.toFixed(1)}
            </text>
            <text x={width - pad.right} y={height - 8} fontSize="11" fill="#b45309" textAnchor="end">
              {sMin.toFixed(1)}
            </text>
          </>
        ) : null}
      </svg>
      <div className="quiver-legend">
        {ohlc ? <span><i className="quiver-swatch quiver-swatch--ohlc" /> {ohlc.label}</span> : null}
        {primaryLines.map((plot) => (
          <span key={plot.id}><i className="quiver-swatch" style={{ background: plot.color }} /> {plot.label}</span>
        ))}
        {secondaryLines.map((plot) => (
          <span key={plot.id}><i className="quiver-swatch quiver-swatch--dash" style={{ background: plot.color }} /> {plot.label}（次轴）</span>
        ))}
        {(profile.events ?? []).map((source) => (
          <span key={source.id}><i className="quiver-swatch quiver-swatch--event" /> {source.label}</span>
        ))}
      </div>
    </div>
  );
}

export default function QuiverPage() {
  const [params, setParams] = useSearchParams();
  const profile = getQuiverProfile(params.get('profile'));
  const subjectId = params.get('id') ?? profile.suggestedSubjectIds?.[0] ?? '';

  const [subjects, setSubjects] = useState<{ value: string; label: string }[]>([]);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [events, setEvents] = useState<EventPoint[]>([]);
  const [subjectTitle, setSubjectTitle] = useState(subjectId);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const domain = profile.domain ?? 'StockTrading';
    getJson<Row[]>(`${API}/${profile.subject.collection}?domain=${encodeURIComponent(domain)}`)
      .then((list) => {
        if (cancelled) return;
        const preferred = (profile.suggestedSubjectIds ?? [])
          .map((id) => list.find((row) => String(row[profile.subject.primaryKey]) === id))
          .filter(Boolean) as Row[];
        const rest = list
          .filter((row) => !(profile.suggestedSubjectIds ?? []).includes(String(row[profile.subject.primaryKey])))
          .slice(0, 40);
        setSubjects(
          [...preferred, ...rest].map((row) => ({
            value: String(row[profile.subject.primaryKey]),
            label: `${row[profile.subject.titleKey] ?? row[profile.subject.primaryKey]} · ${row[profile.subject.primaryKey]}`,
          })),
        );
      })
      .catch(() => {
        if (!cancelled) {
          setSubjects((profile.suggestedSubjectIds ?? []).map((value) => ({ value, label: value })));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [profile]);

  useEffect(() => {
    if (!subjectId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setRows(null);
    setEvents([]);

    (async () => {
      try {
        const subject = await getJson<Row>(
          `${API}/${profile.subject.collection}/${encodeURIComponent(subjectId)}`,
        );
        if (cancelled) return;
        setSubjectTitle(String(subject[profile.subject.titleKey] ?? subjectId));

        const domain = profile.domain ?? 'StockTrading';
        const seriesQuery = new URLSearchParams({
          domain,
          [profile.series.filterParam]: subjectId,
        });
        const seriesRows = await getJson<Row[]>(`${API}/${profile.series.collection}?${seriesQuery}`);
        if (cancelled) return;
        const timeKey = profile.series.timeProperty;
        let sorted = [...seriesRows].sort((left, right) =>
          String(left[timeKey]).localeCompare(String(right[timeKey])),
        );
        if (profile.timeWindow?.from || profile.timeWindow?.to) {
          sorted = sorted.filter((row) => {
            const time = String(row[timeKey]);
            if (profile.timeWindow?.from && time < profile.timeWindow.from) return false;
            if (profile.timeWindow?.to && time > profile.timeWindow.to) return false;
            return true;
          });
        }
        if (sorted.length === 0) {
          sorted = [...seriesRows]
            .sort((left, right) => String(left[timeKey]).localeCompare(String(right[timeKey])))
            .slice(-60);
        }
        setRows(sorted);

        const nextEvents: EventPoint[] = [];
        for (const source of profile.events ?? []) {
          const eventQuery = new URLSearchParams({
            domain,
            [source.filterParam]: subjectId,
          });
          const eventRows = await getJson<Row[]>(`${API}/${source.collection}?${eventQuery}`);
          for (const row of eventRows) {
            const label = String(row[source.labelProperty] ?? source.label);
            const color =
              source.colorBy?.map[String(row[source.colorBy.property])]
              ?? '#334155';
            nextEvents.push({
              id: String(row.fillId ?? `${source.id}|${row[source.timeProperty]}|${label}`),
              time: String(row[source.timeProperty]),
              label,
              value: source.valueProperty ? num(row[source.valueProperty]) : null,
              color,
            });
          }
        }
        if (!cancelled) setEvents(nextEvents);
      } catch (reason) {
        if (!cancelled) setError(reason instanceof Error ? reason.message : '分析加载失败');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [profile, subjectId]);

  const tableRows = useMemo(() => {
    if (!rows) return [];
    const timeKey = profile.series.timeProperty;
    return [...rows].reverse().map((row) => {
      const time = String(row[timeKey]);
      const dayEvents = events.filter((event) => event.time === time);
      return { ...row, __events: dayEvents };
    });
  }, [rows, events, profile]);

  function setProfile(id: string) {
    const next = getQuiverProfile(id);
    setParams({
      profile: next.id,
      id: next.suggestedSubjectIds?.[0] ?? subjectId,
    });
  }

  return (
    <FoundryShell
      app="Quiver"
      title="Ontology 时间序列分析"
      lead="通用分析页：主语对象 + 序列属性 + 事件标记。域差异写在 Analysis Profile 里，不写进壳。"
      actions={[
        {
          label: 'Object View',
          to: `/ontology/object-view?type=${profile.subject.objectType}&id=${encodeURIComponent(subjectId)}`,
          primary: true,
        },
        {
          label: 'Object Explorer',
          to: `/ontology?focus=${profile.series.objectType}&${profile.series.filterParam}=${encodeURIComponent(subjectId)}`,
        },
      ]}
    >
      <FoundrySection title="Analysis" eyebrow="Profile">
        <Space wrap>
          <Select
            style={{ minWidth: 280 }}
            value={profile.id}
            options={quiverProfiles.map((item) => ({
              value: item.id,
              label: item.displayName,
            }))}
            onChange={setProfile}
          />
          <Select
            style={{ minWidth: 300 }}
            showSearch
            optionFilterProp="label"
            value={subjectId || undefined}
            options={subjects}
            placeholder={`${profile.subject.objectType}…`}
            onChange={(value: string) => setParams({ profile: profile.id, id: value })}
          />
          <Typography.Text type="secondary">
            {profile.subject.objectType} · {subjectTitle}
            {profile.domain ? ` · ${profile.domain}` : ''}
          </Typography.Text>
        </Space>
      </FoundrySection>

      <FoundrySection title="Time series chart" eyebrow="Card">
        {error ? <Alert type="error" showIcon message={error} /> : null}
        {loading ? <Spin /> : null}
        {!loading && rows ? (
          <>
            <Typography.Text type="secondary">
              {profile.series.objectType} · {rows.length} points
              {events.length ? ` · ${events.length} events` : ''}
            </Typography.Text>
            <TimeSeriesChart
              rows={rows}
              timeKey={profile.series.timeProperty}
              profile={profile}
              events={events}
            />
          </>
        ) : null}
      </FoundrySection>

      <FoundrySection title="Table" eyebrow="Card">
        {!rows ? null : (
          <Table
            size="small"
            pagination={{ pageSize: 12, showSizeChanger: false }}
            rowKey={(row) => String(row.barId ?? row[profile.series.timeProperty])}
            dataSource={tableRows}
            columns={[
              { title: profile.series.timeProperty, dataIndex: profile.series.timeProperty, width: 120 },
              { title: 'open', dataIndex: 'open', width: 88, render: (value: unknown) => value ?? '—' },
              { title: 'high', dataIndex: 'high', width: 88, render: (value: unknown) => value ?? '—' },
              { title: 'low', dataIndex: 'low', width: 88, render: (value: unknown) => value ?? '—' },
              { title: 'close', dataIndex: 'close', width: 88, render: (value: unknown) => value ?? '—' },
              {
                title: 'ma20',
                dataIndex: 'ma20',
                width: 88,
                render: (value: unknown) => (value == null ? '—' : Number(value).toFixed(3)),
              },
              {
                title: 'comparisonScore',
                dataIndex: 'comparisonScore',
                width: 120,
                render: (value: unknown) => (value == null ? '—' : Number(value).toFixed(2)),
              },
              {
                title: 'events',
                key: 'events',
                render: (_: unknown, row: Row & { __events?: EventPoint[] }) =>
                  (row.__events ?? []).map((event) => (
                    <Tag
                      key={`${event.id}-${event.label}`}
                      className={
                        event.label === '卖出'
                          ? 'ds-capsule ds-capsule--danger'
                          : 'ds-capsule ds-capsule--success'
                      }
                      color={event.label === '卖出' ? 'red' : 'green'}
                    >
                      {event.label}
                      {event.value != null ? ` ${event.value}` : ''}
                    </Tag>
                  )),
              },
            ]}
          />
        )}
      </FoundrySection>

      <FoundrySection title="How this stays generic" eyebrow="Platform">
        <p>
          Profile <span className="foundry-mono">{profile.id}</span> maps subject → series → plots → events.
          StockTrading is one registration. Open{' '}
          <Link to="/ontology/object-view?type=Stock&id=002077.SZ">002077.SZ</Link> then Quiver to see buy/sell markers on OHLC.
        </p>
      </FoundrySection>
    </FoundryShell>
  );
}
