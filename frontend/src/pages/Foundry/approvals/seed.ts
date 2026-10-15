/** Approvals seed — domains register ontology-change requests here. */

export type TaskStatus = 'review' | 'approved' | 'rejected' | 'invoked';
export type RequestStatus = 'open' | 'changesRequested' | 'approved' | 'rejected' | 'invoked';

export type ResourceType = 'ObjectType' | 'Property' | 'ActionType' | 'Function' | 'LinkType';

export type ApprovalTask = {
  id: string;
  kind: 'ontologyProposal';
  resourceType: ResourceType;
  resourceId: string;
  title: string;
  summary: string;
  diff: { before?: string; after?: string };
  omaPath: string;
  status: TaskStatus;
};

export type ApprovalRequest = {
  id: string;
  displayName: string;
  domain?: string;
  description: string;
  requester: string;
  reviewers: string[];
  createdAt: string;
  tasks: ApprovalTask[];
  status: RequestStatus;
};

/** Canonical seed (immutable). Runtime status overlays live in localStorage. */
export const seedRequests: ApprovalRequest[] = [
  {
    id: 'req-buyline-outcome-doc',
    displayName: 'Clarify BuyLine.outcome documentation',
    domain: 'StockTrading',
    description:
      'Builders proposed clearer copy for BuyLine.outcome so Workshop operators distinguish 「可写入委托」 from 「今天不买…」 outcomes. Formula unchanged (doc 13).',
    requester: 'builder.ada',
    reviewers: ['oma.owner'],
    createdAt: '2026-05-26T10:00:00+08:00',
    status: 'open',
    tasks: [
      {
        id: 'task-buyline-outcome',
        kind: 'ontologyProposal',
        resourceType: 'Property',
        resourceId: 'BuyLine.outcome',
        title: 'Update property description',
        summary: 'Document open-pipeline outcomes without changing write channel or enum values.',
        diff: {
          before: '开盘后这一行现在怎样',
          after:
            '开盘后这一行现在怎样（可写入委托 / 今天不买开盘涨停 / 今天不买这个限价买不进 / 已过点…）。由 Function 写入；ConfirmBuys 只读 outcome。',
        },
        omaPath: '/ontology/manager?type=BuyLine',
        status: 'review',
      },
    ],
  },
  {
    id: 'req-confirmbuys-criteria',
    displayName: 'ConfirmBuys submission criteria note',
    domain: 'StockTrading',
    description:
      'Surface the clock + header submission criteria on the Action Type page so Approvals reviewers see why Workshop buttons stay disabled.',
    requester: 'builder.ada',
    reviewers: ['oma.owner', 'workshop.lead'],
    createdAt: '2026-05-27T11:30:00+08:00',
    status: 'open',
    tasks: [
      {
        id: 'task-confirmbuys-criteria',
        kind: 'ontologyProposal',
        resourceType: 'ActionType',
        resourceId: 'ConfirmBuys',
        title: 'Document submission criteria',
        summary: '9:25–9:30 · header「还没写下委托」· no blocking stop-loss sells. Does not auto-submit.',
        diff: {
          before: '（缺省：见 actions.ts）',
          after:
            'Submission criteria: clock in [09:25, 09:30) Asia/Shanghai; arrangement.header === 还没写下委托; no unwritten 止损/制度离场 sells. Effect writes BuyOrder content only.',
        },
        omaPath: '/ontology/manager?type=BuyOrder',
        status: 'review',
      },
    ],
  },
  {
    id: 'req-strategy-protect',
    displayName: 'Protect Strategy object type',
    domain: 'StockTrading',
    description:
      'Mark Strategy as a protected ontology resource so playbook edits require an ontology proposal instead of direct OMA edits.',
    requester: 'governance.lee',
    reviewers: ['oma.owner'],
    createdAt: '2026-05-28T09:00:00+08:00',
    status: 'open',
    tasks: [
      {
        id: 'task-strategy-protect',
        kind: 'ontologyProposal',
        resourceType: 'ObjectType',
        resourceId: 'Strategy',
        title: 'Set protection flag',
        summary: 'Protected resource → future edits open an Approvals request (this course: status only).',
        diff: {
          before: 'protection: none',
          after: 'protection: require ontology proposal (Approvals)',
        },
        omaPath: '/ontology/manager?type=Strategy',
        status: 'review',
      },
    ],
  },
];

export function getSeedRequest(id: string | null | undefined): ApprovalRequest {
  return seedRequests.find((item) => item.id === id) ?? seedRequests[0];
}

export function deriveRequestStatus(tasks: ApprovalTask[]): RequestStatus {
  if (tasks.some((task) => task.status === 'rejected')) return 'rejected';
  if (tasks.every((task) => task.status === 'invoked')) return 'invoked';
  if (tasks.every((task) => task.status === 'approved' || task.status === 'invoked')) return 'approved';
  if (tasks.some((task) => task.status === 'approved') && tasks.some((task) => task.status === 'review')) {
    return 'changesRequested';
  }
  return 'open';
}
