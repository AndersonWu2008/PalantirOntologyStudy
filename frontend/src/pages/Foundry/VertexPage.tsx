import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Button, Empty, Select, Space, Spin, Typography } from 'antd';
import { Link, useSearchParams } from 'react-router-dom';
import { FoundrySection, FoundryShell } from './FoundryShell';
import {
  getVertexProfile,
  readoutOf,
  vertexProfiles,
  type VertexExpand,
  type VertexStarter,
} from './vertex/profiles';
import './VertexPage.less';

const API = 'http://127.0.0.1:3010';

type Row = Record<string, unknown>;

type GraphNode = {
  key: string;
  objectType: string;
  id: string;
  title: string;
  readout: string;
  raw: Row;
  depth: number;
};

type GraphEdge = {
  key: string;
  from: string;
  to: string;
  linkType: string;
  edgeLabel: string;
};

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`读取失败 ${response.status}`);
  return response.json() as Promise<T>;
}

function nodeKey(objectType: string, id: string): string {
  return `${objectType}::${id}`;
}

function viewable(objectType: string): boolean {
  return objectType === 'PreOpenArrangement' || objectType === 'Position' || objectType === 'Stock';
}

function shortTitle(text: string, max = 14): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

async function fetchHopRows(
  hop: VertexExpand,
  parent: GraphNode,
  domain: string,
): Promise<Row[]> {
  const filterValue = parent.raw[hop.filterValueFromParentKey];
  if (filterValue == null || filterValue === '') return [];
  const query = new URLSearchParams({
    domain,
    [hop.filterParam]: String(filterValue),
  });
  let rows = await getJson<Row[]>(`${API}/${hop.collection}?${query}`);
  if (hop.toObjectType === 'Stock' && rows.length === 0) {
    try {
      rows = [await getJson<Row>(`${API}/${hop.collection}/${encodeURIComponent(String(filterValue))}`)];
    } catch {
      rows = [];
    }
  }
  if (hop.limit != null) {
    rows = [...rows]
      .sort((left, right) => String(right.sessionDate ?? '').localeCompare(String(left.sessionDate ?? '')))
      .slice(0, hop.limit);
  }
  return rows;
}

function mergeHopResult(
  parent: GraphNode,
  hop: VertexExpand,
  rows: Row[],
  nodes: Map<string, GraphNode>,
  edges: Map<string, GraphEdge>,
): void {
  for (const row of rows) {
    const id = String(row[hop.idProperty]);
    const key = nodeKey(hop.toObjectType, id);
    if (!nodes.has(key)) {
      nodes.set(key, {
        key,
        objectType: hop.toObjectType,
        id,
        title: String(row[hop.titleProperty] ?? id),
        readout: readoutOf(row, hop.readoutProperties),
        raw: row,
        depth: parent.depth + 1,
      });
    }
    const edgeKey = `${parent.key}=>${key}|${hop.id}`;
    if (!edges.has(edgeKey)) {
      edges.set(edgeKey, {
        key: edgeKey,
        from: parent.key,
        to: key,
        linkType: hop.linkType,
        edgeLabel: hop.edgeLabel,
      });
    }
  }
}

export default function VertexPage() {
  const [params, setParams] = useSearchParams();
  const profile = getVertexProfile(params.get('profile'));
  const starterType = params.get('type') ?? profile.starters[0].objectType;
  const starter = profile.starters.find((item) => item.objectType === starterType) ?? profile.starters[0];
  const subjectId = params.get('id') ?? starter.suggestedIds?.[0] ?? '';

  const [picker, setPicker] = useState<{ value: string; label: string }[]>([]);
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanding, setExpanding] = useState<string | null>(null);

  const domain = profile.domain ?? 'StockTrading';

  useEffect(() => {
    let cancelled = false;
    const query = new URLSearchParams({ domain, ...(starter.listParams ?? {}) });
    getJson<Row[]>(`${API}/${starter.collection}?${query}`)
      .then((rows) => {
        if (cancelled) return;
        const preferred = (starter.suggestedIds ?? [])
          .map((id) => rows.find((row) => String(row[starter.primaryKey]) === id))
          .filter(Boolean) as Row[];
        const rest = rows
          .filter((row) => !(starter.suggestedIds ?? []).includes(String(row[starter.primaryKey])))
          .slice(0, 40);
        setPicker(
          [...preferred, ...rest].map((row) => ({
            value: String(row[starter.primaryKey]),
            label: `${row[starter.titleKey] ?? row[starter.primaryKey]} · ${row[starter.primaryKey]}`,
          })),
        );
      })
      .catch(() => {
        if (!cancelled) {
          setPicker((starter.suggestedIds ?? []).map((value) => ({ value, label: value })));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [profile.id, starter, domain]);

  const deepExpand = useCallback(
    async (root: GraphNode, maxDepth: number) => {
      const nodeMap = new Map<string, GraphNode>([[root.key, root]]);
      const edgeMap = new Map<string, GraphEdge>();
      let frontier = [root];

      for (let depth = 0; depth < maxDepth; depth += 1) {
        const nextFrontier: GraphNode[] = [];
        const seen = new Set<string>();
        for (const parent of frontier) {
          const hops = profile.expands.filter(
            (hop) => hop.fromObjectType === parent.objectType && hop.auto === true,
          );
          for (const hop of hops) {
            const rows = await fetchHopRows(hop, parent, domain);
            mergeHopResult(parent, hop, rows, nodeMap, edgeMap);
            for (const row of rows) {
              const key = nodeKey(hop.toObjectType, String(row[hop.idProperty]));
              const node = nodeMap.get(key);
              if (node && node.depth === depth + 1 && !seen.has(key)) {
                seen.add(key);
                nextFrontier.push(node);
              }
            }
          }
        }
        frontier = nextFrontier;
        if (frontier.length === 0) break;
      }

      setNodes([...nodeMap.values()]);
      setEdges([...edgeMap.values()]);
    },
    [profile.expands, domain],
  );

  useEffect(() => {
    if (!subjectId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setNodes([]);
    setEdges([]);
    setSelectedKey(null);

    (async () => {
      try {
        const row = await getJson<Row>(`${API}/${starter.collection}/${encodeURIComponent(subjectId)}`);
        if (cancelled) return;
        const root: GraphNode = {
          key: nodeKey(starter.objectType, String(row[starter.primaryKey])),
          objectType: starter.objectType,
          id: String(row[starter.primaryKey]),
          title: String(row[starter.titleKey] ?? row[starter.primaryKey]),
          readout: readoutOf(row, starter.readoutProperties),
          raw: row,
          depth: 0,
        };
        setSelectedKey(root.key);
        const depth = profile.autoExpandDepth ?? 0;
        if (depth > 0) {
          await deepExpand(root, depth);
        } else {
          setNodes([root]);
          setEdges([]);
        }
      } catch (reason) {
        if (!cancelled) setError(reason instanceof Error ? reason.message : '读取起始对象失败');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [profile.id, starter, subjectId, domain, profile.autoExpandDepth, deepExpand]);

  const selected = nodes.find((node) => node.key === selectedKey) ?? null;
  const availableExpands = useMemo(() => {
    if (!selected) return [] as VertexExpand[];
    return profile.expands.filter((hop) => hop.fromObjectType === selected.objectType);
  }, [profile, selected]);

  async function expandOne(hop: VertexExpand) {
    if (!selected) return;
    setExpanding(hop.id);
    setError(null);
    try {
      const rows = await fetchHopRows(hop, selected, domain);
      const nodeMap = new Map(nodes.map((node) => [node.key, node]));
      const edgeMap = new Map(edges.map((edge) => [edge.key, edge]));
      mergeHopResult(selected, hop, rows, nodeMap, edgeMap);
      setNodes([...nodeMap.values()]);
      setEdges([...edgeMap.values()]);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Search Around 失败');
    } finally {
      setExpanding(null);
    }
  }

  async function expandAllFromSelected() {
    if (!selected) return;
    setExpanding('all');
    setError(null);
    try {
      const nodeMap = new Map(nodes.map((node) => [node.key, node]));
      const edgeMap = new Map(edges.map((edge) => [edge.key, edge]));
      for (const hop of availableExpands) {
        const rows = await fetchHopRows(hop, selected, domain);
        mergeHopResult(selected, hop, rows, nodeMap, edgeMap);
      }
      setNodes([...nodeMap.values()]);
      setEdges([...edgeMap.values()]);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Search Around 失败');
    } finally {
      setExpanding(null);
    }
  }

  async function rebuildDeep() {
    const root = nodes.find((node) => node.depth === 0);
    if (!root) return;
    setLoading(true);
    setError(null);
    try {
      await deepExpand(root, profile.autoExpandDepth ?? 3);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '展开失败');
    } finally {
      setLoading(false);
    }
  }

  const layout = useMemo(() => {
    const byDepth = new Map<number, GraphNode[]>();
    for (const node of nodes) {
      const list = byDepth.get(node.depth) ?? [];
      list.push(node);
      byDepth.set(node.depth, list);
    }
    const width = Math.max(960, [...byDepth.values()].reduce((max, list) => Math.max(max, list.length), 0) * 160);
    const rowH = 100;
    const depths = [...byDepth.keys()].sort((a, b) => a - b);
    const height = Math.max(280, depths.length * rowH + 48);
    const positions = new Map<string, { x: number; y: number }>();
    for (const depth of depths) {
      const list = byDepth.get(depth) ?? [];
      list.forEach((node, index) => {
        const x = ((index + 1) / (list.length + 1)) * (width - 48) + 24;
        const y = 40 + depth * rowH;
        positions.set(node.key, { x, y });
      });
    }
    return { width, height, positions };
  }, [nodes]);

  function setProfile(id: string) {
    const next = getVertexProfile(id);
    const first = next.starters[0];
    setParams({
      profile: next.id,
      type: first.objectType,
      id: first.suggestedIds?.[0] ?? '',
    });
  }

  const workshopDate =
    selected?.objectType === 'PreOpenArrangement' && selected.raw.sessionDate
      ? String(selected.raw.sessionDate)
      : null;

  return (
    <FoundryShell
      app="Vertex"
      title="沿 Link 探索对象关系"
      lead="打开主语后一键铺开多跳链接；节点显示关键属性，边标注 Link。域差异在 Graph Profile。"
      actions={[
        {
          label: 'Object View',
          to: selected && viewable(selected.objectType)
            ? `/ontology/object-view?type=${selected.objectType}&id=${encodeURIComponent(selected.id)}`
            : '/ontology/object-view',
          primary: true,
        },
        { label: 'Data Lineage', to: '/data/lineage' },
        { label: 'Quiver', to: '/ontology/quiver' },
      ]}
    >
      <FoundrySection title="Graph" eyebrow="Profile">
        <Space wrap>
          <Select
            style={{ minWidth: 300 }}
            value={profile.id}
            options={vertexProfiles.map((item) => ({ value: item.id, label: item.displayName }))}
            onChange={setProfile}
          />
          <Select
            style={{ minWidth: 200 }}
            value={starter.objectType}
            options={profile.starters.map((item) => ({ value: item.objectType, label: item.objectType }))}
            onChange={(value: string) => {
              const next = profile.starters.find((item) => item.objectType === value) as VertexStarter;
              setParams({
                profile: profile.id,
                type: value,
                id: next.suggestedIds?.[0] ?? '',
              });
            }}
          />
          <Select
            style={{ minWidth: 360 }}
            showSearch
            optionFilterProp="label"
            value={subjectId || undefined}
            options={picker}
            onChange={(value: string) =>
              setParams({ profile: profile.id, type: starter.objectType, id: value })
            }
          />
          <Button
            type="primary"
            className="ds-btn--blue"
            onClick={() => void rebuildDeep()}
            disabled={nodes.length === 0 || loading}
          >
            一键展开 {profile.autoExpandDepth ?? 3} 跳
          </Button>
          <Typography.Text type="secondary">
            {nodes.length} nodes · {edges.length} edges
          </Typography.Text>
        </Space>
      </FoundrySection>

      {error ? <Alert type="error" showIcon message={error} style={{ marginBottom: 12 }} /> : null}
      {loading ? <Spin /> : null}

      <div className="vertex-layout">
        <FoundrySection title="Canvas" eyebrow="Nodes">
          {nodes.length === 0 && !loading ? <Empty description="选择起始对象" /> : null}
          {nodes.length > 0 ? (
            <div className="vertex-canvas-wrap">
              <svg
                className="vertex-canvas"
                viewBox={`0 0 ${layout.width} ${layout.height}`}
                width="100%"
                role="img"
                aria-label="vertex graph"
              >
                <defs>
                  <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                    <path d="M0,0 L6,3 L0,6 Z" fill="rgba(100,116,139,0.8)" />
                  </marker>
                </defs>
                {edges.map((edge) => {
                  const from = layout.positions.get(edge.from);
                  const to = layout.positions.get(edge.to);
                  if (!from || !to) return null;
                  const mx = (from.x + to.x) / 2;
                  const my = (from.y + to.y) / 2;
                  return (
                    <g key={edge.key}>
                      <line
                        x1={from.x}
                        y1={from.y + 28}
                        x2={to.x}
                        y2={to.y - 28}
                        stroke="rgba(100,116,139,0.5)"
                        strokeWidth="1.5"
                        markerEnd="url(#arrow)"
                      />
                      <rect x={mx - 22} y={my - 8} width={44} height={16} rx={4} fill="var(--bg-elevated)" stroke="var(--border-color)" />
                      <text x={mx} y={my + 4} textAnchor="middle" fontSize="10" fill="var(--text-secondary)">
                        {edge.edgeLabel}
                      </text>
                      <title>{edge.linkType}</title>
                    </g>
                  );
                })}
                {nodes.map((node) => {
                  const pos = layout.positions.get(node.key);
                  if (!pos) return null;
                  const active = node.key === selectedKey;
                  return (
                    <g
                      key={node.key}
                      transform={`translate(${pos.x}, ${pos.y})`}
                      style={{ cursor: 'pointer' }}
                      onClick={() => setSelectedKey(node.key)}
                    >
                      <rect
                        x={-78}
                        y={-30}
                        width={156}
                        height={60}
                        rx={8}
                        fill={active ? 'var(--brand-muted)' : 'var(--bg-elevated)'}
                        stroke={active ? 'var(--brand)' : 'var(--border-color)'}
                        strokeWidth={active ? 2 : 1}
                      />
                      <text textAnchor="middle" y={-12} fontSize="10" fill="var(--text-secondary)">
                        {node.objectType}
                      </text>
                      <text textAnchor="middle" y={6} fontSize="12" fontWeight={600} fill="var(--text-primary)">
                        {shortTitle(node.title, 16)}
                      </text>
                      <text textAnchor="middle" y={22} fontSize="9" fill="var(--text-muted)">
                        {shortTitle(node.readout || node.id, 22)}
                      </text>
                      <title>{`${node.objectType}\n${node.id}\n${node.readout}`}</title>
                    </g>
                  );
                })}
              </svg>
            </div>
          ) : null}
        </FoundrySection>

        <FoundrySection title="Selection" eyebrow="Actions">
          {!selected ? (
            <Empty description="先点画布上的节点" />
          ) : (
            <>
              <Typography.Paragraph style={{ marginBottom: 8 }}>
                <span className="foundry-mono">{selected.objectType}</span>
                <br />
                <Typography.Text strong>{selected.title}</Typography.Text>
                <br />
                <Typography.Text type="secondary" className="foundry-mono" style={{ fontSize: 12 }}>
                  {selected.id}
                </Typography.Text>
                {selected.readout ? (
                  <>
                    <br />
                    <Typography.Text type="secondary">{selected.readout}</Typography.Text>
                  </>
                ) : null}
              </Typography.Paragraph>

              <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
                Search Around
              </Typography.Text>
              <Space direction="vertical" style={{ width: '100%' }} size="small">
                {availableExpands.length > 0 ? (
                  <Button
                    block
                    type="primary"
                    loading={expanding === 'all'}
                    onClick={() => void expandAllFromSelected()}
                  >
                    展开这一节点全部链接
                  </Button>
                ) : null}
                {availableExpands.map((hop) => (
                  <Button
                    key={hop.id}
                    block
                    className="ds-btn--soft-blue"
                    loading={expanding === hop.id}
                    onClick={() => void expandOne(hop)}
                  >
                    {hop.edgeLabel} → {hop.toObjectType}
                  </Button>
                ))}
                {availableExpands.length === 0 ? (
                  <Typography.Text type="secondary">本 Profile 未配置下一跳。</Typography.Text>
                ) : null}
              </Space>

              <Typography.Text type="secondary" style={{ display: 'block', margin: '16px 0 8px' }}>
                Open in
              </Typography.Text>
              <Space direction="vertical" style={{ width: '100%' }} size="small">
                {viewable(selected.objectType) ? (
                  <Link to={`/ontology/object-view?type=${selected.objectType}&id=${encodeURIComponent(selected.id)}`}>
                    <Button block>Object View</Button>
                  </Link>
                ) : null}
                {selected.objectType === 'Stock' ? (
                  <Link to={`/ontology/quiver?profile=StockTrading.stockDaily&id=${encodeURIComponent(selected.id)}`}>
                    <Button block>Quiver</Button>
                  </Link>
                ) : null}
                {workshopDate ? (
                  <Link to={`/workshop/pre-open?date=${encodeURIComponent(workshopDate)}`}>
                    <Button block>Workshop · {workshopDate}</Button>
                  </Link>
                ) : null}
              </Space>
            </>
          )}
        </FoundrySection>
      </div>
    </FoundryShell>
  );
}
