import { afterEach, describe, expect, it, vi } from 'vitest';
import { useEffect } from 'react';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { App as AntdApp } from 'antd';
import { ThemeProvider } from '../../utils/ThemeProvider';
import Documentation from './Documentation';

const onLocation = vi.fn();
const currentLocation = () => onLocation.mock.lastCall[0];
function LocationProbe() {
  const location = useLocation();
  useEffect(() => onLocation(location), [location]);
  return null;
}

function renderDocs(entry) {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <ThemeProvider>
        <AntdApp>
          <Documentation />
          <LocationProbe />
        </AntdApp>
      </ThemeProvider>
    </MemoryRouter>,
  );
}

afterEach(() => cleanup());

describe('Documentation page', () => {
  it('opens on the task home with the sidebar grouped into four tracks', () => {
    renderDocs('/docs');
    expect(screen.getByRole('heading', { level: 1, name: 'What do you want to do?' })).toBeTruthy();
    const nav = screen.getAllByRole('navigation', { name: 'Documentation sections' })[0];
    for (const track of ['Learn', 'Build', 'Operate', 'Reference']) expect(within(nav).getByText(track)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Understand how it works/ }));
    expect(currentLocation().hash).toBe('#follow-one-request');
  });

  it('renders a Markdown page with the embedded request walkthrough', () => {
    renderDocs('/docs#follow-one-request');
    expect(screen.getByRole('heading', { level: 1, name: 'Follow one request' })).toBeTruthy();
    expect(screen.getByText('1. Page and hook')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Next stage' }));
    expect(screen.getByText('2. Data provider and apiClient')).toBeTruthy();

    const toc = screen.getByRole('complementary', { name: 'On this page' });
    expect(within(toc).getByRole('button', { name: 'Where it can stop' })).toBeTruthy();
  });

  it('opens Hook Studio on the hook and tab named in the URL', () => {
    renderDocs('/docs?hook=useList&tab=contract#live-hook-lab');
    const workbench = screen.getByRole('region', { name: 'useList playground' });
    expect(within(workbench).getByRole('tab', { name: /Contract/, selected: true })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /useOne/ }));
    expect(currentLocation().search).toContain('hook=core-useOne');
    expect(currentLocation().search).toContain('tab=preview');
    expect(currentLocation().hash).toBe('#live-hook-lab');
  });
});
