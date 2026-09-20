---
description: Leader loop for a task — intake gate, then plan, code, and verify (test + review)
model: sonnet
---

Run the full caw pipeline as leader: $ARGUMENTS

## Instructions

You are the **leader** for this run. Peers produce; you verify with real checks,
send back what is wrong, and ask the user what the source cannot settle. The
contract is `.claude/rules/common/leader-discipline.md`.

`$ARGUMENTS` forms:

- `"<free-text description>"` → start at Stage 0 (intake).
- `<task-id>` → resume from `overview.yaml` `status`: `plan-done` → Stage 2,
  `code-done` → Stage 3, `review-blocked` → Stage 3 fix round, `review-done` →
  Stage 4. Any other status: report the stage the task is in and stop.

### Step 0 — load the contract

`Read .claude/rules/common/leader-discipline.md` (it keys on `leader.md`, which
does not exist yet). Confirm `.claude/skill-map.yaml` exists, else
`❌ Project not set up. Run /caw-setup first.` Read
`.claude/conductor/conventions.md § Verify Commands` — those are the commands
**you** will run at every stage; keep them.

Open this rule, `plan.md`, `code.md`, `tests.md`, `review.md` and every task
artifact with the **Read tool**, never Bash `cat`/`sed`/`grep -A` for the
whole file — a file read that way never loads its rule (measured 2026-09-08)
and produces no artifact-gate evidence beyond your own memory of it. Grepping
a specific pattern to confirm a claim (rung 2 of the ladder) is fine through
Bash; reading a file's content to judge it is not.

Check `command -v herdr` once and remember the answer (`$HERDR_AVAILABLE`) —
it decides two things: the stage commands below spawn herdr peers when it is
present and subagents otherwise, and Stage 4 only attempts tab/workspace
cleanup when it is `1` (the Agent-tool fallback leaves nothing to close).

### Stage 0 — Intake gate (description form only)

1. Fill the seven sections of `.claude/conductor/templates/intake.md` from the
   conversation so far and from the source (grep the areas the request
   names). Do not invent a value: every risk flag or field you cannot confirm
   from the conversation or the code is one `AskUserQuestion` (one per
   message, your recommended answer first).
2. Present the brief: restated request; in scope / out of scope; acceptance
   criteria, numbered and each falsifiable; risk flags set; hard gates;
   expected lane. Ask **"Lên plan?"** and wait. Only an explicit yes starts
   Stage 1; a change request loops back to 1.
3. Keep the brief text — it is the `/caw-plan` argument, and after Stage 1 it
   is saved as `.claude/conductor/tasks/<task-id>/intake.md`.

### Stage 1 — Plan

Invoke `Skill({ skill: "caw-plan", args: "<brief>" })` and let it run to its
report. It spawns a herdr peer (session name `planner-<task-id>` after the
command's own rename) when `$HERDR_AVAILABLE=1`, else an in-process subagent —
keep whichever identifier `/caw-plan` reports for send-backs.

Verify (ladder rungs 1–4 of the contract):

- `plan.md` and `overview.yaml` exist, non-empty, and `overview.yaml` parses:
  `"$(git rev-parse --show-toplevel)/.claude/scripts/caw-status.sh" <task-id>` exits 0 and prints the task.
- Every `file:line` / symbol in the plan's spec-mandate and consumer tables:
  re-grep it yourself. Unconfirmed ⇒ finding.
- `skills_hint` names are all in `.claude/skill-map.yaml`; phase count meets
  the lane threshold (`plan-discipline.md`); `lane` is consistent with the
  intake hard gates.
- Each acceptance criterion of the brief maps to at least one
  `test_scenarios` entry. Unmapped ⇒ finding.

Findings ⇒ `SendMessage` to the planner agent id, format `FIX ROUND n/3` from
the contract; the planner revises `plan.md` (`## Revisions`). Re-verify. Three
rounds max, then ask the user.

Then the user gates: each `## Gaps` item is one question; `lane: risky` or a
hard gate is a confirmation. Send the answers to the planner as a revision
round. Save the brief as `tasks/<task-id>/intake.md`. Append Stage 1 to
`leader.md`. Show phases, lane, `parallelization_groups`, and ask **"Code?"**.

### Stage 2 — Code

Invoke `Skill({ skill: "caw-code", args: "<task-id> --all" })`. It spawns one
coder per phase (herdr peer or subagent) group by group and reports; keep every
`SESSION=` name (or agent id) per phase.

Verify each phase after its group returns — all of it, not the summary:

- `code.md` has a section for the phase; every file it lists exists and shows
  in `git status --short` / `git diff --stat`.
- Run the type-check and lint commands from `conventions.md § Verify Commands`
  **yourself**, foreground, and record command + exit code. The coder's "gate
  passed" is a claim.
- For every `test_scenarios` entry of the phase, name the evidence (diff hunk,
  test name, grep hit). None ⇒ finding.

A phase `/caw-code` reported `blocked` is a finding, not a stop. Findings ⇒
`FIX ROUND n/3` to that phase's coder session; wait for its idle notice; re-run
the whole ladder. Three rounds per phase, then ask the user. Append Stage 2 to
`leader.md` before moving on.

### Stage 3 — Verify

Before starting verification, **Read**
`.claude/conductor/templates/caw-run-verify-reference.md` and execute its complete
parallel test/review, leader-verification, fix-round and `verify.md` contract.
The reference is mandatory on every pass through Stage 3.

### Stage 4 — Report

`leader.md` already holds every stage. If `$HERDR_AVAILABLE=1`, close the peer
tabs whose stage is verified (`herdr tab close <id>`, idle ones only; then the
project space when only peers were in it) — nothing to close on the Agent-tool
fallback path. Report:

```
✅ /caw-run complete — <task-id>

Stages: intake ✓  plan ✓ (rounds: 1)  code ✓ (rounds: db 1, api 2)  verify ✓ (review-fixes: 1)
Leader checks: npx tsc --noEmit exit 0 · pnpm check:ci exit 0 · pnpm vitest run 30/30 (matches tests.md)
User decisions: 2 (listed in leader.md)
Peers: sos-coder-task-001-db, sos-coder-task-001-api, sos-tester-task-001, sos-reviewer-task-001
System test (Tier-3): pending — user must run <the named action> and confirm <expected result>

Next: review the diff and commit — /caw-run never commits or pushes. Once
you do (or if you already have), tell me — I'll mark it `done` and sweep any
leftover peer sessions per leader-discipline.md § Commit protocol.
```

Omit the `System test (Tier-3)` line entirely when the task has no runtime surface (`skipped`) or
the checklist already ran clean (`pass`) — only name it when it is `pending — user`.

If the run stopped at a round cap or on an unanswered question, say which
stage, list the open findings, and name the peer that holds the work.
