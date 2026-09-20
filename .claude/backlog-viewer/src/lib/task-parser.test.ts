import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { parseParallelizationGroups, parseTasks } from './task-parser';

async function makeTask(
  projectRoot: string,
  taskId: string,
  overviewYaml: string,
  planMd = '',
): Promise<void> {
  const dir = join(projectRoot, '.claude', 'conductor', 'tasks', taskId);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, 'overview.yaml'), overviewYaml, 'utf8');
  await writeFile(join(dir, 'plan.md'), planMd, 'utf8');
}

describe('parseTasks — dependency graph fields', () => {
  let projectRoot: string;

  afterEach(async () => {
    if (projectRoot) await rm(projectRoot, { recursive: true, force: true });
  });

  it('parses blocks_deploy_of, chains_after, related_tasks, and parallelization_groups when present', async () => {
    projectRoot = await mkdtemp(join(tmpdir(), 'task-parser-full-'));
    await makeTask(
      projectRoot,
      'task-full',
      `id: task-full
title: Full task
status: coding
lane: standard
related_tasks: [task-other]
phases:
  - id: db
    status: done
    files: schema.sql
    depends_on: []
    blocks_deploy_of: [backend]
  - id: backend
    status: pending
    files: api.ts
    depends_on: [db]
    chains_after: task-other
`,
      `# Plan

\`\`\`yaml
parallelization_groups:
  - [db]
  - [backend, frontend-skeleton]
\`\`\`
`,
    );

    const tasks = await parseTasks(projectRoot);
    expect(tasks).toHaveLength(1);
    const task = tasks[0];

    expect(task.related_tasks).toEqual(['task-other']);
    expect(task.parallelizationGroups).toEqual([['db'], ['backend', 'frontend-skeleton']]);

    const db = task.phases.find((p) => p.id === 'db');
    expect(db?.blocks_deploy_of).toEqual(['backend']);

    const backend = task.phases.find((p) => p.id === 'backend');
    expect(backend?.chains_after).toBe('task-other');
  });

  it('leaves the new fields undefined when absent, without crashing', async () => {
    projectRoot = await mkdtemp(join(tmpdir(), 'task-parser-empty-'));
    await makeTask(
      projectRoot,
      'task-bare',
      `id: task-bare
title: Bare task
status: pending
phases:
  - id: only-phase
    status: pending
    files: x.ts
    depends_on: []
`,
      '# Plan\n\nNo yaml block here.\n',
    );

    const tasks = await parseTasks(projectRoot);
    expect(tasks).toHaveLength(1);
    const task = tasks[0];

    expect(task.related_tasks).toBeUndefined();
    expect(task.parallelizationGroups).toBeUndefined();

    const phase = task.phases[0];
    expect(phase.blocks_deploy_of).toBeUndefined();
    expect(phase.chains_after).toBeUndefined();
  });
});

describe('parseParallelizationGroups', () => {
  it('extracts groups from a plan.md with the fenced yaml block', () => {
    const planMd = `# Plan — task-good

## Plan

\`\`\`yaml
phases:
  - id: db
    description: "..."
    depends_on: []

parallelization_groups:
  - [db]
  - [backend]
  - [frontend, docs]
\`\`\`
`;
    expect(parseParallelizationGroups(planMd)).toEqual([['db'], ['backend'], ['frontend', 'docs']]);
  });

  it('returns undefined for a plan.md without the block', () => {
    const planMd = `# Plan — task-broken

Just prose here, no yaml fence with parallelization_groups.
`;
    expect(parseParallelizationGroups(planMd)).toBeUndefined();
  });
});
