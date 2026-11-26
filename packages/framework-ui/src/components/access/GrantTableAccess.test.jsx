import { afterEach, describe, expect, test, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App as AntdApp } from 'antd';
import { DataProviderContext } from '../../core/provider/DataProvider';
import GrantTableAccess from './GrantTableAccess';

const field = (column_name, col_real_name, type, config, required = 0) => ({
  column_name, col_real_name, type, config, required, form_visible: 1, list_visible: 1, editable: 1, disabled: 0, section_key: null, col_span: 24,
});
// The access_table_grants form as migration 029 describes it.
const FORM = {
  table: { table_name: 'access_table_grants', label: 'Grant table access', singular_label: 'Table access', form_layout: 'drawer', form_columns: 1, sections: [] },
  fields: [
    field('tables', 'Tables', 'multiLookup', { lookup: 'grantable_tables', placeholder: 'Choose tables' }, 1),
    field('actions', 'Actions', 'checkboxGroup', { default: 'read', options: ['read', 'create', 'update', 'delete'].map((value) => ({ value, label: value[0].toUpperCase() + value.slice(1) })) }),
    field('custom_actions', 'Custom actions', 'text', { placeholder: 'e.g. export, approve' }),
  ],
  lookups: [],
};
const row = (permission, status, extra = {}) => ({ permission, status, endpointCount: 5, missingLinks: 0, links: [], ...extra });
const PLAN = {
  tables: [{ table: 'volunteer', permissions: [row('read:volunteer', 'new'), row('export:volunteer', 'new', { custom: true, endpointCount: 0 })] }],
  totals: { newPermissions: 2, newEndpoints: 5, newLinks: 5, unchanged: 0 },
};

function renderDrawer(dataProvider) {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <AntdApp>
        <DataProviderContext.Provider value={dataProvider}><GrantTableAccess open onClose={() => {}} /></DataProviderContext.Provider>
      </AntdApp>
    </QueryClientProvider>,
  );
}

afterEach(() => cleanup());

describe('Grant table access', () => {
  test('the form comes from metadata; the preview follows it; Create posts the grant', { timeout: 60_000 }, async () => {
    const dataProvider = {
      custom: vi.fn(async ({ url }) => {
        if (url === 'api/v1/metadata/access_table_grants') return { data: FORM };
        if (url === 'api/v1/lookups/grantable_tables') return { data: [{ value: 'volunteer', label: 'Volunteers' }] };
        if (url === 'access/table_access/preview') return { data: PLAN };
        if (url === 'access/table_access') return { data: { ...PLAN, created: { permissions: 2, endpoints: 5, links: 5 } } };
        throw new Error(`unexpected ${url}`);
      }),
    };
    renderDrawer(dataProvider);

    // Fields rendered from the metadata, with Read ticked by its default.
    const tables = await screen.findByLabelText('Tables');
    expect(screen.getByLabelText('Read').checked).toBe(true);
    expect(screen.getByRole('button', { name: 'Create permissions' }).disabled).toBe(true);

    await act(async () => { fireEvent.mouseDown(tables); });
    await act(async () => { fireEvent.click(await screen.findByTitle('Volunteers')); });
    await act(async () => { fireEvent.change(screen.getByLabelText('Custom actions'), { target: { value: 'export' } }); });

    const preview = await screen.findByRole('region', { name: 'Volunteers' }, { timeout: 5000 });
    expect(within(preview).getByText('read:volunteer')).toBeTruthy();
    expect(within(preview).getByText('No endpoints (custom)')).toBeTruthy();
    expect(screen.getByText('2 new permissions · 5 endpoints')).toBeTruthy();
    const previewCall = dataProvider.custom.mock.calls.filter(([request]) => request.url === 'access/table_access/preview').at(-1)[0];
    expect(previewCall.payload).toEqual({ tables: ['volunteer'], actions: ['read'], custom_actions: 'export' });

    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Create 2 permissions' })); });
    expect(await screen.findByText('Access created', {}, { timeout: 5000 })).toBeTruthy();
    const grantCall = dataProvider.custom.mock.calls.find(([request]) => request.url === 'access/table_access')[0];
    expect(grantCall).toMatchObject({ method: 'post', payload: { tables: ['volunteer'], actions: ['read'], custom_actions: 'export' } });
    expect(screen.getByText(/Created 2 permissions and linked 5 endpoints for Volunteers/)).toBeTruthy();
  });

  test('nothing is previewed until a table and an action are chosen', { timeout: 60_000 }, async () => {
    const dataProvider = { custom: vi.fn(async ({ url }) => (url.includes('metadata') ? { data: FORM } : { data: [] })) };
    renderDrawer(dataProvider);
    await screen.findByLabelText('Tables');
    expect(screen.getByText('Choose at least one table and one action to see what will be created.')).toBeTruthy();
    await waitFor(() => expect(dataProvider.custom.mock.calls.some(([request]) => request.url.startsWith('access/'))).toBe(false));
  });
});
