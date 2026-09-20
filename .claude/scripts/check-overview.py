#!/usr/bin/env python3
"""check-overview.py — see check-overview.sh's header for the full contract. Invoked by that
bash wrapper with argv: mode ('schema'|'graph'|'all'), strict ('0'|'1'), script_dir (for the
overview_yaml import). Runs from the project root (the wrapper already cd'd there)."""
import json
import sys
import os
import re
import glob

MODE, STRICT, SCRIPT_DIR = sys.argv[1], sys.argv[2] == "1", sys.argv[3]
sys.path.insert(0, SCRIPT_DIR)
from overview_yaml import parse_overview

# Single source of truth: <project>/.claude/task-status-registry.json (ships from
# templates/task-status-registry.json — see that file's header comment). Legality +
# terminal-ness here must match tools/backlog-viewer/src/lib/status.ts and
# caw-status.sh's is_fin, or scripts/tests/status-registry-parity.sh fails. Falls back to
# the last hardcoded set (frozen at the point the registry was introduced) if a project
# hasn't run `caw upgrade` yet and has no registry file — advisory only, never hard-fails
# on a missing file.
_FALLBACK_TASK_STATUS = {
    "pending", "plan-done", "coding", "code-done", "testing", "red-done", "tests-done",
    "tests-skipped", "reviewing", "review-done", "review-blocked", "needs-rework", "blocked",
    "done", "closed", "deferred",
    "plan-pending", "planning", "code-pending", "in-progress", "in_progress", "review-pending",
    "ready-to-review", "review-approved", "approved", "ready-to-commit", "verified", "completed",
    "verify-done",
}
_FALLBACK_TERMINAL_STATUS = {"done", "closed", "deferred"}


def _load_task_status_registry():
    registry_path = ".claude/task-status-registry.json"
    if not os.path.isfile(registry_path):
        return _FALLBACK_TASK_STATUS, _FALLBACK_TERMINAL_STATUS
    with open(registry_path) as f:
        registry = json.load(f)
    names = {s["name"] for s in registry["statuses"]}
    terminal = {s["name"] for s in registry["statuses"] if s.get("terminal")}
    return names, terminal


TASK_STATUS, TERMINAL_STATUS = _load_task_status_registry()
# Documented core enum (agents/planner.md § Field rules: pending/done/needs-rework/blocked) plus
# the extended, project-defined phase statuses that same section documents (code-done, partial,
# skipped, deferred, dropped, superseded, closed, red-done, planned, accepted-without-run) — seen
# live in the same real-corpus test (18/11/7/6/... occurrences, practice, not typos), not written
# by any coder/tester/reviewer in this hub today. See planner.md for what each one means.
PHASE_STATUS = {
    "pending", "done", "needs-rework", "blocked",
    "code-done", "deferred", "dropped", "closed", "skipped", "superseded", "partial",
    "red-done", "planned", "accepted-without-run",
}
REQUIRED_TOP = ["id", "title", "status", "lane", "type", "next_phase", "created", "updated"]
# `next_phase` is moot once a task reaches a terminal status (harness-contract.md § Task status:
# review-done -> done is HUMAN only, closed/deferred are HUMAN only) — real projects routinely
# stop maintaining it past that point, and requiring it there produced pure noise against a real
# 285-task corpus (2026-09-14 P1 pass). TERMINAL_STATUS itself now comes from the registry above.

TASKS_DIR = ".claude/conductor/tasks"
findings = []  # (task_id, message)


def finding(task_id, msg):
    findings.append((task_id, msg))


def plan_phase_ids(plan_text):
    # Two conventions seen in the wild, both scraped: planner.md's own illustrative format is a
    # fenced ```yaml section of `- id: <x>` entries under "## Plan"; real plan.md files (verified
    # against a 285-task real project, 2026-09-14 P1 pass) commonly use `### Phase: <name>`
    # Markdown headings instead, optionally followed by an annotation in parens on the same line.
    # Best-effort scrape either way, not a strict parse (plan.md is prose + maybe one code block).
    ids = set(re.findall(r"^\s*-\s*id:\s*([^\s#]+)", plan_text, re.M))
    # `### Phase: <name>` can list several phase ids comma-separated on one heading (a section
    # covering multiple related phases) and/or trail a parenthesised annotation — split on comma,
    # then take just the leading id token off each piece.
    for heading in re.findall(r"^#{2,4}\s*Phase:\s*(.+)$", plan_text, re.M):
        for piece in heading.split(","):
            m = re.match(r"\s*(\S+)", piece)
            if m:
                ids.add(m.group(1).strip("`*_"))
    return ids


def plan_parallelization_groups(plan_text):
    # Finds `parallelization_groups:` then reads subsequent `  - [a, b]` flow-list lines.
    m = re.search(r"^parallelization_groups:\s*$", plan_text, re.M)
    if not m:
        return None
    groups = []
    for line in plan_text[m.end():].split("\n"):
        gm = re.match(r"^\s*-\s*\[(.*)\]\s*$", line)
        if gm:
            groups.append([x.strip() for x in gm.group(1).split(",") if x.strip()])
            continue
        if line.strip() == "" or line.startswith(" "):
            continue
        break  # dedented to a new top-level key — end of block
    return groups


def check_schema(task_id, top, phases, plan_text):
    is_terminal = top.get("status") in TERMINAL_STATUS
    for f in REQUIRED_TOP:
        if f == "next_phase" and is_terminal:
            continue
        if f not in top:
            finding(task_id, f"schema: missing required top-level field '{f}'")
    if "status" in top and top["status"] not in TASK_STATUS:
        finding(task_id, f"schema: status '{top['status']}' not in documented enum")
    if not phases:
        finding(task_id, "schema: no phases[] entries")
    seen_ids = {}
    for p in phases:
        pid = p.get("id")
        if pid:
            seen_ids[pid] = seen_ids.get(pid, 0) + 1
    dup_ids = sorted(pid for pid, count in seen_ids.items() if count > 1)
    if dup_ids:
        # A duplicate id silently collapses to one entry in the set below, which would hide it
        # from every downstream depends_on/cycle/orphan check — report it here, before that
        # collapse, or it disappears without a trace.
        finding(task_id, f"schema: duplicate phase id(s) in phases[]: {dup_ids}")
    phase_ids = {p.get("id") for p in phases if p.get("id")}
    for p in phases:
        pid = p.get("id", "<no id>")
        st = p.get("status")
        if st is not None and st not in PHASE_STATUS:
            finding(task_id, f"schema: phase '{pid}' status '{st}' not in documented enum")
        for dep in p.get("depends_on") or []:
            if dep not in phase_ids:
                finding(task_id, f"schema: phase '{pid}' depends_on unknown phase '{dep}'")
    np = top.get("next_phase")
    # "null"/"~"/"" are YAML's own null spellings — this parser doesn't convert them to Python
    # None (that's a generic parser change with wider blast radius), so the consumer here treats
    # them as the same "no next phase" sentinel as the documented "none".
    NEXT_PHASE_NONE = {"none", "None", "null", "~", ""}
    if np and np not in NEXT_PHASE_NONE and np not in phase_ids:
        finding(task_id, f"schema: next_phase '{np}' is not a phase id in phases[]")
    if plan_text is not None:
        from_plan = plan_phase_ids(plan_text)
        if from_plan and from_plan != phase_ids:
            missing_in_ov = from_plan - phase_ids
            extra_in_ov = phase_ids - from_plan
            if missing_in_ov:
                finding(task_id, f"schema: plan.md has phase ids not in overview.yaml: {sorted(missing_in_ov)}")
            if extra_in_ov:
                finding(task_id, f"schema: overview.yaml has phase ids not in plan.md: {sorted(extra_in_ov)}")


def check_graph_cycle(task_id, phases):
    graph = {p["id"]: (p.get("depends_on") or []) for p in phases if p.get("id")}
    WHITE, GRAY, BLACK = 0, 1, 2
    color = {n: WHITE for n in graph}
    stack_path = []

    def visit(n):
        color[n] = GRAY
        stack_path.append(n)
        for m in graph.get(n, []):
            if m not in graph:
                continue  # already reported by check_schema as an unknown dependency
            if color.get(m, WHITE) == GRAY:
                cycle = stack_path[stack_path.index(m):] + [m]
                finding(task_id, f"graph: depends_on cycle: {' -> '.join(cycle)}")
            elif color.get(m, WHITE) == WHITE:
                visit(m)
        stack_path.pop()
        color[n] = BLACK

    for n in graph:
        if color[n] == WHITE:
            visit(n)


def check_graph_orphans(task_id, phases):
    phase_ids = {p.get("id") for p in phases if p.get("id")}
    for p in phases:
        pid = p.get("id", "<no id>")
        for target in p.get("blocks_deploy_of") or []:
            if target not in phase_ids:
                finding(task_id, f"graph: phase '{pid}' blocks_deploy_of unknown phase '{target}'")


def check_graph_cross_task(task_id, top, phases, all_task_ids, closed_ids):
    def known(other_id):
        return other_id in all_task_ids or other_id in closed_ids

    for other in top.get("related_tasks") or []:
        if other and not known(other):
            finding(task_id, f"graph: related_tasks references unknown task '{other}'")
    for p in phases:
        ca = p.get("chains_after")
        if ca and not known(ca):
            finding(task_id, f"graph: phase '{p.get('id')}' chains_after unknown task '{ca}'")


def check_graph_parallelization(task_id, phases, plan_text):
    if plan_text is None:
        return
    groups = plan_parallelization_groups(plan_text)
    if groups is None:
        return  # not present in this plan.md — nothing to check
    files_by_id = {p.get("id"): set(p.get("files") or []) for p in phases if p.get("id")}
    for group in groups:
        for i in range(len(group)):
            for j in range(i + 1, len(group)):
                a, b = group[i], group[j]
                shared = files_by_id.get(a, set()) & files_by_id.get(b, set())
                if shared:
                    finding(
                        task_id,
                        f"graph: parallelization_groups claims '{a}' and '{b}' are parallel "
                        f"but they share file(s) {sorted(shared)} (HB-003/HB-019 shape)",
                    )


def main():
    if not os.path.isdir(TASKS_DIR):
        print(f"check-overview.py: no {TASKS_DIR}/ here")
        sys.exit(0)

    all_task_ids = {os.path.basename(d) for d in glob.glob(f"{TASKS_DIR}/*") if os.path.isdir(d)}
    closed_ids = set()
    backlog = ".claude/conductor/backlog.md"
    if os.path.isfile(backlog):
        text = open(backlog, encoding="utf-8").read()
        m = re.search(r"^## Closed\b.*$", text, re.M)
        if m:
            closed_ids = set(re.findall(r"\btask-[A-Za-z0-9_.-]+", text[m.end():]))

    for ov_path in sorted(glob.glob(f"{TASKS_DIR}/*/overview.yaml")):
        task_id = os.path.basename(os.path.dirname(ov_path))
        top, phases = parse_overview(open(ov_path, encoding="utf-8").read())
        plan_path = os.path.join(os.path.dirname(ov_path), "plan.md")
        plan_text = open(plan_path, encoding="utf-8").read() if os.path.isfile(plan_path) else None

        if MODE in ("schema", "all"):
            check_schema(task_id, top, phases, plan_text)
        if MODE in ("graph", "all"):
            check_graph_cycle(task_id, phases)
            check_graph_orphans(task_id, phases)
            check_graph_cross_task(task_id, top, phases, all_task_ids, closed_ids)
            check_graph_parallelization(task_id, phases, plan_text)

    if not findings:
        print(f"check-overview ({MODE}): OK — {len(list(glob.glob(f'{TASKS_DIR}/*/overview.yaml')))} task(s) checked")
        sys.exit(0)

    by_task = {}
    for task_id, msg in findings:
        by_task.setdefault(task_id, []).append(msg)
    for task_id in sorted(by_task):
        for msg in by_task[task_id]:
            print(f"{task_id}: {msg}")
    print(f"\ncheck-overview ({MODE}): {len(findings)} finding(s) across {len(by_task)} task(s)"
          + (" — advisory, not blocking" if not STRICT else ""))
    sys.exit(1 if STRICT else 0)


if __name__ == "__main__":
    main()
