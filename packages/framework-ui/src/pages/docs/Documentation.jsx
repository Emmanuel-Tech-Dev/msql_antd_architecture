import { useEffect, useMemo, useState } from 'react';
import {
  AlertOutlined,
  ArrowLeftOutlined,
  ArrowRightOutlined,
  BookOutlined,
  CheckCircleOutlined,
  CloseOutlined,
  CodeOutlined,
  CopyOutlined,
  FileTextOutlined,
  HomeOutlined,
  InfoCircleOutlined,
  LinkOutlined,
  MenuOutlined,
  MoonOutlined,
  SearchOutlined,
  SunOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { Button, Drawer, Empty, Input, Modal, Tag, Tooltip } from 'antd';
import { useLocation, useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import { useTheme } from '../../hooks/useTheme';
import {
  documentationMeta,
  documentationNavigation,
  documentationSearchIndex,
  documentationSections,
} from './docsContent';
import HookLab from './HookLab';
import RequestLifecycle from './RequestLifecycle';
import RequestWalkthrough from './RequestWalkthrough';
import ArchitectureSimulator from './architecture-simulator/ArchitectureSimulator';
import './Documentation.css';
import utils from '../../utils/function_utils';

// Smooth scrolling only for people who haven't asked for less motion.
const toneIcons = {
  note: <InfoCircleOutlined />,
  warning: <WarningOutlined />,
  danger: <AlertOutlined />,
};

const headingIdOf = (index, title) => `section-${index}-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

// The home page's "I want to…" entry points.
const TASKS = [
  { title: 'Understand how it works', text: 'Follow one request from a click to the database', page: 'follow-one-request' },
  { title: 'Put a table on screen', text: 'Describe it, then render <MetadataTable>', page: 'metadata-forms' },
  { title: 'Design a form without code', text: 'Settings › Data model', page: 'data-model-builder' },
  { title: 'Give someone access', text: 'Roles, permissions, overrides and policies', page: 'identity-access' },
  { title: 'Deploy or restore', text: 'Environment, migrations, backups, smoke test', page: 'operations' },
  { title: 'Find a hook', text: 'Live demos, code and contracts', page: 'live-hook-lab' },
];

function NavContent({ activeId, onSelect }) {
  return (
    <nav className="docs-nav" aria-label="Documentation sections">
      <button className={activeId === null ? 'is-active' : ''} onClick={() => onSelect(null)} type="button" aria-current={activeId === null ? 'page' : undefined}>
        <span><HomeOutlined aria-hidden="true" /> Home</span>
      </button>
      {documentationNavigation.map((track) => (
        <div className="docs-nav__track" key={track.key}>
          <span className="docs-nav__track-label">{track.label}</span>
          {track.groups.map((group) => (
            <div className="docs-nav__group" key={group.name}>
              <span className="docs-nav__label">{group.name}<small>{group.pages.length}</small></span>
              {group.pages.map((section) => (
                <button
                  aria-current={activeId === section.id ? 'page' : undefined}
                  className={activeId === section.id ? 'is-active' : ''}
                  key={section.id}
                  onClick={() => onSelect(section.id)}
                  type="button"
                >
                  <span>{section.title}</span>
                  <small>{section.readTime}</small>
                </button>
              ))}
            </div>
          ))}
        </div>
      ))}
    </nav>
  );
}

function CodeBlock({ block }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    if (!(await utils.copyText(block.value))) return;
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };

  return (
    <section className="docs-code" aria-label={block.title}>
      <div className="docs-code__bar">
        <span><CodeOutlined /> {block.title}</span>
        <div>
          <small>{block.language}</small>
          <Tooltip title={copied ? 'Copied' : 'Copy code'}>
            <Button
              aria-label={`Copy ${block.title}`}
              icon={copied ? <CheckCircleOutlined /> : <CopyOutlined />}
              onClick={copy}
              size="small"
              type="text"
            />
          </Tooltip>
        </div>
      </div>
      <pre><code>{block.value}</code></pre>
    </section>
  );
}

function DocumentationBlock({ block, index }) {
  const headingId = block.title ? headingIdOf(index, block.title) : undefined;

  if (block.type === 'paragraph') {
    return <p className="docs-prose">{block.text}</p>;
  }

  if (block.type === 'callout') {
    return (
      <aside className={`docs-callout docs-callout--${block.tone}`}>
        <span className="docs-callout__icon">{toneIcons[block.tone]}</span>
        <div>
          <strong>{block.title}</strong>
          <p>{block.text}</p>
        </div>
      </aside>
    );
  }

  if (block.type === 'bullets') {
    return (
      <section className="docs-block" aria-labelledby={headingId}>
        <h2 id={headingId}>{block.title}</h2>
        <ul className="docs-bullets">
          {block.items.map((item, itemIndex) => <li key={itemIndex}>{item}</li>)}
        </ul>
      </section>
    );
  }

  if (block.type === 'steps') {
    return (
      <section className="docs-block" aria-labelledby={headingId}>
        <h2 id={headingId}>{block.title}</h2>
        <ol className="docs-steps">
          {block.items.map((item, itemIndex) => (
            <li key={itemIndex}>
              <span aria-hidden="true">{String(itemIndex + 1).padStart(2, '0')}</span>
              <div><strong>{item.title}</strong><p>{item.text}</p></div>
            </li>
          ))}
        </ol>
      </section>
    );
  }

  if (block.type === 'table') {
    return (
      <section className="docs-block" aria-labelledby={headingId}>
        <h2 id={headingId}>{block.title}</h2>
        <div className="docs-table-wrap">
          <table className="docs-table">
            <thead><tr>{block.columns.map((column) => <th key={column}>{column}</th>)}</tr></thead>
            <tbody>
              {block.rows.map((row, rowIndex) => (
                <tr key={`${block.title}-${rowIndex}`}>
                  {row.map((cell, cellIndex) => <td key={`${rowIndex}-${cellIndex}`}>{cell}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    );
  }

  if (block.type === 'flow') {
    return (
      <section className="docs-block" aria-labelledby={headingId}>
        <h2 id={headingId}>{block.title}</h2>
        <ol className="docs-flow">
          {block.items.map((item, itemIndex) => (
            <li key={itemIndex}>
              <span>{itemIndex + 1}</span>
              <strong>{item}</strong>
              {itemIndex < block.items.length - 1 && <ArrowRightOutlined aria-hidden />}
            </li>
          ))}
        </ol>
      </section>
    );
  }

  if (block.type === 'lifecycle') return <RequestLifecycle block={block} headingId={headingId} />;
  if (block.type === 'code') return <CodeBlock block={block} />;
  if (block.type === 'hook-lab') return <HookLab />;
  if (block.type === 'request-walkthrough') return <RequestWalkthrough headingId={headingId} title={block.title} />;
  if (block.type === 'architecture-simulator') {
    return <ArchitectureSimulator headingId={headingId} title={block.title} />;
  }
  return null;
}

function SearchDialog({ open, onClose, onSelect }) {
  const [query, setQuery] = useState('');
  const close = () => {
    setQuery('');
    onClose();
  };
  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return documentationSearchIndex.slice(0, 6);
    return documentationSearchIndex
      .filter((item) => item.text.includes(normalized))
      .sort((a, b) => {
        const aTitle = a.title.toLowerCase().includes(normalized) ? 1 : 0;
        const bTitle = b.title.toLowerCase().includes(normalized) ? 1 : 0;
        return bTitle - aTitle;
      });
  }, [query]);

  return (
    <Modal
      centered
      className="docs-search-modal"
      closable={false}
      footer={null}
      onCancel={close}
      open={open}
      title={null}
      width={680}
    >
      <div className="docs-search__input">
        <SearchOutlined aria-hidden="true" />
        <Input
          aria-label="Search documentation"
          autoFocus
          bordered={false}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search architecture, hooks, security, operations…"
          value={query}
        />
        <button aria-label="Close search" onClick={close} type="button"><CloseOutlined /></button>
      </div>
      <p className="docs-visually-hidden" aria-live="polite">{query.trim() ? `${results.length} matching sections` : ''}</p>
      <div className="docs-search__results">
        {results.length ? results.map((result) => (
          <button
            key={result.id}
            onClick={() => { onSelect(result.id); close(); }}
            type="button"
          >
            <span className="docs-search__result-icon"><FileTextOutlined /></span>
            <span><small>{result.group}</small><strong>{result.title}</strong><em>{result.summary}</em></span>
            <ArrowRightOutlined aria-hidden="true" />
          </button>
        )) : <Empty description="No documentation sections match that search" image={Empty.PRESENTED_IMAGE_SIMPLE} />}
      </div>
      <div className="docs-search__footer"><span>Search covers technical and non-technical guidance</span><kbd>Esc</kbd></div>
    </Modal>
  );
}

function DocsHome({ onSelect, children }) {
  return (
    <article className="docs-article docs-home">
      <div className="docs-article__meta"><span>Documentation</span><span>Everyone</span></div>
      <h1>What do you want to do?</h1>
      <p className="docs-home__lede">Start from a task, or browse the four tracks: Learn how the framework works, Build on it, Operate it, and look things up in Reference.</p>
      <div className="docs-home__tasks">
        {TASKS.map((task) => (
          <button key={task.page} className="docs-home__task" onClick={() => onSelect(task.page)} type="button">
            <strong>{task.title}</strong>
            <span>{task.text}</span>
            <ArrowRightOutlined aria-hidden="true" />
          </button>
        ))}
      </div>
      <h2 className="docs-home__heading">Tracks</h2>
      <div className="docs-home__tracks">
        {documentationNavigation.map((track) => (
          <section key={track.key} className="docs-home__track" aria-labelledby={`track-${track.key}`}>
            <h3 id={`track-${track.key}`}>{track.label}</h3>
            <p>{track.description}</p>
            <ul>
              {track.groups.flatMap((group) => group.pages).map((page) => (
                <li key={page.id}><button type="button" onClick={() => onSelect(page.id)}>{page.title}</button></li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      {children}
    </article>
  );
}

// "On this page" follows the heading that has scrolled past the header.
function useActiveHeading(ids) {
  const [active, setActive] = useState(null);
  useEffect(() => {
    if (!ids.length) return undefined;
    let frame = 0;
    const update = () => {
      frame = 0;
      let current = ids[0];
      for (const id of ids) {
        const element = document.getElementById(id);
        if (element && element.getBoundingClientRect().top <= 120) current = id;
      }
      setActive(current);
    };
    const onScroll = () => { if (!frame) frame = window.requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [ids]);
  return active;
}

export default function Documentation() {
  const navigate = useNavigate();
  const location = useLocation();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const { isDark, toggle } = useTheme();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const isMac = /Mac|iPhone|iPad/.test(navigator.platform ?? '');

  const requestedId = location.hash.replace('#', '');
  const activeIndex = documentationSections.findIndex((section) => section.id === requestedId);
  const activeSection = activeIndex >= 0 ? documentationSections[activeIndex] : null;
  const previous = activeSection ? documentationSections[activeIndex - 1] : null;
  const next = activeSection ? documentationSections[activeIndex + 1] : documentationSections[0];
  const toc = useMemo(() => (activeSection?.blocks ?? [])
    .map((block, index) => (block.title && !['callout', 'code'].includes(block.type)
      ? { title: block.title, id: headingIdOf(index, block.title) }
      : null))
    .filter(Boolean), [activeSection]);
  const tocIds = useMemo(() => toc.map((item) => item.id), [toc]);
  const activeHeading = useActiveHeading(tocIds);

  const selectSection = (id) => {
    navigate(id ? { pathname: '/docs', hash: id } : '/docs');
    window.scrollTo({ top: 0, behavior: (utils.prefersReducedMotion() ? 'auto' : 'smooth') });
    setMobileNavOpen(false);
  };

  const copyLink = async () => {
    if (!(await utils.copyText(window.location.href))) return;
    setLinkCopied(true);
    window.setTimeout(() => setLinkCopied(false), 1400);
  };

  useEffect(() => {
    document.title = activeSection ? `${activeSection.title} · ${documentationMeta.product}` : documentationMeta.product;
    return () => { document.title = documentationMeta.product; };
  }, [activeSection]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const wide = activeSection && ['architecture-simulator', 'live-hook-lab'].includes(activeSection.id);
  // The load lab needs the width more than a one-entry "On this page".
  const fullWidth = activeSection?.id === 'architecture-simulator';
  const pagination = (
    <footer className="docs-pagination">
      {previous ? (
        <button onClick={() => selectSection(previous.id)} type="button">
          <ArrowLeftOutlined /><span><small>Previous</small><strong>{previous.title}</strong></span>
        </button>
      ) : <span />}
      {next && (
        <button className="docs-pagination__next" onClick={() => selectSection(next.id)} type="button">
          <span><small>Next</small><strong>{next.title}</strong></span><ArrowRightOutlined />
        </button>
      )}
    </footer>
  );

  return (
    <div className="docs-shell">
      <a className="docs-skip-link" href="#main-content">Skip to content</a>
      <header className="docs-header">
        <div className="docs-header__brand">
          <button className="docs-menu-button" aria-label="Open documentation navigation" onClick={() => setMobileNavOpen(true)} type="button">
            <MenuOutlined />
          </button>
          <span className="docs-header__mark"><BookOutlined /></span>
          <div><strong>{documentationMeta.product}</strong><small>{documentationMeta.edition}</small></div>
          <Tag bordered={false}>v{documentationMeta.version}</Tag>
        </div>
        <button className="docs-search-trigger" onClick={() => setSearchOpen(true)} type="button">
          <SearchOutlined aria-hidden="true" /><span>Search documentation</span><kbd>{isMac ? '⌘ K' : 'Ctrl K'}</kbd>
        </button>
        <div className="docs-header__actions">
          <Tooltip title={isDark ? 'Use light theme' : 'Use dark theme'}>
            <Button aria-label={isDark ? 'Use light theme' : 'Use dark theme'} icon={isDark ? <SunOutlined /> : <MoonOutlined />} onClick={toggle} type="text" />
          </Tooltip>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(isAuthenticated ? '/admin' : '/login')}>
            {isAuthenticated ? 'Workspace' : 'Sign in'}
          </Button>
        </div>
      </header>

      <div className={`docs-layout${fullWidth ? ' docs-layout--full' : ''}`}>
        <aside className="docs-sidebar">
          <NavContent activeId={activeSection?.id ?? null} onSelect={selectSection} />
          <div className="docs-sidebar__status"><i /><span><strong>Public reference</strong><small>Updated {documentationMeta.updated}</small></span></div>
        </aside>

        <main className="docs-main" id="main-content" tabIndex={-1}>
          {!activeSection ? <DocsHome onSelect={selectSection}>{pagination}</DocsHome> : (
            <article className={`docs-article${wide ? ' docs-article--wide' : ''}`}>
              <div className="docs-article__meta">
                <span>{activeSection.eyebrow}</span>
                <span>{activeSection.audience}</span>
                <span>{activeSection.readTime} read</span>
              </div>
              <div className="docs-article__title-row">
                <div>
                  <h1>{activeSection.title}</h1>
                  <p>{activeSection.summary}</p>
                </div>
                <Tooltip title={linkCopied ? 'Link copied' : 'Copy link'}>
                  <Button aria-label="Copy documentation link" icon={linkCopied ? <CheckCircleOutlined /> : <LinkOutlined />} onClick={copyLink} />
                </Tooltip>
              </div>
              <div className="docs-article__rule"><span>{String(activeIndex + 1).padStart(2, '0')}</span><i /></div>

              <div className="docs-content">
                {activeSection.blocks.map((block, index) => (
                  <DocumentationBlock block={block} index={index} key={`${activeSection.id}-${index}`} />
                ))}
              </div>
              {pagination}
            </article>
          )}

        </main>

        {!fullWidth && <aside className="docs-toc" aria-label="On this page">
          <strong>On this page</strong>
          {toc.map((item) => (
            <button
              aria-current={activeHeading === item.id ? 'location' : undefined}
              className={activeHeading === item.id ? 'is-active' : ''}
              key={item.id}
              onClick={() => document.getElementById(item.id)?.scrollIntoView({ behavior: (utils.prefersReducedMotion() ? 'auto' : 'smooth'), block: 'start' })}
              type="button"
            >
              {item.title}
            </button>
          ))}
          {!toc.length && <span className="docs-toc__empty">{activeSection ? 'This page has no sections.' : 'Pick a task or a page to begin.'}</span>}
          <div className="docs-toc__help"><InfoCircleOutlined /><span><strong>Edit this page</strong><small>{activeSection ? `packages/framework-ui/src/pages/docs/content/${activeSection.track}/${activeSection.id}.md` : 'packages/framework-ui/src/pages/docs/content/'}</small></span></div>
        </aside>}
      </div>

      <Drawer
        className="docs-mobile-drawer"
        closeIcon={<CloseOutlined />}
        onClose={() => setMobileNavOpen(false)}
        open={mobileNavOpen}
        placement="left"
        title="Documentation"
        width={310}
      >
        <NavContent activeId={activeSection?.id ?? null} onSelect={selectSection} />
      </Drawer>

      <SearchDialog onClose={() => setSearchOpen(false)} onSelect={selectSection} open={searchOpen} />
    </div>
  );
}
