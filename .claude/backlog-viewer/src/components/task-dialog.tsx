import { Calendar, FileText, Layers } from 'lucide-react';
import type { ReactNode } from 'react';
import { MarkdownBody } from '@/components/markdown-body';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useI18n } from '@/lib/i18n/context';
import type { Dict } from '@/lib/i18n/dict';
import { laneColor, phaseProgress, shortDate, stageColor, statusLabel } from '@/lib/status';
import type { Task } from '@/lib/task-parser';

interface SectionDef {
  key: 'plan' | 'code' | 'tests' | 'review';
  label: string;
}

function getSections(s: Dict): SectionDef[] {
  return [
    { key: 'plan', label: s.taskDialog.tabs.plan },
    { key: 'code', label: s.taskDialog.tabs.code },
    { key: 'tests', label: s.taskDialog.tabs.tests },
    { key: 'review', label: s.taskDialog.tabs.review },
  ];
}

interface TaskDialogProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function MetaCell({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <div className="text-sm font-semibold text-foreground">{children}</div>
    </div>
  );
}

function OverviewInfo({
  task,
  s,
  status,
}: {
  task: Task;
  s: Dict;
  status: (key: string, fallback: string) => string;
}) {
  const progress = phaseProgress(task);
  const pct = progress ? Math.round((progress.done / Math.max(1, progress.total)) * 100) : 0;
  const stageClr = stageColor(task);
  const laneClr = laneColor(task.lane);

  return (
    <div className="rounded-xl border border-border/60 bg-muted/10 overflow-hidden mb-6">
      <div className="grid grid-cols-4 divide-x divide-border/40 border-b border-border/40">
        {/* Row 1: Status | Lane | Type | Next Phase */}
        <div className="px-4 py-4">
          <MetaCell label={s.taskDialog.meta.status}>
            <span
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full"
              style={{ backgroundColor: `${stageClr}20`, color: stageClr }}
            >
              <span
                className="size-1.5 rounded-full shrink-0"
                style={{ backgroundColor: stageClr }}
              />
              {status(task.status, statusLabel(task.status))}
            </span>
          </MetaCell>
        </div>
        <div className="px-4 py-4">
          <MetaCell label={s.taskDialog.meta.lane}>
            {task.lane ? (
              <span
                className="inline-flex text-xs font-semibold px-2.5 py-0.5 rounded-full capitalize"
                style={{ backgroundColor: `${laneClr}20`, color: laneClr }}
              >
                {task.lane}
              </span>
            ) : (
              <span className="text-muted-foreground/40">—</span>
            )}
          </MetaCell>
        </div>
        <div className="px-4 py-4">
          <MetaCell label={s.taskDialog.meta.type}>
            <span className="capitalize">{task.type || '—'}</span>
          </MetaCell>
        </div>
        <div className="px-4 py-4">
          <MetaCell label={s.taskDialog.meta.nextPhase}>
            {task.next_phase ? (
              <code className="font-mono text-xs text-primary">{task.next_phase}</code>
            ) : (
              <span className="text-muted-foreground/40">—</span>
            )}
          </MetaCell>
        </div>
      </div>

      {/* Row 2: Phases | Created | Updated */}
      <div className="grid grid-cols-4 divide-x divide-border/40 border-b border-border/40">
        <div className="px-4 py-4 col-span-2">
          <MetaCell label={s.taskDialog.meta.phases}>
            {progress ? (
              <span className="text-[15px]">
                {s.taskDialog.doneOfTotal(progress.done, progress.total)}
              </span>
            ) : (
              <span className="text-muted-foreground/40">—</span>
            )}
          </MetaCell>
        </div>
        <div className="px-4 py-4">
          <MetaCell label={s.taskDialog.meta.created}>
            <span className="flex items-center gap-1.5">
              <Calendar className="size-3.5 text-muted-foreground" />
              <span className="font-mono text-[13px]">{shortDate(task.created) || '—'}</span>
            </span>
          </MetaCell>
        </div>
        <div className="px-4 py-4">
          <MetaCell label={s.taskDialog.meta.updated}>
            <span className="flex items-center gap-1.5">
              <Calendar className="size-3.5 text-muted-foreground" />
              <span className="font-mono text-[13px]">{shortDate(task.updated) || '—'}</span>
            </span>
          </MetaCell>
        </div>
      </div>

      {/* Row 3: Progress (full width) */}
      <div className="px-4 py-4">
        <MetaCell label={s.taskDialog.meta.progress}>
          {progress ? (
            <div className="space-y-2 pt-0.5">
              <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${pct}%`, backgroundColor: stageClr }}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground font-mono">{progress.label}</span>
                <span className="text-[13px] font-bold font-mono" style={{ color: stageClr }}>
                  {pct}%
                </span>
              </div>
            </div>
          ) : (
            <span className="text-muted-foreground/40">{s.taskDialog.noPhases}</span>
          )}
        </MetaCell>
      </div>
    </div>
  );
}

function PhasesTable({
  task,
  s,
  statusOf,
}: {
  task: Task;
  s: Dict;
  statusOf: (key: string, fallback: string) => string;
}) {
  if (!task.phases || task.phases.length === 0) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground text-sm italic py-8 justify-center">
        <Layers className="size-4" />
        <span>{s.taskDialog.noPhasesDefined}</span>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border/60 overflow-hidden">
      <div className="grid grid-cols-[180px_110px_160px_1fr] gap-4 px-4 py-2.5 bg-muted/20 border-b border-border/50">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/80">
          {s.taskDialog.table.phase}
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/80">
          {s.taskDialog.table.status}
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/80">
          {s.taskDialog.table.dependsOn}
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/80">
          {s.taskDialog.table.files}
        </span>
      </div>
      <div className="divide-y divide-border/40">
        {task.phases.map((p) => {
          const phaseStatus = (p.status || 'pending').toLowerCase();
          const isDone = phaseStatus === 'done' || phaseStatus === 'completed';
          const isBlocked = phaseStatus === 'blocked' || phaseStatus === 'needs-rework';
          const isInProgress =
            phaseStatus === 'in-progress' ||
            phaseStatus === 'coding' ||
            phaseStatus === 'in_progress';
          const files = (p.files || '')
            .split(',')
            .map((f) => f.trim())
            .filter(Boolean);
          const deps = (p.depends_on || []).filter((d) => task.phases.some((tp) => tp.id === d));

          const badgeStyle = isDone
            ? { bg: '#48bb7820', color: '#48bb78' }
            : isBlocked
              ? { bg: '#fc818120', color: '#fc8181' }
              : isInProgress
                ? { bg: '#dd6b2020', color: '#dd6b20' }
                : { bg: '#71809620', color: '#a0aec0' };

          return (
            <div
              key={p.id}
              className="grid grid-cols-[180px_110px_160px_1fr] gap-4 px-4 py-3 items-start hover:bg-muted/20 transition-colors"
            >
              <code className="font-mono text-[12.5px] text-foreground pt-0.5">{p.id}</code>
              <div className="pt-0.5">
                <span
                  className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full capitalize"
                  style={{
                    backgroundColor: badgeStyle.bg,
                    color: badgeStyle.color,
                  }}
                >
                  {statusOf(phaseStatus, p.status || 'pending')}
                </span>
              </div>
              {deps.length === 0 ? (
                <span className="text-muted-foreground/40 text-[11.5px] italic pt-0.5">
                  {s.taskDialog.none}
                </span>
              ) : (
                <span className="text-[11.5px] text-muted-foreground/70 pt-0.5">
                  {deps.map((d, di) => (
                    <code key={d} className="font-mono">
                      {d}
                      {di < deps.length - 1 ? ', ' : ''}
                    </code>
                  ))}
                </span>
              )}
              {files.length === 0 ? (
                <span className="text-muted-foreground/40 text-xs pt-0.5">—</span>
              ) : (
                <ul className="space-y-1 min-w-0">
                  {files.map((f, i) => (
                    <li
                      key={i}
                      className="font-mono text-[11.5px] text-muted-foreground/70 break-all leading-relaxed"
                    >
                      {f}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TaskRelations({ task, s }: { task: Task; s: Dict }) {
  const groups = task.parallelizationGroups?.filter((g) => g.length > 0) ?? [];
  const related = task.related_tasks?.filter(Boolean) ?? [];
  const chainsAfter = (task.phases || [])
    .filter((p) => p.chains_after)
    .map((p) => ({ phaseId: p.id, after: p.chains_after as string }));

  if (groups.length === 0 && related.length === 0 && chainsAfter.length === 0) return null;

  return (
    <div className="space-y-3 mt-4 pt-4 border-t border-border/40">
      {groups.length > 0 && (
        <div className="flex flex-wrap items-baseline gap-2 text-xs">
          <span className="text-muted-foreground/70 shrink-0">
            {s.taskDialog.relations.parallelGroups}
          </span>
          <span className="flex flex-wrap gap-1.5">
            {groups.map((group, gi) => (
              <code
                key={gi}
                className="text-[11px] font-mono px-2 py-0.5 rounded-md border border-border/60 text-muted-foreground"
              >
                {group.join(', ')}
              </code>
            ))}
          </span>
        </div>
      )}
      {related.length > 0 && (
        <div className="flex flex-wrap items-baseline gap-2 text-xs">
          <span className="text-muted-foreground/70 shrink-0">
            {s.taskDialog.relations.related}
          </span>
          <span className="flex flex-wrap gap-1.5">
            {related.map((id) => (
              <code
                key={id}
                className="text-[11px] font-mono px-2 py-0.5 rounded-md border border-border/60 text-muted-foreground"
              >
                {id}
              </code>
            ))}
          </span>
        </div>
      )}
      {chainsAfter.length > 0 && (
        <div className="flex flex-wrap items-baseline gap-2 text-xs">
          <span className="text-muted-foreground/70 shrink-0">
            {s.taskDialog.relations.chainsAfter}
          </span>
          <span className="flex flex-wrap gap-1.5">
            {chainsAfter.map(({ phaseId, after }) => (
              <code
                key={phaseId}
                className="text-[11px] font-mono px-2 py-0.5 rounded-md border border-border/60 text-muted-foreground"
              >
                {phaseId} → {after}
              </code>
            ))}
          </span>
        </div>
      )}
    </div>
  );
}

function MarkdownPanel({
  content,
  path,
  filenameBase,
  title,
  s,
}: {
  content: string;
  path?: string;
  filenameBase: string;
  title: string;
  s: Dict;
}) {
  if (!content.trim()) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground text-sm italic py-12 justify-center">
        <FileText className="size-4" />
        <span>{s.taskDialog.notWritten}</span>
      </div>
    );
  }
  return (
    <div>
      {path && (
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/60 font-mono mb-4 pb-3 border-b border-border/40">
          <FileText className="size-3" />
          <span>{path}</span>
        </div>
      )}
      <MarkdownBody content={content} filenameBase={filenameBase} title={title} />
    </div>
  );
}

export function TaskDialog({ task, open, onOpenChange }: TaskDialogProps) {
  const { s, status } = useI18n();
  if (!task) return null;
  const laneClr = laneColor(task.lane);
  const stageClr = stageColor(task);
  const sections = getSections(s);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-300 w-[95vw] h-[88vh] p-0 gap-0 overflow-hidden flex flex-col card-border-glow">
        {/* Header */}
        <div className="px-6 py-5 border-b border-border/60 space-y-3 shrink-0">
          <div className="space-y-1">
            <DialogTitle className="text-xl font-bold leading-snug pr-8">{task.title}</DialogTitle>
            <DialogDescription className="sr-only">
              {s.taskDialog.detailDescription(task.id, task.title)}
            </DialogDescription>
          </div>
          {/* Badges row */}
          <div className="flex flex-wrap gap-2">
            <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full text-muted-foreground/80 font-mono">
              {task.id}
            </span>
            <span
              className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full"
              style={{ backgroundColor: `${stageClr}20`, color: stageClr }}
            >
              {status(task.status, statusLabel(task.status))}
            </span>
            {task.lane && (
              <span
                className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full capitalize"
                style={{ backgroundColor: `${laneClr}20`, color: laneClr }}
              >
                {s.taskDialog.lanePrefix(task.lane)}
              </span>
            )}
            {task.next_phase && (
              <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full border border-border/60 text-muted-foreground">
                {s.taskDialog.nextPrefix(task.next_phase)}
              </span>
            )}
            {task.type && (
              <span className="text-[11px] px-2.5 py-0.5 rounded-full border border-border/60 text-muted-foreground capitalize">
                {task.type}
              </span>
            )}
          </div>
        </div>

        {/* Body: vertical tabs */}
        <Tabs
          defaultValue="overview"
          orientation="vertical"
          className="flex-1 min-h-0 flex flex-row gap-0"
        >
          {/* Vertical tab list */}
          <div className="w-40 shrink-0 border-r border-border/50 bg-muted/5 py-3 flex flex-col">
            <TabsList className="flex flex-col h-auto py-0 px-2 bg-transparent gap-0.5 w-full shadow-none border-0">
              <TabsTrigger
                value="overview"
                className="w-full justify-start rounded-lg py-2.5 px-3 text-[13px] border-0 shadow-none data-[state=active]:bg-primary/10! data-[state=active]:text-primary data-[state=active]:shadow-none"
              >
                {s.taskDialog.tabs.overview}
              </TabsTrigger>
              {sections.map((sec) => {
                const empty = !task.sections[sec.key]?.trim();
                return (
                  <TabsTrigger
                    key={sec.key}
                    value={sec.key}
                    className={`w-full justify-start rounded-lg py-2.5 px-3 text-[13px] border-0 shadow-none data-[state=active]:bg-primary/10! data-[state=active]:text-primary data-[state=active]:shadow-none${empty ? ' opacity-40' : ''}`}
                  >
                    {sec.label}
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </div>

          {/* Tab content pane */}
          <div className="flex-1 min-w-0 min-h-0 overflow-hidden">
            <TabsContent value="overview" className="h-full overflow-y-auto px-6 py-5 m-0">
              <OverviewInfo task={task} s={s} status={status} />
              <div className="flex items-center gap-2 mb-4">
                <Layers className="size-4 text-muted-foreground/60" />
                <h3 className="text-[13px] font-semibold text-foreground">
                  {s.taskDialog.meta.phases}
                  <span className="ml-1.5 text-muted-foreground/60 font-normal">
                    ({task.phases?.length || 0})
                  </span>
                </h3>
              </div>
              <PhasesTable task={task} s={s} statusOf={status} />
              <TaskRelations task={task} s={s} />
            </TabsContent>

            {sections.map((sec) => (
              <TabsContent
                key={sec.key}
                value={sec.key}
                className="h-full overflow-y-auto px-6 py-5 m-0"
              >
                <MarkdownPanel
                  content={task.sections[sec.key] || ''}
                  path={`${sec.key}.md`}
                  filenameBase={`${task.id}-${sec.key}`}
                  title={`${task.id} — ${sec.label}`}
                  s={s}
                />
              </TabsContent>
            ))}
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
