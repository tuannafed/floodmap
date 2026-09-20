import { Inbox } from 'lucide-react';
import { useI18n } from '@/lib/i18n/context';
import type { Stage } from '@/lib/status';
import type { Task } from '@/lib/task-parser';
import { TaskCard } from './task-card';

interface TaskColumnProps {
  stage: Stage;
  tasks: Task[];
  onOpen: (id: string) => void;
}

export function TaskColumn({ stage, tasks, onOpen }: TaskColumnProps) {
  const { s, stage: translateStage } = useI18n();
  const EMPTY_COPY = s.taskColumn.empty as Record<string, string>;
  const Icon = stage.icon;
  const empty = tasks.length === 0;
  return (
    <div className="shrink-0 w-80 lg:w-90 flex flex-col h-full">
      <div
        className="rounded-2xl bg-card/60 flex flex-col max-h-full overflow-hidden relative"
        style={{
          border: `1px solid color-mix(in oklch, var(--primary) 22%, transparent)`,
          boxShadow: `0 0 32px -10px color-mix(in oklch, var(--primary) 45%, transparent)`,
        }}
      >
        {/* Corner glow overlay — top-left arc, pointer-events none */}
        <div
          className="absolute inset-0 rounded-2xl pointer-events-none z-0"
          style={{
            background: `radial-gradient(ellipse 160px 120px at 0% 0%, color-mix(in oklch, var(--primary) 22%, transparent) 0%, transparent 70%)`,
          }}
        />

        {/* Column header */}
        <div className="relative z-10 flex items-center justify-between gap-2 px-3 py-3 border-b border-border/50">
          <div className="flex items-center gap-2 min-w-0">
            <div
              className="size-7 rounded-lg flex items-center justify-center shrink-0"
              style={{
                backgroundColor: `${stage.color}1f`,
                boxShadow: `inset 0 0 0 1px ${stage.color}33`,
              }}
            >
              <Icon size={15} style={{ color: stage.color }} />
            </div>
            <span
              className="text-[13px] font-semibold uppercase tracking-wide truncate"
              style={{ color: stage.color }}
            >
              {translateStage(stage.key, stage.label)}
            </span>
          </div>
          <span
            className="text-xs font-semibold rounded-md px-1.5 py-0.5 shrink-0"
            style={{
              backgroundColor: `${stage.color}1a`,
              color: stage.color,
            }}
          >
            {tasks.length}
          </span>
        </div>

        {/* Body */}
        <div className="relative z-10 p-2.5 overflow-y-auto">
          {empty ? (
            <div className="flex flex-col items-center justify-center text-center gap-2 py-12 px-4">
              <div className="size-11 rounded-xl border border-border/60 flex items-center justify-center">
                <Inbox className="size-5 text-muted-foreground/50" />
              </div>
              <div className="text-sm font-medium text-muted-foreground">
                {s.taskColumn.noTasks}
              </div>
              <div className="text-[11px] text-muted-foreground/60 max-w-45 leading-relaxed">
                {EMPTY_COPY[stage.key] || s.taskColumn.noTasks}
              </div>
            </div>
          ) : (
            <div className="space-y-2.5">
              {tasks.map((t) => (
                <TaskCard key={t.id} task={t} onOpen={onOpen} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
