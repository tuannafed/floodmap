# Claude Agent Workflow (caw)

> Skill-first agent pipeline for any project. 5 generic agents + 85 auto-discovered skills. Runs natively in Claude Code.

---

## What is this?

A **template hub** that scaffolds a `Plan → Code → Test → Review` agent pipeline into any project. Agents are stack-agnostic workflow primitives; all domain/framework knowledge lives in skills, loaded on demand. Each feature/bug/chore becomes a **task** with structured handoff between stages, verified by a leader that never trusts a peer's self-report.

---

## Features

| Area                                 | What it does                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Skill-first agents**               | 5 fixed agents (`setup`, `planner`, `coder`, `tester`, `reviewer`) — no per-framework specialists. Domain knowledge comes from 85 auto-discovered skills (18 caw-owned + 67 hub-curated), loaded per-phase via `skills_hint`.                                                                                                                                                                                                                  |
| **Leader verification**              | Every peer's claim is re-checked, never trusted at face value: the leader re-reads artifacts, re-greps cited `file:line`s, and re-runs lint/type-check/tests itself. A failing check sends `FIX ROUND n/3` back to the _same_ peer; round 3 still failing stops and asks the user.                                                                                                                                                             |
| **Lane-driven testing**              | `planner` sets `lane: tiny \| standard \| risky` from risk flags; `tester` derives its test mode from it — no separate TDD flag to keep in sync.                                                                                                                                                                                                                                                                                               |
| **Severity-based review**            | Any open finding blocks the commit. Reviewer appends a `review-fixes-<N>` phase; coder fixes, tester re-runs, reviewer re-reviews — repeat until zero open findings.                                                                                                                                                                                                                                                                           |
| **herdr peer sessions** _(optional)_ | Each role can run as a fully isolated `claude` process in its own terminal tab instead of an in-process subagent — separate context budget per peer. Falls back to subagents automatically when `herdr` isn't installed.                                                                                                                                                                                                                       |
| **Non-destructive upgrades**         | `caw upgrade` is manifest-based (sha256 per file) — a project's local edits are kept, never silently overwritten. `caw drift` shows what to port hub-ward before upgrading.                                                                                                                                                                                                                                                                    |
| **Project → hub feedback loop**      | Agents log friction to `harness-backlog.md`; severe defects that passed the full pipeline go to `pipeline-postmortems.md`. `sync-hb-to-hub.sh` auto-pushes open, hub-targeted rows from both (marked `HB-NNN` / `PM-<id>`) into the hub's `docs/hb-inbox.md` when a task reaches `done`; `harness-backlogs.sh` / `eval-gaps.sh` are the maintainer-invoked pull-side equivalents. All advisory — none of them edit hub files or run git there. |
| **Agent-prompt evals**               | `evals/` (promptfoo + Claude Agent SDK) runs real agents against fixture projects and asserts on actual tool calls/files written. Cases are seeded only from real incidents, never hypothetical.                                                                                                                                                                                                                                               |
| **Backlog viewer** _(optional)_      | Astro + React + shadcn Kanban UI over `.claude/conductor/tasks/`, plus a Docs tab for any standalone HTML doc.                                                                                                                                                                                                                                                                                                                                 |
| **Hygiene by default**               | Pre-commit secret scanning (gitleaks) is mandatory. Destructive commands are blocked via `permissions.deny`, not a hook. Other hooks are opt-in via `CAW_HOOK_PROFILE`.                                                                                                                                                                                                                                                                        |

---

## Getting started

Every step below is either a **terminal** command (your shell) or a **Claude Code** command (typed into a Claude Code session, prefixed `/`) — the two never mix in the same block.

**1. Clone this repo** — _terminal_

```bash
git clone https://github.com/tuannafed/caw.git
cd caw
```

**2. Install caw** — _terminal_

```bash
./setup.sh                        # installs the `caw` alias; --with-herdr / --with-ghostty optional
source ~/.zshrc
```

**3. Scaffold your project** — _terminal_

```bash
caw init ~/Projects/my-app        # scaffold agents/commands/rules/hooks into .claude/
```

**4. Set up + run the pipeline** — _Claude Code, opened inside `~/Projects/my-app`_

```
/init                              # Claude Code built-in — writes CLAUDE.md
/caw-setup                         # detect stack → install skills → write conventions.md

/caw-run "<feature description>"   # plan → code → verify in one command
                                    # (asks "Lên plan?" then "Code?"; re-verifies every stage itself)
```

Or drive each stage yourself — still inside the Claude Code session:

```
/caw-plan "<description>"          # spec + API contract + phases + challenge
/caw-code <task-id> --all          # implement every phase (parallel where the Plan allows)
/caw-test <task-id>                # tests, mode derived from the Plan's lane
/caw-review <task-id>              # multi-dimension review with severity findings
/caw-status [<task-id>]            # check task state
```

`/caw-run <task-id>` resumes an in-progress task from wherever `overview.yaml` says it stopped.

### Prerequisites

| Tool             | Required | Install                                                                      |
| ---------------- | -------- | ---------------------------------------------------------------------------- |
| **Claude Code**  | Yes      | [claude.ai/code](https://claude.ai/code)                                     |
| **Git**          | Yes      | `brew install git`                                                           |
| **Node.js** ≥ 18 | Yes      | `brew install node`                                                          |
| **bash** ≥ 4     | Yes      | `brew install bash` _(macOS default is 3.2)_                                 |
| **gitleaks**     | Yes      | `brew install gitleaks` _(secret scanning, mandatory)_                       |
| **herdr**        | Optional | `./setup.sh --with-herdr` or `brew install herdr` _(isolated peer sessions)_ |
| **Ghostty**      | Optional | `./setup.sh --with-ghostty` _(the terminal herdr runs in)_                   |

### Maintaining a scaffolded project

```bash
caw upgrade <project>            # sync latest agents/commands/rules/hooks (keeps local edits)
caw upgrade <project> --dry-run  # preview
caw upgrade <project> --force    # overwrite local edits too (backed up to .claude/.caw-backup/)
caw drift <project>              # what the project changed vs the hub — run before upgrading
caw remove <project>             # unscaffold
```

### Backlog viewer

`caw init` offers to copy the Kanban UI into `<project>/.claude/backlog-viewer/`:

```bash
cd <project>/.claude/backlog-viewer
pnpm install
CAW_PROJECT_ROOT="$(pwd)/../.." pnpm dev   # http://localhost:4321
```

---

## Architecture

### Stages & agents

| Stage                  | Agent      | Role                                                                                  |
| ---------------------- | ---------- | ------------------------------------------------------------------------------------- |
| Bootstrap _(one-time)_ | `setup`    | Detect stack, install skills, generate `conventions.md` + `skill-map.yaml`            |
| Plan                   | `planner`  | Spec, API contract, phases + `test_scenarios` + `skills_hint`, self-challenge, lane   |
| Code                   | `coder`    | Implement one phase at a time, loading skills via `skills_hint`                       |
| Test                   | `tester`   | Lane-driven tests — `tiny`=skip, `standard`=full, `risky`=red-then-green              |
| Review                 | `reviewer` | Multi-dimension review (security/perf/a11y/refactor/architecture), may amend the Plan |

### Commands

| Command       | Action                                                                                              |
| ------------- | --------------------------------------------------------------------------------------------------- |
| `/caw-setup`  | Detect stack, install skills, write conventions                                                     |
| `/caw-plan`   | Generate a Plan from a description                                                                  |
| `/caw-code`   | Implement one phase (`--all` for every phase)                                                       |
| `/caw-test`   | Tests, mode derived from the Plan's lane                                                            |
| `/caw-review` | Multi-dimension review                                                                              |
| `/caw-status` | Show task state                                                                                     |
| `/caw-run`    | Leader loop: intake → plan → code → verify (test + review in parallel; no standalone `/caw-verify`) |

### In-process subagent vs. herdr peer

Every stage runs one of two ways, chosen automatically:

- **In-process subagent** _(default)_ — via Claude Code's own Agent tool, inside the caller's context.
- **herdr peer session** _(when `herdr` is on `PATH`)_ — a separate `claude` process in its own tab, own isolated context. `/caw-run`'s verify stage fans out tester + reviewer as two peers in parallel.

Either way, the invoking session is the **leader**: it re-verifies every stage per `rules/common/leader-discipline.md` rather than trusting a peer's report, and closes peer tabs only once their stage is verified.

### Lane → test behavior

| Lane       | Triggers                                | Test behavior                                   |
| ---------- | --------------------------------------- | ----------------------------------------------- |
| `tiny`     | Chore, simple refactor, low-risk bug    | No tests — manual verify                        |
| `standard` | Normal feature, medium-risk bug         | Tests after implementation (backend + frontend) |
| `risky`    | Security, payment, auth, data migration | Red-first on every phase, then green            |

---

## Skills

| Source             | Location                           | Purpose                                                                   |
| ------------------ | ---------------------------------- | ------------------------------------------------------------------------- |
| **Caw-owned** (18) | `templates/skills/<name>/SKILL.md` | Workflow / archetype / convention skills caw can't delegate               |
| **Hub** (67)       | `.agents/skills/<name>/SKILL.md`   | Framework / library expertise, pulled via [skills.sh](https://skills.sh/) |

Priority: prefer a hub skill when one covers the topic; a caw-owned skill exists only when nothing authoritative does. `caw init` ships no skills — `/caw-setup` detects the stack (JS/TS, Python, Go, Rust, Java, Swift) via `SKILLS-CATALOG.md`, symlinks matched caw-owned skills straight from `$CAW_HOME` (no copy), and asks before pulling any hub skill. See [SKILLS-CATALOG.md](SKILLS-CATALOG.md) for the full list and `CLAUDE.md` § Adding a New Skill for the contributor workflow.

---

## Repository layout

```
caw repo/
├── agents/                  5 agent definitions (setup, planner, coder, tester, reviewer)
├── commands/                7 command files
├── rules/                   Non-overridable rules — harness-contract always loaded, rest by `paths:` glob
│   ├── common/               12 files (harness-contract, plan/code/test/review-discipline,
│   │                          migration-safety, test-tiers, coding-standards, agent-memory,
│   │                          leader-discipline, leader-known-patterns, plugin-skill-fallback)
│   ├── react/                react-state-deps
│   └── typescript/           TS/JS style
├── templates/
│   ├── skills/               18 caw-owned skills
│   ├── scripts/               project-side helpers (caw-status.sh, spawn-herdr-peer.sh,
│   │                          sync-hb-to-hub.sh, check-stack-drift.sh)
│   └── settings.json         hooks + permissions config
├── .agents/skills/           67 hub skills, pulled via skills.sh
├── scripts/                  Public lifecycle CLI (caw/init/upgrade/drift/remove)
│   ├── checks/               deterministic repository guards
│   ├── data/                 registries and checker fixtures
│   ├── discovery/            stack/project discovery
│   ├── generators/           catalog and project metadata generation
│   ├── hooks/                Claude Code hook implementations
│   ├── lib/                  shared Python modules
│   ├── scans/                advisory cross-project reports
│   └── tests/                deterministic and live-smoke fixtures
├── evals/                    Agent-prompt regression cases (hub-only, not shipped to projects)
├── docs/                     CONCEPT.md (architecture) + hb-inbox.md (auto-synced triage inbox)
├── SKILLS-CATALOG.md         Machine-readable skill index (auto-generated)
├── CHANGELOG.md              Release notes
└── CLAUDE.md                 Caw repo's own Claude Code context
```

---

## Task files & the harness-backlog / postmortem loop

Each scaffolded task lives at `.claude/conductor/tasks/<task-id>/`:

| File            | Owner    | Purpose                                                                         |
| --------------- | -------- | ------------------------------------------------------------------------------- |
| `overview.yaml` | all      | State — status, lane, phase status                                              |
| `plan.md`       | planner  | Spec + API contract + phases + challenge (a living doc — reviewer may amend it) |
| `code.md`       | coder    | Files changed, per phase                                                        |
| `tests.md`      | tester   | Tests written, coverage                                                         |
| `review.md`     | reviewer | Findings by severity                                                            |

Beyond per-task files, `.claude/conductor/decisions/` (ADRs), `test-matrix.md`, `harness-backlog.md`, and
`pipeline-postmortems.md` persist across every task in the project. Any agent appends to
`harness-backlog.md` when it hits process friction (a missing rule, an ambiguous template); whoever
hot-fixes a defect that passed the _entire_ pipeline appends to `pipeline-postmortems.md` instead — the
project → hub feedback loop in **Features** above pushes open, hub-targeted rows from both files (not
just harness-backlog.md) into the same inbox. A closed/deferred task's row lives in `backlog.md`'s own
`## Closed` section, not a separate file. Full contract: `rules/common/harness-contract.md`; full design
rationale: [docs/CONCEPT.md](docs/CONCEPT.md).

---

## Hooks

Pre-commit secret scanning (gitleaks) is mandatory and always installed. Everything else is gated by `CAW_HOOK_PROFILE`:

| Profile    | Behavior                                                                           |
| ---------- | ---------------------------------------------------------------------------------- |
| `minimal`  | No hooks                                                                           |
| `standard` | post-edit-accumulator, session-summary, stop-format-typecheck, context-load-logger |
| `strict`   | `standard` + prompt-injection-detector                                             |

---

## Documentation

- [docs/CONCEPT.md](docs/CONCEPT.md) — architecture design doc
- [SKILLS-CATALOG.md](SKILLS-CATALOG.md) — full skill catalog
- [SKILLS-CHECKLIST.md](SKILLS-CHECKLIST.md) — skill source breakdown
- [CHANGELOG.md](CHANGELOG.md) — release notes
- [CLAUDE.md](CLAUDE.md) — caw repo's own Claude Code context

---

## License

MIT
