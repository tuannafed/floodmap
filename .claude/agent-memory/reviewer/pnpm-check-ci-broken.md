---
name: pnpm-check-ci-broken
description: pnpm check:ci (the declared lint gate) fails at baseline on a nested biome.json under .claude/backlog-viewer — use per-file npx biome check and compare against the coder's baseline counts.
metadata:
  type: project
---

`pnpm check:ci` → `biome check .` exits 1 with "Found a nested root configuration"
(`.claude/backlog-viewer/biome.json`) before linting any file (HB-001). It cannot be used
to prove "no new lint errors". Verify instead with `npx biome check <each touched file>`
and compare error/warning counts with the baseline table the coder records in `code.md`.
`lint/a11y/useButtonType` is the project's only error-level rule and is unfixed in legacy
files (`LayerMenu.tsx`), so any task that touches such a file inherits a red gate — file it
in-task if the file is in the diff.

**How to apply:** don't report `pnpm check:ci` as run or passing; cite per-file commands.
