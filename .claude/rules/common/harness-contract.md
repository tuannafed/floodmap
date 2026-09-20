# Harness Contract — the always-on core

Loaded in every session and every agent (no `paths:`) — the single source; other rules point here instead of restating. Per-artifact obligations live in `plan-discipline.md`, `code-discipline.md`, `test-discipline.md`, `review-discipline.md`, each auto-loading on **read or edit** of its artifact, via the **Read tool** (or Edit) only — a file opened through Bash `cat`/`grep`/`sed` never loads its rule (measured 2026-09-08: the coder read every task file through `cat` and received no rule at all). `Write` of a new file (or a Bash write) never triggers a rule either — an agent `Read`s its discipline file itself when the artifact isn't on disk yet (planner/reviewer always; coder/tester on the first run).

## Who writes what

| File | Writer | Rule |
|---|---|---|
| `tasks/<id>/overview.yaml` | planner creates; coder/tester/reviewer update their status keys | **pure YAML**, never Markdown |
| `tasks/<id>/plan.md` | planner; reviewer appends `## Revisions` and `review-fixes-<N>` phases | living document |
| `tasks/<id>/code.md` | coder, one section per phase | |
| `tasks/<id>/tests.md` | tester | |
| `tasks/<id>/review.md` | reviewer | |
| `tasks/<id>/verify.md` | `/caw-run` leader (Stage 3) | |
| `tasks/<id>/leader.md` | `/caw-run` leader | per stage |
| `tasks/<id>/test-matrix.md` | tester (rows); reviewer advances `Status` | one row per behavior |
| `conductor/test-matrix.md` | tester | **one index row per task** |
| `conductor/decisions/NNNN-<slug>.md` + its `README.md` index row | planner / coder, **same turn** | no index row ⇒ MEDIUM |
| `conductor/knowledge.md` | coder (triggers in the file's own header) | missing qualifying entry ⇒ MEDIUM |
| `conductor/pipeline-postmortems.md` + summary-table row | whoever hot-fixes a deployed defect, **in the same change** | Do not write incident counts into a rule file — count the log. Fill `Hub target`/`Upstreamed` if hub-owned — synced same as HB (`PM-<id>`). |
| `conductor/harness-backlog.md` index; `tasks/<id>/harness.md` or `conductor/harness-backlog-misc.md` detail | any agent hitting friction | HB protocol below |

**A push is a file on disk** — re-read after writing any task file, confirm non-empty before reporting. **Index cells are one sentence** (≈200 chars + link); prose goes in the linked detail file.

## Task status

Top-level `status` in `overview.yaml` (source of truth: `agents/planner.md` § Field rules):

```
pending → plan-done → coding → code-done → testing
  → { red-done, tests-done, tests-skipped }
  → reviewing → { review-done, review-blocked, needs-rework }
needs-rework → coding · review-blocked → coding (after a review-fixes-N phase)
(any) → blocked                       (human intervention)
review-done → done                    HUMAN only, after the commit/PR lands
(any) → closed | deferred             HUMAN only — row in backlog.md's `## Closed` section
```

`verify-done` and the extended `phases[].status` values are project-defined, not written by any command in this hub — see `agents/planner.md` § Field rules.

`phases[].status`: `pending → {done, blocked, needs-rework}`, `needs-rework → pending`. Self-verify gate (type-check/lint) failed → `blocked`, never `done` until it passes.

## Pull depth by lane

`tiny`: `overview.yaml` + `plan.md` + ADRs touching the area; no test-matrix. `standard`: full agent-prompt pull list. `risky`: full list + scan `decisions/` for `Status: Proposed`.

## ADRs

Create one when: a `## Challenge` HIGH item needs an architecture choice; rejecting an apparent default (hard- vs soft-delete, one query lib over another); the choice outlives this task; validation is weakened/removed; a stack, library or provider is selected. Not for naming, file placement, or anything `conventions.md` already decides. Filename `NNNN-<slug>.md`, `NNNN` = highest existing + 1 — re-read `decisions/` right before writing, never cache. Missing ADR for a change in **auth, data integrity, external contracts or public API** → CRITICAL; any other architecture change → HIGH.

**Concurrent-planning numbering collisions are expected, not a bug to prevent at write time** — `planner` has no `Bash` tool to take a lock, so two `/caw-plan` peers in the same turn can both claim `NNNN+1`. Re-reading harder does not close this window; do not add retries/backoff. The **leader** detects and resolves it once, in its own verification pass — see `leader-known-patterns.md` § ADR numbering collisions.

**Same race for any task file two concurrently-launched roles could both first-create, not only ADRs** — `code.md`, `test-matrix.md`, etc. don't exist yet at phase start; a sibling role's `Write` can create it first, and a bare `Write` then silently destroys their content (no git history if uncommitted). Confirmed live twice: HB-018 (coder's `Write` on `code.md` destroyed 4 phases' write-ups), HB-020 (tester's `Write` on `test-matrix.md` destroyed a reviewer's table). Re-`Read` immediately before creating such a file, `Write` only if still absent — mitigation: `code-discipline.md`, `test-discipline.md`.

## Harness-backlog protocol (HB)

`harness-backlog.md` is an **index** — a queue, not a log, not a bug tracker. Every `## Items` row has a unique `HB-NNN` id (next after the highest existing — re-read the file first), one sentence, a `target` (the hub file, or `project`), an `upstreamed` column (`—` until a hub commit lands), and a link to the write-up in `tasks/<id>/harness.md` (from `templates/task-harness.md`, same split as `test-matrix.md`) or `harness-backlog-misc.md` when no single task owns it. A row without an id is not a backlog item — the reviewer assigns one before approving. Resolved rows keep their id, collapsed to one line under `## Resolved`. Product bugs do not go here — they go to `backlog.md`. Maintainer triage reads rows whose `target` ≠ `project`, ports, fills `upstreamed`.

## Claims — verify before you write or say it

```
NO SPECIFIC CLAIM ABOUT CODE — in a task file, an ADR, or a reply to the user —
WITHOUT THE GREP OR READ THAT PRODUCED IT, RUN IN THIS TURN.
```

A specific claim is anything a reader could falsify by opening a file: a symbol, `file:line`, a count, "nothing else does X" — recalling it from earlier doesn't count, re-verify at write time. Every number names the command that produced it and whether it measures the claim (occurrences vs lines; generated files in/out). **Bad news gets the strictest check, not the fastest**: before "data is lost" / "this is a regression", run the one command that would show the opposite and say what you checked. A correction is a claim too. Grep blind spots — list/correction protocol: `review-discipline.md` §A–C; enumerate-before-hypothesis: `plan-discipline.md` §2.

## Skill loading

Before real work, call `Skill({skill: "<name>"})` for every needed skill — parallel, then wait — none extra: skills run thousands of lines. Restate in one line which are active; naming one without calling the tool is a reporting failure (`none — <step> skipped` + why). On failed load: caw-owned skill missing (broken symlink/moved repo) → **Hard stop**, tell user to run `/caw-setup --refresh`; a `skills_hint` hub skill missing → abort phase: `❌ Skill <name> referenced but not installed. Run /caw-setup --add <name>.` — never auto-install; optional skill missing → `⚠️ <skill> unavailable — proceeding degraded`, note in task file, continue.

## Model pinning

`agents/*.md` pin `model: sonnet` — never `model: inherit`, which copies the calling session's own `[1m]` extended-context variant and requires "usage credits" for every subagent spawn (docs/AUDIT-2026-09-03.md §9). Pinning is necessary but not sufficient: the gate keys on the *calling session's* `[1m]` mode, not the spawned agent's `model:` field (2026-09-10, a real project, §9). Hitting it at spawn: enable usage credits, switch the session off `[1m]` via `/model`, or use herdr peer mode (a fresh `claude` process, exempt). A mid-task failure with this error is structural and identical on retry — do not retry it; stop and surface to the user.

## Artifact gate

Before reporting a phase/pass-fail/verdict, the agent's own task file (`code.md`/`tests.md`/`review.md`) must exist **on disk** with this turn's content — a hard gate, not a courtesy check, never satisfied by content in your reply (the orchestrator consumes and discards final text; only the file persists for the next agent). After writing, **re-read it from disk** and confirm it is present, non-empty, and carries what you are about to report, before continuing. If the write genuinely fails, say so and stop — never report success. This is exactly the failure a project's artifact-gate CI script (if any) exists to catch.

**Spec traceability is the keystone rule** — without it every other guardrail (ADRs, matrix, review) operates on a fabricated foundation. Rule/template/examples: `plan-discipline.md` §1. Severities: `review-discipline.md` § Enforcement.
