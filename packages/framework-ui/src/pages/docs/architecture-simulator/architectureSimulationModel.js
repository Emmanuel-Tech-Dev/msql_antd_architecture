// The Framework Load Lab's model: the framework's real files, the path each
// hook takes through them, and a load model driven by the limits in the code
// (3000 requests / 15 min per address and 500 per signed-in user, a MySQL
// pool of 10, a 5-minute permission
// cache). Pure data and functions; the components only draw it.

export const NODE_WIDTH = 186;
export const NODE_HEIGHT = 80;
const GAP_X = 206;
const GAP_Y = 112;
const BAND_X = { browser: 50, express: 520, mysql: 520 + 3 * GAP_X };

export const BANDS = [
  { id: 'browser', label: 'BROWSER · framework-ui/src/core' },
  { id: 'express', label: 'EXPRESS · server/' },
  { id: 'mysql', label: 'MYSQL' },
];

export const NODES = {
  hook: { c: 0, r: 0, band: 'browser', title: 'Hook', file: 'packages/framework-ui/src/core/hooks/', does: 'The hook a screen calls. It shows the name of the hook you trace.' },
  rq: { c: 1, r: 0, band: 'browser', title: 'React Query', file: 'core/queryClient.js · queryKeys.js', does: 'Owns caching: staleTime 0 (refetch on mount), gcTime 5 min, retry off. Mutations invalidate queryKeys.lists(resource).' },
  access: { c: 0, r: 1, band: 'browser', title: 'AccessProvider', file: 'provider/AccessProvider.js', does: 'Answers useCan and route guards in the browser, from the permissions and resources start-up loaded. No request.' },
  dp: { c: 1, r: 1, band: 'browser', title: 'DataProvider', file: 'provider/mysqlOrmProvider.js', does: 'Turns hook calls into REST: getList → GET api/:resource, create → POST, update → PUT api/:resource/:id, custom → any URL.' },
  ap: { c: 0, r: 2, band: 'browser', title: 'AuthProvider', file: 'provider/mysqlOrmAuthProvider.js', does: 'Sign-in, refresh, logout and password flows: POST /auth/login, /auth/refresh, /auth/logout…' },
  api: { c: 1, r: 2, band: 'browser', title: 'apiClient', file: 'packages/framework-ui/src/services/apiClient.js', does: 'Axios with the Bearer token. A 401 triggers one /auth/refresh that other requests queue behind (10 s), then they retry.' },
  socket: { c: 0, r: 3, band: 'browser', title: 'SocketProvider', file: 'core/realtime/SocketProvider.jsx', does: 'Socket.IO connection. useAuthorizationEvents listens for access:changed and refetches bootstrap.' },

  authz: { c: 0, r: 0, band: 'express', title: 'authorization', file: 'middleware/authorization.js', does: 'RBAC: the role needs a resource matching method + path (superadmin / dev bypass). Result cached per user for 5 minutes.' },
  authority: { c: 1, r: 0, band: 'express', title: 'authorityService', file: 'core/lib/authorityService.js', does: "On a permission-cache miss loads the user's roles, permissions, resources and overrides (about 4 queries)." },
  routes: { c: 2, r: 0, band: 'express', title: 'Route classes', file: 'baseRoute · MetadataRoute · acessRoute', does: 'baseRoute serves /api/:resources and /api/v1/bootstrap; MetadataRoute serves metadata, lookups and uploads; acessRoute saves roles.' },
  boot: { c: 3, r: 0, band: 'express', title: 'bootstrapService', file: 'core/lib/bootstrapService.js', does: 'Loads the datasets registered for the authenticated_startup profile: lookups, resources, permissions, ui_settings.' },
  authn: { c: 0, r: 1, band: 'express', title: 'authMiddleWare', file: 'middleware/authMiddleWare.js', does: 'Verifies the JWT and issuer, then one query: token_version and forced_password_change from admin_credentials JOIN admin.' },
  abac: { c: 1, r: 1, band: 'express', title: 'AbacEngine', file: 'abacEngine.js · coreAbacPolicies.js', does: 'Deny-only rules evaluated after RBAC. It can refuse what RBAC allowed, never allow what RBAC refused.' },
  vtable: { c: 2, r: 1, band: 'express', title: 'validateTable', file: 'middleware/validateTable.js', does: 'Table must exist and not be sensitive; its columns and primary key (one information_schema query) and its metadata fields are cached for 5 minutes, and the builder clears them on save. Sensitive columns and those the user may not read are left out.' },
  meta: { c: 3, r: 1, band: 'express', title: 'Metadata services', file: 'metadataService · metadataSchema', does: 'Field metadata per table (filtered by read permission), lookup options by key through lookupRegistry, and server-side rules for writes.' },
  index: { c: 0, r: 2, band: 'express', title: 'createServer pipeline', file: 'logger · rateLimit · cors · helmet', does: 'requestLogger → cookies/json → rate limit per address (3000 / 15 min) → cors → helmet → public auth routes → authMiddleWare → rate limit per user (500 / 15 min) → authorization → routes → errorHandler.' },
  errors: { c: 1, r: 2, band: 'express', title: 'errorHandler', file: 'middleware/errorHandler.js', does: 'Turns AppError into { status, errorCode, message, details } with its HTTP status. Logs only unexpected errors.' },
  base: { c: 2, r: 2, band: 'express', title: 'BaseService', file: 'core/lib/baseService.js', does: 'Generic list / one / create / update / delete. Writes go through validateRecordAgainstMetadata first.' },
  upload: { c: 3, r: 2, band: 'express', title: 'uploadServices', file: 'config/multer.js · uploadServices', does: 'multer receives the file; uploadServices checks signature, size and type for the field, then stores it.' },
  authroute: { c: 0, r: 3, band: 'express', title: 'authRoute', file: 'route/authRoute.js', does: 'Public routes answered before the token check: login, refresh, OTP, password reset, Google sign-in.' },
  authsvc: { c: 1, r: 3, band: 'express', title: 'AuthService', file: 'core/lib/authService.js', does: 'Checks credentials, lockout and login options; issues access and refresh tokens carrying token_version.' },
  events: { c: 2, r: 3, band: 'express', title: 'authorizationEvents', file: 'authorizationEvents · socketServer', does: 'After a role, permission or override change: clearPermissionCache and emit access:changed to the affected users.' },
  model: { c: 3, r: 3, band: 'express', title: 'Model + QueryBuilder', file: 'model/model.js · queryBuilder.js', does: 'Every query is built here and parameterised. Raw SQL only where the builder cannot express it (CTEs).' },
  mysql: { c: 0, r: 4, band: 'mysql', title: 'MySQL pool', file: 'core/config/conn.js', does: 'mysql2 pool: connectionLimit 10, unbounded queue. More than 10 queries in flight wait their turn.' },
};

export function defaultLayout() {
  return Object.fromEntries(Object.entries(NODES).map(([id, node]) => [id, {
    x: BAND_X[node.band] + node.c * GAP_X,
    y: 74 + node.r * GAP_Y + (node.band === 'mysql' ? 44 : 0),
  }]));
}

// A step: [node, what happens there, queries it runs]
const protectedSteps = (endpoint) => [
  ['api', `${endpoint} · Authorization: Bearer …`],
  ['index', 'logged, under the rate limit'],
  ['authn', 'JWT valid, token_version matches', 1],
  ['authz', 'permission cache hit → RBAC: resource matches'],
  ['abac', 'no deny rule matched'],
];

export const HOOKS = [
  {
    id: 'useList', group: 'Data', endpoint: 'GET /api/:resources', inLoad: true, weight: 1,
    steps: [['hook', "useList('resource', { pagination })"], ['rq', 'queryKeys.list(resource, params) · stale → fetch'], ['dp', 'getList → GET api/resource?page=1&limit=20'], ...protectedSteps('GET /api/resource'),
      ['routes', 'baseRoute GET /api/:resources'], ['vtable', 'exists · not sensitive · schema from cache'], ['base', 'BaseService.list · readable columns only'], ['model', 'SELECT … LIMIT ? OFFSET ? + COUNT(*)'], ['mysql', 'data + count', 2], ['rq', 'cached under the list key']],
    result: '200 { data: [...], pagination: { page, limit, total } }',
  },
  {
    id: 'useOne', group: 'Data', endpoint: 'GET /api/:resources/:id', weight: 0.5,
    steps: [['hook', "useOne('resource', id)"], ['rq', 'queryKeys.one(resource, id)'], ['dp', 'getOne → GET api/resource/42'], ...protectedSteps('GET /api/resource/42'),
      ['routes', 'baseRoute GET /api/:resources/:id'], ['vtable', 'exists · schema from cache'], ['base', 'BaseService.one'], ['model', 'SELECT … WHERE id = ?'], ['mysql', 'one row', 1], ['rq', 'cached']],
    result: '200 { data: { id: 42, … } }',
  },
  {
    id: 'useCreate', group: 'Data', endpoint: 'POST /api/:resources', weight: 0.3, write: true,
    steps: [['hook', "useCreate('resource').mutate(values)"], ['rq', 'mutation'], ['dp', 'create → POST api/resource'], ...protectedSteps('POST /api/resource'),
      ['routes', 'baseRoute POST /api/:resources'], ['vtable', 'writable columns, from cache'], ['base', 'BaseService.create'], ['meta', 'validateRecordAgainstMetadata: required · types · lookups · write access', 2], ['model', 'INSERT INTO … VALUES (?, ?, …)'], ['mysql', 'insert', 1],
      ['rq', 'onSuccess → invalidateQueries(queryKeys.lists(resource))'], ['hook', 'every open list of this resource refetches']],
    result: '201 { data: { id: 418, … } } → lists refetch',
  },
  {
    id: 'useUpdate', group: 'Data', endpoint: 'PUT /api/:resources/:id', weight: 0.3, write: true,
    steps: [['hook', "useUpdate('resource').mutate({ id, values })"], ['rq', 'mutation'], ['dp', 'update → PUT api/resource/42'], ...protectedSteps('PUT /api/resource/42'),
      ['routes', 'baseRoute PUT /api/:resources/:id'], ['vtable', 'writable columns, from cache'], ['base', 'BaseService.update'], ['meta', 'not editable / hidden fields rejected', 2], ['model', 'UPDATE … WHERE id = ?'], ['mysql', 'update', 1], ['rq', 'invalidate lists + one']],
    result: '200 { data: { id: 42, … } } → list and record refetch',
  },
  {
    id: 'useDelete', group: 'Data', endpoint: 'DELETE /api/:resources/:id', weight: 0.1, write: true,
    steps: [['hook', "useDelete('resource').mutate(id)"], ['rq', 'mutation'], ['dp', 'deleteOne → DELETE api/resource/42'], ...protectedSteps('DELETE /api/resource/42'),
      ['routes', 'baseRoute DELETE /api/:resources/:id'], ['vtable', 'exists (cached)'], ['base', 'BaseService.delete'], ['model', 'DELETE … WHERE id = ?'], ['mysql', 'delete', 1], ['rq', 'invalidate lists']],
    result: '200 → lists refetch',
  },
  {
    id: 'useTableMetadata', group: 'Metadata', endpoint: 'GET /api/v1/metadata/:table', inLoad: true, weight: 0.4,
    steps: [['hook', "useTableMetadata('resource')"], ['rq', "['metadata', table]"], ['dp', 'custom → GET api/v1/metadata/resource'], ...protectedSteps('GET /api/v1/metadata/resource'),
      ['routes', 'MetadataRoute GET /api/v1/metadata/:table'], ['meta', 'getTableMetadata(table, access): drop unreadable fields, mark unwritable disabled'], ['model', 'metadata_tables + tables_metadata'], ['mysql', 'table + fields', 2], ['rq', 'MetadataForm / MetadataTable render from it']],
    result: '200 { table, settings, fields: [...] }',
  },
  {
    id: 'useLookup', group: 'Metadata', endpoint: 'GET /api/v1/lookups/:key', inLoad: true, weight: 0.5,
    steps: [['hook', 'LookupSelect → lookup query (useTableMetadata.js)'], ['rq', "['lookup', key, parent]"], ['dp', 'custom → GET api/v1/lookups/regions'], ...protectedSteps('GET /api/v1/lookups/regions'),
      ['routes', 'MetadataRoute GET /api/v1/lookups/:key'], ['meta', 'lookupRegistry: key → table, value and label columns (never sensitive)', 1], ['model', 'SELECT value, label FROM …'], ['mysql', 'options', 1], ['rq', 'options cached per key and parent']],
    result: '200 [{ value, label }, …]',
  },
  {
    id: 'UploadField', group: 'Metadata', endpoint: 'POST /api/v1/uploads/:table/:column', weight: 0.05, write: true,
    steps: [['hook', 'UploadField (useUpload)'], ['dp', 'multipart POST api/v1/uploads/resource/photo'], ...protectedSteps('POST /api/v1/uploads/resource/photo'),
      ['routes', 'MetadataRoute POST /api/v1/uploads/:table/:column'], ['upload', 'multer → signature, size and type checked for this field'], ['meta', 'field must be an image/file the user may write', 1], ['hook', 'form field receives the stored URL']],
    result: '200 { url }',
  },
  {
    id: 'FrameworkProvider', group: 'Start-up', endpoint: 'POST /api/v1/bootstrap', weight: 0.05,
    steps: [['hook', 'FrameworkProvider useQuery(queryKeys.bootstrap())'], ['rq', "['bootstrap']"], ['dp', "custom → POST api/v1/bootstrap { profile: 'authenticated_startup' }"], ...protectedSteps('POST /api/v1/bootstrap'),
      ['routes', 'baseRoute POST /api/v1/bootstrap'], ['boot', 'registry: lookups · resources · permissions · ui_settings', 2], ['model', 'one SELECT per enabled dataset'], ['mysql', 'one per dataset', 4], ['access', 'permissions + resources stored for useCan and the sidebar'], ['rq', 'sidebar, routes and theme render']],
    result: '200 { datasets: { metadata_lookups, admin_resources, permissions, ui_settings } }',
  },
  {
    id: 'useLogin', group: 'Auth', endpoint: 'POST /auth/login (public)', weight: 0.02,
    steps: [['hook', 'useLogin().mutate({ identifier, password })'], ['ap', 'login → POST /auth/login'], ['api', 'no token needed'], ['index', 'rate limit applies, then public auth routes'], ['authroute', 'POST /auth/login'], ['authsvc', 'login options · lockout · bcrypt compare · issue tokens'], ['model', 'admin JOIN admin_credentials'], ['mysql', 'user + credentials', 3], ['rq', "invalidateQueries(['bootstrap']) → start-up reloads as this user"]],
    result: '200 { token, user } + refresh cookie',
  },
  {
    id: 'useCan', group: 'Auth', endpoint: 'no request', weight: 0, browserOnly: true,
    steps: [['hook', "useCan('customers.create')"], ['access', 'answered from bootstrap permissions · superadmin/dev → true']],
    result: 'true / false, instantly. The server still enforces it on the request.',
  },
  {
    id: 'useAuthorizationEvents', group: 'Auth', endpoint: 'socket · access:changed', weight: 0, browserOnly: true,
    steps: [['routes', "acessRoute saves a role's permissions"], ['events', 'clearPermissionCache(user) · publish(userIds, "permissions-changed")'], ['socket', 'Socket.IO emits access:changed to those users'], ['hook', 'useAuthorizationEvents receives it'], ['rq', "refetchQueries(['bootstrap'])"], ['access', 'sidebar and useCan update without a reload']],
    result: 'Affected users see their new access within a second.',
  },
];

export const FAILURES = [
  { id: 'expired', label: 'Access token expired' },
  { id: 'revoke', label: 'Sign everyone out' },
  { id: 'norole', label: 'Role lacks resource' },
  { id: 'abac', label: 'ABAC rule denies' },
  { id: 'sensitive', label: 'Sensitive table' },
  { id: 'invalid', label: 'Invalid field value' },
  { id: 'rolechange', label: 'Change a role' },
  { id: 'slowdb', label: 'Slow database' },
];

export const MISSIONS = [
  { id: 'save', title: 'Trace a save', goal: 'Trace useCreate until the list refreshes. Which file decides the field values are valid?', answer: 'meta', trace: 'useCreate' },
  { id: 'nocall', title: 'The call that never leaves', goal: 'Trace useCan. Which file answers it?', answer: 'access', trace: 'useCan' },
  { id: 'live', title: 'Access changes live', goal: 'Trace useAuthorizationEvents. Which server file tells the browser?', answer: 'events', trace: 'useAuthorizationEvents' },
  { id: 'office', title: 'One office, one IP', goal: '250 staff share one router. Each has their own 500-request limit, but they start getting 429. Click the file that stops them.', answer: 'index', load: { users: 250, pace: 4, office: true } },
  { id: 'bottleneck', title: 'Find the bottleneck', goal: '300 users on lists, metadata and lookups. Which box turns red first?', answer: 'mysql', load: { users: 300, pace: 6, office: false } },
];

export const DEFAULT_LOAD_HOOKS = HOOKS.filter((hook) => hook.inLoad).map((hook) => hook.id);
export const findHook = (id) => HOOKS.find((hook) => hook.id === id);

const toStep = ([node, note, queries = 0], kind = 'ok') => ({ node, note, queries, kind });

// The path one call of `hook` takes with the chosen failures switched on.
export function traceHook(hook, failures) {
  const steps = hook.steps.map((step) => toStep(step));
  if (hook.browserOnly) return { steps, result: hook.result, ok: true };

  const at = (node) => steps.findIndex((step) => step.node === node);
  const stopAt = (index, note, result) => {
    steps[index] = { ...steps[index], note, kind: 'bad' };
    const [status, code] = result.split(' ');
    return {
      steps: [
        ...steps.slice(0, index + 1),
        toStep(['errors', `${status} ${code} → { status: "fail", errorCode, message }`], 'bad'),
        toStep(['api', status === '401' ? 'refresh fails → clearAuth → sign-in page' : "toDataProviderError → the hook's error state"], 'bad'),
      ],
      result,
      ok: false,
    };
  };

  if (failures.has('revoke') && at('authn') >= 0) return stopAt(at('authn'), 'token_version 7 ≠ 8 → 401', '401 ERR_TOKEN_EXPIRED');
  if (failures.has('expired') && at('authn') >= 0) {
    steps.splice(at('authn'), 1,
      toStep(['authn', 'JWT expired → 401'], 'retry'),
      toStep(['api', 'POST /auth/refresh → new token → retry'], 'retry'),
      toStep(['index', 'retried request']),
      toStep(['authn', 'new JWT valid', 1]));
  }
  if (failures.has('norole') && at('authz') >= 0) return stopAt(at('authz'), 'no resource matches this method + path → 403', '403 ERR_ACCESS_DENIED');
  if (failures.has('abac') && at('abac') >= 0) return stopAt(at('abac'), 'rule "branch-only" denies → 403', '403 ERR_ACCESS_DENIED deniedBy=branch-only');
  if (failures.has('sensitive') && at('vtable') >= 0) return stopAt(at('vtable'), 'admin_credentials is in SENSITIVE_TABLES → 403', '403 ERR_ACCESS_DENIED');
  if (failures.has('invalid') && hook.write && at('meta') >= 0) return stopAt(at('meta'), 'phone is required · "Mars" not in lookup → 400', '400 ERR_VALIDATION_FAILED');
  if (failures.has('rolechange') && at('authz') >= 0) {
    const index = at('authz');
    steps[index] = { ...steps[index], note: 'permission cache cleared → loadUserAuthority' };
    steps.splice(index + 1, 0, toStep(['authority', 'roles · permissions · resources · overrides', 4]));
  }
  return { steps, result: hook.result, ok: true };
}

// The hooks that pass through a file, and the files it connects to.
export function nodeUsage(nodeId) {
  const hooks = HOOKS.filter((hook) => hook.steps.some(([node]) => node === nodeId)).map((hook) => hook.id);
  const links = new Set();
  for (const hook of HOOKS) {
    hook.steps.forEach(([node], index) => {
      const next = hook.steps[index + 1]?.[0];
      if (!next || node === next) return;
      if (node === nodeId) links.add(next);
      if (next === nodeId) links.add(node);
    });
  }
  return { hooks, links: [...links] };
}

// Edges to draw: the traced path, or every edge the hooks under load use.
export function routeEdges(steps, reachedIndex) {
  const edges = [];
  steps.forEach((step, index) => {
    const next = steps[index + 1];
    if (!next || next.node === step.node) return;
    const kind = next.kind === 'bad' ? 'bad' : next.kind === 'retry' || step.kind === 'retry' ? 'retry' : '';
    edges.push({ from: step.node, to: next.node, kind, reached: index < reachedIndex });
  });
  return edges;
}

export function loadEdges(hookIds, failures) {
  const edges = new Map();
  for (const hook of HOOKS.filter((item) => hookIds.has(item.id) && item.weight > 0)) {
    const { steps } = traceHook(hook, failures);
    steps.forEach((step, index) => {
      const next = steps[index + 1];
      if (!next || next.node === step.node) return;
      const key = `${step.node}>${next.node}`;
      edges.set(key, { from: step.node, to: next.node, kind: next.kind === 'bad' ? 'bad' : '', weight: (edges.get(key)?.weight ?? 0) + hook.weight });
    });
  }
  return [...edges.values()];
}

const PER_ADDRESS_PER_SECOND = 3000 / (15 * 60);
const PER_USER_PER_SECOND = 500 / (15 * 60);
const POOL_SIZE = 10;

// One simulated second of load. cacheWarm: share of permission-cache hits;
// revokeWave: share of requests still carrying a revoked token.
export function computeLoad({ users, pace, office, hookIds, failures, cacheWarm, revokeWave }) {
  const active = HOOKS.filter((hook) => hookIds.has(hook.id) && hook.weight > 0);
  const totalWeight = active.reduce((sum, hook) => sum + hook.weight, 0) || 1;
  const rps = active.length ? (users * pace) / 60 : 0;
  const dataQueries = active.reduce((sum, hook) => sum + (hook.weight / totalWeight) * hook.steps.reduce((total, step) => total + (step[2] ?? 0), 0), 0);
  const miss = 1 - cacheWarm;
  const queriesPerRequest = active.length ? dataQueries + miss * 4 : 0;

  // Each user has their own limit; everyone behind one office address also
  // shares the per-address limit.
  const ips = office ? 1 : Math.max(1, users);
  const allowed = Math.min(ips * PER_ADDRESS_PER_SECOND, Math.max(1, users) * PER_USER_PER_SECOND);
  const limited = Math.max(0, rps - allowed);
  const admitted = rps - limited;
  const authFailed = failures.has('revoke') ? admitted * revokeWave : 0;
  const refreshes = failures.has('expired') ? admitted * 0.08 : 0;
  const passed = admitted - authFailed;
  const denied = failures.has('norole') || failures.has('sensitive') ? passed : failures.has('abac') ? passed * 0.1 : 0;
  const invalid = failures.has('invalid') ? active.filter((hook) => hook.write).reduce((sum, hook) => sum + (hook.weight / totalWeight) * passed, 0) : 0;

  const queriesPerSecond = admitted + passed * miss * 4 + (passed - denied) * Math.max(0, queriesPerRequest - 1);
  const queryMs = failures.has('slowdb') ? 45 : 4;
  const busy = (queriesPerSecond * queryMs) / 1000;
  const poolUse = busy / POOL_SIZE;
  const wait = poolUse < 0.95 ? 1 / (1 - poolUse) : 20 + (poolUse - 0.95) * 200;
  const p95 = Math.round((12 + queriesPerRequest * queryMs * Math.min(wait, 60)) * 1.9 + refreshes * 6);
  const overload = poolUse > 1.6 ? admitted * Math.min(0.5, (poolUse - 1.6) * 0.3) : 0;
  const errors = limited + authFailed * 0.2 + denied + invalid + overload;
  const errorRate = rps ? (errors / rps) * 100 : 0;
  const perIpWindow = (rps / ips) * 900;

  const heat = {
    hook: rps / 60, rq: rps / 60, dp: rps / 60, api: (rps + refreshes * 4) / 60, ap: refreshes / 5, access: 0.05, socket: failures.has('rolechange') ? 0.4 : 0.05,
    index: Math.max(perIpWindow / 3000, (rps / Math.max(1, users)) * 900 / 500), authroute: refreshes / 5, authsvc: refreshes / 5,
    authn: admitted / 80 + (authFailed > 0.05 ? 0.7 : 0), authz: miss * 3 + (denied ? 0.9 : 0), authority: miss * 3, abac: failures.has('abac') ? 0.7 : passed / 120,
    routes: passed / 90, vtable: passed / 70 + (failures.has('sensitive') ? 0.9 : 0), base: passed / 90, meta: passed / 90 + (invalid ? 0.7 : 0), boot: 0.05, upload: 0.05,
    events: failures.has('rolechange') ? 0.5 : 0, model: queriesPerSecond / 400, errors: errorRate / 10, mysql: poolUse,
  };
  const fixed = (value) => value.toFixed(1);
  const stat = {
    hook: `${fixed(rps)} calls/s`, rq: 'staleTime 0', dp: `${fixed(rps)} req/s`, api: refreshes ? `${fixed(refreshes)} refresh/s` : `${fixed(rps)} req/s`, ap: refreshes ? `${fixed(refreshes)} refresh/s` : 'idle',
    access: 'no network', socket: failures.has('rolechange') ? 'access:changed' : 'connected', index: limited > 0.05 ? `${fixed(limited)} × 429/s` : `${perIpWindow.toFixed(0)}/3000 per address`,
    authroute: refreshes ? `${fixed(refreshes)} /refresh/s` : 'idle', authsvc: refreshes ? 'issuing tokens' : 'idle', authn: authFailed > 0.05 ? `${fixed(authFailed)} × 401/s` : `${fixed(admitted)} q/s`,
    authz: denied ? `${fixed(denied)} × 403/s` : `cache hit ${(cacheWarm * 100).toFixed(0)}%`, authority: `${fixed(passed * miss * 4)} q/s`, abac: failures.has('abac') ? `${fixed(denied)} denied/s` : 'no denies',
    routes: `${fixed(passed)} req/s`, vtable: 'schema cached', base: `${fixed(passed)} req/s`, meta: invalid ? `${fixed(invalid)} × 400/s` : `${fixed(passed)} req/s`, boot: 'on sign-in', upload: 'idle',
    events: failures.has('rolechange') ? 'publishing' : 'idle', model: `${queriesPerSecond.toFixed(0)} q/s`, errors: `${fixed(errors)}/s`, mysql: `${fixed(Math.min(POOL_SIZE, busy))}/10 busy${poolUse > 1 ? ' · queue' : ''}`,
  };

  return {
    rps, throughput: Math.max(0, rps - errors), p95, errorRate, queriesPerRequest, queriesPerSecond, poolUse,
    limited, authFailed, denied, invalid, refreshes, heat, stat,
  };
}

export function healthOf(load, running) {
  if (!running) return { tone: 'ok', label: 'Idle' };
  if (load.errorRate > 5 || load.p95 > 800) return { tone: 'bad', label: 'Failing' };
  if (load.errorRate > 1 || load.p95 > 400) return { tone: 'warn', label: 'Degraded' };
  return { tone: 'ok', label: 'Healthy' };
}

// Server log lines for the current second under load.
export function loadLogLines(load, cacheWarm) {
  const lines = [];
  if (load.limited > 0.05) lines.push(['bad', `429 ERR_TOO_MANY_REQUESTS ${load.limited.toFixed(1)}/s · 3000 per address, 500 per user, per 15 min`]);
  if (load.authFailed > 0.5) lines.push(['warn', '401 ERR_TOKEN_EXPIRED token_version changed · /auth/refresh fails → sign-in']);
  if (load.refreshes > 0.05) lines.push(['warn', `apiClient: ${load.refreshes.toFixed(1)} refresh/s, other 401s queue behind it`]);
  if (load.denied > 0.05) lines.push(['bad', `403 ERR_ACCESS_DENIED ${load.denied.toFixed(1)}/s`]);
  if (load.invalid > 0.05) lines.push(['bad', `400 ERR_VALIDATION_FAILED ${load.invalid.toFixed(1)}/s from metadataSchema`]);
  if (cacheWarm < 0.9) lines.push(['warn', `permission cache ${(cacheWarm * 100).toFixed(0)}% warm → authorityService reloads`]);
  if (load.poolUse > 1) lines.push(['bad', `mysql2 pool: ${Math.round(load.poolUse * 10)} queries want 10 connections → queued`]);
  return lines;
}

// Curves between box edges, and a point along one.
export function edgeCurve(positions, from, to) {
  const a = positions[from];
  const b = positions[to];
  const ac = { x: a.x + NODE_WIDTH / 2, y: a.y + NODE_HEIGHT / 2 };
  const bc = { x: b.x + NODE_WIDTH / 2, y: b.y + NODE_HEIGHT / 2 };
  const dx = bc.x - ac.x;
  const dy = bc.y - ac.y;
  if (Math.abs(dx) > Math.abs(dy) * 0.9) {
    const sign = Math.sign(dx) || 1;
    const start = { x: ac.x + (sign * NODE_WIDTH) / 2, y: ac.y };
    const end = { x: bc.x - (sign * NODE_WIDTH) / 2, y: bc.y };
    const pull = Math.max(40, Math.abs(end.x - start.x) / 2);
    return [start, { x: start.x + sign * pull, y: start.y }, { x: end.x - sign * pull, y: end.y }, end];
  }
  const sign = Math.sign(dy) || 1;
  const start = { x: ac.x, y: ac.y + (sign * NODE_HEIGHT) / 2 };
  const end = { x: bc.x, y: bc.y - (sign * NODE_HEIGHT) / 2 };
  const pull = Math.max(30, Math.abs(end.y - start.y) / 2);
  return [start, { x: start.x, y: start.y + sign * pull }, { x: end.x, y: end.y - sign * pull }, end];
}

export const curvePath = ([p0, p1, p2, p3]) => `M${p0.x},${p0.y} C${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y}`;

export function pointOnCurve([p0, p1, p2, p3], t) {
  const u = 1 - t;
  return {
    x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
    y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y,
  };
}

export const nodeCenter = (positions, id) => ({ x: positions[id].x + NODE_WIDTH / 2, y: positions[id].y + NODE_HEIGHT / 2 });
