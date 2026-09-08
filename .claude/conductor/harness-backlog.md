# Harness Backlog

The caw harness grows from friction. When an agent hits a missing rule, an
ambiguous template, repeated manual reasoning, or a recurring failure, it records
the item here instead of silently working around it.

This file is the project's feedback loop into caw itself. The maintainer reviews
it periodically and ports accepted items back into the caw source repo.

**This file is an index.** Each `## Items` row is one sentence plus a link to the
full write-up — `tasks/<id>/harness.md` when the item traces to exactly one
existing task folder, `backlog-misc.md` when it names zero task ids, more than
one, or a task id whose folder no longer exists. It is a **queue, not a log**, and
it is **not for product bugs** — those go to `backlog.md`.

## When to add an item

Any agent (`planner`, `coder`, `tester`, `reviewer`, `setup`) adds an item when
it notices:

- A rule or convention that should exist but doesn't.
- A template field that was missing, so the agent had to improvise.
- The same manual reasoning repeated across tasks.
- A failure pattern that recurs (same class of bug, same broken assumption).
- An instruction another agent will need but the harness never states.

Do not add for one-off task issues — only for friction the **next** task will
also hit.

## Item protocol

1. **Write the detail first** (template below) to `tasks/<id>/harness.md` or
   `backlog-misc.md`.
2. **Then add one row** to the `## Items` table:
   - `id` — `HB-NNN`, the next free number. Re-read this file before assigning;
     never cache a number. **A row without an id is not allowed** — a reviewer
     must not add one, and must assign an id to any it finds.
   - `item` — one sentence (≈200 characters max). Anything longer belongs in the
     detail file; link to it, don't paraphrase it twice.
   - `target` — the hub file this item would change (`rules/common/test-tiers.md`,
     `agents/reviewer.md`, `commands/caw-verify.md`, …), or `project` when the
     fix is project-local only.
   - `status` — `proposed` | `accepted` | `implemented` | `rejected`.
   - `upstreamed` — the hub commit hash once the item has been ported to caw,
     otherwise `—`.
   - `detail` — link to the write-up.
3. When an item reaches `implemented` or `rejected`, **move its row** to
   `## Resolved`, keeping its id, collapsed to one line. The detail entry may be
   deleted (git history retains it).

The maintainer's triage pass reads rows whose `target` ≠ `project`, ports them to
the hub, fills `upstreamed`, and moves them to `## Resolved`.

## Detail template (`tasks/<id>/harness.md` or `backlog-misc.md`)

```md
### HB-NNN <short title>

- **Discovered while:** <task-id / phase that exposed the gap>
- **Pain:** <what was hard, repeated, ambiguous, or unsafe>
- **Suggested improvement:** <what should be added or changed in caw>
- **Risk:** tiny | standard | risky
- **Status:** proposed | accepted | implemented | rejected
```

## Items

| id | item | target | status | upstreamed | detail |
|---|---|---|---|---|---|

_No open backlog items._

## Resolved

_No resolved items yet._
