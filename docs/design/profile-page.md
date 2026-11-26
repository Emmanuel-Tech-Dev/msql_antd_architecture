# Profile page redesign

Status: direction B approved (2026-11-26) and built in ProfileSettings.jsx. One wording change from the canvas: the theme switch says Light / Dark / Default, because clearing the preference returns to the workspace's configured appearance, which may not follow the device. Password strength: the server enforces no rule beyond the current password matching, so the page requires 8+ characters and a different password (form checks) and shows a number, an upper-case letter and a symbol as tips. Canvas: https://claude.ai/artifact/98pRYq5RYmQpGqGcmjNheY (private). Pencil was not running; designs are on a Claude Design canvas in the framework theme (teal #0f766e, canvas #f7f7f5, Inter, Geist Mono for codes).

## Today

`packages/framework-ui/src/pages/settings/ProfileSettings.jsx` (route `/admin/profile`): an identity card (avatar upload, name, email, role tags, permission and route counts), a Personal information form (name, phone; email read-only), and a password change form. Endpoints: `PATCH /auth/profile`, `POST /auth/profile/avatar`, `POST /auth/change_password`.

## Problems the redesign fixes

| Today | Instead |
| --- | --- |
| "Authenticated session" badge (always true) | Removed |
| Permission and route counts | What you can do, grouped by area in plain words (Invoices: View · Add · Edit) and the pages you can open |
| Info alert about email at the top of the form | One line at the email field: you sign in with it; an administrator can change it |
| Documentation button in the header | Removed (not a profile action) |
| Save always enabled | Save enabled only when something changed, with an unsaved-changes note |
| Password rules only shown after a failed submit | Strength meter and a live checklist |
| User ID only as a field note | Shown with a copy button |
| Theme only in the header toggle | Light / Dark / System on the page |

## Directions

- **A · Settings sections**: a section menu (Profile · Sign-in & security · Your access · Preferences), one panel at a time, label-and-control rows, a save bar with Discard. Scales to future topics (sessions, notifications, 2-step sign-in).
- **B · Account overview**: one page; an identity band with account facts (status, sign-in method, member since, last sign-in, user ID), then details and password on the left, What you can do and Appearance on the right. Everything at a glance for a page people open rarely.

## Data

Both use the data the page has (name, email, phone, avatar, user ID, status, roles, permissions, browser routes) plus three columns the server stores but `/auth/auth_user` does not return yet: `createdAt` (Member since), `last_login` (Last sign-in) and `oauth_provider` (Signs in with). Adding them to that query is the only server change. Sign-in history and "sign out of all devices" are not designed: no endpoint exists.

Grouping permissions by area uses the permission names (`action:table`) and the table labels from `metadata_tables`; a permission whose table has no label shows its table name, humanized.
