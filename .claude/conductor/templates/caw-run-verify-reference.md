# caw-run Stage 3 — Verify

> Canonical verification-loop contract extracted from commands/caw-run.md to keep the command prompt compact. The command must read this file when it enters Stage 3.

### Stage 3 — Verify

There is no `/caw-verify` command — this fan-out is yours, directly, one peer
per role (never delegate the whole of this stage as one peer's task; see
`leader-discipline.md` § Role). Prerequisite: every phase in `overview.yaml`
has `status: done` — a `blocked` phase means a Stage 2 finding was never
resolved; go back and resolve it, don't spawn verify on top of broken code.

**Spawn tester + reviewer in parallel.** Fixed instruction text either path:

1. **Tester**: `"You are the tester for <task-id> — do this work yourself,
   directly in this session. Do not spawn another peer, subagent, or herdr
   session to do it for you. Run the tester flow for task <task-id>.
   Invoked from /caw-run: do NOT edit overview.yaml — write tests.md only;
   the leader updates overview.yaml after both agents finish."`
2. **Reviewer**: `"You are the reviewer for <task-id> — do this work
   yourself, directly in this session. Do not spawn another peer, subagent,
   or herdr session to do it for you. Run the review flow for task
   <task-id>. Invoked from /caw-run: do NOT edit overview.yaml — write
   review.md (and plan.md if amended) only; the leader updates overview.yaml
   after both agents finish."`

Neither agent writes `overview.yaml` here — two concurrent edits to the same
file corrupt it. You write it once, below, after both finish.

`$HERDR_AVAILABLE=1`: spawn both, same pattern as Stage 2 —
`"$(git rev-parse --show-toplevel)/.claude/scripts/spawn-herdr-peer.sh" tester <task-id>` and
`"$(git rev-parse --show-toplevel)/.claude/scripts/spawn-herdr-peer.sh" reviewer <task-id>`, capture each
`SESSION=`, handle `RC` the same way (`2`→fallback, `1`→report, don't
silently retry), then `SendMessage` both with `notify_when_idle: true`,
retrying "not reachable yet" a few times. Wait for **both** idle notices.
`$HERDR_AVAILABLE=0`: two `tool_use` blocks in one Agent-tool message (true
parallel), wait for both.

**Artifact gate (mandatory, blocks the verdict):** confirm on disk —
`tests.md` and `review.md` — before reading either. Missing one means that
agent reported into its reply instead of writing the file; send it back
(`FIX ROUND 1/3`) or write it yourself from the returned content and say so.

Then apply the full ladder yourself, beyond what the gate already proved:

- Run the test command written in `tests.md` yourself; the counts must equal
  the file's. Mismatch ⇒ finding against the tester. Lane `tiny` with
  `tests-skipped` ⇒ run the manual-verification checklist from `plan.md`
  instead and record each item checked — using browser tooling **already
  connected** in this session (an MCP browser tool, a working Chrome
  extension). If none is connected or the connected one fails/times out, do
  **not** install or configure new tooling to get one (a local Playwright
  browser, a dev-server workaround) — that is scope the user did not ask for
  and a real token cost. Ask the user to run the checklist and report back,
  or to authorize installing a specific tool, and record the checklist as
  `pending — user` in `leader.md` until then.
- **System test (Tier-3) gate.** If the task touches a runtime surface (HTTP
  route, DB schema, worker/edge code, env config, response schema),
  `tests.md` must carry a `## System test (Tier-3)` section — absent on such
  a task is a finding against the tester (`test-tiers.md` § Tier 3). A
  result of `pending — user` does not block `ready-to-commit` by itself, but
  it must be named explicitly in the final report (Stage 4) so the user
  knows what they still need to run.
- Open every finding in `review.md` at its `file:line`. One that does not
  reproduce ⇒ finding against the reviewer.

Write `.claude/conductor/tasks/<task-id>/verify.md` (never quote a count you
did not see a command produce — `harness-contract.md` § Claims):

```markdown
# Verify — <task-id>
**Date:** <ISO-8601> · **Verdict:** ready-to-commit | blocked
## Tests
**Command:** `<exact command you ran>` · **Result:** <pass/fail, coverage>
**Tier-2:** <run / not run + why> · **Flakes:** <re-run result, or none>
## Review
**Findings:** <N CRITICAL, N HIGH, N MEDIUM, N LOW> · **Plan amended:** yes | no
**Open (not fixed):** <finding ids, or none>
## Not checked
<what this pass did not examine, and what would falsify the verdict>
```

Then update `overview.yaml` **once** (pure YAML, no Markdown in it):
`status: review-done` (or `needs-rework` / `review-blocked`), `updated`, and
a `verify:` block (`date`, `verdict`, `tests: {passed, failed, coverage,
command}`, `review: {critical, high, medium, low, plan_amended}`,
`open_findings: []` — `ready-to-commit` requires this empty). Apply any phase
status change the reviewer flagged (`needs-rework`) here too.

Open review findings ⇒ `Skill({ skill: "caw-code", args: "<task-id>
review-fixes-<N>" })` → Stage 2 verification of that phase → this Stage 3
again. Three `review-fixes` rounds max, then ask the user. Append Stage 3 to
`leader.md` (peer session names too, for later `claude --resume`).

