import { describe, expect, it } from 'vitest';
import {
  computeLoad,
  DEFAULT_LOAD_HOOKS,
  findHook,
  HOOKS,
  loadEdges,
  MISSIONS,
  nodeUsage,
  NODES,
  traceHook,
} from './architectureSimulationModel';

const none = new Set();
const load = (overrides) => computeLoad({ users: 60, pace: 4, office: false, hookIds: new Set(DEFAULT_LOAD_HOOKS), failures: none, cacheWarm: 0.97, revokeWave: 0, ...overrides });

describe('Framework Load Lab model', () => {
  it('only routes hooks through files that exist, and every mission answer is a file', () => {
    for (const hook of HOOKS) for (const [node] of hook.steps) expect(NODES[node], `${hook.id} → ${node}`).toBeTruthy();
    for (const mission of MISSIONS) expect(NODES[mission.answer]).toBeTruthy();
    expect(nodeUsage('access').hooks).toEqual(expect.arrayContaining(['useCan', 'FrameworkProvider', 'useAuthorizationEvents']));
  });

  it('stops a call at the file that refuses it', () => {
    const invalid = traceHook(findHook('useCreate'), new Set(['invalid']));
    expect(invalid.ok).toBe(false);
    expect(invalid.result).toBe('400 ERR_VALIDATION_FAILED');
    expect(invalid.steps.find((step) => step.kind === 'bad').node).toBe('meta');
    expect(invalid.steps.at(-2).node).toBe('errors');

    // Reads have no field values, so the invalid-value failure does not touch them.
    expect(traceHook(findHook('useList'), new Set(['invalid'])).ok).toBe(true);
    expect(traceHook(findHook('useList'), new Set(['norole'])).steps.find((step) => step.kind === 'bad').node).toBe('authz');
    expect(traceHook(findHook('useLogin'), new Set(['norole'])).ok).toBe(true);
    expect(traceHook(findHook('useCan'), new Set(['revoke'])).ok).toBe(true);
  });

  it('retries through apiClient when the access token expired', () => {
    const { steps, ok } = traceHook(findHook('useList'), new Set(['expired']));
    expect(ok).toBe(true);
    expect(steps.filter((step) => step.kind === 'retry').map((step) => step.node)).toEqual(['authn', 'api']);
  });

  it('models the real limits: one office IP hits the rate limit, more users fill the pool', () => {
    expect(load({}).limited).toBe(0);
    // Per-user limits: 30 staff behind one address are fine; 250 hit the address guard.
    expect(load({ users: 30, office: true }).limited).toBe(0);
    expect(load({ users: 250, office: true }).limited).toBeGreaterThan(0);
    expect(load({ users: 1, pace: 60 }).limited).toBeGreaterThan(0);
    expect(load({ users: 300, pace: 6 }).poolUse).toBeGreaterThan(load({}).poolUse * 4);
    expect(load({ failures: new Set(['slowdb']) }).p95).toBeGreaterThan(load({}).p95);
    expect(load({ hookIds: new Set(['useCan']) }).rps).toBe(0);
  });

  it('draws load edges only for hooks switched on', () => {
    const edges = loadEdges(new Set(['useList']), none);
    expect(edges.some((edge) => edge.from === 'vtable' && edge.to === 'base')).toBe(true);
    expect(edges.some((edge) => edge.to === 'boot')).toBe(false);
  });
});
