# Pipeline Postmortems — {{PROJECT_NAME}}

**Purpose:** a retrospective log of **severe** defects (security, performance, data-correctness,
availability, code-quality) that **passed every gate of the caw pipeline** — planner → coder →
tester → reviewer, via `/caw-plan`, `/caw-code`, `/caw-verify` — and were found only after the
fact. This is **not** a bug list: every entry here is already fixed. Its only purpose is to improve
the harness itself — the rule files under `.claude/rules/`, the ADR conventions, and how the agents
work — so the *class* of defect does not recur on the next task.

**Verification principle:** every number, symbol, file, commit hash, and ADR reference in this file
was `Read`/`Grep`/`git show`n in the session that wrote it (see
`.claude/rules/common/harness-contract.md` § Claims), not recalled or inferred. Anything not fully
verified is marked **unverified** rather than asserted. Never copy a count from an older line —
recount with `grep -cE '^### A[0-9]+'` / `grep -cE '^### B[0-9]+'` when you need one.

**Structure:**
- **Part A** — defects that **reached a deployed environment** (dev / staging / production) and
  were discovered only after the code ran for real. This is the primary section.
- **Part B** — **near-misses**: a defect that was written or designed, but caught **before ship** by
  an out-of-band audit (a user-requested re-audit, a side investigation) rather than by a standard
  pipeline gate. Blast radius was zero, but the pipeline weakness is identical. Kept clearly
  separate so it is never confused with Part A.
- **Summary table** — directly below, before any entry. Scan it first; open only the entries whose
  table/module/pattern matches what you are working on.

**Rules for this file:**
1. Whoever hot-fixes a deployed environment **appends the entry in the same PR** as the hot-fix.
2. The summary table is updated **in the same edit** as the entry — never later.
3. Every entry names the pattern it fits in `.claude/rules/common/review-discipline.md` § After a severe defect,
   or states that it is a new class (and proposes the pattern there).
4. Planner reads the rows whose table/module matches the task before writing a plan for it.
5. Routine harness friction that never shipped a defect goes to `harness-backlog.md`, not here.

---

## Summary table

| # | Incident | Severity | Category | Pipeline-level fix in place? |
|---|---|---|---|---|
| — | _(no entries yet)_ | | | |

**Part A count:** recount with `grep -cE '^### A[0-9]+'` — do not hardcode.
**Part B count:** recount with `grep -cE '^### B[0-9]+'` — do not hardcode.

---

## Entry template

Copy this block; `A<N>` for Part A, `B<N>` for Part B. Number sequentially within each part.

```md
### A<N> — <short title naming the table/module and the user-visible effect>

- **Date:** <YYYY-MM-DD discovered> (shipped <YYYY-MM-DD>, if known)
- **Severity:** CRITICAL | HIGH | MEDIUM-HIGH — <one clause why>
- **Category:** security | performance | data-correctness | availability | compliance | process
- **Environment reached:** production | staging | dev | (Part B: none — caught at <plan/code/review>)
- **Gate that should have caught it:** planner | coder self-verify | tester (Tier-1/Tier-2) | reviewer | smoke — and the mechanism of the miss
- **Root cause at the pipeline level:** <why the gate structurally could not see it — not the code bug itself>
- **Fix applied (code):** <commit / PR>
- **Harness fix applied / proposed:** <rule file + section changed, gate added, or "proposed: …">
- **Pattern:** consumers drift | Tier-1 mock hid a limit | rule tightened late (review-discipline.md § After a severe defect) | new class — <one line>
- **Occurrence:** first | recurrence of <A<M>/B<M>> — if recurrence, the class rule must be generalized in this same PR
```

---

## Part A — Reached a deployed environment

_(append entries here)_

---

## Part B — Near-misses caught out-of-band

_(append entries here)_
