---
id: troubleshooting
title: Troubleshooting guide
track: operate
group: Run the system
order: 3
eyebrow: Diagnosis by symptom
audience: Everyone
readTime: 14 min
summary: Fast paths for authentication, authorization, bootstrap, form, table, build, backup, and performance failures.
---

## Symptoms and first checks

| Symptom | Likely layer | First checks |
| --- | --- | --- |
| Login succeeds then redirects to 404 | Route registry | auth_user resources, admin_resources path, is_public, first-route resolver |
| auth_user or bootstrap returns 403 | ACL/bootstrap | Default role, role permissions, authenticated-core policy, request user ID |
| A lookup field shows no choices | Lookup | metadata_lookups row enabled, its required_permission, depends_on parent value, Lookups › Preview |
| A field is missing from a form or list | Metadata | form_visible / list_visible, config.readPermission, visibleWhen condition, 60 s metadata cache (reload) |
| Save fails with "You can't change …" | Field access | config.writePermission (or readPermission) and the user's permissions |
| useForm is not connected | Form lifecycle | Form instance is passed to rendered Form before reset/setFields |
| Role changes are delayed | Authorization cache/events | Cache invalidation, authorization event stream, auth_user refetch |
| Table does not refresh after save | React Query | invalidateResources contains every changed table |
| Appearance change does not apply | Bootstrap/theme | ui_settings row active/version, bootstrap invalidation, ThemeProvider scope |
| 429 Too many requests | Rate limits | One busy user (RATE_LIMIT_PER_USER) or many people behind one address (RATE_LIMIT_PER_IP); behind a proxy, TRUST_PROXY unset makes everyone share the proxy's address |
| A new column does not appear in the generic API | Schema cache | Table schemas are cached for 5 minutes after a migration; wait or restart the server (the builder's own saves clear it at once) |
| Backup fails | Server tooling | mysqldump path, DB variables, destination policy, permissions, timeout, disk |
| UI build fails | Compile/lint | First syntax error, unresolved import, hook rules, then chunk warnings |

## Diagnose an API failure

1. **Read the user state** — Confirm whether the account is authenticated, active, and on an allowed browser route.
2. **Inspect Network** — Record method, path, status, errorCode, requestId, and safe response metadata.
3. **Locate the server request** — Search structured logs by requestId and compare authentication, authorization, validation, and service events.
4. **Reproduce narrowly** — Use the smallest request and a role with known permissions. Avoid changing multiple ACL rows at once.
5. **Fix the owning layer** — Do not work around a server denial by hiding it in the UI or widening a global allowlist.
6. **Add regression coverage** — Security-boundary fixes should include a positive and negative test.

## Performance signals

- A long setTimeout warning identifies work that occupied the main thread when the timer fired; inspect the callback and render cost, not the timer alone.
- Forced reflow usually means layout was read after layout-affecting writes. Batch reads and writes and avoid measuring in loops.
- Repeated bootstrap/auth_user calls often come from unstable effect dependencies or React Strict Mode development behavior.
- Large Vite chunks call for route-level lazy loading and deliberate manual chunks; they do not usually block correctness.

:::note Escalation packet
When handing a problem to another maintainer, include environment, user role, exact time, route, safe reproduction steps, status/errorCode/requestId, expected result, actual result, and whether it reproduces with SuperAdmin. Never include passwords or live tokens.
:::
