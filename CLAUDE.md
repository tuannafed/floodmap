# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

FloodMap / SOS — a realtime flood-map and emergency-SOS web app for Vietnam, built with Next.js 16 (App Router) + React 19. It renders a MapLibre map with rain radar, weather overlays, an auto-computed flood-risk layer, and crowdsourced SOS reports that update live via Supabase Realtime. UI strings are in Vietnamese.

## Commands

```bash
pnpm dev              # Next dev server (http://localhost:3000)
pnpm build            # Production build
pnpm start            # Serve production build

pnpm check            # Biome lint + format with --write (use this before committing)
pnpm check:ci         # Biome check, no writes (CI gate)
pnpm lint:biome       # Biome lint only
pnpm format           # Biome format --write only
pnpm lint             # next lint (eslint)
```

Diagnostic scripts (Node, load `.env.local` via dotenv — require Supabase creds):

```bash
pnpm check:setup      # Verify Supabase env + connectivity + table/bucket existence
pnpm test:supabase    # Test Supabase connection
pnpm test:sos         # Test sos_reports table read/write
pnpm test:realtime    # Subscribe to realtime SOS changes (scripts/test-realtime-sos.mjs)
pnpm test:api         # Hit the local API routes
```

There is **no unit/integration test framework** — the `test:*` scripts are manual diagnostic harnesses against a live Supabase instance, not a test suite.

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

### Risk computation (the non-obvious core)

`/api/risk` composes three upstream signals into a flood-risk overlay:
- **Elevation bands** come from `/api/isobands`, which builds a turf.js square grid around the point, queries open-elevation.com per cell (batched, LRU-cached 30 min), and groups cells into `ELEV_BANDS` (`src/lib/risk.ts`).
- For each grid cell it calls `isRisk(rate, prob, tide, elev)` and `computeRiskScore(...)` from `src/lib/risk.ts` and returns only the risky features as a GeoJSON `FeatureCollection`.
- The thresholds and the score formula live entirely in `src/lib/risk.ts` — change risk behavior there, not in the route.

`/api/risk` calls `/api/isobands` over HTTP using a base URL reconstructed from request headers (`x-forwarded-proto` / `host`). Every upstream failure degrades to an empty `FeatureCollection` rather than erroring, so the map never breaks.

### Tile proxying

Map tiles are proxied through API routes, never fetched directly from the browser:
- `/api/radar-tiles` → RainViewer radar PNGs (returns a transparent 1×1 PNG on failure).
- `/api/owm-tiles` → OpenWeatherMap temp/wind/aqi tiles, gated on `NEXT_PUBLIC_OWM_KEY` (transparent PNG if unset).
- `src/lib/weather.ts` builds the `{z}/{x}/{y}` template URLs pointing at these proxies; `MapView` consumes them.

### Supabase

- `src/lib/supabase.ts` exports a browser `supabase` client and `createServerClient()` for API routes. The server client prefers `SUPABASE_SERVICE_ROLE_KEY` only if it looks valid, otherwise falls back to the anon key — **this works because RLS policies allow public read/insert/update** (see migrations). Do not assume service-role is present.
- Schema lives in `supabase/migrations/`. Migrations are applied manually via the Supabase SQL editor (no migration CLI wired up). `001` creates `sos_reports` (no PostGIS; lat/lon are plain columns, distance filtering is Haversine in JS inside the GET route). `002` creates the public `sos-images` storage bucket.
- `created_at` / `updated_at` are **epoch milliseconds stored as BIGINT**, not timestamps.
- DB columns are snake_case (`people_count`, `has_vulnerable`, `image_url`); the API layer transforms them to camelCase `SosReport` shape on the way out. The canonical `SosReport` type is defined in `src/components/MapView.tsx` and imported elsewhere.

### Offline SOS queue

`src/lib/sos-queue.ts` persists unsent SOS submissions to `localStorage` and auto-retries them on the browser `online` event.

## Conventions

- Path aliases: `@/*` → `src/*` (`@/components`, `@/lib`, `@/hooks`, `@/app`).
- **Biome** is the formatter/linter (not Prettier/ESLint for formatting): 2-space indent, 100 col, double quotes, semicolons, ES5 trailing commas. `noExplicitAny` and `useExhaustiveDependencies` are warnings (the codebase uses `any` liberally for GeoJSON/payloads). Run `pnpm check` before committing.
- shadcn/ui (new-york style) for primitives in `src/components/ui/`; `lucide-react` icons; `sonner` for toasts; `cn()` from `src/lib/utils.ts` for class merging.
- Tailwind CSS v4 (config-less, via `@tailwindcss/postcss`); theme tokens are CSS variables in `src/app/globals.css`; dark mode via `next-themes`.
- The map style is free Carto Positron (`MAP_STYLE_URL` in `src/constants/index.ts`) — no Mapbox token needed.
- Commit messages follow Conventional Commits (`feat:`, `fix:`, `chore:`, `refactor:`, `docs:`).

## Environment variables (`.env.local`)

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — **required**.
- `SUPABASE_SERVICE_ROLE_KEY` — optional (anon key suffices given the public RLS policies).
- `WORLDTIDES_KEY` — optional; without it tide data and the tide component of risk are simply absent.
- `NEXT_PUBLIC_OWM_KEY` — optional; without it OpenWeatherMap overlay tiles are blank.
- All other upstreams (Open-Meteo, RainViewer, Nominatim, open-elevation) are keyless.

## Caveats for future edits

- `.cursor/rules/*.mdc` and `.cursor/commands/*` describe a NestJS + Prisma + AWS + Stripe stack that **this project does not use** — ignore them as stack guidance; they are generic templates. The README's "project structure" section is also stale (predates the `src/` layout and Supabase). Trust the actual `src/` tree over both.
- API routes intentionally swallow upstream errors and return safe empty payloads / transparent tiles so the UI degrades gracefully — preserve that pattern when editing routes.
- Several routes still contain `console.log` debug statements (nowcast, isobands, rainviewer); they are existing, not introduced by you.
<!-- HARNESS:BEGIN -->
## Harness

Claude Code loads this file into every session, but it does not auto-load
`AGENTS.md`. The bare `@` lines below import the always-required harness
context (the "Must in all lanes" set from `docs/caw/CONTEXT_RULES.md`) at
context-load time. Never wrap them in backticks; that disables the import.

@AGENTS.md

@docs/caw/FEATURE_INTAKE.md

Also run `scripts/caw/bin/harness-cli query matrix` before starting work.

Lane-dependent context (`docs/caw/HARNESS.md`, `docs/caw/ARCHITECTURE.md`,
`docs/caw/CONTEXT_RULES.md`, `docs/caw/conventions.md`, product docs, stories,
decisions) is intentionally not imported — read it per lane, as
`docs/caw/CONTEXT_RULES.md` prescribes.
<!-- HARNESS:END -->
