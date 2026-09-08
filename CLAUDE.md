# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

FloodMap / SOS — a realtime flood-map and emergency-SOS web app for Vietnam, built with Next.js 16 (App Router) + React 19. It renders a MapLibre map with rain radar, weather overlays, an auto-computed flood-risk layer, and crowdsourced SOS reports that update live via Supabase Realtime. UI strings are in Vietnamese.

## Commands

```bash
pnpm dev              # Next dev server (http://localhost:3000)
pnpm build            # Production build
pnpm start            # Serve production build

pnpm check            # Biome lint + format with --write
pnpm check:ci         # Biome check, no writes (CI gate)
pnpm lint:biome       # Biome lint only
pnpm format           # Biome format --write only

npx tsc --noEmit      # Typecheck (no `typecheck` script is defined)
```

**Broken / unusable scripts — do not suggest them:**

- `pnpm test:supabase`, `pnpm test:api`, `pnpm test:sos`, `pnpm test:realtime`, `pnpm check:setup` all point at a `scripts/` directory that **does not exist in this repo**. They fail immediately.
- `pnpm lint` runs `next lint`, but there is no ESLint config at the root and Next 16 dropped that command. Use Biome instead.

There is **no test framework and no test suite** — no Jest/Vitest/Playwright, no test files. Verification is `npx tsc --noEmit` + `pnpm check:ci` + manual browser checks.

## Architecture

Single-page client app (`src/app/page.tsx` is `'use client'`) that orchestrates all state, with Next.js API routes acting as **server-side proxies** to third-party APIs (to hide keys, avoid CORS, and add caching).

### Data flow

1. `page.tsx` resolves a map `center` (browser geolocation → fallback geocode of "Đà Nẵng").
2. On every `center` change it fan-fetches (via `Promise.allSettled`, refreshed every 5 min):
   - `fetchNowcast` → `/api/nowcast` (Open-Meteo 15-min precipitation)
   - `fetchTide` → `/api/tides` (WorldTides, needs `WORLDTIDES_KEY`)
   - `/api/risk` (computed flood-risk GeoJSON)
   - `/api/sos/report` GET (all SOS reports)
3. `useRealtimeSOS` (`src/hooks/useRealtimeSOS.ts`) subscribes to Supabase `postgres_changes` on `sos_reports` and patches `sosReports` state in place on INSERT/UPDATE/DELETE — this is the live-update path; the 5-min poll is the fallback/initial load.
4. `MapView` renders everything as MapLibre layers/sources.

Client-side fetch helpers live in `src/lib/datasources.ts` and, like the routes, swallow errors and return empty shapes so the UI never crashes.

### Risk computation (the non-obvious core)

`/api/risk` composes three upstream signals into a flood-risk overlay:

- **Elevation bands** come from `/api/isobands`, which builds a turf.js square grid around the point, queries open-elevation.com per cell (batched, LRU-cached 30 min), and groups cells into `ELEV_BANDS` (`src/lib/risk.ts`).
- For each grid cell it calls `isRisk(rate, prob, tide, elev)` and `computeRiskScore(...)` from `src/lib/risk.ts` and returns only the risky features as a GeoJSON `FeatureCollection`.
- The thresholds and the score formula live entirely in `src/lib/risk.ts` — change risk behavior there, not in the route.

`/api/risk` calls `/api/isobands` over HTTP using a base URL reconstructed from request headers (`x-forwarded-proto` / `host`, `src/app/api/risk/route.ts:98`). Every upstream failure degrades to an empty `FeatureCollection` rather than erroring, so the map never breaks.

### Tile proxying

Map tiles are proxied through API routes, never fetched directly from the browser:

- `/api/radar-tiles` → RainViewer radar PNGs (returns a transparent 1×1 PNG on failure).
- `/api/owm-tiles` → OpenWeatherMap temp/wind/aqi tiles, gated on `NEXT_PUBLIC_OWM_KEY` (transparent PNG if unset).
- `src/lib/weather.ts` builds the `{z}/{x}/{y}` template URLs pointing at these proxies; `MapView` consumes them.

### Supabase

- `src/lib/supabase.ts` exports a browser `supabase` client and `createServerClient()` for API routes. The server client prefers `SUPABASE_SERVICE_ROLE_KEY` only if it looks valid (starts with `eyJ`, length > 50), otherwise falls back to the anon key — **this works because RLS policies allow public read/insert/update** (see migrations). Do not assume service-role is present.
- Schema lives in `supabase/migrations/` (`001_create_sos_reports_simple.sql`, `002_create_storage_bucket.sql`). Migrations are applied manually via the Supabase SQL editor (no migration CLI wired up). `001` creates `sos_reports` (no PostGIS; lat/lon are plain columns, distance filtering is Haversine in JS inside the GET route). `002` creates the public `sos-images` storage bucket.
- `created_at` / `updated_at` are **epoch milliseconds stored as BIGINT**, not timestamps.
- DB columns are snake_case (`people_count`, `has_vulnerable`, `image_url`); the API layer transforms them to camelCase `SosReport` shape on the way out. The canonical `SosReport` interface is defined in `src/components/MapView.tsx:38` and imported elsewhere.

### Offline SOS queue

`src/lib/sos-queue.ts` persists unsent SOS submissions to `localStorage` and auto-retries them on the browser `online` event.

## Conventions

- Path aliases: `@/*` → `src/*` (`@/components`, `@/lib`, `@/hooks`, `@/app`).
- **Biome** is the formatter/linter (not Prettier/ESLint): 2-space indent, 100 col, double quotes, semicolons, ES5 trailing commas, `organizeImports` on. `noExplicitAny` and `useExhaustiveDependencies` are warnings (the codebase uses `any` liberally for GeoJSON/payloads); `useButtonType` is an error.
- ⚠️ **The existing source does not match the Biome config** — most files use single quotes and omit semicolons. A blanket `pnpm check` (which writes) will reformat the whole tree and bury your diff. Prefer `pnpm check:ci` to inspect, and format only the files you touched (`npx biome check --write <paths>`).
- shadcn/ui (new-york style) for primitives in `src/components/ui/`; `lucide-react` icons; `sonner` for toasts; `cn()` from `src/lib/utils.ts` for class merging.
- Tailwind CSS v4 (config-less, via `@tailwindcss/postcss`); theme tokens are CSS variables in `src/app/globals.css`; dark mode via `next-themes`.
- The map style is free Carto Positron (`MAP_STYLE_URL` in `src/constants/index.ts`) — no Mapbox token needed.
- Commits follow Conventional Commits, enforced by `commitlint.config.cjs`: lower-case type from the standard set, **kebab-case scope**, no sentence/start/pascal/upper-case subject, no trailing period, header ≤ 150 chars. No husky hook is installed, so this is advisory unless CI runs it.

## Environment variables (`.env.local`)

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — **required**.
- `SUPABASE_SERVICE_ROLE_KEY` — optional (anon key suffices given the public RLS policies).
- `WORLDTIDES_KEY` — optional; without it tide data and the tide component of risk are simply absent.
- `NEXT_PUBLIC_OWM_KEY` — optional; without it OpenWeatherMap overlay tiles are blank.
- All other upstreams (Open-Meteo, RainViewer, Nominatim, open-elevation) are keyless.

## Agent harness (`.claude/`)

The caw harness in this repo is **markdown + hooks only**; there is no `harness-cli` binary and no `harness.db`.

- `.claude/rules/` — auto-loadable rules (`common/`, `typescript/`, `react/`), including `common/harness-contract.md`.
- `.claude/agents/` — planner / coder / tester / reviewer / setup subagents.
- `.claude/commands/caw-*.md` — the `/caw-plan`, `/caw-code`, `/caw-test`, `/caw-review`, `/caw-verify`, `/caw-status`, `/caw-setup` slash commands.
- `.claude/conductor/` — the actual task/backlog/decision state, in markdown (`backlog.md`, `tasks/`, `decisions/`, `intake.md`, `conventions.md`).
- `.claude/settings.json` — a **Stop hook batch-formats and typechecks every file edited in the session**, so edits get Biome-formatted automatically at the end of a turn.

## Caveats for future edits

- **`docs/caw/` and `scripts/caw/bin/harness-cli` do not exist.** `AGENTS.md` (and the harness block it describes) instruct you to read `docs/caw/HARNESS.md`, `docs/caw/CONTEXT_RULES.md`, etc. and to run `scripts/caw/bin/harness-cli query matrix` — all of those paths are absent. Don't try to run the CLI; use `.claude/conductor/` and `/caw-status` for task state. Run `/caw-setup` if the full harness is actually wanted.
- The `README.md` is stale: it documents a Mapbox token requirement (the app uses free Carto), names a migration file that doesn't exist (`001_create_sos_reports.sql`), and its project-structure section predates the `src/` layout. Trust the actual `src/` tree.
- API routes intentionally swallow upstream errors and return safe empty payloads / transparent tiles so the UI degrades gracefully — preserve that pattern when editing routes.
- Several routes still contain `console.log` debug statements (nowcast, isobands, rainviewer); they are pre-existing.
- There is no `.npmrc` and no `packageManager` field in `package.json`, and the local `node_modules` is currently missing Biome's platform binary (`@biomejs/cli-darwin-arm64`) — `pnpm install` may be needed before Biome runs.

## Harness imports

Claude Code loads this file into every session but does not auto-load `AGENTS.md`.
The bare `@` line below imports it at context-load time. Never wrap it in
backticks; that disables the import.

@AGENTS.md

<!-- caw:version-pin -->
## Agent workflow — caw v1 only

This project is scaffolded with **caw v1**. Its slash commands are `/caw-setup`, `/caw-plan`,
`/caw-code`, `/caw-test`, `/caw-review`, `/caw-verify`, `/caw-status`.

**Never run `/caw2:*` in this repo.** caw2 is a separate product with an incompatible harness:

| | caw v1 (this project) | caw2 (do not use here) |
|---|---|---|
| Task state | `.claude/conductor/tasks/<id>/overview.yaml` | `harness.db` (SQLite) via `harness-cli` |
| Agent memory | `.claude/agent-memory/{setup,planner,coder,tester,reviewer}/` (dir = agent `name:`) | `.claude/agent-memory/caw2-*/` |
| Skill names | bare (`security-hardening`) | namespaced (`caw2:security-hardening`) |

If unsure which version a project uses, check for `.claude/caw.config.json` — its presence
means caw v1.
<!-- /caw:version-pin -->
