---
# Not `model: inherit` — it inherits the parent session's exact model
# variant, including any `[1m]` extended-context suffix. If the parent
# runs sonnet[1m]/opus[1m], every subagent spawn then requires "usage
# credits" enabled on the account and fails otherwise (confirmed via
# Claude Code docs, 2026-09-03 — see docs/AUDIT-2026-09-03.md).
model: sonnet
---

Run test + review in parallel: $ARGUMENTS

## Instructions

`$ARGUMENTS` is `<task-id>`.

### Prerequisites

Verify every phase in `overview.yaml` has `status: done`. If any phase is
`pending`, `needs-rework`, or `blocked`, abort:

- A `blocked` phase means the coder's self-verify gate (type-check / lint) failed.
  Tell the user to fix the reported errors and re-run `/caw-code <task-id> <phase>`
  before verifying.
- `/caw-verify` assumes the code already type-checks — it does not re-run the
  type checker. It only runs tests + multi-dim review.

### Spawn tester + reviewer in parallel

The instruction text for each is fixed regardless of spawn path:

1. **Tester**: `"Run the tester flow for task <task-id>. Invoked from /caw-verify: do NOT edit overview.yaml — write tests.md only; the orchestrator updates overview.yaml after both agents finish."` (tester derives its test mode from the task `lane`)
2. **Reviewer**: `"Run the review flow for task <task-id>. Invoked from /caw-verify: do NOT edit overview.yaml — write review.md (and plan.md if amended) only; the orchestrator updates overview.yaml after both agents finish."`

**Neither agent writes `overview.yaml` during `/caw-verify`.** They run in
parallel; two concurrent edits to the same YAML file corrupt it and drop the
task from the board. The orchestrator (you) writes it exactly once, in step 3
below, after both have finished.

Check `command -v herdr` once. **If available:**

```bash
TS=$(date +%s)
TESTER_NAME="verify-<task-id>-tester-${TS}"
REVIEWER_NAME="verify-<task-id>-reviewer-${TS}"
.claude/scripts/spawn-herdr-peer.sh "$TESTER_NAME"
.claude/scripts/spawn-herdr-peer.sh "$REVIEWER_NAME"
```

The `${TS}` suffix guarantees a fresh peer per `/caw-verify` invocation, including retries after a
`review-fixes-N` round — resuming the same named session across rounds would let its context grow
round over round, quietly reintroducing the exact problem herdr peer mode exists to avoid. If
either script call exits `2`, herdr isn't actually usable — fall back to the Agent-tool path below
for both. If either exits `1`, that spawn failed to reach a ready prompt — report it, don't
silently retry or fall back without saying so.

Once both report `PANE_ID=...` (exit 0), deliver both instructions:

```
SendMessage({ to: "$TESTER_NAME", message: "<tester instruction above>", notify_when_idle: true })
SendMessage({ to: "$REVIEWER_NAME", message: "<reviewer instruction above>", notify_when_idle: true })
```

If either `SendMessage` reports the peer isn't reachable yet, retry a few times a few seconds apart
— a known cross-session registry propagation delay, not a failure. Wait for **both**
`[Cross-session idle notice]`s before continuing to "Aggregate results" below.

**If herdr is not available (or unusable):** use the Agent tool with two tool_use blocks in one
message (true parallel execution), one per instruction above. Wait for both to complete.

### Aggregate results

#### 1. Artifact gate (MANDATORY — blocks the verdict)

Before reading anything, confirm **on disk** that both agents pushed their files:

- `.claude/conductor/tasks/<task-id>/tests.md`
- `.claude/conductor/tasks/<task-id>/review.md`

If either is missing, the agent reported into its reply instead of writing the
file — a harness-contract push failure, not a cosmetic one. Do **not**
aggregate from the agent's response text and do **not** report a verdict.
Either send that agent back to write its file (`SendMessage`), or write it
yourself from the returned content and say plainly in your report that you
did so and why. A verdict block in `overview.yaml` with no file behind it is
the specific failure this gate exists to stop; if the project has an
artifact-gate CI script, it fails on any new instance.

#### 2. Write `verify.md`

Read both files, then write `.claude/conductor/tasks/<task-id>/verify.md`:

```markdown
# Verify — <task-id>

**Date:** <ISO-8601>
**Verdict:** ready-to-commit | blocked

## Tests
**Command:** `<the exact command that produced the counts>`
**Result:** <pass/fail counts, coverage %>
**Tier-2:** <run / not run + why>
**Flakes:** <file + isolation re-run result, or `none`>

## Review
**Findings:** <N CRITICAL, N HIGH, N MEDIUM, N LOW>
**Plan amended:** yes | no
**Open (not fixed):** <finding ids that still need work, or `none`>

## Not checked
<what this pass did not examine, and what would falsify the verdict>
```

Never quote a count you did not see a command produce
(`rules/common/harness-contract.md` § Claims) — copy the command line
from `tests.md`, and if `tests.md` has none, that is a finding, not a number.

#### 3. Update `overview.yaml` — once, by the orchestrator

`overview.yaml` is **pure YAML** — parsed by the backlog viewer. Never append
Markdown to it (no `## ...` headings, no `**bold**`, no prose); that prose
belongs in `verify.md`. Use the Edit tool to update keys surgically, and write
the `verify:` block **once**, after both agents have finished and both files
passed the gate:

```yaml
status: review-done        # or: needs-rework / review-blocked when blocked
updated: <current ISO-8601 timestamp>
verify:
  date: <YYYY-MM-DD>
  verdict: ready-to-commit   # or: blocked
  tests: { passed: 30, failed: 0, coverage: "85%", command: "<exact command from tests.md>" }
  review: { critical: 0, high: 0, medium: 0, low: 0, plan_amended: false }
  open_findings: []          # verdict ready-to-commit requires this to be empty
```

If the reviewer amended the plan or set a phase to `needs-rework`, apply that
phase status change here too — the reviewer did not touch `overview.yaml`.

### Report

```
✅ Verify complete

Artifacts: tests.md ✓  review.md ✓  verify.md written ✓  overview.yaml updated once ✓

Tests:
  - Backend: 18/18 passing (92% coverage)
  - Frontend: 12/12 passing (78% coverage)

Review:
  - 0 CRITICAL, 0 HIGH, 0 MEDIUM, 0 LOW — 0 open
  - Plan amended: no
  - Pre-existing issues filed as new tasks: 0

Verdict: ✅ Ready to commit

Next: git commit
```

If herdr peer mode was used, append one line before "Next:" naming both peers (skip this line
entirely on the Agent-tool fallback path — there is nothing to resume):

```
Peer sessions (herdr): verify-<task-id>-tester-<ts>, verify-<task-id>-reviewer-<ts>
  Resume either with: claude --resume <name>
```

If the reviewer has **any** open finding (CRITICAL, HIGH, MEDIUM or LOW), output:

```
❌ Verify BLOCKED — 6 open findings (0 CRITICAL, 1 HIGH, 2 MEDIUM, 3 LOW)

Tests: 18/18 passing
Plan amended: yes (phase review-fixes-1: F-001 … F-006)
Action: /caw-code <task-id> review-fixes-1
Then: /caw-verify <task-id>   ← repeat until 0 open
```

Set `status: review-blocked` and `next_phase: review-fixes-<N>` in
`overview.yaml`. `ready-to-commit` requires `open_findings: []`.
