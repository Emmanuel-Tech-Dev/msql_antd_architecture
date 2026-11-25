import { parseDocument } from './markdownBlocks';

// The documentation is one Markdown file per page under content/<track>/.
// Each file's front matter places it: track, group, order.
const files = import.meta.glob('./content/*/*.md', { query: '?raw', import: 'default', eager: true });

export const documentationMeta = {
  product: 'MySQL ORM Framework',
  edition: 'Production architecture guide',
  version: '1.2',
  updated: '24 November 2026',
};

export const documentationTracks = [
  { key: 'learn', label: 'Learn', description: 'How the framework works and why' },
  { key: 'build', label: 'Build', description: 'Tables, screens, hooks and server code' },
  { key: 'operate', label: 'Operate', description: 'Deploy, secure and fix the running system' },
  { key: 'reference', label: 'Reference', description: 'Hooks, endpoints and files' },
];
const trackRank = Object.fromEntries(documentationTracks.map((track, index) => [track.key, index]));

export const documentationSections = Object.entries(files)
  .map(([file, text]) => {
    const { meta, blocks } = parseDocument(text);
    if (!meta.id || !(meta.track in trackRank)) throw new Error(`${file}: front matter needs id and a known track`);
    return { ...meta, order: Number(meta.order) || 0, blocks };
  })
  .sort((a, b) => trackRank[a.track] - trackRank[b.track] || a.order - b.order);

// Sidebar structure: track → its groups (in page order) → pages.
export const documentationNavigation = documentationTracks.map((track) => {
  const pages = documentationSections.filter((section) => section.track === track.key);
  const groups = [...new Set(pages.map((page) => page.group))]
    .map((group) => ({ name: group, pages: pages.filter((page) => page.group === group) }));
  return { ...track, groups };
});

function collectText(value) {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(collectText).join(' ');
  if (value && typeof value === 'object') return Object.values(value).map(collectText).join(' ');
  return '';
}

export const documentationSearchIndex = documentationSections.map((section) => ({
  id: section.id,
  title: section.title,
  group: `${documentationTracks[trackRank[section.track]].label} · ${section.group}`,
  summary: section.summary,
  text: collectText(section).toLowerCase(),
}));
