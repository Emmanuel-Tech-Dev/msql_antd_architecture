export const documentationMeta = {
  product: "MySQL ORM Framework",
  edition: "Production architecture guide",
  version: "1.1",
  updated: "24 November 2026",
};

const p = (text) => ({ type: "paragraph", text });
const callout = (title, text, tone = "note") => ({
  type: "callout",
  title,
  text,
  tone,
});
const bullets = (title, items) => ({ type: "bullets", title, items });
const steps = (title, items) => ({ type: "steps", title, items });
const table = (title, columns, rows) => ({
  type: "table",
  title,
  columns,
  rows,
});
const code = (title, language, value) => ({
  type: "code",
  title,
  language,
  value,
});
const flow = (title, items) => ({ type: "flow", title, items });

export const documentationSections = [
  {
    id: "start-here",
    group: "Start here",
    title: "Understand the framework",
    eyebrow: "Orientation",
    audience: "Everyone",
    readTime: "8 min",
    summary:
      "What the system is, who it serves, and the mental model every operator and developer should share.",
    blocks: [
      p(
        "MySQL ORM Framework is a metadata-driven administrative application. It combines a React and Ant Design workspace with a custom Express and MySQL service layer. The framework is designed so routine administration—users, roles, permissions, resources, appearance, profile data, logs, and backups—can be managed from the application while security-sensitive capabilities stay controlled in code.",
      ),
      callout(
        "In plain language",
        "The database describes much of what the application can show and edit. The server decides what is safe and permitted. The UI turns those decisions into pages, tables, forms, navigation, and feedback that people can use.",
      ),
      flow("The system in one line", [
        "A person signs in",
        "The server verifies identity and access",
        "Bootstrap loads safe startup metadata",
        "Providers create the runtime registry",
        "Hooks render authorized pages and data",
      ]),
      table(
        "Audience guide",
        ["Audience", "Begin with", "Primary concern"],
        [
          [
            "Product owner or operator",
            "Start here → Operations",
            "What can be managed safely from the UI",
          ],
          [
            "Frontend developer",
            "Architecture → UI → Metadata & forms",
            "Providers, hooks, routes, forms, tables, and theme tokens",
          ],
          [
            "Backend developer",
            "Architecture → Server → Identity & access",
            "Trust boundaries, validation, queries, security, and operations",
          ],
          [
            "Security reviewer",
            "Identity & access → API reference → Operations",
            "Authentication, authorization, sensitive data, logging, and deployment",
          ],
        ],
      ),
      bullets("Design principles", [
        "Database-driven where change should be operational: navigation visibility, permissions, form and list metadata, lookups, sign-in fields, startup data, and appearance settings.",
        "Code-controlled where a mistake would widen the trust boundary: authentication, authorization and ABAC policies, table validation, sensitive tables and columns, schema changes (migrations), and backup execution.",
        "One normalized data-provider contract between UI hooks and server endpoints.",
        "Friendly messages for end users; technical request details remain available to developers and operators.",
        "SuperAdmin and dev are privileged system roles; all other roles are evaluated from explicit permissions and resource mappings.",
      ]),
      steps("First local run", [
        {
          title: "Prepare MySQL",
          text: "Create the target database, import the baseline schema, and run the ordered migration files in server/resources/migrations.",
        },
        {
          title: "Configure the server",
          text: "Create server environment values for database access, token secrets, encryption, email, client URL, logging, and optional backup tooling.",
        },
        {
          title: "Start the API",
          text: "From server, run npm install and npm run dev. The default service address is http://localhost:3000.",
        },
        {
          title: "Configure and start the UI",
          text: "Set VITE_API_URL, then run npm install and npm run dev from ui. Vite normally serves http://localhost:5173.",
        },
        {
          title: "Verify the system",
          text: "Sign in, confirm the first authorized route loads, open a metadata-driven form, and check logs for the same request ID if anything fails.",
        },
      ]),
      code(
        "Minimal UI environment",
        "env",
        "VITE_API_URL=http://localhost:3000",
      ),
    ],
  },
  {
    id: "architecture",
    group: "Foundations",
    title: "System architecture",
    eyebrow: "High-level design",
    audience: "Everyone",
    readTime: "14 min",
    summary:
      "The runtime layers, sources of truth, trust boundaries, and request lifecycle.",
    blocks: [
      p(
        "The architecture has four cooperating layers: the browser experience, the framework runtime, the HTTP service, and MySQL. Each layer owns a different kind of decision. Keeping those responsibilities separate is the main reason the system can be configurable without becoming unsafe.",
      ),
      table(
        "Layer ownership",
        ["Layer", "Owns", "Must not own"],
        [
          [
            "Pages and components",
            "Presentation, interaction, accessible feedback",
            "Database access rules or permission truth",
          ],
          [
            "UI framework runtime",
            "Providers, server state, auth state, route registry, metadata interpretation",
            "Unvalidated SQL or server authorization",
          ],
          [
            "Express service",
            "Authentication, authorization, validation, orchestration, safe response envelopes",
            "Browser-only display assumptions",
          ],
          [
            "MySQL",
            "Records, ACL mappings, metadata, settings, audit-supporting state",
            "Whether a caller is trusted",
          ],
        ],
      ),
      flow("Authenticated request lifecycle", [
        "React hook calls the data provider",
        "Axios adds the bearer access token",
        "Express authenticates the token",
        "Authorization resolves roles, permissions, and endpoint resources",
        "validateTable resolves physical schema and removes sensitive and permission-guarded columns",
        "Metadata rules check the record: types, required fields, rules, lookups, field access",
        "BaseService builds the allowed operation",
        "Model and QueryBuilder execute a parameterized query",
        "The response is normalized and cached by React Query",
        "The page rerenders from server state",
      ]),
      table(
        "Sources of truth",
        ["Concern", "Authoritative source", "Runtime consumer"],
        [
          [
            "Identity and credential state",
            "admin + admin_credentials",
            "AuthService and auth middleware",
          ],
          [
            "Roles and permissions",
            "admin_user_roles, admin_role_permissions, admin_permission_resources",
            "Authorization middleware and auth store",
          ],
          [
            "Browser routes and navigation",
            "admin_resources",
            "FrameworkProvider, route guard, useSider",
          ],
          [
            "Forms, lists and their rules",
            "metadata_tables, tables_metadata, metadata_versions",
            "GET /api/v1/metadata/:table → MetadataForm and MetadataTable; metadataSchema on every generic write",
          ],
          [
            "Field-level access",
            "tables_metadata.config readPermission / writePermission",
            "validateTable, metadataSchema, getTableMetadata",
          ],
          [
            "Startup data",
            "framework_bootstrap_profiles and framework_bootstrap_datasets",
            "bootstrapService and FrameworkProvider",
          ],
          [
            "Appearance",
            "ui_settings/layout.sider",
            "ThemeProvider, useTheme, AppLayout",
          ],
          [
            "Server settings",
            "system_settings plus environment",
            "SettingsManager and server services",
          ],
          ["Lookup sources", "metadata_lookups (the browser sends only a key)", "metadataService.getLookupOptions"],
        ],
      ),
      callout(
        "Trust boundary",
        "A table name received from the browser is never sufficient authority. Generic CRUD passes through authentication, endpoint authorization, physical-table validation, sensitive-table blocking, and column allowlisting before a query is executed.",
        "warning",
      ),
      bullets("Runtime state model", [
        "React Query owns remote server state and invalidation.",
        "Zustand stores identity, roles, permissions, and the resource registry.",
        "The ValuesStore holds bootstrap datasets such as admin_resources, permissions and ui_settings. Table metadata is fetched per table and cached by React Query under ['metadata', table].",
        "LocalForage is an optional browser persistence layer for offline-oriented use cases; it is not authorization state.",
        "Ant Design ConfigProvider and CSS custom properties expose the resolved appearance consistently to Ant Design, Tailwind, and vanilla CSS.",
      ]),
      callout(
        "Architecture decision",
        "Bootstrap is registry-driven. The browser asks for a profile (authenticated_startup) and never names a table; framework_bootstrap_datasets decides the tables, columns, filters, row limits, environment and required permission. Adding startup data is a migration, not a UI change.",
      ),
    ],
  },
  {
    id: "architecture-simulator",
    group: "Foundations",
    title: "Architecture simulator",
    eyebrow: "Interactive policy lab",
    audience: "Developers and operators",
    readTime: "12 min",
    summary:
      "Change framework policies, observe the first breaking architectural boundary, inspect a safe simulated trace, and apply the smallest remediation.",
    blocks: [
      p(
        "The Architectural Simulation Flow turns the framework's trust boundaries into an executable mental model. It does not call the API or mutate application data. Instead, it stages configuration locally and demonstrates how frontend components, routes, providers, authentication, authorization, bootstrap validation, metadata, lookups, query construction, and cache invalidation cooperate during a request.",
      ),
      {
        type: "architecture-simulator",
        title: "Architectural Simulation Flow",
      },
      callout(
        "How to use the lab",
        "Open the lab full screen for the largest canvas. Add or remove real framework component types from the left library, select a component or layer to inspect it, then stage frontend or server contracts in the right inspector. Trigger the policy change and follow the red trace to the first rejected boundary. Read Why it broke and the simulated stack trace before using Click to Fix. Component additions are evaluated immediately against the active policy, while inspector changes remain staged until triggered.",
      ),
      callout(
        "Frontend scenarios",
        "The component library includes protected pages, useTableApi tables, MetadataForm and useRecordForm forms, lookup selects, upload fields, Tiptap rich-text editors, charts, and offline tables. Their simulations cover missing routes or providers, unsupported metadata renderers, unsafe HTML, browser-only upload validation, unresolved offline conflicts, invalid metadata, missing lookups, and incomplete cache invalidation.",
      ),
      callout(
        "Server scenarios",
        "The same graph continues through Axios, Express, identity and access control, validation registries, BaseService and QueryBuilder, and MySQL. Use the server inspector to test expired sessions, permission rejection and the dev or SuperAdmin bypass, sensitive bootstrap targets, invalid physical columns, and stale related resources.",
      ),
      callout(
        "Simulation boundary",
        "All traces are generated locally from documented framework contracts. They contain no production requests, tokens, credentials, database values, or real log records. File names and line numbers illustrate ownership and diagnostic shape; use a real request ID to locate an actual failure in server logs.",
        "warning",
      ),
    ],
  },
  {
    id: "server",
    group: "Implementation",
    title: "Server architecture",
    eyebrow: "Express + MySQL",
    audience: "Developers",
    readTime: "22 min",
    summary:
      "Startup, middleware order, routes, services, the query layer, validation, settings, uploads, backup, and observability.",
    blocks: [
      p(
        "The server is a CommonJS Express application. index.js composes infrastructure and route modules; route classes translate HTTP into service calls; service classes hold business and security orchestration; Model and QueryBuilder own database execution.",
      ),
      flow("Startup sequence", [
        "Load environment variables",
        "Create Express and HTTP server",
        "Initialize request logging, cookies, JSON parsing, rate limiting, CORS, and Helmet",
        "Register public authentication routes",
        "Install authentication and authorization middleware",
        "Register logs, backup, UI settings, statistics, user directory, metadata, metadata builder, access-control, and generic data routes",
        "Install the not-found and central error handlers",
        "Initialize logging and preload system settings",
        "Listen on PORT and handle graceful shutdown signals",
      ]),
      table(
        "Server directories",
        ["Path", "Responsibility"],
        [
          [
            "core/config",
            "MySQL pool, Cloudinary, Multer, Swagger definition, allowed origins, and the legacy lookup allowlist",
          ],
          [
            "core/lib",
            "Authentication, authorization policy, ABAC engine and events, generic services, the metadata engine and builder, query building, settings, uploads, and backups",
          ],
          [
            "core/middleware",
            "Token verification, permission enforcement, table validation, request validation, request logs, and error conversion",
          ],
          [
            "core/model",
            "Database execution, schema discovery, filtering, sorting, search, and pagination",
          ],
          [
            "route",
            "HTTP endpoint families for auth, generic CRUD, ACL administration, user directory, metadata, the metadata builder, logs, backup, and UI settings",
          ],
          ["schema", "Input schemas used by request validation"],
          [
            "shared/helpers",
            "Errors, cache, logs, OTP, settings, and token blacklist services",
          ],
          ["resources/migrations", "Ordered, repeatable database evolution"],
          ["scripts", "Migration execution and ACL seed generation"],
          [
            "tests",
            "Authorization, ABAC, generic CRUD, metadata schema and scaffold, bootstrap, backup and lookup regression coverage (Jest)",
          ],
        ],
      ),
      table(
        "Core service responsibilities",
        ["Module", "What it does", "Safety property"],
        [
          [
            "BaseService",
            "Generic list, one, create, bulk create, update, delete, bootstrap, and lookup operations",
            "Uses validated resources and per-user readable/writable columns; every write passes validateRecordAgainstMetadata",
          ],
          [
            "metadataSchema",
            "Builds a zod schema from a table's metadata and checks generic writes",
            "Server-side required, rules, options, show-when, lookups, read-only, hidden and permission-guarded fields",
          ],
          [
            "metadataService",
            "Serves table metadata, lookup options and field uploads",
            "Lookups by key only; per-user field filtering; upload type and size from metadata",
          ],
          [
            "metadataAdminService",
            "The Data model builder: describe, save versions, restore, export, lookups, new-table migrations, CSV import",
            "manage:metadata only; never changes the schema; hidden system tables; audit log on save",
          ],
          [
            "Model",
            "Schema discovery, query-parameter interpretation, pagination, execution",
            "Removes sensitive filter fields and parameterizes values",
          ],
          [
            "QueryBuilder",
            "Composes SELECT, INSERT, UPDATE, DELETE, joins, conditions, grouping, and ordering",
            "Centralizes SQL construction and bound parameters",
          ],
          [
            "AuthService",
            "Login, token lifecycle, profile, OTP, password recovery, Google auth, user creation",
            "Credential separation, hashing, versioned/revocable sessions",
          ],
          [
            "SettingsManager",
            "Loads and caches system settings",
            "Separates runtime settings from direct ad-hoc queries",
          ],
          [
            "DatabaseBackupService",
            "Validates destinations and runs mysqldump",
            "Controlled executable, timeout, path policy, checksum",
          ],
          [
            "UploadService",
            "Local or Cloudinary file processing",
            "MIME/size middleware and managed destinations",
          ],
        ],
      ),
      bullets("Generic table endpoint behavior", [
        "GET /api/:resources/table accepts page, limit, search, sort_by, sort_order, and validated suffix filters such as _min, _max, _in, _not_in, and _like.",
        "x-table-config can provide UI-level searchable/filterable/sortable hints, but it cannot redirect the physical route resource.",
        "Bulk create is capped at 500 records. Pagination and bootstrap limits are bounded server-side.",
        "Primary keys are discovered from MySQL; update payloads cannot overwrite them.",
        "Responses pass through sensitive-data redaction before leaving the server.",
      ]),
      callout(
        "Do not bypass validateTable",
        "Any new generic BaseService route that receives a table or resource must use resolveTableDefinition or validateTable. A client-provided identifier must never be interpolated into SQL solely because it matches an identifier regular expression.",
        "danger",
      ),
      table(
        "Operational subsystems",
        ["Subsystem", "Entry point", "Notes"],
        [
          [
            "Structured logs",
            "shared/helpers/logger.js",
            "Winston transports, rotation, levels, redaction, request IDs, audit-aware events",
          ],
          [
            "Log viewer API",
            "route/LogRoute.js",
            "Bounded dates, limits, bytes per file, and available-file discovery",
          ],
          [
            "Backups",
            "route/BackupRoute.js",
            "Creates an SQL dump and returns checksum/path metadata",
          ],
          [
            "UI settings",
            "route/UiSettingsRoute.js",
            "Validates the complete appearance document and versions updates",
          ],
          [
            "Metadata builder",
            "route/MetadataAdminRoute.js",
            "Describe tables, version definitions, lookups, migrations for new tables, CSV record import",
          ],
          [
            "Authorization events",
            "core/lib/authorizationEvents.js",
            "Broadcasts access changes so active clients can refresh",
          ],
          [
            "Token revocation",
            "shared/helpers/tokenBlacklist.js",
            "Supports logout and invalidated token lifecycle",
          ],
        ],
      ),
      code(
        "Run server checks",
        "shell",
        "cd server\nnpm test\nnpm run migrate\nnpm run dev",
      ),
    ],
  },
  {
    id: "ui",
    group: "Implementation",
    title: "UI architecture",
    eyebrow: "React framework runtime",
    audience: "Developers",
    readTime: "22 min",
    summary:
      "Providers, server state, stores, routes, design tokens, hooks, pages, and component boundaries.",
    blocks: [
      p(
        "The UI is a Vite and React 19 application. Ant Design supplies accessible primitives, Tailwind supplies utility composition, and a small vanilla CSS layer provides product-specific identity. FrameworkProvider is the runtime seam that makes the application reusable.",
      ),
      flow("UI initialization", [
        "BrowserRouter establishes route state",
        "ThemeProvider selects public or workspace appearance",
        "FrameworkProvider installs QueryClient, data, auth, access, and resource contexts",
        "Public routes render without bootstrap",
        "Authenticated routes load auth_user and bootstrap in parallel",
        "FrameworkProvider merges code resources with database browser routes",
        "AppLayout and route guards render the authorized workspace",
      ]),
      table(
        "Provider contracts",
        ["Provider", "Contract", "Primary consumers"],
        [
          [
            "mysqlOrmProvider",
            "getList, getOne, getMany, create, update, deleteOne, custom",
            "Core data hooks, useTableApi, MetadataForm, MetadataTable, settings pages",
          ],
          [
            "mysqlOrmAuthProvider",
            "login, OTP, logout, identity, permissions, refresh, password flows",
            "Auth hooks and FrameworkProvider",
          ],
          [
            "AccessProvider",
            "can(action, resource)",
            "useCan and conditional UI",
          ],
          [
            "ResourceProvider",
            "Merged resources, browser routes, nav visibility, readiness",
            "AppLayout, route guard, page hooks",
          ],
          [
            "ThemeProvider",
            "Resolved appearance, mode, toggle, Ant tokens, CSS variables",
            "All Ant Design components and custom CSS",
          ],
        ],
      ),
      table(
        "State ownership",
        ["State type", "Owner", "Examples"],
        [
          [
            "Remote server state",
            "TanStack React Query",
            "Lists, records, bootstrap, auth metadata",
          ],
          [
            "Authentication state",
            "authStore (Zustand)",
            "User, token presence, roles, permissions, authorized resources",
          ],
          [
            "Resource registry",
            "ResourceProvider Zustand store",
            "Resource definitions, browser routes, readiness",
          ],
          [
            "Bootstrap values",
            "values-store",
            "admin_resources, permissions, ui_settings (table metadata is cached per table by React Query)",
          ],
          [
            "Persistent browser data",
            "useLocalForage",
            "Optional offline caches and preferences",
          ],
          [
            "Component interaction",
            "Local React state",
            "Drawers, forms, selections, filters",
          ],
        ],
      ),
      table(
        "Hook families",
        ["Family", "Hooks", "Use"],
        [
          [
            "Core data",
            "useList, useOne, useMany, useCreate, useUpdate, useDelete, useCustom",
            "Provider-aligned CRUD with React Query",
          ],
          [
            "Core auth/access",
            "useLogin, useLogout, useIdentity, usePermissions, useCan, useRouteGuard",
            "Identity and permission-aware experiences",
          ],
          [
            "Records",
            "MetadataForm, MetadataTable, MetadataFields, useTableMetadata, useRecordForm (thin wrapper), useDynamicForm, useUpload, useTextEditor",
            "Metadata-driven lists, create/edit forms and specialized fields",
          ],
          [
            "Tables",
            "useTableApi plus useTableState/useTableQuery/useTableColumns/useRowSelection",
            "Online/offline listing, filters, sorting, columns, selections",
          ],
          [
            "Layout",
            "useSider, useTheme, useDrawer, useModal, useDraggable",
            "Workspace composition and interaction containers",
          ],
          [
            "Utilities",
            "useBootstrap, useLocalForage, useNotification, useIcons, useStatistics, useChart",
            "Startup data, persistence, feedback, and presentation",
          ],
        ],
      ),
      bullets("Route policy", [
        "App.jsx declares the React component for each browser path.",
        "admin_resources declares whether the route exists in the runtime registry, whether it is public, and whether it appears in navigation.",
        "auth_user returns the current user’s allowed resources. FrameworkProvider intersects private browser routes with that response.",
        "SuperAdmin and dev receive all registered routes. Authenticated-public routes such as Profile are available without a role-resource assignment.",
        "show_in_nav controls visibility only; it does not grant or revoke access.",
      ]),
      callout(
        "Appearance scope",
        "Public pages use the public appearance scope. /admin pages use the database-managed workspace appearance. ThemeProvider maps the resolved document into both Ant Design tokens and CSS variables so AntD, Tailwind, and vanilla CSS remain visually consistent.",
      ),
      code(
        "Provider-first list example",
        "jsx",
        `const query = useList({
  resource: 'admin_roles',
  pagination: { current: 1, pageSize: 20 },
  filters: { status: 'active' },
});

if (query.isLoading) return <Spin />;
return <CustomTable dataSource={query.data?.data} />;`,
      ),
    ],
  },
  {
    id: "identity-access",
    group: "Security",
    title: "Identity and access control",
    eyebrow: "Authentication + hybrid RBAC",
    audience: "All technical roles",
    readTime: "28 min",
    summary:
      "Session lifecycle, role inheritance, user-specific ALLOW/DENY authority, permission mappings, route overrides, cache invalidation, and delegation safety.",
    blocks: [
      flow("Sign-in and authorization", [
        "Login finds the account by any sign-in column allowed in the auth.login_identifiers setting, then checks status and password hash",
        "Server issues a short-lived access token and refresh cookie",
        "UI stores the access token in sessionStorage and user state in Zustand",
        "auth_user resolves roles, permissions, resources, and current profile",
        "Every protected API request repeats token and endpoint authorization",
        "The route guard permits or redirects the browser route",
      ]),
      table(
        "Role semantics",
        ["Role", "Behavior", "Intended use"],
        [
          [
            "SuperAdmin",
            "Privileged bypass of endpoint mappings; all registered browser routes",
            "System owner and emergency administration",
          ],
          [
            "dev",
            "Same privileged policy class as SuperAdmin",
            "Trusted framework developers only",
          ],
          [
            "User",
            "Default role for newly created accounts; explicit permissions apply",
            "Safe baseline identity",
          ],
          [
            "Custom roles",
            "Union of assigned role permissions and mapped resources",
            "Business responsibilities",
          ],
        ],
      ),
      table(
        "ACL tables",
        ["Table", "Purpose"],
        [
          ["admin_roles", "Role definitions and system-role marker"],
          [
            "admin_permissions",
            "Named actions such as read:admin or update:admin_roles",
          ],
          [
            "admin_resources",
            "API endpoints and browser routes, with public/nav/display metadata",
          ],
          ["admin_user_roles", "Many-to-many user-to-role assignments"],
          [
            "admin_role_permissions",
            "Many-to-many role-to-permission assignments",
          ],
          [
            "admin_permission_resources",
            "Permission-to-endpoint or route mappings",
          ],
          [
            "admin_user_permission_overrides",
            "Audited user-specific ALLOW or DENY exceptions for named permissions",
          ],
          [
            "admin_user_browser_route_overrides",
            "Audited user-specific navigation exceptions, kept separate from API authority",
          ],
        ],
      ),
      callout(
        "Why this is hybrid RBAC",
        "Roles remain the reusable baseline. Direct user overrides handle exceptional authority without copying a role or changing every user assigned to it. After the role check passes, the ABAC engine runs policies over the subject, resource and environment; policies can only deny.",
      ),
      table(
        "ABAC policies",
        ["Rule", "Detail"],
        [
          ["Order", "RBAC baseline first. If it fails, the request is denied without running policies."],
          ["Effect", "A policy returns ALLOW or DENY. Policies cannot grant access the baseline refused."],
          ["Failure", "A policy that throws is treated as a denial (POLICY_ERROR)."],
          ["Built-in", "core.authenticated-subject and core.active-account deny unauthenticated subjects and inactive accounts."],
          ["Projects", "Register more policies (ownership, branch, time of day) in the AbacPolicyRegistry; each sees the subject, resource and environment context."],
        ],
      ),
      table(
        "Field-level access (metadata)",
        ["Setting", "Without it the user…"],
        [
          ["In the form switched off", "can't set the field through a user request; server code still can"],
          ["config.readPermission", "doesn't get the field in records, filters, search, the form or the list"],
          ["config.writePermission (falls back to readPermission)", "sees the field read-only; sending it fails with \"You can't change …\""],
          ["Privileged roles", "superadmin and dev see and change every field"],
        ],
      ),
      code(
        "Effective authority precedence",
        "text",
        `Normal user:
  effective permissions = (role permissions + direct ALLOW) - direct DENY
  effective routes      = ((role routes + direct ALLOW) - direct DENY) + public routes

System role:
  SuperAdmin or dev -> privileged bypass
  Direct overrides cannot create, expand, or restrict that bypass

Default:
  Anything not explicitly effective is denied`,
      ),
      flow("Managing one user's authority", [
        "Open Administration > Users and choose Manage user",
        "Locate Direct user exceptions in the user drawer",
        "Use Inherit to follow the role, Allow to add authority, or Deny to remove inherited authority",
        "Review Permissions and Navigation separately because a visible page is not API authority",
        "Optionally choose an expiration and provide the required audit reason",
        "Save authority; the server validates targets, delegation ceiling, and privileged-role rules in one transaction",
        "The permission cache is cleared and access-changed immediately refreshes the affected user's auth_user context",
      ]),
      table(
        "Override states",
        ["State", "Meaning", "Typical use"],
        [
          ["Inherit", "No direct row; the current role/public-route result applies", "Normal access that should evolve with the role"],
          ["ALLOW", "Adds one permission or browser route for this user", "Temporary reporting, operational, or support responsibility"],
          ["DENY", "Removes inherited authority for this user; deny wins", "Separation of duties or individual restriction"],
        ],
      ),
      code(
        "Authority management API",
        "http",
        `GET /access/user_authority/REG20260224004

POST /access/user_authority/save
Content-Type: application/json

{
  "user_id": "REG20260224004",
  "permissionOverrides": [
    { "permission": "read:system_logs", "effect": "ALLOW" },
    { "permission": "delete:admin", "effect": "DENY" }
  ],
  "routeOverrides": [
    { "resource": "System Logs", "effect": "ALLOW" }
  ],
  "reason": "Temporary incident-response responsibility",
  "valid_until": "2026-07-21T18:00:00.000Z"
}`,
      ),
      bullets("Delegation and audit safeguards", [
        "Only SuperAdmin and dev receive manage:user_authority during migration; it can later be delegated deliberately.",
        "A non-privileged authority manager can ALLOW only permissions and routes they already possess.",
        "A non-privileged manager cannot delegate manage:user_authority, modify their own direct authority, or manage a privileged target.",
        "Permission names and browser resources are validated against their registries; arbitrary attributes or paths are rejected.",
        "Authenticated-public routes cannot be overridden for one user; their public policy remains system-wide and predictable.",
        "Every save requires a reason, records the grantor and optional expiration, writes both override collections transactionally, and creates a structured security log.",
        "Expired and not-yet-active rows do not enter effective authority. The server evaluates validity; the browser never supplies trusted access attributes.",
      ]),
      bullets("Session protections", [
        "Access tokens are verified on every protected request and checked against token version/revocation state.",
        "Refresh tokens use an HttpOnly cookie; secure cookie behavior is enabled in production.",
        "Password changes rotate the token version and force a new sign-in.",
        "OTP challenges are separately signed, expire quickly, and can be resent within controlled limits.",
        "Suspended users are rejected before protected work is performed.",
      ]),
      callout(
        "Permissions are server decisions",
        "Hiding a button with useCan improves usability, but it is not a security control. The server authorization middleware must allow the matching HTTP method and route before the action succeeds.",
        "warning",
      ),
      bullets("Immediate access changes", [
        "ACL mutations clear the server permission cache for affected users.",
        "Authorization events notify active clients.",
        "The UI invalidates auth_user and bootstrap state, then recomputes the route registry.",
        "A user whose current route is removed is redirected to the first route they can access, not blindly to /admin/404.",
      ]),
      callout(
        "Public documentation",
        "The /docs route is a browser-public route. It does not expose private application records or call protected bootstrap endpoints. Documentation must never include real credentials, secrets, customer data, internal hostnames, or unredacted log samples.",
        "danger",
      ),
    ],
  },
  {
    id: "metadata-forms",
    group: "Core use cases",
    title: "Metadata-driven forms",
    eyebrow: "MetadataForm + MetadataTable",
    audience: "Developers and admins",
    readTime: "20 min",
    summary:
      "Describe a table once: the same description builds its list and form, and the server enforces it on every write.",
    blocks: [
      p(
        "A described table has one row in metadata_tables (labels, title column, sort, search, form layout, sections, stepper) and one row per field in tables_metadata (label, type, in form, in list, required, editable, read-only, section, width, and a config JSON). Lookups live in metadata_lookups and every saved definition in metadata_versions. The UI and the server read the same rows.",
      ),
      flow("From description to screen", [
        "A page renders <MetadataTable table=\"taxes\" />",
        "useTableMetadata fetches GET /api/v1/metadata/taxes (cached 60 s per table)",
        "The server leaves out fields the user may not read and marks fields they may not change read-only",
        "MetadataTable builds columns, search and actions from the list fields and the user's permissions",
        "Add or Edit opens MetadataForm in a modal, drawer or page, optionally as steps",
        "Each field renders through the field type registry",
        "Save sends the record; the server checks it against the same metadata before writing",
      ]),
      table(
        "tables_metadata columns",
        ["Column", "Meaning"],
        [
          ["column_name / col_real_name", "Physical column and its label"],
          ["type", "Field type from the registry (see below)"],
          ["form_visible / list_visible", "Shown in the form / shown as a list column. Hidden from the form also means users can't set it."],
          ["required / editable / disabled", "Required; editable after create; read-only (never written)"],
          ["section_key / col_span / rank", "Section, width out of 24, order"],
          ["config (JSON)", "options, lookup, placeholder, helpText, default, rules, visibleWhen, requiredWhen, min, max, display, currency, accept, maxSizeMb, readPermission, writePermission"],
        ],
      ),
      table(
        "Field types",
        ["Group", "Types"],
        [
          ["Text", "text, textarea, richText, email, phone, url, password"],
          ["Numbers", "integer, number, money, percent, duration"],
          ["Dates", "date, dateTime, time"],
          ["Choices", "switch, select, multiSelect, radio, checkboxGroup (select/multiSelect can show as chips or cards)"],
          ["From another table", "lookup, multiLookup (config.lookup names a metadata_lookups key)"],
          ["Files", "image, file (uploaded to /api/v1/uploads/:table/:column, checked against accept and maxSizeMb)"],
          ["System", "primaryKey, generatedId, color"],
        ],
      ),
      code(
        "A field's config",
        "json",
        `{
  "placeholder": "e.g. 15",
  "helpText": "Applied to the net amount",
  "min": 0,
  "max": 100,
  "rules": [{ "rule": "pattern", "value": "^[0-9.]+$", "message": "Numbers only" }],
  "visibleWhen": { "field": "kind", "in": ["LEVY"] },
  "requiredWhen": { "field": "kind", "in": ["LEVY"] },
  "readPermission": "view:tax_rates"
}`,
      ),
      code(
        "A whole page",
        "jsx",
        `import MetadataTable from '../components/metadata/MetadataTable';

export default function Taxes() {
  return (
    <PageHeader title="Taxes">
      <MetadataTable
        table="taxes"
        columns={{ rate: { render: (value) => \`\${value}%\` } }}
      />
    </PageHeader>
  );
}`,
      ),
      code(
        "A form on its own",
        "jsx",
        `<MetadataForm
  table="taxes"
  record={editing}            // omit to create
  fields={['name', 'rate']}  // optional subset
  onSaved={() => close()}
/>

// useRecordForm is a thin wrapper for pages that open the form imperatively:
const form = useRecordForm();
form.openCreate('taxes', { kind: 'VAT' });
{form.recordModal({ createTitle: 'Add tax', onOk: () => form.save() })}`,
      ),
      table(
        "Extending it",
        ["Need", "How"],
        [
          ["A new field type", "registerFieldType('rating', { render, ... }) in core/metadata/fieldTypes.jsx"],
          ["A new form layout", "registerFormLayout('wizard', Component) in core/metadata/formLayouts.js; steps is built in"],
          ["A custom column or cell", "MetadataTable columns={{ column: { title, render } }}"],
          ["Extra content in a form", "MetadataForm slots"],
          ["Workflow rules", "A hand-written route; metadataSchema(table) can be reused and extended with zod"],
        ],
      ),
      callout(
        "Lookups are keys",
        "A lookup field names a metadata_lookups key. The server decides the source table, value and label columns, filter, sort, row limit and required permission. The browser never sends SQL or column names.",
        "warning",
      ),
      callout(
        "Tables that aren't described",
        "They still work through the generic API with permission checks, but get no field rules. Describe a table in Settings › Data model before building screens on it.",
      ),
    ],
  },
  {
    id: "data-model-builder",
    group: "Core use cases",
    title: "Data model builder",
    eyebrow: "Settings › Data model",
    audience: "Admins and developers",
    readTime: "12 min",
    summary:
      "Describe tables, design forms and lists with a live preview, edit lookups, keep versions, import records and write migrations for new tables.",
    blocks: [
      p(
        "The builder is the browser editor for table metadata. It needs the manage:metadata permission (superadmin and dev by default). Every change is a draft until you choose Save as vN; a save takes effect at once for every user and writes an audit entry.",
      ),
      table(
        "Screens",
        ["Screen", "What you do"],
        [
          ["Tables", "See every table, described or not. Credential, token, log and framework tables are never listed."],
          ["Describe", "Fields are guessed from the columns (types, options from ENUMs, lookups from foreign keys). Review and save as version 1."],
          ["Form", "Outline (sections, order), live preview on desktop or phone, and an inspector for each field or the table (layout, columns, sections, steps)."],
          ["List", "Which fields are columns, their order, which ones search covers, and the default sort, with the live list below."],
          ["History", "Every version with what changed and who changed it. Restore saves the old version as a new one. Export JSON, field CSV or a SQL migration; import JSON or CSV into the draft."],
          ["Lookups", "Edit or create a lookup and preview its choices before saving. Shows which fields use it."],
          ["New table", "Design columns; the builder writes a migration file (table, metadata, permissions, API resources). Save it in server/resources/migrations and run npm run migrate."],
          ["Import records", "Choose a table and a CSV, match columns to fields, check the rows against the same rules as the form, then import, optionally skipping rows with problems."],
        ],
      ),
      bullets("What the builder never does", [
        "Change the database schema. New tables and columns go through migration files.",
        "List or describe credential, token, log or framework tables.",
        "Save without a version: every save is recorded in metadata_versions with the user who made it.",
      ]),
      callout(
        "Carrying a definition to another install",
        "Export the migration from History and add it to the other project's migrations. It upserts the table's metadata and the lookups it uses.",
      ),
    ],
  },
  {
    id: "tables-data",
    group: "Core use cases",
    title: "Tables and data access",
    eyebrow: "useTableApi + provider contracts",
    audience: "Developers",
    readTime: "16 min",
    summary:
      "Online/offline tables, query parameters, column policy, mutations, normalized responses, and invalidation.",
    blocks: [
      p(
        "Table behavior is split into focused hooks. useTableState owns interaction state; useTableQuery translates it into provider requests; useTableColumns builds Ant Design columns; useRowSelection owns selection; useTableApi composes the public experience and can use remote or LocalForage-backed data.",
      ),
      table(
        "Query contract",
        ["UI input", "HTTP representation", "Server behavior"],
        [
          [
            "pagination.current / pageSize",
            "page / limit",
            "Bounded pagination with total metadata",
          ],
          [
            "search",
            "search",
            "LIKE across configured searchable columns or full-text search",
          ],
          [
            "sorter.field / order",
            "sort_by / sort_order",
            "Validated physical column and asc/desc",
          ],
          ["exact filter", "column=value", "Validated equality"],
          ["ranges", "column_min / column_max", ">= and <="],
          ["sets", "column_in / column_not_in", "IN and NOT IN"],
          ["partial text", "column_like", "Parameterized LIKE"],
        ],
      ),
      bullets("Normalized provider responses", [
        "List operations return { data, total, pagination, meta, raw }.",
        "Record operations return { data, raw }.",
        "DataProviderError carries a user-facing message, statusCode, errorCode, details, technicalMessage, and original cause.",
        "The Axios interceptor refreshes expired access tokens once and queues concurrent 401 requests behind the same refresh.",
      ]),
      code(
        "Configured table resource",
        "jsx",
        `const resources = [{
  name: 'projects',
  label: 'Projects',
  permissions: {
    list: 'read:projects',
    create: 'create:projects',
    edit: 'update:projects',
    delete: 'delete:projects',
  },
  meta: {
    mysql: {
      tableConfig: { searchable: ['name', 'reference'] },
    },
  },
}];`,
      ),
      callout(
        "Online/offline boundary",
        "Offline storage improves availability but does not replace server authorization or conflict resolution. Treat LocalForage data as a client cache. Revalidate protected changes with the server when connectivity returns.",
      ),
      bullets("Table production checklist", [
        "Use stable rowKey values from the database primary key.",
        "Keep filters and sort fields within real, non-sensitive table columns.",
        "Represent loading, empty, error, and permission-denied states distinctly.",
        "Invalidate all affected query keys after mutations.",
        "Keep destructive actions explicit, confirmed, and permission-gated.",
      ]),
    ],
  },
  {
    id: "operations",
    group: "Run the system",
    title: "Operations and deployment",
    eyebrow: "Production runbook",
    audience: "Operators and DevOps",
    readTime: "24 min",
    summary:
      "Environment configuration, migrations, deployment, logging, backup, monitoring, and incident handling.",
    blocks: [
      table(
        "Required server environment",
        ["Variable", "Purpose", "Production guidance"],
        [
          ["NODE_ENV", "Runtime behavior", "Set to production"],
          ["PORT", "HTTP port", "Default 3000; place behind a reverse proxy"],
          [
            "DATABASE_HOST/PORT/USER/PASSWORD/NAME",
            "MySQL pool and migrations",
            "Use a least-privilege application account",
          ],
          [
            "ACCESS_TOKEN_SECRET",
            "Signs access tokens",
            "Long random secret; rotate deliberately",
          ],
          [
            "REFRESH_TOKEN_SECRET",
            "Signs refresh tokens",
            "Different from access-token secret",
          ],
          [
            "ENCRYPTION_KEY",
            "Encryption and OTP-related utilities",
            "Provide valid key material; never commit it",
          ],
          [
            "CLIENT_URL",
            "Password-reset destination",
            "Canonical HTTPS UI origin",
          ],
          [
            "EMAIL_USER / EMAIL_PASS",
            "Email OTP and reset delivery",
            "Use an application credential or mail provider",
          ],
        ],
      ),
      table(
        "Optional environment",
        ["Variable", "Purpose"],
        [
          [
            "OTP_CHALLENGE_SECRET / OTP_CHALLENGE_TTL",
            "Separate OTP signing key and lifetime",
          ],
          ["GOOGLE_CLIENT_ID", "Google identity verification"],
          ["CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET", "Cloud-hosted uploads"],
          [
            "LOG_LEVEL/PATH/RETENTION/MAX_SIZE/CONSOLE",
            "Logging volume, destination, and rotation",
          ],
          [
            "LOG_QUERY_MAX_DAYS/LIMIT/BYTES_PER_FILE",
            "Log-viewer safety bounds",
          ],
          [
            "BACKUP_PATH/TIMEOUT_MS",
            "Default backup destination and execution timeout",
          ],
          ["MYSQLDUMP_PATH", "Explicit mysqldump executable"],
          ["SERVICE_NAME", "OTP/service display name"],
        ],
      ),
      steps("Deployment sequence", [
        {
          title: "Back up",
          text: "Create and verify a database backup before schema or ACL changes.",
        },
        {
          title: "Build artifacts",
          text: "Run server tests and the UI production build in a clean environment.",
        },
        {
          title: "Apply migrations",
          text: "Run ordered migrations once against the target database and record the release.",
        },
        {
          title: "Deploy server",
          text: "Load secrets from the environment, start under a process manager, and wait for the startup log.",
        },
        {
          title: "Deploy UI",
          text: "Serve Vite’s dist directory behind HTTPS with history fallback to index.html.",
        },
        {
          title: "Smoke test",
          text: "Test login, refresh, the first authorized route, a list, a form lookup, an ACL change, logs, and backup metadata.",
        },
        {
          title: "Observe",
          text: "Watch 4xx/5xx rate, request latency, database pool health, disk space, log rotation, and backup success.",
        },
      ]),
      bullets("Logging policy", [
        "Log lifecycle events, authentication outcomes, authorization denials, writes, operational failures, and unexpected errors.",
        "Do not log every successful data fetch at high severity; use bounded HTTP/request logs and metrics for volume.",
        "Never log passwords, tokens, secrets, entire cookies, raw credentials, or unrestricted request bodies.",
        "Use requestId to connect a UI network failure to server logs.",
        "Audit events and diagnostic logs have different retention and access requirements.",
      ]),
      bullets("Backup policy", [
        "A user can request the managed server backup directory or an allowed server-side destination.",
        "A browser cannot silently write to an arbitrary local folder; browser folder access requires an explicit picker and support varies by browser.",
        "The backend owns provisioning, mysqldump execution, timeout, result validation, and SHA-256 metadata.",
        "Regularly perform a restore drill. A backup is not proven until it restores successfully.",
      ]),
      callout(
        "Production gate",
        "Replace development CORS origins with environment-managed origins, use HTTPS, secure cookies, a supervised Node process, restricted MySQL credentials, protected log/backup directories, and an external backup copy before exposing the service.",
        "danger",
      ),
      code(
        "Release verification",
        "shell",
        "cd server && npm test\ncd ../ui && npm run lint && npm run build",
      ),
    ],
  },
  {
    id: "extension-guides",
    group: "Build on it",
    title: "Extension playbooks",
    eyebrow: "Safe change patterns",
    audience: "Developers",
    readTime: "20 min",
    summary:
      "Repeatable procedures for new tables, pages, resources, forms, lookups, settings, endpoints, and bootstrap data.",
    blocks: [
      steps("Add a managed table", [
        {
          title: "Create a migration",
          text: "Define the table, indexes, foreign keys, timestamps, and rollback/forward strategy.",
        },
        {
          title: "Describe it",
          text: "Open Settings › Data model, choose Describe, review the guessed fields and save. Or use New table, which writes the table, metadata and permissions in one migration.",
        },
        {
          title: "Register API resources",
          text: "Add method/path rows to admin_resources and map them to permissions.",
        },
        {
          title: "Design the form and list",
          text: "Arrange sections, widths, rules and list columns in the builder; guard sensitive fields with read/write permissions.",
        },
        {
          title: "Build the page",
          text: "Usually just <MetadataTable table=\"…\" /> inside PageHeader. Hand-build only what metadata can't express.",
        },
        {
          title: "Test roles",
          text: "Verify SuperAdmin/dev and at least one restricted role for list, create, edit, and delete.",
        },
      ]),
      steps("Add a browser page", [
        {
          title: "Create the React page",
          text: "Use an existing page pattern and shared components.",
        },
        {
          title: "Declare the route",
          text: "Add the element in App.jsx. This connects the path to code.",
        },
        {
          title: "Register BROWSER_ROUTE",
          text: "Add admin_resources metadata: path, icon, category, order, is_public, and show_in_nav.",
        },
        {
          title: "Map access",
          text: "Assign the route resource through permissions unless it is intentionally authenticated-public.",
        },
        {
          title: "Validate navigation",
          text: "show_in_nav=0 must hide the link without breaking direct authorized access.",
        },
      ]),
      steps("Add a lookup", [
        {
          title: "Create the lookup",
          text: "Settings › Data model › Lookups: key, source table, stored value, shown label, sort, optional dependency and permission.",
        },
        {
          title: "Preview it",
          text: "Preview choices before saving; the server refuses blocked tables and unknown columns.",
        },
        {
          title: "Point fields at it",
          text: "Give lookup fields config.lookup = the key. The server checks submitted values against the same lookup.",
        },
        {
          title: "Test the form",
          text: "Verify options load once, dependent targets refresh, and user-facing errors remain generic.",
        },
      ]),
      steps("Add bootstrap data", [
        {
          title: "Decide if it is truly startup-critical",
          text: "Bootstrap should contain only data needed before normal pages can operate.",
        },
        {
          title: "Register the dataset",
          text: "In a migration, add a framework_bootstrap_datasets row (source, columns, filters, max rows, permission) and link it to the authenticated_startup profile.",
        },
        {
          title: "Keep validation server-side",
          text: "The browser only names the profile. Sensitive sources are blocked, and a dataset with required_permission is skipped for users without it.",
        },
        {
          title: "Consume from ValuesStore",
          text: "Read the dataset by storeName and avoid duplicate fetches in page components.",
        },
      ]),
      steps("Add an appearance setting", [
        {
          title: "Extend defaults",
          text: "Add a safe default in siderConfig.js.",
        },
        {
          title: "Normalize",
          text: "Validate type, range, enum, string length, or safe color before use.",
        },
        {
          title: "Expose an editor",
          text: "Add an Ant Design control and live preview in Appearance Settings.",
        },
        {
          title: "Apply once",
          text: "Map the value through ThemeProvider, useTheme, Ant component tokens, or CSS variables.",
        },
        {
          title: "Persist the whole document",
          text: "Save validated layout.sider JSON, increment version, then refresh bootstrap.",
        },
      ]),
      callout(
        "When code changes are still correct",
        "A configurable framework should reduce routine code edits, not eliminate code as a safety boundary. New executable behavior, new secret handling, new trust relationships, schema migrations, and expanded data exposure should require reviewed code.",
      ),
    ],
  },
  {
    id: "core-hooks-tutorial",
    group: "Developer tutorials",
    title: "Core hooks tutorial",
    eyebrow: "Stable framework contracts",
    audience: "Frontend developers",
    readTime: "32 min",
    summary: "A practical guide to every core data, authentication, access, and framework hook, with working component patterns.",
    blocks: [
      p("Core hooks are the preferred foundation for new pages. They are intentionally thin: each hook reads a provider from context, delegates the operation, and applies a consistent React Query key and cache policy. A page should use these hooks instead of importing Axios or constructing API URLs directly."),
      table("Core data hook reference", ["Hook", "Call shape", "Use it when"], [
        ["useList", "useList({ resource, pagination, filters, sorters, meta, queryOptions })", "Rendering a paginated/searchable collection"],
        ["useOne", "useOne({ resource, id, meta, queryOptions })", "Loading one record when resource and ID exist"],
        ["useMany", "useMany({ resource, ids, meta, queryOptions })", "Resolving a known set of IDs"],
        ["useCreate", "useCreate({ resource, meta, mutationOptions })", "Standard create; resource lists invalidate automatically"],
        ["useUpdate", "useUpdate({ resource, meta, mutationOptions })", "Standard update; list and record caches invalidate"],
        ["useDeleteOne", "useDeleteOne({ resource, meta, mutationOptions })", "Standard delete; list invalidates and record cache is removed"],
        ["useCustom", "useCustom({ url, method, payload, headers, unwrap, queryOptions })", "Cacheable non-CRUD reads"],
        ["useCustomMutation", "useCustomMutation({ mutationOptions })", "Commands or writes with custom endpoints"],
      ]),
      code("Tutorial: list with search, sorting, and loading states", "jsx", `import { Input, Table, Alert } from 'antd';
import { useState } from 'react';
import useList from '../core/hooks/data/useList';

export default function ProjectsList() {
  const [search, setSearch] = useState('');
  const query = useList({
    resource: 'projects',
    pagination: { current: 1, pageSize: 20 },
    filters: { search },
    sorters: [{ field: 'created_at', order: 'descend' }],
    meta: { mysql: { tableConfig: { searchable: ['name', 'code'] } } },
    queryOptions: { staleTime: 30_000 },
  });

  if (query.error) return <Alert type="error" title={query.error.message} />;
  return <>
    <Input.Search allowClear onSearch={setSearch} placeholder="Find a project" />
    <Table
      rowKey="id"
      loading={query.isLoading}
      dataSource={query.data?.data ?? []}
      pagination={{ total: query.data?.total ?? 0, pageSize: 20 }}
      columns={[{ title: 'Project', dataIndex: 'name' }]}
    />
  </>;
}`),
      code("Tutorial: one record and dependent query", "jsx", `const project = useOne({ resource: 'projects', id: projectId });
const members = useMany({
  resource: 'admin',
  ids: project.data?.data?.member_ids ?? [],
  queryOptions: { enabled: project.isSuccess },
});

// Normalized records live at query.data.data.
// Both hooks remain disabled until their required identifiers exist.`),
      code("Tutorial: create, update, and delete", "jsx", `const createProject = useCreate({
  resource: 'projects',
  mutationOptions: { onSuccess: () => message.success('Project created') },
});
const updateProject = useUpdate({ resource: 'projects' });
const deleteProject = useDeleteOne({ resource: 'projects' });

createProject.mutate({ name: 'Apollo', status: 'active' });
updateProject.mutate({ id: 12, variables: { status: 'archived' } });
deleteProject.mutate(12);

// Use isPending to disable duplicate submissions.
// User-facing failures are available as mutation.error.message.`),
      code("Tutorial: a custom command", "jsx", `const provision = useCustomMutation({
  mutationOptions: {
    onSuccess: ({ data }) => message.success(data?.message ?? 'Provisioned'),
    onError: (error) => message.error(error.message),
  },
});

provision.mutate({
  url: '/api/v1/projects/12/provision',
  method: 'post',
  payload: { region: 'eu-west' },
  unwrap: true,
});`),
      table("Core auth and access hooks", ["Hook", "Returns", "Use case"], [
        ["useLogin", "React Query mutation", "Password sign-in and bootstrap invalidation"],
        ["useLogout", "React Query mutation", "Server logout plus local auth cleanup"],
        ["useIdentity", "{ user } from the auth provider", "Current locally held identity"],
        ["usePermissions", "{ roles, permissions, resources, user }", "Reactive access context"],
        ["useCan", "boolean", "Show or disable an action by permission or resource/action"],
        ["useRouteGuard", "{ isAllowed, isReady, target }", "Protect an authenticated layout and redirect safely"],
        ["useAuthorizationEvents", "no UI return", "Refresh ACL context when server access events arrive"],
        ["useForgotPassword/useResetPassword/useChangePassword", "React Query mutations", "Credential recovery and rotation flows"],
        ["useRegister", "React Query mutation", "Provider-backed registration when enabled"],
      ]),
      code("Tutorial: permission-aware actions", "jsx", `const canCreate = useCan('create:projects');
const canEdit = useCan({ resource: 'projects', action: 'edit' });
const { user, roles } = usePermissions();

return <PageHeader
  title="Projects"
  description={\`Signed in as \${user?.name}; roles: \${roles.join(', ')}\`}
  actions={canCreate ? <Button onClick={openCreate}>Add project</Button> : null}
/>;

// This is UX only. The API repeats authorization for every request.`),
      code("Tutorial: protected layout", "jsx", `function ProtectedWorkspace() {
  const { isAllowed, isReady } = useRouteGuard('/login');
  if (!isReady || !isAllowed) return <Spin />;
  return <Outlet />;
}`),
      bullets("Core-hook rules", [
        "Pass mutation callbacks through mutationOptions; the hook preserves automatic invalidation before calling them.",
        "Use queryOptions.enabled for dependent requests rather than conditionally calling hooks.",
        "Do not invent query keys. Use the core hooks or queryKeys helpers so writes invalidate the same cache hierarchy.",
        "Use useCustom for cacheable reads and useCustomMutation for commands. A POST is not automatically a mutation if it is a read-only query, but make that exception explicit.",
        "Do not show raw response details directly. Display DataProviderError.message and use Network/requestId for diagnosis.",
      ]),
    ],
  },
  {
    id: "application-hooks-cookbook",
    group: "Developer tutorials",
    title: "Application hooks cookbook",
    eyebrow: "Higher-level UI behavior",
    audience: "Frontend developers",
    readTime: "38 min",
    summary: "Use cases and examples for the hooks in src/hooks, including tables, forms, overlays, persistence, layout, uploads, and visualization.",
    blocks: [
      table("Which hook should I choose?", ["Need", "Preferred hook", "Notes"], [
        ["Online or offline table", "useTableApi", "Composes state, query, columns, selection, and Ant Table props"],
        ["List plus create/edit for a table", "MetadataTable / MetadataForm", "Built from the table's metadata; useRecordForm wraps MetadataForm for imperative pages"],
        ["Repeatable JSON form fields", "useDynamicForm", "Standalone; a metadata repeater field type is planned"],
        ["Reusable filter bar/drawer", "useDynamicFilter", "Builds values, controls, active count, and request filters"],
        ["Controlled modal or drawer", "useModal / useDrawer", "Use when content is not a metadata record form"],
        ["Upload field", "useUpload", "Metadata image/file fields upload through /api/v1/uploads instead"],
        ["Permission administration", "useAccessControl", "Loads and saves users/permissions/routes by entity"],
        ["Browser persistence", "useLocalForage", "IndexedDB-backed cache or offline data"],
        ["Workspace shell", "useSider", "AppLayout owns the production instance"],
        ["Theme values", "useTheme", "Never parse layout.sider independently in a page"],
        ["Charts/calendar/masonry", "useChart / useCalendar / useMasonry", "Presentation helpers for dashboards"],
        ["Icons and feedback", "useIcons / useNotification", "Registry icon resolution and consistent messages"],
        ["Legacy direct request", "useApi / useDelete", "Prefer core provider hooks for new code"],
      ]),
      code("Tutorial: online useTableApi", "jsx", `const table = useTableApi(
  { pagination: { current: 1, pageSize: 20 } },
  { manual: false },
  'id',
  {
    table: 'projects',
    searchable: ['name', 'code'],
  },
);
const columns = [
  { title: 'Project', dataIndex: 'name', sorter: true },
  { title: 'Status', dataIndex: 'status' },
];

return <>
  <Input.Search onSearch={table.handleGlobalSearch} />
  <Table {...table.tableProps} columns={columns} />
</>;

// Server mode sends pagination/filter/sort state through the provider.`),
      code("Tutorial: offline useTableApi", "jsx", `const table = useTableApi({}, { manual: true }, 'id');

useEffect(() => {
  table.setRecord(cachedRows); // any array activates offline processing
}, [cachedRows]);

// Search, filters, sorting, and pagination now run in memory.
// table.setRecord(null) returns the hook to API mode.`),
      code("Tutorial: a complete metadata page", "jsx", `// List, search, add, edit and delete, all from the table's metadata.
<PageHeader title="Projects">
  <MetadataTable table="projects" />
</PageHeader>

// Imperative variant when the page owns its own table:
const form = useRecordForm();
const create = () => form.openCreate('projects', { status: 'active' });
const edit = (row) => form.openEdit('projects', row, row.id);
{form.recordModal({ createTitle: 'Add project', editTitle: 'Edit project', onOk: () => form.save() })}`),
      code("Tutorial: reusable dynamic filters", "jsx", `const filters = useDynamicFilter({
  variant: 'horizontal',
  filters: [
    { key: 'status_in', type: 'select', label: 'Status', options: statusOptions },
    { key: 'created_at', type: 'dateRange', label: 'Created' },
    { key: 'amount', type: 'range', label: 'Amount', range: [0, 10000] },
  ],
  onChange: (requestFilters) => table.setFilters(requestFilters),
});

return <>{filters.horizontalBarJSX}<Table {...table.tableProps} /></>;

// Use filters.sidebarJSX for a trigger + drawer, or inlineSidebarJSX for a panel.`),
      code("Tutorial: modal and drawer composition", "jsx", `const modal = useModal({ title: 'Review changes', width: 640 });
const drawer = useDrawer({ title: 'Project details', width: 520 });

<Button onClick={() => modal.openModal({ content: <Review /> })}>Review</Button>
<Button onClick={() => drawer.openDrawer({ content: <ProjectDetails /> })}>Details</Button>
{modal.modalJSX()}
{drawer.drawerJSX()}

// Keep business state in the page; overlays own visibility and framing.`),
      code("Tutorial: LocalForage cache", "jsx", `const cache = useLocalForage({ name: 'budget-manager', storeName: 'projects' });

await cache.setItem('recent', rows);
const recent = await cache.getItem('recent');
await cache.updateItem('preferences', { pageSize: 50 });
await cache.deleteItem('recent');

// Handle cache.loading/cache.error. Never store access tokens or assume cached ACL data is authoritative.`),
      table("Specialized hook catalog", ["Hook", "Typical use", "Important output"], [
        ["useNotification", "Messages, alerts, confirmations", "message plus AlertJsx/notification helpers"],
        ["useIcons", "Database icon names", "resolveIcon, iconMap, iconNames"],
        ["useTheme", "Current resolved public/workspace design", "appearance, mode, isDark, toggle"],
        ["useGlobalSelect", "Legacy database-backed select", "Select JSX/options; prefer structured lookups in new metadata forms"],
        ["useTextEditor", "Rich-text field", "editor, content, getContent, setContent, editorChanged/isDirty, markClean, reset, editorRef"],
        ["useDraggable", "Draggable Ant modal", "drag(modal), draggableTitleProps"],
        ["useScrollToTop", "Reset scroll on navigation", "Side effect only"],
        ["useChart", "Recharts dashboard composition", "Chart factories/config helpers"],
        ["useCalendar", "Ant calendar variants", "calendar JSX/config and selected value state"],
        ["useMasonry", "Responsive card/image grids", "grid JSX, item helpers, layout options"],
        ["useStatistics", "Not implemented", "The file is currently empty; do not import it until an API and tests are added"],
        ["useBootstrap", "Compatibility shim", "Bootstrap is now owned by FrameworkProvider"],
      ]),
      callout("Stable versus specialized", "Core hooks, MetadataForm/MetadataTable and useTableApi are framework contracts. Visualization, legacy request, and domain hooks are conveniences whose API may evolve. Wrap specialized behavior in your own feature component when multiple pages depend on it."),
    ],
  },
  {
    id: "backend-tutorials",
    group: "Developer tutorials",
    title: "Backend implementation tutorials",
    eyebrow: "Build safely on Express + MySQL",
    audience: "Backend developers",
    readTime: "36 min",
    summary: "Concrete server recipes for generic resources, custom routes, services, queries, validation, errors, logging, settings, and tests.",
    blocks: [
      p("Use the generic API for ordinary table CRUD. Add custom routes only when an operation spans tables, has business invariants, invokes an external system, needs a transaction, or has a response that is not a table resource. Custom does not mean unvalidated."),
      steps("Tutorial: expose a table through generic CRUD", [
        { title: "Create the migration", text: "Define projects with a primary key, bounded columns, indexes, timestamps, and foreign keys." },
        { title: "Describe it", text: "Describe the table in Settings › Data model (or let New table write the whole migration). The server then enforces its rules on every generic write." },
        { title: "Create API resources", text: "Register GET/POST/PUT/DELETE paths and methods in admin_resources." },
        { title: "Create permissions", text: "Add read/create/update/delete permission names and map them to resources." },
        { title: "Assign a role", text: "Map only the permissions required by that role." },
        { title: "Use existing routes", text: "BaseRoute + validateTable + BaseService now handle CRUD; no new Express route is required." },
      ]),
      code("Migration example", "sql", `CREATE TABLE projects (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(120) NOT NULL,
  code VARCHAR(30) NOT NULL,
  status ENUM('active','archived') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_projects_code (code),
  KEY idx_projects_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`),
      code("Tutorial: custom transaction endpoint", "js", `const AppError = require('../shared/helpers/AppError');
const conn = require('../core/config/conn');

app.post('/api/v1/projects/:id/archive', async (req, res) => {
  const id = Number.parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id < 1) throw new AppError('ERR_INVALID_INPUT');

  const connection = await conn.getConnection();
  try {
    await connection.beginTransaction();
    const [result] = await connection.execute(
      'UPDATE projects SET status = ? WHERE id = ? AND status = ?',
      ['archived', id, 'active'],
    );
    if (result.affectedRows !== 1) throw new AppError('ERR_CONFLICT', 'Project cannot be archived');
    await connection.execute(
      'INSERT INTO project_events (project_id, event_type, actor_id) VALUES (?, ?, ?)',
      [id, 'ARCHIVED', req.user.sub],
    );
    await connection.commit();
    res.json({ status: 'ok', data: { id, status: 'archived' } });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
});

// Also register POST /api/v1/projects/:id/archive in the ACL tables.`),
      code("Tutorial: QueryBuilder inside a trusted service", "js", `const Model = require('../core/model/model');

async function activeProjectSummary(ownerId) {
  return new Model()
    .select(['id', 'name', 'code', 'status'], 'projects')
    .where('owner_id', '=', ownerId)
    .where('status', '=', 'active')
    .orderBy('created_at', 'DESC')
    .limit(100)
    .execute();
}

// Values are bound parameters. Table/column identifiers here are developer-authored.
// Browser-provided tables must go through validateTable/resolveTableDefinition.`),
      code("Tutorial: validate a custom request", "js", `const { z } = require('zod');
const AppError = require('../shared/helpers/AppError');

const archiveSchema = z.object({ reason: z.string().trim().min(5).max(300) }).strict();
const parsed = archiveSchema.safeParse(req.body);
if (!parsed.success) {
  throw new AppError('ERR_VALIDATION_FAILED', 'Check the submitted information', {
    fields: parsed.error.issues.map((issue) => issue.path.join('.')),
  });
}
// Use parsed.data, never req.body, after validation.`),
      code("Tutorial: operational error and structured log", "js", `if (!project) {
  throw new AppError('ERR_RECORD_NOT_FOUND', 'Project was not found');
}

logger.security('Project archived', {
  requestId: req.requestId,
  userId: req.user.sub,
  projectId: project.id,
  operation: 'archive-project',
});

// Do not put passwords, tokens, cookies, secrets, or full request bodies in log context.`),
      steps("Tutorial: add a database-managed setting", [
        { title: "Define ownership", text: "Decide whether the value is public UI configuration, non-sensitive runtime configuration, or a secret. Secrets remain environment/server-controlled." },
        { title: "Create schema and default", text: "Add a migration and a safe default value." },
        { title: "Validate the entire document", text: "Use a strict Zod schema with ranges and enums, as UiSettingsRoute does." },
        { title: "Use optimistic concurrency", text: "Require expectedVersion and update WHERE version = expectedVersion." },
        { title: "Audit and publish", text: "Log the actor and broadcast a change event after commit." },
      ]),
      table("What to test", ["Case", "Expected assertion"], [
        ["Authorized role", "Correct response and database change"],
        ["Unmapped role", "403 with stable errorCode"],
        ["Invalid input", "400 without partial write"],
        ["Missing record", "404 or domain-specific conflict"],
        ["Concurrent version", "409 and no overwrite"],
        ["Sensitive field/table", "Rejected even for a structurally valid request"],
        ["Unexpected database error", "Generic production response; detailed structured server log"],
      ]),
      callout("Route registration is not authorization", "Creating an Express handler does not make it reachable to ordinary roles. Add the exact method/path to admin_resources and map it to a permission. Keep privileged bypass limited to SuperAdmin and dev.", "warning"),
    ],
  },
  {
    id: "end-to-end-project-tutorial",
    group: "Developer tutorials",
    title: "End-to-end feature tutorial",
    eyebrow: "From migration to production page",
    audience: "Full-stack developers",
    readTime: "30 min",
    summary: "Build a Projects feature through schema, metadata, ACL, provider configuration, page composition, forms, tables, and verification.",
    blocks: [
      flow("Feature delivery path", [
        "Migration",
        "Metadata",
        "ACL resources",
        "Permissions",
        "UI resource",
        "Browser route",
        "Table + form page",
        "Tests",
        "Documentation",
      ]),
      steps("1. Database and metadata", [
        { title: "Create projects", text: "Use the migration from Backend tutorials and apply it through npm run migrate." },
        { title: "Describe the table", text: "Settings › Data model › Describe. Check the guessed types: status becomes a select from the ENUM, timestamps read-only, id the primary key." },
        { title: "Add a lookup if needed", text: "For owner_id, create a lookup (source admin, value custom_id, label name) and point the field at it." },
      ]),
      code("What the builder saves", "json", `[
  { "column_name": "name", "col_real_name": "Project name", "type": "text", "required": 1, "rank": 1 },
  { "column_name": "code", "col_real_name": "Reference code", "type": "text", "required": 1, "rank": 2,
    "config": { "rules": [{ "rule": "pattern", "value": "^[A-Z0-9-]{3,30}$" }] } },
  { "column_name": "status", "col_real_name": "Status", "type": "select", "rank": 3,
    "config": { "options": [{ "value": "active", "label": "Active" }, { "value": "archived", "label": "Archived" }], "display": "chips" } }
]`),
      steps("2. Access control", [
        { title: "Register endpoints", text: "Create API_RESOURCE rows for GET /api/projects/table, POST /api/projects, PUT /api/projects/:id, and DELETE /api/projects/:id." },
        { title: "Register the page", text: "Create a BROWSER_ROUTE for /admin/projects with icon, category, order, show_in_nav=1, and is_public=0." },
        { title: "Map permissions", text: "Map read/create/update/delete:projects to their endpoints and read:projects to the browser route." },
        { title: "Assign roles", text: "Give project managers the required permissions, then verify a baseline User cannot access the page." },
      ]),
      code("3. Register the UI resource", "jsx", `// main.jsx resource configuration
{
  name: 'projects',
  label: 'Projects',
  permissions: {
    list: 'read:projects',
    create: 'create:projects',
    edit: 'update:projects',
    delete: 'delete:projects',
  },
  meta: {
    mysql: { tableConfig: { searchable: ['name', 'code'] } },
  },
}`),
      code("4. Compose the page", "jsx", `export default function Projects() {
  // Columns, search, add/edit/delete and permission checks come from the
  // metadata and the user's create/update/delete:projects permissions.
  return (
    <PageHeader title="Projects" description="Manage active and archived projects.">
      <MetadataTable
        table="projects"
        columns={{ status: { render: (value) => <Tag>{value}</Tag> } }}
      />
    </PageHeader>
  );
}`),
      steps("5. Register and verify the browser route", [
        { title: "Add App.jsx route", text: "Import Projects and add <Route path=\"projects\" element={<Projects />} /> beneath /admin." },
        { title: "Refresh bootstrap", text: "Sign out/in or invalidate bootstrap after inserting admin_resources metadata." },
        { title: "Verify navigation", text: "The link appears by display_order only for authorized users when show_in_nav=1." },
        { title: "Verify direct access", text: "show_in_nav=0 hides the link but the route still works for an assigned user." },
      ]),
      table("6. Acceptance checklist", ["Scenario", "Expected result"], [
        ["Project manager opens /admin/projects", "Page and list load"],
        ["Baseline User opens the path", "Guard denies the private route"],
        ["Create valid project", "Record saved, modal resets, list refetches"],
        ["Duplicate code", "Friendly conflict message; technical details in Network/logs"],
        ["Edit project", "Only metadata-writable, non-primary fields are sent"],
        ["Role removed during session", "Authorization event refreshes access and route is removed"],
        ["Mobile viewport", "Header actions, table overflow, form modal remain usable"],
      ]),
      callout("Definition of done", "A feature is not complete when its page renders. It is complete when schema, metadata, server authorization, UI permission behavior, loading/error/empty states, cache invalidation, tests, operations, and documentation agree."),
    ],
  },
  {
    id: "live-hook-lab",
    group: "Developer tutorials",
    title: "Live hook laboratory",
    eyebrow: "Interactive examples",
    audience: "Frontend developers",
    readTime: "12 min",
    summary: "Exercise the framework hooks in a public, isolated playground before using them in an authenticated feature.",
    blocks: [
      p("Hook Studio gives every application and core framework hook its own selectable page. Search by name or capability, run the preview, edit and copy the source scratchpad, and inspect the runtime contract before using the hook in a feature."),
      callout("Safe public demo", "Public-runnable hooks execute their real implementation against local sample values. Data, lookup, form, access, and safe authentication hooks run against nested mock DataProvider, AuthProvider, and React Query environments. Session-destructive hooks use purpose-built behavioral demos. Nothing touches MySQL, protected endpoints, uploads, credentials, or the current session."),
      { type: "hook-lab" },
      table("How to use each playground", ["Tab", "What you can do", "Safety boundary"], [
        ["Preview", "Use the actual select, dynamic form, record modal, table, record, permission editor, or authentication surface", "Real hooks run against local values or isolated providers"],
        ["Code", "Edit, reset, and copy a complete usage example", "Scratchpad source is not evaluated with unsafe browser eval"],
        ["Contract", "Inspect source path, runtime classification, and ownership", "Shows when the preview is live, local, simulated, deprecated, or planned"],
        ["Isolated providers", "Run core queries, mutations, lookups, metadata forms, and safe auth mutations", "Nested providers keep the documentation separate from MySQL and the current session"],
      ]),
    ],
  },
  {
    id: "layout-overlay-hooks",
    group: "Developer tutorials",
    title: "Layout and overlay hooks",
    eyebrow: "useSider, useModal, useDrawer",
    audience: "Frontend developers",
    readTime: "24 min",
    summary: "Build the application shell and controlled overlays with the exact APIs exposed by useSider, useModal, useDrawer, useDraggable, and useTheme.",
    blocks: [
      p("These hooks are composition helpers. They do not replace page state or business services. useSider owns shell navigation state, useModal and useDrawer own overlay state, useDraggable supplies bounded modal movement, and useTheme reads the normalized appearance context."),
      table("Hook ownership", ["Hook", "Owns", "Does not own"], [
        ["useSider", "Collapsed state, route selection, item processing, shell JSX", "Resource authorization or bootstrap fetching"],
        ["useModal", "Visibility, title, content, footer, loading, confirmation loading", "Form validation or database mutations"],
        ["useDrawer", "Visibility, content, placement sizing, optional resizing", "Record selection or API persistence"],
        ["useDraggable", "Viewport bounds and draggable modal wrapper", "A complete modal"],
        ["useTheme", "Access to ThemeProvider context", "Saving appearance settings"],
      ]),
      table("useSider initialization configuration", ["Option", "Default", "Meaning"], [
        ["variant", "sider", "Shell arrangement passed to SiderLayout"],
        ["width / collapsedWidth", "220 / 80", "Expanded and collapsed navigation width"],
        ["breakpoint", "lg", "Responsive collapse boundary: xs through xxl"],
        ["theme", "dark", "Ant Design sider/menu theme"],
        ["collapsible / defaultCollapsed", "true / false", "Whether collapse is allowed and its saved starting state"],
        ["isGrouped / groupKey / groupVariant", "false / undefined / dropdown", "Optional navigation grouping"],
        ["orderKey / bottomKey", "order / settings", "Sorting field and item pinned to the bottom"],
        ["defaultHeader / defaultFooter", "true / false", "Whether SiderLayout supplies standard regions"],
        ["colors and style objects", "undefined", "Appearance tokens and region-level overrides"],
      ]),
      code("Complete useSider shell", "jsx", `function WorkspaceShell({ resources, user, appearance }) {
  const items = useMemo(() => resources.map((resource) => ({
    key: resource.route,
    path: resource.route,
    label: resource.label,
    icon: resolveResourceIcon(resource.icon),
    group: resource.category,
    order: resource.display_order,
  })), [resources]);

  const shell = useSider({
    variant: appearance.layout.variant,
    width: appearance.layout.sider.width,
    collapsedWidth: appearance.layout.sider.collapsedWidth,
    breakpoint: appearance.layout.sider.breakpoint,
    theme: appearance.layout.sider.theme,
    collapsible: appearance.layout.sider.collapsible,
    defaultCollapsed: appearance.layout.sider.defaultCollapsed,
    isGrouped: appearance.layout.sider.groupNavigation,
    groupKey: 'group',
    colors: appearance.colors,
  }, {
    items,
    appName: appearance.brand.name,
    user,
    showSiderProfile: true,
    onProfile: () => navigate('/admin/profile'),
    onLogout: logout,
  });

  return shell.layoutJSX({
    header: <WorkspaceHeader onToggle={shell.toggle} />,
    footer: <BuildVersion />,
  });
}`),
      bullets("useSider rules", [
        "Call it beneath BrowserRouter because it reads useNavigate and useLocation.",
        "Treat the first argument as structural configuration and the second as live runtime data. Memoize resource items so they are not rebuilt on every render.",
        "defaultCollapsed is synchronized when saved bootstrap appearance changes; collapsible=false forces the shell open.",
        "The resource list must already be authorized. show_in_nav controls visibility, not direct-route authorization.",
        "layoutJSX renders the complete SiderLayout, including its Outlet. Do not nest it inside another workspace shell.",
      ]),
      code("Reusable confirmation modal", "jsx", `function DeleteProjectButton({ project }) {
  const dialog = useModal({
    width: 480,
    centered: true,
    draggable: true,
    resetOnClose: true,
    okText: 'Delete project',
    okType: 'danger',
  });

  const confirmDelete = () => dialog.openModal({
    title: 'Delete project?',
    content: <p>{project.name} will no longer be available.</p>,
    onOk: async () => {
      await deleteProject(project.id);
      dialog.closeModal();
    },
  });

  return <>
    <Button danger onClick={confirmDelete}>Delete</Button>
    {dialog.modalJSX()}
  </>;
}`),
      table("useModal return contract", ["Member", "Use"], [
        ["open, loading, confirmLoading", "Read current overlay state"],
        ["openModal(config)", "Set dynamic title/content/footer/callbacks and open"],
        ["closeModal()", "Close and optionally reset dynamic state"],
        ["updateTitle / updateContent / updateFooter", "Replace content while the modal remains open"],
        ["setLoading / setConfirmLoading", "Control Ant Design loading states"],
        ["modalJSX(overrides, localContent)", "Render the modal once near the owning component return"],
      ]),
      callout("Async confirmation behavior", "useModal enables confirmLoading while onOk runs. It deliberately does not close automatically after a successful callback; call closeModal after the mutation succeeds. If the promise rejects, the modal remains open so the user can recover.", "warning"),
      code("Resizable details drawer", "jsx", `function ProjectDetails({ project }) {
  const panel = useDrawer({
    placement: 'right',
    width: 520,
    resizable: true,
    minWidth: 360,
    maxWidth: 760,
    resetOnClose: true,
  });

  return <>
    <Button onClick={() => panel.openDrawer({
      title: project.name,
      extra: <Tag color="green">Active</Tag>,
      content: <ProjectSummary project={project} />,
      footer: <Button onClick={panel.closeDrawer}>Done</Button>,
    })}>View details</Button>
    {panel.drawerJSX()}
  </>;
}`),
      table("useDrawer return contract", ["Member", "Use"], [
        ["open, loading, width, height", "Read current panel and resize state"],
        ["openDrawer(config) / closeDrawer()", "Open with dynamic regions or close/reset"],
        ["updateTitle / updateContent / updateExtra / updateFooter", "Update an open drawer"],
        ["setOpen / setLoading / setWidth / setHeight", "Imperative control for advanced compositions"],
        ["drawerJSX(overrides, localContent)", "Render the Ant Design Drawer"],
      ]),
      code("Reading appearance tokens", "jsx", `function StatusSurface() {
  const {
    isDark, mode, scope, isWorkspace,
    configuredMode, toggle, clearPreference, appearance,
  } = useTheme();

  return <Card style={{ background: appearance.colors.elevatedBg }}>
    <span>{scope} / {mode}</span>
    <Button onClick={toggle}>{isDark ? 'Light' : 'Dark'}</Button>
    <Button onClick={clearPreference}>Use configured mode</Button>
  </Card>;
}`),
      callout("Theme scope", "ThemeProvider supplies the context and Ant Design ConfigProvider tokens. The workspace scope uses saved appearance settings; public surfaces can use their own normalized scope. useTheme reads this state—it does not write ui_settings."),
    ],
  },
  {
    id: "visualization-hooks",
    group: "Developer tutorials",
    title: "Charts, calendars, and masonry",
    eyebrow: "Visualization hooks",
    audience: "Frontend developers",
    readTime: "25 min",
    summary: "Use the visualization hooks with normalized data, responsive layouts, note and event state, custom renderers, and honest implementation boundaries.",
    blocks: [
      p("Visualization hooks convert stable application data into reusable Ant Design or Recharts presentation. Prepare and authorize the data before it reaches these hooks; they are renderers and local interaction managers, not reporting services."),
      table("Visualization hook matrix", ["Hook", "Supported modes", "Primary result"], [
        ["useChart", "line, bar, pie, area, composed", "renderChart(options), Chart, chartTypes"],
        ["useCalendar", "basic, notice, card, selectable, lunar, week, custom-header", "calendarProps plus note/event helpers"],
        ["useMasonry", "basic, responsive, image, dynamic, custom", "masonryProps, masonryJSX, and item actions"],
        ["useStatistics", "None", "Empty placeholder file; no production API exists"],
      ]),
      code("Multi-series and composed charts", "jsx", `const chartDefaults = useMemo(() => ({
  height: 320,
  xKey: 'month',
  showGrid: true,
  showTooltip: true,
}), []);
const chart = useChart(chartDefaults);

const series = [
  { dataKey: 'target', name: 'Target', color: '#a89f94', chart: 'bar' },
  { dataKey: 'actual', name: 'Actual', color: '#d4570a', chart: 'line' },
];

return chart.renderChart({
  type: 'composed',
  data: monthlyResults,
  series,
  showLegend: true,
  tooltipFormatter: (value) => [formatCurrency(value), 'Amount'],
});`),
      table("useChart options", ["Option", "Purpose"], [
        ["type", "Select line, bar, pie, area, or composed"],
        ["data / xKey / dataKey / nameKey", "Describe the normalized dataset fields"],
        ["series", "One string or object per Cartesian series; chart chooses bar/line in composed mode"],
        ["colors", "Pie-cell palette or fallback series palette"],
        ["height / margin", "Responsive container height and Recharts margins"],
        ["showGrid / showXAxis / showYAxis / showTooltip / showLegend", "Toggle chart furniture"],
        ["innerRadius / outerRadius", "Configure a pie or doughnut"],
        ["tooltipFormatter", "Format displayed values without mutating source data"],
      ]),
      code("Pie chart", "jsx", `const chart = useChart();

return chart.renderChart({
  type: 'pie',
  data: [
    { status: 'Active', count: 42 },
    { status: 'Paused', count: 8 },
  ],
  nameKey: 'status',
  dataKey: 'count',
  colors: ['#2f855a', '#d69e2e'],
  innerRadius: 52,
  outerRadius: 84,
  showLegend: true,
});`),
      callout("Stable defaults", "Memoize the object passed to useChart when it is created inside a component. renderChart is memoized against that object; a new object on every render needlessly recreates the callback."),
      code("Calendar with server-backed notes", "jsx", `function TeamCalendar({ notes, saveNote, deleteNoteOnServer }) {
  const calendar = useCalendar('notice', {
    notes,
    maxNotesPerDay: 5,
    onDateSelect: (date, detail) => setInspector({ date, ...detail }),
    onNoteAdd: async (date, note) => saveNote(date.format('YYYY-MM-DD'), note),
    onNoteDelete: async (date, noteId) => deleteNoteOnServer(noteId),
  });

  return <>
    <Calendar {...calendar.calendarProps} />
    <Button onClick={() => calendar.addNote(calendar.selectedDate, {
      title: 'Review',
      type: 'processing',
    })}>Add review</Button>
  </>;
}`),
      table("useCalendar capabilities", ["Area", "Members"], [
        ["Selection", "selectedDate, selectedCell, mode, setters and selection handlers"],
        ["Notes", "calendarNotes, get/add/delete/update note and month helpers"],
        ["Events", "calendarEvents, get/add/delete/update event"],
        ["Lunar", "lunarData input, getLunarData, lunarCellRender"],
        ["Rendering", "noticeCellRender, customHeaderRender, calendarProps"],
        ["Summary", "stats derived from local note and event maps"],
      ]),
      bullets("Calendar persistence contract", [
        "Use YYYY-MM-DD keys for day notes and events. Month-level notes use YYYY-MM.",
        "The hook updates local state first and invokes callbacks; callbacks are the feature's opportunity to persist changes.",
        "External notes/events are synchronized when non-empty maps change. A service remains the source of truth after reload.",
        "disabledDate, validRange, locale, and mode are forwarded through calendarProps.",
      ]),
      code("Responsive dynamic masonry", "jsx", `const initialItems = useMemo(() => projects.map((project) => ({
  id: project.id,
  title: project.name,
  description: project.status,
  height: project.card_height,
})), [projects]);

const board = useMasonry('dynamic', {
  initialItems,
  keyField: 'id',
  heightKey: 'height',
  columns: { xs: 1, sm: 2, md: 3 },
  gutter: 12,
  onItemClick: (item) => openProject(item.data.id),
});

return <>
  <Button onClick={() => board.addItem(newProject)}>Add card</Button>
  {board.masonryJSX()}
</>;`),
      table("useMasonry return contract", ["Area", "Members"], [
        ["State", "items, loading, error, selectedItem, layout"],
        ["Loading", "load and optional url-based request"],
        ["Mutation", "setItems, addItem, removeItem, updateItem, clearItems"],
        ["Layout", "pinItemToColumn, reorderItems, onLayoutChange"],
        ["Helpers", "normalizeItems, handleItemClick, handleImageLoad"],
        ["Rendering", "masonryProps and masonryJSX(overrides)"],
      ]),
      callout("Current network boundary", "The url option in useMasonry uses the legacy useApi hook. For new protected feature work, prefer loading records through the provider/core query layer and pass them as initialItems until useMasonry is migrated to the provider contract.", "warning"),
      callout("useStatistics status", "ui/src/hooks/useStatistics.jsx is currently a zero-byte placeholder. The documentation intentionally does not invent functions for it. Define requirements, implement the API, and add unit tests before exposing it to feature developers.", "warning"),
    ],
  },
  {
    id: "utility-hooks-deep-dive",
    group: "Developer tutorials",
    title: "Filters, feedback, storage, and utility hooks",
    eyebrow: "Remaining hook reference",
    audience: "Frontend developers",
    readTime: "28 min",
    summary: "Detailed use cases for dynamic filters, notifications, icons, offline storage, global lookup selects, uploads, rich text, access assignment, route scrolling, and legacy hooks.",
    blocks: [
      table("Choose the correct utility hook", ["Need", "Hook", "Important boundary"], [
        ["Composable filters", "useDynamicFilter", "Emits values; the caller performs the query"],
        ["Toast, notification, or inline alert", "useNotification", "User-facing feedback, not server logging"],
        ["Database icon name to React icon", "useIcons", "Returns an element, not a component class"],
        ["IndexedDB/local fallback storage", "useLocalForage", "Never store access tokens or secrets"],
        ["Allowlisted lookup select", "useGlobalSelect", "Table and fields must be in the server lookup registry"],
        ["Ant Design file upload", "useUpload", "Legacy specialized API; validate file types again on the server"],
        ["Self-hosted rich-text editing", "useTextEditor", "Tiptap needs no API key; HTML must still be sanitized before storage/rendering"],
        ["Role assignment deltas", "useAccessControl", "Server remains the authorization authority"],
        ["Scroll on route transition", "useScrollToTop", "Must run below React Router"],
      ]),
      code("Server-driven and URL-persisted filters", "jsx", `const filters = useDynamicFilter({
  filters: [
    { key: 'q', type: 'search', label: 'Search' },
    { key: 'status_in', type: 'select', label: 'Status', options: statusOptions },
    { key: 'amount', type: 'range', label: 'Amount', range: [0, 10000] },
    { key: 'created_at', type: 'dateRange', label: 'Created' },
    { key: 'verified', type: 'switch', label: 'Verified only' },
  ],
  persistence: 'url',
  onChange: (activeValues) => table.setFilters(activeValues),
});

return <>
  {filters.horizontalBarJSX}
  <Tag>{filters.activeCount} active</Tag>
  <CustomTable tableConfig={table} columns={columns} />
</>;`),
      table("Dynamic filter render choices", ["Member", "Use"], [
        ["horizontalBarJSX", "Toolbar above a table"],
        ["sidebarJSX", "Button that opens an Ant Design filter Drawer"],
        ["inlineSidebarJSX", "Persistent filter panel in catalogue layouts"],
        ["renderControl(filter)", "Place one configured control in a custom layout"],
        ["filteredData", "Result when a local client dataset is supplied"],
        ["activeValues / activeCount", "Only non-default values and their count"],
        ["setValue / removeFilter / reset", "Imperative filter state changes"],
      ]),
      code("Friendly feedback at three levels", "jsx", `const feedback = useNotification();
const AlertJsx = feedback.AlertJsx;

async function save() {
  try {
    await saveProfile();
    feedback.message.success('Profile saved');
    feedback.notification.success('Saved', 'Your profile is now up to date.');
  } catch {
    feedback.alert.error('Could not save', 'Review the highlighted fields and try again.');
  }
}

return <>
  <AlertJsx />
  <Button onClick={save}>Save</Button>
</>;`),
      bullets("Feedback selection", [
        "Use message for brief completion feedback.",
        "Use notification when a short title plus explanation should remain visible longer.",
        "Use AlertJsx for feedback that must remain in the page flow and be accessible to screen readers.",
        "Do not show SQL errors, stack traces, method/path combinations, or permission internals to an end user.",
      ]),
      code("Resolve database-managed icons", "jsx", `const { resolveIcon, iconNames } = useIcons();
const resourceIcon = resolveIcon(resource.icon || 'AppstoreOutlined');

return <Menu.Item icon={resourceIcon}>{resource.label}</Menu.Item>;

// iconNames can power an appearance/resource icon picker.
const options = iconNames.map((name) => ({ label: name, value: name }));`),
      callout("Icon return type", "resolveIcon(name) returns a React element such as <AppstoreOutlined />, not a component constructor. Pass it to icon={resourceIcon}; do not render <resourceIcon />."),
      code("Offline cache with an isolated store", "jsx", `const cache = useLocalForage({
  name: 'mysql-orm',
  storeName: 'table-cache',
});

await cache.setItem('projects:list', {
  rows,
  cachedAt: Date.now(),
});

const snapshot = await cache.getItem('projects:list');
await cache.updateItem('projects:list', { stale: true });
await cache.deleteItem('projects:list');`),
      table("useLocalForage operations", ["Category", "Members"], [
        ["Single item", "getItem, setItem, updateItem, deleteItem"],
        ["Bulk", "getItems, setItems, updateItems, deleteItems, getAll"],
        ["Store", "clear, keys, length, key, iterate, getDriver, store"],
        ["Status", "loading and error wrap every async operation"],
      ]),
      callout("Offline is not authorization", "Cached rows are a usability feature. Reconnect operations must still pass server authentication, permission checks, validation, conflict handling, and current role policy.", "warning"),
      code("Lazy allowlisted lookup select", "jsx", `const roles = useGlobalSelect('role_name', 'admin_roles', true);

return <>
  <roles.SelectJsx
    placeholder="Assign roles"
    onChange={(values) => form.setFieldValue('roles', values)}
  />
  <Button onClick={roles.reset}>Reload options next time</Button>
</>;`),
      bullets("Global select behavior", [
        "Options are fetched only when the dropdown first opens.",
        "The lookup request selects id plus the named display column and optional groupBy column.",
        "multi=true enables multiple selection and compact tags.",
        "A 403 Lookup is not registered response means the server allowlist must be reviewed; the UI must not bypass it.",
      ]),
      code("Profile image upload", "jsx", `const upload = useUpload('tables_metadata', 'table_name');

useEffect(() => {
  upload.setUploadURL('/api/profile/avatar');
  upload.setUploaderName('avatar');
  upload.setAcceptedFiles(['image/png', 'image/jpeg', 'image/webp']);
  upload.setNumFiles(1);
}, []);

return <>
  {upload.uploader('avatar', '/api/profile/avatar', 'profile-avatar')}
  {upload.preview()}
</>;`),
      callout("Upload hardening", "The browser accept list is convenience only. The server must verify authentication, file signature/MIME, size, image dimensions, generated filename, storage destination, and ownership. Do not trust the uploaded extension."),
      code("Rich-text editor", "jsx", `const text = useTextEditor({
  uploadImage: async (file) => {
    const payload = new FormData();
    payload.append('image', file);
    const response = await api.post('/api/article-images', payload);
    return response.data.url;
  },
});

return <Form onFinish={() => saveArticle({ body: text.content })}>
  {text.editor(existingArticle.body)}
  <Button htmlType="submit" disabled={!text.editorChanged}>Save article</Button>
</Form>;`),
      callout("Rich HTML safety", "useTextEditor is built on the MIT-licensed, self-hosted Tiptap core and does not need an API key. It returns HTML and can insert uploaded media. Sanitize HTML on the server with an explicit allowlist, validate image signatures and ownership, and sanitize again or use a trusted renderer when displaying saved content.", "warning"),
      callout("Vite dependency cache", "After installing or upgrading editor packages, stop the UI development server and run npm run dev:force once. A 504 Outdated Optimize Dep response means the browser or development server is still referencing an older node_modules/.vite pre-bundle; it is not an editor API or licensing failure."),
      code("Role permission assignment", "jsx", `const control = useAccessControl({
  role: selectedRole,
  fetchEndpoint: '/access/permissions/' + selectedRole,
  saveEndpoint: '/access/permissions/save',
  storeKey: 'permissions',
  assignedKey: 'permission',
  entityName: 'Permissions',
});

return <>
  {control.allItems.map((item) => (
    <Switch
      key={item.permission}
      checked={control.isItemEnabled(item.permission)}
      onChange={(enabled) => control.handleToggle(item.permission, enabled)}
    />
  ))}
  <Button disabled={!control.isDirty} loading={control.saving} onClick={control.save}>Save</Button>
  <Button disabled={!control.isDirty} onClick={control.reset}>Reset</Button>
</>;`),
      code("Route scroll reset", "jsx", `function RouteEffects() {
  useScrollToTop();
  return null;
}

function App() {
  return <BrowserRouter>
    <RouteEffects />
    <ApplicationRoutes />
  </BrowserRouter>;
}`),
      table("Legacy and migration status", ["Hook", "Guidance"], [
        ["useApi", "Legacy imperative HTTP helper still used by several specialized hooks; new CRUD should use provider/core contracts"],
        ["useDelete", "Legacy delete helper; prefer provider delete plus query invalidation"],
        ["useBootstrap", "Deprecated application hook; bootstrap lifecycle belongs to FrameworkProvider/mysqlOrmProvider"],
        ["useDynamicForm", "Lower-level dynamic form renderer; useRecordForm is the supported record create/edit workflow"],
        ["useUpload", "Specialized upload integration; keep browser and server validation aligned"],
        ["useTextEditor", "Supported Tiptap integration with reactive HTML, dirty tracking, reset, read-only mode, and caller-owned image uploads"],
      ]),
    ],
  },
  {
    id: "api-reference",
    group: "Reference",
    title: "HTTP API reference",
    eyebrow: "Endpoint families",
    audience: "Developers",
    readTime: "18 min",
    summary:
      "Endpoint families, access expectations, payload shapes, response envelopes, errors, and request diagnostics.",
    blocks: [
      table(
        "Authentication endpoints",
        ["Method and path", "Purpose", "Access"],
        [
          ["POST /auth/login", "Password login", "Public"],
          [
            "POST /auth/otp/request-login",
            "Start passwordless challenge",
            "Public",
          ],
          [
            "POST /auth/otp/verify-login",
            "Verify challenge and issue session",
            "Public",
          ],
          ["POST /auth/otp/resend-login", "Replace active challenge", "Public"],
          [
            "POST /auth/refresh",
            "Rotate/issue access token from refresh cookie",
            "Refresh cookie",
          ],
          [
            "POST /auth/logout",
            "Revoke session and clear cookie",
            "Session-aware",
          ],
          [
            "GET /auth/auth_user",
            "Current user, roles, permissions, resources",
            "Authenticated core",
          ],
          [
            "PATCH /auth/profile",
            "Update current profile/avatar metadata",
            "Authenticated",
          ],
          [
            "POST /auth/change_password",
            "Verify old password and rotate credentials",
            "Authenticated",
          ],
          ["POST /auth/forget_password", "Send reset link", "Public"],
          [
            "GET /auth/verify_reset_token",
            "Validate reset token",
            "Public token",
          ],
          ["POST /auth/reset_password", "Complete reset", "Public token"],
        ],
      ),
      table(
        "Generic data endpoints",
        ["Method and path", "Operation"],
        [
          ["GET /api/:resources", "Basic paginated list"],
          ["GET /api/:resources/table", "Configured search/filter/sort list"],
          ["GET /api/:resources/filters", "Distinct column-filter source"],
          ["POST /api/:resources/query", "Structured query operation"],
          ["GET /api/:resources/:id", "One record by discovered primary key"],
          ["POST /api/:resources", "Create one record"],
          ["POST /api/:resources/bulk", "Create up to 500 records"],
          ["PUT /api/:resources/:id", "Update writable fields"],
          ["DELETE /api/:resources/:id", "Delete by primary key"],
          ["POST /api/:resources/file", "Multipart create/upload variants"],
        ],
      ),
      table(
        "Framework and administration",
        ["Method and path", "Purpose"],
        [
          ["POST /api/v1/bootstrap", "Return the startup datasets of a registry profile"],
          ["GET /api/v1/metadata/:table", "A described table's settings, the fields this user may see, and its lookups"],
          ["GET /api/v1/lookups/:key?parent=", "Choices of one lookup (its own permission applies)"],
          ["POST /api/v1/uploads/:table/:column", "Upload for a file or image field (needs create or update on the table)"],
          [
            "POST /api/v1/extra_meta_options",
            "Legacy lookup values for useGlobalSelect (code allowlist)",
          ],
          [
            "GET/POST /access/...",
            "Inspect and update roles, permissions, routes, users, and status",
          ],
          [
            "PUT /api/v1/ui-settings/:id",
            "Validate and version appearance settings",
          ],
          ["GET /api/v1/logs", "Query bounded structured logs"],
          ["GET /api/v1/logs/files", "List available log files"],
          ["POST /api/v1/system/backups", "Create a database backup"],
        ],
      ),
      table(
        "Metadata builder (manage:metadata)",
        ["Method and path", "Purpose"],
        [
          ["GET /api/v1/metadata-admin/tables", "Every describable table and its status"],
          ["GET /api/v1/metadata-admin/tables/:table/scaffold", "Fields guessed from the table's columns"],
          ["GET | PUT /api/v1/metadata-admin/tables/:table", "Read or save a definition (saves a new version)"],
          ["GET /api/v1/metadata-admin/tables/:table/versions", "Version history with changes"],
          ["POST /api/v1/metadata-admin/tables/:table/versions/:version/restore", "Restore a version as a new one"],
          ["GET /api/v1/metadata-admin/tables/:table/export", "Definition JSON plus a migration"],
          ["GET /api/v1/metadata-admin/lookups · PUT …/lookups/:key · POST …/lookups/preview", "List, save and preview lookups"],
          ["GET /api/v1/metadata-admin/permissions", "Permission names for field access"],
          ["POST /api/v1/metadata-admin/new-table", "Write a migration for a new table"],
          ["POST /api/v1/metadata-admin/import/:table/check · POST …/import/:table", "Check CSV rows, then import them"],
        ],
      ),
      code(
        "Bootstrap request",
        "json",
        `{ "profile": "authenticated_startup" }

// A body with "tables" is refused: the registry decides what loads.`,
      ),
      code(
        "Lookup request",
        "json",
        `GET /api/v1/lookups/roles
GET /api/v1/lookups/cities?parent=GH     // a lookup that depends on another field

// Legacy useGlobalSelect body for POST /api/v1/extra_meta_options:
{
  "lookup": {
    "table": "admin_roles",
    "fields": ["role_name", "description"],
    "where": { "column": "is_system_role", "value": 0 },
    "limit": 100
  }
}`,
      ),
      code(
        "Error envelope",
        "json",
        `{
  "status": "fail",
  "errorCode": "ERR_ACCESS_DENIED",
  "message": "Technical server detail",
  "requestId": "request-correlation-id"
}`,
      ),
      bullets("Client error policy", [
        "The Network response keeps errorCode, server detail, status, and requestId for diagnosis.",
        "DataProviderError maps these values to a calm, actionable user message.",
        "Pages display the user message, not method names, endpoint paths, SQL terms, or internal permission mappings.",
        "Operators use requestId and server logs for deeper investigation.",
      ]),
    ],
  },
  {
    id: "repository-map",
    group: "Reference",
    title: "Repository map",
    eyebrow: "File-level orientation",
    audience: "Developers",
    readTime: "25 min",
    summary:
      "A practical map of the server and UI folders so a new maintainer knows where every category of behavior belongs.",
    blocks: [
      table(
        "UI dependency groups",
        ["Capability", "Packages", "Role"],
        [
          [
            "Runtime and routing",
            "react, react-dom, react-router-dom",
            "Component runtime, rendering, public/protected navigation",
          ],
          [
            "Design system",
            "antd, @ant-design/icons, tailwindcss, @tailwindcss/vite",
            "Accessible controls, icons, utility styling, design tokens",
          ],
          [
            "Server state and HTTP",
            "@tanstack/react-query, axios, qs",
            "Caching, invalidation, requests, query serialization",
          ],
          [
            "Client state and persistence",
            "zustand, react-tracked, localforage, react-detect-offline",
            "Identity/runtime stores and optional offline data",
          ],
          [
            "Forms and content",
            "@tiptap/react, @tiptap/starter-kit, @tiptap/extensions, dayjs, crypto-random-string, ahooks",
            "Self-hosted rich text, dates, identifiers, hook utilities",
          ],
          [
            "Data presentation",
            "recharts, @xyflow/react, react-countup, react-highlight-words, react-skeletonify",
            "Charts, interactive architecture flows, metrics, highlighting, loading states",
          ],
          [
            "Export and print",
            "file-saver, jspdf, react-csv, react-to-print",
            "Client exports and printable views",
          ],
          [
            "Interaction/support",
            "react-draggable, react-confirm-alert",
            "Drag behavior, confirmations, and development mocks",
          ],
        ],
      ),
      table(
        "Server dependency groups",
        ["Capability", "Packages", "Role"],
        [
          [
            "HTTP platform",
            "express, body-parser, cookie-parser, cors, helmet, express-rate-limit",
            "API runtime and baseline request protection",
          ],
          [
            "Async/request support",
            "express-async-errors, express-async-handler, axios, response-time, request-ip",
            "Async errors, outbound calls, request diagnostics",
          ],
          [
            "Database and queries",
            "mysql2, lodash, moment",
            "MySQL pool plus data/date helpers",
          ],
          [
            "Identity and validation",
            "bcrypt, jsonwebtoken, express-validator, zod, nanoid, uuid",
            "Passwords, tokens, schemas, identifiers",
          ],
          [
            "OTP and federation",
            "nodemailer, otp, google-auth-library, express-openid-connect",
            "Mail delivery, one-time codes, external identity",
          ],
          [
            "Files and data",
            "multer, cloudinary, csv-parser, xlsx, qrcode",
            "Uploads, cloud storage, import/export, QR generation",
          ],
          [
            "Logging and monitoring",
            "winston, winston-daily-rotate-file, morgan, @logtail/node, @logtail/winston, @elastic/elasticsearch",
            "Structured logs, rotation, optional remote sinks",
          ],
          [
            "Caching/settings",
            "lru-cache, node-cache, flatted",
            "Bounded caches and serialization",
          ],
          [
            "API and integrations",
            "swagger-jsdoc, swagger-ui-express, paystack",
            "API description and optional payment integration",
          ],
          ["Development", "jest, nodemon", "Regression tests and live reload"],
        ],
      ),
      table(
        "Server file map",
        ["Area", "Files", "Responsibility"],
        [
          [
            "Entry",
            "index.js",
            "Middleware order, route registration, startup, shutdown",
          ],
          [
            "Configuration",
            "conn.js, cloudinary.js, multer.js, swagger.js, lookupRegistry.js",
            "External systems and code-level allowlists",
          ],
          [
            "Services",
            "authService.js, baseService.js, metadataService.js, metadataSchema.js, metadataAdminService.js, metadataScaffold.js, bootstrapService.js, databaseBackupService.js, backupHistoryService.js, uploadServices.js, systemSettings.js",
            "Business and operational orchestration",
          ],
          [
            "Policy",
            "authorizationPolicy.js, authorityService.js, abacEngine.js, coreAbacPolicies.js, authorizationContext.js, authorizationEvents.js",
            "Role and override resolution, ABAC policies, privileged roles, live access-change publication",
          ],
          [
            "Database",
            "model.js, queryBuilder.js",
            "Schema discovery, parameterized queries, filtering, pagination",
          ],
          [
            "Middleware",
            "authMiddleWare.js, authorization.js, validateTable.js, validateRequest.js, requestLogger.js, errorHandler.js",
            "Request trust pipeline",
          ],
          [
            "Routes",
            "authRoute.js, baseRoute.js, acessRoute.js, MetadataRoute.js, MetadataAdminRoute.js, UserDirectoryRoute.js, AdminStatisticsRoute.js, BackupRoute.js, LogRoute.js, UiSettingsRoute.js",
            "HTTP contracts grouped by capability",
          ],
          [
            "Shared helpers",
            "AppError.js, erroCodes.js, logger.js, otpService.js, tokenBlacklist.js, cacheManager.js, settingsManager.js",
            "Cross-cutting infrastructure",
          ],
          [
            "Utilities",
            "functions.js, templates.js",
            "Redaction, crypto/query helpers, and email/template material",
          ],
          [
            "Schema",
            "auth.schema/createUserScheme.js",
            "Create-user request validation",
          ],
          [
            "Resources",
            "migrations/*.sql, seeds/generated_acl_seed.sql",
            "Database evolution and generated ACL baseline",
          ],
          [
            "Scripts",
            "run-migration.js, generate-acl-seed-from-schema.js",
            "Repeatable maintenance automation",
          ],
          [
            "Tests",
            "authorization policy and middleware, ABAC, generic CRUD, metadata schema, service and scaffold, bootstrap, backups, lookup registry",
            "Security and regression checks",
          ],
          [
            "API testing",
            "Api_Testing/MySQL_ORM",
            "Saved manual request collections; not runtime code",
          ],
        ],
      ),
      table(
        "UI core map",
        ["Area", "Files", "Responsibility"],
        [
          [
            "Entry/routing",
            "main.jsx, App.jsx",
            "Provider composition and public/protected routes",
          ],
          [
            "Framework providers",
            "core/provider/*",
            "Data, auth, access, resource, bootstrap, and context contracts",
          ],
          [
            "Core data",
            "core/data/contracts.js, core/queryClient.js, core/queryKeys.js",
            "Normalized responses, errors, cache policy, keys",
          ],
          [
            "Core hooks",
            "core/hooks/auth, core/hooks/access, core/hooks/data",
            "Provider-aligned reusable operations",
          ],
          [
            "Metadata",
            "core/metadata/fieldTypes.jsx, fieldRules.js, formLayouts.js, useTableMetadata.js, useMetadataAdmin.js; components/metadata/*",
            "Field type registry, field rules, form layouts, metadata queries, MetadataForm/MetadataTable/StepsLayout",
          ],
          [
            "Navigation",
            "core/navigation/routeResolver.js",
            "First authorized route and safe redirects",
          ],
          [
            "Services",
            "services/apiClient.js, apiServices.js, token.js",
            "HTTP transport, refresh, legacy helpers",
          ],
          [
            "Stores",
            "authStore.js, values-store.js",
            "Identity, bootstrap, and UI state",
          ],
          [
            "Theme",
            "utils/ThemeProvider.jsx, hooks/useTheme.jsx, core/config/siderConfig.js",
            "Appearance validation, scopes, tokens, consumption",
          ],
        ],
      ),
      table(
        "UI feature map",
        ["Area", "Files", "Responsibility"],
        [
          [
            "Workspace",
            "AppLayout.jsx, SiderLayout.jsx, Header.jsx, useSider.jsx",
            "Navigation shell, variants, profile, responsive behavior",
          ],
          [
            "Page framing",
            "PageHeader.jsx",
            "Titles, Ant breadcrumb, actions, descriptions",
          ],
          [
            "Tables",
            "CustomTable.jsx, hooks/table/*, useTableApi.jsx",
            "Server/offline table workflows",
          ],
          [
            "Forms",
            "useRecordForm.jsx, useDynamicForm.jsx, useUpload.jsx, useTextEditor.jsx",
            "Metadata forms and specialized controls",
          ],
          [
            "Access UI",
            "components/access/*, useAccessControl.js",
            "Role, permission, browser-route assignment",
          ],
          [
            "Admin pages",
            "Users.jsx, Roles.jsx, Permissions.jsx, Resources.jsx",
            "Core access administration",
          ],
          [
            "Settings",
            "AppearanceSettings, ProfileSettings, DatabaseBackup, SystemLogs",
            "Runtime management surfaces",
          ],
          [
            "Auth pages",
            "Login, OTP, Forgot/Reset/ChangePassword",
            "Public identity lifecycle",
          ],
          [
            "Feedback",
            "NotFound404, TopProgress, useNotification",
            "Status, navigation progress, and user messages",
          ],
          [
            "Public documentation",
            "pages/docs/*, pages/docs/architecture-simulator/*",
            "Architecture reference, live hook lab, policy simulation, and public onboarding",
          ],
          [
            "Analytics/examples",
            "pages/Analytics/*, Test.jsx, Test2.jsx",
            "Dashboard examples and development surfaces",
          ],
          [
            "Specialized components",
            "map/*, programmes/*, pageDrawer/*, userInfo/*",
            "Domain/demo composition built on framework primitives",
          ],
          [
            "Utilities",
            "function_utils.js, common_functions.js, lookup_utils.js, Settings.js",
            "Formatting, validation, lookup conversion, environment constants",
          ],
        ],
      ),
      bullets("Where a change belongs", [
        "New visual behavior belongs in a page/component/hook, not in the data provider.",
        "New reusable HTTP semantics belong in a provider contract or core hook, not copied across pages.",
        "New authorization belongs in server ACL mappings and middleware policy, not only in React conditions.",
        "New table exposure belongs behind validateTable and explicit permissions.",
        "New configurable appearance belongs in normalized settings and shared tokens, not scattered hex values.",
        "New schema belongs in an ordered migration, never only in a developer’s local database.",
      ]),
      callout(
        "Legacy and example code",
        "The repository contains legacy utilities, saved API collections, demo analytics pages, archives, and commented alternatives. Treat them as migration context—not automatically as the preferred production pattern. New work should use provider contracts, core hooks, PageHeader, normalized errors, validated metadata, and migration-backed schema.",
      ),
    ],
  },
  {
    id: "troubleshooting",
    group: "Run the system",
    title: "Troubleshooting guide",
    eyebrow: "Diagnosis by symptom",
    audience: "Everyone",
    readTime: "14 min",
    summary:
      "Fast paths for authentication, authorization, bootstrap, form, table, build, backup, and performance failures.",
    blocks: [
      table(
        "Symptoms and first checks",
        ["Symptom", "Likely layer", "First checks"],
        [
          [
            "Login succeeds then redirects to 404",
            "Route registry",
            "auth_user resources, admin_resources path, is_public, first-route resolver",
          ],
          [
            "auth_user or bootstrap returns 403",
            "ACL/bootstrap",
            "Default role, role permissions, authenticated-core policy, request user ID",
          ],
          [
            "A lookup field shows no choices",
            "Lookup",
            "metadata_lookups row enabled, its required_permission, depends_on parent value, Lookups › Preview",
          ],
          [
            "A field is missing from a form or list",
            "Metadata",
            "form_visible / list_visible, config.readPermission, visibleWhen condition, 60 s metadata cache (reload)",
          ],
          [
            "Save fails with \"You can't change …\"",
            "Field access",
            "config.writePermission (or readPermission) and the user's permissions",
          ],
          [
            "useForm is not connected",
            "Form lifecycle",
            "Form instance is passed to rendered Form before reset/setFields",
          ],
          [
            "Role changes are delayed",
            "Authorization cache/events",
            "Cache invalidation, authorization event stream, auth_user refetch",
          ],
          [
            "Table does not refresh after save",
            "React Query",
            "invalidateResources contains every changed table",
          ],
          [
            "Appearance change does not apply",
            "Bootstrap/theme",
            "ui_settings row active/version, bootstrap invalidation, ThemeProvider scope",
          ],
          [
            "Backup fails",
            "Server tooling",
            "mysqldump path, DB variables, destination policy, permissions, timeout, disk",
          ],
          [
            "UI build fails",
            "Compile/lint",
            "First syntax error, unresolved import, hook rules, then chunk warnings",
          ],
        ],
      ),
      steps("Diagnose an API failure", [
        {
          title: "Read the user state",
          text: "Confirm whether the account is authenticated, active, and on an allowed browser route.",
        },
        {
          title: "Inspect Network",
          text: "Record method, path, status, errorCode, requestId, and safe response metadata.",
        },
        {
          title: "Locate the server request",
          text: "Search structured logs by requestId and compare authentication, authorization, validation, and service events.",
        },
        {
          title: "Reproduce narrowly",
          text: "Use the smallest request and a role with known permissions. Avoid changing multiple ACL rows at once.",
        },
        {
          title: "Fix the owning layer",
          text: "Do not work around a server denial by hiding it in the UI or widening a global allowlist.",
        },
        {
          title: "Add regression coverage",
          text: "Security-boundary fixes should include a positive and negative test.",
        },
      ]),
      bullets("Performance signals", [
        "A long setTimeout warning identifies work that occupied the main thread when the timer fired; inspect the callback and render cost, not the timer alone.",
        "Forced reflow usually means layout was read after layout-affecting writes. Batch reads and writes and avoid measuring in loops.",
        "Repeated bootstrap/auth_user calls often come from unstable effect dependencies or React Strict Mode development behavior.",
        "Large Vite chunks call for route-level lazy loading and deliberate manual chunks; they do not usually block correctness.",
      ]),
      callout(
        "Escalation packet",
        "When handing a problem to another maintainer, include environment, user role, exact time, route, safe reproduction steps, status/errorCode/requestId, expected result, actual result, and whether it reproduces with SuperAdmin. Never include passwords or live tokens.",
      ),
    ],
  },
];

export const documentationGroups = [
  ...new Set(documentationSections.map((section) => section.group)),
];

function collectText(value) {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(collectText).join(" ");
  if (value && typeof value === "object")
    return Object.values(value).map(collectText).join(" ");
  return "";
}

export const documentationSearchIndex = documentationSections.map(
  (section) => ({
    id: section.id,
    title: section.title,
    group: section.group,
    summary: section.summary,
    text: collectText(section).toLowerCase(),
  }),
);
