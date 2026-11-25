---
id: start-here
title: Understand the framework
track: learn
group: Get oriented
order: 1
eyebrow: Orientation
audience: Everyone
readTime: 8 min
summary: What the system is, who it serves, and the mental model every operator and developer should share.
---

MySQL ORM Framework is a metadata-driven administrative application. It combines a React and Ant Design workspace with a custom Express and MySQL service layer. The framework is designed so routine administration—users, roles, permissions, resources, appearance, profile data, logs, and backups—can be managed from the application while security-sensitive capabilities stay controlled in code.

:::note In plain language
The database describes much of what the application can show and edit. The server decides what is safe and permitted. The UI turns those decisions into pages, tables, forms, navigation, and feedback that people can use.
:::

## The system in one line

:::flow
- A person signs in
- The server verifies identity and access
- Bootstrap loads safe startup metadata
- Providers create the runtime registry
- Hooks render authorized pages and data
:::

## Audience guide

| Audience | Begin with | Primary concern |
| --- | --- | --- |
| Product owner or operator | Start here → Operations | What can be managed safely from the UI |
| Frontend developer | Architecture → UI → Metadata & forms | Providers, hooks, routes, forms, tables, and theme tokens |
| Backend developer | Architecture → Server → Identity & access | Trust boundaries, validation, queries, security, and operations |
| Security reviewer | Identity & access → API reference → Operations | Authentication, authorization, sensitive data, logging, and deployment |

## Design principles

- Database-driven where change should be operational: navigation visibility, permissions, form and list metadata, lookups, sign-in fields, startup data, and appearance settings.
- Code-controlled where a mistake would widen the trust boundary: authentication, authorization and ABAC policies, table validation, sensitive tables and columns, schema changes (migrations), and backup execution.
- One normalized data-provider contract between UI hooks and server endpoints.
- Friendly messages for end users; technical request details remain available to developers and operators.
- SuperAdmin and dev are privileged system roles; all other roles are evaluated from explicit permissions and resource mappings. The names are decided in one place on each side: isPrivilegedSystemRole (server/core/lib/authorizationPolicy.js) and isPrivilegedRole (packages/framework-ui/src/core/provider/AccessProvider.js).

## First local run

1. **Prepare MySQL** — Create the target database, import the baseline schema, and run the ordered migration files in server/resources/migrations.
2. **Configure the server** — Create server environment values for database access, token secrets, encryption, email, client URL, logging, and optional backup tooling.
3. **Start the API** — From server, run npm install and npm run dev. The default service address is http://localhost:3000.
4. **Configure and start the UI** — Set VITE_API_URL, then run npm install and npm run dev from ui. Vite normally serves http://localhost:5173.
5. **Verify the system** — Sign in, confirm the first authorized route loads, open a metadata-driven form, and check logs for the same request ID if anything fails.

```env Minimal UI environment
VITE_API_URL=http://localhost:3000
```
