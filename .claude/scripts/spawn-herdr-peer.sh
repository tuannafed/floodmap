#!/usr/bin/env bash
# Spawn a named `claude` peer session in a new herdr pane, ready to receive a
# SendMessage. Does NOT send any task to it — that's a tool call only the
# calling agent can make (SendMessage isn't invokable from a shell script).
#
# Usage: spawn-herdr-peer.sh <peer-name>
# Exit 0: peer is live and idle at its prompt. Prints `PANE_ID=<id>` to stdout.
# Exit 2: herdr is not installed — caller should fall back to the Agent/Task tool.
# Exit 1: herdr is installed but spawning failed, or did not reach a ready
#         prompt within the timeout (see stderr).
#
# IMPORTANT — exit 0 does NOT mean SendMessage will reach the peer yet.
# There is a separate, additional propagation delay (observed ~30-60s+ in
# testing, not something this script can shorten or detect — ListAgents/
# SendMessage are tools, not shell-callable) between "herdr shows the pane
# ready" and "the peer is addressable via SendMessage/ListAgents". The
# CALLER must retry SendMessage with backoff on a "not reachable" error
# instead of treating this script's exit 0 as reachability.
#
# Provenance: every herdr call here (pane list/split/run/send-keys/read) and
# the trust-dialog handling were verified live in a real Ghostty+herdr window,
# 2026-09-05 — including two readiness-detection designs that were tried,
# proven unreliable by repeated live testing, and abandoned (see below) before
# landing on the text-based check this script actually uses.
set -euo pipefail

PEER_NAME="${1:?usage: spawn-herdr-peer.sh <peer-name>}"

if ! command -v herdr >/dev/null 2>&1; then
  echo "herdr not installed" >&2
  exit 2
fi

ANCHOR=$(herdr pane list | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['result']['panes'][0]['pane_id'])" 2>/dev/null) || {
  echo "herdr pane list failed or returned no panes" >&2
  exit 1
}

# Pick a split direction from the anchor's actual current width, so spawning
# several peers in a row doesn't keep halving the same shrinking column
# (right, right, right, ... → each pane narrower than the last, which is
# exactly what produced the word-wrap bugs this script already works around
# below). Split right while there's still room for it (>=160 cols, leaves
# ~80 after halving), otherwise grow downward instead, which doesn't shrink
# width. Must read the SPECIFIC pane's own `rect.width` from
# `layout.panes[]` (matched by pane_id) — `layout.area.width` looked like
# the right field but is the whole tab's width, constant no matter how many
# splits happened inside it; using that produced 4 straight `right` splits
# in a row in testing, because the check was comparing against a number
# that never changed.
ANCHOR_WIDTH=$(herdr pane edges --pane "$ANCHOR" 2>/dev/null | python3 -c "
import json, sys
d = json.load(sys.stdin)
for p in d['result']['edges']['layout']['panes']:
    if p['pane_id'] == '$ANCHOR':
        print(p['rect']['width'])
        sys.exit(0)
print(999)
" 2>/dev/null || echo 999)
if [[ "$ANCHOR_WIDTH" -lt 160 ]]; then
  SPLIT_DIR=down
else
  SPLIT_DIR=right
fi

# Pass the target cwd via herdr's own --cwd flag, not `cd <dir> && claude ...`
# as one shell string — that combination was tested and found to silently
# drop the path (pane title showed `cd  && claude -n <name>`, empty between
# `cd` and `&&`). `--cwd` avoids the shell-string concatenation entirely.
NEW_PANE=$(herdr pane split "$ANCHOR" --direction "$SPLIT_DIR" --cwd "$(pwd)" 2>/dev/null | python3 -c "import json,sys; print(json.load(sys.stdin)['result']['pane']['pane_id'])") || {
  echo "herdr pane split failed" >&2
  exit 1
}

herdr pane run "$NEW_PANE" "claude -n $PEER_NAME" >/dev/null 2>&1

# Poll for readiness using the pane's ACTUAL RENDERED TEXT, not herdr's own
# semantic state. Two other signals were tried and both proved unreliable in
# repeated live testing:
#   - The startup banner ("Claude Code v2.1.260 ...") — it prints once and
#     scrolls out of the read buffer within seconds; a genuinely ready pane
#     can already have lost it from a `--lines 30` read.
#   - `pane list`'s `agent` field — it was caught turning `"claude"` almost
#     immediately after the process starts, well before the trust dialog (or
#     anything) had actually rendered. Even requiring 2 consecutive
#     dialog-free reads of this field 1.5s apart still declared success on
#     panes that were, moments later, confirmed still sitting unconfirmed at
#     the trust dialog — the field says "a claude process exists", not
#     "the UI has reached a stable state".
# What DOES appear reliably, and only once the session is truly at its
# prompt, is the "auto mode on" footer hint. Wait for that specifically.
#
# Give it up to ~30s across 20 attempts — a fresh `claude` launch can
# auto-update itself before showing the prompt, which has taken longer than
# a 10s budget in testing.
READY=""
TRUSTED_ALREADY=0
for _ in $(seq 1 20); do
  sleep 1.5
  # `--source visible`, not `recent-unwrapped` — the latter returned
  # completely empty output for a static, unchanging pane in testing (it
  # appears to be an incremental/diff buffer of recent activity, not a
  # full-screen snapshot; a pane sitting idle at the trust dialog with no
  # new terminal output has nothing "recent" to return). `visible` reliably
  # returns the actual current screen every time.
  #
  # A genuinely narrow pane (several `--direction right` splits deep, each
  # halving the remaining width) wraps any phrase across lines regardless
  # of read source, because the terminal itself is that narrow, not because
  # of a capture-side artifact. Flatten all whitespace/newlines before
  # matching so wrapping at any column width can't hide a phrase — this was
  # caught live: a real pane wrapped "trust this folder" as "trust\n   this\n
  # folder".
  OUT=$(herdr pane read "$NEW_PANE" --source visible --lines 30 2>/dev/null || true)
  OUT_FLAT=$(echo "$OUT" | tr '\n' ' ' | tr -s ' ')
  if echo "$OUT_FLAT" | grep -q "trust this folder"; then
    # First-ever launch in this directory — confirm trust. Send Down and
    # Return as two separate calls, not one — sending both together landed
    # on the wrong ("No, exit") option in testing and exited the session.
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

echo "PANE_ID=$NEW_PANE"
exit 0
