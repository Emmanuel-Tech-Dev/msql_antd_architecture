import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import ArchitectureSimulator from './ArchitectureSimulator';

afterEach(() => cleanup());

describe('Framework Load Lab', () => {
  it('traces the hook you pick through the real files and shows where it stops', () => {
    render(<ArchitectureSimulator headingId="lab" title="Framework Load Lab" />);
    expect(screen.getByRole('heading', { level: 3, name: /Trace · useCreate/ })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /^useCan no request/ }));
    const trace = screen.getByRole('heading', { level: 3, name: /Trace · useCan/ }).closest('section');
    fireEvent.click(within(trace).getByRole('button', { name: 'Next step' }));
    expect(within(trace).getByText(/answered from bootstrap permissions/)).toBeTruthy();
    expect(within(trace).getByText(/The server still enforces it/)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /^useList GET/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Role lacks resource' }));
    const listTrace = screen.getByRole('heading', { level: 3, name: /Trace · useList/ }).closest('section');
    for (let step = 0; step < 12; step += 1) fireEvent.click(within(listTrace).getByRole('button', { name: 'Next step' }));
    expect(within(listTrace).getByText('403 ERR_ACCESS_DENIED')).toBeTruthy();
  });

  it('animates a trace someone starts, step by step', async () => {
    render(<ArchitectureSimulator headingId="lab" />);
    fireEvent.click(screen.getByRole('button', { name: /^useList GET/ }));
    const trace = screen.getByRole('heading', { level: 3, name: /Trace · useList/ }).closest('section');
    expect(within(trace).getByRole('button', { name: 'Pause' })).toBeTruthy();
    await waitFor(() => expect(trace.querySelectorAll('li.is-ok').length).toBeGreaterThan(2), { timeout: 4000 });
  });

  it('opens a file to show the hooks that pass through it', () => {
    render(<ArchitectureSimulator headingId="lab" />);
    fireEvent.keyDown(screen.getByRole('button', { name: /^AccessProvider/ }), { key: 'Enter' });
    const inspector = screen.getByRole('heading', { level: 3, name: /AccessProvider/ }).closest('section');
    expect(within(inspector).getByRole('button', { name: 'useCan' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Start load' }));
    expect(screen.getByRole('button', { name: 'Pause load' })).toBeTruthy();
    expect(screen.getByText(/req\/s from 3 hooks/)).toBeTruthy();
  });
});
