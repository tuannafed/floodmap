---
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

Every spawn below follows this pattern — check once per command run:

```bash
command -v herdr >/dev/null 2>&1 && HERDR_AVAILABLE=1 || HERDR_AVAILABLE=0
```

**If `$HERDR_AVAILABLE=1`:** spawn a peer session so this work runs in its own context instead of
accumulating in the current one:

```bash
PEER_NAME="coder-<task-id>-<phase>-$(date +%s)"
.claude/scripts/spawn-herdr-peer.sh "$PEER_NAME"
```

Check the script's exit code: `2` → herdr isn't actually usable here despite `command -v`
succeeding (rare — treat like `$HERDR_AVAILABLE=0`, fall back to the Agent tool). `1` → spawn
failed to reach a ready prompt — this is a real infra problem, report it, do not silently retry
forever or fall back without saying so. `0` → delegate:

```
SendMessage({ to: "$PEER_NAME", message: "<the instruction — same text as the Agent-tool form below>", notify_when_idle: true })
```

If `SendMessage` reports the peer isn't reachable yet, retry a few times a few seconds apart — a
known cross-session registry propagation delay, not a failure. Wait for the
`[Cross-session idle notice]`, then continue exactly as described below (read `code.md`, check the
phase status, etc.) — the post-processing does not depend on which path spawned the agent.

**If `$HERDR_AVAILABLE=0`:** use the Agent tool as shown per spawn point below (unchanged behavior).

### Single-phase mode (`<task-id>` or `<task-id> <phase>`)

Spawn the **coder** agent: `"Run the coder flow for task <task-id>, phase <phase-or-auto>"`

Coder agent will:
1. Resolve target phase from arguments or `overview.yaml`
2. Load skills via the Skill tool (from `skills_hint`)
3. Implement code per phase description + test_scenarios + API contract
4. **Self-verify gate (mandatory):** run the project type checker and linter on
   the changed files. This gate **blocks** the phase from being marked `done` —
   `/caw-verify` does not re-run type-check.
5. Append to `code.md` and set the phase status: `done` if the gate passed,
   `blocked` if it did not.

After the phase completes:
- Gate passed, more pending phases → `/caw-code <task-id>` (next phase)
- Gate passed, all phases done → `/caw-verify <task-id>` (test + review parallel)
- Gate failed (phase `blocked`) → fix the reported type-check/lint errors, then
  re-run `/caw-code <task-id> <phase>`. Do NOT proceed to `/caw-verify`.

### All-phases mode (`<task-id> --all`)

Read `parallelization_groups` from `plan.md`. For each group, in order:

1. Group of 1 phase → spawn one coder agent (herdr peer if `$HERDR_AVAILABLE=1`, else Agent tool).
2. Group of 2+ phases → spawn coder agents **in parallel**. With herdr, this is the same
   `spawn-herdr-peer.sh` call run once per phase (each gets its own `PEER_NAME` —
   `coder-<task-id>-<phase>-$(date +%s)`, phase in the name keeps them distinct even spawned in
   the same second) followed by one `SendMessage(..., notify_when_idle: true)` per phase; without
   herdr, the existing Agent-tool multiple-tool_use-blocks-in-one-message form.
3. Wait for all agents in the current group before starting the next group — with herdr, that
   means collecting one `[Cross-session idle notice]` per phase in the group before moving on.

Example:

```yaml
parallelization_groups:
  - [db]                          # Group 1: just db
  - [backend, frontend-skeleton]  # Group 2: parallel
  - [frontend-impl]               # Group 3: solo
  - [integrate]                   # Group 4: solo
```

Run db → wait → run [backend + frontend-skeleton in parallel] → wait →
run frontend-impl → wait → run integrate.

Each spawned coder: `"Run the coder flow for task <task-id>, phase <phase>"`.

If any coder agent reports its phase `blocked` (self-verify gate failed), **stop
the run** — do not start later groups, and do not set status `code-done`. Report
the blocked phase and its type-check/lint errors so the user can fix and re-run.

When all groups complete with every phase `done`, set `overview.yaml` status to
`code-done` and report:

```
✅ All phases complete

Phases run: db, backend, frontend, integrate
Parallel groups: [db] → [backend|frontend-skel] → [frontend-impl] → [integrate]
Self-verify gate: all phases type-check ✓ + lint ✓

Next: /caw-verify <task-id>
```
