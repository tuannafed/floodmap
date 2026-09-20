---
description: Test a task — mode derived from the Plan's lane (tiny=skip, standard=full, risky=all)
model: sonnet
---

Run the testing workflow: $ARGUMENTS

## Instructions

`$ARGUMENTS` is `<task-id>`. There are no flags — red vs green for `lane: risky` is inferred by the tester from whether the phases are already `done`.

### Prerequisites

Verify `plan.md` exists. Read `lane` from `overview.yaml`.

### Delegate to tester agent

Check `command -v herdr` once. **If available:** spawn a peer session instead of an in-process
subagent, so this work runs in its own context:

```bash
OUT=$("$(git rev-parse --show-toplevel)/.claude/scripts/spawn-herdr-peer.sh" tester <task-id>); RC=$?
PEER_NAME=$(sed -n 's/.*SESSION=\([^ ]*\).*/\1/p' <<<"$OUT")
```

Session names follow **`<project>-<agent>-<task-NNN>[-<phase>]`** (e.g. `sos-tester-task-001`, `sos-coder-task-001-aqi-legend-fix`) — the script prefixes the project, drops the task slug, and appends `-2`, `-3` when that name is already live, so a retry never resumes a stale peer's context. Always message the `SESSION=` value it prints, never a string you composed.

`$RC` = `2` → herdr isn't actually usable, fall back below. `1` → spawn failed to reach a ready
prompt — report it, don't silently retry or fall back without saying so. `0` → delegate:

```
SendMessage({ to: "$PEER_NAME", message: "You are the tester for
<task-id> — do this work yourself, directly in this session. Do not spawn
another peer, subagent, or herdr session to do it for you. Run the tester
flow for task <task-id>", notify_when_idle: true })
```

If `SendMessage` reports the peer isn't reachable yet, retry a few times a few seconds apart (a
known cross-session registry propagation delay, not a failure). Wait for the
`[Cross-session idle notice]`, then continue exactly as below.

**If herdr is not available (or unusable):** spawn the **tester** agent via the Agent tool:
`"Run the tester flow for task <task-id>"`.

Either way, the tester derives its test mode from the task `lane` — there is no separate `tdd_mode`.

| `lane` | What tester does |
|---|---|
| `tiny` | No-op. Append "skipped per plan" to tests.md. Loads no skills. |
| `standard` | Write tests for ALL phases, backend and frontend alike (post-implementation) — cheapest test type per scenario (unit/integration first, E2E only for the endpoint contract). Verify pass. Mobile = unit only. |
| `risky` (red mode) | Write FAILING tests for all phases BEFORE coder runs — same cheapest-test-type selection. Confirm all fail. |
| `risky` (green mode) | After coder completes, run all tests. Verify pass. Coverage report. |

For mobile phases: unit tests only (Jest + @testing-library/react-native). No Playwright/Detox/Maestro.

### After tester completes

Tester writes `tests.md` with:
- Tests written
- Coverage per phase
- Pass/fail counts
- Source fixes by tester (if it fixed localized bugs during the in-agent fix loop)

The tester runs only this task's spec files and fixes localized failures itself
— it loops back to the coder only for structural bugs (new file, API-contract
change, out-of-scope code).

Next step depends on flow:
- After the red pass (lane=risky, status `red-done`) → `/caw-code <task-id>` to make tests pass
- After post-impl test, all green → `/caw-review <task-id>` (or `/caw-run <task-id>` for the leader-verified parallel loop)
- Tester reports a structural bug it could not fix → `/caw-code <task-id> <phase>`
