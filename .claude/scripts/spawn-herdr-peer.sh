#!/usr/bin/env bash
# Spawn a named `claude` peer session in a herdr pane, ready to receive a
# SendMessage. Does NOT send any task to it — that's a tool call only the
# calling agent can make (SendMessage isn't invokable from a shell script).
#
# Usage: spawn-herdr-peer.sh [--account <name>] <agent> <task-id> [<phase>]   (pipeline peers)
#        spawn-herdr-peer.sh [--account <name>] <function-name>               (ad-hoc peers)
#        spawn-herdr-peer.sh --list-accounts        (print the account names, one per line)
# Account = which Claude login the peer runs under (multi-account setup):
#        `sotatek` = the default login in ~/.claude; any other name = the login in
#        ~/.claude-<name> (must contain .claude.json, i.e. already `/login`-ed).
#        Chosen via --account, else $CAW_PEER_ACCOUNT, else an interactive menu when
#        run from a terminal, else `sotatek` with a stderr note. The calling agent
#        has no TTY, so it must ask the user (see the herdr-peer-delegate skill)
#        and pass --account. The pane's `claude` is launched with CLAUDE_NO_PICK=1
#        (default login) or CLAUDE_CONFIG_DIR=... so the shell's own account
#        picker never blocks the peer.
# Session-name rule: <project>-<agent>-<task-NNN>[-<phase>]  e.g. sos-tester-task-001,
#        sos-coder-task-001-aqi-legend-fix, dava-reviewer-task-v2.3-050; ad-hoc:
#        <project>-<function>  e.g. caw-consol-t3.
# The script prefixes the project (basename of the project's git root, or CAW_PEER_TAB), shortens the
# task id to its number (the slug is dropped), and appends -2, -3, ... when a pane
# with that name is already open — a peer must always be a FRESH session
# (resuming a live one accumulates its context). The caller must message the
# name the script actually chose (SESSION= below).
# Env:   CAW_PEER_TAB        tab label AND name prefix for this project (default: basename of the project's git root)
#        CAW_PEER_MAX_TABS   live peer tabs per project space before a stderr warning (default: 5)
# Env:   CAW_PEER_ACCOUNT    default for --account (see above)
# Exit 0: peer is live and idle at its prompt.
#         Prints `SESSION=<name> PANE_ID=<id> TAB_ID=<id> WORKSPACE_ID=<id> ACCOUNT=<name>`.
# Exit 2: herdr is not installed — caller should fall back to the Agent/Task tool.
# Exit 1: herdr is installed but spawning failed, or did not reach a ready
#         prompt within the timeout (see stderr).
# Exit 4: bad/unknown/not-logged-in account, or none chosen at the menu (nothing spawned).
#
# Layout policy (2026-09-10, revised the same day: tabs, not splits):
#   * One WORKSPACE (herdr "space") per project, labelled after the project
#     (basename of the project's git root, or CAW_PEER_TAB), created --no-focus when missing, so
#     several projects running peers at once never share a space.
#   * One TAB per peer inside that space, labelled <agent>-<task-NNN>[-<phase>]
#     (the session name minus the project prefix: coder-task-001, tester-task-001,
#     coder-task-001-db; ad-hoc peers: their function name). No pane
#     splitting at all: a tab is one agent, full width, and the space reads as
#     the list of live peers. CAW_PEER_MAX_TABS (default 5) only WARNS on
#     stderr — the leader closes verified peers, the script never refuses.
#   * Never `pane current`: from outside herdr that returns whatever pane the
#     user has focused, which may be another project.
#   * Every workspace/tab is created --no-focus so the user's cursor stays put.
#
# IMPORTANT — exit 0 does NOT mean SendMessage will reach the peer yet.
# There is a separate, additional propagation delay (observed ~30-60s+ in
# testing) between "herdr shows the pane ready" and "the peer is addressable
# via SendMessage/ListAgents". The CALLER must retry SendMessage with backoff
# on a "not reachable" error instead of treating exit 0 as reachability.
#
# Provenance: every herdr call here (tab list/create, pane list/split/run/
# send-keys/read/edges) and the trust-dialog handling were verified live in a
# real Ghostty+herdr window (2026-09-05, 2026-09-10) — including two readiness
# designs that were tried, proven unreliable, and abandoned (see below).
set -euo pipefail

# ── Account names: `sotatek` (~/.claude) + every logged-in ~/.claude-<name> ──
list_accounts() {
  local d n
  echo sotatek
  for d in "$HOME"/.claude-*/; do
    if [[ -f "${d}.claude.json" ]]; then
      n=$(basename "$d"); n=${n#.claude-}
      [[ "$n" == sotatek ]] || echo "$n"
    fi
  done
  return 0
}

ACCOUNT="${CAW_PEER_ACCOUNT:-}"
ARGS=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    --list-accounts) list_accounts; exit 0 ;;
    --account) [[ $# -ge 2 ]] || { echo "--account needs a value" >&2; exit 1; }; ACCOUNT="$2"; shift 2 ;;
    --account=*) ACCOUNT="${1#--account=}"; shift ;;
    *) ARGS+=("$1"); shift ;;
  esac
done
if [[ ${#ARGS[@]} -gt 0 ]]; then set -- "${ARGS[@]}"; else set --; fi

[[ $# -ge 1 ]] || { echo "usage: spawn-herdr-peer.sh [--account <name>] <agent> <task-id> [<phase>] | <function-name>" >&2; exit 1; }
if [[ $# -ge 2 ]]; then
  # <agent> <task-id> [<phase>] — keep the task id up to its number, drop the slug
  TASK_SHORT=$(printf '%s' "$2" | sed -E 's/^(task-(v[0-9]+(\.[0-9]+)*-)?[0-9]+).*/\1/')
  PEER_ARG="$1-$TASK_SHORT${3:+-$3}"
else
  PEER_ARG="$1"
fi
# git repo root, not bare `pwd` — the caller's shell cwd may have drifted into
# a subdirectory (e.g. after `cd backend && ...`), and every caw project is a
# git repo with `.claude/` at its root, so this is always the right anchor.
# Falls back to `pwd` outside a git repo (ad-hoc peer spawning).
PROJECT_DIR="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
TAB_LABEL="${CAW_PEER_TAB:-$(basename "$PROJECT_DIR")}"
MAX_TABS="${CAW_PEER_MAX_TABS:-5}"

if ! command -v herdr >/dev/null 2>&1; then
  echo "herdr not installed" >&2
  exit 2
fi

# ── Account: which Claude login this peer runs under (resolved BEFORE anything is
# created, so a bad name leaves no stray workspace/tab behind) ──────────────────
if [[ -z "$ACCOUNT" ]]; then
  if [[ -t 0 && -t 1 ]]; then
    ACCTS=(); while IFS= read -r a; do ACCTS+=("$a"); done < <(list_accounts)
    PS3="Claude account for the peer: "
    select ACCOUNT in "${ACCTS[@]}"; do [[ -n "$ACCOUNT" ]] && break; done
    [[ -n "$ACCOUNT" ]] || { echo "no account chosen" >&2; exit 4; }
  else
    ACCOUNT=sotatek
    echo "note: no --account / CAW_PEER_ACCOUNT and no TTY — using 'sotatek' (default login). Available: $(list_accounts | tr '\n' ' ')" >&2
  fi
fi
[[ "$ACCOUNT" =~ ^[A-Za-z0-9._-]+$ ]] || { echo "invalid account name: $ACCOUNT" >&2; exit 4; }
case "$ACCOUNT" in
  sotatek|default) ACCOUNT=sotatek; CLAUDE_ENV="CLAUDE_NO_PICK=1" ;;
  *)
    ACCOUNT_DIR="$HOME/.claude-$ACCOUNT"
    [[ -f "$ACCOUNT_DIR/.claude.json" ]] || { echo "unknown or not-logged-in account '$ACCOUNT' (available: $(list_accounts | tr '\n' ' '))" >&2; exit 4; }
    CLAUDE_ENV="CLAUDE_CONFIG_DIR='$ACCOUNT_DIR'" ;;
esac

# ── 0. Session name: <project>-<arg>, made unique against live panes ─────────
PREFIX=$(printf '%s' "$TAB_LABEL" | tr -c 'A-Za-z0-9._-\n' '-')
BASE=$(printf '%s' "$PEER_ARG" | tr -c 'A-Za-z0-9._-\n' '-')
case "$BASE" in "$PREFIX"-*) ;; *) BASE="$PREFIX-$BASE" ;; esac
PEER_NAME=$(herdr pane list 2>/dev/null | python3 -c "
import json, sys
base = sys.argv[1]
titles = {p.get('terminal_title_stripped') or p.get('terminal_title', '') for p in json.load(sys.stdin)['result']['panes']}
name, n = base, 1
while name in titles:
    n += 1; name = f'{base}-{n}'
print(name)
" "$BASE" 2>/dev/null) || PEER_NAME="$BASE"

# ── 1. Pick the workspace: this project's own space, created when missing ────
# `workspace list` carries `label` and `worktree.checkout_path`; either one
# matching the project wins (label first — it is what the user sees). Never
# fall back to the focused workspace: that is how sos peers once landed as a
# tab inside another project's space (2026-09-10).
TAB_LABEL_PEER="${PEER_NAME#"$PREFIX"-}"   # tab = the peer, without the project prefix
WORKSPACE=$(herdr workspace list 2>/dev/null | python3 -c "
import json, sys
label, cwd = sys.argv[1], sys.argv[2]
ws = json.load(sys.stdin)['result']['workspaces']
by_label = [w for w in ws if w.get('label') == label]
by_path  = [w for w in ws if (w.get('worktree') or {}).get('checkout_path') == cwd]
pick = by_label or by_path
print(pick[0]['workspace_id'] if pick else '')
" "$TAB_LABEL" "$PROJECT_DIR" 2>/dev/null) || WORKSPACE=""
NEW_PANE=""; TAB=""
if [[ -z "$WORKSPACE" ]]; then
  # New space: its root tab + pane IS the first peer (renamed below).
  read -r WORKSPACE TAB NEW_PANE < <(herdr workspace create --cwd "$PROJECT_DIR" --label "$TAB_LABEL" --no-focus 2>/dev/null \
    | python3 -c "import json,sys; d=json.load(sys.stdin)['result']; print(d['workspace']['workspace_id'], d['tab']['tab_id'], d['root_pane']['pane_id'])") || {
    echo "herdr workspace create failed" >&2
    exit 1
  }
  herdr tab rename "$TAB" "$TAB_LABEL_PEER" >/dev/null 2>&1 || true
fi
if [[ -z "$WORKSPACE" ]]; then
  echo "herdr workspace list failed" >&2
  exit 1
fi

# ── 2. One tab per peer — no splits. Warn (never refuse) past MAX_TABS. ──────
LIVE=$(herdr tab list --workspace "$WORKSPACE" 2>/dev/null | python3 -c "
import json, sys; print(len(json.load(sys.stdin)['result']['tabs']))" 2>/dev/null || echo 0)
if [[ "$LIVE" -ge "$MAX_TABS" ]]; then
  echo "warning: $LIVE tabs already open in workspace $WORKSPACE ($TAB_LABEL) — close verified peers (herdr tab close <id>)" >&2
fi
if [[ -z "$NEW_PANE" ]]; then
  # --cwd, not `cd <dir> && claude` as one shell string — that combination
  # silently dropped the path in testing.
  read -r TAB NEW_PANE < <(herdr tab create --workspace "$WORKSPACE" --cwd "$PROJECT_DIR" --label "$TAB_LABEL_PEER" --no-focus 2>/dev/null \
    | python3 -c "import json,sys; d=json.load(sys.stdin)['result']; print(d['tab']['tab_id'], d['root_pane']['pane_id'])") || {
    echo "herdr tab create failed" >&2
    exit 1
  }
fi

# CLAUDE_ENV is CLAUDE_NO_PICK=1 (default login) or CLAUDE_CONFIG_DIR='<dir>':
# either way the shell's interactive `claude` account picker is bypassed.
herdr pane run "$NEW_PANE" "$CLAUDE_ENV claude -n $PEER_NAME" >/dev/null 2>&1

# ── 4. Readiness: the pane's ACTUAL RENDERED TEXT, not herdr's semantic state ─
# Two other signals were tried and both proved unreliable in repeated live
# testing:
#   - The startup banner ("Claude Code v...") — prints once and scrolls out of
#     the read buffer within seconds.
#   - `pane list`'s `agent` field — turns "claude" as soon as the process
#     exists, well before the trust dialog (or anything) has rendered.
# What appears reliably, and only once the session is truly at its prompt, is
# the "auto mode on" footer hint. Give it ~30s: a fresh `claude` can
# auto-update itself before showing the prompt.
READY=""
TRUSTED_ALREADY=0
for _ in $(seq 1 20); do
  sleep 1.5
  # `--source visible`, not `recent-unwrapped` — the latter returned completely
  # empty output for a static, unchanging pane in testing. Flatten whitespace
  # before matching: a narrow pane wraps "trust this folder" across lines.
  OUT=$(herdr pane read "$NEW_PANE" --source visible --lines 30 2>/dev/null || true)
  OUT_FLAT=$(echo "$OUT" | tr '\n' ' ' | tr -s ' ')
  if echo "$OUT_FLAT" | grep -q "trust this folder"; then
    # First-ever launch in this directory. Down and Return as two separate
    # calls — sent together they landed on "No, exit" in testing.
    herdr pane send-keys "$NEW_PANE" Down >/dev/null 2>&1
    sleep 1
    herdr pane send-keys "$NEW_PANE" Return >/dev/null 2>&1
    sleep 2
    TRUSTED_ALREADY=1
    continue
  fi
  if echo "$OUT_FLAT" | grep -q "auto mode on"; then
    READY=1
    break
  fi
done

if [[ -z "$READY" ]]; then
  echo "peer session did not reach a ready prompt within timeout (trust dialog handled: $TRUSTED_ALREADY)" >&2
  exit 1
fi

echo "SESSION=$PEER_NAME PANE_ID=$NEW_PANE TAB_ID=$TAB WORKSPACE_ID=$WORKSPACE ACCOUNT=$ACCOUNT"
exit 0
