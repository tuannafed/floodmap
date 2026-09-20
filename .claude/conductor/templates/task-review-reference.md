# Step 6 — Write review file

> Canonical artifact contract extracted from agents/reviewer.md to keep the base agent prompt compact. The agent must read this file at the named workflow step.

### Step 6 — Write review file

Write `.claude/conductor/tasks/<task-id>/review.md` via `Bash` (you no longer
have the `Write` tool). The quoted heredoc delimiter (`'EOF'`) prevents shell
expansion of the `$`/backtick characters the template below contains:

```bash
cat > ".claude/conductor/tasks/<task-id>/review.md" <<'EOF'
# Review: <task-title>

**Reviewer:** reviewer agent
**Date:** 2026-05-10T16:00
**Files reviewed:** 18
**Skills loaded via Skill tool:** code-review-excellence, <lane/diff-gated skills actually loaded>, <framework-skills>
**Dimension skills skipped:** <name: reason — e.g. accessibility: backend-only diff>

**Rules read:** project.md (present | absent), review-discipline.md

> Only list skills you actually called the Skill tool for during this review. If Step 0b was skipped, write `none — Step 0b was skipped` and explain.

## Summary

| Severity | Count | Action |
|---|---|---|
| CRITICAL | 0 | - |
| HIGH | 1 | fix — phase review-fixes-1 |
| MEDIUM | 3 | fix — phase review-fixes-1 |
| LOW | 5 | fix — phase review-fixes-1 |

**Open findings:** F-001 … F-009 (9) → verdict `review-blocked`
**Out of scope (pre-existing):** none

## Findings

### CRITICAL / HIGH

#### F-001 — HIGH — Webhook signature not verified
**File:** `apps/api/src/webhooks/stripe.controller.ts:45`
**Dimension:** Security
**Detail:** The webhook handler accepts any payload without verifying Stripe's signature header. An attacker could trigger fake `checkout.session.completed` events.
**Fix:** Use `stripe.webhooks.constructEvent(body, sig, secret)` per `stripe-best-practices` skill.
**Action:** Fix in `review-fixes-1`. Tier-2 test required (webhook path).

### MEDIUM

#### F-002 — MEDIUM — N+1 query in user dashboard
**File:** `apps/web/src/app/dashboard/page.tsx:23`
**Dimension:** Performance
**Detail:** Loading 50 users + their subscriptions creates 51 queries.
**Fix:** Use Prisma `include` to join in one query.
**Action:** Fix in `review-fixes-1`. Test scenario: query count = 1.

### LOW

#### F-003 — LOW — Duplicate utility function
... (etc)

## Consumers checked

| Shared thing | Grep | Consumers outside diff | Verdict |
|---|---|---|---|
| `subscriptions.status` column | `git grep -n "subscriptions.status" -- apps/ packages/ scripts/` | 3 | 2 same concept; 1 → F-004 (HIGH) |

## Verdict

❌ **Block commit.** 1 HIGH finding requires fix.

After fixing F-001:
- /caw-code <id> webhook-security
- /caw-run <id> (re-run review, leader-verified)
EOF
```

### Step 6b — Artifact gate (MANDATORY — blocks the verdict)

Follow `rules/common/harness-contract.md § Artifact gate`. Artifact:
`.claude/conductor/tasks/<task-id>/review.md` must exist on disk with the
Step 6 content before you report a verdict (approved or blocked). Re-check
with `wc -l` + `grep "^## Verdict"`, only then continue to Step 7. A verdict
recorded in `overview.yaml` with no `review.md` behind it is the specific
failure this gate exists to stop — it has happened, reconstructed by hand
days later.

### Step 7 — Update overview.yaml

**When invoked from `/caw-run`** (the spawn prompt says so), **skip this
step entirely** — the tester runs in parallel with you, and two agents editing
`overview.yaml` at once corrupt it. The orchestrator writes `status` and the
`verify:` block once after both agents finish. You write `review.md` only.

`overview.yaml` is **pure YAML** — parsed by the backlog viewer. You no
longer have the `Edit` tool; use `sed` for the two top-level scalars (anchored
at column 0, so this cannot touch a same-named key nested under `phases:`)
and `awk` to insert the optional `review:` mapping before the `phases:` list.
Never append Markdown (`## ...` headings, `**bold**`, prose) — review prose
belongs in `review.md`, not here.

```bash
TASK_DIR=".claude/conductor/tasks/<task-id>"
sed -i.bak -E "s/^status: .*/status: review-blocked/" "$TASK_DIR/overview.yaml"
sed -i.bak -E "s/^updated: .*/updated: $(date -u +%Y-%m-%dT%H:%M:%S+00:00)/" "$TASK_DIR/overview.yaml"
rm -f "$TASK_DIR/overview.yaml.bak"
```

You MAY add a `review:` mapping as a top-level YAML key (not a Markdown
section) — a structured summary only, no prose. Insert it before `phases:`
(the last section) so `phases:` stays last, matching every other task file.
Keys are flat (`critical`/`high`/`medium`/`low`, no `findings:` wrapper) —
this is the same shape `/caw-run`'s leader nests under `verify.review`, so
both paths describe review counts identically:

```bash
cat > /tmp/review-block.yaml <<'EOF'
review:
  verdict: blocked
  critical: 0
  high: 1
  medium: 3
  low: 5
  plan_amended: true        # set to true if reviewer added/changed phases above

EOF
awk -v newfile=/tmp/review-block.yaml '
  /^phases:/ && !inserted {
    while ((getline line < newfile) > 0) print line
    close(newfile)
    inserted = 1
  }
  { print }
' "$TASK_DIR/overview.yaml" > /tmp/overview.yaml.tmp && mv /tmp/overview.yaml.tmp "$TASK_DIR/overview.yaml"
rm -f /tmp/review-block.yaml
```

If the reviewer added a new phase (e.g. `webhook-security`), append it to the
end of the `phases:` list — `phases:` is always the last section, so a plain
append is a correct list insertion:

```bash
cat >> "$TASK_DIR/overview.yaml" <<'EOF'
  - id: webhook-security
    status: pending
    files: apps/api/src/webhooks/stripe.controller.ts
    depends_on: [<last phase>]
EOF
```

Update `next_phase` with `sed` the same way as `status` above if it changed.

## Output

Files written:
- `.claude/conductor/tasks/<task-id>/review.md` (must exist on disk and be re-read before any verdict — Step 6b)
- `overview.yaml` (review status — **not** when invoked from `/caw-run`; the leader writes it once)
- `plan.md` (if amended; with `## Revisions` entry)
- `.claude/conductor/tasks/<task-id>/test-matrix.md` (advance behavior `Status` on approval — harness contract)
- `.claude/conductor/test-matrix.md` (this task's index row — harness contract)
- `.claude/conductor/tasks/<task-id>/harness.md` (or `.claude/conductor/harness-backlog-misc.md`) + one `HB-NNN` index row in `.claude/conductor/harness-backlog.md` (only if friction was hit)
- `.claude/conductor/backlog.md` (new task row — only for pre-existing findings outside this task's diff)
