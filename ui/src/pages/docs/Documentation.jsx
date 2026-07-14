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
  documentationGroups,
  documentationMeta,
  documentationSearchIndex,
  documentationSections,
} from './documentationContent';
import HookLab from './HookLab';
import ArchitectureSimulator from './architecture-simulator/ArchitectureSimulator';
import './Documentation.css';

const toneIcons = {
  note: <InfoCircleOutlined />,
  warning: <WarningOutlined />,
  danger: <AlertOutlined />,
};

function NavContent({ activeId, onSelect }) {
  return (
    <nav className="docs-nav" aria-label="Documentation sections">
      {documentationGroups.map((group) => (
        <div className="docs-nav__group" key={group}>
          <span className="docs-nav__label">{group}</span>
          {documentationSections
            .filter((section) => section.group === group)
            .map((section) => (
              <button
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
    </nav>
  );
}

function CodeBlock({ block }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(block.value);
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
  const headingId = block.title
    ? `section-${index}-${block.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
    : undefined;

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
          {block.items.map((item) => <li key={item}>{item}</li>)}
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
            <li key={item.title}>
              <span>{String(itemIndex + 1).padStart(2, '0')}</span>
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
            <li key={item}>
              <span>{itemIndex + 1}</span>
              <strong>{item}</strong>
              {itemIndex < block.items.length - 1 && <ArrowRightOutlined aria-hidden />}
            </li>
          ))}
        </ol>
      </section>
    );
  }

  if (block.type === 'code') return <CodeBlock block={block} />;
  if (block.type === 'hook-lab') return <HookLab />;
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
        <SearchOutlined />
        <Input
          autoFocus
          bordered={false}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search architecture, hooks, security, operations…"
          value={query}
        />
        <button aria-label="Close search" onClick={close} type="button"><CloseOutlined /></button>
      </div>
      <div className="docs-search__results">
        {results.length ? results.map((result) => (
          <button
            key={result.id}
            onClick={() => { onSelect(result.id); close(); }}
            type="button"
          >
            <span className="docs-search__result-icon"><FileTextOutlined /></span>
            <span><small>{result.group}</small><strong>{result.title}</strong><em>{result.summary}</em></span>
            <ArrowRightOutlined />
          </button>
        )) : <Empty description="No documentation sections match that search" image={Empty.PRESENTED_IMAGE_SIMPLE} />}
      </div>
      <div className="docs-search__footer"><span>Search covers technical and non-technical guidance</span><kbd>Esc</kbd></div>
    </Modal>
  );
}

export default function Documentation() {
  const navigate = useNavigate();
  const location = useLocation();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const { isDark, toggle } = useTheme();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const requestedId = location.hash.replace('#', '');
  const activeIndex = Math.max(0, documentationSections.findIndex((section) => section.id === requestedId));
  const activeSection = documentationSections[activeIndex];
  const previous = documentationSections[activeIndex - 1];
  const next = documentationSections[activeIndex + 1];
  const toc = activeSection.blocks
    .map((block, index) => block.title && !['callout', 'code'].includes(block.type)
      ? { index, title: block.title, id: `section-${index}-${block.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}` }
      : null)
    .filter(Boolean);

  const selectSection = (id) => {
    navigate(`/docs#${id}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setMobileNavOpen(false);
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setLinkCopied(true);
    window.setTimeout(() => setLinkCopied(false), 1400);
  };

  useEffect(() => {
    document.title = `${activeSection.title} · ${documentationMeta.product}`;
    return () => { document.title = documentationMeta.product; };
  }, [activeSection.title]);

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

  return (
    <div className="docs-shell">
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
          <SearchOutlined /><span>Search documentation</span><kbd>Ctrl K</kbd>
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

      <div className="docs-layout">
        <aside className="docs-sidebar">
          <NavContent activeId={activeSection.id} onSelect={selectSection} />
          <div className="docs-sidebar__status"><i /><span><strong>Public reference</strong><small>Updated {documentationMeta.updated}</small></span></div>
        </aside>

        <main className="docs-main" id="main-content">
          <article className={`docs-article${activeSection.id === 'architecture-simulator' ? ' docs-article--wide' : ''}`}>
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
          </article>
        </main>

        <aside className="docs-toc" aria-label="On this page">
          <strong>On this page</strong>
          {toc.map((item) => (
            <button
              key={item.id}
              onClick={() => document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              type="button"
            >
              {item.title}
            </button>
          ))}
          <div className="docs-toc__help"><InfoCircleOutlined /><span><strong>Keep this accurate</strong><small>Update documentation with every architecture or operational change.</small></span></div>
        </aside>
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
        <NavContent activeId={activeSection.id} onSelect={selectSection} />
      </Drawer>

      <SearchDialog onClose={() => setSearchOpen(false)} onSelect={selectSection} open={searchOpen} />
    </div>
  );
}
