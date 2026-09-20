import { LayoutGrid, List, Search, X, Zap } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useI18n } from '@/lib/i18n/context';
import { computeStats } from '@/lib/status';
import type { Task } from '@/lib/task-parser';
import { cn } from '@/lib/utils';
import { TasksBoard } from './tasks-board';
import { TasksList } from './tasks-list';

export type BoardLayout = 'board' | 'list';
export type BoardSort = 'status' | 'updated' | 'lane';

const BOARD_LAYOUT_KEY = 'caw:board-layout';

function readBoardLayout(): BoardLayout {
  // List is the default — only an explicit 'board' choice opts out.
  if (typeof window === 'undefined') return 'list';
  return window.localStorage.getItem(BOARD_LAYOUT_KEY) === 'board' ? 'board' : 'list';
}

interface BoardViewProps {
  tasks: Task[];
  onOpen: (id: string) => void;
}

export function BoardView({ tasks, onOpen }: BoardViewProps) {
  const { s } = useI18n();
  const SORT_OPTIONS: { key: BoardSort; label: string }[] = [
    { key: 'status', label: s.boardView.sortStatus },
    { key: 'updated', label: s.boardView.sortUpdated },
    { key: 'lane', label: s.boardView.sortLane },
  ];
  const [layout, setLayout] = useState<BoardLayout>('list');
  const [sort, setSort] = useState<BoardSort>('status');
  const [search, setSearch] = useState('');

  // Sync layout from localStorage after hydration (avoids SSR mismatch).
  useEffect(() => {
    setLayout(readBoardLayout());
  }, []);

  const handleLayoutChange = (next: BoardLayout) => {
    setLayout(next);
    window.localStorage.setItem(BOARD_LAYOUT_KEY, next);
  };

  const stats = useMemo(() => computeStats(tasks), [tasks]);

  const filteredTasks = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = q
      ? tasks.filter(
          (t) =>
            t.title.toLowerCase().includes(q) ||
            t.id.toLowerCase().includes(q) ||
            (t.type ?? '').toLowerCase().includes(q) ||
            (t.lane ?? '').toLowerCase().includes(q),
        )
      : [...tasks];

    if (sort === 'updated') {
      list = list.sort((a, b) =>
        (b.updated || b.created || '').localeCompare(a.updated || a.created || ''),
      );
    } else if (sort === 'lane') {
      list = list.sort(
        (a, b) => (a.lane || '').localeCompare(b.lane || '') || a.title.localeCompare(b.title),
      );
    }
    // 'status' = default groupByStage order, no extra sort needed
    return list;
  }, [tasks, search, sort]);

  return (
    <div className="flex flex-col w-full">
      {/* Stats bar */}
      <div className="px-4 sm:px-6 pt-4 pb-3">
        <div className="flex items-center gap-6 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Zap className="size-3.5 text-primary" />
            <span className="font-semibold text-foreground">{stats.total}</span>{' '}
            {s.boardView.tasksSuffix}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-[#dd6b20]" />
            <span className="font-semibold text-foreground">{stats.inProgress}</span>{' '}
            {s.boardView.inProgressSuffix}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-[#48bb78]" />
            <span className="font-semibold text-foreground">{stats.done}</span>{' '}
            {s.boardView.doneSuffix}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-[#fc8181]" />
            <span className="font-semibold text-foreground">{stats.blocked}</span>{' '}
            {s.boardView.blockedSuffix}
          </span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="px-4 sm:px-6 pb-4 flex items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground/50 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={s.boardView.searchPlaceholder}
            className={cn(
              'w-full h-9 pl-9 pr-8 rounded-lg text-[13px]',
              'bg-muted/30 border border-border/50',
              'text-foreground placeholder:text-muted-foreground/40',
              'focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/40 transition-colors',
            )}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        {/* Layout toggle */}
        <div className="flex items-center gap-0.5 rounded-lg border border-border p-0.5">
          {(
            [
              ['list', List],
              ['board', LayoutGrid],
            ] as [BoardLayout, typeof List][]
          ).map(([key, Icon]) => (
            <button
              key={key}
              type="button"
              onClick={() => handleLayoutChange(key)}
              className={cn(
                'size-8 flex items-center justify-center rounded-md transition-colors',
                layout === key
                  ? 'bg-primary/15 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
              )}
            >
              <Icon className="size-3.5" />
            </button>
          ))}
        </div>

        {/* Sort */}
        <div className="flex items-center gap-0.5 rounded-lg border border-border p-0.5">
          {SORT_OPTIONS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setSort(key)}
              className={cn(
                'h-8 px-3 rounded-md text-xs font-medium transition-colors',
                sort === key
                  ? 'bg-primary/15 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <span className="text-xs text-muted-foreground/50 ml-auto shrink-0">
          {filteredTasks.length} / {tasks.length}
        </span>
      </div>

      {/* Content */}
      {layout === 'list' ? (
        <TasksList tasks={filteredTasks} onOpen={onOpen} />
      ) : (
        <TasksBoard tasks={filteredTasks} onOpen={onOpen} />
      )}
    </div>
  );
}
