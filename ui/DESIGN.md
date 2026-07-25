# Design System: Helpdesk Framework

## 1. Visual theme and atmosphere

Use a calm operational-console aesthetic: daily-app balanced density, precise information hierarchy, and restrained motion. The framework must be theme-first: every implemented screen consumes semantic `--ads-*` tokens so a saved light/dark theme pack changes the entire interface without component-level color edits.

Design for a real support and administration workspace, not a marketing dashboard. Prefer asymmetric editorial headers, generous horizontal breathing room, and compact data regions separated by semantic borders rather than cards inside cards.

## 2. Color palette and roles

These are the current default theme values for Stitch previews. Production implementation must map them to semantic tokens and preserve CSV-imported overrides.

- **Canvas Mist** (`#F7F7F5`) — light application canvas.
- **Surface White** (`#FFFFFF`) — controls and elevated workspace surfaces.
- **Ink Green** (`#202523`) — primary light-mode text.
- **Muted Green** (`#5E6864`) — metadata and secondary copy.
- **Structural Border** (`#DDE1DE`) — low-contrast dividers and data regions.
- **Operational Teal** (`#0F766E`) — the single accent for actions, active states, charts, and focus.
- **Night Canvas** (`#111513`) — dark application canvas.
- **Night Surface** (`#171C1A`) — dark surfaces.
- **Night Ink** (`#E4E9E6`) — dark-mode text.
- **Night Teal** (`#55B8AE`) — dark-mode accent.

Use semantic success, warning, danger, and information colors only for status. Do not introduce a second brand accent, neon glows, or gradients. Never use pure black.

## 3. Typography

- **Display and body:** Geist or the framework-configured sans family; controlled weights and tight heading tracking.
- **Metadata and figures:** Geist Mono; tabular numerals for user IDs, dates, metric values, and chart axes.
- **Page title:** 32–40px on desktop, 26–30px on mobile, left aligned.
- **Body:** 14–16px, comfortable line height, maximum readable width of 65 characters.

## 4. Component behavior

- **Navigation:** persistent application shell with clear active-route treatment; no floating unrelated panels.
- **Buttons:** primary accent fill through theme tokens; secondary actions use outline or text treatment. Tactile active state only, no custom color overrides.
- **Data regions:** use a single surface with clear internal dividers. Use cards only for a distinct decision, metric, or workflow boundary.
- **Charts:** use `useChart` in implementation. A 30-day registration trend uses a minimal area or bar chart; role distribution uses a horizontal bar chart. Charts must have text summaries and accessible labels.
- **States:** skeletons match the final layout. Empty states explain the next action. Errors remain inline and actionable.

## 5. User-statistics screen

The page begins with an asymmetric administration header: title and purpose on the left, a compact reporting-period indicator and refresh action on the right. Use four deliberately varied metric blocks rather than four identical cards: total users as the primary large figure, active accounts with a slim status ratio, Google-linked accounts as a small adoption trend, and new users as a 30-day delta.

Below, lead with a wide 30-day user-registration chart and a narrower role-distribution chart. The next region is a full-width recent-account activity table with identity, status, sign-in method, and last login. Use compact dividers, not nested card shadows. All charts and metric copy adapt to light and dark palettes through semantic tokens.

## 6. Layout and responsive rules

- Desktop content is contained to 1440px with a 12-column grid.
- Collapse chart regions and activity table controls to one column below 768px.
- No horizontal scrolling on mobile. Keep all controls at least 44px high.
- Use `min-h-[100dvh]` for full-height layouts.

## 7. Motion

Use one restrained cascade when a dashboard loads: metric blocks then charts then activity list. Animate only opacity and transform, respect reduced motion, and keep charts free of decorative perpetual animation.

## 8. Banned patterns

- No hard-coded component colors; use semantic theme tokens.
- No purple gradients, neon shadows, pure black, or generic three-equal-card grids.
- No centered dashboard hero, emojis, filler copy, fake metrics, or overlapping content.
- No custom mouse cursor, bouncing arrows, or visual effects that hide data.
