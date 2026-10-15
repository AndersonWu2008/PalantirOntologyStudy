/**
 * Graph Engine API
 * 连接后端 Graph Engine 服务 (8022)
 */

import { api } from './api';

export interface GraphNode {
  id: number;
  uuid: string;
  node_type: string;
  label: string;
  properties?: Record<string, any>;
  metadata?: Record<string, any>;
  status?: string;
  created_at?: string;
}

export interface GraphEdge {
  id: number;
  uuid: string;
  edge_type: string;
  label?: string;
  source_node_id: number;
  target_node_id: number;
  properties?: Record<string, any>;
  weight?: number;
  direction?: 'outgoing' | 'incoming';
}

export interface GraphStats {
  node_count: number;
  edge_count: number;
  node_types: Record<string, number>;
  edge_types: Record<string, number>;
  density: number;
}

// 节点 CRUD
export const graphApi = {
  // 获取所有节点
  getNodes: (params?: { node_type?: string; label?: string; limit?: number; offset?: number }) =>
    api.get<{ content: GraphNode[]; limit: number; offset: number }>('/graph/nodes', { params }),

  // 获取单个节点
  getNode: (nodeId: number) =>
    api.get<GraphNode>(`/graph/nodes/${nodeId}`),

  // 创建节点
  createNode: (data: { node_type: string; label: string; properties?: Record<string, any> }) =>
    api.post<GraphNode>('/graph/nodes', data),

  // 更新节点
  updateNode: (nodeId: number, data: { label?: string; properties?: Record<string, any> }) =>
    api.patch<GraphNode>(`/graph/nodes/${nodeId}`, data),

  // 删除节点
  deleteNode: (nodeId: number) =>
    api.delete<{ success: boolean }>(`/graph/nodes/${nodeId}`),

  // 边 CRUD
  getEdges: (params?: { edge_type?: string; source_node_id?: number; target_node_id?: number; limit?: number }) =>
    api.get<{ content: GraphEdge[] }>('/graph/edges', { params }),

  createEdge: (data: {
    source_node_id: number;
    target_node_id: number;
    edge_type: string;
    label?: string;
    properties?: Record<string, any>;
    weight?: number;
  }) =>
    api.post<GraphEdge>('/graph/edges', data),

  deleteEdge: (edgeId: number) =>
    api.delete<{ success: boolean }>(`/graph/edges/${edgeId}`),

  // 获取节点的所有边
  getNodeEdges: (nodeId: number, direction?: 'outgoing' | 'incoming' | 'both') =>
    api.get<GraphEdge[]>(`/graph/nodes/${nodeId}/edges`, { params: { direction } }),

  // 统计
  getStats: () =>
    api.get<GraphStats>('/graph/stats'),

  // 图算法
  getShortestPath: (sourceNodeId: number, targetNodeId: number) =>
    api.get<{ path: number[]; length: number }>(`/graph/algorithms/shortest-path`, {
      params: { source: sourceNodeId, target: targetNodeId }
    }),

  getConnectedComponents: () =>
    api.get<{ components: number[][] }>('/graph/algorithms/connected-components'),

  getPageRank: () =>
    api.get<{ results: { node: GraphNode; score: number }[] }>('/graph/algorithms/page-rank'),
};
