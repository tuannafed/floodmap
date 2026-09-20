import { ArrowRight } from 'lucide-react';
import { useMemo } from 'react';
import { useI18n } from '@/lib/i18n/context';
import type { Dict } from '@/lib/i18n/dict';
import { getStageKey, statusLabel } from '@/lib/status';
import type { Task } from '@/lib/task-parser';

interface ActivityFeedProps {
  tasks: Task[];
}

interface ActivityEvent {
  time: string;
  taskId: string;
  description: string;
  stage: string;
  lane?: string;
}

function stageBadgeStyle(stage: string, s: Dict): { bg: string; text: string; label: string } {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    done: { bg: '#276749', text: '#9ae6b4', label: s.activity.stageBadge.done },
    coding: { bg: '#7b341e', text: '#fbd38d', label: s.activity.stageBadge.coding },
    blocked: { bg: '#742a2a', text: '#fc8181', label: s.activity.stageBadge.blocked },
    testing: { bg: '#2a4365', text: '#90cdf4', label: s.activity.stageBadge.testing },
    review: { bg: '#44337a', text: '#d6bcfa', label: s.activity.stageBadge.review },
    planning: { bg: '#44337a', text: '#d6bcfa', label: s.activity.stageBadge.planning },
    pending: { bg: '#2d3748', text: '#a0aec0', label: s.activity.stageBadge.pending },
  };
  return map[stage] ?? map.pending;
}

function dotColor(stage: string): string {
  const map: Record<string, string> = {
    done: '#68d391',
    coding: 'var(--primary)',
    blocked: '#fc8181',
    testing: '#90cdf4',
    review: '#d6bcfa',
    planning: '#d6bcfa',
    pending: '#718096',
  };
  return map[stage] ?? '#718096';
}

function formatEventTime(dateStr: string): string {
  if (!dateStr) return '--:--:--';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr.split('T')[0] ?? '--:--:--';
  return d.toLocaleTimeString('en-GB', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function makeDescription(
  task: Task,
  s: Dict,
  statusLabelOf: (key: string, fallback: string) => string,
): string {
  const stage = getStageKey(task);
  const label = statusLabelOf(task.status, statusLabel(task.status));
  if (stage === 'done') return s.activity.desc.completed;
  if (stage === 'testing') return s.activity.desc.testsCompleted;
  if (stage === 'review') return s.activity.desc.reviewApproved;
  if (stage === 'coding') return s.activity.desc.implementationStarted;
  if (stage === 'planning') return s.activity.desc.planCreated;
  if (stage === 'blocked') return s.activity.desc.markedBlocked;
  return s.activity.desc.updatedTo(label);
}

export function ActivityFeed({ tasks }: ActivityFeedProps) {
  const { s, status } = useI18n();
  const events = useMemo<ActivityEvent[]>(() => {
    return tasks
      .slice()
      .sort((a, b) => {
        const da = a.updated || a.created || '';
        const db = b.updated || b.created || '';
        return db.localeCompare(da);
      })
      .slice(0, 5)
      .map((t) => ({
        time: formatEventTime(t.updated || t.created || ''),
        taskId: t.id,
        description: makeDescription(t, s, status),
        stage: getStageKey(t),
        lane: t.lane,
      }));
  }, [tasks, s, status]);

  return (
    <div className="card-border-glow rounded-xl overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-primary text-base">⚡</span>
          <span className="text-xs font-semibold uppercase tracking-widest text-foreground">
            {s.activity.title}
          </span>
        </div>
        <button
          type="button"
          className="flex items-center gap-1 text-[11px] text-primary hover:text-primary/80 transition-colors"
        >
          {s.activity.seeAll}
          <ArrowRight className="size-3" />
        </button>
      </div>

      {/* Events */}
      <div className="flex flex-col divide-y divide-border/50 flex-1">
        {events.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground">{s.activity.none}</div>
        ) : (
          events.map((ev, i) => {
            const badge = stageBadgeStyle(ev.stage, s);
            const dot = dotColor(ev.stage);
            return (
              <div
                key={i}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/20 transition-colors"
              >
                {/* Dot */}
                <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: dot }} />
                {/* Time */}
                <span className="text-[11px] font-mono text-muted-foreground shrink-0 w-13">
                  {ev.time}
                </span>
                {/* Description */}
                <span className="text-xs text-foreground/80 flex-1 min-w-0 truncate">
                  <span className="font-semibold text-foreground">{ev.taskId}</span>{' '}
                  {ev.description}
                </span>
                {/* Badge — colored by lane when available, else by stage */}
                {ev.lane ? (
                  <span
                    className="text-[10px] font-semibold rounded px-2 py-0.5 shrink-0"
                    style={{
                      backgroundColor:
                        ev.lane === 'risky'
                          ? '#fc818122'
                          : ev.lane === 'standard'
                            ? '#63b3ed22'
                            : '#68d39122',
                      color:
                        ev.lane === 'risky'
                          ? '#fc8181'
                          : ev.lane === 'standard'
                            ? '#63b3ed'
                            : '#68d391',
                    }}
                  >
                    {ev.lane.charAt(0).toUpperCase() + ev.lane.slice(1)}
                  </span>
                ) : (
                  <span
                    className="text-[10px] font-semibold rounded px-2 py-0.5 shrink-0"
                    style={{ backgroundColor: badge.bg, color: badge.text }}
                  >
                    {badge.label}
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
