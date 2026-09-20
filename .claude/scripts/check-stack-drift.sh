#!/usr/bin/env bash
# check-stack-drift — warns when package.json has changed since the last
# /caw-setup run, meaning conventions.md's "Verify commands" section
# (lint/test/type-check) and skill-map.yaml may no longer match reality.
#
#   bash .claude/scripts/check-stack-drift.sh
#
# Advisory only: prints a warning line when stale, prints nothing when
# clean (or when there's nothing to compare — no package.json, or no
# fingerprint recorded yet). Always exits 0 — never a gate. Run from
# anywhere inside the project.
set -euo pipefail

find_root() {
  local d; d="$(pwd)"
  while [[ "$d" != "/" ]]; do
    [[ -f "$d/.claude/skill-map.yaml" ]] && { echo "$d"; return 0; }
    d="$(dirname "$d")"
  done
  return 1
}
ROOT="$(find_root || true)"
[[ -z "$ROOT" ]] && exit 0   # no /caw-setup output yet — nothing to check

PKG="$ROOT/package.json"
MAP="$ROOT/.claude/skill-map.yaml"
[[ -f "$PKG" ]] || exit 0    # non-Node project — no fingerprint tracked (v1)

hash_file() {
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$1" | cut -d' ' -f1
  else
    shasum -a 256 "$1" | cut -d' ' -f1
  fi
}

RECORDED="$(grep -m1 '^# stack-fingerprint:' "$MAP" 2>/dev/null | sed -E 's/^# stack-fingerprint:[ \t]*//')"
if [[ -z "$RECORDED" ]]; then
  echo "⚠️  .claude/skill-map.yaml has no stack-fingerprint yet (generated before drift tracking existed) — run /caw-setup --refresh once to enable this check."
  exit 0
fi

CURRENT="$(hash_file "$PKG")"
if [[ "$RECORDED" != "$CURRENT" ]]; then
  echo "⚠️  package.json changed since /caw-setup last ran — .claude/conductor/conventions.md § Verify commands and skill-map.yaml may be stale. Run /caw-setup --refresh to regenerate."
fi
