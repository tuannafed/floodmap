---
paths:
  - "**/review.md"
---
# Rule: Review Discipline — what the reviewer enforces, and how any agent writes a claim

The **reviewer `Read`s this in Step 0** (it writes `review.md` with Bash, which never triggers a `paths:` rule). Other agents get §A–C when they read a `review.md`. Ownership, status, ADR triggers and the HB protocol are in `harness-contract.md`; the plan's obligations are in `plan-discipline.md`.

## Enforcement table — the single copy

Every severity the reviewer files for a harness obligation comes from here. Genuine governance is CRITICAL / HIGH; hygiene is MEDIUM / LOW — keep the harness alive without turning it into a bureaucracy gate.

| Missing / wrong | Severity | Effect |
|---|---|---|
| `## Spec mandate` section missing from `plan.md` (feature/bug tasks) | `CRITICAL` | Task does not approve. Planner adds verbatim spec quotes per `plan-discipline.md` §1. |
| A phase in `plan.md` has no entry in `## Spec mandate` | `CRITICAL` | Task does not approve. Cite spec, classify as INFRA-CHOICE with justification, or drop the phase. |
| A `## Spec mandate` item classified ❌ FABRICATED | `CRITICAL` | Disallowed. Re-scope or remove the phase. |
| ADR for an arch change in **auth, data integrity, external contracts, or public API** | `CRITICAL` | Task does not approve. Add the ADR, re-review. |
| ADR for any other arch change | `HIGH` | Task does not approve until the ADR is added. |
| `## Spec mandate` cites a spec section that contradicts the plan (e.g. a section titled "Out of scope") | `HIGH` | Reviewer rejects, quoting the contradiction. |
| Deferral of a spec mandate without a user quote | `HIGH` | Re-add as a blocker, or escalate to the user for an explicit deferral. |
| A cited function/table/column name, `file:line`, or count in `plan.md`, an ADR, or `review.md` does not match the actual codebase (per §A–C below) | `HIGH` — `CRITICAL` if the wrong claim hides an auth or data-integrity gap | Task does not approve. Author re-verifies with a fresh grep/read and corrects. |
| A correction applied in one doc leaves the old claim in place in a sibling doc (a duplicated fact, a stale pre-condition in another ADR) | `HIGH` | Reviewer greps for the old string across related docs; author closes every location, not just the one flagged. |
| An agent reported a verdict / counts but its artifact (`code.md` / `tests.md` / `review.md` / `verify.md`) is **not on disk** — the content went into the reply instead | `HIGH` | The push did not happen. Content in a reply is discarded; the next agent reads the file. Send the agent back, or write the file and say so. |
| `## Spec mandate` item classified ⚠️ INFRA-CHOICE without a "Why infra" line | `MEDIUM` | Add the one-sentence justification before approval. |
| `tasks/<id>/test-matrix.md` row missing for a tested behavior | `MEDIUM` | Reviewer fills the placeholder before approval. |
| A new ADR was created this task but `decisions/README.md`'s index has no row for it | `MEDIUM` | Reviewer adds the row before approval — an index that only tracks ADRs created before some cutoff date is worse than no index, because it looks current. |
| A production hotfix shipped with no `pipeline-postmortems.md` entry | `MEDIUM` | Reviewer adds the entry (or requires the author to) before approval — this is how `## After a severe defect` below stays current for the next agent. |
| A `harness-backlog.md` Items row or `test-matrix.md` Detail cell exceeds ~1 sentence of inline prose (see "One line is a hard limit" above) | `MEDIUM` | Reviewer trims the cell to a pointer and moves the prose to the linked detail file, or asks the author to. |
| A `harness-backlog.md` Items row has no `HB-NNN` id or no `target` | `MEDIUM` | Reviewer assigns the next free id / fills the target before approval. |
| `harness-backlog.md` entry missing despite obvious friction | `LOW` | Suggested cleanup, non-blocking. |
| `## Spec mandate` quote present but `file:line` missing or unverifiable | `HIGH` | Planner cites the line, or the item is re-classified. |
| Item classified ⚠️ INFRA-CHOICE but is clearly a business feature | `HIGH` | Re-classify; find spec backing or drop the phase. |
| Task touches a shared file/concept and `plan.md` has no `## Consumers` block, or the block misses a consumer your own grep finds | `HIGH` | Amend the plan (`## Revisions`); the fix is incomplete until every consumer is classified. |

"One line" in an index cell is a **hard limit, not a guideline** — a paragraph duplicated from the linked detail file is the MEDIUM above. The reviewer **MAY** quote the spec back and require a revision; it **MUST NOT** invent spec backing on the planner's behalf — that makes the reviewer a second fabrication source.

## A. Before writing a specific claim

| Claim | Verify with | Don't do |
|---|---|---|
| "Function `X` does this" | `Grep` the exact name; if citing behavior, `Read` the body | Paraphrase from an earlier summary in the conversation |
| "`file.ts:123`" | `Read` that exact line right before citing it | Estimate the line from a stale mental model |
| "N functions/files/references match" | Run the grep, count the real output (occurrences, not lines) | State a round number that "feels right" |
| "No other place does X" | `Grep` across all relevant directories and sibling apps | Assume absence because you did not happen to see it |
| "This table/column doesn't exist yet" | `Grep` the schema for the exact name, including spread/mixin helpers; or query `information_schema` | Assume from the feature not being in the spec |

If a grep comes back empty and you expected a hit, that is itself information — say so ("grepped
for X, zero matches, likely renamed to Y" or "confirmed absent") rather than silently substituting a
plausible-sounding name.

## B. Grep has blind spots — account for them

A literal-string grep catches one syntactic form. The same fact can be expressed several ways, and
an incomplete search reads exactly like a complete one — nothing marks it as partial. Before
trusting a zero or a count as final, ask what other forms the reference could take:

- **Qualified read vs. unqualified write.** `table.column` in a `SELECT`/`WHERE` matches
  `grep "table\.column"`; an ORM `.update(table).set({ column })` omits the prefix and is invisible
  to the same grep.
- **Aliased imports / destructuring.** `import { foo as bar }` or `const { status } = row` — a
  search for the original name misses the alias.
- **String literals vs. enum/const references.** `"pending"` vs. `Status.PENDING` — grepping one
  misses the other.
- **Generated/derived code.** ORM query builders and schema-inferred types synthesize symbols that
  are not textually present. Worked example: a column was declared droppable because "no writer, no
  reader" by column-name grep — but the ORM's bare `db.select().from(<table>)` compiles to an
  **explicit column list from the schema definition**, not `SELECT *`, so every bare select still
  named the column in emitted SQL. Before dropping a column, grep the **table** for bare selects and
  relational-API reads, and confirm with the query builder's `.toSQL()` (or equivalent).
- **Spread / mixin definitions.** A column declared via `...timestamps` or a shared column helper
  does not contain the column's name at the declaration site. "The column does not exist" must be
  proven by reading the spread source or asking the database, not by grepping the table file.

When you report a search, name what you searched for and, if the claim is load-bearing (an ADR
decision, a security conclusion, a "safe to skip"), name what *else* you considered searching for
and ruled out. A reader should be able to spot an incomplete search from the report alone.

## C. Responding to audit or correction feedback

When a human or reviewer points at an existing `plan.md`/ADR/harness doc and says "this is wrong":

1. **Read the complete file(s) first.** Not a grep for the section — the whole file. A correction
   applied blind risks contradicting or duplicating content elsewhere in the same document.
2. **Apply the correction surgically**, consistent with what is already there. Do not rewrite
   unrelated sections. Do not leave the old wrong content beside the new in a normative section.
3. **After editing, grep for the old/wrong string(s)** across every file that could contain them (a
   `plan.md` and its ADR often duplicate a fact). The match count outside an explicit `## Revisions`
   entry must be zero.
4. **Report the verification, not just the fix.** "Fixed it" is not verifiable; "grepped for `<old
   name>` and `<old count>` across both files, zero matches outside Revisions" is.
5. **When the trigger is a later event elsewhere** — a new ADR, a revert, an amendment to another
   task — do not stop at the doc the human pointed at. Grep every other doc asserting the same
   now-outdated fact: a pre-condition list naming a component another task unwired, a "N of M
   pre-conditions met" line, a risk row citing a reversed decision.

Matching the rigour the requester used to find the problem is what closes the loop. A confident
"done" without evidence has to be re-verified from scratch by the same person — the exact failure
this rule exists to stop.

## D. Relationship to the harness contract

`harness-contract.md` defines *what* must be
pulled and pushed (ADRs, test-matrix, harness-backlog, task files) and
the failure-mode table for when a push is *missing*. This file's §A–C is the
layer under that: it governs whether a push that *did* happen is
actually correct. A plan/ADR that technically exists but contains a
fabricated function name or an uncounted edge case still fails the
harness's purpose — it just fails quietly instead of tripping the
"missing artifact" check.

Concretely: every time you finish a `## Spec mandate` citation, an
ADR's "Context"/"Decision" section, a risk row naming specific
functions, or a `code.md`/`review.md` entry citing file:line evidence —
that's this rule's scope, not just harness-contract's existence check.

Part 0 sits outside that relationship entirely: `harness-contract.md`
has nothing to say about a reply typed into chat, and no reviewer ever
sees one. There is no gate behind Part 0 — the only enforcement is the
author checking before sending, which is exactly why a real session
produced four wrong claims in a single session without tripping
anything.

## After a severe defect

A CRITICAL/HIGH defect that reached a deployed environment (or was one skipped check away) is closed only when the **class** is closed, not the instance.

**The rule:** this is a process observation that changes what "closing" an incident means.
- When you fix an incident, ask explicitly: *is this the first time this shape has occurred, or the
  second?* Check this file and `pipeline-postmortems.md` first.
- If it is a recognizable recurrence, the fix is incomplete until the rule is generalized to cover
  the **class**, not amended to cover the one new instance. Do not wait for a third occurrence.
- A fix shaped as "add an exemption" has not closed the class. Ask how many exemptions this makes
  and what stops the next one.
- When the same class is fixed at two or more sites, ship a static gate for the class (a CI grep
  or lint), not a longer comment.
- Generalize at the rule that already owns the principle. Example: "no writer, no reader" concluded
  from grepping a column name, when the ORM's bare select expands to an explicit column list, is
  §B's blind spot — generalise at the rule that owns the principle.

When you find one:

1. Append it to `.claude/conductor/pipeline-postmortems.md` — Part A if it reached a deployed
   environment, Part B if it was caught pre-ship by an out-of-band audit rather than a standard
   gate — using that file's entry format, in the **same PR** as the hot-fix.
2. Update the summary table in the same edit.
3. Name the class in the entry's `Pattern:` field: consumers drift (`plan-discipline.md` §2), a Tier-1 mock hid a DB/runtime limit (`test-discipline.md` § Tier-2), or a rule that only tightened after the second recurrence (this section). A genuinely new class gets its own section in the owning discipline file.
4. Apply Pattern 3 to the fix itself: first occurrence or recurrence? Instance fix or class fix?

## Self-check before declaring a doc or amendment done

- [ ] Every symbol I wrote was grepped or read in this turn, not recalled.
- [ ] Every count came from counting real tool output.
- [ ] Every "no other place does X" claim used a search broad enough to rule it out, with at least one alternate syntactic form.
- [ ] If a correction: I read the whole file first, grepped for the old content afterward, and can state the match count.
- [ ] If the trigger was a later change elsewhere: I grepped other docs for the same outdated fact.
- [ ] My final report states what I verified and how — not just that I finished.
- [ ] Observation and inference are separate sentences — "0 rows returned" and "the write path is broken" are two claims, not one.

> Provenance: distilled from real incidents in a production project — a planner cited a function that did not exist; docs kept asserting facts a later ADR reversed; "data is lost" was stated before `git status`; six investigation passes missed the cause that explained 96% because the search was framed around a hypothesis. Names and numbers deliberately omitted.
