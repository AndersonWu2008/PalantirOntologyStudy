/**
 * Workflows Types
 * 工作流模块类型定义
 */

import type { Edge, Node } from '@xyflow/react';

/** 触发器 */
export interface Trigger {
  id: string;
  name: string;
  triggerType: string;
  workflowName: string;
  status: string;
}

/** 任务 */
export interface Task {
  id: string;
  name: string;
  taskType: string;
  status: string;
  createdAt: string;
}

/** 执行记录 */
export interface Execution {
  id: string;
  workflowName: string;
  status: string;
  startedAt: string;
  duration: string;
}

/**
 * React Flow Workflow Types
 * 工作流可视化编辑器类型定义
 */

/** 步骤节点类型 */
export type StepNodeType = 'trigger' | 'action' | 'condition' | 'transform' | 'output';

/** 步骤节点数据 */
export interface StepNodeData extends Record<string, unknown> {
  label: string;
  stepType: StepNodeType;
  description?: string;
  status?: 'idle' | 'running' | 'success' | 'error';
  config?: Record<string, unknown>;
  icon?: React.ReactNode;
}

/** 边数据 */
export interface FlowEdgeData extends Record<string, unknown> {
  label?: string;
  condition?: 'true' | 'false';
}

/** 工作流边类型 - 完整的 Edge 类型 */
export type FlowEdge = Edge<FlowEdgeData, 'flowEdge'>;

/** 工作流节点类型 - 完整的 Node 类型 */
export type FlowNode = Node<StepNodeData, 'stepNode'>;

/** 工作流图数据 */
export interface WorkflowGraphData {
  nodes: StepNodeData[];
  edges: FlowEdgeData[];
}

/** 节点位置 */
export interface NodePosition {
  x: number;
  y: number;
}
