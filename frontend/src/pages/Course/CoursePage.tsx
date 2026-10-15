import React, { useEffect, useMemo, useState } from 'react';
import { Empty, Table } from 'antd';
import { Link, useSearchParams } from 'react-router-dom';
import {
  listCatalogActions,
  listCatalogFunctions,
  listCatalogLinks,
  listCatalogObjects,
  propertyTitle,
  typeTitle,
  type CatalogObject,
} from '@/pages/DataExplorer/stockFallback';
import { ensureRuntimeSchema } from '@/pages/DataExplorer/runtimeSchema';
import { derivationChapters, type DerivationChapter } from './courseDerivation';
import { LinkedText, type CourseTarget } from './courseLinks';
import {
  actionStatus,
  refusedNames,
  typeRings,
  typeStep,
  typeWhy,
} from './courseSpine';
import { explainProperty, propertySetReason } from './propertyExplain';
import './CoursePage.less';

type Section = 'chain' | 'idea' | 'base' | 'steps' | 'map' | 'type' | 'links' | 'verbs';

const sections: { id: Section; label: string }[] = [
  { id: 'chain', label: '章节' },
  { id: 'map', label: '类型地图' },
  { id: 'links', label: '链接' },
  { id: 'verbs', label: '动词' },
];

const schemaFree = new Set<Section>(['chain', 'idea', 'base', 'steps']);

export default function CoursePage() {
  const [params, setParams] = useSearchParams();
  const raw = (params.get('section') as Section | null) ?? 'chain';
  const section = raw === 'idea' || raw === 'base' || raw === 'steps' ? 'chain' : raw;
  const selectedType = params.get('type') ?? '';
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [linkFilter, setLinkFilter] = useState('PreOpenArrangement');

  useEffect(() => {
    let live = true;
    ensureRuntimeSchema()
      .then(() => {
        if (live) setReady(true);
      })
      .catch(() => {
        if (live) setFailed(true);
      });
    return () => {
      live = false;
    };
  }, []);

  const objects = useMemo(() => (ready ? listCatalogObjects() : []), [ready]);
  const links = useMemo(() => (ready ? listCatalogLinks() : []), [ready]);
  const byName = useMemo(() => {
    const index = new globalThis.Map<string, CatalogObject>();
    for (const item of objects) index.set(item.apiName, item);
    return index;
  }, [objects]);

  const open = (next: Section, type?: string, from?: 'chapter' | 'map') => {
    const query = new URLSearchParams(params);
    query.set('section', next);
    if (type) query.set('type', type);
    else query.delete('type');
    if (from) query.set('from', from);
    else if (next !== 'type') query.delete('from');
    if (next !== 'links') query.delete('link');
    if (next !== 'verbs') query.delete('fn');
    setParams(query);
  };

  const openTarget = (target: CourseTarget) => {
    const query = new URLSearchParams(params);
    query.delete('type');
    if (target.kind === 'type') {
      query.set('section', 'type');
      query.set('type', target.type);
      query.set('from', 'chapter');
      query.delete('link');
      query.delete('fn');
    } else if (target.kind === 'chapter') {
      query.set('section', 'chain');
      query.set('chapter', target.id);
      query.delete('from');
      query.delete('link');
      query.delete('fn');
    } else if (target.kind === 'verbs') {
      query.set('section', 'verbs');
      if (target.apiName) query.set('fn', target.apiName);
      else query.delete('fn');
      query.delete('link');
    } else {
      query.set('section', 'links');
      query.set('link', target.apiName);
      query.delete('fn');
      setLinkFilter('');
    }
    setParams(query);
  };

  const active = section === 'type' ? 'map' : section;

  return (
    <div className="course">
      <header className="course__head">
        <div className="course__kicker">课程 · 前线部署</div>
        <h1>从明早那一页一步一步问出来</h1>
        <p>每一步用上一步留下的东西，问一句，得到一个具体设计。底座单独一章。</p>
      </header>
      <nav className="course__nav" aria-label="课程章节">
        {sections.map((item) => (
          <button
            key={item.id}
            type="button"
            className={active === item.id ? 'is-active' : ''}
            onClick={() => open(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>
      {failed && !schemaFree.has(section) ? <Empty description="读不到库里的资源定义" /> : null}
      {!failed && !ready && !schemaFree.has(section) ? <Empty description="正在读取库里的资源定义" /> : null}
      {section === 'chain' ? (
        <ChapterWalk
          chapterId={params.get('chapter') ?? derivationChapters[0].id}
          onChapter={(id) => openTarget({ kind: 'chapter', id })}
          onOpen={openTarget}
        />
      ) : null}
      {ready && section === 'map' ? (
        <TypeMap objects={objects} onOpenType={(type) => open('type', type, 'map')} />
      ) : null}
      {ready && section === 'type' ? (
        <PropertyCard
          detail={byName.get(selectedType) ?? null}
          backLabel={params.get('from') === 'chapter' ? '返回这一章' : '返回类型地图'}
          onBack={() => open(params.get('from') === 'chapter' ? 'chain' : 'map')}
        />
      ) : null}
      {ready && section === 'links' ? (
        <Links
          objects={objects}
          links={links}
          filter={linkFilter}
          focus={params.get('link') ?? ''}
          onFilter={setLinkFilter}
          onOpenType={(type) => open('type', type, 'map')}
        />
      ) : null}
      {ready && section === 'verbs' ? <Verbs focus={params.get('fn') ?? ''} /> : null}
    </div>
  );
}

function ChapterWalk({
  chapterId,
  onChapter,
  onOpen,
}: {
  chapterId: string;
  onChapter: (id: string) => void;
  onOpen: (target: CourseTarget) => void;
}) {
  const index = Math.max(0, derivationChapters.findIndex((item) => item.id === chapterId));
  const chapter = derivationChapters[index];
  let part = '';

  return (
    <div className="course-chapters">
      <nav className="course-toc" aria-label="章节">
        {derivationChapters.map((item) => {
          const showPart = item.part !== part;
          part = item.part;
          return (
            <React.Fragment key={item.id}>
              {showPart ? <div className="course-toc__part">{item.part}</div> : null}
              <button
                type="button"
                className={item.id === chapter.id ? 'is-on' : ''}
                onClick={() => onChapter(item.id)}
              >
                <span>{item.number}</span>
                {item.title}
              </button>
            </React.Fragment>
          );
        })}
      </nav>
      <ChapterBody key={chapter.id} chapter={chapter} index={index} onChapter={onChapter} chapterNumber={chapter.number} onOpen={onOpen} />
    </div>
  );
}

function ChapterBody({
  chapter,
  index,
  onChapter,
  onOpen,
}: {
  chapter: DerivationChapter;
  index: number;
  onChapter: (id: string) => void;
  onOpen: (target: CourseTarget) => void;
}) {
  const [nodeName, setNodeName] = useState<string | null>(null);
  const [shown, setShown] = useState(false);
  const selected = chapter.nodes.find((node) => node.name === nodeName) ?? null;

  return (
    <article className="course-chapter">
      <p className="course-meta">上一步留下</p>
      <p>
        <LinkedText text={chapter.carried} chapterNumber={chapter.number} onOpen={onOpen} />
      </p>
      <h2>
        <LinkedText text={chapter.ask} chapterNumber={chapter.number} onOpen={onOpen} />
      </h2>
      {chapter.guess ? (
        <div className="course-guess">
          <p>
            <strong>先猜。 </strong>
            {chapter.guess}
          </p>
          {shown ? (
            <p>
              <strong>揭开。 </strong>
              <LinkedText text={chapter.reveal} chapterNumber={chapter.number} onOpen={onOpen} />
            </p>
          ) : (
            <button type="button" className="course-next course-next--ghost" onClick={() => setShown(true)}>
              揭开
            </button>
          )}
        </div>
      ) : null}
      {chapter.nodes.length > 0 ? (
        <>
          <div className="course-flow__row">
            {chapter.nodes.map((node, nodeIndex) => (
              <React.Fragment key={`${node.name}-${nodeIndex}`}>
                {nodeIndex > 0 ? <span className="course-flow__arrow">→</span> : null}
                <button
                  type="button"
                  className={node.name === nodeName ? 'course-flow__node is-on' : 'course-flow__node'}
                  onClick={() => setNodeName(node.name === nodeName ? null : node.name)}
                >
                  {node.name}
                </button>
              </React.Fragment>
            ))}
          </div>
          {selected?.line ? (
            <p className="course-node-line">
              <LinkedText text={selected.line} chapterNumber={chapter.number} onOpen={onOpen} />
            </p>
          ) : null}
        </>
      ) : null}
      {chapter.judge ? (
        <p>
          <strong>怎么判。 </strong>
          <LinkedText text={chapter.judge} chapterNumber={chapter.number} onOpen={onOpen} />
        </p>
      ) : null}
      {chapter.scene ? (
        <>
          <h3>这一次</h3>
          <p>
            <LinkedText text={chapter.scene} chapterNumber={chapter.number} onOpen={onOpen} />
          </p>
        </>
      ) : null}
      {chapter.thinking.length > 0 ? (
        <>
          <h3>思考过程</h3>
          {chapter.thinking.map((paragraph) => (
            <p key={paragraph}>
              <LinkedText text={paragraph} chapterNumber={chapter.number} onOpen={onOpen} />
            </p>
          ))}
        </>
      ) : null}
      {chapter.items.length > 0 ? (
        <>
          <h3>逐项</h3>
          {chapter.items.map((item) =>
            item.startsWith('- ') ? (
              <p key={item} className="course-item">
                <LinkedText text={item.slice(2)} chapterNumber={chapter.number} onOpen={onOpen} />
              </p>
            ) : (
              <h4 key={item}>
                <LinkedText text={item} chapterNumber={chapter.number} onOpen={onOpen} />
              </h4>
            ),
          )}
        </>
      ) : null}
      {chapter.conclusion.length > 0 ? (
        <>
          <h3>结论</h3>
          {chapter.conclusion
            .filter((item) => !item.startsWith('接到下一步'))
            .map((item) => (
            <p key={item} className="course-item">
              <LinkedText text={item} chapterNumber={chapter.number} onOpen={onOpen} />
            </p>
          ))}
        </>
      ) : null}
      {chapter.next ? (
        <>
          <h3>接到下一步</h3>
          <p>
            <LinkedText text={chapter.next} chapterNumber={chapter.number} onOpen={onOpen} />
          </p>
        </>
      ) : null}
      <div className="course-flow__actions">
        <button
          type="button"
          className="course-next course-next--ghost"
          disabled={index === 0}
          onClick={() => onChapter(derivationChapters[index - 1].id)}
        >
          上一步
        </button>
        <button
          type="button"
          className="course-next"
          disabled={index === derivationChapters.length - 1}
          onClick={() => onChapter(derivationChapters[index + 1].id)}
        >
          下一步
        </button>
      </div>
    </article>
  );
}

function TypeMap({
  objects,
  onOpenType,
}: {
  objects: CatalogObject[];
  onOpenType: (type: string) => void;
}) {
  const placed = new Set(typeRings.flatMap((ring) => ring.types));
  const extra = objects.filter((item) => !placed.has(item.apiName));
  return (
    <div className="course-map">
      {typeRings.map((ring) => (
        <section key={ring.id} className={`course-ring course-ring--${ring.id}`}>
          <div className="course-ring__label">{ring.label}</div>
          <p>{ring.note}</p>
          <div className="course-chips">
            {ring.types.map((type) => (
              <button key={type} type="button" onClick={() => onOpenType(type)}>
                {objects.find((item) => item.apiName === type)?.displayName ?? type}
                <span>{type}</span>
              </button>
            ))}
          </div>
        </section>
      ))}
      <section className="course-ring">
        <div className="course-ring__label">这一页用不上的</div>
        <p>以前的名单里有过。现在库里没有，这张图不放。</p>
        <div className="course-chips">
          {refusedNames.map((name) => (
            <span key={name} className="course-chip course-chip--quiet">
              {name}
            </span>
          ))}
        </div>
      </section>
      {extra.length > 0 ? (
        <section className="course-ring">
          <div className="course-ring__label">库里有，上面七步还没讲到</div>
          <div className="course-chips">
            {extra.map((item) => (
              <button key={item.apiName} type="button" onClick={() => onOpenType(item.apiName)}>
                {item.displayName}
                <span>{item.apiName}</span>
              </button>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function PropertyCard({
  detail,
  backLabel,
  onBack,
}: {
  detail: CatalogObject | null;
  backLabel: string;
  onBack: () => void;
}) {
  if (!detail) {
    return (
      <div>
        <button type="button" className="course-back" onClick={onBack}>
          {backLabel}
        </button>
        <Empty description="库里没有这个对象类型" />
      </div>
    );
  }
  const reason = propertySetReason[detail.apiName];
  const primary = new Set(detail.primaryKey.split(' + ').map((part) => part.trim()));
  const missing = detail.properties.filter((row) => !explainProperty(detail.apiName, row.apiName));
  return (
    <div>
      <button type="button" className="course-back" onClick={onBack}>
        {backLabel}
      </button>
      <h2>
        {detail.displayName}
        <span className="course-api"> {detail.apiName}</span>
      </h2>
      <p>{typeWhy[detail.apiName] ?? detail.description}</p>
      {reason ? (
        <section className="course-why">
          <h3>为啥刚好是这些</h3>
          <p>
            <strong>是为了回答。 </strong>
            {reason.answers}
          </p>
          <p>
            <strong>少了会怎样。 </strong>
            {reason.fewer}
          </p>
          <p>
            <strong>为啥不加。 </strong>
            {reason.more}
          </p>
        </section>
      ) : null}
      <p className="course-meta">
        {typeStep[detail.apiName] ?? '库里的对象'} · 主键 {detail.primaryKey} · {detail.description}
      </p>
      <p className="course-meta">
        <Link to={`/ontology/manager?section=object&type=${detail.apiName}&kind=object`}>
          在 Ontology Manager 里看同一份写通道
        </Link>
        {detail.apiName === 'PreOpenArrangement' ? (
          <>
            {' · '}
            <Link to="/workshop/pre-open">打开交易员那一页</Link>
          </>
        ) : null}
      </p>
      <Table
        size="small"
        rowKey="apiName"
        pagination={false}
        scroll={{ x: 960 }}
        dataSource={detail.properties}
        columns={[
          { title: '列', dataIndex: 'apiName', width: 180 },
          {
            title: '这一列在说什么',
            width: 360,
            render: (_: unknown, row: { apiName: string }) =>
              explainProperty(detail.apiName, row.apiName) || '这一列还没有说明',
          },
          { title: '数据库列', dataIndex: 'column', width: 180 },
          {
            title: '主键',
            width: 72,
            render: (_: unknown, row: { apiName: string }) => (primary.has(row.apiName) ? '是' : ''),
          },
          { title: '谁能写', dataIndex: 'writeChannel' },
          {
            title: '哪一步',
            width: 100,
            render: () => typeStep[detail.apiName] ?? '',
          },
        ]}
      />
      {missing.length > 0 ? (
        <p className="course-meta">还有 {missing.map((row) => row.apiName).join('、')} 没有写成说明。</p>
      ) : null}
    </div>
  );
}

function Links({
  objects,
  links,
  filter,
  focus,
  onFilter,
  onOpenType,
}: {
  objects: CatalogObject[];
  links: ReturnType<typeof listCatalogLinks>;
  filter: string;
  focus: string;
  onFilter: (value: string) => void;
  onOpenType: (type: string) => void;
}) {
  const rows = filter
    ? links.filter((link) => link.sourceType === filter || link.targetType === filter)
    : links;
  useEffect(() => {
    if (!focus) return;
    document.querySelector('.course-row-on')?.scrollIntoView({ block: 'center' });
  }, [focus]);
  return (
    <div>
      <p>一条边就是库里的一条链接：从哪个对象的哪一列，走到哪个对象的哪一列。</p>
      <label className="course-filter">
        只看与这个对象有关的
        <select value={filter} onChange={(event) => onFilter(event.target.value)}>
          <option value="">全部</option>
          {objects.map((item) => (
            <option key={item.apiName} value={item.apiName}>
              {item.displayName}
            </option>
          ))}
        </select>
      </label>
      <Table
        size="small"
        rowKey="apiName"
        pagination={false}
        dataSource={rows}
        rowClassName={(row) => (row.apiName === focus ? 'course-row-on' : '')}
        columns={[
          { title: '链接', dataIndex: 'displayName' },
          { title: 'apiName', dataIndex: 'apiName', width: 180 },
          {
            title: '从',
            render: (_: unknown, row: (typeof rows)[number]) => (
              <button type="button" className="course-textbtn" onClick={() => onOpenType(row.sourceType)}>
                {typeTitle(row.sourceType)} · {propertyTitle(row.sourceType, row.sourceApiName)}
              </button>
            ),
          },
          {
            title: '到',
            render: (_: unknown, row: (typeof rows)[number]) => (
              <button type="button" className="course-textbtn" onClick={() => onOpenType(row.targetType)}>
                {typeTitle(row.targetType)} · {propertyTitle(row.targetType, row.targetApiName)}
              </button>
            ),
          },
          { title: '基数', dataIndex: 'cardinality', width: 120 },
        ]}
      />
    </div>
  );
}

function Verbs({ focus }: { focus: string }) {
  const functions = listCatalogFunctions();
  const actions = listCatalogActions();
  useEffect(() => {
    if (!focus) return;
    document.querySelector('.course-row-on')?.scrollIntoView({ block: 'center' });
  }, [focus]);
  return (
    <div className="course-verbs">
      <section>
        <h2>Function · 代码目录</h2>
        <p>能重算的那些数，公式说了算。现在还写在代码目录里，还不能按名字单独点一下就算。</p>
        <Table
          size="small"
          rowKey="apiName"
          pagination={false}
          dataSource={functions}
          rowClassName={(row) => (row.apiName === focus ? 'course-row-on' : '')}
          columns={[
            { title: 'apiName', dataIndex: 'apiName', width: 200 },
            { title: '名称', dataIndex: 'displayName', width: 140 },
            { title: '读', dataIndex: 'reads' },
            { title: '写下', dataIndex: 'writes' },
            {
              title: '在哪',
              width: 88,
              render: (_: unknown, row: { apiName: string }) => (
                <Link to={`/code/repositories?fn=${encodeURIComponent(row.apiName)}`}>代码</Link>
              ),
            },
          ]}
        />
      </section>
      <section>
        <h2>Action · 人点一次</h2>
        <p>确认卖出、确认买入、回报成交，现在就能提交。推迟、否决、停止、确认今天没有要执行的，定义写了，按钮还没接上。</p>
        <Table
          size="small"
          rowKey="apiName"
          pagination={false}
          dataSource={actions}
          rowClassName={(row) => (row.apiName === focus ? 'course-row-on' : '')}
          columns={[
            { title: 'apiName', dataIndex: 'apiName', width: 220 },
            { title: '名称', dataIndex: 'displayName', width: 140 },
            {
              title: '现在',
              width: 280,
              render: (_: unknown, row: { apiName: string }) => actionStatus(row.apiName),
            },
            { title: '提交条件', dataIndex: 'condition' },
          ]}
        />
      </section>
    </div>
  );
}
