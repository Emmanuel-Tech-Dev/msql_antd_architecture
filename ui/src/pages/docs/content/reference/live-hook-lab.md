---
id: live-hook-lab
title: Live hook laboratory
track: reference
group: Hooks
order: 1
eyebrow: Interactive examples
audience: Frontend developers
readTime: 12 min
summary: Exercise the framework hooks in a public, isolated playground before using them in an authenticated feature.
---

Hook Studio gives every application and core framework hook its own selectable page. Search by name or capability, run the preview, edit and copy the source scratchpad, and inspect the runtime contract before using the hook in a feature.

:::note Safe public demo
Public-runnable hooks execute their real implementation against local sample values. Data, lookup, form, access, and safe authentication hooks run against nested mock DataProvider, AuthProvider, and React Query environments. Session-destructive hooks use purpose-built behavioral demos. Nothing touches MySQL, protected endpoints, uploads, credentials, or the current session.
:::

::hook-lab

## How to use each playground

| Tab | What you can do | Safety boundary |
| --- | --- | --- |
| Preview | Use the actual select, dynamic form, record modal, table, record, permission editor, or authentication surface | Real hooks run against local values or isolated providers |
| Code | Edit, reset, and copy a complete usage example | Scratchpad source is not evaluated with unsafe browser eval |
| Contract | Inspect source path, runtime classification, and ownership | Shows when the preview is live, local, simulated, deprecated, or planned |
| Isolated providers | Run core queries, mutations, lookups, metadata forms, and safe auth mutations | Nested providers keep the documentation separate from MySQL and the current session |
