import { afterEach, describe, expect, it } from 'vitest';
import {
  firstAccessibleRoute, isWorkspaceArea, isWorkspacePath, resolvePostLoginPath, setWorkspaceAreas, toRoutePath, workspaceAreaOf,
} from './routeResolver';
import { DEFAULT_SIDER_CONFIG, resolveSiderConfig } from '../config/siderConfig';
import { mergeResources } from '../provider/ResourceProvider';
import { checkAccess } from '../provider/AccessProvider';

describe('toRoutePath', () => {
  it('puts a short name under /admin', () => {
    expect(toRoutePath('invoices')).toBe('/admin/invoices');
    expect(toRoutePath('customers/:id')).toBe('/admin/customers/:id');
  });

  it('keeps a path that starts with a slash as written', () => {
    expect(toRoutePath('/admin/invoices')).toBe('/admin/invoices');
    expect(toRoutePath('/finance/payroll')).toBe('/finance/payroll');
  });

  it('drops spaces and a trailing slash, and gives null for no path', () => {
    expect(toRoutePath('  invoices/ ')).toBe('/admin/invoices');
    expect(toRoutePath('/admin/invoices/')).toBe('/admin/invoices');
    expect(toRoutePath('')).toBeNull();
    expect(toRoutePath(null)).toBeNull();
  });
});

describe('page paths from the database', () => {
  it('reach the sidebar and the route guard as full paths, old and short alike', () => {
    const { browserRoutes } = mergeResources([], [
      { resource: 'Invoices', resource_type: 'BROWSER_ROUTE', resource_path: 'invoices', display_order: 1 },
      { resource: 'Users', resource_type: 'BROWSER_ROUTE', resource_path: '/admin/management/users', display_order: 2 },
      { resource: 'Payroll', resource_type: 'BROWSER_ROUTE', resource_path: '/finance/payroll', display_order: 3 },
      { resource: 'read:invoices', resource_type: 'API_ENDPOINT', resource_path: '/api/invoices' },
    ]);
    expect(browserRoutes.map((route) => route.resource_path)).toEqual(['/admin/invoices', '/admin/management/users', '/finance/payroll']);
  });

  it('let a page be checked by its short name or its full path', () => {
    const check = (resource) => checkAccess({
      resource,
      action: 'navigate',
      roles: ['Finance'],
      browserRoutes: [{ resource: 'Invoices', resource_path: '/admin/invoices' }],
      isReady: true,
    }).can;
    expect(check('invoices')).toBe(true);
    expect(check('/admin/invoices')).toBe(true);
    expect(check('payroll')).toBe(false);
  });
});

describe('workspace areas', () => {
  afterEach(() => setWorkspaceAreas([]));

  it('know /admin always, and the areas FrameworkApp registers', () => {
    expect(isWorkspacePath('/finance/payroll')).toBe(false);
    setWorkspaceAreas(['finance']);
    expect(workspaceAreaOf('/finance/payroll')).toBe('/finance');
    expect(workspaceAreaOf('/admin/invoices')).toBe('/admin');
    expect(isWorkspaceArea('/finance')).toBe(true);
    expect(isWorkspacePath('/financewhatever')).toBe(false);
    expect(isWorkspacePath('/login')).toBe(false);
  });

  it('refuse an area name that is not one path segment', () => {
    expect(() => setWorkspaceAreas(['finance/reports'])).toThrow('one path segment');
  });

  it('send someone back to the page they asked for in any area after sign-in', () => {
    setWorkspaceAreas(['finance']);
    expect(resolvePostLoginPath('/finance/payroll')).toBe('/finance/payroll');
    expect(resolvePostLoginPath('/admin/invoices')).toBe('/admin/invoices');
    expect(resolvePostLoginPath('/elsewhere')).toBe('/admin');
    expect(resolvePostLoginPath('/admin/404')).toBe('/admin');
  });

  it('open an area at its own first page, by sidebar order', () => {
    setWorkspaceAreas(['finance']);
    const routes = [
      { resource_path: '/finance/payroll', display_order: 9 },
      { resource_path: '/admin/invoices', display_order: 1 },
      { resource_path: '/finance/budgets', display_order: 5 },
    ];
    expect(firstAccessibleRoute(routes)).toBe('/admin/invoices');
    expect(firstAccessibleRoute(routes, '/finance')).toBe('/finance/budgets');
  });

  it('let the pinned sidebar page live in any area', () => {
    setWorkspaceAreas(['finance']);
    const pinned = (bottomKey) => resolveSiderConfig([{ setting_key: 'layout.sider', setting_value: { bottomKey } }]).bottomKey;
    expect(pinned('/finance/reports')).toBe('/finance/reports');
    expect(pinned('/finance')).toBe(DEFAULT_SIDER_CONFIG.bottomKey);
    expect(pinned('/login')).toBe(DEFAULT_SIDER_CONFIG.bottomKey);
  });
});
