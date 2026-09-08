# Test Matrix — Index

This file is the **project-wide index** of test coverage. It holds **one row per
task**, not per behavior. The detailed behavior-level rows live with each task,
in `tasks/<task-id>/test-matrix.md`.

This split keeps the index small and cheap to load no matter how many tasks the
project accumulates — agents read this file for the overview, and only open a
task's own matrix when they work on that task.

## Status values

| Status        | Meaning                                                  |
| ------------- | -------------------------------------------------------- |
| `planned`     | Accepted as intended behavior, not yet implemented       |
| `in_progress` | Actively being built                                     |
| `implemented` | Implemented and proof exists                             |
| `changed`     | Contract changed after an earlier implementation         |
| `retired`     | No longer part of the product contract                   |

## Index

One row per task. `Behaviors` is a count; `Status` is the lowest status across
the task's behaviors (a task is not `implemented` until every behavior is).

| Task | Behaviors | Status | Last validated | Detail |
| ---- | --------- | ------ | -------------- | ------ |
| _task-NNN_ | 0 | planned | — | `tasks/task-NNN/test-matrix.md` |

## Rules

See `.claude/rules/common/test-discipline.md` §4 — this file is the index: one row per task, never behavior rows.
