/**
 * Sidebar Navigation Configuration
 * 只保留本课要学的 Foundry 核心入口（29 号文档「先照着做」）。
 */

import {
  ScheduleOutlined,
  ApartmentOutlined,
  DatabaseOutlined,
  CodeOutlined,
  AppstoreOutlined,
  ThunderboltOutlined,
  FileTextOutlined,
  AuditOutlined,
  ReadOutlined,
} from '@ant-design/icons';

export interface NavChild {
  id: string;
  label: string;
  path: string;
  count?: number;
}

export interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path: string;
  description: string;
  section?: 'main' | 'workflow' | 'admin';
  children?: NavChild[];
}

export const sidebarNavConfig: NavItem[] = [
  {
    id: 'course',
    label: '课程',
    icon: <ReadOutlined />,
    path: '/course',
    description: '从明早那一页倒推类型',
    section: 'main',
    children: [
      { id: 'course-steps', label: '七步', path: '/course' },
    ],
  },
  {
    id: 'carbon',
    label: 'Carbon',
    icon: <AppstoreOutlined />,
    path: '/carbon',
    description: '操作者工作区',
    section: 'main',
    children: [
      { id: 'workspaces', label: 'Workspaces', path: '/carbon' },
    ],
  },
  {
    id: 'workshop',
    label: 'Workshop',
    icon: <ScheduleOutlined />,
    path: '/workshop',
    description: '交易员模块',
    section: 'main',
    children: [
      { id: 'pre-open', label: '开盘前安排', path: '/workshop/pre-open' },
      { id: 'builder', label: 'Workshop Builder', path: '/workshop/builder' },
    ],
  },
  {
    id: 'automate',
    label: 'Automate',
    icon: <ThunderboltOutlined />,
    path: '/automate',
    description: '条件与通知',
    section: 'main',
    children: [
      { id: 'rules', label: 'Automations', path: '/automate' },
    ],
  },
  {
    id: 'notepad',
    label: 'Notepad',
    icon: <FileTextOutlined />,
    path: '/notepad',
    description: '文档模板',
    section: 'main',
    children: [
      { id: 'templates', label: 'Templates', path: '/notepad' },
    ],
  },
  {
    id: 'approvals',
    label: 'Approvals',
    icon: <AuditOutlined />,
    path: '/approvals',
    description: '类型变更提案',
    section: 'main',
    children: [
      { id: 'inbox', label: 'Inbox', path: '/approvals' },
    ],
  },
  {
    id: 'ontology',
    label: 'Ontology',
    icon: <ApartmentOutlined />,
    path: '/ontology',
    description: '本体定义与对象',
    section: 'main',
    children: [
      { id: 'object-explorer', label: 'Object Explorer', path: '/ontology' },
      { id: 'ontology-manager', label: 'Ontology Manager', path: '/ontology/manager' },
      { id: 'object-view', label: 'Object View', path: '/ontology/object-view' },
      { id: 'quiver', label: 'Quiver', path: '/ontology/quiver' },
      { id: 'vertex', label: 'Vertex', path: '/ontology/vertex' },
      { id: 'evaluation', label: 'Evaluation', path: '/ontology/evaluation' },
    ],
  },
  {
    id: 'data',
    label: 'Data',
    icon: <DatabaseOutlined />,
    path: '/data',
    description: '数据源与管道',
    section: 'main',
    children: [
      { id: 'connection', label: 'Data Connection', path: '/data/connection' },
      { id: 'dataset-preview', label: 'Dataset Preview', path: '/data/dataset-preview' },
      { id: 'contour', label: 'Contour', path: '/data/contour' },
      { id: 'pipelines', label: 'Pipeline Builder', path: '/data/pipelines' },
      { id: 'lineage', label: 'Data Lineage', path: '/data/lineage' },
      { id: 'health', label: 'Data Health', path: '/data/health' },
    ],
  },
  {
    id: 'code',
    label: 'Code',
    icon: <CodeOutlined />,
    path: '/code',
    description: 'Function 与管道代码',
    section: 'main',
    children: [
      { id: 'repositories', label: 'Code Repositories', path: '/code/repositories' },
    ],
  },
];

export const getNavItemById = (id: string): NavItem | undefined => {
  return sidebarNavConfig.find(item => item.id === id);
};

export const getNavChildById = (parentId: string, childId: string): NavChild | undefined => {
  const parent = getNavItemById(parentId);
  return parent?.children?.find(child => child.id === childId);
};
