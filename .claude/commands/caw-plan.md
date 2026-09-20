---
description: Generate a Plan for a task — spec, API contract, phases, self-challenge, lane
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

### Delegate to planner agent (herdr peer, or Agent tool fallback)

The planner has no Bash and cannot read the clock — it once wrote `T00:00:00` for
`created`/`updated`. Take the timestamp here and hand it over:

```bash
NOW=$(date +%Y-%m-%dT%H:%M:%S%z | sed -E 's/([0-9]{2})$/:\1/')
command -v herdr >/dev/null 2>&1 && HERDR_AVAILABLE=1 || HERDR_AVAILABLE=0
```

The instruction text is fixed regardless of spawn path: `"You are the planner
for this request — do this work yourself, directly in this session. Do not
spawn another peer, subagent, or herdr session to do it for you. Run the
planning flow for: <description>. Current timestamp for created/updated:
<NOW>"` — the explicit "do this yourself" sentence is not decoration: a bare
`"Run the planning flow for..."` reads, to a full unrestricted session, as
something that could itself be satisfied by delegating further, and has
caused a planner peer to spawn a second, nested planner peer instead of
planning itself (SMS-AI-Driven, 2026-09-12; see
`templates/skills/herdr-peer-delegate/SKILL.md` for the same incident with a
coder peer, `HB-012`).

**If `$HERDR_AVAILABLE=1`:** the task-id doesn't exist yet (the planner invents
it), so spawn the ad-hoc form — a slug of the description, not a task-id:

```bash
SLUG=$(printf '%s' "$ARGUMENTS" | tr 'A-Z' 'a-z' | tr -c 'a-z0-9' '-' | sed -E 's/-+/-/g; s/^-|-$//g' | cut -c1-40)
OUT=$("$(git rev-parse --show-toplevel)/.claude/scripts/spawn-herdr-peer.sh" "planner-$SLUG"); RC=$?
PEER_NAME=$(sed -n 's/.*SESSION=\([^ ]*\).*/\1/p' <<<"$OUT")
TAB_ID=$(sed -n 's/.*TAB_ID=\([^ ]*\).*/\1/p' <<<"$OUT")
```

Check `$RC` exactly as the other commands do: `2` → herdr isn't actually usable
here despite `command -v` succeeding — fall back to the Agent tool below. `1` →
spawn failed to reach a ready prompt — report it, don't silently retry or fall
back without saying so. `0` → `SendMessage({ to: "$PEER_NAME", message:
"<the instruction above>", notify_when_idle: true })`, retrying a few times on
"not reachable yet" (registry propagation delay), then wait for the
`[Cross-session idle notice]`.

Once the peer is idle, read the `id:` it wrote in the new task's
`overview.yaml` (find it via `git status --short .claude/conductor/tasks/` or
the newest directory there) and rename the tab to match the session-name
convention: `herdr tab rename "$TAB_ID" "planner-<task-id>"` (best effort — a
failure here doesn't block anything downstream). Keep `$PEER_NAME` for any
later `FIX ROUND` send-back (e.g. from `/caw-run`'s plan verification).

**If `$HERDR_AVAILABLE=0`:** spawn the **planner** agent with the same
instruction text via the Agent tool (unchanged behavior).

Either path, the planner will:
1. Detect task type (feature/bug/chore/refactor)
2. Determine the task `lane` (tiny/standard/risky) — drives test behavior + pull depth
3. Load product/PM skills scaled to type/lane (chore/tiny/simple-bug: `create-specification` only; feature/multi-phase: `create-specification` + `user-story`; the other PM skills load only on their escalation triggers) — avoids loading ~2600 lines of PRD/roadmap skill content for a single-task plan
4. Write spec, API contract, phases (with test_scenarios + skills_hint), challenge section
5. Verify all `skills_hint` reference installed skills (warn if missing)
6. Output `.claude/conductor/tasks/<task-id>/plan.md` + `overview.yaml`

After planning, next step depends on `lane`:
- `lane: risky` → `/caw-test <task-id>` (red mode, write failing tests first)
- `lane: standard` or `tiny` → `/caw-code <task-id>` (start coding)
