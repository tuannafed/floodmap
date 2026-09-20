# caw-code execution and verification

> Canonical execution contract extracted from commands/caw-code.md. The command must read this file after resolving delegation and before spawning a coder.

### Leader verification (after any coder returns)

`Read .claude/rules/common/leader-discipline.md` once per run, before the first
coder returns. The coder's `code.md` section and "gate passed" line are input,
not evidence: run the type-check and lint commands from `conventions.md § Verify
Commands` yourself, confirm every listed file is in `git status --short`, and
name the evidence for each `test_scenarios` entry. A finding goes back to the
same coder session as `FIX ROUND n/3` (format in the contract); three rounds,
then ask the user.

### Single-phase mode (`<task-id>` or `<task-id> <phase>`)

Spawn the **coder** agent: `"You are the coder for <task-id>, phase
<phase-or-auto> — do this work yourself, directly in this session. Do not
spawn another peer, subagent, or herdr session to do it for you. Run the
coder flow for task <task-id>, phase <phase-or-auto>"` — the explicit "do
this yourself" clause is required, not decoration; see
`templates/skills/herdr-peer-delegate/SKILL.md` (`HB-012`) for why.

Coder agent will:
1. Resolve target phase from arguments or `overview.yaml`
2. Load skills via the Skill tool (from `skills_hint`)
3. Implement code per phase description + test_scenarios + API contract
4. **Self-verify gate (mandatory):** run the project type checker and linter on
   the changed files. This gate **blocks** the phase from being marked `done` —
   the verify stage does not re-run type-check.
5. Append to `code.md` and set the phase status: `done` if the gate passed,
   `blocked` if it did not.

After the phase completes:
- Gate passed, more pending phases → `/caw-code <task-id>` (next phase)
- Gate passed, all phases done → `/caw-run <task-id>` (resumes at Stage 3: test + review parallel, leader-verified)
- Gate failed (phase `blocked`) → fix the reported type-check/lint errors, then
  re-run `/caw-code <task-id> <phase>`. Do NOT proceed to the verify stage.

### All-phases mode (`<task-id> --all`)

Read `parallelization_groups` from `plan.md`. For each group, in order:

1. Group of 1 phase → spawn one coder agent (herdr peer if `$USE_PEER=1` for that phase, else Agent tool).
2. Group of 2+ phases → spawn coder agents **in parallel**. With herdr, this is the same
   `spawn-herdr-peer.sh coder <task-id> <phase>` call run once per phase (the phase in the name
   keeps them distinct; capture each `SESSION=` value) followed by one
   `SendMessage(..., notify_when_idle: true)` per phase; without
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

Each spawned coder: `"You are the coder for <task-id>, phase <phase> — do
this work yourself, directly in this session. Do not spawn another peer,
subagent, or herdr session to do it for you. Run the coder flow for task
<task-id>, phase <phase>"`.

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

Next: /caw-run <task-id>
```

