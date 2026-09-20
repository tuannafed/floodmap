---
paths:
  - "**/code.md"
---
# Rule: Code Discipline — what every `code.md` phase entry must carry

Auto-loads when the coder reads `code.md` before appending (every phase after the first) and for the reviewer. On the **first phase `code.md` does not exist yet — the coder `Read`s this file itself** (a `Write` never triggers a rule). Status, ADRs, HB and the claims contract: `harness-contract.md`.

**"First phase" is per-session, not global — re-check before `Write`ing.** If this phase runs in a `parallelization_groups` group with any sibling phase, another coder session may create `code.md` first. A `Write` at this point assumes the file is still absent; if it isn't, it silently replaces whatever the sibling already wrote (confirmed live, HB-018 — destroyed 4 prior phases' write-ups). `Read` the path immediately before writing, not only at session start; if it now exists, `Edit`/append instead.

## 1. Before touching a shared thing
If the phase edits a shared file (helper, repository, service, schema, config, a 401 / error / logging primitive) or changes what a shared concept means, the plan carries a `## Consumers` block (`plan-discipline.md` §2). Before editing, re-run its two searches **by table / column / concept name**, not only by function name. A consumer the plan missed → stop, add it to the block under `## Revisions`, then code; the reviewer re-runs the grep and files HIGH for any miss. A fix in a file that has a twin (sibling app, duplicated primitive) is not done until every sibling root has been grepped. Two helpers computing the same concept differently is the most common way an approved task ships a defect — reuse the existing helper, or fix it in place and enumerate its consumers.

## 2. What `code.md` must contain, per phase
- `Rules read:` — `project.md` present/absent, plus any rule you read explicitly.
- `Skills loaded via Skill tool:` — only those you actually invoked; `none — <step> skipped` otherwise.
- Files changed, with `file:line` for every claim — grepped or read in this turn (claims contract).
- The self-verify commands you ran (type-check incl. test files, the full CI lint command, related tests) with their exit status.
- The consumer-search output when §1 applied.
- `## Post-verify hotfix` when a smoke bug was fixed: symptom, root cause, file, failing step.

## 3. The self-verify gate is the phase gate
A phase is `done` only when type-check, lint and the related tests pass. Otherwise it is `blocked` with the errors pasted — never `done` with a note. Re-read `code.md` from disk before updating `overview.yaml`.

## 4. Deploy order
Code that targets a DB object created by a migration in this or another task ships only after the object is confirmed live — behind a flag or as a separate deploy, per `migration-safety.md` §c. "X is only safe after Y" in prose is not a control.

## 5. Push triggers you may hit mid-phase
- A cross-cutting choice the plan did not make (caching, state library, error envelope, a new dependency) → ADR + index row, same turn (`harness-contract.md` § ADRs).
- Something matching a trigger in `knowledge.md`'s own header → append the entry; the reviewer files MEDIUM if it is missing.
- Friction → write-up + one `HB-NNN` row (`harness-contract.md` § HB).
