---
name: harness-dirs-gitignored
description: .claude/ and CLAUDE.md are fully gitignored in this repo — git status never reflects harness setup changes
metadata:
  type: project
---

This repo's `.gitignore` has a blanket `.claude/` entry plus a caw-managed block
that also excludes `CLAUDE.md` (machine-local harness config, per commit
f2405d4 "enhance .gitignore ... for improved project configuration").

**Why:** the harness (skills, skill-map.yaml, conductor state, agent-memory,
rules/project.md, CLAUDE.md's version-pin block) is treated as machine-local,
not checked into version control for this project.

**How to apply:** after running `/caw-setup` (first-run or `--refresh`), do
NOT rely on `git status`/`git diff` to confirm what was written or changed —
it will show clean even after creating/editing dozens of files under `.claude/`
and `CLAUDE.md`. Verify writes directly (`ls`, `cat`, `readlink` on the actual
paths) instead of trusting git as evidence.
