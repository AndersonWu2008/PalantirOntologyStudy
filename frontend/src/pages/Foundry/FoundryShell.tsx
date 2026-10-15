import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from 'antd';
import './FoundryShell.less';

export type FoundryAction = {
  label: string;
  to?: string;
  primary?: boolean;
  onClick?: () => void;
};

type FoundryShellProps = {
  app: string;
  title: string;
  lead: string;
  domain?: string;
  children: React.ReactNode;
  actions?: FoundryAction[];
};

export function FoundryShell({
  app,
  title,
  lead,
  domain = 'StockTrading',
  children,
  actions,
}: FoundryShellProps) {
  return (
    <div className="foundry-shell">
      <header className="foundry-shell__chrome">
        <div className="foundry-shell__chrome-main">
          <div className="foundry-shell__app">{app}</div>
          <h1 className="foundry-shell__title">{title}</h1>
          <p className="foundry-shell__lead">{lead}</p>
        </div>
        <div className="foundry-shell__chrome-side">
          <span className="foundry-shell__domain" title="当前 Ontology 域">
            {domain}
          </span>
        </div>
      </header>
      <div className="foundry-shell__body">{children}</div>
      {actions && actions.length > 0 ? (
        <footer className="foundry-shell__actions">
          {actions.map((action) =>
            action.to ? (
              <Link key={action.label} to={action.to}>
                <Button type={action.primary ? 'primary' : 'default'}>{action.label}</Button>
              </Link>
            ) : (
              <Button key={action.label} type={action.primary ? 'primary' : 'default'} onClick={action.onClick}>
                {action.label}
              </Button>
            ),
          )}
        </footer>
      ) : null}
    </div>
  );
}

type SectionProps = {
  title: string;
  eyebrow?: string;
  children: React.ReactNode;
};

export function FoundrySection({ title, eyebrow, children }: SectionProps) {
  return (
    <section className="foundry-section">
      <div className="foundry-section__head">
        {eyebrow ? <div className="foundry-section__eyebrow">{eyebrow}</div> : null}
        <h2 className="foundry-section__title">{title}</h2>
      </div>
      <div className="foundry-section__body">{children}</div>
    </section>
  );
}

type StepProps = {
  index: number;
  title: string;
  detail: string;
};

export function FoundryStep({ index, title, detail }: StepProps) {
  return (
    <div className="foundry-step">
      <div className="foundry-step__index">{index}</div>
      <div>
        <div className="foundry-step__title">{title}</div>
        <div className="foundry-step__detail">{detail}</div>
      </div>
    </div>
  );
}
