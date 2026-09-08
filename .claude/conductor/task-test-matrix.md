# Test Matrix — {{TASK_ID}}

> Template. The **tester** creates `tasks/<task-id>/test-matrix.md` from this on
> the first test run for the task, then keeps it current. The behavior-level
> coverage detail lives here; the project-wide `conductor/test-matrix.md` keeps
> only a one-line index row for this task.

## Behaviors

One row per behavior — a behavior is an acceptance criterion from the Plan's
`test_scenarios`. `Unit` / `Integration` / `E2E` are `yes` only when a test for
that layer ran and passed.

| Behavior | Unit | Integration | E2E | Status | Last validated | Evidence |
| -------- | ---- | ----------- | --- | ------ | -------------- | -------- |
| _what the behavior is_ | no | no | no | planned | — | _none_ |

## Rules

See `.claude/rules/common/test-discipline.md` §4 — one row per `test_scenario`, not per test case.
