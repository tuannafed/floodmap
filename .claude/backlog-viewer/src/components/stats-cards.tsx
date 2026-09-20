import { Ban, CheckCircle2, ListTodo, Loader2 } from 'lucide-react';
import type { ReactNode } from 'react';

import { useI18n } from '@/lib/i18n/context';
import { computeStats } from '@/lib/status';
import type { Task } from '@/lib/task-parser';

interface StatCardProps {
  icon: ReactNode;
  title: string;
  value: number;
  detail?: string;
  accent?: string;
}

function StatCard({ icon, title, value, detail, accent = 'var(--primary)' }: StatCardProps) {
  return (
    <div className="card-border-glow rounded-xl p-4 sm:p-5 flex flex-col gap-3 min-w-0 overflow-hidden">
      {/* Icon + title */}
      <div className="flex items-center gap-1.5 relative z-10">
        <span style={{ color: accent }}>{icon}</span>
        <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {title}
        </span>
      </div>

      {/* Value */}
      <p className="text-4xl font-bold tracking-tight relative z-10">{value}</p>

      {/* Detail */}
      {detail && <div className="text-xs text-muted-foreground relative z-10">{detail}</div>}
    </div>
  );
}

interface StatsCardsProps {
  tasks: Task[];
}

export function StatsCards({ tasks }: StatsCardsProps) {
  const { s } = useI18n();
  const stats = computeStats(tasks);
  const completion = stats.total === 0 ? 0 : Math.round((stats.done / stats.total) * 100);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
      <StatCard
        icon={<ListTodo className="size-3.75" />}
        title={s.stats.totalTasks}
        value={stats.total}
        detail={s.stats.complete(completion)}
        accent="var(--primary)"
      />
      <StatCard
        icon={<Loader2 className="size-3.75" />}
        title={s.stats.inProgress}
        value={stats.inProgress}
        detail={s.stats.pendingCount(stats.pending)}
        accent="var(--primary)"
      />
      <StatCard
        icon={<CheckCircle2 className="size-3.75" />}
        title={s.stats.done}
        value={stats.done}
        detail={s.stats.completed}
        accent="#68d391"
      />
      <StatCard
        icon={<Ban className="size-3.75" />}
        title={s.stats.blocked}
        value={stats.blocked}
        detail={stats.blocked > 0 ? s.stats.needsAttention : s.stats.allClear}
        accent={stats.blocked > 0 ? '#fc8181' : '#68d391'}
      />
    </div>
  );
}
