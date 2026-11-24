---
id: architecture-simulator
title: Architecture simulator
track: learn
group: Deep dives
order: 5
eyebrow: Interactive policy lab
audience: Developers and operators
readTime: 12 min
summary: Change framework policies, observe the first breaking architectural boundary, inspect a safe simulated trace, and apply the smallest remediation.
---

The Architectural Simulation Flow turns the framework's trust boundaries into an executable mental model. It does not call the API or mutate application data. Instead, it stages configuration locally and demonstrates how frontend components, routes, providers, authentication, authorization, bootstrap validation, metadata, lookups, query construction, and cache invalidation cooperate during a request.

::architecture-simulator Architectural Simulation Flow

:::note How to use the lab
Open the lab full screen for the largest canvas. Add or remove real framework component types from the left library, select a component or layer to inspect it, then stage frontend or server contracts in the right inspector. Trigger the policy change and follow the red trace to the first rejected boundary. Read Why it broke and the simulated stack trace before using Click to Fix. Component additions are evaluated immediately against the active policy, while inspector changes remain staged until triggered.
:::

:::note Frontend scenarios
The component library includes protected pages, useTableApi tables, MetadataForm and useRecordForm forms, lookup selects, upload fields, Tiptap rich-text editors, charts, and offline tables. Their simulations cover missing routes or providers, unsupported metadata renderers, unsafe HTML, browser-only upload validation, unresolved offline conflicts, invalid metadata, missing lookups, and incomplete cache invalidation.
:::

:::note Server scenarios
The same graph continues through Axios, Express, identity and access control, validation registries, BaseService and QueryBuilder, and MySQL. Use the server inspector to test expired sessions, permission rejection and the dev or SuperAdmin bypass, sensitive bootstrap targets, invalid physical columns, and stale related resources.
:::

:::warning Simulation boundary
All traces are generated locally from documented framework contracts. They contain no production requests, tokens, credentials, database values, or real log records. File names and line numbers illustrate ownership and diagnostic shape; use a real request ID to locate an actual failure in server logs.
:::
