/**
 * Workspace top bar.
 * App name + secondary tabs (from sidebarNavConfig children) + search.
 */

import React, { useMemo, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { CloseOutlined } from '@ant-design/icons';
import { sidebarNavConfig, type NavChild, type NavItem } from '../Sidebar/SidebarNavConfig';
import './Header.less';

function matchApp(pathname: string): NavItem | undefined {
  const matches = sidebarNavConfig.filter(
    (item) => pathname === item.path || pathname.startsWith(`${item.path}/`),
  );
  return matches.sort((left, right) => right.path.length - left.path.length)[0];
}

function matchChild(children: NavChild[] | undefined, pathname: string): NavChild | undefined {
  if (!children?.length) return undefined;
  const hits = children.filter(
    (child) => pathname === child.path || pathname.startsWith(`${child.path}/`),
  );
  return hits.sort((left, right) => right.path.length - left.path.length)[0];
}

export const Header: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const onManager = location.pathname.startsWith('/ontology/manager');
  const [draft, setDraft] = useState('');

  const currentApp = useMemo(() => matchApp(location.pathname), [location.pathname]);
  const sections = currentApp?.children ?? [];
  const showTabs = sections.length > 1;
  const activeSection = useMemo(
    () => matchChild(sections, location.pathname),
    [sections, location.pathname],
  );

  const query = onManager ? (searchParams.get('q') ?? '') : draft;

  const applyQuery = (value: string) => {
    if (onManager) {
      if (value === (searchParams.get('q') ?? '')) return;
      const next = new URLSearchParams(searchParams);
      if (value) next.set('q', value);
      else next.delete('q');
      next.delete('type');
      next.delete('kind');
      if (value) next.set('section', 'search');
      setSearchParams(next, { replace: true });
      return;
    }
    setDraft(value);
  };

  const submitSearch = () => {
    const value = query.trim();
    if (onManager) return;
    navigate(value ? `/ontology/manager?q=${encodeURIComponent(value)}&section=search` : '/ontology/manager');
  };

  return (
    <header className={`ws-bar ${showTabs ? 'has-tabs' : ''}`}>
      <div className="ws-bar__main">
        <div className="ws-bar__lead">
          <span className="ws-app">{currentApp?.label ?? 'Ontology'}</span>
        </div>

        <form
          className="ws-search"
          onSubmit={(event) => {
            event.preventDefault();
            submitSearch();
          }}
        >
          <input
            value={query}
            placeholder="Search resources…"
            aria-label="搜索"
            onChange={(event) => applyQuery(event.target.value)}
          />
          {query ? (
            <button
              type="button"
              className="ws-search__clear"
              onClick={() => {
                applyQuery('');
                setDraft('');
              }}
            >
              <CloseOutlined />
              Clear
            </button>
          ) : null}
        </form>

        <div className="ws-bar__end" />
      </div>

      {showTabs ? (
        <nav className="ws-bar__tabs" aria-label={`${currentApp?.label ?? 'App'} sections`}>
          {sections.map((child) => {
            const active = activeSection?.id === child.id;
            return (
              <button
                key={child.id}
                type="button"
                className={`ws-tab ${active ? 'is-active' : ''}`}
                onClick={() => navigate(child.path)}
              >
                {child.label}
              </button>
            );
          })}
        </nav>
      ) : null}
    </header>
  );
};

export default Header;
