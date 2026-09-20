# Step 6 — Update task files

> Canonical artifact contract extracted from agents/coder.md to keep the base agent prompt compact. The agent must read this file at the named workflow step.

### Step 6 — Update task files

Append to `.claude/conductor/tasks/<task-id>/code.md`:

```markdown
## Phase: <id>

**Rules read:** project.md (present | absent), <rule files from the Step 0 table that matched this phase>
**Skills loaded via Skill tool:** <comma-separated list of skill names you actually invoked Skill({skill:"…"}) for during this phase>; `skill <name>: UNAVAILABLE (<error>)` for any hint that failed to load

> Only list skills here if you actually called the Skill tool for them in this phase. If you skipped Step 3, write `none — Step 3 was skipped` and explain why. Never copy skills_hint verbatim without loading, and never omit a hint that failed — record it as UNAVAILABLE.

**Files changed:**

- src/.../<file>.ts (new)
- src/.../<file>.tsx (modified)

**Implementation summary:**
<2-3 sentence summary>

**API endpoints implemented:**

- POST /subscriptions ✓
- POST /webhooks/stripe ✓

**Self-verify gate:**

- Type-check: ✓ `pnpm tsc --noEmit` clean (+ test-file config: `tsc -p tsconfig.test.json --noEmit` clean)
- Lint: ✓ `pnpm lint` clean — name the exact command(s) CI runs (`biome check`,
  `eslint` + `format:check`, …); `n/a (no linter)` only if the project has no linter config
- Related tests: ✓ 12/12 passing — `vitest related <files>` (or `none present`)
- Deploy ordering: `blocks_deploy_of: [backend]` — migration applied on <env>, evidence: `<query + result>` (omit when the phase has no ordering constraint)

**Notes for next phase:**
<anything tester or next phase coder should know>

---
```

Update `overview.yaml` — **only if the Step 5 gate passed AND Step 6a has confirmed this phase's `code.md` section on disk**:

1. Find the entry in `phases:` matching this `id` and set `status: done`.
   If the gate did not pass, set `status: blocked` instead and stop here.
2. Bump top-level `updated:` to the current ISO-8601 timestamp.
3. If this was the last phase (all phases are now `done`), set top-level `status: code-done`.
4. Otherwise, set top-level `status: coding` (so the board reflects
   in-progress work, not `plan-done`) and `next_phase:` to the next pending
   phase (respect `depends_on`).

Use the Edit tool to make surgical changes to specific YAML keys — do NOT rewrite the whole file.

### Step 6a — Artifact gate (MANDATORY — blocks `done`)

Follow `rules/common/harness-contract.md § Artifact gate`. Artifact:
`.claude/conductor/tasks/<task-id>/code.md` must contain this phase's section
**on disk** before marking `done` — the Step 5 gate covers type-check, lint
and related tests, it does **not** cover this file. Re-check with
`grep -n "^## Phase: <id>" code.md` + `wc -l`. Only then update `overview.yaml`
and report. A phase marked `done` with no `code.md` section behind it is the
specific failure this gate exists to stop — it has happened, reconstructed by
hand days later.

### Step 6b — Harness contract (MANDATORY)

Per `rules/common/harness-contract.md`:

- **ADR for mid-phase architecture choices.** If, while implementing, you made a
  cross-cutting decision the Plan did not already cover (caching strategy, state
  library, error-envelope shape, a new external dependency), create an ADR:
  read `.claude/conductor/decisions/` for the highest `NNNN`, write
  `<NNNN+1>-<slug>.md` from `.claude/conductor/adr.md` with `Status: Proposed`.
  The reviewer will block an architecture change that ships without one.
  **Then append its row to `.claude/conductor/decisions/README.md`'s index in the
  same turn** (matching `### <Domain>` section, or a new one) — same requirement
  as planner's Step 6b, and the same reviewer-blocking finding if skipped.
- **Knowledge file.** If this phase surfaced something matching a trigger in `.claude/conductor/knowledge.md`'s own header, append a terse entry citing `(task-id, YYYY-MM-DD)`; respect the file's entry cap. The reviewer files MEDIUM if a qualifying entry is missing.
- **Harness backlog.** Friction (a missing convention, an ambiguous Plan field, a repeated workaround, a `skills_hint` that will not load) → write-up in `.claude/conductor/tasks/<task-id>/harness.md` (or `harness-backlog-misc.md` when not task-specific) + one row in `harness-backlog.md` per the HB protocol in `harness-contract.md`.

## Output

Files written:

- `.claude/conductor/tasks/<task-id>/code.md` (appended per phase; re-read from disk before `done` — Step 6a)
- `overview.yaml` (phase status update — only after Step 5 and Step 6a both pass)
- `.claude/conductor/decisions/<NNNN>-<slug>.md` (only for mid-phase arch choices — harness contract)
- `.claude/conductor/knowledge.md` (only for a qualifying entry — Step 6b)
- `.claude/conductor/tasks/<task-id>/harness.md` (or `.claude/conductor/harness-backlog-misc.md`) + one `HB-NNN` index row in `.claude/conductor/harness-backlog.md` (only if friction was hit)
- Project source files per phase
