# Setup Agent — Mandatory Default Skills Reference

Full per-group breakdown of the 40 mandatory default skills `agents/setup.md` Phase 2
requires on every project (37 for a project with no `package.json` anywhere — see the
non-JS exception below). The single machine-readable source of truth is
`<CAW_HOME>/scripts/data/skills-registry.json`; this file is its human-readable mirror,
checked for agreement by `scripts/checks/skills-registry.sh`. Phase 4.1 reads the JSON
file directly at install time — it does not hand-copy this list.

## Workflow defaults (14 skills — every project gets these)

- `to-prd`
- `webapp-testing`
- `javascript-testing-patterns` *(non-JS exempt)*
- `react-component-testing` *(caw-owned — leak-free RTL+QueryClient patterns; non-JS exempt)*
- `test-driven-development` *(red → green → refactor loop, obra/superpowers)*
- `verification-before-completion` *(evidence-before-assertions before claiming done)*
- `code-review-excellence`
- `performance`
- `accessibility`
- `refactor`
- `improve-codebase-architecture` *(architecture deepening + module consolidation)*
- `systematic-debugging`
- `find-skills`
- `validate-skills`

## Product/PM defaults (7 skills — planner agent depends on these; absence will make `/caw-plan` abort)

- `prd-development`
- `user-story`
- `user-story-splitting`
- `prioritization-advisor`
- `business-analyst`
- `create-specification`
- `roadmap-planning`

## Cross-cutting defaults (3 skills — almost every modern project needs these)

- `typescript-advanced-types` *(non-JS exempt — any project with `typescript` in deps OR `tsconfig.json` at root)*
- `github` *(every project we ship uses GitHub workflow)*
- `github-actions` *(if `.github/workflows/` folder exists OR project ships CI)*

## caw-owned defaults (16 skills — always, sourced from `<CAW_HOME>/templates/skills/`; `react-component-testing` is caw-owned too but already counted in the workflow list above)

- `api-contract`
- `error-handling-patterns`
- `nextjs-feature` *(archetype — links everywhere, loads only when relevant)*
- `adversarial-test-design`
- `context-engineering`
- `doubt-check`
- `observability`
- `performance-optimization`
- `security-hardening`
- `feedback-traceability`
- `commit-conventions`
- `package-manager`
- `source-driven`
- `runtime-smoke-test` *(tester loads it for the smoke gate)*
- `technical-doc-html` *(converts a Markdown spec/design doc to a standalone HTML deliverable)*
- `herdr-peer-delegate` *(peer-session delegation via herdr)*

## Non-JS exception

No `package.json` anywhere in the project (pure Go/Rust/Java/Swift/Python, no JS at all):
skip `javascript-testing-patterns`, `react-component-testing` (React/RTL-specific content,
actively misleading with no JS), and `typescript-advanced-types` (no TypeScript to apply it
to) — 3 skills, dropping the baseline from 40 to 37. A mixed project (e.g. Go backend + a
`package.json`-having React frontend anywhere in the tree) keeps all three — the exception
is only for *zero* `package.json` in the whole scan, not "not primarily JS".
