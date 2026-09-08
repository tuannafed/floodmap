---
paths:
  - "**/plan.md"
---
# Rule: Plan Discipline — what every `plan.md` must carry

Auto-loads for whoever reads or edits `plan.md` (coder, tester, reviewer). The **planner `Read`s this file in Step 0** — it creates `plan.md` with `Write`, which never triggers a `paths:` rule. Task status, ADR triggers, the HB protocol and the claims contract are in `harness-contract.md`; this file is the plan-specific layer.

## 1. Spec mandate (keystone)
Every `plan.md` for a feature/bug task **MUST** open with a `## Spec mandate` section
containing, for each phase, a **verbatim quote** from the source spec with
`file:line` citation. No quote → no plan approval.

**Lookup helper (if the project has a spec index):** Many projects keep a spec *index*
(one line per section + line range) so the planner reads ~150 cheap lines to find which
section backs a task, then reads only that range from the full spec to copy the verbatim
quote. If your project has one, cite the index path in `.claude/rules/project.md` and use it; don't
load the whole spec to write one plan.

Each item in `## Spec mandate` falls into exactly one of three classifications:

- ✅ **SPEC-BACKED** — a quotable spec sentence justifies the item. Quote it.
- ⚠️ **INFRA-CHOICE** — not in spec, but a defensible implementation detail
  (build strategy, auth mechanism, retention policy, deploy target, test framework).
  Must explain *why this is implementation and not feature*.
- ❌ **FABRICATED** — neither spec-backed nor a defensible infra choice. **Disallowed.**
  Either find spec backing, reclassify as infra (with justification), or remove from plan.

A plan that mixes ✅ and ⚠️ items is normal. A plan with even one ❌ item is rejected.
### Template
```markdown
## Spec mandate

**Source spec:** <path/to/spec.md> (and any cross-referenced specs)

### Phase: <task-id>
Classification: ✅ SPEC-BACKED | ⚠️ INFRA-CHOICE
Spec section: §<N.N>
Verbatim quote:
> "<exact spec text>"
File:line: <path/to/spec.md>:<line>

[OR for INFRA-CHOICE:]

Classification: ⚠️ INFRA-CHOICE
Why infra (not feature): <one-sentence justification>
Example: "Auth mechanism for service↔service calls. Spec §X mandates the call exists but
doesn't specify auth shape. Standard internal-service auth is implementation detail."

[Repeat for every task]
```

If multiple tasks are backed by the same spec section, list each task under the same
section heading rather than duplicating the quote.
### Anti-patterns
1. **"Plan addresses §X"** — too vague, no quote. The spec might not say what you think.
2. **"Per ADR-NNNN" alone** — the ADR itself must trace to spec or be infra-choice. An ADR
   chain doesn't substitute for a spec quote.
3. **Defer a spec mandate without escalation.** If a spec mandate is deferred, `## Spec mandate`
   must show the verbatim quote AND an explicit deferral line:
   `**Deferred per:** <user-quote or follow-up-task-id>` — a **user-provided** line, not an
   agent decision.
4. **Epic number first, scope second.** If the task title is `task-vX.Y-NNN-eN-foo` and there's
   no spec section for "eN foo", the task is fabricated. Rename or cancel.
5. **Out-of-scope spec section cited as in-scope.** If the section is titled "Out of scope (v1)"
   or marks the item as a later version, citing it as backing for the current task is
   fabrication, not citation.
6. **Release-plan / version-draft documents cited as spec.** Files under a `versions/`,
   `roadmap/`, or `release-plans/` folder are early drafts of *what might ship when*; they may
   list scope the product spec never authorized. They are NOT a source of truth — cite the
   product spec only.
### When the task comes from client feedback
Feedback is the spec: quote the client's or user's words verbatim with a source (message date, ticket id) under `## Spec mandate`, classify it like a spec quote, and load `Skill({skill: "feedback-traceability"})` for the full quote-back template. Paraphrased feedback is fabrication.

### Example — accepted
```markdown
## Spec mandate

**Source spec:** docs/specs/widgets-spec.md

### Phase: backend-test-endpoint, frontend-test-panel
Classification: ✅ SPEC-BACKED
Spec section: §6.6
Verbatim quote:
> "On the Widget Settings page, surface a 'Test a URL' panel: input field for any URL;
> output: which rule matched, the parsed attribution, and the final destination."
File:line: docs/specs/widgets-spec.md:412

### Phase: integration-test
Classification: ⚠️ INFRA-CHOICE
Why infra (not feature): test coverage is engineering rigor per project conventions, not a
customer-visible behavior the spec requires.
```
### Example — rejected (out-of-scope section cited as backing)
```markdown
### Phase: pattern-detector
Classification: ✅ SPEC-BACKED
Spec section: §12
> "Out of scope (v1): regex matching, multi-rule attribution, A/B testing, geo routing"
File:line: docs/specs/widgets-spec.md:790
```

§12 explicitly *excludes* this work; quoting it as backing is fabrication, not citation.
Rejected.
### Projects without a written spec
This rule assumes a durable product spec exists. If a project has no spec yet, the keystone
discipline still applies in a degraded form: every task must cite **some** durable source of
truth — a user-approved intake record, an accepted ADR, or an explicit user instruction quoted
verbatim. "The agent decided it would be good" is never sufficient backing. Stand up a spec (or
at least an intake doc) as soon as the project has real product scope.
### When §1 does not apply
- **Pure infra tasks** (devops scripts, CI workflows). If the *entire* task is INFRA-CHOICE,
  `## Spec mandate` can be a single block:
  `Classification: ⚠️ INFRA-CHOICE (entire task)` + justification. Just don't pretend it's
  spec-driven.
- **Tasks of `type: chore`** (refactors, lint fixes, dep bumps). These need a "why now"
  reason, not a spec mandate.
- **Bug fixes triggered by runtime errors**, not new feature work. Cite the bug report or
  runtime smoke incident instead of spec.

## 2. Consumers — enumerate before you hypothesise

If the task changes a **shared file** (helper, repository, service, schema, config, a 401/error/logging primitive) or the **scope of a shared concept** (what a column means, how a value is normalised, what "active" filters on), the plan carries a `## Consumers` block **before** `## Challenge`, built **before** any root cause is proposed. Most severe defects are *absences* — a consumer nobody updated — and an absence has no string to grep for, so a hypothesis-scoped search structurally cannot find it.
- **E.1 Enumeration first, hypothesis second.** When investigating a concept (a shared table, a
  write primitive, a metric, a config value), the first tool calls build the closed set before any
  theory of the cause exists: every **writer**, every **reader**, every **definition** (the same word
  computed independently in more than one place is the norm, not the exception), every **trigger**.
  Paste that list into the report or plan *before* the analysis. If a later pass adds a row, the
  enumeration was not closed — say so.
- **E.2 Enumerate with more than one syntactic form.** Cover at minimum the aliased import, the
  unaliased import, raw SQL, and any dynamic/string form. E.1's list is "closed" only once each Part
  B blind spot has been considered. Reading Part B is not the same as running it.
- **E.3 Measure the share before naming a cause.** Do not report "X is the cause" until you know
  what fraction of the observed effect X explains. A cause that sounds explanatory can have a share
  of zero. If the share cannot be measured, say "candidate cause, share unmeasured" — never "the
  cause".
- **E.4 Every investigation report carries a "Not checked" section.** State what was NOT examined
  and what evidence would falsify the conclusion. A report without this reads as exhaustive whether
  or not it is.
- **E.5 When a reopened investigation finds something new, say why.** "Another miss appeared" is
  data about the method. Name which of E.1–E.3 was skipped. If the answer is "there is no single
  source of truth for this concept", that is a structural item for `harness-backlog.md` or an ADR —
  hand re-enumeration is not a durable control.

### What counts as a consumer
- A reader or writer of a shared table/column — including a column with no canonical definition
  that is compared raw at many sites (the purest form: no shared thing to drift *from*).
- Every call site of a shared write/lock/transaction primitive (advisory lock, UPSERT helper) —
  not only the one the incident names.
- Every site following a shared *library convention* the type checker cannot see (e.g. a logger's
  reserved key for serializing an Error).
- Every app that wires the same exported client primitive (a 401 handler, an interceptor). "Each
  app wires it itself" is the drift, not the design.
- Every independent implementation of the same seed/snapshot logic targeting the same shape.
- Every consumer of a cache key / query key.
- Every copy of a duplicated UI primitive across sibling apps.
- **The investigation itself** — E.1 above.

### The block
The pasted output of two searches, not a summary (the planner runs them with the Grep tool):
1. every symbol the touched file exports (`grep -n "^export " <file>`);
2. every file in the **whole repo** — apps, packages, scripts, seeds, migrations, tests — naming those symbols **or the table / column / concept** (`grep -rl`). Enumerate by column / table / concept, not only by function name: a sibling that inlines its own query never calls the helper, and a function-name grep once found one consumer where the column had seven.

Then mark **every** consumer as one of:
- `cut-over` — this task moves it to the new behaviour (name the phase)
- `on-hold` — deliberately left on the old path (name the follow-up task or ADR that closes it — "later" is not a value)
- `unaffected` — computes a different concept, with one line saying why

A consumer you cannot classify is a Gap. The reviewer re-runs the searches and files HIGH for any consumer the list missed.

### Also
- When an ADR defers a cutover ("some consumers on the old path, some on the new"), it MUST list
  every consumer under `consumers_on_hold:` / `consumers_cut_over:`. Reviewer diffs that list
  against a fresh `git grep` of the table/module name before approving any task that touches one.
  A comment at a single call site is not a project-visible list.
- When a fix lands in a file that has a twin (a sibling app, a duplicated primitive), grep every
  sibling root before calling it done. A review whose greps are all scoped to one app is the tell.
- When the fix is "consolidate the rule into one helper", that closes the *instances*, not the
  class — nothing stops the next call site from bypassing the helper. Pair it with a static gate.

## 3. Deploy order
When a phase's code is only safe after a DB object is live, prose does not satisfy it: set `blocks_deploy_of` in `overview.yaml` and gate the code behind a flag or a separate deploy so ordering is mechanical. The rule and the ADR `deploy_order:` field are `migration-safety.md` §c — read that file whenever the task touches a migration, table, column, index, enum/CHECK or view.

## 4. Tier-2 scenarios are plan-time decisions
A bulk / multi-row INSERT, a widened enum backing a DB column, a write relied on for uniqueness, a migration that rewrites stored values — each needs a `test_scenario` that only a real database can run (a mock has no bind-parameter ceiling, no CHECK constraint, no unique index, no concurrency, no existing data). The exact checks are `test-tiers.md` #9–#12. Put the scenario in the plan; the tester cannot invent it later.

## 5. Challenge obligations
- Every HIGH risk in `## Challenge` produces ≥ 1 `test_scenario`.
- Every `pipeline-postmortems.md` row whose table/module matches this task becomes a risk row citing the postmortem id.
- An architecture choice needs an ADR **and** its index row in the same turn (`harness-contract.md` § ADRs).
- Lane is decided by blast radius per `agents/planner.md` § Lane; `risky` needs user confirmation and is never auto-downgraded. `intake.md` and `backlog.md` point here, not the reverse.
