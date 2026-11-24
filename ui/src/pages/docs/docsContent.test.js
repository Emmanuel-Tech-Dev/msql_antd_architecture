import { describe, expect, it } from 'vitest';
import { blocksToMarkdown, parseDocument } from './markdownBlocks';
import { documentationNavigation, documentationSearchIndex, documentationSections } from './docsContent';

describe('documentation Markdown', () => {
  it('parses every construct the docs use', () => {
    const { meta, blocks } = parseDocument([
      '---',
      'id: sample',
      'title: Sample: a page',
      '---',
      '',
      'A paragraph',
      'over two lines.',
      '',
      '## Steps',
      '',
      '1. **First** — Do this.',
      '2. **Second** — Then that.',
      '',
      '## A table',
      '',
      '| Method | Path |',
      '| --- | --- |',
      '| GET \\| PUT | /api/x |',
      '',
      ':::warning Careful',
      'Mind the gap.',
      ':::',
      '',
      '## Flow',
      '',
      ':::flow',
      '- One',
      '- Two',
      ':::',
      '',
      '```jsx Example',
      'const a = 1;',
      '',
      'const b = 2;',
      '```',
      '',
      '::request-walkthrough Step through it',
    ].join('\n'));

    expect(meta).toEqual({ id: 'sample', title: 'Sample: a page' });
    expect(blocks).toEqual([
      { type: 'paragraph', text: 'A paragraph over two lines.' },
      { type: 'steps', title: 'Steps', items: [{ title: 'First', text: 'Do this.' }, { title: 'Second', text: 'Then that.' }] },
      { type: 'table', title: 'A table', columns: ['Method', 'Path'], rows: [['GET | PUT', '/api/x']] },
      { type: 'callout', title: 'Careful', text: 'Mind the gap.', tone: 'warning' },
      { type: 'flow', title: 'Flow', items: ['One', 'Two'] },
      { type: 'code', title: 'Example', language: 'jsx', value: 'const a = 1;\n\nconst b = 2;' },
      { type: 'request-walkthrough', title: 'Step through it' },
    ]);
  });

  it('round-trips blocks through Markdown', () => {
    const blocks = [
      { type: 'bullets', title: 'Notes', items: ['a | b', 'c'] },
      { type: 'callout', title: 'Heads up', text: 'Text', tone: 'note' },
      { type: 'hook-lab' },
    ];
    expect(parseDocument(blocksToMarkdown({ id: 'x' }, blocks)).blocks).toEqual(blocks);
  });

  it('loads every page into exactly one track, with unique ids', () => {
    const ids = documentationSections.map((section) => section.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBeGreaterThanOrEqual(23);
    expect(documentationNavigation.map((track) => track.key)).toEqual(['learn', 'build', 'operate', 'reference']);
    expect(documentationNavigation.flatMap((track) => track.groups.flatMap((group) => group.pages)).length).toBe(ids.length);
    for (const section of documentationSections) {
      expect(section.title && section.summary && section.group && section.blocks.length).toBeTruthy();
    }
    expect(documentationSearchIndex.find((entry) => entry.id === 'follow-one-request').group).toBe('Learn · Get oriented');
  });
});
