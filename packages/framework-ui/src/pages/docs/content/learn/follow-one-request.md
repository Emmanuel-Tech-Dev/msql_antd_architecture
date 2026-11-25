---
id: follow-one-request
title: Follow one request
track: learn
group: Get oriented
order: 2
eyebrow: The request lifecycle
audience: Everyone
readTime: 6 min
summary: A user edits a tax rate and presses Save. Step through every layer the request crosses; each one asks a single question.
---

Three ideas hold the framework together. The database describes the system: users, roles, permissions, menus, forms, lists and settings live in tables. The server is the authority: the UI hides what you can't do, but every rule is checked again on the server. And one generic API serves most tables, so most screens need no new server code.

::request-walkthrough Step through it

## Before it: signing in

1. **Login** — The server finds the account by any column allowed in the auth.login_identifiers setting, then checks the password and account status.
2. **Two tokens** — A short access token goes on every request; a refresh token in an httpOnly cookie only gets a new access token.
3. **auth_user** — Returns the user, roles, permissions and the pages they may open; the sidebar and route guard use it.
4. **Bootstrap** — Loads the start-up data of the authenticated_startup profile.

## Where it can stop

| Layer | Question | Refusal |
| --- | --- | --- |
| authMiddleWare | Who are you? | ERR_TOKEN_INVALID: missing, expired, forged, or from before a password change |
| authorization | May you do this? | ERR_ACCESS_DENIED: no matching permission, or an ABAC policy denied |
| validateTable | Which columns may you touch? | ERR_ACCESS_DENIED: a column outside your list |
| Metadata check | Is the record valid? | ERR_VALIDATION_FAILED, with a message per field |

:::note One error shape
Every refusal returns the same JSON: status, errorCode, message and requestId. Search the server logs for the requestId to see the full story.
:::

## Read next

- System architecture: the layers in depth.
- Identity and access control: roles, overrides and ABAC policies.
- Metadata-driven forms: the check at stage 6.
