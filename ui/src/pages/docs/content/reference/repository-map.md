---
id: repository-map
title: Repository map
track: reference
group: API and code
order: 6
eyebrow: File-level orientation
audience: Developers
readTime: 25 min
summary: A practical map of the server and UI folders so a new maintainer knows where every category of behavior belongs.
---

## UI dependency groups

| Capability | Packages | Role |
| --- | --- | --- |
| Runtime and routing | react, react-dom, react-router-dom | Component runtime, rendering, public/protected navigation |
| Design system | antd, @ant-design/icons, tailwindcss, @tailwindcss/vite | Accessible controls, icons, utility styling, design tokens |
| Server state and HTTP | @tanstack/react-query, axios, qs | Caching, invalidation, requests, query serialization |
| Client state and persistence | zustand, react-tracked, localforage, react-detect-offline | Identity/runtime stores and optional offline data |
| Forms and content | @tiptap/react, @tiptap/starter-kit, @tiptap/extensions, dayjs, crypto-random-string, ahooks | Self-hosted rich text, dates, identifiers, hook utilities |
| Data presentation | recharts, react-countup, react-highlight-words, react-skeletonify | Charts, metrics, highlighting, loading states |
| Export and print | file-saver, jspdf, react-csv, react-to-print | Client exports and printable views |
| Interaction/support | react-draggable, react-confirm-alert | Drag behavior, confirmations, and development mocks |

## Server dependency groups

| Capability | Packages | Role |
| --- | --- | --- |
| HTTP platform | express (JSON and form parsing built in), cookie-parser, cors, helmet, express-rate-limit | API runtime and baseline request protection |
| Async/request support | express-async-errors, express-async-handler, axios, response-time, request-ip | Async errors, outbound calls, request diagnostics |
| Database and queries | mysql2, lodash, moment | MySQL pool plus data/date helpers |
| Identity and validation | bcrypt, jsonwebtoken, express-validator, zod, nanoid, uuid | Passwords, tokens, schemas, identifiers |
| OTP and federation | nodemailer, otp, google-auth-library, express-openid-connect | Mail delivery, one-time codes, external identity |
| Files and data | multer, cloudinary, csv-parser, xlsx, qrcode | Uploads, cloud storage, import/export, QR generation |
| Logging and monitoring | winston, winston-daily-rotate-file, morgan, @logtail/node, @logtail/winston, @elastic/elasticsearch | Structured logs, rotation, optional remote sinks |
| Caching/settings | lru-cache, node-cache, flatted | Bounded caches and serialization |
| API and integrations | swagger-jsdoc, swagger-ui-express, paystack | API description (core/config/swagger.js, not mounted) and optional payment integration |
| Development | jest, nodemon | Regression tests and live reload |

## Server file map

| Area | Files | Responsibility |
| --- | --- | --- |
| Entry | index.js | Middleware order, route registration, startup, shutdown |
| Configuration | conn.js, cloudinary.js, multer.js, origins.js, sensitiveData.js, lookupRegistry.js, swagger.js | External systems, sensitive tables and columns, allowed origins, legacy lookup allowlist |
| Services | authService.js, baseService.js, metadataService.js, metadataSchema.js, metadataAdminService.js, metadataScaffold.js, bootstrapService.js, databaseBackupService.js, backupHistoryService.js, uploadServices.js, systemSettings.js | Business and operational orchestration |
| Policy | authorizationPolicy.js, authorityService.js, abacEngine.js, coreAbacPolicies.js, authorizationContext.js, authorizationEvents.js | Role and override resolution, ABAC policies, privileged roles, live access-change publication |
| Database | model.js, queryBuilder.js | Schema discovery, parameterized queries, filtering, pagination |
| Middleware | authMiddleWare.js, authorization.js, validateTable.js, validateRequest.js, requestLogger.js, errorHandler.js | Request trust pipeline |
| Routes | authRoute.js, baseRoute.js, acessRoute.js, MetadataRoute.js, MetadataAdminRoute.js, UserDirectoryRoute.js, AdminStatisticsRoute.js, BackupRoute.js, LogRoute.js, UiSettingsRoute.js | HTTP contracts grouped by capability |
| Shared helpers | AppError.js, erroCodes.js, logger.js, otpService.js, tokenBlacklist.js, cacheManager.js, settingsManager.js | Cross-cutting infrastructure |
| Utilities | functions.js, templates.js | The server's general-purpose helpers (identifiers, blank checks, names, hashing, JSON, query helpers, redaction) and email/template material. Add new general helpers here, not in the file that needs them |
| Schema | auth.schema/createUserScheme.js | Create-user request validation |
| Resources | migrations/*.sql, seeds/generated_acl_seed.sql | Database evolution and generated ACL baseline |
| Scripts | run-migration.js, generate-acl-seed-from-schema.js | Repeatable maintenance automation |
| Tests | authorization policy and middleware, ABAC, generic CRUD, metadata schema, service and scaffold, bootstrap, backups, lookup registry | Security and regression checks |
| API testing | Api_Testing/MySQL_ORM | Saved manual request collections; not runtime code |

## UI core map

| Area | Files | Responsibility |
| --- | --- | --- |
| Entry/routing | main.jsx, App.jsx | Provider composition and public/protected routes |
| Framework providers | core/provider/* | Data, auth, access, resource, bootstrap, and context contracts |
| Core data | core/data/contracts.js, core/queryClient.js, core/queryKeys.js | Normalized responses, errors, cache policy, keys |
| Core hooks | core/hooks/auth, core/hooks/access, core/hooks/data | Provider-aligned reusable operations |
| Metadata | core/metadata/fieldTypes.jsx, fieldRules.js, formLayouts.js, useTableMetadata.js, useMetadataAdmin.js; components/metadata/* | Field type registry, field rules, form layouts, metadata queries, MetadataForm/MetadataTable/StepsLayout |
| Navigation | core/navigation/routeResolver.js | First authorized route and safe redirects |
| Services | services/apiClient.js, apiServices.js, token.js | HTTP transport, refresh, legacy helpers |
| Stores | authStore.js, values-store.js | Identity, bootstrap, and UI state |
| Theme | utils/ThemeProvider.jsx, hooks/useTheme.jsx, core/config/siderConfig.js | Appearance validation, scopes, tokens, consumption |

## UI feature map

| Area | Files | Responsibility |
| --- | --- | --- |
| Workspace | AppLayout.jsx, SiderLayout.jsx, Header.jsx, useSider.jsx | Navigation shell, variants, profile, responsive behavior |
| Page framing | PageHeader.jsx | Titles, Ant breadcrumb, actions, descriptions |
| Tables | CustomTable.jsx, hooks/table/*, useTableApi.jsx | Server/offline table workflows |
| Forms | useRecordForm.jsx, useDynamicForm.jsx, useUpload.jsx, useTextEditor.jsx | Metadata forms and specialized controls |
| Access UI | components/access/*, useAccessControl.js | Role, permission, browser-route assignment |
| Admin pages | Users.jsx, Roles.jsx, Permissions.jsx, Resources.jsx | Core access administration |
| Settings | AppearanceSettings, ProfileSettings, DatabaseBackup, SystemLogs | Runtime management surfaces |
| Auth pages | Login, OTP, Forgot/Reset/ChangePassword | Public identity lifecycle |
| Feedback | NotFound404, TopProgress, useNotification | Status, navigation progress, and user messages |
| Public documentation | pages/docs/*, pages/docs/architecture-simulator/* | Architecture reference, live hook lab, the Framework Load Lab, and public onboarding |
| Development pages | pages/Test.jsx (shown at /admin/home until a framework home page exists), pages/admin/Test.jsx (/admin/testing) | Development surfaces; not part of the reusable framework |
| Specialized components | map/*, userInfo/* | Map provider layer (Google Maps, Mapbox) and user information blocks |
| Utilities | function_utils.js, common_functions.js, lookup_utils.js, Settings.js | The UI's general-purpose helpers (formatting, blank checks, identifiers, files, clipboard, reduced motion), lookup conversion, environment constants. Add new general helpers to function_utils.js |

## Where a change belongs

- New visual behavior belongs in a page/component/hook, not in the data provider.
- New reusable HTTP semantics belong in a provider contract or core hook, not copied across pages.
- New authorization belongs in server ACL mappings and middleware policy, not only in React conditions.
- New table exposure belongs behind validateTable and explicit permissions.
- New configurable appearance belongs in normalized settings and shared tokens, not scattered hex values.
- New schema belongs in an ordered migration, never only in a developer’s local database.

:::note Legacy and example code
The repository contains legacy utilities, saved API collections, archives, and commented alternatives. Treat them as migration context—not automatically as the preferred production pattern. New work should use provider contracts, core hooks, PageHeader, normalized errors, validated metadata, and migration-backed schema.
:::
