---
description: Implement one phase of a task (or every phase with --all)
model: sonnet
---

Run the coding workflow: $ARGUMENTS

## Instructions

`$ARGUMENTS` formats:
- `<task-id>` → coder runs the next pending phase from `overview.yaml`
- `<task-id> <phase>` → coder runs the specified phase
- `<task-id> --all` → run **all** phases, parallel where the Plan allows

### Prerequisites

1. Verify `.claude/conductor/tasks/<task-id>/plan.md` exists.
   If not: `❌ Task not found. Run /caw-plan first.`
2. Verify each target phase's `depends_on` phases all have status `done`.
3. Verify the target phases' `skills_hint` are all in `.claude/skill-map.yaml`.
   If not: `❌ Skill <name> not installed. Run /caw-setup --add <name>.`

### Doubt-check gate (risky lane only — runs HERE, not inside the coder)

Before spawning the coder for a `risky`-lane phase that carries a **non-trivial
decision** (new/changed branching logic, a cross-module/service boundary, an
invariant the type system can't verify, or irreversible blast radius like a data
migration or public-API change): load the `doubt-check` skill and run its cycle
in THIS session. The skill spawns a fresh-context adversarial reviewer — a
subagent cannot spawn subagents, so it must never be loaded inside the coder
itself. Skip entirely for `tiny`/`standard` lanes and decision-free phases.

### Delegate to an agent (herdr peer, or Agent tool fallback)

`command -v herdr` is checked once per command run:

```bash
command -v herdr >/dev/null 2>&1 && HERDR_AVAILABLE=1 || HERDR_AVAILABLE=0
```

**Escalate to a peer only when the fresh-process bootstrap is worth it** —
computed **per phase**, not once for the whole run (a `review-fixes` phase
inside an otherwise-`tiny` task still escalates). `USE_PEER=1` for that phase
when `$HERDR_AVAILABLE=1` **and** (`lane` from `overview.yaml` is
`standard`/`risky`, **or** the phase name starts with `review-fixes-`, **or**
it's in a `--all`-mode group of 2+ phases); else `USE_PEER=0` — a `tiny`-lane
single first-attempt phase, where a fresh `claude` process would re-bootstrap
the whole `CLAUDE.md`/rules for work unlikely to need more than one round,
and the Agent tool's shared parent context costs nothing extra.

**If `$USE_PEER=1`:** spawn a peer session so this work runs in its own context instead of
accumulating in the current one:

```bash
OUT=$("$(git rev-parse --show-toplevel)/.claude/scripts/spawn-herdr-peer.sh" coder <task-id> <phase>); RC=$?
PEER_NAME=$(sed -n 's/.*SESSION=\([^ ]*\).*/\1/p' <<<"$OUT")
```

Session names follow **`<project>-<agent>-<task-NNN>[-<phase>]`** (e.g. `sos-tester-task-001`, `sos-coder-task-001-aqi-legend-fix`) — the script prefixes the project, drops the task slug, and appends `-2`, `-3` when that name is already live, so a retry never resumes a stale peer's context. Always message the `SESSION=` value it prints, never a string you composed.

Check `$RC`: `2` → herdr isn't actually usable here despite `command -v`
succeeding (rare — treat like `$USE_PEER=0`, fall back to the Agent tool). `1` → spawn
failed to reach a ready prompt — this is a real infra problem, report it, do not silently retry
forever or fall back without saying so. `0` → delegate:

```
SendMessage({ to: "$PEER_NAME", message: "<the instruction — same text as the Agent-tool form below>", notify_when_idle: true })
```

If `SendMessage` reports the peer isn't reachable yet, retry a few times a few seconds apart — a
known cross-session registry propagation delay, not a failure. Wait for the
`[Cross-session idle notice]`, then continue exactly as described below (read `code.md`, check the
phase status, etc.) — the post-processing does not depend on which path spawned the agent.

**If `$USE_PEER=0`:** use the Agent tool as shown per spawn point below (unchanged behavior) —
this includes the `$HERDR_AVAILABLE=1` but small-`tiny`-phase case, not only herdr being absent.

### Execute and verify

Before spawning the selected mode, **Read**
`.claude/conductor/templates/caw-code-execution-reference.md` and follow its complete
single/all-phase, leader-verification, blocked-phase and completion contract.
