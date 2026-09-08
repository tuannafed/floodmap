# Harness Contract — the always-on core

Loaded in every session and inside every agent (no `paths:`). Everything here is the single source — agent prompts and the other rules point here instead of restating. Per-artifact obligations live in `plan-discipline.md`, `code-discipline.md`, `test-discipline.md`, `review-discipline.md`: each auto-loads when you **read or edit** its artifact. A `Write` of a new file or a Bash write never triggers a rule, so an agent `Read`s its discipline file itself exactly when its artifact is not on disk yet (planner always; coder/tester on the first phase/run; reviewer always).

## Who writes what

| File | Writer | Rule |
|---|---|---|
| `tasks/<id>/overview.yaml` | planner creates; coder/tester/reviewer update their status keys | **pure YAML**, never Markdown |
| `tasks/<id>/plan.md` | planner; reviewer appends `## Revisions` and `review-fixes-<N>` phases | living document |
| `tasks/<id>/code.md` | coder, one section per phase | |
| `tasks/<id>/tests.md` | tester | |
| `tasks/<id>/review.md` | reviewer | |
| `tasks/<id>/verify.md` | `/caw-verify` orchestrator | |
| `tasks/<id>/test-matrix.md` | tester (rows); reviewer advances `Status` | one row per behavior |
| `conductor/test-matrix.md` | tester | **one index row per task** |
| `conductor/decisions/NNNN-<slug>.md` + its `README.md` index row | planner / coder, **same turn** | no index row ⇒ MEDIUM |
| `conductor/knowledge.md` | coder (triggers in the file's own header) | missing qualifying entry ⇒ MEDIUM |
| `conductor/pipeline-postmortems.md` + summary-table row | whoever hot-fixes a deployed defect, **in the same change** | Do not write incident counts into a rule file — count the log |
| `conductor/harness-backlog.md` index; `tasks/<id>/harness.md` or `conductor/backlog-misc.md` detail | any agent hitting friction | HB protocol below |

**A push is a file on disk.** After writing any task file, re-read it and confirm it is non-empty before reporting. **Index cells are one sentence** (≈200 chars + link); prose goes in the linked detail file.

## Task status

Top-level `status` in `overview.yaml` (source of truth: `agents/planner.md` § Field rules):

```
pending → plan-done → coding → code-done → testing
  → { red-done, tests-done, tests-skipped }
  → reviewing → { review-done, review-blocked, needs-rework }
needs-rework → coding · review-blocked → coding (after a review-fixes-N phase)
(any) → blocked                       (human intervention)
review-done → done                    HUMAN only, after the commit/PR lands
(any) → closed | deferred             HUMAN only — row in closed-tasks.md
```

`phases[].status`: `pending → { done, blocked, needs-rework }`, `needs-rework → pending`. A phase whose self-verify gate (type-check / lint) failed is `blocked` — never `done` until it passes.

## Pull depth by lane

`tiny`: `overview.yaml` + `plan.md` + ADRs for the touched area; no test-matrix file. `standard`: your agent prompt's full pull list. `risky`: full list, plus scan `decisions/` for ADRs with `Status: Proposed`.

## ADRs

Create one when: a `## Challenge` HIGH item needs an architecture choice; an agent rejects an apparent default (hard- vs soft-delete, one query library over another); the choice outlives this task; validation is weakened or removed; a stack, library or provider is selected. Not for naming, within-task file placement, or anything `conventions.md` already decides. Filename `NNNN-<slug>.md`, `NNNN` = highest existing + 1 — re-read `decisions/` right before writing, never cache. Missing ADR for a change in **auth, data integrity, external contracts or public API** → CRITICAL; any other architecture change → HIGH.

## Harness-backlog protocol (HB)

`harness-backlog.md` is an **index** — a queue, not a log, not a bug tracker. Every `## Items` row has a unique `HB-NNN` id (next after the highest existing — re-read the file first), one sentence, a `target` (the hub file the fix belongs in, or `project`), an `upstreamed` column (`—` until a hub commit lands) and a link to the write-up in `tasks/<id>/harness.md` (or `backlog-misc.md` when no single task owns it). A row without an id is not a backlog item — the reviewer assigns one before approving. Resolved rows keep their id and collapse to one line under `## Resolved`. Product bugs do not go here — they go to `backlog.md`. Maintainer triage reads rows whose `target` ≠ `project`, ports them, fills `upstreamed`.

## Claims — verify before you write or say it

```
NO SPECIFIC CLAIM ABOUT CODE — in a task file, an ADR, or a reply to the user —
WITHOUT THE GREP OR READ THAT PRODUCED IT, RUN IN THIS TURN.
```

A specific claim is anything a reader could falsify by opening a file: a symbol, a `file:line`, a count, "nothing else does X". Recalling it from earlier does not count — re-verify at write time. Every number names the command that produced it and whether it measures the claim (occurrences vs lines; generated files in or out). **Bad news gets the strictest check, not the fastest**: before "data is lost" / "this is a regression", run the one command that would show the opposite and say what you checked. A correction is a claim too. Grep has blind spots — list and correction protocol: `review-discipline.md` §A–C; enumerate-before-hypothesis is `plan-discipline.md` §2.

## Skill loading

Before real work, call `Skill({skill: "<name>"})` for every skill the step needs — in parallel, then wait — and for none it doesn't: skills are thousands of lines, "load all just in case" is a violation. Restate in one line which skills are active. Naming a skill in a task file without having called the tool is a reporting failure — write `none — <step> skipped` and why. On a failed load: a caw-owned skill missing (broken symlink, caw repo moved) → **Hard stop**, tell the user to run `/caw-setup --refresh`; a hub skill named in `skills_hint` missing → abort the phase with `❌ Skill <name> referenced but not installed. Run /caw-setup --add <name>.` — never auto-install; an optional skill missing → `⚠️ <skill> unavailable — proceeding degraded`, note it in the task file, continue.

**Spec traceability is the keystone rule:** without it every other guardrail (ADRs, matrix, review) operates on a fabricated foundation. Rule, template and examples: `plan-discipline.md` §1. Severities: `review-discipline.md` § Enforcement.
