---
paths:
  - "**/skill-map.yaml"
---
# Rule: Plugin Skill Fallback

Auto-loads for whoever reads `.claude/skill-map.yaml` (planner, coder, tester, reviewer — all four consult it when selecting or verifying a skill per `harness-contract.md § Skill loading`). Supplements that section for the one case it doesn't cover: caw's own catalog (caw-owned skills under `templates/skills/`, hub skills under `.agents/skills/`, both ending up in `.claude/skills/`) is JS/TS-only today. A Go, Rust, Java, Swift, or Python project — or any need the catalog simply doesn't have a skill for — has no local match, by design, not by omission.

## When this applies

`/caw-setup` (Step 2.3, `agents/setup.md`) writes a `plugin_fallback:` key into `skill-map.yaml` **only** when `scripts/discovery/match-skills.py` reports `summary.no_local_catalog_coverage: true` for a detected language — i.e. the stack was real (dependencies were found) but nothing in the catalog was triggered by any of them:

```yaml
plugin_fallback:
  languages: [go]
  note: "No caw-curated skills for go yet — rely on plugin skills (e.g. superpowers:*, agent-skills:*) if installed, per rules/common/plugin-skill-fallback.md."
```

No `plugin_fallback:` key at all (the common case for a JS/TS project) means there is no known gap — proceed with `.claude/skill-map.yaml`'s normal `installed_skills`/`defaults` entries exactly as `harness-contract.md § Skill loading` already describes. Do not go looking for plugin skills when the local catalog already covers the need.

## What's allowed when it does apply

A plugin-namespaced skill — `<plugin>:<skill-name>`, e.g. `superpowers:test-driven-development`, `agent-skills:code-review-and-quality` — may be called **only if it actually appears in your own skill listing this turn**. That is the entire bar: a name you can see is a real, verifiable option, not a guess. This is a deliberate, narrow exception to the "never invent skill names, only use skills from `.claude/skill-map.yaml`" rule (`agents/planner.md`) — it does not license naming a plugin skill from memory, from a past session, or from what a plugin *probably* ships. If it's not in the listing you can see right now, it doesn't exist for this purpose.

Priority order, always: **caw-owned → hub → plugin.** A plugin skill is a last resort for a genuine gap, never a substitute for a local skill that already fits.

## Failure handling

Plugins are installed per-machine, per-user (`~/.claude/settings.json`) — most projects, and most other people's machines, will not have `superpowers` or `agent-skills` enabled. Treat an attempted plugin-skill call exactly like the existing "optional skill missing" branch in `harness-contract.md § Skill loading`: if the call fails, `⚠️ <skill> unavailable — proceeding degraded`, note it in the task file, and continue. **Never hard-stop or abort a phase just because a plugin isn't installed** — that would make every non-JS project un-runnable on any machine without these specific plugins, which defeats the point of a fallback.
