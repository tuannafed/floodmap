# Claude Agent Workflow (caw)

> Skill-first agent pipeline for any project. 5 generic agents + 60+ curated skills + 16 caw-owned skills. Agents run natively in Claude Code.

---

## What is this?

A **template hub** that scaffolds a 4-stage agent pipeline into any project. Domain knowledge lives in skills (auto-discovered, vendor-curated); agents are workflow primitives — no per-framework specialists.

**Pipeline:** `Plan → Code → Test → Review`

Each feature, bug, chore, or refactor becomes a **task** with structured handoff between stages. Skills are loaded on demand based on detected stack and per-phase `skills_hint`.

---

## How it works

```
caw init <project>                        ← scaffold core (agents, commands, rules, hooks)
        │
        ▼
Open project in Claude Code
        │
        ▼
/init                                     ← Claude built-in: generates CLAUDE.md
/caw-setup                                ← detect stack → install skills → write conventions.md
        │
        ▼
/caw-plan "<feature description>"         ← spec + API contract + phases + challenge
/caw-code <task-id> --all                 ← all phases (parallel where Plan allows)
/caw-verify <task-id>                     ← test + review in parallel
```

---

## Prerequisites

| Tool            | Required | Install                                  |
| --------------- | -------- | ---------------------------------------- |
| **Claude Code** | Yes      | [claude.ai/code](https://claude.ai/code) |
| **Git**         | Yes      | `brew install git`                       |
| **Node.js** ≥ 18 | Yes     | `brew install node`                      |
| **bash** ≥ 4    | Yes      | `brew install bash` _(macOS default is 3.2)_ |
| **gitleaks**    | Yes      | `brew install gitleaks` _(secret scanning, mandatory)_ |

---

## Quick Start

### 1 — Install caw

```bash
./setup.sh
source ~/.zshrc
```

This adds the `caw` alias to your shell rc and sets `CAW_HOME` so the `setup` agent can locate the repo.

### 2 — Scaffold a project

```bash
caw init ~/Projects/my-app
```

Copies core (agents, commands, rules, hooks) into `.claude/`. **No skills yet** — those come in step 4.

### 3 — Generate project documentation _(inside Claude Code)_

```
/init
```

Claude Code's built-in command. Scans the codebase and writes `CLAUDE.md`. Required input for the next step.

### 4 — Setup caw for this project _(inside Claude Code)_

```
/caw-setup
```

The `setup` agent:
1. Reads `CLAUDE.md` + caw's `SKILLS-CATALOG.md`
2. Detects tech stack from `package.json` + file scan
3. Symlinks caw-curated skills straight to `$CAW_HOME` (offline, no copy)
4. Asks before pulling external hub skills (no silent installs)
5. Generates `.claude/skill-map.yaml` + `.claude/conductor/conventions.md`

After setup, your project knows its stack and has the right skills installed.

### 5 — Run the workflow

```
/caw-plan "Add Stripe subscription"      ← planner: spec + phases + challenge
/caw-code <task-id> --all                 ← coder: implements all phases
/caw-verify <task-id>                     ← tester + reviewer in parallel
```

Or step-by-step:

```
/caw-plan "<description>"
/caw-code <task-id>                       ← one phase at a time
/caw-test <task-id>                       ← write tests (mode driven by Plan)
/caw-review <task-id>                     ← multi-dim review with severity findings
/caw-status [<task-id>]                   ← check task state
```

### 6 — Maintain

```bash
caw upgrade <project>           # sync latest agents/commands/rules/hooks + backlog viewer
caw upgrade <project> --dry-run # preview changes
caw upgrade <project> --force   # also overwrite files the project modified (old copies → .claude/.caw-backup/)
caw drift <project>             # what the project changed vs the hub — run before upgrade, port hub-ward first
caw remove <project>            # remove caw workflow files
```

### Backlog viewer (optional)

`caw init` asks whether to copy the Astro + React + shadcn Kanban into
`<project>/.claude/backlog-viewer/` — it renders `.claude/conductor/tasks/`:

```bash
cd <project>/.claude/backlog-viewer
pnpm install
CAW_PROJECT_ROOT="$(pwd)/../.." pnpm dev
# open http://localhost:4321
```

---

## Architecture

### Stages (4)

| Stage      | Purpose                                                         | Agent     |
| ---------- | --------------------------------------------------------------- | --------- |
| **Plan**   | Spec, API contract, phases, self-challenge, lane                | planner   |
| **Code**   | Implement one phase at a time, loading skills via `skills_hint` | coder     |
| **Test**   | Lane-driven tests (tiny=skip / standard=backend-only / risky=all) | tester  |
| **Review** | Multi-dim review (security/perf/a11y/refactor) with severity    | reviewer  |

Plus a one-time **Bootstrap** stage handled by `/caw-setup` (agent: `setup`).

### Agents (5)

| Agent      | Role                                                                         |
| ---------- | ---------------------------------------------------------------------------- |
| `setup`    | Detect stack, install skills, generate conventions.md + skill-map.yaml       |
| `planner`  | Translate request → Plan with phases + test_scenarios + skills_hint + challenge |
| `coder`    | Implement one phase, auto-load skills via Skill tool. Generic across stack.  |
| `tester`   | Lane-driven testing. Mobile = unit only. Test mode derived from Plan's `lane`. |
| `reviewer` | Multi-dim review with severity-based findings. May amend Plan if needed.    |

### Commands (7)

| Command            | Action                                                  |
| ------------------ | ------------------------------------------------------- |
| `/caw-setup`       | Detect stack, install skills, write conventions         |
| `/caw-plan`        | Generate Plan from description                          |
| `/caw-code`        | Implement one phase (`--all` runs every phase)          |
| `/caw-test`        | Tests (mode derived from Plan's lane)                   |
| `/caw-review`      | Multi-dim review                                        |
| `/caw-verify`      | Test + review in parallel                               |
| `/caw-status`      | Show task state                                         |

### Lane-driven TDD

`lane` is the single task-sizing field — `planner` sets it from risk flags +
heuristics, and the tester derives its test mode from it (no separate
`tdd_mode` field):

| Lane       | Triggers                                  | Test behavior (tester derives)                       |
| ---------- | ----------------------------------------- | ---------------------------------------------------- |
| `tiny`     | chore, simple refactor, low-risk bug      | No tests. Manual verify.                             |
| `standard` | normal feature, medium-risk bug           | Tests for backend phases post-impl. Frontend visual. |
| `risky`    | security, payment, auth, data migration   | All phases test-first (red → green).                 |

### Severity-based review findings

| Severity | Action |
|---|---|
| **Any open finding** | Verdict `review-blocked`. Reviewer appends a `review-fixes-<N>` phase to the Plan; coder fixes, tester re-runs, reviewer re-reviews. Repeat until 0 open. |
| **CRITICAL / HIGH** | Same loop; Tier-2 re-test where data/DB is involved, full re-review. |
| **MEDIUM / LOW** | Same loop, batched into the same phase. Never deferred, never a follow-up. |
| Pre-existing code outside the diff | Not this task's finding: filed as a new task in `backlog.md`, named in the report. |

---

## Skills

Two sources, both end up in `.claude/skills/`:

| Source       | Location                              | Purpose                                                                       |
| ------------ | ------------------------------------- | ----------------------------------------------------------------------------- |
| **Caw-owned** | `templates/skills/<name>/SKILL.md`   | Workflow / archetype / convention skills caw can't delegate                   |
| **Hub**      | `.agents/skills/<name>/SKILL.md`      | Framework / library expertise — pulled via [skills.sh](https://skills.sh/)    |

**Caw-owned skills (11):** `api-contract`, `error-handling-patterns`, `nextjs-feature`, `react-component-testing`, `adversarial-test-design`, `context-engineering`, `doubt-check`, `observability`, `performance-optimization`, `security-hardening`, `shadcn-table-layout` (the last is stack-matched on `components.json`, the rest are installed by default)

**Hub skills (50+):** Curated from Anthropic, Vercel, Prisma, Stripe, Cloudflare, TanStack, Auth0, Expo, Software Mansion, Callstack, GitHub, Addy Osmani, Matt Pocock, and more. See [SKILLS-CATALOG.md](SKILLS-CATALOG.md) for the full list.

**Priority rule:** if a topic is covered by a hub skill, prefer hub. Caw-owned skill exists only when no authoritative external source covers it.

**Init flow:** `caw init` ships **no skills** — only agents, commands, rules, and hooks. `/caw-setup` (run after `/init`) reads `<CAW_HOME>/SKILLS-CATALOG.md`, detects stack, symlinks the caw-owned skills (10 by default, `shadcn-table-layout` when the stack matches) + matched caw-curated hub skills straight to `$CAW_HOME` (offline, no copy — `.claude/skills/<name>` is an absolute symlink into the caw repo), then asks before pulling additional skills from the live hub (those are copied under `.agents/skills/`, since there's no caw-repo source to link to).

### Adding a hub skill to caw repo

```bash
# Pull from skills.sh
npx skills add <repo>:<skill-name>

# Add metadata to scripts/generate-catalog.py META dict (triggers + domain)
# ...edit file...

# Regenerate catalog
./scripts/generate-catalog.sh

# Commit
git add .agents/skills/<skill-name>/ skills-lock.json SKILLS-CATALOG.md scripts/generate-catalog.py
```

---

## Repository Layout

```
caw repo/
├── agents/                  5 agent definitions (setup, planner, coder, tester, reviewer)
├── commands/                7 command files (caw-setup, caw-plan, caw-code, ...)
├── rules/                   Non-overridable rules (harness-contract always loaded; the rest by `paths:` glob)
│   ├── common/              harness-contract, plan-discipline, code-discipline, test-discipline,
│   │                        review-discipline, migration-safety, test-tiers, coding-standards,
│   │                        agent-memory (9 files)
│   └── typescript/          TS/JS style
├── templates/
│   ├── skills/              16 caw-owned skills
│   ├── static-gates/        worked examples of static gates (hub-only reference, not scaffolded)
│   ├── scripts/             caw-status.sh (/caw-status runs it, no agent) + spawn-herdr-peer.sh (peer-session spawn for caw-code/test/review/verify when herdr is installed)
│   ├── settings.json        hooks config
│   └── PULL_REQUEST_TEMPLATE.md
├── .agents/skills/          50+ hub skills pulled via skills.sh
├── SKILLS-CATALOG.md        Machine-readable index (auto-generated)
├── skills-lock.json         Lockfile for hub skills
├── scripts/
│   ├── caw.sh               CLI dispatcher
│   ├── init.sh              scaffold a project
│   ├── upgrade.sh           sync templates into existing project
│   ├── remove.sh            unscaffold
│   ├── generate-catalog.sh  regenerate SKILLS-CATALOG.md
│   ├── generate-catalog.py  catalog generator (META + parser)
│   └── hooks/               pre-commit, secret-scan, etc.
├── docs/CONCEPT.md          Architecture design doc
├── CHANGELOG.md             Release notes
└── CLAUDE.md                Caw repo's own context for Claude
```

---

## Task File Format

When scaffolded, each task lives at `.claude/conductor/tasks/<task-id>/`:

| File             | Owner    | Purpose                                                |
| ---------------- | -------- | ------------------------------------------------------ |
| `overview.yaml`  | all      | State — status, lane, phase status, files generated   |
| `plan.md`        | planner  | Spec + API contract + phases + challenge + revisions   |
| `code.md`        | coder    | Files changed per phase                                |
| `tests.md`       | tester   | Tests written, coverage                                |
| `review.md`      | reviewer | Findings by severity                                   |

The Plan is a **living document** — reviewer may amend it (with `## Revisions` audit trail) when CRITICAL/HIGH findings require plan changes.

### Harness contract — project-level living docs

Beyond per-task files, three docs persist across all tasks in a project. Agents
follow a **pull-then-push** contract (`rules/common/harness-contract.md`): read
them before working, update them after.

| Doc                                | Maintained by                                          |
| ----------------------------------- | ------------------------------------------------------ |
| `.claude/conductor/decisions/`      | planner + coder create ADRs on trigger; reviewer enforces |
| `.claude/conductor/test-matrix.md`  | tester writes coverage rows; reviewer advances status  |
| `.claude/conductor/harness-backlog.md` | any agent appends on hitting process friction       |

The harness grows from friction — a missing rule, an ambiguous template, or a
recurring failure becomes a backlog item the maintainer ports back into caw.

---

## Hooks

Pre-commit secret scanning (gitleaks) is **mandatory** — installed automatically. Other hooks gated by `CAW_HOOK_PROFILE` env var:

| Profile    | Behavior                                            |
| ---------- | --------------------------------------------------- |
| `minimal`  | No hooks                                            |
| `standard` | post-edit-accumulator, session-summary, stop-format-typecheck, context-load-logger (`.claude/logs/context-loaded-<session>.log` — which rules/skills each agent loaded) |
| `strict`   | standard + prompt-injection-detector (destructive-command blocking is `permissions.deny`, not a hook) |

---

## Documentation

- [docs/CONCEPT.md](docs/CONCEPT.md) — architecture design doc
- [SKILLS-CATALOG.md](SKILLS-CATALOG.md) — full skill catalog (57 skills)
- [SKILLS-CHECKLIST.md](SKILLS-CHECKLIST.md) — skill source breakdown + coverage by platform
- [CHANGELOG.md](CHANGELOG.md) — release notes
- [CLAUDE.md](CLAUDE.md) — caw repo's own Claude Code context

---

## License

MIT
