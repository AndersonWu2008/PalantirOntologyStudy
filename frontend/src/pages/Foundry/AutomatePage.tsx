import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Button, Select, Space, Switch, Table, Tag, Typography } from 'antd';
import { Link, useSearchParams } from 'react-router-dom';
import { FoundrySection, FoundryShell } from './FoundryShell';
import {
  automations,
  currentArrangement,
  evaluateAutomation,
  getAutomation,
  loadSnapshots,
  saveSnapshots,
  type ArrangementSnapshot,
  type Automation,
  type AutomationNotification,
} from './automate/rules';
import './AutomatePage.less';

const API = 'http://127.0.0.1:3010';

type Row = Record<string, unknown>;

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`读取失败 ${response.status}`);
  return response.json() as Promise<T>;
}

const FEED_KEY = 'foundry.automate.notificationFeed';

function loadFeed(): AutomationNotification[] {
  try {
    const raw = localStorage.getItem(FEED_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as AutomationNotification[];
  } catch {
    return [];
  }
}

function saveFeed(items: AutomationNotification[]) {
  localStorage.setItem(FEED_KEY, JSON.stringify(items.slice(0, 50)));
}

export default function AutomatePage() {
  const [params, setParams] = useSearchParams();
  const automation = getAutomation(params.get('id'));
  const [live, setLive] = useState<ArrangementSnapshot | null>(null);
  const [feed, setFeed] = useState<AutomationNotification[]>(() => loadFeed());
  const [lastReason, setLastReason] = useState<string>('尚未 Evaluate');
  const [error, setError] = useState<string | null>(null);
  const [evaluating, setEvaluating] = useState(false);
  const [polling, setPolling] = useState(false);
  const timerRef = useRef<number | null>(null);

  const selectAutomation = (next: Automation) => {
    setParams({ id: next.id });
  };

  const pushNotification = useCallback((item: AutomationNotification) => {
    setFeed((prev) => {
      const next = [item, ...prev].slice(0, 50);
      saveFeed(next);
      return next;
    });
  }, []);

  const evaluate = useCallback(
    async (target: Automation) => {
      setEvaluating(true);
      setError(null);
      try {
        const domain = target.domain ?? 'StockTrading';
        const accountId = target.condition.accountId;
        const rows = await getJson<Row[]>(
          `${API}/arrangements?domain=${encodeURIComponent(domain)}&accountId=${encodeURIComponent(accountId)}`,
        );
        const arrangement = currentArrangement(rows);
        setLive(arrangement);
        const snapshots = loadSnapshots();
        const result = evaluateAutomation(target, arrangement, snapshots);
        saveSnapshots(result.nextSnapshots);
        setLastReason(result.reason);
        if (result.notification) {
          pushNotification(result.notification);
        }
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : 'Evaluate 失败');
      } finally {
        setEvaluating(false);
      }
    },
    [pushNotification],
  );

  useEffect(() => {
    void evaluate(automation);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- seed once when id changes
  }, [automation.id]);

  useEffect(() => {
    if (timerRef.current != null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (!polling) return;
    timerRef.current = window.setInterval(() => {
      void evaluate(automation);
    }, automation.pollSeconds * 1000);
    return () => {
      if (timerRef.current != null) window.clearInterval(timerRef.current);
    };
  }, [polling, automation, evaluate]);

  function clearFeed() {
    setFeed([]);
    saveFeed([]);
  }

  function resetSnapshots() {
    saveSnapshots({});
    setLastReason('已清空 header 快照；下次 Evaluate 会重新基线');
  }

  return (
    <FoundryShell
      app="Automate"
      title={automation.displayName}
      lead="Condition → Effect. 本课效果只有 Notification；不替人提交 Confirm* / ReportFill。"
      actions={[
        { label: 'Workshop', to: live ? `/workshop/pre-open?date=${encodeURIComponent(live.sessionDate)}` : '/workshop/pre-open', primary: true },
        { label: 'Data Health', to: '/data/health' },
        { label: 'Carbon', to: '/carbon' },
      ]}
    >
      <Alert
        type="warning"
        showIcon
        style={{ marginBottom: 16 }}
        message="Hard rule"
        description="Automate 在本课不得调用 Action 服务写委托。页首变化只通知；确认仍在 Workshop 由人点。"
      />

      <FoundrySection title="Automation" eyebrow="Automate">
        <Space wrap>
          <Select
            style={{ minWidth: 360 }}
            value={automation.id}
            options={automations.map((item) => ({
              value: item.id,
              label: `${item.displayName} · ${item.id}`,
            }))}
            onChange={(value: string) => selectAutomation(getAutomation(value))}
          />
          {automation.domain ? <Tag>{automation.domain}</Tag> : null}
          <Button type="primary" className="ds-btn--blue" loading={evaluating} onClick={() => void evaluate(automation)}>
            Evaluate now
          </Button>
          <Space>
            <Switch checked={polling} onChange={setPolling} />
            <Typography.Text type="secondary">Poll every {automation.pollSeconds}s</Typography.Text>
          </Space>
          <Button className="ds-btn--brown" onClick={resetSnapshots}>
            Reset snapshots
          </Button>
        </Space>
        <Typography.Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0 }}>
          {automation.description}
        </Typography.Paragraph>
      </FoundrySection>

      {error ? <Alert type="error" showIcon message={error} style={{ marginBottom: 12 }} /> : null}

      <div className="automate-split">
        <FoundrySection title="Condition" eyebrow="When">
          <dl className="automate-dl">
            <dt>kind</dt>
            <dd>
              <span className="foundry-mono">{automation.condition.kind}</span>
            </dd>
            <dt>objectType</dt>
            <dd>
              <span className="foundry-mono">{automation.condition.objectType}</span>
            </dd>
            <dt>watchProperties</dt>
            <dd>
              <span className="foundry-mono">{automation.condition.watchProperties.join(', ')}</span>
            </dd>
            <dt>matchValues</dt>
            <dd>
              {automation.condition.matchValues?.length
                ? automation.condition.matchValues.map((value) => <Tag key={value}>{value}</Tag>)
                : '（任意变化）'}
            </dd>
            <dt>accountId</dt>
            <dd>
              <span className="foundry-mono">{automation.condition.accountId}</span>
            </dd>
          </dl>
        </FoundrySection>

        <FoundrySection title="Effect" eyebrow="Then">
          <dl className="automate-dl">
            <dt>kind</dt>
            <dd>
              <Tag color="blue">{automation.effect.kind}</Tag>
              <Tag>submitAction 禁用</Tag>
            </dd>
            <dt>title</dt>
            <dd>{automation.effect.titleTemplate}</dd>
            <dt>body</dt>
            <dd>{automation.effect.bodyTemplate}</dd>
            <dt>href</dt>
            <dd>
              <span className="foundry-mono">{automation.effect.hrefTemplate}</span>
            </dd>
          </dl>
        </FoundrySection>
      </div>

      <FoundrySection title="Live object" eyebrow="Ontology">
        {live ? (
          <Space direction="vertical" size={4}>
            <Typography.Text>
              Current arrangement <span className="foundry-mono">{live.arrangementId}</span>
            </Typography.Text>
            <Typography.Text>
              header: <Typography.Text strong>{live.header}</Typography.Text> · session {live.sessionDate}
            </Typography.Text>
            <Typography.Text type="secondary">Last evaluate: {lastReason}</Typography.Text>
          </Space>
        ) : (
          <Typography.Text type="secondary">无当前安排 · {lastReason}</Typography.Text>
        )}
      </FoundrySection>

      <FoundrySection title="Notification feed" eyebrow="Effects">
        <Space style={{ marginBottom: 8 }}>
          <Button size="small" onClick={clearFeed}>
            Clear feed
          </Button>
          <Typography.Text type="secondary">{feed.length} stored (local)</Typography.Text>
        </Space>
        <Table
          size="small"
          pagination={{ pageSize: 8, showSizeChanger: false }}
          rowKey="id"
          dataSource={feed}
          locale={{ emptyText: '尚无通知 — Evaluate 或等页首变化' }}
          columns={[
            {
              title: 'When',
              dataIndex: 'at',
              width: 180,
              render: (value: string) => (
                <span className="foundry-mono">{value.replace('T', ' ').slice(0, 19)}</span>
              ),
            },
            {
              title: 'Automation',
              dataIndex: 'automationId',
              width: 220,
              render: (value: string) => <span className="foundry-mono">{value.split('.').pop()}</span>,
            },
            { title: 'Title', dataIndex: 'title', width: 200 },
            { title: 'Body', dataIndex: 'body' },
            {
              title: 'Open',
              key: 'href',
              width: 100,
              render: (_: unknown, row: AutomationNotification) => <Link to={row.href}>Open</Link>,
            },
          ]}
        />
      </FoundrySection>

      <FoundrySection title="How this stays generic" eyebrow="Platform">
        <p>
          Automation <span className="foundry-mono">{automation.id}</span> 只是 Condition + Effect 配置。
          换域注册新规则；壳不写死「还没写下委托」逻辑以外的交易语义。
        </p>
      </FoundrySection>
    </FoundryShell>
  );
}
