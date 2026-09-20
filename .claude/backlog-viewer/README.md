# backlog-viewer

Astro + React + shadcn UI app that renders caw tasks
(`.claude/conductor/tasks/task-*/`) as a stage-based Kanban board.

## Stack

- **Astro 5** (SSR via `@astrojs/node`)
- **React 19** via `@astrojs/react`
- **Tailwind CSS 4** + **shadcn UI** components (Radix primitives + cva)
- **lucide-react** icons
- **marked** for rendering task stage markdown

## Run

Two build targets share one source tree.

### Local (live SSR — default)

Live filesystem read of `.claude/conductor/tasks/`. Polling + SSE updates the
UI as you commit caw work.

```bash
cd .claude/backlog-viewer
pnpm install
CAW_PROJECT_ROOT="$(pwd)/../.." pnpm dev
# open http://localhost:4321
```

`CAW_PROJECT_ROOT` defaults to the current working directory if unset.

Optional login gate: set `PUBLIC_AUTH_USER` / `PUBLIC_AUTH_PASS` to require signing in at
`/login` before the app loads. **Not real access control** — both values are inlined into the
client JS bundle and the check itself runs in `localStorage`, so anyone with DevTools can read
the credentials or flip the gate open directly. It only deters a casual visitor on a shared
screen/network; don't rely on it for a project with sensitive data. Leave the vars unset to skip
the gate entirely.

### Vercel (static snapshot)

`DEPLOY_TARGET=vercel` flips every API route to `prerender = true`. Astro
walks `.claude/conductor/` at build time and emits flat JSON files into
`.vercel/output/static/api/*.json` — no serverless functions, no runtime
filesystem access.

```bash
pnpm build:vercel
# output: ../../.vercel/output/  (copied to repo root for Vercel pickup)
```

**Deploy:** Connect the repo gốc to Vercel. The `vercel.json` at repo root
already points Vercel to run `pnpm build:vercel` inside this folder. Every
push to the linked branch rebuilds the snapshot.

Static mode trade-offs:

- No live updates — UI is frozen at the commit Vercel built from.
- `/api/events` (SSE) and `/api/system.json` are inert stubs.
- No auth — anything in `.claude/conductor/` is publicly visible.

> **Why pnpm?** npm has a known bug with optional dependencies
> ([npm/cli#4828](https://github.com/npm/cli/issues/4828)) that prevents
> platform-specific native binaries from installing
> (`@rollup/rollup-darwin-arm64`, `@tailwindcss/oxide-darwin-arm64`,
> `lightningcss-darwin-arm64`). pnpm handles them correctly.

## Data model

Each task folder holds one `overview.yaml` (structured state) plus four
stage markdown files. The parser reads `overview.yaml` as YAML; a folder
without `overview.yaml` is skipped as not a valid caw task.

| Field | Source |
|---|---|
| `status`     | `status:` in `overview.yaml` |
| `lane`       | `lane:` in `overview.yaml` (`tiny` / `standard` / `risky`) |
| `type`       | `type:` in `overview.yaml` |
| `next_phase` | `next_phase:` in `overview.yaml` |
| `phases[]`   | `phases:` list in `overview.yaml` |
| `sections.{plan,code,tests,review}` | `plan.md`, `code.md`, `tests.md`, `review.md` |
| `sections.overview` | raw `overview.yaml` content |

The status→stage mapping (Pending → Planning → Coding → Testing → Review →
Blocked → Done) lives in [src/lib/status.ts](src/lib/status.ts).

## Decision Log

### Defer GraphQL for backlog viewer

Backlog viewer remains a read-only filesystem projection. The existing parser and JSON endpoints
(`/api/tasks.json`, `/api/project.json`) are sufficient because task artifacts (`overview.yaml` +
stage markdown) remain the source of truth and there is no external consumer requiring a typed
query contract.

**Status: Deferred — not needed currently, not a planned implementation.** No GraphQL dependency,
schema, resolver, or API-layer change.

Reconsider only when at least one of these becomes true:

- Two or more independent consumers need selective, cross-task queries.
- Pagination/filtering/aggregation needs exceed what the current JSON endpoints can serve.
- An external integration requires a stable, typed API contract.
- The filesystem read model is replaced by a shared service/database.

## Docs view

Lists and previews standalone HTML docs (e.g. specs produced by the
`technical-doc-html` skill) that live anywhere in the project — not just
`.claude/conductor/`. `docs/` and `specs/` are auto-detected at the project
root with zero config — if either exists as a real directory, it's scanned
automatically. For any other location, add a `docPaths` array to
`.claude/caw.config.json` (project-relative folders to scan); an explicit
`docPaths` entry always wins over auto-detection:

```json
{
  "caw_home": "...",
  "docPaths": ["specs", "docs/reports"]
}
```

Each configured folder is walked recursively for `*.html` files (skipping
`node_modules`, `.git`, `dist`, `build`, `.next`, `.astro`, `.vercel`); the
list refreshes live over the same SSE channel as tasks/skills, and clicking a
doc loads it in an `<iframe>` served from `/api/docs/<relative-path>` — never
by joining a raw request path onto disk, so a request can't resolve outside
the configured folders even with `../` segments (see
[src/lib/doc-parser.ts](src/lib/doc-parser.ts)). No effect on the Vercel
static build — same precedent as `/api/events`, since there's no live project
tree to scan at runtime there.

## Layout

```
src/
├── pages/
│   ├── index.astro              # Shell <html> → <App client:load />
│   └── api/
│       ├── tasks.json.ts        # GET /api/tasks.json — parse CAW_PROJECT_ROOT tasks
│       └── project.json.ts      # GET /api/project.json — { name, root }
├── components/
│   ├── app.tsx                  # Root: polling + view routing + dialog state
│   ├── tasks-sidebar.tsx        # shadcn sidebar (Dashboard / Board nav)
│   ├── tasks-header.tsx         # Top bar with live indicator
│   ├── stats-cards.tsx          # Totals (Total / In Progress / Done / Blocked)
│   ├── tasks-board.tsx          # Kanban container
│   ├── task-column.tsx          # Stage column
│   ├── task-card.tsx            # Task card with lane + phase progress
│   ├── task-dialog.tsx          # Detail dialog: tabs for stage markdown files
│   ├── dashboard.tsx            # Dashboard view (stats + board)
│   └── ui/                      # shadcn primitives: button, badge, dialog,
│                                # tabs, sidebar, sheet, separator, …
├── lib/
│   ├── utils.ts                 # cn() — clsx + tailwind-merge
│   ├── task-parser.ts           # Node-side parser (fs + regex)
│   ├── status.ts                # Status→stage mapping, stats, colors
│   └── markdown.ts              # marked wrapper
├── hooks/
│   └── use-mobile.ts            # Mobile breakpoint hook for sidebar
└── styles/
    └── globals.css              # Tailwind + shadcn CSS variables + prose-task
```

## Dev notes

- API endpoints (`/api/*`) opt out of prerendering (`export const prerender = false`),
  so they run server-side at request time and re-read task files on every call.
- The app polls `/api/tasks.json` every 3s and flashes the "Live" indicator on
  changes (hash-based diff to avoid unnecessary re-renders).
- Hash routing: `#/` → Dashboard, `#/board` → Board.
- Dark mode only (class="dark" on `<html>`).

## Customizing

shadcn components are committed in [src/components/ui/](src/components/ui/) —
edit them like normal source. New primitives can be added via
`npx shadcn add <name>` once the local install is in place.
