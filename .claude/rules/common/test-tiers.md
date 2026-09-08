---
paths:
  - "**/*.test.*"
  - "**/*.spec.*"
  - "**/tests/**"
  - "**/__tests__/**"
---
# Rule: Test Tiers — mock-based by default, real-I/O declared & isolated

**Layer:** rules — non-negotiable project-wide convention
**Used by:** coder (writing tests inline), tester, reviewer.
**Why this exists:** when two test tiers (mock-based vs real-I/O) are silently mixed, a single
`test` run produces failures that look like one bug but are actually several distinct classes —
incomplete mocks hitting real services, shared-resource pollution, fixtures assuming the wrong
cascade behavior, and tests greened that should stay red. This rule makes the tier **explicit**
so those classes can't recur.

> **Provenance:** ported into caw from a real project (dava2) where a single test run had 70
> failures that were four distinct classes, all rooted in two tiers being silently mixed. The
> stack-specific examples below (Postgres / an ORM / vitest) come from that project — **replace
> them with your stack's equivalents** during `caw setup`; the *tier discipline* is universal.

---

## The two tiers

Every test that touches data or external I/O is exactly one of these. Decide which **before**
writing it.

### Tier 1 — Unit / contract (DEFAULT)

- **Hermetic**: never connects to a real database, queue, cache, or network. Runnable with no
  backing service up.
- Mocks the **entire** I/O-touching surface the code under test reaches — every repository/DAO
  function **and** every service that itself performs I/O.
- Runs on every commit.

### Tier 2 — Real-I/O integration

- Connects to a real local service (DB / queue / cache). Catches constraint / FK / partition /
  transitive-closure / serialization bugs that mocks cannot.
- Seeds its own fixtures and tears them down respecting the real constraint rules.
- Must be **declared** (a filename suffix like `*.db.test.*` / `*.integration.test.*`, or a
  test-runner project tag) so it is scheduled **separately** and a missing service never reads
  as "code broken".
- **Tier-2 needs its own CI job with a real database service.** Running Tier-2 files in a CI
  lane that has no database makes that job red permanently — and permanent red is worse than no
  job: the connection-refused noise hides genuine failures (a Tier-1 hermeticity leak, a timeout
  that kills the run before it reports). Either provision the service in the workflow and add a
  dedicated `test:db` step, or run Tier-2 locally only and say so explicitly — never fold the
  tier back into the default `test` command.

---

## Mandatory checks (coder + reviewer)

1. **No partial mocks (Tier 1).** If a handler/service gains a new I/O-writing dependency, its
   Tier-1 test **must** mock that dependency in the *same change*. A mock that covers one
   repository but leaves another live is a bug — the code will hit a real constraint and fail.
   - Quick check: run the single test file with the backing service **stopped**. A true Tier-1
     test still passes. If it errors on connection, the mock is incomplete.

2. **Fixtures respect real constraint rules (Tier 2).** Know your cascade behavior. If a foreign
   key is *not* `ON DELETE CASCADE`, teardown must delete child rows **before** the parent — do
   not assume "cascade handles it"; verify against the actual constraint.

   **No-leak rule — clean up EVERYTHING you insert, in the after-each / after-all hook, not just
   before-each.** A Tier-2 test must leave the resource exactly as it found it. Two failure modes
   leak rows indefinitely:
   - **Forgot the parent.** Cleanup deletes children but not the parent row it created → one
     leaked row per test per run, accumulating into the hundreds.
   - **before-each-only cleanup.** Cleaning shared fixtures only in before-each leaves the *final*
     test's rows behind after the suite. Mirror cleanup in after-each (per-test ids) or after-all
     (shared fixed ids).

   Prefer shared fixture helpers (a `createTestX()` / `deleteTestX()` pair that already deletes
   in constraint order). When you roll your own, scope every delete to the id you created — never
   a whole-table delete (that races other files).

   **Verify, don't assume:** run the file alone twice and count rows before/after — the count
   must be flat. A grep that finds a matching delete is not proof; wrong scope or wrong hook
   still leaks.

3. **Second entity must be seeded (Tier 2).** A Tier-2 test that inserts a row referencing a
   *second* parent (e.g. a second account/tenant) must create that parent via the real fixture
   helper, not a bare random id. A random id that isn't in the parent table violates the FK.

4. **Don't green a TDD-RED test.** If a failing test belongs to a feature that is intentionally
   RED (not yet implemented), it is **supposed** to fail. Making it pass by editing assertions or
   stubbing the module hides unfinished work. Leave it red; implement the feature. Reviewer raises
   this as a CRITICAL finding.

5. **Orphaned tests after a deletion.** When a module is retired, delete or rewrite the tests that
   import it in the *same* change. A test importing a deleted module is a load error that pollutes
   the suite and masks real red.

6. **Mock the live object, not the module, for singletons captured at import time.**
   Module-replacement mocks (e.g. `vi.mock("../db/client")`, `jest.mock(...)`) do **not** always
   replace the binding a repository/service captured when it was imported. The test file sees the
   mock, but the module under test still calls the real client → it silently performs real I/O
   with **no** error pointing at the mock (empty table → `0`, bad id → constraint error, etc.).
   Same trap for any client constructed at module load (`export const x = createClient(...)`).

   Fix: import the real object and spy its methods (`spyOn(db, "select")`,
   `spyOn(client.auth, "getUser")`). `spyOn` mutates the exact reference both the test and the
   module hold.

   Quick check: assert the binding matches the mock AND that the function actually calls the mock
   (call-count > 0). If the binding matches but call-count is 0, the module is using a different
   instance — switch to `spyOn`.

   **Same trap via an eager `setupFiles` import (vitest).** If the runner's `setupFiles` (or any
   global setup) has a top-level import of the app module, every module the app imports
   transitively (config/env, services, routes) is evaluated **before** an individual test file's
   own `vi.mock(specifier, factory)` is hoisted and registered — so that mock is a silent no-op
   and the module under test sees the real, unmocked config (symptom: a "not configured" error,
   or a real DB/network call using production-shaped values). Fix, same idea as above: for a
   single shared object export, import the real object and `Object.assign(obj, { KEY: "test" })`;
   for a module with named function exports, `import * as mod from "..."` +
   `vi.spyOn(mod, "fn")`, re-spied in `beforeEach`.

   Pure-data module mocks (an ORM's `eq`/`and` helpers, a schema module) are then unnecessary — the spied `select`/`insert` short-circuits before any SQL builds.

   **`clearAllMocks` vs `restoreAllMocks`.** Use `vi.clearAllMocks()` in `beforeEach` when other
   `vi.mock` factories must survive; `vi.restoreAllMocks()` also undoes every `vi.spyOn`,
   including module-level ones — which is why a spy must be re-created in `beforeEach`, not once
   at file top.

7. **Builtin / instrumented module namespaces need a seam.** For builtin modules (`node:tls`, …)
   or auto-instrumented ones (an APM/tracing SDK), neither module-replacement nor `spyOn` works —
   the namespace is non-configurable, so the real function runs and the test sees 0 mock calls.
   Fix: route the call through a thin **plain-object seam** the consumer owns, and spy that:
   ```
   export const connector = { connect: tls.connect };   // seam, 1:1 passthrough
   // test: spyOn(connector, "connect").mockImplementation(...)
   ```
   Keep the seam a pure passthrough — no added logic, especially on a hot path.
   Switching the consumer to `import * as ns from "node:tls"` does **not** make the namespace
   spyable — the seam is the only fix. Re-spy the seam in `beforeEach` (a module-level `spyOn`
   is undone by an `afterEach` `restoreAllMocks()`).

8. **"Passes in isolation" does NOT prove "doesn't leak".** Verify with a count/audit, not
   pass/fail.** A Tier-1 test whose mock leaks can still go green — it hits the real service and
   reads/writes real seed rows that happen to satisfy the assertion. Leaks can fire only under
   **parallel** runs (mock hoisting differs vs running the file alone), or the leaked row gets
   self-cleaned within the test so the count looks flat, or the assertion accepts the success code
   and masks an unexpected write.
   Reliable detection — measure the **delta**: count rows before, run the **whole** unit project
   (to surface parallel-only leaks), re-count. Any non-zero delta = a Tier-1 file is writing real
   rows. To pin the file when isolation hides it, add a temporary audit trigger that logs inserted
   keys, run the full project, read the audit table.

9. **Bulk / multi-row INSERT that scales with user data needs a Tier-2 test at the real batch
   size.** Postgres caps a single statement at **65 535 bind parameters** (rows × columns). A
   mocked repository accepts an array of any length, so no Tier-1 test can ever hit that ceiling
   — only a real insert at (or near) the maximum batch the production path can produce does.
   Assert that **every** row lands (count after == count before + N), not merely that the call
   resolved. If the write is a DELETE-then-INSERT replace, both statements must run in **one
   transaction**: a chunked INSERT that fails halfway after an unconditional DELETE leaves the
   table partially empty, and the test must prove the rollback.

10. **A column backed by a DB `CHECK` constraint or enum has two sources of truth.** Widening
    the Zod / TS enum does **not** widen the constraint. The change that adds a value must
    (a) widen the `CHECK` / DB enum in the **same migration**, and (b) add a Tier-2 guard test
    that inserts the new value against real Postgres. A Tier-1 test with a mocked repository
    accepts the value the moment the Zod schema does and stays green while production rejects
    the row. See the `runtime-smoke-test` skill, Bug class H.

11. **Read-then-write on a shared table reached from a concurrent path needs a concurrency
    scenario AND a unique constraint.** If a write primitive is reachable from ingestion, a
    webhook, a queue consumer, or any path that can run twice at once, "check if exists, then
    insert" is a race — two callers both see "absent" and both insert. The test must launch the
    writes concurrently (`Promise.all` of ≥ 2 identical calls) and assert exactly one row. The
    invariant must be backed by a **unique constraint / index** (with `ON CONFLICT` or a caught
    unique-violation), never by application logic alone; a Tier-2 test proves the constraint
    actually exists.

12. **`vi.mock()`-ing an entire service module means that module is NOT under test.** Every
    line inside it is unexercised — field mapping, defaults, snapshot/seed helpers. For any
    creation/update path, at least one test must send the **real payload shape the client
    sends** (copied from the client's submit code or a captured request, not from the server's
    own type) through the real module with only the persistence layer stubbed. A snapshot/seed
    helper that silently dropped one field was invisible to every happy-path test because the
    whole service was mocked and the fixture was hand-written to the server's type.

---

## Triage protocol when the suite is broadly red

Before "fixing" anything, classify each failing file — the fix differs per class:

| Symptom | Class | Action |
|---|---|---|
| `expected <error> to be <success>`, error mentions a real constraint / FK | Tier-1 partial mock | Mock the missing service/repo |
| Connection refused / all integration tests fail at once | Backing service not up | Start it (never wipe/reset a shared service without asking) |
| `Cannot find module '../X'` | Orphaned test or RED feature not yet coded | Check status; delete orphan or leave RED |
| Wrong status / `TypeError` not the expected typed error | Feature stub / RED task | Check status; do not green |
| Assertion on business behavior | Possible test-vs-spec drift | Confirm against spec before editing — don't assume the test is right |
| Mocked count returns `0`, or a value "valid" in setup is rejected, in a module-mocked unit test | Module-mock binding leak (check #6) | Switch module-mock → `spyOn` on the real exported object |
| Local resource keeps growing across runs | Tier-2 leak — cleanup misses the parent or runs only in before-each (check #2) | Add parent cleanup in after-each/after-all, child-rows-first; verify count flat across two runs |
| Local resource grows **only** when running the full unit suite, not the file alone | Tier-1 parallel-only leak (check #8) — "passes in isolation" ≠ "doesn't leak" | Measure delta / add audit trigger to pin the file, then `spyOn` the write |
| `spyOn` throws "namespace not configurable" (builtin/instrumented module) | Builtin/instrumented namespace (check #7) | Add a plain-object seam and spy that |
| A `vi.mock("../config/env")` (or any module) override never takes effect in a test that loads the app; values read back as real/default | `setupFiles` eager import evaluated the module before the mock was hoisted (check #6) | Drop the `vi.mock`; import the real object + `Object.assign`, or `import * as mod` + `vi.spyOn` re-spied in `beforeEach` |
| A file fails on connection in the unit lane / CI, and it is named `*.test.*` instead of `*.db.test.*` (or lacks the Tier-2 project tag) | Tier-2 file declared as Tier-1 — runs in the wrong lane | Rename / tag it so the runner schedules it with the DB lane; never "fix" it by adding mocks |

---

## Test-output hygiene — silence expected-error logs

Tests that exercise expected-error paths (401/400/stub) make the handler log full stack traces,
flooding output and burying real results. Set the app's log level to silent in the test env via
the runner's config (`vitest.config.ts` → `test.env`), which is applied *before* the app module
loads — **not** by assigning `process.env` in a setup file, which is too late once ESM hoists the
app import above it. Keep it shell-overridable for debugging. Do **not** silence by deleting log calls — production needs them; only the test env is
muted.

---

## When this rule does not apply

- Frontend/UI tests and edge-runtime tests have their own topology (jsdom / a worker emulator);
  this rule targets server/data tests. Apply the analogous "declare + isolate real I/O" discipline
  there.
- One-off scripts run manually, not in the suite.
