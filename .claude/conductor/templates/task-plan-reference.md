# plan.md format

> Canonical artifact contract extracted from agents/planner.md to keep the base agent prompt compact. The agent must read this file at the named workflow step.

## plan.md format

```markdown
# Plan: <task-title>

**Task:** task-<NNN>-<slug>
**Type:** feature | bug | chore | refactor
**Lane:** tiny | standard | risky
**Created:** 2026-05-10T15:00
**Planner skills loaded via Skill tool:** create-specification (small path — chore/refactor/simple bug)
<!-- or, for feature / multi-phase: create-specification, user-story [+ any escalation skill whose trigger fired, e.g. user-story-splitting] -->
**Rules read:** project.md (present | absent), plan-discipline.md[, migration-safety.md]
**Postmortems matched:** <ids from pipeline-postmortems.md touching this task's table/module, or `none`>

---

## Spec mandate

<!-- MANDATORY first section — rules/common/plan-discipline.md §1. One entry per phase:
     ✅ SPEC-BACKED   — verbatim quote + `file:line` from the product spec (never a release-plan draft)
     ⚠️ INFRA-CHOICE  — with a one-line "Why infra (not feature)"
     ❌ FABRICATED    — disallowed: find backing, reclassify, or remove the phase
     Deferring a spec item needs a user quote. Reviewer rejects a plan missing this section. -->

| Phase | Class | Spec quote (verbatim) | Source `file:line` |
|---|---|---|---|

## Spec

**Problem:** ...
**Solution:** ...
**Scope:**
  - In: [...]
  - Out: [...]

## API Contract

[Endpoints with auth/request/response/errors]

## Plan

\`\`\`yaml
phases:
  - id: db
    description: "..."
    test_scenarios: ["..."]
    skills_hint: [...]
    depends_on: []
    blocks_deploy_of: [backend]   # optional — must be live on the target env before these phases deploy

  - id: backend
    description: "..."
    test_scenarios: ["..."]
    skills_hint: [...]
    depends_on: [db]

  # ... etc

parallelization_groups:
  - [db]
  - [backend, frontend-skeleton]
  - [frontend-impl]
  - [integrate]

missing_skills: []  # populated if any skills_hint references uninstalled skill
\`\`\`

## Consumers

<!-- MANDATORY for any bug/refactor touching a shared file or concept (Step 4b).
     Pasted grep output, not a summary. Omit the section only for a task that
     touches no shared file/concept — and say so in the Checklist. -->

\`\`\`
$ grep -n "^export " src/lib/normalize-host.ts
12:export function normalizeHost(...)
$ grep -rl "normalizeHost\|host_normalized" --exclude-dir=node_modules .
apps/api/src/ingest/worker.ts
apps/api/src/reports/by-host.ts
scripts/backfill-hosts.ts
\`\`\`

| Consumer | Status | Note |
|---|---|---|
| apps/api/src/ingest/worker.ts | cut-over | phase backend |
| apps/api/src/reports/by-host.ts | on-hold | follow-up task-NNN — reads the raw column, dedupe differs |
| scripts/backfill-hosts.ts | unaffected | one-shot script, input already normalized |

## Challenge

### Checklist

| # | Answer |
|---|---|
| 1 placeholder on hot path | n/a — no defaults introduced |
| 2 core-concept scope change | yes — `host_normalized` now lowercased; consumers above |
| 3 write primitive on concurrent path | yes → risk `dup-host`, unique index in db phase |
| 4 sequential → parallel | n/a |
| 5 free-text compared | yes — normalized on write (`normalizeHost`) and on read (index) |
| 6 exemption | no |
| 7 deploy ordering | yes → `blocks_deploy_of: [backend]` on db |
| 8 postmortem match | none |
| 9 side effect after destructive step | n/a |

### Risks

| ID | Severity | Mitigation | Affects | Scenario added (HIGH only) |
|---|---|---|---|---|
| webhook-replay | HIGH | Stripe signature verification + idempotency key | backend | "Replayed webhook with the same event id is a no-op" |

### Gaps

- ...

### ADRs needed

- ADR-NNN: ...

## Revisions

(initial plan - none yet)
```

## Write overview.yaml

After writing `plan.md`, write `overview.yaml`. This is the **state file** — short, structured, the source of truth for task progress. All downstream agents (coder, tester, reviewer) read/write this file to coordinate phase execution.

```yaml
id: task-NNN-slug
title: <Task title>
status: plan-done
lane: <tiny|standard|risky>
type: <feature|bug|chore|refactor>
next_phase: db   # or whichever is first in parallelization_groups
created: 2026-05-12T10:30:00+07:00
updated: 2026-05-12T10:30:00+07:00
related_tasks: []   # optional — open tasks touching the same table/column/module (Step 1)

phases:
  - id: db
    status: pending
    files: prisma/schema.prisma
    depends_on: []
    skills_hint: [prisma-client-api]
    blocks_deploy_of: [backend]   # optional — this phase must be live on the target env before `backend` deploys
    started_at:                   # optional, ISO-8601 — set by the agent when this phase leaves `pending`
    completed_at:                 # optional, ISO-8601 — set by the agent when this phase reaches a terminal status
  - id: backend
    status: pending
    files: src/modules/users/users.service.ts
    depends_on: [db]
    skills_hint: [nestjs-best-practices]
  - id: frontend
    status: pending
    files: apps/web/app/users/page.tsx
    depends_on: [backend]
    skills_hint: [next-best-practices]
  - id: integrate
    status: pending
    files: tests/e2e/users.spec.ts
    depends_on: [frontend]
    skills_hint: [webapp-testing]
```

**`overview.yaml` is pure YAML — never Markdown.** It is parsed by the backlog
viewer as a YAML document. The whole file MUST parse as valid YAML:
- **No Markdown headings** (`## ...`), **no `---` separators**, **no bold**
  (`**text**`), no free prose outside a YAML value.
- Prose belongs in the `.md` files (`plan.md`, `code.md`, `tests.md`,
  `review.md`) — never appended to `overview.yaml`.
- A multi-line value MUST use a YAML block scalar (`field: |` or `field: >`)
  with every line indented under the key. A bare line like `**Tests:** 5/5`
  breaks the parser ("implicit map key needs a value") and drops the task from
  the board.

**Field rules:**
- Top-level `status` (whole task): one of `pending`, `plan-done`, `coding`,
  `code-done`, `testing`, `red-done`, `tests-done`, `tests-skipped`,
  `reviewing`, `review-done`, `review-blocked`, `needs-rework`, `blocked`,
  `done`, `closed`, `deferred`. (`red-done` = tester finished the red pass of
  lane=risky; `review-blocked` = reviewer found CRITICAL/HIGH. `testing`/
  `reviewing` are optional transient values — agents may jump straight to the
  `*-done` state.) The last three are **set by a human, never by an agent**:
  `done` after the commit/PR lands (the pipeline ends at `review-done`),
  `closed`/`deferred` when a task is dropped or parked — move the row to
  `.claude/conductor/backlog.md`'s `## Closed` section (create the section if
  the project's backlog.md predates it) in the same change.
  **`verify-done`** (extended, optional): a project whose leader renames its own
  Stage-3 terminal marker from `review-done` may write this instead — same
  position in the pipeline (leader's verify pass complete, awaiting human
  commit), not a new stage. No caw command in this hub writes it; recognized
  for compatibility with projects that do.
- `phases[].status` (one phase): one of `pending`, `done`, `needs-rework`,
  `blocked`. A phase is `blocked` when the coder's self-verify gate (type-check /
  lint) failed — it is not `done` until the gate passes.
  **Extended phase statuses (optional, project-defined):** `code-done` (code
  complete, not yet through the full done-gate — distinct from `blocked`, which
  means the gate failed rather than hasn't run), `partial` (started, intentionally
  incomplete for now), `skipped` (not applicable to this task, never started),
  `deferred` (postponed past this task, tracked for later), `dropped`/`superseded`
  (abandoned — dropped with no replacement, or superseded by a different phase/
  approach), `closed` (a human-closed phase, mirroring the top-level state),
  `red-done` (this phase's own TDD red pass complete, `lane: risky`), `planned`
  (alias for `pending`), `accepted-without-run` (a human explicitly waived running
  this phase's own verification). **No caw agent in this hub writes any of
  these today** — `coder.md` only ever sets `done`/`blocked` for a phase. They
  are documented because `templates/scripts/check-overview.py`'s schema check
  accepts them (observed live in a real project's independently-evolved
  workflow, 2026-09-14) and a reviewer/leader reading a task file with one of
  these should not treat it as malformed. Anyone building on top of a specific
  one of these — giving it a defined transition or reviewer behavior, not just
  tolerating it — should propose that as its own change, not assume this list
  grants it.
- `lane`: required. Tester derives its TDD behavior from this — no `tdd_mode` field.
- `created` / `updated`: ISO-8601 with timezone offset — use the timestamp `/caw-plan` passed in its prompt (you have no Bash; never invent one, never write `T00:00:00`).
- `phases[].depends_on`: empty array if no dependency.
- `phases[].files`: comma-separated string OR YAML list of file paths.
- `phases[].blocks_deploy_of` (optional): list of phase ids whose code must
  NOT be deployed to an environment until this phase's output (migration,
  index, rebuilt artifact) is confirmed applied there. Set on the
  *prerequisite* phase (`rules/common/migration-safety.md`). The coder records
  the applied-evidence in `code.md`; the reviewer blocks a "hotfix bundle"
  that ships both together.
- `related_tasks` (optional, top-level): ids of other open tasks touching the
  same table/column/module. Symmetric — write it into both files (Step 1).
- `phases[].chains_after` (optional): the other task's id this migration-touching
  phase's revision must land after, when `related_tasks` names a task whose own
  phases also touch a migrations directory and that task is not yet `done`
  (`rules/common/migration-safety.md` § (f) — cross-task migration authorship
  race, Challenge question 10). The coder pastes head/drift-check evidence in
  `code.md` before this phase reaches `done`; the reviewer blocks a branched or
  unresolved head.
- `phases[].started_at` / `phases[].completed_at` (optional): ISO-8601 with timezone
  offset, same format as `created`/`updated`. Set `started_at` the first time a
  phase's `status` leaves `pending`; set `completed_at` the write that lands it
  on a terminal status (`done`, `blocked`, `needs-rework`). Absence is valid —
  these are measurement fields, not a required workflow step. Nothing
  validates them; `caw-status.sh` only reads them.

## Output

Files written:
- `.claude/conductor/tasks/<task-id>/overview.yaml`
- `.claude/conductor/tasks/<task-id>/plan.md`
- `.claude/conductor/decisions/<NNNN>-<slug>.md` (one per triggered ADR — harness contract)
- `related_tasks:` in each related open task's `overview.yaml` (Step 1, only when one exists)
- `.claude/conductor/tasks/<task-id>/harness.md` (or `.claude/conductor/harness-backlog-misc.md`) + one `HB-NNN` index row in `.claude/conductor/harness-backlog.md` (only if friction was hit — Step 7b)
