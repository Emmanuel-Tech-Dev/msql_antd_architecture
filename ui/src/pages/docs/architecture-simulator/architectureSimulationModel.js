export const HEALTHY_POLICY = Object.freeze({
  routeRegistry: 'registered',
  providerContract: 'connected',
  componentContract: 'compatible',
  offlineConflict: 'resolved',
  htmlSanitization: 'enabled',
  uploadValidation: 'strict',
  session: 'valid',
  role: 'Admin',
  permission: 'assigned',
  bootstrapTarget: 'registered',
  metadataContract: 'valid',
  lookupContract: 'registered',
  invalidation: 'all-related',
});

export const POLICY_GROUPS = [
  {
    id: 'frontend',
    label: 'Frontend runtime',
    description: 'Routes, providers, renderers, and offline state.',
    fields: [
      {
        key: 'routeRegistry', label: 'Route registry', help: 'Protected pages require a registered browser route.',
        options: [{ value: 'registered', label: 'Route registered' }, { value: 'missing', label: 'Route missing' }],
      },
      {
        key: 'providerContract', label: 'Provider contract', help: 'Data-bound components require FrameworkProvider services.',
        options: [{ value: 'connected', label: 'Providers connected' }, { value: 'missing', label: 'Provider missing' }],
      },
      {
        key: 'componentContract', label: 'Component renderer', help: 'Metadata input types must have compatible renderers.',
        options: [{ value: 'compatible', label: 'Renderer compatible' }, { value: 'unsupported', label: 'Unsupported input type' }],
      },
      {
        key: 'offlineConflict', label: 'Offline conflict policy', help: 'Offline writes need a deterministic merge strategy.',
        options: [{ value: 'resolved', label: 'Conflict strategy configured' }, { value: 'unresolved', label: 'No conflict strategy' }],
      },
    ],
  },
  {
    id: 'content',
    label: 'Content boundaries',
    description: 'Upload and rich-content security.',
    fields: [
      {
        key: 'htmlSanitization', label: 'HTML sanitization', help: 'Rich HTML must be allowlisted before display.',
        options: [{ value: 'enabled', label: 'Server allowlist enabled' }, { value: 'disabled', label: 'Sanitization disabled' }],
      },
      {
        key: 'uploadValidation', label: 'Upload validation', help: 'The server verifies signature, size, type, and ownership.',
        options: [{ value: 'strict', label: 'Strict validation' }, { value: 'browser-only', label: 'Browser validation only' }],
      },
    ],
  },
  {
    id: 'server',
    label: 'Server policies',
    description: 'Identity, access, validation, and cache consistency.',
    fields: [
      {
        key: 'session', label: 'Session token', help: 'Authentication resolves an active token version.',
        options: [{ value: 'valid', label: 'Valid and active' }, { value: 'expired', label: 'Expired token' }],
      },
      {
        key: 'role', label: 'Role profile', help: 'SuperAdmin and dev are privileged framework roles.',
        options: ['User', 'Admin', 'dev', 'SuperAdmin'].map((value) => ({ value, label: value })),
      },
      {
        key: 'permission', label: 'Resource permission', help: 'Non-privileged roles require endpoint permission.',
        options: [{ value: 'assigned', label: 'Permission assigned' }, { value: 'missing', label: 'Permission missing' }],
      },
      {
        key: 'bootstrapTarget', label: 'Bootstrap dataset', help: 'Requested tables pass the physical-table boundary.',
        options: [
          { value: 'registered', label: 'Registered safe table' },
          { value: 'unknown', label: 'Unknown table' },
          { value: 'sensitive', label: 'Credential table' },
        ],
      },
      {
        key: 'metadataContract', label: 'Metadata schema', help: 'Fields resolve to allowed physical columns.',
        options: [{ value: 'valid', label: 'Columns verified' }, { value: 'unknown-column', label: 'Unknown column' }],
      },
      {
        key: 'lookupContract', label: 'Lookup registry', help: 'Lookup tables and fields match the exact allowlist.',
        options: [{ value: 'registered', label: 'Lookup registered' }, { value: 'unregistered', label: 'Lookup not registered' }],
      },
      {
        key: 'invalidation', label: 'Mutation invalidation', help: 'Every resource affected by a write is refreshed.',
        options: [{ value: 'all-related', label: 'All affected resources' }, { value: 'primary-only', label: 'Primary table only' }],
      },
    ],
  },
];

export const FRONTEND_COMPONENTS = [
  { id: 'protected-page', category: 'Page', icon: 'page', label: 'Protected page', detail: 'Route guard + PageHeader' },
  { id: 'data-table', category: 'Data', icon: 'table', label: 'Data table', detail: 'useTableApi + CustomTable' },
  { id: 'metadata-form', category: 'Form', icon: 'form', label: 'Metadata form', detail: 'useRecordForm renderer' },
  { id: 'lookup-select', category: 'Form', icon: 'select', label: 'Lookup select', detail: 'Registered relational options' },
  { id: 'upload-field', category: 'Content', icon: 'upload', label: 'Upload field', detail: 'File validation pipeline' },
  { id: 'rich-text-editor', category: 'Content', icon: 'editor', label: 'Rich-text editor', detail: 'Tiptap HTML content' },
  { id: 'chart-widget', category: 'Data', icon: 'chart', label: 'Chart widget', detail: 'Query-backed visualization' },
  { id: 'offline-table', category: 'Offline', icon: 'offline', label: 'Offline table', detail: 'LocalForage synchronization' },
];

export const DEFAULT_COMPONENT_IDS = ['protected-page', 'data-table', 'metadata-form'];

export const ARCHITECTURE_LAYERS = [
  { id: 'page-hooks', position: { x: 0, y: 110 }, data: { order: '01', kind: 'ui', label: 'Pages & hooks', detail: 'Components / forms / tables' } },
  { id: 'framework-runtime', position: { x: 270, y: 110 }, data: { order: '02', kind: 'runtime', label: 'Framework runtime', detail: 'Bootstrap / routes / stores' } },
  { id: 'query-cache', position: { x: 540, y: 110 }, data: { order: '03', kind: 'cache', label: 'Query cache', detail: 'Server state / invalidation' } },
  { id: 'data-providers', position: { x: 810, y: 110 }, data: { order: '04', kind: 'provider', label: 'Data & auth providers', detail: 'Normalized client contracts' } },
  { id: 'axios-transport', position: { x: 1080, y: 110 }, data: { order: '05', kind: 'transport', label: 'Axios transport', detail: 'Bearer token / request ID' } },
  { id: 'express-boundary', position: { x: 1080, y: 370 }, data: { order: '06', kind: 'server', label: 'Express boundary', detail: 'Routes / middleware / controllers' } },
  { id: 'auth-access', position: { x: 810, y: 370 }, data: { order: '07', kind: 'security', label: 'Identity & access', detail: 'Token / roles / permissions' } },
  { id: 'validation', position: { x: 540, y: 370 }, data: { order: '08', kind: 'guard', label: 'Validation registries', detail: 'Tables / columns / lookups' } },
  { id: 'service-query', position: { x: 270, y: 370 }, data: { order: '09', kind: 'service', label: 'Service & query', detail: 'BaseService / QueryBuilder' } },
  { id: 'mysql', position: { x: 0, y: 370 }, data: { order: '10', kind: 'database', label: 'MySQL', detail: 'Records / ACL / metadata' } },
];

export const ARCHITECTURE_EDGES = [
  { id: 'e-01', source: 'page-hooks', target: 'framework-runtime', sourceHandle: 'source-right', targetHandle: 'target-left', label: 'invoke' },
  { id: 'e-02', source: 'framework-runtime', target: 'query-cache', sourceHandle: 'source-right', targetHandle: 'target-left', label: 'bootstrap' },
  { id: 'e-03', source: 'query-cache', target: 'data-providers', sourceHandle: 'source-right', targetHandle: 'target-left', label: 'query' },
  { id: 'e-04', source: 'data-providers', target: 'axios-transport', sourceHandle: 'source-right', targetHandle: 'target-left', label: 'normalize' },
  { id: 'e-05', source: 'axios-transport', target: 'express-boundary', sourceHandle: 'source-bottom', targetHandle: 'target-top', label: 'HTTP' },
  { id: 'e-06', source: 'express-boundary', target: 'auth-access', sourceHandle: 'source-left', targetHandle: 'target-right', label: 'authenticate' },
  { id: 'e-07', source: 'auth-access', target: 'validation', sourceHandle: 'source-left', targetHandle: 'target-right', label: 'authorize' },
  { id: 'e-08', source: 'validation', target: 'service-query', sourceHandle: 'source-left', targetHandle: 'target-right', label: 'allowlist' },
  { id: 'e-09', source: 'service-query', target: 'mysql', sourceHandle: 'source-left', targetHandle: 'target-right', label: 'parameterize' },
];

const scenario = (definition) => ({ healthy: false, blockedNodes: [], affectedNode: null, affectedComponent: null, ...definition });

const SCENARIOS = {
  healthy: scenario({ healthy: true, id: 'healthy', code: 'POLICY_OK', title: 'All framework contracts hold', why: 'Installed UI components, client providers, server policies, validation registries, and cache behavior agree on one safe request path.', fix: {} }),
  privilegedBypass: scenario({ healthy: true, id: 'privileged-bypass', code: 'ACL_PRIVILEGED_BYPASS', title: 'Privileged role bypass applied', why: 'dev and SuperAdmin intentionally bypass explicit resource permissions while frontend and server validation boundaries remain active.', fix: {} }),
  missingRoute: scenario({ id: 'missing-route', code: 'UI_ROUTE_NOT_REGISTERED', affectedComponent: 'protected-page', blockedNodes: ['page-hooks'], title: 'The protected page cannot enter the route tree', why: 'The component was added, but its browser route is absent from the merged resource registry.', fix: { routeRegistry: 'registered' } }),
  missingProvider: scenario({ id: 'missing-provider', code: 'UI_PROVIDER_UNAVAILABLE', affectedNode: 'data-providers', blockedNodes: ['axios-transport', 'express-boundary'], title: 'A data component rendered outside its provider', why: 'The installed table or chart requested framework data services without an active DataProvider contract.', fix: { providerContract: 'connected' } }),
  unsupportedComponent: scenario({ id: 'unsupported-component', code: 'UI_RENDERER_UNSUPPORTED', affectedComponent: 'metadata-form', blockedNodes: ['page-hooks'], title: 'The frontend renderer cannot mount this field', why: 'The metadata form contains an input type that has no compatible component renderer.', fix: { componentContract: 'compatible' } }),
  unsupportedEditor: scenario({ id: 'unsupported-editor', code: 'UI_EDITOR_ADAPTER_INVALID', affectedComponent: 'rich-text-editor', blockedNodes: ['page-hooks'], title: 'The rich-text component contract is incompatible', why: 'The editor component was installed with an unsupported renderer contract, so React cannot safely mount it.', fix: { componentContract: 'compatible' } }),
  offlineConflict: scenario({ id: 'offline-conflict', code: 'UI_OFFLINE_CONFLICT_UNRESOLVED', affectedComponent: 'offline-table', affectedNode: 'query-cache', title: 'Offline and server records diverged', why: 'The offline table attempted to synchronize concurrent changes without a configured merge strategy.', fix: { offlineConflict: 'resolved' } }),
  unsafeHtml: scenario({ id: 'unsafe-html', code: 'CONTENT_HTML_UNSANITIZED', affectedComponent: 'rich-text-editor', blockedNodes: ['page-hooks'], title: 'Rich HTML reached an unsafe render boundary', why: 'The editor is installed, but saved HTML is not protected by a server allowlist before display.', fix: { htmlSanitization: 'enabled' } }),
  weakUpload: scenario({ id: 'weak-upload', code: 'UPLOAD_SERVER_VALIDATION_REQUIRED', affectedComponent: 'upload-field', affectedNode: 'validation', title: 'Upload safety exists only in the browser', why: 'Browser accept rules are bypassable. The server must verify file signature, size, type, destination, and ownership.', fix: { uploadValidation: 'strict' } }),
  expiredSession: scenario({ id: 'expired-session', code: 'AUTH_TOKEN_EXPIRED', affectedNode: 'auth-access', blockedNodes: ['validation', 'service-query', 'mysql'], title: 'Authentication stopped the request', why: 'The bearer token expired before authorization could resolve the current user policy.', fix: { session: 'valid' } }),
  missingPermission: scenario({ id: 'missing-permission', code: 'AUTHZ_PERMISSION_REQUIRED', affectedNode: 'auth-access', blockedNodes: ['validation', 'service-query', 'mysql'], title: 'The role cannot reach this resource', why: 'A non-privileged role reached a protected endpoint without the required resource permission.', fix: { permission: 'assigned' } }),
  sensitiveBootstrap: scenario({ id: 'sensitive-bootstrap', code: 'BOOTSTRAP_TABLE_BLOCKED', affectedNode: 'validation', blockedNodes: ['service-query', 'mysql'], title: 'Bootstrap crossed a sensitive-table boundary', why: 'Credential and other sensitive tables cannot be exposed as startup datasets.', fix: { bootstrapTarget: 'registered' } }),
  unknownBootstrap: scenario({ id: 'unknown-bootstrap', code: 'TABLE_NOT_FOUND', affectedNode: 'validation', blockedNodes: ['service-query', 'mysql'], title: 'The requested bootstrap table does not exist', why: 'validateTable could not resolve the identifier to a physical table.', fix: { bootstrapTarget: 'registered' } }),
  invalidMetadata: scenario({ id: 'invalid-metadata', code: 'METADATA_COLUMN_REJECTED', affectedNode: 'validation', blockedNodes: ['service-query', 'mysql'], title: 'Metadata requested an invalid column', why: 'The form definition and physical schema diverged before query construction.', fix: { metadataContract: 'valid' } }),
  missingLookup: scenario({ id: 'missing-lookup', code: 'LOOKUP_NOT_REGISTERED', affectedComponent: 'lookup-select', affectedNode: 'validation', title: 'The select lookup is not registered', why: 'The installed select references a table or field outside the exact server lookup allowlist.', fix: { lookupContract: 'registered' } }),
  staleCache: scenario({ id: 'stale-cache', code: 'CACHE_INVALIDATION_INCOMPLETE', affectedNode: 'query-cache', blockedNodes: ['page-hooks'], title: 'The mutation succeeded but the UI is stale', why: 'Related query resources remain cached because only the primary table was invalidated.', fix: { invalidation: 'all-related' } }),
};

const hasAny = (componentIds, ids) => ids.some((id) => componentIds.includes(id));

/** Evaluates frontend mount-time contracts before network and server policies. */
export function evaluatePolicy(policy, componentIds = DEFAULT_COMPONENT_IDS) {
  if (componentIds.includes('protected-page') && policy.routeRegistry === 'missing') return SCENARIOS.missingRoute;
  if (componentIds.includes('metadata-form') && policy.componentContract === 'unsupported') return SCENARIOS.unsupportedComponent;
  if (componentIds.includes('rich-text-editor') && policy.componentContract === 'unsupported') return SCENARIOS.unsupportedEditor;
  if (hasAny(componentIds, ['data-table', 'chart-widget', 'offline-table']) && policy.providerContract === 'missing') return SCENARIOS.missingProvider;
  if (componentIds.includes('offline-table') && policy.offlineConflict === 'unresolved') return SCENARIOS.offlineConflict;
  if (componentIds.includes('rich-text-editor') && policy.htmlSanitization === 'disabled') return SCENARIOS.unsafeHtml;
  if (componentIds.includes('upload-field') && policy.uploadValidation === 'browser-only') return SCENARIOS.weakUpload;

  if (policy.session === 'expired') return SCENARIOS.expiredSession;
  const privileged = ['dev', 'superadmin'].includes(policy.role.toLowerCase());
  if (!privileged && policy.permission === 'missing') return SCENARIOS.missingPermission;
  if (policy.bootstrapTarget === 'sensitive') return SCENARIOS.sensitiveBootstrap;
  if (policy.bootstrapTarget === 'unknown') return SCENARIOS.unknownBootstrap;
  if (hasAny(componentIds, ['metadata-form', 'data-table']) && policy.metadataContract === 'unknown-column') return SCENARIOS.invalidMetadata;
  if (componentIds.includes('lookup-select') && policy.lookupContract === 'unregistered') return SCENARIOS.missingLookup;
  if (hasAny(componentIds, ['data-table', 'chart-widget']) && policy.invalidation === 'primary-only') return SCENARIOS.staleCache;
  if (privileged && policy.permission === 'missing') return SCENARIOS.privilegedBypass;
  return SCENARIOS.healthy;
}

export function buildSimulationTrace(current, policy, runId, componentIds) {
  const requestId = `SIM-${String(runId).padStart(4, '0')}`;
  const context = `requestId=${requestId} role=${policy.role} components=${componentIds.length}`;
  if (current.healthy) return [
    `[19:42:08.102] INFO  ui.components.mounted count=${componentIds.length}`,
    `[19:42:08.118] INFO  framework.providers.ready routes=resolved cache=connected`,
    `[19:42:08.141] INFO  authorization.granted strategy=${current.id === 'privileged-bypass' ? 'privileged-role' : 'explicit-permission'}`,
    `[19:42:08.176] INFO  query.executed parameterized=true durationMs=18`,
    `[19:42:08.184] INFO  cache.invalidated scope=${policy.invalidation}`,
    `[19:42:08.187] OK    framework.simulation.complete ${context} code=${current.code}`,
  ];

  const owner = current.code.startsWith('UI_') || current.code.startsWith('CONTENT_') ? 'ui' : 'server';
  return [
    `[19:42:08.102] INFO  simulation.component-tree count=${componentIds.length} ${context}`,
    `[19:42:08.128] ERROR ${owner}.boundary.rejected code=${current.code}`,
    `${current.title}: ${current.why}`,
    `    at evaluatePolicy (ui/src/pages/docs/architecture-simulator/architectureSimulationModel.js)`,
    `    at triggerSimulation (ui/src/pages/docs/architecture-simulator/useArchitectureSimulation.js)`,
    `    context: ${context}`,
    `[19:42:08.136] FAIL  framework.simulation.complete status=conflict`,
  ];
}

export function getLayerStatus(layerId, current) {
  if (layerId === current.affectedNode && !current.affectedComponent) return 'error';
  if (layerId === current.affectedNode || current.blockedNodes.includes(layerId)) return 'blocked';
  return 'healthy';
}

export function getComponentStatus(componentId, current) {
  return componentId === current.affectedComponent ? 'error' : 'healthy';
}
