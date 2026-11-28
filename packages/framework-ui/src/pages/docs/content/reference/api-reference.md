---
id: api-reference
title: HTTP API reference
track: reference
group: API and code
order: 5
eyebrow: Endpoint families
audience: Developers
readTime: 18 min
summary: Endpoint families, access expectations, payload shapes, response envelopes, errors, and request diagnostics.
---

## Authentication endpoints

| Method and path | Purpose | Access |
| --- | --- | --- |
| GET /auth/login_options | Sign-in columns, brand and the sign-in page's look (login_ui) for the signed-out pages | Public |
| POST /auth/login | Password login | Public |
| POST /auth/otp/request-login | Start passwordless challenge | Public |
| POST /auth/otp/verify-login | Verify challenge and issue session | Public |
| POST /auth/otp/resend-login | Replace active challenge | Public |
| POST /auth/refresh | Rotate/issue access token from refresh cookie | Refresh cookie |
| POST /auth/logout | Revoke session and clear cookie | Session-aware |
| GET /auth/auth_user | Current user, roles, permissions, resources | Authenticated core |
| PATCH /auth/profile | Update current profile/avatar metadata | Authenticated |
| POST /auth/change_password | Verify old password and rotate credentials | Authenticated |
| POST /auth/forget_password | Send reset link | Public |
| GET /auth/verify_reset_token | Validate reset token | Public token |
| POST /auth/reset_password | Complete reset | Public token |

## Generic data endpoints

| Method and path | Operation |
| --- | --- |
| GET /api/:resources | Basic paginated list |
| GET /api/:resources/table | Configured search/filter/sort list |
| GET /api/:resources/filters | Distinct column-filter source |
| POST /api/:resources/query | Structured query operation |
| GET /api/:resources/:id | One record by discovered primary key |
| POST /api/:resources | Create one record |
| POST /api/:resources/bulk | Create up to 500 records |
| PUT /api/:resources/:id | Update writable fields |
| DELETE /api/:resources/:id | Delete by primary key |
| DELETE /api/:resources | Delete several: body { ids: [...] }, up to 500, in one transaction (all or none). Returns { deleted, missing }. Covered by delete:<table> |

## Framework and administration

| Method and path | Purpose |
| --- | --- |
| POST /api/v1/bootstrap | Return the startup datasets of a registry profile |
| GET /api/v1/metadata/:table | A described table's settings, the fields this user may see, and its lookups |
| GET /api/v1/lookups/:key?parent= | Choices of one lookup (its own permission applies) |
| POST /api/v1/uploads/:table/:column | Upload for a file or image field (needs create or update on the table) |
| POST /api/v1/extra_meta_options | Legacy lookup values for useGlobalSelect (code allowlist) |
| GET/POST /access/... | Inspect and update roles, permissions, routes, users, and status |
| PUT /api/v1/ui-settings/:id | Validate and version an appearance setting: settingKey layout.sider (default) or login_ui, with expectedVersion |
| POST /api/v1/ui-settings/login-cover | Upload the sign-in page cover image (field cover); returns its url for login_ui |
| GET /api/v1/logs | Query bounded structured logs |
| GET /api/v1/logs/files | List available log files |
| POST /api/v1/system/backups | Create a database backup |

## Metadata builder (manage:metadata)

| Method and path | Purpose |
| --- | --- |
| GET /api/v1/metadata-admin/tables | Every describable table and its status |
| GET /api/v1/metadata-admin/tables/:table/scaffold | Fields guessed from the table's columns |
| GET \| PUT /api/v1/metadata-admin/tables/:table | Read or save a definition (saves a new version) |
| GET /api/v1/metadata-admin/tables/:table/versions | Version history with changes |
| POST /api/v1/metadata-admin/tables/:table/versions/:version/restore | Restore a version as a new one |
| GET /api/v1/metadata-admin/tables/:table/export | Definition JSON plus a migration |
| GET /api/v1/metadata-admin/lookups · PUT …/lookups/:key · POST …/lookups/preview | List, save and preview lookups |
| GET /api/v1/metadata-admin/permissions | Permission names for field access |
| POST /api/v1/metadata-admin/new-table | Write a migration for a new table |
| POST /api/v1/metadata-admin/import/:table/check · POST …/import/:table | Check CSV rows, then import them |

```json Bootstrap request
{ "profile": "authenticated_startup" }

// A body with "tables" is refused: the registry decides what loads.
```

```json Lookup request
GET /api/v1/lookups/roles
GET /api/v1/lookups/cities?parent=GH     // a lookup that depends on another field

// Legacy useGlobalSelect body for POST /api/v1/extra_meta_options:
{
  "lookup": {
    "table": "admin_roles",
    "fields": ["role_name", "description"],
    "where": { "column": "is_system_role", "value": 0 },
    "limit": 100
  }
}
```

```json Error envelope
{
  "status": "fail",
  "errorCode": "ERR_ACCESS_DENIED",
  "message": "Technical server detail",
  "requestId": "request-correlation-id"
}
```

## Client error policy

- The Network response keeps errorCode, server detail, status, and requestId for diagnosis.
- DataProviderError maps these values to a calm, actionable user message.
- Pages display the user message, not method names, endpoint paths, SQL terms, or internal permission mappings.
- Operators use requestId and server logs for deeper investigation.
