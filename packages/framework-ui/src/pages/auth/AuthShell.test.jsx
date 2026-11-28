import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { normalizeLoginPage, normalizeLoginUi } from '../../core/config/loginUi';
import AuthShell from './AuthShell';

const options = vi.hoisted(() => ({ value: null }));
vi.mock('./useLoginOptions', () => ({ default: () => options.value }));

const ACME = {
  brand: { name: 'Acme Paints', caption: 'Operations', mark: 'A' },
  headline: 'Every order, mixed right.',
  message: 'Stock, orders and deliveries for every Acme branch.',
  highlights: [{ title: 'Live stock', detail: 'across all branches' }, { title: 'Orders', detail: '' }],
  coverImage: 'https://images.example/cover.jpg',
  helpUrl: 'https://acmepaints.example/help',
};
const page = (layout) => normalizeLoginPage({ ...ACME, layout });
const form = <form aria-label="Sign in form"><button type="submit">Sign in</button></form>;

beforeEach(() => { options.value = { page: page('centered'), isLoading: false, identifiers: [] }; });
afterEach(cleanup);

describe('sign-in frame', () => {
  it('centered: the brand above one card, the supporting text under it, no headline', () => {
    render(<AuthShell page={page('centered')}>{form}</AuthShell>);
    expect(screen.getByText('Acme Paints')).toBeTruthy();
    expect(screen.getByRole('form', { name: 'Sign in form' })).toBeTruthy();
    expect(screen.getByText(ACME.message)).toBeTruthy();
    expect(screen.queryByRole('heading', { name: ACME.headline })).toBeNull();
    expect(screen.getByRole('link', { name: 'Help' }).getAttribute('href')).toBe(ACME.helpUrl);
  });

  it('split: a brand panel with the headline and numbered highlights beside the form', () => {
    render(<AuthShell page={page('split')}>{form}</AuthShell>);
    const panel = screen.getByRole('region', { name: 'Acme Paints' });
    expect(within(panel).getByRole('heading', { name: ACME.headline })).toBeTruthy();
    expect(within(panel).getAllByRole('listitem').map((item) => item.textContent)).toEqual(['01Live stock across all branches', '02Orders']);
    expect(screen.getByRole('form', { name: 'Sign in form' })).toBeTruthy();
  });

  it('cover: the picture behind the headline, or the brand colour without one', () => {
    const { unmount } = render(<AuthShell page={page('cover')}>{form}</AuthShell>);
    const panel = screen.getByRole('region', { name: 'Acme Paints' });
    expect(panel.style.backgroundImage).toContain('https://images.example/cover.jpg');
    unmount();

    render(<AuthShell page={normalizeLoginPage({ ...ACME, layout: 'cover', coverImage: '' })}>{form}</AuthShell>);
    expect(screen.getByRole('region', { name: 'Acme Paints' }).style.backgroundImage).toBe('');
  });

  it('uses the saved settings when none are passed, and shows nothing while they load', () => {
    options.value = { page: page('split'), isLoading: true, identifiers: [] };
    const { container, rerender } = render(<AuthShell>{form}</AuthShell>);
    expect(container.querySelector('main[aria-busy="true"]')).toBeTruthy();
    expect(screen.queryByRole('form')).toBeNull();

    options.value = { page: page('split'), isLoading: false, identifiers: [] };
    rerender(<AuthShell>{form}</AuthShell>);
    expect(screen.getByRole('heading', { name: ACME.headline })).toBeTruthy();
  });
});

describe('login_ui values', () => {
  it('fill gaps with the defaults: the centered layout and a neutral brand', () => {
    expect(normalizeLoginPage(undefined)).toEqual({
      layout: 'centered', headline: '', message: '', highlights: [], coverImage: '', helpUrl: '',
      brand: { name: 'Workspace', caption: '', mark: 'W' },
    });
    expect(normalizeLoginUi({ layout: 'fancy', highlights: [{ title: '' }, { title: 'A' }, { title: 'B' }, { title: 'C' }, { title: 'D' }] }).highlights)
      .toEqual([{ title: 'A', detail: '' }, { title: 'B', detail: '' }, { title: 'C', detail: '' }]);
  });
});
