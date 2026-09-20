#!/usr/bin/env bash
# sync-hb-to-hub.sh — appends this project's open, hub-targeted
# harness-backlog items to the hub's docs/hb-inbox.md, so the maintainer sees
# them there without opening every project by hand.
#
#   .claude/scripts/sync-hb-to-hub.sh
#
# Run by the leader (rules/common/leader-discipline.md § Commit protocol)
# after a task with new/updated harness-backlog items reaches `done`. It is
# the "push" counterpart to the hub-side scripts/scans/harness-backlogs.sh
# (a maintainer-invoked "pull"): the same information, offered proactively
# instead of waiting to be asked for.
#
# Writes ONE thing: appends lines to <hub>/docs/hb-inbox.md. Never edits any
# other hub file, never runs git in the hub repo (no commit, no push) — the
# maintainer reads the inbox and decides what, if anything, to port, exactly
# as they already do for harness-backlogs.sh's output. Idempotent: a row
# already present (matched by project + HB id) is not duplicated. Advisory
# only — always exits 0, never blocks the leader's own flow.
set -euo pipefail

find_root() {
  local d; d="$(pwd)"
  while [[ "$d" != "/" ]]; do
    [[ -f "$d/.claude/conductor/harness-backlog.md" ]] && { echo "$d"; return 0; }
    d="$(dirname "$d")"
  done
  return 1
}
ROOT="$(find_root || true)"
if [[ -z "$ROOT" ]]; then
  echo "(no .claude/conductor/harness-backlog.md found — nothing to sync)"
  exit 0
fi

CONFIG="$ROOT/.claude/caw.config.json"
CAW_HOME_RESOLVED=""
if [[ -f "$CONFIG" ]]; then
  CAW_HOME_RESOLVED="$(python3 -c "import json,sys; print(json.load(open(sys.argv[1])).get('caw_home',''))" "$CONFIG" 2>/dev/null || true)"
fi
[[ -z "$CAW_HOME_RESOLVED" ]] && CAW_HOME_RESOLVED="${CAW_HOME:-}"
if [[ -z "$CAW_HOME_RESOLVED" || ! -d "$CAW_HOME_RESOLVED" ]]; then
  echo "(could not resolve caw hub location — no .claude/caw.config.json caw_home and no \$CAW_HOME — skipping sync)"
  exit 0
fi

INBOX="$CAW_HOME_RESOLVED/docs/hb-inbox.md"
if [[ ! -f "$INBOX" ]]; then
  echo "(hub has no docs/hb-inbox.md yet — this hub version predates the inbox, skipping sync)"
  exit 0
fi

PROJECT_NAME="$(basename "$ROOT")"

python3 - "$ROOT" "$INBOX" "$PROJECT_NAME" <<'PY'
import re, sys, os, datetime

root, inbox_path, project_name = sys.argv[1], sys.argv[2], sys.argv[3]

def split_row(line):
    return [c.strip() for c in line.strip().strip("|").split("|")]

def col_index(header, *names):
    lower = [h.lower() for h in header]
    for n in names:
        if n in lower:
            return lower.index(n)
    return None

# Read once, shared by both scans below (a HB item and a postmortem never
# share a marker format — "HB-N" vs "PM-<id>" — so one shared snapshot is
# safe for both dedup checks, even though only the HB scan runs first).
existing_inbox = open(inbox_path, encoding="utf-8").read()

# Each scan below is its own function returning on "nothing to do" instead of
# sys.exit(0) — two independent sources feeding the same inbox; one having
# nothing to sync must never skip the other (confirmed live: an empty
# harness-backlog.md used to exit the whole process before the postmortems
# scan below ever ran).

def sync_harness_backlog():
    backlog_path = os.path.join(root, ".claude/conductor/harness-backlog.md")
    text = open(backlog_path, encoding="utf-8").read()
    lines = text.splitlines()

    start = None
    for i, l in enumerate(lines):
        if l.strip() == "## Items":
            start = i
            break
    if start is None:
        print("(no ## Items table — nothing to sync)")
        return

    header = None
    header_idx = None
    for i in range(start, min(start + 15, len(lines))):
        if re.match(r"^\s*\|.*\|\s*$", lines[i]):
            header = split_row(lines[i])
            header_idx = i
            break
    if header is None:
        print("(## Items has no table — nothing to sync)")
        return

    rows = []
    for l in lines[header_idx + 2:]:
        if not re.match(r"^\s*\|.*\|\s*$", l):
            break
        cells = split_row(l)
        if len(cells) == len(header):
            rows.append(cells)

    id_i, item_i, target_i, status_i, upstreamed_i, detail_i = (
        col_index(header, "id"), col_index(header, "item"), col_index(header, "target"),
        col_index(header, "status"), col_index(header, "upstreamed"), col_index(header, "detail"),
    )
    if None in (id_i, item_i, target_i, upstreamed_i):
        print("(legacy schema — no id/target/upstreamed columns, can't sync precisely; see harness-backlogs.sh)")
        return

    candidates = [
        r for r in rows
        if r[target_i].strip().lower() not in ("project", "")
        and r[upstreamed_i].strip() in ("—", "-", "")
        and (status_i is None or r[status_i].strip().lower() != "rejected")
    ]
    if not candidates:
        print("✅ no open, hub-targeted, un-upstreamed items to sync")
        return

    added = 0
    skipped = 0
    new_lines = []
    for r in candidates:
        hb_id = r[id_i].strip()
        marker = f"[{project_name}] {hb_id}"
        # Boundary after the id, not a bare substring test: "HB-1" is a
        # substring of "HB-10" (and "PM-A1" of "PM-A10", ids are never
        # zero-padded — pipeline-postmortems.md says "number sequentially").
        # Every generated line puts " — target:" right after the marker.
        if f"{marker} —" in existing_inbox:
            skipped += 1
            continue
        item = r[item_i].strip()
        target = r[target_i].strip()
        detail = r[detail_i].strip() if detail_i is not None else ""
        md_link = re.match(r"^\[[^\]]*\]\(([^)]+)\)$", detail)
        detail_rel = md_link.group(1) if md_link else detail
        detail_abs = os.path.join(root, ".claude/conductor", detail_rel) if detail_rel else ""
        line = f"- {marker} — target: `{target}` — {item}"
        if detail_abs:
            line += f" — detail: `{detail_abs}`"
        new_lines.append(line)
        added += 1

    if new_lines:
        stamp = datetime.date.today().isoformat()
        with open(inbox_path, "a", encoding="utf-8") as f:
            f.write(f"\n<!-- synced {stamp} from {project_name} by sync-hb-to-hub.sh -->\n")
            for line in new_lines:
                f.write(line + "\n")

    print(f"✅ synced {added} item(s) to {inbox_path} ({skipped} already present)")


def sync_postmortems():
    """Same push, second source: pipeline-postmortems.md's own "## Summary
    table" carries Hub target/Upstreamed columns mirroring harness-backlog.md's
    schema. Markers are prefixed PM-<id> (not HB-<id>) so provenance and
    severity stay visible in the shared inbox — this is the harness's most
    severe failure class (something that reached a deployed env despite the
    full pipeline), and previously had NO path to the maintainer at all.
    """
    pm_path = os.path.join(root, ".claude/conductor/pipeline-postmortems.md")
    if not os.path.isfile(pm_path):
        return

    pm_text = open(pm_path, encoding="utf-8").read()
    pm_lines = pm_text.splitlines()
    pm_start = next((i for i, l in enumerate(pm_lines) if l.strip() == "## Summary table"), None)
    if pm_start is None:
        return

    pm_header = pm_header_idx = None
    for i in range(pm_start, min(pm_start + 15, len(pm_lines))):
        if re.match(r"^\s*\|.*\|\s*$", pm_lines[i]):
            pm_header, pm_header_idx = split_row(pm_lines[i]), i
            break
    if pm_header is None:
        return

    pm_rows = []
    for l in pm_lines[pm_header_idx + 2:]:
        if not re.match(r"^\s*\|.*\|\s*$", l):
            break
        cells = split_row(l)
        if len(cells) == len(pm_header):
            pm_rows.append(cells)

    pid_i, pinc_i, ptarget_i, pupstreamed_i = (
        col_index(pm_header, "#"), col_index(pm_header, "incident"),
        col_index(pm_header, "hub target"), col_index(pm_header, "upstreamed"),
    )
    if None in (pid_i, pinc_i, ptarget_i, pupstreamed_i):
        print("(pipeline-postmortems.md summary table has no Hub target/Upstreamed column yet — "
              "project predates this feature; run `caw upgrade` to pick it up. Skipping postmortem sync.)")
        return

    pm_candidates = [
        r for r in pm_rows
        if r[pid_i].strip() not in ("", "—", "-")
        and r[ptarget_i].strip().lower() not in ("project", "")
        and r[pupstreamed_i].strip() in ("—", "-", "")
    ]
    if not pm_candidates:
        print("✅ no open, hub-targeted, un-upstreamed postmortem items to sync")
        return

    pm_added = pm_skipped = 0
    pm_new_lines = []
    for r in pm_candidates:
        pm_id = r[pid_i].strip()
        marker = f"[{project_name}] PM-{pm_id}"
        # Boundary check, not bare substring — see sync_harness_backlog above.
        if f"{marker} —" in existing_inbox:
            pm_skipped += 1
            continue
        incident = r[pinc_i].strip()
        target = r[ptarget_i].strip()
        pm_new_lines.append(
            f"- {marker} — target: `{target}` — {incident} — "
            f"detail: `{pm_path}` (entry ### {pm_id})"
        )
        pm_added += 1

    if pm_new_lines:
        stamp = datetime.date.today().isoformat()
        with open(inbox_path, "a", encoding="utf-8") as f:
            f.write(f"\n<!-- synced {stamp} from {project_name} by sync-hb-to-hub.sh (pipeline-postmortems.md) -->\n")
            for line in pm_new_lines:
                f.write(line + "\n")

    print(f"✅ synced {pm_added} postmortem item(s) to {inbox_path} ({pm_skipped} already present)")


sync_harness_backlog()
sync_postmortems()
PY

# ── leader-known-patterns.md drift check ──────────────────────────────────
# Separate from the HB sync above: this file is a hub-owned *content* file
# (rules/common/leader-known-patterns.md), not a queue row, so a project can
# — and, once, silently did — append a real, confirmed pattern straight into
# its local copy without ever filing an HB item. Nothing else here (nor
# harness-backlogs.sh, nor eval-gaps.sh) can see that: they all
# read harness-backlog.md only. This block instead diffs the file's content
# directly against the hub's copy and drops a pointer, not the diff itself,
# into the same inbox — same "advisory only, no auto-write of a fix" rule.
LKP_REL=".claude/rules/common/leader-known-patterns.md"
LKP_PROJECT="$ROOT/$LKP_REL"
LKP_HUB="$CAW_HOME_RESOLVED/rules/common/leader-known-patterns.md"
if [[ -f "$LKP_PROJECT" && -f "$LKP_HUB" ]] && ! diff -q "$LKP_HUB" "$LKP_PROJECT" >/dev/null 2>&1; then
  MARKER="[$PROJECT_NAME] leader-known-patterns.md drift"
  if ! grep -qF "$MARKER" "$INBOX" 2>/dev/null; then
    {
      echo ""
      echo "<!-- synced $(date +%F) from $PROJECT_NAME by sync-hb-to-hub.sh (content drift, not an HB row) -->"
      echo "- $MARKER — project's copy differs from the hub's. Likely a locally-confirmed pattern never filed as an HB item. Compare: \`diff '$LKP_HUB' '$LKP_PROJECT'\`"
    } >> "$INBOX"
    echo "⚠️  leader-known-patterns.md has drifted from the hub — noted in $INBOX"
  fi
fi
