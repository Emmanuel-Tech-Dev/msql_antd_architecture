---
id: identity-access
title: Identity and access control
track: operate
group: Run the system
order: 2
eyebrow: Authentication + hybrid RBAC
audience: All technical roles
readTime: 28 min
summary: Session lifecycle, role inheritance, user-specific ALLOW/DENY authority, permission mappings, route overrides, cache invalidation, and delegation safety.
---

## Sign-in and authorization

:::flow
- Login finds the account by any sign-in column allowed in the auth.login_identifiers setting, then checks status and password hash
- Server issues a short-lived access token and refresh cookie
- UI stores the access token in sessionStorage and user state in Zustand
- auth_user resolves roles, permissions, resources, and current profile
- Every protected API request repeats token and endpoint authorization
- The route guard permits or redirects the browser route
:::

## Role semantics

| Role | Behavior | Intended use |
| --- | --- | --- |
| SuperAdmin | Privileged bypass of endpoint mappings; all registered browser routes | System owner and emergency administration |
| dev | Same privileged policy class as SuperAdmin | Trusted framework developers only |
| User | Default role for newly created accounts; explicit permissions apply | Safe baseline identity |
| Custom roles | Union of assigned role permissions and mapped resources | Business responsibilities |

## ACL tables

| Table | Purpose |
| --- | --- |
| admin_roles | Role definitions and system-role marker |
| admin_permissions | Named actions such as read:admin or update:admin_roles |
| admin_resources | API endpoints and browser routes, with public/nav/display metadata |
| admin_user_roles | Many-to-many user-to-role assignments |
| admin_role_permissions | Many-to-many role-to-permission assignments |
| admin_permission_resources | Permission-to-endpoint or route mappings |
| admin_user_permission_overrides | Audited user-specific ALLOW or DENY exceptions for named permissions |
| admin_user_browser_route_overrides | Audited user-specific navigation exceptions, kept separate from API authority |

:::note Why this is hybrid RBAC
Roles remain the reusable baseline. Direct user overrides handle exceptional authority without copying a role or changing every user assigned to it. After the role check passes, the ABAC engine runs policies over the subject, resource and environment; policies can only deny.
:::

## How an API request is allowed

Access is a chain of three links, and all three must exist:

```text The chain
Role  --holds-->  Permission  --unlocks-->  Endpoint (method + path)
Finance           approve:invoices          POST /api/v1/invoices/:id/approve
```

On every request after sign-in the server takes the user's roles, collects the permissions those roles hold (plus the user's own overrides), collects every endpoint those permissions unlock, and allows the request only if one of them matches its method and path. Anything else is refused with 403. SuperAdmin and dev skip this check. ABAC policies run after it and can still refuse.

| An endpoint resource is | Field in Resources › Resource catalogue |
| --- | --- |
| A unique name | Resource Name, e.g. approve:invoices:by_id |
| Its kind | Type: API_ENDPOINT (BROWSER_ROUTE is a page, not an endpoint) |
| The address | Path, e.g. /api/v1/invoices/:id/approve |
| The method | HTTP Method: GET, POST, PUT, PATCH, DELETE, or ALL |

| Matching rule | Example |
| --- | --- |
| The method must be the same, unless the row says ALL (or *) | A GET row does not allow DELETE on the same path |
| A part starting with : matches any value in that position | /api/v1/invoices/:id/approve matches /api/v1/invoices/7/approve |
| A trailing * matches that path and everything below it | /api/v1/reports/* matches /api/v1/reports/2026/q1 |
| Every other part must match exactly; a trailing slash is ignored | /api/v1/invoices does not match /api/v1/invoice |

- One row is one method on one path. The same path with GET and DELETE is two rows, so one role can read while another can delete. ALL covers every method with one row, but then they cannot be told apart.
- Create an endpoint once and link it as often as you need: one permission can unlock several endpoints (read:invoices unlocks list, table, filters, query and by id), and one endpoint can be linked to several permissions.
- A permission with no linked endpoints lets nothing through on the server (it still works for page checks with Can and useCan). An endpoint no permission unlocks is refused for everyone but SuperAdmin and dev.

## Protecting your own routes

The step-by-step guide is Build › Access › Protect your own API route: register the endpoint, create the permission, link them, and give the permission to a role. For a table's generic routes, Grant table access (below) creates the whole chain; only the role remains.

## Grant table access

Access to a table is a set of rows: one permission per action (read:invoices), the API endpoints it unlocks, and the links between them. Permissions › Grant table access creates them in one go.

1. **Choose tables** — Only registered project tables are offered, by their label (the grantable_tables lookup: metadata_tables rows that are enabled and not is_system). The database's own table list is never shown.
2. **Tick actions** — Read, Create, Update, Delete; custom actions (export, approve) create a permission with no endpoints, for checks in pages and policies.
3. **Check the preview** — Each permission shows New, Adds N endpoints (it exists but an endpoint is missing) or Already there. Running it twice changes nothing.
4. **Create** — Everything is written in one transaction, signed-in users' permission caches are cleared, and the grant is logged as a security event (table-access.grant).
5. **Give it to a role** — Nobody can use a permission until a role (or a user override) holds it. Tick them under Roles › Configure access › Capabilities: create, read, edit and delete have their own columns, and any other action (export, approve, manage) is in the Other actions column of the same row. Then press Save role policy.

| Action | Endpoints (for a table t) |
| --- | --- |
| read | GET /api/t, GET /api/t/table, GET /api/t/filters, POST /api/t/query, GET /api/t/:id |
| create | POST /api/t, POST /api/t/bulk |
| update | PUT /api/t/:id |
| delete | DELETE /api/t/:id, DELETE /api/t (several, with { ids }) |

The routes (POST /access/table_access/preview and POST /access/table_access) need manage:permissions, which SuperAdmin and dev hold. The form itself is metadata (access_table_grants), checked on the server like any metadata form. The framework's own tables (admin, admin_*, metadata_*, framework_*, settings and the sensitive tables) are refused by the server even if their is_system flag is turned off.

## ABAC policies

| Rule | Detail |
| --- | --- |
| Order | RBAC baseline first. If it fails, the request is denied without running policies. |
| Effect | A policy returns ALLOW or DENY. Policies cannot grant access the baseline refused. |
| Failure | A policy that throws is treated as a denial (POLICY_ERROR). |
| Built-in | core.authenticated-subject and core.active-account deny unauthenticated subjects and inactive accounts. |
| Projects | Register more policies (ownership, branch, time of day) in the AbacPolicyRegistry; each sees the subject, resource and environment context. |

## Field-level access (metadata)

| Setting | Without it the user… |
| --- | --- |
| In the form switched off | can't set the field through a user request; server code still can |
| config.readPermission | doesn't get the field in records, filters, search, the form or the list |
| config.writePermission (falls back to readPermission) | sees the field read-only; sending it fails with "You can't change …" |
| Privileged roles | superadmin and dev see and change every field |

```text Effective authority precedence
Normal user:
  effective permissions = (role permissions + direct ALLOW) - direct DENY
  effective routes      = ((role routes + direct ALLOW) - direct DENY) + public routes

System role:
  SuperAdmin or dev -> privileged bypass
  Direct overrides cannot create, expand, or restrict that bypass

Default:
  Anything not explicitly effective is denied
```

## Managing one user's authority

:::flow
- Open Administration > Users and choose Manage user
- Locate Direct user exceptions in the user drawer
- Use Inherit to follow the role, Allow to add authority, or Deny to remove inherited authority
- Review Permissions and Navigation separately because a visible page is not API authority
- Optionally choose an expiration and provide the required audit reason
- Save authority; the server validates targets, delegation ceiling, and privileged-role rules in one transaction
- The permission cache is cleared and access-changed immediately refreshes the affected user's auth_user context
:::

## Override states

| State | Meaning | Typical use |
| --- | --- | --- |
| Inherit | No direct row; the current role/public-route result applies | Normal access that should evolve with the role |
| ALLOW | Adds one permission or browser route for this user | Temporary reporting, operational, or support responsibility |
| DENY | Removes inherited authority for this user; deny wins | Separation of duties or individual restriction |

```http Authority management API
GET /access/user_authority/REG20260224004

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
}
```

## Delegation and audit safeguards

- Only SuperAdmin and dev receive manage:user_authority during migration; it can later be delegated deliberately.
- A non-privileged authority manager can ALLOW only permissions and routes they already possess.
- A non-privileged manager cannot delegate manage:user_authority, modify their own direct authority, or manage a privileged target.
- Permission names and browser resources are validated against their registries; arbitrary attributes or paths are rejected.
- Authenticated-public routes cannot be overridden for one user; their public policy remains system-wide and predictable.
- Every save requires a reason, records the grantor and optional expiration, writes both override collections transactionally, and creates a structured security log.
- Expired and not-yet-active rows do not enter effective authority. The server evaluates validity; the browser never supplies trusted access attributes.

## Session protections

- Access tokens are verified on every protected request and checked against token version/revocation state.
- Refresh tokens use an HttpOnly cookie; secure cookie behavior is enabled in production.
- Password changes rotate the token version and force a new sign-in.
- OTP challenges are separately signed, expire quickly, and can be resent within controlled limits.
- Suspended users are rejected before protected work is performed.

:::warning Permissions are server decisions
Hiding a button with useCan improves usability, but it is not a security control. The server authorization middleware must allow the matching HTTP method and route before the action succeeds.
:::

## Immediate access changes

- ACL mutations clear the server permission cache for affected users.
- Authorization events notify active clients.
- The UI invalidates auth_user and bootstrap state, then recomputes the route registry.
- A user whose current route is removed is redirected to the first route they can access, not blindly to /admin/404.

:::danger Public documentation
The /docs route is a browser-public route. It does not expose private application records or call protected bootstrap endpoints. Documentation must never include real credentials, secrets, customer data, internal hostnames, or unredacted log samples.
:::
