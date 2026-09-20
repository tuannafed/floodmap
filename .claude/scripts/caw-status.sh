#!/usr/bin/env bash
# caw-status — fast task status from overview.yaml, no agent, no YAML parser.
#
#   bash .claude/scripts/caw-status.sh              # list all tasks
#   bash .claude/scripts/caw-status.sh <task-id>    # one task in detail
#   bash .claude/scripts/caw-status.sh --all        # list incl. every done/closed task
#   bash .claude/scripts/caw-status.sh --group v2.3 # rollup of every task whose id contains "v2.3"
#   bash .claude/scripts/caw-status.sh --rounds <task-id>  # per-stage round counts from leader.md
#
# Reads only top-level keys + the phases list with awk. Trailing `# comments`
# on a value are stripped. Runs from anywhere inside the project.
set -euo pipefail

find_root() {
  local d; d="$(pwd)"
  while [[ "$d" != "/" ]]; do
    [[ -d "$d/.claude/conductor/tasks" ]] && { echo "$d"; return 0; }
    d="$(dirname "$d")"
  done
  return 1
}
ROOT="$(find_root || true)"
[[ -z "$ROOT" ]] && { echo "caw-status: no .claude/conductor/tasks/ found above $(pwd)"; exit 1; }
TASKS="$ROOT/.claude/conductor/tasks"

SHOW_ALL=false; TASK=""; GROUP=""; want_group=false; ROUNDS=false
for a in "$@"; do
  if $want_group; then GROUP="$a"; want_group=false; continue; fi
  case "$a" in
    --all) SHOW_ALL=true ;;
    --group) want_group=true ;;
    --rounds) ROUNDS=true ;;
    -*) echo "usage: caw-status.sh [<task-id>] [--all] [--group <id-substring>] [--rounds <task-id>]"; exit 1 ;;
    *) TASK="$a" ;;
  esac
done
$want_group && { echo "usage: caw-status.sh --group <id-substring>"; exit 1; }
$ROUNDS && [[ -z "$TASK" ]] && { echo "usage: caw-status.sh --rounds <task-id>"; exit 1; }

# top-level scalar: key -> value with trailing comment stripped
top() { awk -v k="$2" '
  /^[A-Za-z_]+:/ { if ($0 ~ "^"k":") { sub("^"k":[ \t]*",""); sub(/[ \t]+#.*$/,""); gsub(/^"|"$/,""); print; exit } }' "$1"; }

next_cmd() {  # $1 = id, $2 = status, $3 = next_phase
  case "$2" in
    # `planned`/`verified` are not in the documented status enum (agents/planner.md § Field
    # rules) and no current agent/command writes them — grepped clean across agents/, commands/,
    # rules/, conductor/, templates/ on 2026-09-14. Kept as display-only aliases (never removed)
    # in case an older project's overview.yaml predates the current enum: this script is
    # read-only and copied verbatim by `caw upgrade`, so silently dropping them would misreport
    # an existing task's state on any project still carrying one, with no warning.
    planned|plan-done)            echo "/caw-code $1 --all" ;;
    coding)                       [[ -n "$3" && "$3" != "none" ]] && echo "/caw-code $1 $3" || echo "/caw-code $1 --all" ;;
    code-done|red-done)           echo "/caw-run $1" ;;
    tests-done|tests-skipped)     echo "/caw-review $1" ;;
    review-blocked|needs-rework)  [[ -n "$3" && "$3" != "none" ]] && echo "/caw-code $1 $3" || echo "/caw-code $1 review-fixes" ;;
    review-done|verified)         echo "git commit" ;;
    blocked)                      echo "unblock, then /caw-code $1 $3" ;;
    done|closed|deferred)         echo "-" ;;
    *)                            echo "/caw-status $1" ;;
  esac
}

# ── Single task ───────────────────────────────────────────────────────────────
if [[ -n "$TASK" ]]; then
  DIR="$TASKS/$TASK"
  if [[ ! -d "$DIR" ]]; then
    # allow a prefix / number match, e.g. 042 or task-v2.9-013
    m=$(ls "$TASKS" | grep -F -- "$TASK" | head -5 || true)
    if [[ $(echo "$m" | grep -c .) -eq 1 ]]; then DIR="$TASKS/$m"; TASK="$m"
    else echo "No task '$TASK'."; [[ -n "$m" ]] && { echo "Did you mean:"; echo "$m" | sed 's/^/  /'; }; exit 1; fi
  fi
  if $ROUNDS; then
    LD="$DIR/leader.md"
    [[ -f "$LD" ]] || { echo "$TASK: no leader.md (only /caw-run tasks have one)"; exit 1; }
    echo "Rounds: $TASK"
    n=0
    while IFS= read -r line; do
      if [[ "$line" =~ ^##\ Stage\ ([0-9]+)\ —\ ([a-z]+)\ \(([0-9]+)\) ]]; then
        printf "  Stage %-2s %-8s %s round(s)\n" "${BASH_REMATCH[1]}" "${BASH_REMATCH[2]}" "${BASH_REMATCH[3]}"
        n=$((n+1))
      fi
    done < "$LD"
    [[ $n -eq 0 ]] && echo "  (no '## Stage N — <name> (<count>)' headings found in leader.md)"
    exit 0
  fi
  OV="$DIR/overview.yaml"
  [[ -f "$OV" ]] || { echo "$TASK: no overview.yaml"; exit 1; }
  st=$(top "$OV" status); ln=$(top "$OV" lane); ty=$(top "$OV" type); np=$(top "$OV" next_phase); up=$(top "$OV" updated)
  echo "Task:    $TASK"
  echo "Title:   $(top "$OV" title)"
  echo "Type:    ${ty:-?} | Lane: ${ln:-?} | Status: ${st:-?} | Updated: ${up:-?}"
  echo ""
  echo "Phases:"
  awk '
    /^phases:/ { inph=1; next }
    inph && /^[A-Za-z_]+:/ { inph=0 }
    inph && /^  - id:/ { if (id!="") printf "  %-34s %-16s %s\n", id, st, dep; id=$3; st="?"; dep="" }
    inph && /^    status:/ { s=$0; sub(/^    status:[ \t]*/,"",s); sub(/[ \t]+#.*$/,"",s); st=s }
    inph && /^    depends_on:/ { d=$0; sub(/^    depends_on:[ \t]*/,"",d); dep=(d=="[]"||d=="")?"":"after " d }
    END { if (id!="") printf "  %-34s %-16s %s\n", id, st, dep }' "$OV"
  echo ""
  rv=$(awk '/^review:/{f=1;next} f&&/^[A-Za-z_]+:/{f=0} f' "$OV" | tr -s ' \n' ' ')
  vf=$(awk '/^verify:/{f=1;next} f&&/^[A-Za-z_]+:/{f=0} f' "$OV" | tr -s ' \n' ' ')
  [[ -n "$rv" ]] && echo "Review: $rv"
  [[ -n "$vf" ]] && echo "Verify: $vf"
  printf "Files:  "; for f in plan.md code.md tests.md review.md verify.md test-matrix.md harness.md; do [[ -f "$DIR/$f" ]] && printf "%s ✓  " "$f" || printf "%s ✗  " "$f"; done; echo ""
  if [[ -f "$DIR/test-matrix.md" ]]; then
    echo ""; echo "Coverage (test-matrix.md):"
    grep -E '^\|' "$DIR/test-matrix.md" | grep -vE '^\|[- |]+\|$' | head -20 | sed 's/^/  /'
  fi
  revs=$(awk '/^## Revisions/{f=1;next} f&&/^## /{f=0} f&&(/^- /||/^### /)' "$DIR/plan.md" 2>/dev/null | sed 's/^### //' | tail -5 || true)
  if [[ -n "$revs" ]]; then echo ""; echo "Plan revisions (last 5):"; printf '%s\n' "$revs" | cut -c1-110 | sed 's/^/  /'; fi
  echo ""
  echo "Next:   $(next_cmd "$TASK" "$st" "$np")"
  exit 0
fi

# ── List mode ─────────────────────────────────────────────────────────────────
# One awk pass over every overview.yaml: id \t updated \t lane \t status \t next_phase
rows=$(awk '
  function val(s) { sub(/^[A-Za-z_]+:[ \t]*/,"",s); sub(/[ \t]+#.*$/,"",s); gsub(/^"|"$/,"",s); return s }
  FNR==1 { if (id!="") printf "%s\t%s\t%s\t%s\t%s\n", id, up, ln, st, np
           n=split(FILENAME,a,"/"); id=a[n-1]; up="0000-00-00"; ln="?"; st="?"; np="" }
  /^status:/     { st=val($0) }
  /^lane:/       { ln=val($0) }
  /^next_phase:/ { np=val($0) }
  /^updated:/    { up=substr(val($0),1,10) }
  END { if (id!="") printf "%s\t%s\t%s\t%s\t%s\n", id, up, ln, st, np }
' "$TASKS"/*/overview.yaml)
# Terminal-status set comes from .claude/task-status-registry.json (single source of
# truth shared with check-overview.py's TERMINAL_STATUS and the viewer's status.ts) —
# falls back to the documented core (done/closed/deferred) if a project hasn't run
# `caw upgrade` yet and has no registry file. `verified` is intentionally NOT terminal
# here (it's an alias of `review-done`, which itself requires a human `git commit` to
# become `done` — matching check-overview.py, which never treated `verified` as terminal).
TERMINAL_STATUSES="$(python3 -c "
import json, os
path = '$ROOT/.claude/task-status-registry.json'
if os.path.isfile(path):
    with open(path) as f:
        reg = json.load(f)
    names = [s['name'] for s in reg['statuses'] if s.get('terminal')]
else:
    names = ['done', 'closed', 'deferred']
print(' '.join(names))
")"
is_fin=""
for st in $TERMINAL_STATUSES; do
  is_fin="${is_fin}\$4==\"$st\" || "
done
is_fin="${is_fin% || }"

# ── Group rollup: every task whose id contains the substring, no 8-row cap ────
# Groups by whatever the project's id convention already encodes (a release
# prefix like `v2.3`, or a slug word) — no new overview.yaml field. Not an
# authoritative epic tracker: a task whose id doesn't carry the key is missed.
if [[ -n "$GROUP" ]]; then
  rows=$(printf '%s\n' "$rows" | awk -F'\t' -v g="$GROUP" 'index($1,g)')
  [[ -z "$rows" ]] && { echo "No task id contains '$GROUP'."; exit 1; }
  SHOW_ALL=true
  n_all=$(printf '%s\n' "$rows" | grep -c .)
  n_done=$(printf '%s\n' "$rows" | awk -F'\t' "$is_fin" | grep -c . || true)
  echo "Group '$GROUP': $n_done/$n_all finished"
  echo "By lane:"; printf '%s\n' "$rows" | awk -F'\t' 'NF{c[$3]++} END{for(k in c) printf "  %-16s %d\n", k, c[k]}' | sort -k2 -rn
  echo ""
fi
active=$(printf '%s\n' "$rows" | awk -F'\t' "!($is_fin)" | sort -t$'\t' -k2,2r)
finished=$(printf '%s\n' "$rows" | awk -F'\t' "$is_fin" | sort -t$'\t' -k2,2r)
n_act=$(printf '%s' "$active" | grep -c . || true); n_fin=$(printf '%s' "$finished" | grep -c . || true)

echo "Active tasks ($n_act):"
if [[ $n_act -eq 0 ]]; then echo "  (none)"; else
  printf '%s\n' "$active" | while IFS=$'\t' read -r id up ln st np; do
    printf "  %-46s | %-8s | %-15s | next: %s\n" "$id" "$ln" "$st" "$(next_cmd "$id" "$st" "$np")"
  done
fi
echo ""
if $SHOW_ALL; then echo "Finished ($n_fin):"; lim=100000; else echo "Recently finished (last 8 of $n_fin — use --all for every one):"; lim=8; fi
printf '%s\n' "$finished" | head -n "$lim" | while IFS=$'\t' read -r id up ln st np; do
  printf "  %-46s | %-8s | %-10s | %s\n" "$id" "$ln" "$st" "${up/0000-00-00/—}"
done
echo ""
echo "By status:"; printf '%s\n' "$rows" | awk -F'\t' 'NF{c[$4]++} END{for(k in c) printf "  %-16s %d\n", k, c[k]}' | sort -k2 -rn
