---
model: sonnet
---

Run the planning workflow: $ARGUMENTS

## Instructions

`$ARGUMENTS` is a free-text description of the feature/bug/chore/refactor.

### Prerequisite check

Verify `.claude/skill-map.yaml` exists. If not:

```
❌ Project not set up. Run /caw-setup first.
```

### Delegate to planner agent

Spawn the **planner** agent: `"Run the planning flow for: <description>"`

Planner agent will:
1. Detect task type (feature/bug/chore/refactor)
2. Determine the task `lane` (tiny/standard/risky) — drives test behavior + pull depth
3. Load product/PM skills scaled to type/lane (chore/tiny/simple-bug: `create-specification` only; feature/multi-phase: `create-specification` + `user-story`; the other PM skills load only on their escalation triggers) — avoids loading ~2600 lines of PRD/roadmap skill content for a single-task plan
4. Write spec, API contract, phases (with test_scenarios + skills_hint), challenge section
5. Verify all `skills_hint` reference installed skills (warn if missing)
6. Output `.claude/conductor/tasks/<task-id>/plan.md` + `overview.yaml`

After planning, next step depends on `lane`:
- `lane: risky` → `/caw-test <task-id>` (red mode, write failing tests first)
- `lane: standard` or `tiny` → `/caw-code <task-id>` (start coding)
