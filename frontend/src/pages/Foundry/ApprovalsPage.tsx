import React, { useMemo, useState } from 'react';
import { Alert, Button, Select, Space, Table, Tag, Typography } from 'antd';
import { Link, useSearchParams } from 'react-router-dom';
import { FoundrySection, FoundryShell } from './FoundryShell';
import {
  deriveRequestStatus,
  getSeedRequest,
  seedRequests,
  type ApprovalRequest,
  type ApprovalTask,
  type RequestStatus,
  type TaskStatus,
} from './approvals/seed';
import './ApprovalsPage.less';

const STORAGE_KEY = 'foundry.approvals.overlays';

type Overlay = {
  requestStatus?: RequestStatus;
  tasks: Record<string, TaskStatus>;
};

type OverlayMap = Record<string, Overlay>;

function loadOverlays(): OverlayMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as OverlayMap;
  } catch {
    return {};
  }
}

function saveOverlays(map: OverlayMap) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

function applyOverlay(seed: ApprovalRequest, overlay?: Overlay): ApprovalRequest {
  const tasks = seed.tasks.map((task) => ({
    ...task,
    status: overlay?.tasks[task.id] ?? task.status,
  }));
  return {
    ...seed,
    tasks,
    status: overlay?.requestStatus ?? deriveRequestStatus(tasks),
  };
}

function statusTag(status: RequestStatus | TaskStatus) {
  if (status === 'approved' || status === 'invoked') {
    return <Tag className="ds-capsule ds-capsule--success" color="success">{status}</Tag>;
  }
  if (status === 'rejected') {
    return <Tag className="ds-capsule ds-capsule--danger" color="error">{status}</Tag>;
  }
  if (status === 'changesRequested' || status === 'review') {
    return <Tag className="ds-capsule ds-capsule--warning" color="warning">{status}</Tag>;
  }
  return <Tag className="ds-capsule">{status}</Tag>;
}

export default function ApprovalsPage() {
  const [params, setParams] = useSearchParams();
  const [overlays, setOverlays] = useState<OverlayMap>(() => loadOverlays());

  const inbox = useMemo(
    () => seedRequests.map((seed) => applyOverlay(seed, overlays[seed.id])),
    [overlays],
  );

  const selected = applyOverlay(getSeedRequest(params.get('id')), overlays[params.get('id') ?? '']);

  function selectRequest(id: string) {
    setParams({ id });
  }

  function patchTask(requestId: string, taskId: string, status: TaskStatus) {
    setOverlays((prev) => {
      const current = prev[requestId] ?? { tasks: {} };
      const tasks = { ...current.tasks, [taskId]: status };
      const seed = getSeedRequest(requestId);
      const merged = seed.tasks.map((task) => ({
        ...task,
        status: tasks[task.id] ?? task.status,
      }));
      const next: OverlayMap = {
        ...prev,
        [requestId]: {
          tasks,
          requestStatus: deriveRequestStatus(merged),
        },
      };
      saveOverlays(next);
      return next;
    });
  }

  function invokeRequest(request: ApprovalRequest) {
    if (request.tasks.some((task) => task.status !== 'approved' && task.status !== 'invoked')) {
      return;
    }
    setOverlays((prev) => {
      const tasks: Record<string, TaskStatus> = {};
      for (const task of request.tasks) tasks[task.id] = 'invoked';
      const next: OverlayMap = {
        ...prev,
        [request.id]: { tasks, requestStatus: 'invoked' },
      };
      saveOverlays(next);
      return next;
    });
  }

  function resetAll() {
    localStorage.removeItem(STORAGE_KEY);
    setOverlays({});
  }

  const canInvoke =
    selected.tasks.every((task) => task.status === 'approved' || task.status === 'invoked')
    && selected.status !== 'invoked'
    && selected.status !== 'rejected';

  return (
    <FoundryShell
      app="Approvals"
      title="Inbox"
      lead="Request → Task review → Invoke. 本课只批 Ontology 类型提案，不批 Confirm* / ReportFill。"
      actions={[
        { label: 'Ontology Manager', to: '/ontology/manager', primary: true },
        { label: 'Carbon builder desk', to: '/carbon?workspace=StockTrading.builderDesk' },
      ]}
    >
      <Alert
        type="warning"
        showIcon
        style={{ marginBottom: 16 }}
        message="Hard rule"
        description="Approvals 管类型与治理提案。交易委托仍只在 Workshop 由人提交 Action；Invoke 本课只记状态，不改仓库里的类型文件。"
      />

      <FoundrySection title="Inbox" eyebrow="Requests">
        <Space style={{ marginBottom: 8 }}>
          <Button size="small" onClick={resetAll}>
            Reset local approvals
          </Button>
          <Typography.Text type="secondary">{inbox.length} seeded requests</Typography.Text>
        </Space>
        <Table
          size="small"
          pagination={false}
          rowKey="id"
          dataSource={inbox}
          rowClassName={(row) => (row.id === selected.id ? 'foundry-row-active' : '')}
          onRow={(row) => ({
            onClick: () => selectRequest(row.id),
            style: { cursor: 'pointer' },
          })}
          columns={[
            {
              title: 'Status',
              dataIndex: 'status',
              width: 140,
              render: (value: RequestStatus) => statusTag(value),
            },
            { title: 'Request', dataIndex: 'displayName' },
            {
              title: 'Domain',
              dataIndex: 'domain',
              width: 120,
              render: (value: string) => (value ? <Tag>{value}</Tag> : '—'),
            },
            { title: 'Requester', dataIndex: 'requester', width: 120 },
            {
              title: 'Tasks',
              key: 'tasks',
              width: 72,
              render: (_: unknown, row: ApprovalRequest) => row.tasks.length,
            },
            {
              title: 'Created',
              dataIndex: 'createdAt',
              width: 160,
              render: (value: string) => (
                <span className="foundry-mono">{value.replace('T', ' ').slice(0, 16)}</span>
              ),
            },
          ]}
        />
      </FoundrySection>

      <FoundrySection title="Request" eyebrow="Detail">
        <Space wrap style={{ marginBottom: 8 }}>
          <Select
            style={{ minWidth: 360 }}
            value={selected.id}
            options={inbox.map((item) => ({
              value: item.id,
              label: `${item.displayName} · ${item.status}`,
            }))}
            onChange={selectRequest}
          />
          {statusTag(selected.status)}
          {selected.domain ? <Tag>{selected.domain}</Tag> : null}
          <Button type="primary" className="ds-btn--blue" disabled={!canInvoke} onClick={() => invokeRequest(selected)}>
            Invoke request
          </Button>
        </Space>
        <Typography.Paragraph>{selected.description}</Typography.Paragraph>
        <Typography.Text type="secondary">
          Reviewers: {selected.reviewers.join(', ')} · requester {selected.requester}
        </Typography.Text>
      </FoundrySection>

      <FoundrySection title="Tasks" eyebrow="Ontology proposals">
        <div className="approvals-tasks">
          {selected.tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onApprove={() => patchTask(selected.id, task.id, 'approved')}
              onReject={() => patchTask(selected.id, task.id, 'rejected')}
              onReset={() => patchTask(selected.id, task.id, 'review')}
            />
          ))}
        </div>
      </FoundrySection>

      <FoundrySection title="How this stays generic" eyebrow="Platform">
        <p>
          Request <span className="foundry-mono">{selected.id}</span> 只是种子提案 + 本地审批覆盖。
          换域注册新 Request；壳不写死股票类型名以外的治理策略。
        </p>
      </FoundrySection>
    </FoundryShell>
  );
}

function TaskCard({
  task,
  onApprove,
  onReject,
  onReset,
}: {
  task: ApprovalTask;
  onApprove: () => void;
  onReject: () => void;
  onReset: () => void;
}) {
  const locked = task.status === 'invoked';
  return (
    <div className="approvals-task">
      <div className="approvals-task__head">
        <div>
          <div className="approvals-task__kind">
            {task.kind} · {task.resourceType}
          </div>
          <Typography.Title level={5} style={{ margin: '4px 0' }}>
            {task.title}
          </Typography.Title>
          <Typography.Text type="secondary">
            <span className="foundry-mono">{task.resourceId}</span>
          </Typography.Text>
        </div>
        {statusTag(task.status)}
      </div>
      <Typography.Paragraph>{task.summary}</Typography.Paragraph>
      <dl className="approvals-diff">
        <dt>before</dt>
        <dd>{task.diff.before ?? '—'}</dd>
        <dt>after</dt>
        <dd>{task.diff.after ?? '—'}</dd>
      </dl>
      <Space wrap>
        <Link to={task.omaPath}>
          <Button size="small">Open in Ontology Manager</Button>
        </Link>
        <Button
          size="small"
          type="primary"
          className="ds-btn--green"
          disabled={locked || task.status === 'approved'}
          onClick={onApprove}
        >
          Approve
        </Button>
        <Button
          size="small"
          danger
          className="ds-btn--red"
          disabled={locked || task.status === 'rejected'}
          onClick={onReject}
        >
          Reject
        </Button>
        <Button size="small" className="ds-btn--brown" disabled={locked} onClick={onReset}>
          Back to review
        </Button>
      </Space>
    </div>
  );
}
