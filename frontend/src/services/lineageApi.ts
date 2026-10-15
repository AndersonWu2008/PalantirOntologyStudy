/**
 * Lineage Service API
 * 连接后端 Lineage Service 服务 (8023)
 */

import { api } from './api';

export interface LineageNode {
  id: string;
  node_type: string;
  node_name: string;
  workspace_id: string;
  entity_type?: string;
  entity_id?: string;
  properties?: Record<string, any>;
}

export interface LineageEdge {
  id: string;
  source_node_id: string;
  target_node_id: string;
  edge_type: string;
  transform_type?: string;
  transform_config?: Record<string, any>;
}

export interface LineageStats {
  node_count: number;
  edge_count: number;
  node_types: Record<string, number>;
}

// 节点 CRUD
export const lineageApi = {
  // 获取所有节点
  getNodes: (params: { workspace_id: string; node_type?: string; limit?: number; offset?: number }) =>
    api.get<{ nodes: LineageNode[]; limit: number; offset: number }>('/lineage/nodes', { params }),

  // 获取单个节点
  getNode: (nodeName: string, workspaceId: string) =>
    api.get<LineageNode>(`/lineage/nodes/${nodeName}`, { params: { workspace_id: workspaceId } }),

  // 创建节点
  createNode: (data: {
    node_type: string;
    node_name: string;
    workspace_id: string;
    entity_type?: string;
    entity_id?: string;
    properties?: Record<string, any>;
  }) =>
    api.post<LineageNode>('/lineage/nodes', data),

  // 边 CRUD
  createEdge: (data: {
    source_node_id: string;
    target_node_id: string;
    edge_type?: string;
    transform_type?: string;
    transform_config?: Record<string, any>;
  }) =>
    api.post<LineageEdge>('/lineage/edges', data),

  // 上游血缘
  getUpstream: (nodeName: string, workspaceId: string, depth?: number) =>
    api.get<{ node_name: string; upstream: LineageNode[]; count: number }>(
      `/lineage/upstream/${nodeName}`,
      { params: { workspace_id: workspaceId, depth } }
    ),

  // 下游血缘
  getDownstream: (nodeName: string, workspaceId: string, depth?: number) =>
    api.get<{ node_name: string; downstream: LineageNode[]; count: number }>(
      `/lineage/downstream/${nodeName}`,
      { params: { workspace_id: workspaceId, depth } }
    ),

  // 完整血缘图
  getFullLineage: (nodeName: string, workspaceId: string, depth?: number) =>
    api.get<{
      node_name: string;
      upstream: LineageNode[];
      downstream: LineageNode[];
      upstream_count: number;
      downstream_count: number;
    }>(`/lineage/full/${nodeName}`, { params: { workspace_id: workspaceId, depth } }),

  // SQL 解析
  parseSql: (sql: string, workspaceId: string) =>
    api.post<{ source_tables: string[]; output_fields: string[]; workspace_id: string }>(
      '/lineage/parse/sql',
      { sql, workspace_id: workspaceId }
    ),

  // ETL 构建
  buildFromEtl: (data: {
    source_nodes: { id?: string; type: string; name: string }[];
    target_node: { id?: string; type: string; name: string };
    transform_config: Record<string, any>;
    workspace_id: string;
  }) =>
    api.post<{ target_node: LineageNode; source_nodes: LineageNode[]; edges: LineageEdge[] }>(
      '/lineage/build/etl',
      data
    ),

  // 统计
  getStats: (workspaceId: string) =>
    api.get<LineageStats>('/lineage/stats', { params: { workspace_id: workspaceId } }),

  // 导出
  export: (workspaceId: string) =>
    api.get<{ workspace_id: string; nodes: LineageNode[]; edges: LineageEdge[] }>(
      '/lineage/export',
      { params: { workspace_id: workspaceId } }
    ),
};
