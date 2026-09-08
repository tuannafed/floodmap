---
paths:
  - "**/tests.md"
---
# Rule: Test Discipline — what every `tests.md` must carry, and the runtime smoke gate

Auto-loads when the tester reads `tests.md` before appending (re-runs) and for the reviewer. On the **first run `tests.md` does not exist yet — the tester `Read`s this file itself**. Mock-boundary rules and runner gotchas for the test files themselves are `test-tiers.md` (auto-loads on any `*.test.*`). Status, HB, claims: `harness-contract.md`.

## 1. Mode follows lane
| lane | mode |
|---|---|
| `tiny` | skip — append "skipped per plan" to `tests.md`; no test-matrix file |
| `standard` | backend tests after implementation; mobile = unit only |
| `risky` | red first (failing tests for every phase before the coder), then green |

## 2. What `tests.md` must contain
Test mode · `Rules read:` · `Skills loaded via Skill tool:` (only those invoked) · tests written (files) · **Mock boundary** — what was mocked and what was real; a whole-module mock of the module under test means it was not tested · **Command + result** — the exact command line and counts copied from its output (a count with no command is a claim without evidence) · coverage · source fixes made by the tester · skipped tests with reason · `## Runtime smoke` (§5) when it ran.

## 3. Artifact gate
`tests.md` is on disk and non-empty **before** any count is reported. Reply text is discarded.

## 4. Test matrix — the split, single copy
- `tasks/<id>/test-matrix.md` — behavior-level detail for this task, **one row per `test_scenario`** (not per test case; a scenario with 20 cases is one row). Create it from `conductor/task-test-matrix.md` if missing. Columns `Unit` / `Integration` / `E2E` = `yes` only for layers that ran and passed this round; `Status` = `implemented` (green) or `in_progress` (red phase); `Last validated` = today; `Evidence` = test file path(s). Skipped behaviors still get a row with the reason in `Evidence`.
- `conductor/test-matrix.md` — the project-wide **index**: update only this task's one row (`Behaviors` count, lowest `Status` across the task, latest `Last validated`, `Detail` link). **Never add behavior-level rows** to the index — it grows one line per task and must stay that way.
- The reviewer advances `Status` to `implemented` on approval and syncs the index row.

## Tier-2 limits a mock cannot see
A mock has no bind-parameter ceiling, no `CHECK` constraint, no unique index, no concurrency and no existing data. Bulk INSERT at the real batch size, an enum widened without its DB `CHECK`, uniqueness under two concurrent writers, a value-rewriting migration — each needs a real-database test; the exact checks are `test-tiers.md` #9–#12. When you find a new runtime behaviour a mock cannot represent, add it to `test-tiers.md`, not only to this task.

## 5. Runtime smoke — lanes `standard` / `risky` with a runtime surface, LOCAL ONLY
After the green run, if the task touches an HTTP route, DB schema, worker / edge code, env config or a response schema: run this checklist against **local** services only and record pass/fail per item under `## Runtime smoke` in `tests.md`. A failure is a BLOCKER — fix, add a contract test that loads the real app chain (mock only persistence), re-run. Load `Skill({skill: "runtime-smoke-test"})` for the bug-class library that says what each step is looking for.

- ❌ Never reset / wipe / truncate a **shared** database, restart a shared service, or point a test domain at a shared environment. Read-only post-deploy checks are in the skill.

> ⚠️ **Required ≠ pre-authorized.** Even when this rule says a reset is *required*, the agent
> still asks the user for explicit confirmation before **every** `supabase db reset` /
> `prisma migrate reset` / equivalent — the user's global destructive-ops rule applies to local
> data too, and a yes for one run does not carry forward. This section only tells you *whether*
> a reset is needed; it never substitutes for asking. A subagent once read the word "mandatory"
> here as permission and wiped a local DB unattended.

| Task touches | Local DB reset |
|---|---|
| New migration file | **Required** — proves migrations apply on top of the seed |
| Schema column added / dropped / nullability changed | **Required** |
| Seed file edited | **Required** — proves the seed still parses and commits clean |
| Route / handler / request schema only | Optional — skip if local data is in use; `INSERT … ON CONFLICT DO NOTHING` the fixture |
| Worker / frontend / docs / config only | Skip |

1. **Database** — migrations + seed apply clean; no constraint violation.
2. **Backend boots** — reaches "listening" within ~20 s; no env-validation or plugin error.
3. **Edge / worker** (if touched) — reaches ready; secrets loaded; no "invalid URL undefined".
4. **Service↔service happy path** — one real request per touched surface with realistic headers; expected status + headers (a serialization error = response shape vs schema, usually a Date or a nullable).
5. **Fire-and-forget side effects** — trigger the async write, then read the store: the row lands within seconds and holds the value the user actually received.
6. **Dashboard / UI surface** — renders with data, no error toast, no 500 underneath.
7. **Frontend form** (if changed) — valid submit succeeds; tab/mode switches keep filled fields; validation errors render inline (a 400 is usually `""` vs `null`).
