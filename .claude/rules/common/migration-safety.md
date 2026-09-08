---
paths:
  - "**/migrations/**"
  - "**/drizzle/**"
  - "**/supabase/**"
  - "**/prisma/**"
  - "**/schema.ts"
---
# Rule: Migration Safety — schema changes ship in order, with evidence

**Layer:** rules — non-negotiable project-wide convention.
**Used by:** planner (phase ordering), coder (writing migrations + `code.md`), reviewer (severity table below).
**Why this exists:** a migration and the code that depends on it are deployed by *different*
steps, and the order between them is decided at deploy time — after every caw gate has
already passed. Five deployed incidents in one reference project shared the same shape: the
ordering constraint was written correctly in prose (`code.md`, an ADR, a plan phase note) and
nothing mechanical enforced it. A drop shipped in the same release as its last reader; an
`ON CONFLICT` upsert shipped before the unique index it targets could apply; a backfill
folded case on one side while the read path still compared exactly; a column looked
reader-free because the ORM's bare `select()` hides column names from grep. Prose is not a
gate. This rule turns each of those into a required artifact or a required ordering.

---

## (a) Contract operations need a note AND evidence

Applies to `DROP COLUMN`, `DROP TABLE`, `ALTER COLUMN ... SET NOT NULL`, tightening a
`CHECK`, narrowing a type, adding a `UNIQUE` index over existing data.

1. The migration carries a first-line comment
   `-- expand-contract: <last reader removed in release X; safe to contract in release Y>`.
2. The task's `code.md` pastes the **real query and its result** against the target
   environment (or its latest snapshot) proving the operation is safe — e.g. `SELECT count(*)
   FROM t WHERE col IS NULL` before `SET NOT NULL`, `SELECT col, count(*) ... GROUP BY 1
   HAVING count(*) > 1` before a unique index, per-row values that differ from the new default
   before a `DROP COLUMN` that folds a setting into a parent. A sentence ("replacement already
   populated") is not evidence.
3. The contract migration ships **at least one release after** the release that removed the
   last reader. Same-release = old image serving new schema during rollout.

## (b) Value rewrites need a `-- semantics-change:` note

Any migration that rewrites stored values in place — `SET col = lower(col)`, `trim()`,
`upper()`, `replace()`, `regexp_replace()`, re-encoding, re-keying — changes what a stored
value *means* to every comparison that reads it.

1. First-line comment `-- semantics-change: <column(s)> <transform>` followed by a list of
   **every read path that compares that column** (file:line or function names), each marked
   `normalised` or `changed in this release`.
2. Those readers ship in the **same release** as the backfill. A reader that still compares
   exactly after the data has been folded returns a silent 0, not an error.

## (c) Code that targets a DB object ships AFTER the object is confirmed live

An index, constraint, column, or enum value that new code relies on (`ON CONFLICT (...)`,
a `WHERE` on a new column, a `NOT NULL` assumption) must exist on the target environment
**before** that code is deployed there.

1. In `overview.yaml`, the migration phase declares what it gates:
   ```yaml
   - id: migration-unique-index
     status: pending
     blocks_deploy_of: [re-enable-upsert]   # phase ids that must not reach a deploy branch first
   ```
   A phase listed in `blocks_deploy_of` may not be merged into a deploy branch while the
   gating phase is not `done` and confirmed applied on the target env (paste the confirmation
   — `\d table` / `SELECT indexname FROM pg_indexes ...` output — in `code.md`).
2. If both halves must ship in one release, the dependent code goes behind a flag that is
   flipped only after the migration is confirmed applied.
3. **Never bundle the dependent code into a hotfix with unrelated changes.** A "hotfix bundle"
   collapses the dependency graph the plan wrote down; split by dependency, not by convenience.
4. A migration that cannot apply because existing data violates the new constraint is a
   blocker for the dependent phase, not a note. Remediate data first, in its own phase.

## (d) Before dropping a column: grep the TABLE, not the column

Under an ORM whose bare `select()` expands to an explicit column list from the schema
definition (Drizzle, Prisma `findMany()` without `select`, Kysely `selectAll()`, ActiveRecord
`select *` semantics differ but the rolling-deploy hazard is identical), "no writer + no reader"
of the column name is **not** proof that no SQL names the column.

1. Grep for every bare select on the **table**: `db.select().from(<table>)`,
   `db.query.<table>`, `findMany(` / `findFirst(` on the model, raw `SELECT *`.
2. Each hit still emits the column name in generated SQL and will fail with
   `column "x" does not exist` when the old image meets the new schema during rollout.
3. Either convert every bare select to an explicit column list (release N) or keep the column
   and document why in the ADR. Paste the grep output in `code.md` either way.
4. If the column is a foreign key, confirm the referential action before relying on cascades — verify with `pg_constraint.confdeltype`, not with the ORM's declared intent.

## (e) Data-only backfills

Allowed, with two conditions: **idempotent** (re-running produces the same end state — use
`WHERE col <> lower(col)`, `ON CONFLICT DO NOTHING`, or a marker column) and **reversible or
documented** (a down migration, or a `-- irreversible:` first-line comment stating what is
lost and why that is acceptable). Large backfills batch by primary key range and never run
inside the same transaction as a DDL lock.

---

## Reviewer table

| Violation | Severity |
|---|---|
| Contract op without `-- expand-contract:` note | HIGH |
| Contract op with note but no query evidence in `code.md` | HIGH |
| Contract op in the same release as last-reader removal | CRITICAL |
| Value rewrite without `-- semantics-change:` read-path list | HIGH |
| Listed read path not shipped in the same release | CRITICAL |
| Dependent code phase not listed in `blocks_deploy_of:` of its migration phase | HIGH |
| Dependent code merged to a deploy branch while gating migration is unapplied | CRITICAL |
| Dependent code bundled into a hotfix with unrelated changes | HIGH |
| `DROP COLUMN` without table-level bare-select grep pasted in `code.md` | HIGH |
| Backfill not idempotent, or irreversible without `-- irreversible:` note | MEDIUM |
