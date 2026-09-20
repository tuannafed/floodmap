import { readdir, readFile, stat } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { parse as parseYaml } from 'yaml';

export interface Phase {
  id: string;
  status: string;
  files: string;
  depends_on?: string[];
  skills_hint?: string[];
  blocks_deploy_of?: string[];
  chains_after?: string;
}

export interface Task {
  id: string;
  title: string;
  status: string;
  lane: string;
  type: string;
  next_phase: string;
  created: string;
  updated: string;
  phases: Phase[];
  related_tasks?: string[];
  parallelizationGroups?: string[][];
  sections: {
    plan: string;
    code: string;
    tests: string;
    review: string;
    overview: string; // raw overview.yaml content
  };
}

const MAX_LINES = 600;

async function readRaw(path: string): Promise<string> {
  try {
    return (await readFile(path, 'utf8')).replace(/\r$/gm, '');
  } catch {
    return '';
  }
}

async function readContent(path: string): Promise<string> {
  const raw = await readRaw(path);
  const lines = raw.split('\n');
  if (lines.length > MAX_LINES) {
    lines.length = MAX_LINES;
    lines.push(`\n*[truncated at ${MAX_LINES} lines]*`);
  }
  return lines.join('\n');
}

interface OverviewYaml {
  id?: string;
  title?: string;
  status?: string;
  lane?: string;
  type?: string;
  next_phase?: string;
  created?: string;
  updated?: string;
  created_at?: string;
  updated_at?: string;
  phases?: Array<{
    id: string;
    status?: string;
    files?: string | string[];
    depends_on?: string[];
    skills_hint?: string[];
    blocks_deploy_of?: string[];
    chains_after?: string;
  }>;
  related_tasks?: string[];
}

function normalizeFiles(files: string | string[] | undefined): string {
  if (!files) return '';
  if (Array.isArray(files)) return files.join(', ');
  return files;
}

/**
 * plan.md is mostly prose, but the planner appends a fenced ```yaml block
 * under `## Plan` that includes a top-level `parallelization_groups:` key,
 * e.g.:
 *   parallelization_groups:
 *     - [db]
 *     - [backend, frontend-skeleton]
 * Scrape just that block rather than parsing the whole file as YAML — most
 * plan.md files won't have it, or use a different structure entirely.
 */
export function parseParallelizationGroups(planMd: string): string[][] | undefined {
  // Line-by-line scan — kept in lockstep with templates/scripts/check-overview.py's
  // plan_parallelization_groups() (same algorithm: tolerate blank/indented lines inside the
  // block, stop at the first dedented non-list line) so the viewer and the CI schema check can
  // never silently disagree about whether a plan.md carries this block.
  const keyMatch = planMd.match(/^parallelization_groups:\s*$/m);
  if (!keyMatch || keyMatch.index === undefined) return undefined;

  const rest = planMd.slice(keyMatch.index + keyMatch[0].length);
  const groups: string[][] = [];
  for (const line of rest.split('\n').slice(1)) {
    const groupMatch = line.match(/^\s*-\s*\[(.*)\]\s*$/);
    if (groupMatch) {
      groups.push(
        groupMatch[1]
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      );
      continue;
    }
    if (line.trim() === '' || line.startsWith(' ')) continue;
    break;
  }
  return groups.length > 0 ? groups : undefined;
}

/**
 * overview.yaml is meant to be pure YAML, but some caw agents append a
 * Markdown `## Verify` section after the YAML body. A bare `**Tests:** ...`
 * line trips the YAML parser ("implicit map key needs a value"), which would
 * otherwise drop the whole task from the board. Strip everything from the
 * first top-level Markdown heading onward so the valid YAML head still parses.
 */
function stripTrailingMarkdown(raw: string): string {
  const lines = raw.split('\n');
  const headingIdx = lines.findIndex((l) => /^#{1,6}\s/.test(l));
  return headingIdx === -1 ? raw : lines.slice(0, headingIdx).join('\n');
}

async function parseTask(taskDir: string): Promise<Task | null> {
  const overviewPath = join(taskDir, 'overview.yaml');
  let overviewRaw: string;
  try {
    overviewRaw = await readFile(overviewPath, 'utf8');
  } catch {
    // No overview.yaml → not a valid caw task; skip.
    return null;
  }

  let yaml: OverviewYaml = {};
  try {
    yaml = parseYaml(overviewRaw) || {};
  } catch {
    // Likely a trailing Markdown section appended after the YAML body.
    // Retry against just the YAML head before giving up on the task.
    try {
      yaml = parseYaml(stripTrailingMarkdown(overviewRaw)) || {};
      console.warn(`[task-parser] ${overviewPath}: ignored trailing Markdown after YAML body`);
    } catch (err) {
      console.error(`[task-parser] failed to parse ${overviewPath}:`, err);
      return null;
    }
  }

  const id = yaml.id || basename(taskDir).replace(/\/$/, '');
  const title = yaml.title || id;
  const status = yaml.status || 'pending';
  const phases: Phase[] = (yaml.phases || []).map((p) => ({
    id: p.id,
    status: p.status || 'pending',
    files: normalizeFiles(p.files),
    depends_on: p.depends_on,
    skills_hint: p.skills_hint,
    blocks_deploy_of: p.blocks_deploy_of,
    chains_after: p.chains_after,
  }));

  const [plan, code, tests, review, planRaw] = await Promise.all([
    readContent(join(taskDir, 'plan.md')),
    readContent(join(taskDir, 'code.md')),
    readContent(join(taskDir, 'tests.md')),
    readContent(join(taskDir, 'review.md')),
    readRaw(join(taskDir, 'plan.md')),
  ]);

  return {
    id,
    title,
    status,
    lane: yaml.lane || '',
    type: yaml.type || '',
    next_phase: yaml.next_phase || '',
    created: yaml.created || yaml.created_at || '',
    updated: yaml.updated || yaml.updated_at || '',
    phases,
    related_tasks: yaml.related_tasks,
    // Parsed from the untruncated file — readContent()'s 600-line display cap would otherwise
    // silently drop `parallelization_groups:` on a long plan.md (it's near the end, after the
    // spec/challenge sections, for a risky-lane task).
    parallelizationGroups: parseParallelizationGroups(planRaw),
    sections: { plan, code, tests, review, overview: overviewRaw },
  };
}

export async function parseTasks(projectRoot: string): Promise<Task[]> {
  const tasksDir = join(projectRoot, '.claude', 'conductor', 'tasks');
  let entries: string[];
  try {
    entries = await readdir(tasksDir);
  } catch {
    return [];
  }

  const taskDirs: string[] = [];
  for (const name of entries) {
    if (!name.startsWith('task-')) continue;
    const full = join(tasksDir, name);
    try {
      const s = await stat(full);
      if (s.isDirectory()) taskDirs.push(full);
    } catch {
      // ignore
    }
  }

  taskDirs.sort();
  const tasks = await Promise.all(taskDirs.map((d) => parseTask(d)));
  return tasks.filter((t): t is Task => t !== null);
}

export function getProjectName(projectRoot: string): string {
  return basename(projectRoot.replace(/\/$/, ''));
}
