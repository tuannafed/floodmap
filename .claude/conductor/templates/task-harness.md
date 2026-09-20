# Harness Detail — {{TASK_ID}}

> Template. Any agent (`planner`, `coder`, `tester`, `reviewer`, `setup`) creates
> `tasks/<task-id>/harness.md` from this the first time it files a harness-backlog
> item that traces to exactly this one task, then appends further items here as
> they come up. The full write-up lives in this file; `conductor/harness-backlog.md`
> keeps only a one-line index row per item (its `HB-NNN` id, one sentence, status)
> linking back to the matching `### HB-NNN` section below — same split as
> `conductor/test-matrix.md` vs. `tasks/<task-id>/test-matrix.md`.

## Items

One `### HB-NNN <short title>` section per item. The id must match the row it's
linked from in `conductor/harness-backlog.md` — assign it there first (next free
number, re-read before assigning), then use the same id here.

### HB-NNN <short title>

- **Discovered while:** <phase / step that exposed the gap>
- **Pain:** <what was hard, repeated, ambiguous, or unsafe>
- **Suggested improvement:** <what should be added or changed in caw>
- **Risk:** tiny | standard | risky
- **Status:** proposed | accepted | implemented | rejected
