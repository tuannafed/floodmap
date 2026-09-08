---
description: Show caw task status (fast — pure bash/awk over overview.yaml, no agent)
allowed-tools: Bash(bash .claude/scripts/caw-status.sh:*)
---

## Status

!`bash .claude/scripts/caw-status.sh $ARGUMENTS`

## Instructions

The block above is the complete answer. Print it to the user as-is (in a code
block), then stop. Do **not** read any task files, do not spawn an agent, do not
summarise or re-derive anything — the script already parsed every
`overview.yaml`. The only reason to say more is if the block shows an error
line starting with `caw-status:` or `No task`; in that case relay it and, if a
"Did you mean" list is present, show it.

If the block above is empty (this harness did not execute the inline command),
run exactly this once with the Bash tool and print its output:

```bash
bash .claude/scripts/caw-status.sh $ARGUMENTS
```

Usage reminder for the user:

- `/caw-status` — active tasks + last 8 finished + counts by status
- `/caw-status <task-id>` — phases, review/verify block, files present, coverage rows, next command (a unique substring of the id works, e.g. `013`)
- `/caw-status --all` — every task, including all finished ones
- `/caw-status --group <id-substring>` — rollup of every task whose id contains the substring (e.g. a release prefix `v2.3`, or a slug word): `N/M finished`, lane + status breakdown, full list. Best-effort — groups by what the id already encodes, no new field.
