# Tasks Registry

| Status | ID  | Title | Type | Lane | Stage | Created | Updated |
| ------ | --- | ----- | ---- | ---- | ----- | ------- | ------- |

<!--
Status symbols:
  [ ] pending     — Plan not yet written
  [~] in-progress — at least one stage has started
  [x] done        — reviewer approved (0 open findings)

Task types:
  feature  — new functionality
  bug      — fix existing issue
  chore    — maintenance, config, dependencies
  refactor — code improvement, no behavior change

Lanes (set by planner from blast radius — see agents/planner.md § Lane): tiny / standard / risky

Stages:
  plan / coding / testing / review / blocked / done

Who writes here (this table is NOT the live status board — that is
`/caw-status`, which reads every tasks/<id>/overview.yaml directly):
  - reviewer: adds a `[ ]` row for a pre-existing problem it found OUTSIDE the
    task's diff (never fixed in-task; see agents/reviewer.md Step 3)
  - humans: add rows for work that is decided but not yet planned
  - planner: only READS this file, to reject an id or scope that already exists

Example row:
  | [ ] | task-001-auth | User Authentication | feature | standard | plan | 2026-05-11 | 2026-05-11 |

A row becomes a real task when someone runs /caw-plan on it — flip it to [~]
then, and to [x] (or move it to closed-tasks.md) when the task ends.
-->
