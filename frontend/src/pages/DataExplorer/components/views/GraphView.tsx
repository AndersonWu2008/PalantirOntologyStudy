/**
 * Graph View Component
 * Displays entity relationships in a graph visualization
 */

import React, { useEffect, useRef, useState } from 'react';
import { Card, Button, Space, Slider, Select, Tooltip, Badge, Typography } from 'antd';
import {
  ZoomInOutlined,
  ZoomOutOutlined,
  FullscreenOutlined,
  ReloadOutlined,
  FilterOutlined,
} from '@ant-design/icons';
import { useDataExplorerStore } from '../../store';
import type { GraphData } from '../../types';
import './GraphView.less';

const { Text } = Typography;
const { Option } = Select;

/** Mock graph data */
const mockGraphData: GraphData = {
  nodes: [
    { id: 'user_1', type: 'user', label: 'John Doe', x: 400, y: 300, properties: {} },
    { id: 'org_1', type: 'organization', label: 'Acme Corp', x: 600, y: 200, properties: {} },
    { id: 'user_2', type: 'user', label: 'Jane Smith', x: 200, y: 200, properties: {} },
    { id: 'user_3', type: 'user', label: 'Bob Wilson', x: 400, y: 100, properties: {} },
    { id: 'project_1', type: 'project', label: 'Project Alpha', x: 600, y: 400, properties: {} },
    { id: 'project_2', type: 'project', label: 'Project Beta', x: 200, y: 400, properties: {} },
    { id: 'dept_1', type: 'department', label: 'Engineering', x: 800, y: 300, properties: {} },
  ],
  edges: [
    { id: 'e1', source: 'user_1', target: 'org_1', type: 'works_in', label: 'works in' },
    { id: 'e2', source: 'user_2', target: 'org_1', type: 'works_in', label: 'works in' },
    { id: 'e3', source: 'user_3', target: 'org_1', type: 'works_in', label: 'works in' },
    { id: 'e4', source: 'user_1', target: 'project_1', type: 'manages', label: 'manages' },
    { id: 'e5', source: 'user_2', target: 'project_2', type: 'manages', label: 'manages' },
    { id: 'e6', source: 'project_1', target: 'dept_1', type: 'belongs_to', label: 'belongs to' },
    { id: 'e7', source: 'user_1', target: 'user_2', type: 'manages', label: 'manages' },
  ],
};

/** Node colors by type */
const nodeColors: Record<string, string> = {
  user: '#1890ff',
  organization: '#52c41a',
  project: '#faad14',
  department: '#722ed1',
};

/** Node icons by type */
const nodeIcons: Record<string, string> = {
  user: '👤',
  organization: '🏢',
  project: '📁',
  department: '🏛️',
};

const GraphView: React.FC = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [zoom, setZoom] = useState(1);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [layout, setLayout] = useState<'force' | 'hierarchical' | 'circular'>('force');

  const { graphData, setGraphData, selectNode } = useDataExplorerStore();

  // Load mock data on mount
  useEffect(() => {
    setGraphData(mockGraphData);
  }, [setGraphData]);

  // Handle zoom in
  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.2, 3));
  };

  // Handle zoom out
  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 0.2, 0.5));
  };

  // Handle node click
  const handleNodeClick = (nodeId: string) => {
    setSelectedNode(nodeId);
    selectNode(nodeId);
  };

  // Handle reset
  const handleReset = () => {
    setZoom(1);
    setSelectedNode(null);
    selectNode(null);
  };

  const data = graphData || mockGraphData;
  const selectedNodeData = data.nodes.find((n) => n.id === selectedNode);

  return (
    <div className="graph-view">
      {/* Toolbar */}
      <div className="graph-toolbar">
        <Space>
          <Text type="secondary">Layout:</Text>
          <Select value={layout} onChange={setLayout} style={{ width: 120 }}>
            <Option value="force">Force</Option>
            <Option value="hierarchical">Hierarchical</Option>
            <Option value="circular">Circular</Option>
          </Select>
          <Button icon={<FilterOutlined />}>Filters</Button>
        </Space>
        <Space>
          <Tooltip title="Zoom Out">
            <Button icon={<ZoomOutOutlined />} onClick={handleZoomOut} />
          </Tooltip>
          <Slider
            min={0.5}
            max={3}
            step={0.1}
            value={zoom}
            onChange={setZoom}
            style={{ width: 100 }}
          />
          <Tooltip title="Zoom In">
            <Button icon={<ZoomInOutlined />} onClick={handleZoomIn} />
          </Tooltip>
          <Tooltip title="Reset">
            <Button icon={<ReloadOutlined />} onClick={handleReset} />
          </Tooltip>
          <Tooltip title="Fullscreen">
            <Button icon={<FullscreenOutlined />} />
          </Tooltip>
        </Space>
      </div>

      {/* Graph Canvas */}
      <div className="graph-canvas">
        <svg
          ref={svgRef}
          width="100%"
          height="100%"
          viewBox="0 0 1000 600"
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: 'center center',
            transition: 'transform 0.2s ease',
          }}
        >
          {/* Edges */}
          <g className="edges">
            {data.edges.map((edge) => {
              const sourceNode = data.nodes.find((n) => n.id === edge.source);
              const targetNode = data.nodes.find((n) => n.id === edge.target);
              if (!sourceNode || !targetNode) return null;
              if (sourceNode.x === undefined || sourceNode.y === undefined) return null;
              if (targetNode.x === undefined || targetNode.y === undefined) return null;

              return (
                <g key={edge.id} className="edge">
                  <line
                    x1={sourceNode.x}
                    y1={sourceNode.y}
                    x2={targetNode.x}
                    y2={targetNode.y}
                    stroke="#d9d9d9"
                    strokeWidth={2}
                    markerEnd="url(#arrowhead)"
                  />
                  <text
                    x={(sourceNode.x + targetNode.x) / 2}
                    y={(sourceNode.y + targetNode.y) / 2 - 5}
                    textAnchor="middle"
                    fill="#666"
                    fontSize="10"
                  >
                    {edge.label}
                  </text>
                </g>
              );
            })}
          </g>

          {/* Arrow marker */}
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="7"
              refX="28"
              refY="3.5"
              orient="auto"
            >
              <polygon points="0 0, 10 3.5, 0 7" fill="#d9d9d9" />
            </marker>
          </defs>

          {/* Nodes */}
          <g className="nodes">
            {data.nodes.map((node) => (
              <g
                key={node.id}
                className={`node ${selectedNode === node.id ? 'selected' : ''}`}
                transform={`translate(${node.x}, ${node.y})`}
                onClick={() => handleNodeClick(node.id)}
                style={{ cursor: 'pointer' }}
              >
                <circle
                  r="24"
                  fill={nodeColors[node.type] || '#999'}
                  stroke={selectedNode === node.id ? '#1890ff' : '#fff'}
                  strokeWidth={selectedNode === node.id ? 3 : 2}
                  filter="drop-shadow(0 2px 4px rgba(0,0,0,0.1))"
                />
                <text
                  textAnchor="middle"
                  dy="5"
                  fontSize="20"
                >
                  {nodeIcons[node.type] || '●'}
                </text>
                <text
                  textAnchor="middle"
                  dy="45"
                  fontSize="12"
                  fill="#333"
                  fontWeight={selectedNode === node.id ? 'bold' : 'normal'}
                >
                  {node.label}
                </text>
                <text
                  textAnchor="middle"
                  dy="60"
                  fontSize="10"
                  fill="#666"
                >
                  {node.type}
                </text>
              </g>
            ))}
          </g>
        </svg>

        {/* Legend */}
        <div className="graph-legend">
          <Card size="small" title="Legend">
            {Object.entries(nodeColors).map(([type, color]) => (
              <div key={type} className="legend-item">
                <span
                  className="legend-color"
                  style={{ backgroundColor: color }}
                />
                <span className="legend-label">
                  {nodeIcons[type]} {type}
                </span>
              </div>
            ))}
          </Card>
        </div>
      </div>

      {/* Node Details Panel */}
      {selectedNodeData && (
        <div className="graph-node-details">
          <Card
            size="small"
            title={
              <Space>
                <span>{nodeIcons[selectedNodeData.type]}</span>
                <span>{selectedNodeData.label}</span>
              </Space>
            }
            extra={
              <Button type="text" size="small" onClick={() => setSelectedNode(null)}>
                ✕
              </Button>
            }
          >
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <Text type="secondary">Type: {selectedNodeData.type}</Text>
              <Text type="secondary">ID: {selectedNodeData.id}</Text>
              <Badge
                count={data.edges.filter((e) => e.source === selectedNodeData.id || e.target === selectedNodeData.id).length}
                style={{ backgroundColor: '#1890ff' }}
              />
              <Text type="secondary">connections</Text>
              <Space style={{ marginTop: 8 }}>
                <Button type="primary" size="small">
                  View Details
                </Button>
                <Button size="small">Expand</Button>
              </Space>
            </Space>
          </Card>
        </div>
      )}
    </div>
  );
};

export default GraphView;
