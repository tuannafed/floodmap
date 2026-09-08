# Project Conventions

Use this file to declare the neutral engineering conventions for this project.
Agents must treat it as the source of truth for architecture choices that can vary
between projects.

**Project:** SOS / FloodMap
**Team type:** frontend-only (Next.js API routes act as backend-for-frontend proxies; no separate backend service)

---

## Selected Archetype

- Archetype ID: `nextjs-feature` (single-page client app + API-route proxies)
- Summary: Realtime flood-map + SOS reporting app for Vietnam. One `'use client'` page
  (`src/app/page.tsx`) orchestrates map state; Next.js API routes proxy third-party
  weather/tide/elevation APIs (hide keys, dodge CORS, add caching) and compute a
  derived flood-risk GeoJSON layer. Supabase Realtime pushes live SOS report updates.
- Primary surfaces:
  - Frontend shell: Next.js 16 App Router, React 19, MapLibre GL (via `react-map-gl`)
  - Backend style: Next.js Route Handlers under `src/app/api/*` as stateless proxies —
    no ORM, no persistent backend process
  - Integration boundary: Supabase (Postgres + Realtime + Storage) via
    `src/lib/supabase.ts`; upstream weather/tide/elevation APIs called only from
    server-side route handlers, never directly from the browser

## Forbidden Patterns

- Hardcoded business/domain terminology copied from prior projects
- Global state rules that contradict the selected project pattern
- Ad-hoc folder layouts that bypass the folder contract below
- Raw API usage in components when a typed client convention exists
- Fetching upstream third-party APIs (Open-Meteo, WorldTides, RainViewer, OWM,
  open-elevation) directly from client components — always go through an
  `/api/*` proxy route
- Assuming `SUPABASE_SERVICE_ROLE_KEY` is present — the server client falls back
  to the anon key and this only works because RLS allows public read/insert/update
- Breaking the "upstream failure degrades to empty/transparent payload" pattern in
  API routes (nowcast, tides, risk, radar-tiles, owm-tiles) — the map must never
  hard-error on a third-party outage
- Treating `created_at`/`updated_at` as real timestamps — they are epoch-ms BIGINT
  columns in `sos_reports`

## Folder Contract

| Area              | Required location              | Notes                                                          |
| ----------------- | ------------------------------- | --------------------------------------------------------------- |
| App routes         | `src/app/...`                   | Keep route files thin; `page.tsx` is the single client orchestrator |
| API proxy routes   | `src/app/api/<name>/route.ts`   | One upstream concern per route; always swallow errors to a safe empty shape |
| Shared UI          | `src/components/...`            | `MapView.tsx` owns the canonical `SosReport` type; `ui/` = shadcn primitives |
| Shared libraries   | `src/lib/...`                   | `datasources.ts` (fetch helpers), `risk.ts` (scoring/thresholds), `supabase.ts`, `weather.ts`, `sos-queue.ts`, `utils.ts` |
| Realtime hooks     | `src/hooks/...`                 | `useRealtimeSOS.ts` — Supabase `postgres_changes` subscription |
| Constants          | `src/constants/...`             | `MAP_STYLE_URL` and other shared config values |
| DB schema          | `supabase/migrations/...`       | Applied manually via Supabase SQL editor, no migration CLI |

## Verify Commands

The coder runs these as its Step 5 self-verify gate before marking a phase
`done`.

| Check | Command |
| ----- | ------- |
| Type-check | `npx tsc --noEmit` (no `typecheck` script defined in package.json) |
| Lint | `pnpm check:ci` (Biome check, no writes — CI gate). For touched-files-only formatting use `npx biome check --write <paths>`; avoid a blanket `pnpm check`, since most existing files use single quotes / no semicolons and don't match the Biome config yet — a full-tree write would bury unrelated diffs. |
| Unit test (single file) | `n/a` — no test framework installed (no Jest/Vitest/Playwright, no test files). Verification is type-check + lint + manual browser check. |

**Lint detection note:** this project ships `biome.json` (source of truth) plus
`eslint` / `eslint-config-next` as unused devDependencies — there is no ESLint
config file and `pnpm lint` (`next lint`) is broken on Next 16. Do not suggest
`pnpm lint` or ESLint; Biome is the only active linter/formatter.

## Agent Resolution Rule

1. Read this file before designing architecture, code, or review feedback.
2. Apply precedence: `Optional Overrides` → this file → skills (auto-loaded) → generic project docs.
3. Mark non-applicable rules `not-applicable` in the task's Convention Resolution section.
4. Treat `Forbidden Patterns` as review failures unless an override explicitly allows them.

## Optional Overrides

### Frontend

- Data/state pattern: plain `useState`/`useEffect` orchestration in `page.tsx` +
  `Promise.allSettled` fan-out fetch (no TanStack Query, no Zustand/Redux)
- Feature root: no `src/features/` — flat `src/components`, `src/lib`, `src/hooks`
- API client entrypoint: `src/lib/datasources.ts` (client-side fetch helpers that
  call this app's own `/api/*` routes, not third parties directly)

### Backend

- Response contract strategy: API routes return raw JSON shapes tailored per
  route (e.g. GeoJSON `FeatureCollection` for risk/isobands, camelCase `SosReport[]`
  for SOS reports); DB snake_case → camelCase mapping happens in the route, not a
  shared DTO layer
- Module root: `src/app/api/<name>/route.ts`, one folder per upstream concern

### Integrate phase

- Contract verification focus: confirm error paths still degrade to empty/transparent
  payloads (never throw to the client); confirm Supabase Realtime patches
  (`useRealtimeSOS`) stay in sync with the 5-min poll fallback

### Review

- Convention compliance priority: folder contract and the "swallow upstream errors"
  pattern are blocking; naming/style deviations from Biome are warning (see the
  quote-mark/semicolon mismatch noted in `CLAUDE.md`)
