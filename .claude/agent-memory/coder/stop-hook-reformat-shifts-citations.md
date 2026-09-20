---
name: stop-hook-reformat-shifts-citations
description: The session Stop hook Biome-formats every edited file after the turn, so file:line numbers written into code.md during the turn can be stale by the time anyone reads them.
metadata:
  type: project
---

`.claude/settings.json` runs a Stop hook that batch-formats (Biome) and typechecks every file edited in the session. Most `src/` files are still single-quote / no-semicolon, so the first edit to such a file triggers a whole-file reformat **after** `code.md` was written, shifting every line number cited there (task-001 lost 4 citations this way; filed as HB-002).

**Why:** the reviewer re-verifies every `file:line` against the working tree and files LOW/HIGH for a mismatch — the coder gets blamed for the harness moving the ground.

**How to apply:** before writing citations, run `npx biome check --write <file>` on each touched file yourself (endorsed by `conventions.md` § Verify Commands) so the hook has nothing left to change, then grep the final positions. In `code.md`, mark any number that records a measurement at a point in time as such, and cite current lines only for sentences describing the current code.
