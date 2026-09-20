import {
  Ban,
  CheckCircle2,
  Compass,
  HelpCircle,
  type LucideIcon,
  Pause,
  Search,
  Settings,
  TestTube,
} from 'lucide-react';
import { STAGE_DEFS, STATUS_LABELS, STATUS_TO_STAGE } from './status-map.generated';
import type { Phase, Task } from './task-parser';

export interface Stage {
  key: string;
  label: string;
  icon: LucideIcon;
  color: string;
}

// Icon + color per stage key — kept here (not codegen'd) since they're presentation-only
// and the registry has no opinion on iconography. Stage keys/labels/order come from
// STAGE_DEFS (generated from templates/task-status-registry.json).
const STAGE_ICON: Record<string, LucideIcon> = {
  pending: Pause,
  planning: Compass,
  coding: Settings,
  testing: TestTube,
  review: Search,
  blocked: Ban,
  done: CheckCircle2,
  unknown: HelpCircle,
};
const STAGE_COLOR: Record<string, string> = {
  pending: '#718096',
  planning: '#805ad5',
  coding: '#dd6b20',
  testing: '#3182ce',
  review: '#d69e2e',
  blocked: '#c53030',
  done: '#48bb78',
  unknown: '#a0aec0',
};

// Stage-based columns matching the task lifecycle.
// Mapping from the `status:` field in `overview.yaml` → stage column.
export const STAGES: Stage[] = STAGE_DEFS.map((s) => ({
  key: s.key,
  label: s.label,
  icon: STAGE_ICON[s.key] || HelpCircle,
  color: STAGE_COLOR[s.key] || '#a0aec0',
}));

export function statusLabel(status: string): string {
  const s = (status || 'pending').toLowerCase().trim();
  return STATUS_LABELS[s] || s.replace(/[-_]/g, ' ');
}

// A status this registry doesn't recognize lands in a distinct "unknown" bucket instead of
// silently reading as a normal pending task — never crashes, but never hides the mismatch.
export function getStageKey(task: Task): string {
  const status = (task.status || 'pending').toLowerCase().trim();
  return STATUS_TO_STAGE[status] || 'unknown';
}

export function groupByStage(tasks: Task[]): Record<string, Task[]> {
  const groups: Record<string, Task[]> = {};
  for (const stage of STAGES) groups[stage.key] = [];
  for (const t of tasks) {
    const key = getStageKey(t);
    (groups[key] || groups.unknown).push(t);
  }
  return groups;
}

export interface Stats {
  total: number;
  inProgress: number;
  done: number;
  pending: number;
  blocked: number;
}

export function computeStats(tasks: Task[]): Stats {
  const total = tasks.length;
  let inProgress = 0;
  let done = 0;
  let pending = 0;
  let blocked = 0;
  for (const t of tasks) {
    const stage = getStageKey(t);
    if (stage === 'done') done++;
    else if (stage === 'blocked') blocked++;
    else if (stage === 'pending') pending++;
    else inProgress++;
  }
  return { total, inProgress, done, pending, blocked };
}

export function phaseProgress(task: Task): { done: number; total: number; label: string } | null {
  const phases = task.phases || [];
  if (phases.length === 0) return null;
  const done = phases.filter((p: Phase) => {
    const s = (p.status || '').toLowerCase();
    return s === 'done' || s === 'skipped';
  }).length;
  return { done, total: phases.length, label: `${done}/${phases.length} phases` };
}

// Color of the stage column a task currently sits in — used to tint the
// status pill on the card so it reads at a glance.
export function stageColor(task: Task): string {
  const key = getStageKey(task);
  return STAGES.find((s) => s.key === key)?.color || '#718096';
}

export function laneColor(lane: string): string {
  const v = (lane || '').toLowerCase();
  if (v === 'risky') return '#fc8181';
  if (v === 'standard') return '#63b3ed';
  if (v === 'tiny') return '#68d391';
  return '#718096';
}

export function shortDate(s: string): string {
  if (!s) return '';
  return s.split(/[ T]/)[0];
}
