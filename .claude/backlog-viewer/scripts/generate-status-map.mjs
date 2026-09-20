#!/usr/bin/env node
// generate-status-map.mjs — build-time codegen from the shared task-status registry.
//
// status.ts is imported directly by client-rendered React components (board-view.tsx,
// tasks-board.tsx, task-card.tsx, activity-feed.tsx), so it ends up in the browser bundle —
// it cannot do a Node `fs` read of the registry at runtime the way project-meta.ts does for
// project.yaml (server-only). Generating a plain TS module at dev/build time instead keeps
// the single JSON source of truth (templates/task-status-registry.json, shipped to
// <project>/.claude/task-status-registry.json) without adding a runtime dependency.
//
// Run via package.json's predev/prebuild hooks. Safe to re-run — always overwrites.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Project install: <project>/.claude/backlog-viewer/scripts/ -> up 2 -> <project>/.claude/
const projectRegistry = join(__dirname, '..', '..', 'task-status-registry.json');
// Hub dev tree: tools/backlog-viewer/scripts/ -> up 3 -> <hub>/templates/
const hubRegistry = join(__dirname, '..', '..', '..', 'templates', 'task-status-registry.json');

// Last-resort embedded fallback, mirroring templates/task-status-registry.json's current
// content — only used if neither on-disk copy exists (e.g. a project that copied this
// script before `caw upgrade` started shipping the registry file itself). Failing the
// whole pnpm dev/build/test run over a missing reference-data file would be a worse
// outcome than a build using a possibly-one-version-stale embedded default.
const EMBEDDED_FALLBACK = {
  stages: [
    { key: 'pending', label: 'Pending' },
    { key: 'planning', label: 'Planning' },
    { key: 'coding', label: 'Coding' },
    { key: 'testing', label: 'Testing' },
    { key: 'review', label: 'Review' },
    { key: 'blocked', label: 'Blocked' },
    { key: 'done', label: 'Done' },
    { key: 'unknown', label: 'Unknown' },
  ],
  statuses: [
    { name: 'pending', label: 'Pending', stage: 'pending', terminal: false },
    { name: 'plan-pending', label: 'Plan pending', stage: 'pending', terminal: false },
    { name: 'planning', label: 'Planning', stage: 'planning', terminal: false },
    { name: 'plan-done', label: 'Plan ready', stage: 'planning', terminal: false },
    { name: 'planned', label: 'Plan ready', stage: 'planning', terminal: false },
    { name: 'coding', label: 'Coding', stage: 'coding', terminal: false },
    { name: 'code-pending', label: 'Code pending', stage: 'coding', terminal: false },
    { name: 'code-done', label: 'Code done', stage: 'coding', terminal: false },
    { name: 'in-progress', label: 'In progress', stage: 'coding', terminal: false },
    { name: 'in_progress', label: 'In progress', stage: 'coding', terminal: false },
    { name: 'testing', label: 'Testing', stage: 'testing', terminal: false },
    { name: 'red-done', label: 'Tests red', stage: 'testing', terminal: false },
    { name: 'tests-done', label: 'Tests passing', stage: 'testing', terminal: false },
    { name: 'tests-skipped', label: 'Tests skipped', stage: 'testing', terminal: false },
    { name: 'reviewing', label: 'Reviewing', stage: 'review', terminal: false },
    { name: 'review-pending', label: 'Review pending', stage: 'review', terminal: false },
    { name: 'ready-to-review', label: 'Ready to review', stage: 'review', terminal: false },
    { name: 'review-blocked', label: 'Review blocked', stage: 'blocked', terminal: false },
    { name: 'needs-rework', label: 'Needs rework', stage: 'blocked', terminal: false },
    { name: 'blocked', label: 'Blocked', stage: 'blocked', terminal: false },
    { name: 'review-done', label: 'Reviewed', stage: 'done', terminal: false },
    { name: 'verify-done', label: 'Reviewed', stage: 'done', terminal: false },
    { name: 'verified', label: 'Verified', stage: 'done', terminal: false },
    { name: 'review-approved', label: 'Review approved', stage: 'done', terminal: false },
    { name: 'approved', label: 'Approved', stage: 'done', terminal: false },
    { name: 'ready-to-commit', label: 'Ready to commit', stage: 'done', terminal: false },
    { name: 'done', label: 'Done', stage: 'done', terminal: true },
    { name: 'completed', label: 'Completed', stage: 'done', terminal: true },
    { name: 'closed', label: 'Closed', stage: 'done', terminal: true },
    { name: 'deferred', label: 'Deferred', stage: 'done', terminal: true },
  ],
};

const registryPath = existsSync(projectRegistry) ? projectRegistry : hubRegistry;
let registry;
if (existsSync(registryPath)) {
  registry = JSON.parse(readFileSync(registryPath, 'utf-8'));
} else {
  console.warn(
    `generate-status-map: no task-status-registry.json found at ${projectRegistry} or ${hubRegistry} — ` +
      `using an embedded fallback. Run \`caw upgrade\` on this project to get the real file.`,
  );
  registry = EMBEDDED_FALLBACK;
}

// Single-quoted, trailing-comma-on-every-line — matches this project's biome.json
// (quoteStyle: single, trailingCommas: all) so the generated file needs no reformatting.
const q = (s) => `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
// biome (useLiteralKeys) wants object keys unquoted when they're a valid identifier.
const IDENT = /^[A-Za-z_$][A-Za-z0-9_$]*$/;
const qKey = (s) => (IDENT.test(s) ? s : q(s));

const stageEntries = registry.stages.map((s) => `  { key: ${q(s.key)}, label: ${q(s.label)} },`).join('\n');
const stageToStageEntries = registry.statuses.map((s) => `  ${qKey(s.name)}: ${q(s.stage)},`).join('\n');
const labelEntries = registry.statuses.map((s) => `  ${qKey(s.name)}: ${q(s.label)},`).join('\n');
const terminalNames = registry.statuses.filter((s) => s.terminal).map((s) => q(s.name)).join(', ');

const sourceDescription = !existsSync(registryPath)
  ? 'an embedded fallback (no on-disk registry found)'
  : registryPath.includes('.claude')
    ? '<project>/.claude/task-status-registry.json'
    : 'templates/task-status-registry.json (hub dev fallback)';
const out = `// GENERATED by scripts/generate-status-map.mjs from ${sourceDescription}.
// DO NOT EDIT — re-run \`node scripts/generate-status-map.mjs\` (or \`pnpm dev\`/\`pnpm build\`,
// which run it automatically) to regenerate after the registry changes.

export const STAGE_DEFS: { key: string; label: string }[] = [
${stageEntries}
];

export const STATUS_TO_STAGE: Record<string, string> = {
${stageToStageEntries}
};

export const STATUS_LABELS: Record<string, string> = {
${labelEntries}
};

export const TERMINAL_STATUSES: Set<string> = new Set([${terminalNames}]);
`;

writeFileSync(join(__dirname, '..', 'src', 'lib', 'status-map.generated.ts'), out);
console.log(`generate-status-map: wrote src/lib/status-map.generated.ts (${registry.statuses.length} statuses, source: ${registryPath})`);
