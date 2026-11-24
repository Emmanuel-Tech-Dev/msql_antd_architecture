# Design brief: architecture simulator rework (Request Lab)

Status: **Direction C v3 approved and built** (2026-11-24) in `ui/src/pages/docs/architecture-simulator/`: `architectureSimulationModel.js` (files, hook paths, failures, missions, load model), `useLoadLab.js`, `LabCanvas.jsx` (SVG: pan, zoom, drag, hover, traffic), `LabPanels.jsx`, `ArchitectureSimulator.jsx`. React Flow is no longer used by the docs. The simulator page drops the "On this page" column for width; below 1500px of lab width the metrics, trace and log sit under the canvas.
- C, modelled on a system-load simulator the user shared: https://claude.ai/artifact/Bapkt5Eo9nmnXMVi6Y5SaC (private).
- Earlier A/B step-through prototype: https://claude.ai/artifact/7Wfzqpdj7THKp7C7Cxbgyx (private).

## Direction C v2 (current): the framework's own files

Per the user: no sample tables; the simulation is about the framework's architecture and its data flow.
- Every box is a real file, in three bands: Browser (`ui/src/core`: hook, React Query, DataProvider, AuthProvider, AccessProvider, apiClient, SocketProvider), Express (index.js pipeline, authRoute, AuthService, authMiddleWare, authorization, authorityService, AbacEngine, route classes, validateTable, BaseService, metadata services, bootstrapService, uploadServices, authorizationEvents, Model + QueryBuilder, errorHandler) and MySQL (conn.js pool).
- The palette lists the framework hooks (useList, useOne, useCreate, useUpdate, useDelete, useTableMetadata, lookups, UploadField, FrameworkProvider bootstrap, useLogin, useCan, useAuthorizationEvents). Clicking one traces its real path; only its edges light up and other files dim. The trace panel lists each step with its file, what it did and its query count, then the response.
- A switch on each hook adds it to the load; play runs many requests through the same real paths.
- Failures act on every hook's path: expired token (refresh and retry), sign everyone out, role lacks resource, ABAC deny, sensitive table, invalid field value, change a role (cache cleared + access:changed), slow database.
- Missions ask "which file…" questions: trace a save, the call that never leaves (useCan), access changes live, one office one IP, find the bottleneck.

## Direction C v1: Framework Load Lab

- Layout: screens palette and missions (left) · live pipeline canvas with a load bar (centre) · metrics, node inspector and server log (right).
- Load: signed-in users × clicks per minute; "all users behind one office IP" toggle.
- Real limits drive the model: rate limit 500 / 15 min / IP, MySQL pool connectionLimit 10 with an unbounded queue, permission cache TTL 5 min, React Query staleTime 0, ~1 + 0–4 + 2 + 1 + data queries per request.
- Break something: slow database, sign everyone out (token_version), change a role (permission cache cleared), ABAC denies 10%.
- Missions: morning rush, one office one IP, sign everyone out, find the bottleneck.
- The A/B step-through can live inside it: clicking a particle or a node opens that request's step-by-step trace.
Format: Claude artifact with the framework theme tokens (Pencil was not used in this project's docs work).

## Problem

- Hard to follow: three columns, a zoomed-out React Flow canvas with 10+ small nodes, and changes staged behind "Trigger Policy Change" with the result shown below the canvas.
- Not this framework: about half the "policies" are invented (offline conflict strategy, LocalForage sync, editor adapter), error codes are made up (`UI_RENDERER_UNSUPPORTED`) and the terminal prints fixed fake timestamps.
- It never shows a real file, middleware, HTTP status or `AppError` response.

## What both directions share

- Pick a request (open a list, save a record, sign in) and a role (has the resource, lacks it, dev).
- Pick one thing that is different; each maps to the real check and outcome:

| Case | Where it stops | Response |
|---|---|---|
| Access token expired | authMiddleWare → apiClient refreshes and retries | 200 after retry |
| Signed out everywhere (token_version) | authMiddleWare; refresh fails | 401 ERR_TOKEN_EXPIRED |
| Must change password | authMiddleWare | 403 ERR_PASSWORD_CHANGE_REQUIRED |
| Role lacks the resource | authorization (RBAC) | 403 ERR_ACCESS_DENIED |
| ABAC rule denies | authorization (ABAC) | 403 ERR_ACCESS_DENIED with deniedBy |
| Sensitive table | validateTable | 403 ERR_ACCESS_DENIED |
| Required field empty / hidden field written / lookup value | metadataSchema | 400 ERR_VALIDATION_FAILED |
| Too many requests | rate limiter | 429 ERR_TOO_MANY_REQUESTS |

- Steps are the real pipeline in `server/index.js` order, each with its file. Outcome shows the HTTP status, the JSON body, what the person sees and where to fix it. Run animates step by step; Step advances one stop.
- The React Flow canvas is removed (plain React + CSS).

## Directions

- **A (recommended): Request runner.** One vertical route grouped Browser / Server / Database, outcome panel beside it, stacks on phones.
- **B: Sequence lanes.** Browser / Server / Database columns read top to bottom; clearest for the token refresh loop, but needs sideways scrolling on phones.
