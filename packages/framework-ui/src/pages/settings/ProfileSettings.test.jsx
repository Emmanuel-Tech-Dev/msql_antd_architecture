import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { App as AntdApp } from 'antd';
import { AuthProviderContext } from '../../core/provider/AuthProvider';
import { useResourceStore } from '../../core/provider/ResourceProvider';
import useAuthStore from '../../store/authStore';
import { ThemeProvider } from '../../utils/ThemeProvider';
import ProfileSettings from './ProfileSettings';

const USER = {
  custom_id: 'REG20260412093371', name: 'Ama Mensah', email: 'ama.mensah@acme-paints.com', phone_no: '0244123456',
  status: 1, oauth_provider: null, createdAt: '2026-04-12T09:00:00', last_login: null,
};

function renderPage() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={['/admin/profile']}>
        <ThemeProvider>
          <AntdApp>
            <AuthProviderContext.Provider value={{ changePassword: vi.fn() }}>
              <ProfileSettings />
            </AuthProviderContext.Provider>
          </AntdApp>
        </ThemeProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  useAuthStore.setState({
    user: USER,
    roles: ['Admin', 'Finance'],
    permissions: ['read:invoices', 'create:invoices', 'approve:invoices', 'update:invoices', 'read:customers'],
  });
  useResourceStore.setState({
    isReady: true,
    browserRoutes: [
      { resource: 'Invoices', resource_path: '/admin/invoices' },
      { resource: 'Invoice details', resource_path: '/admin/invoices/:id' },
      { resource: 'Customers', resource_path: '/admin/customers' },
    ],
  });
});
afterEach(() => cleanup());

describe('Profile page', () => {
  test('shows the account facts, roles, and access grouped by area in plain words', () => {
    renderPage();
    expect(screen.getByRole('heading', { level: 1, name: 'Ama Mensah' })).toBeTruthy();
    const band = screen.getByRole('region', { name: 'Your account' });
    expect(within(band).getByText('Active')).toBeTruthy();
    expect(within(band).getByText('Email and password')).toBeTruthy();
    expect(within(band).getByText('12 Apr 2026')).toBeTruthy();
    expect(within(band).getByText('REG20260412093371')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Change photo' })).toBeTruthy();

    const access = screen.getByRole('region', { name: 'What you can do' });
    expect(within(access).getByText('From your roles, Admin and Finance. An administrator can change them.')).toBeTruthy();
    expect(within(access).getByText('View · Add · Edit · Approve')).toBeTruthy();
    const areas = within(access).getAllByRole('listitem').map((item) => item.textContent);
    expect(areas).toEqual(['CustomersView', 'InvoicesView · Add · Edit · Approve']);
    expect(within(access).getAllByText('Customers')).toHaveLength(2); // the area, and a page you can open
    // Pages with a parameter in their path are not listed.
    expect(within(access).queryByText('Invoice details')).toBeNull();
  });

  test('Save details is enabled only after a change, and Discard brings back the saved values', async () => {
    renderPage();
    const save = screen.getByRole('button', { name: 'Save details' });
    expect(save.disabled).toBe(true);
    await act(async () => { fireEvent.change(screen.getByLabelText('Full name'), { target: { value: 'Ama K. Mensah' } }); });
    expect(save.disabled).toBe(false);
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Discard' })); });
    expect(screen.getByLabelText('Full name').value).toBe('Ama Mensah');
    expect(screen.getByRole('button', { name: 'Save details' }).disabled).toBe(true);
  });

  test('the password checklist follows what is typed', async () => {
    renderPage();
    await act(async () => { fireEvent.change(screen.getByLabelText('Current password'), { target: { value: 'oldsecret1' } }); });
    await act(async () => { fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'Newsecret9' } }); });
    const met = [...document.querySelectorAll('.profile-checks .is-met')].map((item) => item.textContent.replace(/^✓ /, ''));
    expect(met).toEqual(['At least 8 characters', 'Different from your current password', 'A number', 'An upper-case letter']);
  });

  test('a privileged role sees full access instead of a list', () => {
    useAuthStore.setState({ roles: ['SuperAdmin'], permissions: [] });
    renderPage();
    expect(screen.getByText('Full access: your role can do everything in this workspace.')).toBeTruthy();
  });
});
