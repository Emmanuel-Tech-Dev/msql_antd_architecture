# Design brief: in-app documentation (/docs)

Status: **Direction B chosen and built** (2026-11-24). Review prototype: https://claude.ai/artifact/1Z1Nx6ZdQYigeSedN4LVrC (private).
Format: designed as a Claude artifact with the framework theme tokens, as chosen for this project (Pencil was not running).

## Problem

- 22 sections sit in one sidebar list mixing orientation, tutorials, hook references and operations.
- Content lives in one 2,700-line JS file, which is why it fell out of date.
- The clearest explanation of the framework (the request walkthrough) is not in the docs.
- "On this page" doesn't follow scrolling; Hook Studio's selection isn't linkable and its catalog was hard to read.

## Information architecture (both directions)

| Track | Pages |
|---|---|
| Learn | Understand the framework · Follow one request (new) · System architecture · Server architecture · UI architecture · Architecture simulator |
| Build | Metadata-driven forms · Data model builder · Tables and data access · End-to-end feature · Extension playbooks · Core hooks tutorial · Application hooks cookbook · Backend tutorials |
| Operate | Operations and deployment · Identity and access control · Troubleshooting |
| Reference | Hook Studio · Layout and overlay hooks · Visualization hooks · Utility hooks · HTTP API reference · Repository map |

## Directions

- **A (recommended): tracks in the header.** Four tabs in the top bar; the sidebar shows only the current track (3–8 pages). Track in the URL.
- **B: one sidebar with four groups and a task home page.** Everything visible at once; the list stays as long as today.

A wins on the main problem (navigation length) and on audience separation; B wins only on browsing everything at once.

## Shared changes

- Links stay `/docs#page-id` (decided while building: B doesn't need the track in the URL, and keeping the hash avoids touching the public-route checks). `/docs` alone is the task home.
- Content: one Markdown file per page under `ui/src/pages/docs/content/<track>/<page>.md`, front matter `id, title, track, group, order, eyebrow, audience, readTime, summary`; interactive blocks embedded by name (`::request-walkthrough`, `::hook-lab`, `::architecture-simulator`). Parsed by `markdownBlocks.js` (no Markdown library; the syntax is documented at the top of that file).
- "On this page" highlights the heading in view.
- Hook Studio: catalog grouped by category with counts, status as words plus dot (Live, Sandbox, Needs work), source path with Copy, real tabs (Preview, Code, Contract), ↑/↓ through hooks, `?hook=&tab=` in the URL (a catalog key or a hook name), catalog above the preview on phones.

## Rejected

- A card mosaic home for Direction A: the tracks already are the entry points.
- Colour-only status dots in Hook Studio.
- Keeping content in JavaScript strings.
