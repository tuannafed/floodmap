---
name: stop-hook-reformat-invalidates-citations
description: In this repo the session Stop hook Biome-formats every edited file after code.md is written, so coder file:line citations and raw git diff sizes are unreliable — normalise before reviewing.
metadata:
  type: project
---

Most of `src/` is still single-quote / no-semicolon and does not match `biome.json`. The
Stop hook (`.claude/settings.json`) batch-formats every file the coder edited, *after* the
coder has written `code.md`. Two consequences for review:

1. `file:line` citations in `code.md` for legacy-style files are typically off by the
   reformat (task-001: `LayerMenu.tsx:77` → `:46`). Re-grep every cited line yourself; treat
   the mismatch as LOW (harness moved the ground), not a coder fabrication. Tracked as HB-002.
2. `git diff --stat` massively overstates the change (task-001: 761 lines in `MapView.tsx`
   for a ~15-line edit). To see the real diff: format-normalise HEAD and the working copy
   (`sed -E "s/\"/'/g; s/;[[:space:]]*$//"` on both, then `diff -u -w -B`), or run
   `npx biome format` on `git show HEAD:<file>` and diff that against the working file.

**How to apply:** always build the normalised diff before dimension review; never cite
`git diff --stat` numbers as a size signal in this repo. See also [[pnpm-check-ci-broken]].
