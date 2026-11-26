import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { blocksToMarkdown, parseDocument } from './markdownBlocks';
import FlowDiagram from './FlowDiagram';

const phased = parseDocument([
  '## Startup',
  ':::flow',
  '# Prepare',
  '- Load environment variables',
  '- Create the server',
  '# Before sign-in',
  "- [beforeAuth] Run the project's middleware",
  '- Listen on PORT',
  ':::',
].join('\n')).blocks[0];

afterEach(cleanup);

describe('Flow', () => {
  it('reads phases and keeps them through a round trip', () => {
    expect(phased).toEqual({
      type: 'flow',
      title: 'Startup',
      items: ['Load environment variables', 'Create the server', "[beforeAuth] Run the project's middleware", 'Listen on PORT'],
      phases: [{ name: 'Prepare', from: 0 }, { name: 'Before sign-in', from: 2 }],
    });
    expect(parseDocument(blocksToMarkdown({ id: 'x' }, [phased])).blocks).toEqual([phased]);
  });

  it('groups the steps by phase, numbers them across phases and shows where your code runs', () => {
    const { container } = render(<FlowDiagram block={phased} headingId="startup" />);

    const prepare = screen.getByRole('group', { name: 'Prepare' });
    expect(within(prepare).getAllByRole('listitem').map((item) => item.textContent)).toEqual(['01Load environment variables', '02Create the server']);

    const beforeSignIn = screen.getByRole('group', { name: 'Before sign-in' });
    expect(beforeSignIn.querySelector('ol').getAttribute('start')).toBe('3');
    expect(within(beforeSignIn).getByText('beforeAuth').closest('code')).toBeTruthy();
    expect(within(beforeSignIn).getByText("Run the project's middleware")).toBeTruthy();

    expect(container.querySelector('.docs-flow__head')).toBeTruthy();
    expect(container.querySelector('.docs-flow__step--last').textContent).toContain('Listen on PORT');
  });

  it('draws a flow without phases or tags as one band of cards', () => {
    const plain = parseDocument(':::flow\n- One\n- Two\n:::').blocks[0];
    const { container } = render(<FlowDiagram block={plain} headingId="plain" />);
    expect(container.querySelectorAll('.docs-flow__band').length).toBe(1);
    expect(container.querySelector('.docs-flow__phase')).toBeNull();
    expect(container.querySelector('.docs-flow__head')).toBeNull();
    expect(screen.getAllByRole('listitem').length).toBe(2);
  });
});
