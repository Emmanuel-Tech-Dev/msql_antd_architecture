import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { App as AntdApp } from 'antd';
import { DataProviderContext } from '../../../core/provider/DataProvider';
import { useStore as useValuesStore } from '../../../store/values-store';
import SignInPageSection from './SignInPageSection';

const BRAND = { name: 'Acme Paints', caption: 'Operations', mark: 'A' };
const custom = vi.fn(async () => ({ data: {} }));

function renderSection({ readOnly = false } = {}) {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <AntdApp>
          <DataProviderContext.Provider value={{ custom, getList: vi.fn() }}>
            <SignInPageSection brand={BRAND} readOnly={readOnly} onEditBrand={vi.fn()} />
          </DataProviderContext.Provider>
        </AntdApp>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  useValuesStore.setState({
    login_ui: [{ id: 4, setting_key: 'login_ui', version: 2, setting_value: JSON.stringify({ layout: 'centered', headline: '', message: '', highlights: [], coverImage: '', helpUrl: '' }) }],
  });
});
afterEach(() => { cleanup(); custom.mockClear(); });

describe('Appearance › Sign-in page', () => {
  test('choosing a layout and a headline, then saving, sends login_ui with its version', async () => {
    renderSection();
    const save = screen.getByRole('button', { name: /Save sign-in page/ });
    expect(save.disabled).toBe(true);

    fireEvent.click(screen.getByRole('radio', { name: /^Split/ }));
    fireEvent.change(screen.getByRole('textbox', { name: /Headline/ }), { target: { value: '  Every order, mixed right.  ' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Highlight 1 title' }), { target: { value: 'Live stock' } });
    expect(save.disabled).toBe(false);

    await act(async () => { fireEvent.click(save); });

    expect(custom).toHaveBeenCalledWith({
      url: 'api/v1/ui-settings/4',
      method: 'put',
      payload: {
        settingKey: 'login_ui',
        expectedVersion: 2,
        settingValue: { layout: 'split', headline: 'Every order, mixed right.', message: '', highlights: [{ title: 'Live stock', detail: '' }], coverImage: '', helpUrl: '' },
      },
    });
  });

  test('shows the sidebar brand, and only lets people who may change appearance edit', () => {
    renderSection({ readOnly: true });
    expect(screen.getAllByText('Acme Paints').length).toBeGreaterThan(0);
    expect(screen.getByRole('radio', { name: /^Split/ }).disabled).toBe(true);
    expect(screen.getByRole('textbox', { name: /Headline/ }).disabled).toBe(true);
  });
});
