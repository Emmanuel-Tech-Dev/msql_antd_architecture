import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { parseDocument } from './markdownBlocks';
import RequestLifecycle from './RequestLifecycle';

const [block] = parseDocument([
  '## Lifecycle',
  ':::lifecycle PUT /api/invoices/12',
  'out Browser | apiClient | adds the token',
  'out API server | Rate limit | per IP',
  'refuse 429 | Too many requests',
  'out API server | Sign-in check | token valid',
  'refuse 401 | token expired',
  'turn Database | MySQL',
  'back API server | Response | { data }',
  'back Browser | Page re-renders | from server state',
  'retry Sign-in check → apiClient | Refresh once and retry.',
  'note Refusals come back the same way.',
  ':::',
].join('\n')).blocks;

afterEach(cleanup);

describe('Request lifecycle', () => {
  it('reads as one numbered list, in request order, with each refusal on its step', () => {
    const { container } = render(<RequestLifecycle block={block} headingId="lifecycle" />);
    expect(screen.getByRole('heading', { name: 'Lifecycle' })).toBeTruthy();

    const steps = [...container.querySelectorAll('.docs-lifecycle__steps ol > li')];
    const titles = steps.map((item) => item.querySelector('strong').textContent);
    expect(titles).toEqual(['apiClient', 'Rate limit', 'Sign-in check', 'MySQL', 'Response', 'Page re-renders']);
    expect(screen.getByText('Refused with 401: token expired')).toBeTruthy();
    expect(screen.getByText('Refusals come back the same way.')).toBeTruthy();
  });

  it('draws the round trip: refusals beside their step, the response climbing back, the retry loop', () => {
    const { container } = render(<RequestLifecycle block={block} headingId="lifecycle" />);
    const map = container.querySelector('.docs-lifecycle__map');
    expect(map.getAttribute('aria-hidden')).toBe('true');

    const bands = [...map.querySelectorAll('.docs-lifecycle__band')].map((band) => [band.textContent, band.style.gridRow]);
    expect(bands).toEqual([['Browser', '2 / 3'], ['API server', '3 / 5'], ['Database', '5 / 6']]);

    const response = [...map.querySelectorAll('.docs-lifecycle__card')].find((card) => card.textContent.includes('Response'));
    expect(response.parentElement.style.gridRow).toBe('4');
    expect(response.parentElement.style.gridColumn).toBe('5');

    expect(map.querySelectorAll('.docs-lifecycle__refusal').length).toBe(2);
    expect([...map.querySelectorAll('.docs-lifecycle__rail')].map((rail) => rail.className.split('--')[1])).toEqual(['to', 'pass', 'from']);
    expect(map.querySelector('.docs-lifecycle__retry-text').textContent).toBe('Refresh once and retry.');
  });
});
