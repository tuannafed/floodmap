#!/usr/bin/env node
/**
 * Context-load logger: records the two context sources the transcript UI
 * does NOT show — rules auto-injected by `paths:` glob match, and skills
 * loaded via the Skill tool — plus subagent start/stop markers so the reader
 * can tell which agent loaded what when several run in parallel.
 *
 * Wired in templates/settings.json to five events:
 *   InstructionsLoaded  (matcher: path_glob_match|nested_traversal|include)
 *   PostToolUse         (matcher: Skill)
 *   SubagentStart / SubagentStop
 *   UserPromptSubmit    (task column anchor — stdout MUST stay empty here)
 *
 * Writes one line per event to <project>/.claude/logs/context-loaded-<session-id>.log:
 *   YYYY-MM-DD HH:MM:SS  <task-id|->  <agent|->  RULE|SKILL|AGENT|TASK  <detail>
 * The task id is inferred (conductor/tasks/<id>/ in a path, or a task id in the
 * user's prompt) and remembered per session in .claude/logs/.task-<session-id>.
 * Not os.tmpdir() like post-edit-accumulator — this file exists to be opened
 * by a person after the run, so it has to be findable. `.claude/logs/` is in
 * the caw .gitignore block (the rest of `.claude/` is committed).
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

function logDir(input) {
  const dir = path.join(input.cwd || process.cwd(), '.claude', 'logs');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function sessionId(input) {
  return String(input.session_id || 'unknown').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64);
}

function rel(input, p) {
  if (!p) return '';
  const base = input.cwd || process.cwd();
  return p.startsWith(base + path.sep) ? p.slice(base.length + 1) : p;
}

// caw task ids: task-NNN-slug or task-vX.Y-NNN-slug. Requiring digits after
// `task-` keeps prose like "task-notification" (system-injected prompts) and
// trailing sentence punctuation out of the column.
const TASK_ID = /task-(?:v\d+(?:\.\d+)*-)?\d+(?:[A-Za-z0-9._-]*[A-Za-z0-9])?/;

// The task column. Hooks receive no task id, so it is inferred and remembered
// per session in a sidecar file:
//   1. a file path in this event under conductor/tasks/<id>/  (most precise)
//   2. a task id mentioned in the user's prompt (UserPromptSubmit)
//   3. whatever an earlier event in this session already resolved
function taskFor(input, dir) {
  const side = path.join(dir, `.task-${sessionId(input)}`);
  const paths = [input.file_path, input.trigger_file_path,
    input.tool_input && input.tool_input.file_path].filter(Boolean);
  let task = null;
  for (const p of paths) {
    const m = String(p).match(/conductor\/tasks\/(task-[A-Za-z0-9._-]*[A-Za-z0-9])/);
    if (m) { task = m[1]; break; }
  }
  if (!task && input.hook_event_name === 'UserPromptSubmit') {
    const m = String(input.prompt || '').match(TASK_ID);
    if (m) task = m[0];
  }
  if (task) { try { fs.writeFileSync(side, task, 'utf8'); } catch { /* ignore */ } return task; }
  try { return fs.readFileSync(side, 'utf8').trim() || '-'; } catch { return '-'; }
}

function line(input) {
  const agent = input.agent_type || 'main';
  switch (input.hook_event_name) {
    case 'UserPromptSubmit': {
      // Only worth a line when the prompt names a task — that is what re-anchors the column.
      const m = String(input.prompt || '').match(TASK_ID);
      if (!m) return null;
      const head = String(input.prompt).replace(/\s+/g, ' ').slice(0, 70);
      return `${agent}  TASK   ${head}`;
    }
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

function stamp() {
  const d = new Date();
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

function run(rawInput) {
  let event = '';
  try {
    const input = JSON.parse(rawInput);
    event = input.hook_event_name || '';
    const text = line(input);
    if (text) {
      const dir = logDir(input);
      const task = taskFor(input, dir);
      fs.appendFileSync(path.join(dir, `context-loaded-${sessionId(input)}.log`),
        `${stamp()}  ${task}  ${text}\n`, 'utf8');
    } else if (event === 'UserPromptSubmit') {
      taskFor(input, logDir(input)); // still refresh the sidecar from any path in the prompt
    }
  } catch { /* invalid input — pass through */ }
  // A UserPromptSubmit hook's stdout is injected into Claude's context — never echo the payload there.
  return event === 'UserPromptSubmit' ? '' : rawInput;
}

if (require.main === module) {
  let data = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', chunk => { data += chunk; });
  process.stdin.on('end', () => { process.stdout.write(run(data)); process.exit(0); });
}

module.exports = { run };
