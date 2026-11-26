import { afterEach, describe, expect, test, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App as AntdApp } from 'antd';
import { DataProviderContext } from '../../core/provider/DataProvider';
import PermissionMatrix from './PermissionsMetrix';

// Stable values, like the real hook's: a new list on every render would make
// the matrix reload its rows forever.
const access = vi.hoisted(() => ({
  loading: false,
  saving: false,
  isDirty: false,
  assignedSet: new Set(['read:invoices', 'approve:invoices']),
  allItems: [
    { permission_name: 'read:invoices' },
    { permission_name: 'create:invoices' },
    { permission_name: 'approve:invoices' },
    { permission_name: 'export:invoices' },
    { permission_name: 'read:customers' },
    { permission_name: 'read:access:user_authority' },
  ],
}));
const handleToggle = vi.hoisted(() => vi.fn());
const reset = vi.hoisted(() => vi.fn());
const save = vi.hoisted(() => vi.fn());
vi.mock('../../hooks/useAccessControl', () => ({
  default: () => ({ ...access, handleToggle, reset, save }),
}));

function renderMatrix() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <AntdApp>
        <DataProviderContext.Provider value={{ getList: vi.fn(), custom: vi.fn() }}>
          <PermissionMatrix role_name="Finance" />
        </DataProviderContext.Provider>
      </AntdApp>
    </QueryClientProvider>,
  );
}

afterEach(() => { cleanup(); handleToggle.mockClear(); });

describe('Capabilities matrix', () => {
  test('actions other than create, read, edit and delete can be assigned too', async () => {
    renderMatrix();
    expect(await screen.findByText('Other actions')).toBeTruthy();

    const approve = screen.getByRole('checkbox', { name: 'approve Invoices' });
    const exportBox = screen.getByRole('checkbox', { name: 'export Invoices' });
    expect(approve.checked).toBe(true);
    expect(exportBox.checked).toBe(false);
    expect(screen.getByText('Approve')).toBeTruthy();

    await act(async () => { fireEvent.click(exportBox); });
    expect(handleToggle).toHaveBeenCalledWith('export:invoices', true);
  });

  test('a row without other actions shows a dash, and names with two colons keep their whole resource', async () => {
    renderMatrix();
    await screen.findByText('Other actions');
    expect(screen.getAllByLabelText('No other actions').length).toBeGreaterThan(0);
    expect(screen.getByText('Access User Authority')).toBeTruthy();
    expect(screen.getByRole('checkbox', { name: 'read Access User Authority' })).toBeTruthy();
  });
});
