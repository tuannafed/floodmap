---
description: Multi-dimensional review of a task (security, performance, a11y, refactor, architecture)
model: sonnet
---

Run the review workflow: $ARGUMENTS

## Instructions

`$ARGUMENTS` is `<task-id>`.

### Prerequisites

Verify all coder phases are complete (`status: done` in `overview.yaml` for each phase). If not:

```
❌ Coding incomplete. Run /caw-code <task-id> --all first.
```

### Delegate to reviewer agent

Check `command -v herdr` once. **If available:** spawn a peer session instead of an in-process
subagent, so this work runs in its own context:

```bash
OUT=$("$(git rev-parse --show-toplevel)/.claude/scripts/spawn-herdr-peer.sh" reviewer <task-id>); RC=$?
PEER_NAME=$(sed -n 's/.*SESSION=\([^ ]*\).*/\1/p' <<<"$OUT")
```

Session names follow **`<project>-<agent>-<task-NNN>[-<phase>]`** (e.g. `sos-tester-task-001`, `sos-coder-task-001-aqi-legend-fix`) — the script prefixes the project, drops the task slug, and appends `-2`, `-3` when that name is already live, so a retry never resumes a stale peer's context. Always message the `SESSION=` value it prints, never a string you composed.

`$RC` = `2` → herdr isn't actually usable, fall back below. `1` → spawn failed to reach a ready
prompt — report it, don't silently retry or fall back without saying so. `0` → delegate:

```
SendMessage({ to: "$PEER_NAME", message: "You are the reviewer for
<task-id> — do this work yourself, directly in this session. Do not spawn
another peer, subagent, or herdr session to do it for you. Run the review
flow for task <task-id>", notify_when_idle: true })
```

If `SendMessage` reports the peer isn't reachable yet, retry a few times a few seconds apart (a
known cross-session registry propagation delay, not a failure). Wait for the
`[Cross-session idle notice]`, then continue exactly as below.

**If herdr is not available (or unusable):** spawn the **reviewer** agent via the Agent tool:
`"Run the review flow for task <task-id>"`

Reviewer agent will:
1. Read `code.md` to identify changed files
2. Multi-dim review: security, performance, accessibility, architecture, refactor
3. Tag findings by severity (CRITICAL / HIGH / MEDIUM / LOW)
4. Any open finding (CRITICAL, HIGH, MEDIUM or LOW) → verdict `review-blocked`
5. Append a `review-fixes-<N>` phase to `plan.md` listing every finding (with `## Revisions` entry); pre-existing issues outside the diff become a new task in `backlog.md` instead
6. May amend `plan.md` further if the design needs changes
7. Write `review.md`

### Verdict outcomes

| Outcome | Action |
|---|---|
| 0 open findings | ✅ `approved` — ready to commit. |
| 1+ open finding, any severity | ❌ `review-blocked`. `/caw-code <task-id> review-fixes-<N>` then `/caw-run <task-id>` (resumes at the fix round). Repeat until 0 open. |

### After review completes

If verdict is `review-blocked`:
- Reviewer appended phase `review-fixes-<N>` (and any design phase) to the Plan
- Run `/caw-code <task-id> review-fixes-<N>` — coder fixes every listed finding
- Then `/caw-run <task-id>` — resumes at Stage 3, tester re-runs, reviewer re-reviews
- Loop until the reviewer reports 0 open findings. Severity never makes a finding optional.

If verdict is ready:
- Proceed to commit/PR (handled outside caw workflow)
