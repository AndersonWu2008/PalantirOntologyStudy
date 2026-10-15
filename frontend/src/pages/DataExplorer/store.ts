/**
 * Data Explorer 状态管理
 * 使用 Zustand 管理数据浏览器的状态
 * 连接真实 API 服务
 */

import { create } from 'zustand';
import {
  ViewMode,
  NavigatorItem,
  FilterCondition,
  SortConfig,
  PaginationConfig,
  GraphData,
} from './types';
import { buildStockNavigatorItems } from './stockFallback';
import { ensureRuntimeSchema } from './runtimeSchema';

/** Data Explorer 状态接口 */
interface DataExplorerState {
  // 导航状态
  navigatorItems: NavigatorItem[];
  selectedItem: NavigatorItem | null;
  expandedKeys: string[];
  searchQuery: string;

  // 视图状态
  currentView: ViewMode;
  activeTab: string;

  // 筛选排序状态
  filters: FilterCondition[];
  sortConfig: SortConfig | null;
  pagination: PaginationConfig;

  // 详情面板状态
  detailPanelVisible: boolean;
  selectedInstance: any | null;

  // 图谱状态
  graphData: GraphData | null;
  selectedNodeId: string | null;

  // 加载状态
  isLoading: boolean;
  isDetailLoading: boolean;

  // 错误状态
  error: string | null;

  // Actions
  setNavigatorItems: (items: NavigatorItem[]) => void;
  selectItem: (item: NavigatorItem | null) => void;
  toggleExpanded: (key: string) => void;
  setSearchQuery: (query: string) => void;
  setCurrentView: (view: ViewMode) => void;
  setActiveTab: (tab: string) => void;
  setFilters: (filters: FilterCondition[]) => void;
  setSortConfig: (config: SortConfig | null) => void;
  setPagination: (pagination: Partial<PaginationConfig>) => void;
  toggleDetailPanel: () => void;
  setDetailPanelVisible: (visible: boolean) => void;
  selectInstance: (instance: any | null) => void;
  setGraphData: (data: GraphData | null) => void;
  selectNode: (nodeId: string | null) => void;
  setLoading: (loading: boolean) => void;
  setDetailLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // 异步 Actions
  fetchNavigatorItems: () => Promise<void>;
  fetchItemDetail: (itemId: string) => Promise<void>;
  fetchInstances: (typeId: string) => Promise<void>;
  fetchGraphData: (centerNodeId: string, depth?: number) => Promise<void>;
}

/** 创建 Data Explorer Store */
export const useDataExplorerStore = create<DataExplorerState>((set, get) => ({
  // 初始状态
  navigatorItems: [],
  selectedItem: null,
  expandedKeys: ['object_type_group', 'link_type_group', 'function_group', 'action_type_group'],
  searchQuery: '',

  currentView: 'table',
  activeTab: 'overview',

  filters: [],
  sortConfig: null,
  pagination: {
    page: 1,
    pageSize: 25,
    total: 0,
  },

  detailPanelVisible: false,
  selectedInstance: null,

  graphData: null,
  selectedNodeId: null,

  isLoading: false,
  isDetailLoading: false,
  error: null,

  // Actions
  setNavigatorItems: (items) => set({ navigatorItems: items }),

  selectItem: (item) => {
    set({
      selectedItem: item,
      activeTab: 'properties',
      selectedInstance: null,
      detailPanelVisible: false,
    });
  },

  toggleExpanded: (key) => {
    const { expandedKeys } = get();
    const newExpandedKeys = expandedKeys.includes(key)
      ? expandedKeys.filter((k) => k !== key)
      : [...expandedKeys, key];
    set({ expandedKeys: newExpandedKeys });
  },

  setSearchQuery: (query) => set({ searchQuery: query }),

  setCurrentView: (view) => set({ currentView: view }),

  setActiveTab: (tab) => set({ activeTab: tab }),

  setFilters: (filters) => set({ filters, pagination: { ...get().pagination, page: 1 } }),

  setSortConfig: (config) => set({ sortConfig: config }),

  setPagination: (pagination) =>
    set({
      pagination: { ...get().pagination, ...pagination },
    }),

  toggleDetailPanel: () => set((state) => ({ detailPanelVisible: !state.detailPanelVisible })),

  setDetailPanelVisible: (visible) => set({ detailPanelVisible: visible }),

  selectInstance: (instance) => {
    set({
      selectedInstance: instance,
      detailPanelVisible: instance !== null,
    });
  },

  setGraphData: (data) => set({ graphData: data }),

  selectNode: (nodeId) => set({ selectedNodeId: nodeId }),

  setLoading: (loading) => set({ isLoading: loading }),

  setDetailLoading: (loading) => set({ isDetailLoading: loading }),

  setError: (error) => set({ error }),

  // 异步 Actions
  fetchNavigatorItems: async () => {
    // Guard: prevent duplicate concurrent calls
    const state = get();
    if (state.isLoading) return; // Already fetching
    if (state.navigatorItems.length > 0) return; // Already have data

    set({ isLoading: true, error: null });
    try {
      await ensureRuntimeSchema();
      set({
        navigatorItems: buildStockNavigatorItems(),
        expandedKeys: ['object_type_group', 'link_type_group', 'function_group', 'action_type_group'],
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '读不到库里的资源定义',
        navigatorItems: [],
      });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchItemDetail: async () => {
    set({ isDetailLoading: false });
  },

  fetchInstances: async () => {
    set({ error: null });
  },

  fetchGraphData: async () => {
    set({ graphData: null, isLoading: false });
  },
}));
