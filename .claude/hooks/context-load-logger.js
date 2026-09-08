#!/usr/bin/env node
/**
 * Context-load logger: records the two context sources the transcript UI
 * does NOT show — rules auto-injected by `paths:` glob match, and skills
 * loaded via the Skill tool — plus subagent start/stop markers so the reader
 * can tell which agent loaded what when several run in parallel.
 *
 * Wired in templates/settings.json to four events:
 *   InstructionsLoaded  (matcher: path_glob_match|nested_traversal|include)
 *   PostToolUse         (matcher: Skill)
 *   SubagentStart / SubagentStop
 *
 * Writes one human-readable line per event to
 *   <project>/.claude/logs/context-loaded-<session-id>.log
 * Not os.tmpdir() like post-edit-accumulator — this file exists to be opened
 * by a person after the run, so it has to be findable. `.claude/` is already
 * in the caw .gitignore block, so nothing new to ignore.
 *
 * Verified live 2026-09-07 (headless `claude -p` + a custom subagent):
 *   - InstructionsLoaded/path_glob_match DOES fire when a subagent reads a
 *     matching file, but the event carries NO agent_type — hence the
 *     SubagentStart/Stop markers.
 *   - PostToolUse for Skill carries agent_type and tool_input.skill.
 */

'use strict';

const fs = require('fs');
const path = require('path');

function logFile(input) {
  const raw = String(input.session_id || 'unknown');
  const id = raw.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64);
  const dir = path.join(input.cwd || process.cwd(), '.claude', 'logs');
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, `context-loaded-${id}.log`);
}

function rel(input, p) {
  if (!p) return '';
  const base = input.cwd || process.cwd();
  return p.startsWith(base + path.sep) ? p.slice(base.length + 1) : p;
}

function line(input) {
  const agent = input.agent_type || 'main';
  switch (input.hook_event_name) {
    case 'InstructionsLoaded': {
      if (input.load_reason === 'session_start' || input.load_reason === 'compact') return null;
      const trigger = input.trigger_file_path ? `  <- ${rel(input, input.trigger_file_path)}` : '';
      // No agent_type on this event (verified live) — print `-`, not `main`,
      // so the reader attributes it by position between AGENT start/stop markers.
      return `-  RULE   ${rel(input, input.file_path)}${trigger}`;
    }
    case 'PostToolUse': {
      if (input.tool_name !== 'Skill') return null;
      const skill = input.tool_input && input.tool_input.skill;
      return skill ? `${agent}  SKILL  ${skill}` : null;
    }
    case 'SubagentStart':
      return `${agent}  AGENT  start`;
    case 'SubagentStop':
      return `${agent}  AGENT  stop`;
    default:
      return null;
  }
}

function run(rawInput) {
  try {
    const input = JSON.parse(rawInput);
    const text = line(input);
    if (text) {
      const ts = new Date().toTimeString().slice(0, 8);
      fs.appendFileSync(logFile(input), `${ts}  ${text}\n`, 'utf8');
    }
  } catch { /* invalid input — pass through */ }
  return rawInput;
}

if (require.main === module) {
  let data = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', chunk => { data += chunk; });
  process.stdin.on('end', () => { process.stdout.write(run(data)); process.exit(0); });
}

module.exports = { run };
