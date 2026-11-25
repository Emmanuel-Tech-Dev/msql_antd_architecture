import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { Route } from 'react-router-dom';
import FrameworkApp from './FrameworkApp';
import { configureFramework, frameworkConfig } from './core/config/frameworkConfig';
import * as framework from './index';

afterEach(() => {
  cleanup();
  window.history.pushState({}, '', '/');
});

describe('FrameworkApp', () => {
  it('renders a project public route next to the framework pages', async () => {
    window.history.pushState({}, '', '/hello');
    render(<FrameworkApp publicRoutes={<Route path="/hello" element={<h1>Project page</h1>} />} />);
    expect(await screen.findByRole('heading', { name: 'Project page' })).toBeTruthy();
  });

  it('renders the framework sign-in page', async () => {
    window.history.pushState({}, '', '/login');
    render(<FrameworkApp config={{ apiUrl: 'http://127.0.0.1:9' }} />);
    expect(await screen.findByText('Welcome back', {}, { timeout: 15_000 })).toBeTruthy();
    expect(frameworkConfig.apiUrl).toBe('http://127.0.0.1:9');
  }, 20_000);
});

describe('configureFramework', () => {
  it('keeps known settings and ignores unknown or empty ones', () => {
    configureFramework({ socketUrl: 'http://socket.test', mapProvider: undefined, unknown: 'x' });
    expect(frameworkConfig.socketUrl).toBe('http://socket.test');
    expect(frameworkConfig.mapProvider).toBe('mapbox');
    expect('unknown' in frameworkConfig).toBe(false);
  });
});

describe('package entry', () => {
  it('exports the app, the metadata components and the hooks a project uses', () => {
    for (const name of ['FrameworkApp', 'FrameworkProvider', 'MetadataForm', 'MetadataTable', 'MetadataFields', 'useList', 'useCreate', 'useRecordForm', 'useCan', 'registerFieldType', 'apiClient', 'utils']) {
      expect(framework[name], name).toBeTruthy();
    }
  });
});
