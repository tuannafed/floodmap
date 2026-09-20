#!/usr/bin/env bash
# check-overview.sh — deterministic, zero-dependency checks over this project's overview.yaml
# files (no LLM, <1s). Companion to rules.sh's static-guard style; see docs/CI.md.
#   schema : required fields present, status/phase-status enum legality, depends_on resolves
#            to a real phase in the same task, phases[].id set matches plan.md's phase headings
#   graph  : depends_on cycle detection, orphan blocks_deploy_of reference, dangling cross-task
#            related_tasks/chains_after reference, parallelization_groups disjointness
#            (grep-verifies rules/common/plan-discipline.md's HB-003/HB-019 rule instead of
#            trusting the planner's assertion)
#   all    : both (default)
#
# ADVISORY ONLY today — always exits 0 unless --strict is passed. Flip to blocking (drop the
# advisory default) only after a clean run against every real project in
# scripts/data/known-projects.txt, per the 2026-09-14 5-layer improvement plan's P1 acceptance
# criteria for this check.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

find_root() {
  local d; d="$(pwd)"
  while [[ "$d" != "/" ]]; do
    [[ -d "$d/.claude/conductor/tasks" ]] && { echo "$d"; return 0; }
    d="$(dirname "$d")"
  done
  return 1
}

MODE="all"; STRICT=0
for a in "$@"; do
  case "$a" in
    schema|graph|all) MODE="$a" ;;
    --strict) STRICT=1 ;;
    *) echo "usage: check-overview.sh [schema|graph|all] [--strict]"; exit 2 ;;
  esac
done

ROOT="$(find_root || true)"
[[ -z "$ROOT" ]] && { echo "check-overview.sh: no .claude/conductor/tasks/ found above $(pwd)"; exit 1; }
cd "$ROOT"

python3 "$SCRIPT_DIR/check-overview.py" "$MODE" "$STRICT" "$SCRIPT_DIR"
