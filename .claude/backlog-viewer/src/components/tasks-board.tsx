import { useI18n } from '@/lib/i18n/context';
import { groupByStage, STAGES } from '@/lib/status';
import type { Task } from '@/lib/task-parser';
import { TaskColumn } from './task-column';

interface TasksBoardProps {
  tasks: Task[];
  onOpen: (id: string) => void;
}

export function TasksBoard({ tasks, onOpen }: TasksBoardProps) {
  const { s } = useI18n();
  if (tasks.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-12 text-muted-foreground">
        <div className="text-center">
          <p className="text-sm">{s.tasksBoard.noTasksYet}</p>
          <p className="text-sm mt-1">{s.tasksBoard.createWith}</p>
        </div>
      </div>
    );
  }

  const groups = groupByStage(tasks);

  return (
    <div className="flex gap-4 sm:gap-5 overflow-x-auto pb-4 px-4 sm:px-6">
      {STAGES.map((stage) => (
        <TaskColumn key={stage.key} stage={stage} tasks={groups[stage.key] || []} onOpen={onOpen} />
      ))}
    </div>
  );
}
