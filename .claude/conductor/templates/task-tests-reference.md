# Step 4 — Update task files

> Canonical artifact contract extracted from agents/tester.md to keep the base agent prompt compact. The agent must read this file at the named workflow step.

### Step 4 — Update task files

Append to `.claude/conductor/tasks/<task-id>/tests.md`:

```markdown
## Test mode: <skip|full|all>

**Rules read:** project.md (present | absent)[, test-discipline.md]
**Skills loaded via Skill tool:** <comma-separated names you actually invoked Skill({skill:"…"}) for in this run>

> Only list a skill if you actually called the Skill tool for it. If Step 2 was skipped, write `none — Step 2 was skipped` and explain why.

### Tests written
- tests/api/subscriptions.e2e.spec.ts — 8 tests for backend phase
- tests/web/checkout.test.tsx — 6 tests for frontend phase

### Mock boundary
> One line per spec file (Step 2.5): what is real, what is mocked at the I/O boundary, and why.
- tests/api/subscriptions.e2e.spec.ts — real Nest app + real test DB (Tier-2: unique index scenario); Stripe SDK mocked at HTTP
- tests/web/checkout.test.tsx — real QueryClientProvider + store; `fetch` mocked via MSW with the captured `/checkout` payload

### Command + result
- `node_modules/.bin/vitest run <spec paths> --pool=forks --poolOptions.forks.maxForks=2` → 23 passed, 0 failed
- Tier-2: run (`DATABASE_URL` test schema) | not run — <why>

### Coverage
- Backend: 92%
- Frontend: 78%
- Overall: 85%

### Pass/Fail
- All 23 tests passing ✓

### Source fixes by tester
> Production-code edits the tester made during the in-agent fix loop (localized
> bugs only — see "Fix loop"). Empty if the tester only edited spec files.
- src/modules/tickets/repositories/tickets.repository.ts:88 — missing `deletedAt: null` filter in `findTrash`
- (re-ran type-check + lint on these files after editing — both clean)

### Skipped tests
- Frontend layout tests — handled by visual review

### System test (Tier-3)
<per-item pass/fail, "pending — user" with the exact action + expected result, or "skipped — no runtime surface">
```

Update `overview.yaml` — **top-level keys only**, and **not when invoked from
`/caw-run`** (the spawn prompt says so): the reviewer runs in parallel with
you, and two agents editing `overview.yaml` at once corrupt it. In that case
the orchestrator writes `status` and the `verify:` block once after both
agents finish; you write `tests.md` only. Otherwise, the `phases:` list holds
the coder's implementation phases; there is no test entry in it and the tester
never edits it:
1. Set top-level `status:` to `tests-done` (or `red-done` when only the red
   pass of lane=risky has completed).
2. Bump top-level `updated:` to the current ISO-8601 timestamp.

Use the Edit tool for surgical key updates — do NOT rewrite the full YAML.
`overview.yaml` is **pure YAML** — never append a Markdown section (`## Verify`,
`**Tests:** ...`, prose) to it; that breaks the parser and drops the task from
the backlog board. Test results, coverage, and pass/fail counts go in
`tests.md`, not `overview.yaml`.

### Step 4b — Artifact gate (MANDATORY — blocks the report)

Follow `rules/common/harness-contract.md § Artifact gate`. Artifact:
`.claude/conductor/tasks/<task-id>/tests.md` must exist on disk with the
Step 4 content before you report pass/fail counts. Re-check with `wc -l` +
`grep "^### Command"` for the command that produced the counts — never quote
a count you did not see a command produce (`harness-contract.md` § Claims).

### Step 5 — Update the test matrix (harness contract — MANDATORY)

Both files, per `rules/common/test-discipline.md` §4 (the single copy of the split rules):

**5a — `tasks/<task-id>/test-matrix.md`** — create from `.claude/conductor/task-test-matrix.md` if missing; one row per `test_scenario`; set the layer columns, `Status`, `Last validated`, `Evidence`.

**5b — `conductor/test-matrix.md`** — update only this task's one index row.

If you hit harness friction during the run, file it per the HB protocol in `harness-contract.md` (write-up in `tasks/<task-id>/harness.md` or `harness-backlog-misc.md`, one `HB-NNN` index row).

## Output

Files written:
- `.claude/conductor/tasks/<task-id>/tests.md` (must exist on disk and be re-read before any counts are reported — Step 4b)
- `overview.yaml` (top-level `status` + `updated` only — **not** when invoked from `/caw-run`; the leader writes it once)
- `.claude/conductor/tasks/<task-id>/test-matrix.md` (behavior-level coverage — harness contract)
- `.claude/conductor/test-matrix.md` (this task's one index row — harness contract)
- `.claude/conductor/tasks/<task-id>/harness.md` (or `.claude/conductor/harness-backlog-misc.md`) + one `HB-NNN` index row in `.claude/conductor/harness-backlog.md` (only if friction was hit)
- Project test files (`tests/`, `__tests__/`, `*.spec.ts`, `*.test.tsx`)

