---
paths:
  - '**/conductor/tasks/*/leader.md'
  - '**/conductor/tasks/*/verify.md'
---

# Leader Discipline — verify, send back, ask

Loaded when a leader artifact (`leader.md`, `verify.md`) is read/edited, and `Read` explicitly by `/caw-run` (once, in Step 0 — Stage 3's verify fan-out lives inside `/caw-run` itself, no separate `/caw-verify`) and by `/caw-code` before processing a peer's return. Never always-on: peers and subagents do not lead.

## Role

Peers (planner, coder, tester, reviewer — herdr sessions or subagents) produce. The leader owns the verdict. A peer's reply, idle notice or "gate passed" line is **input, never evidence** — nothing a peer wrote is a fact in the leader's report until re-established this turn. The leader fans out itself, one peer per role — never delegates a whole multi-role command (`/caw-code --all`, or the tester+reviewer fan-out in `/caw-run` Stage 3) as one peer's task; that peer would then fan out again on its own, a nested spawn this rule can't see or verify.

## Verification ladder

A stage is verified only when all four rungs hold, in order:

1. **Artifact on disk** — the file the stage owns exists, is non-empty, re-read this turn (`harness-contract.md § Who writes what`).
2. **Claims re-established** — every specific claim in that artifact (`file:line`, symbol, count, "nothing else does X") confirmed by the leader's own grep/read/command, run this turn. `harness-contract.md § Claims` applies to someone else's file exactly as to your own. Unconfirmed claim ⇒ finding.
3. **Checker re-run** — leader executes the project's verify commands (`conventions.md § Verify Commands`) and the test command from `tests.md` itself, foreground, recording exact command + exit code. A number copied from a peer's file is a claim, not a result; mismatched counts ⇒ finding against the author. Before trusting `conventions.md § Verify Commands`, run `bash "$(git rev-parse --show-toplevel)/.claude/scripts/check-stack-drift.sh"` once per stage (silent; missing on an older project = treat as clean). Non-empty result is advisory, not a gate — append verbatim to `leader.md`, surface to the user once, still run the recorded commands this round; never invent replacement commands from memory.
4. **Spec conformance** — every acceptance criterion and every `test_scenarios` entry names its evidence: diff hunk, test name, grep hit. No evidence ⇒ finding. Silence isn't conformance.

Reading a peer's pane or summary instead of running rungs 2–4 is the failure this rule exists to stop.

## Known concurrency failure patterns

Rungs 2 and 3 can surface a result that isn't what it looks like: a claim collision no single peer could have seen coming, or a wide failure spread with no code explanation. Before writing either up as a finding, `Read` `rules/common/leader-known-patterns.md` — confirmed concurrency-only failure classes (ADR numbering collisions between parallel planners, shared-local-DB lock contention between concurrent verify runs) with the exact check + fix. Not loaded automatically; append a new pattern once confirmed, so the next leader recognizes it in minutes, not from scratch.

## Send-back protocol

Findings go to the peer that produced the stage — the same session (its context holds the work under repair), a fresh one only when it is gone. Message format:

```
FIX ROUND <n>/3 — <stage> — <task-id> [<phase>]
1. <file:line> — expected: <from plan/spec> — found: <what the leader saw> — evidence: <command or grep>
2. …
Re-run your own gate, update <artifact>, then report. Run everything in the foreground so your idle signal means done.
```

After the peer's idle notice, round 1 always runs the whole ladder — nothing yet to scope against. **Round ≥ 2** runs rungs 1 (artifact) and 3 (checker) in full every time — cheap, deterministic, the best broad regression signal there is. For rungs 2 and 4, scope to the files the peer's round report names as touched, cross-checked against `git diff --stat` (or `git status --short`) for completeness — a diff file the report doesn't name **is itself a finding** (undisclosed change, worse than the one being fixed). A claim/evidence anchored outside both report and diff carries forward from the round that last fully verified it, cited by round number, not re-derived from memory: the diff showing no touch **is** its evidence, so this stays verified, not a guess. Cap: three rounds per stage. Round 3 still failing ⇒ stop and ask the user with the open finding list — never a 4th round, never a silent leader fix. Leader edits project code itself only when the user says so, recorded as a leader edit in `leader.md`. Append a Part C entry to `conductor/pipeline-postmortems.md` the same turn — same protocol a severe defect uses, see its own header for the template.

**A round where the leader itself was wrong doesn't count against the peer's cap.** Pushback and the peer defending its own work is healthy, not thrashing — but if a sent finding misapplied a rule (demanded something the phase's own lane/mode/spec never required — e.g. a `lane: standard` phase getting a finding that demands a committed test file, when writing tests isn't that phase's job), that's a **leader error**, not a peer defect. On discovering this, retract it explicitly — `leader.md` outcome `leader error, retracted`, with the rule misread and the correction — and don't count that round toward the cap. The next real finding, if any, still starts from the peer's last valid round number, not one past the retracted round.

## Ask-the-user triggers

One `AskUserQuestion` per point, the leader's recommendation listed first:

- an intake field (scope, acceptance criterion, risk flag) the conversation does not settle;
- a planner `## Gaps` item;
- `lane: risky` or any intake hard gate;
- a peer whose output contradicts the spec where the leader cannot show from the source which is right;
- a peer or subagent turn that fails with "usage credits required for 1M context" (HTTP 429) — structural, identical on every retry; do not retry it, do not spend a `FIX ROUND` on it, ask the user immediately (see the `model:` comment in any `agents/*.md`);
- the round cap;
- anything that changes scope, including a fix the leader would make itself.

Resolving any of these by inference is a contract violation. Do not guess, do not fill the gap with the likely answer, do not proceed "for now".

## `leader.md`

`tasks/<id>/leader.md`, appended at the **end of every stage** (never written only at the end — a crash must leave evidence):

```markdown
# Leader — <task-id>

Started: <ISO-8601> · Leader: <session or "main">

## Stage <n> — <plan|code|verify> (<round count>)

| round | check          | command                | result      | outcome                               |
| ----- | -------------- | ---------------------- | ----------- | ------------------------------------- |
| 1     | tsc            | `npx tsc --noEmit`     | exit 0      | pass                                  |
| 1     | S2 evidence    | `git diff -- src/x.ts` | hunk L40-52 | pass                                  |
| 1     | tests.md count | `pnpm vitest run`      | 30 passed   | finding → sent to sos-tester-task-001 |

User decisions: <question → answer>, or `none`
Peers: <session names>
```

Outcome values: `pass`, `finding → sent to <peer>`, `asked user`, `leader edit (user-approved)`, `leader error, retracted`.

## Peer hygiene

Session names are the `SESSION=` value `spawn-herdr-peer.sh` printed. One space per project, one tab per peer, at most 5 live peer tabs per space. Close a tab only after its stage is verified and its title shows idle (`✳`); never a busy one (`◐`). Closing a workspace's last tab fails — close the workspace itself instead.

## Commit protocol — when the user confirms or requests a commit

`/caw-run` and `/caw-code` never commit themselves — `harness-contract.md`'s task-status table marks `review-done → done` **HUMAN only, after the commit/PR lands**. That doesn't mean the leader is done: once the user asks for the commit, or confirms one already landed, close the task out that same turn, before `git commit` (or right after, if the user committed outside this session):

1. **Mark it done.** Update `overview.yaml`: `status: done`, bump `updated` — the only place `status: done` is ever written, never speculatively, never before the user's own confirmation. **This edit must end up committed, same as any other file this task touched — never a dangling follow-up.** About to commit yourself? Make this edit first, one commit for both code and status. User already committed outside this session? This edit is a _new_ uncommitted change on top — say so and commit it now (`chore: mark <task-id> done`), don't leave `git status` dirty with nothing pointing back (confirmed live, SMS-AI-Driven, 2026-09-13: a leader marked `done` after the user's own commit and never committed the marking edit).
2. **Sweep every herdr peer this task's pipeline spawned** — `ListAgents` against every session name recorded across this task's `leader.md`, not only those already closed idle during Stage 4. Kill and close any still open (busy or idle), including its pane/tab, and the workspace itself if it was the last peer. A `done` task with a live peer session is a finding against the leader, same as an unclosed HB item.
3. **If this task added/updated a hub-targeted `harness-backlog.md` row or `pipeline-postmortems.md` summary row** (`target`/`Hub target` ≠ `project`), run `.claude/scripts/sync-hb-to-hub.sh` — appends both kinds (postmortem ones marked `PM-<id>`) to the hub's `docs/hb-inbox.md`, never edits any other hub file, never runs git there. Skips silently if the hub can't be resolved or predates the inbox.

A task sitting at `review-done` longer than expected (`/caw-status` shows `next: git commit` across sessions) is the signature of this protocol skipped, not the user forgetting — check for it, and for orphaned peer sessions, before assuming anything else.
