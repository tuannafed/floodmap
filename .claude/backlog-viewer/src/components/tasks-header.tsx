import { useEffect, useState } from 'react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import type { DocSummary } from '@/hooks/use-docs';
import { useI18n } from '@/lib/i18n/context';
import { DocExportMenu } from './doc-export-menu';
import { LangToggle } from './lang-toggle';
import { ThemeToggle } from './theme-toggle';

interface TasksHeaderProps {
  view: 'dashboard' | 'board' | 'skills' | 'docs';
  selectedDoc?: DocSummary | null;
}

function LiveClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const time = now.toLocaleTimeString('en-GB', { hour12: false });
  const date = now.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  return (
    <div className="hidden md:flex flex-col items-center leading-none mr-4">
      <span className="text-base font-semibold font-mono tabular-nums tracking-tight">{time}</span>
      <span className="text-[10px] text-muted-foreground">{date}</span>
    </div>
  );
}

export function TasksHeader({ view, selectedDoc }: TasksHeaderProps) {
  const { s } = useI18n();
  const title =
    view === 'board'
      ? s.sidebar.nav.board
      : view === 'skills'
        ? s.sidebar.nav.skills
        : view === 'docs'
          ? s.sidebar.nav.docs
          : s.sidebar.nav.dashboard;

  return (
    <header className="border-b border-border">
      <div className="flex items-center justify-between h-15 px-6">
        <div className="flex items-center gap-2.5 min-w-0">
          <SidebarTrigger />
          <h1 className="font-display text-lg md:text-xl font-semibold text-gradient-pop shrink-0">
            {title}
          </h1>
        </div>

        <LiveClock />
        <div className="flex items-center gap-2 shrink-0">
          {view === 'docs' && selectedDoc && <DocExportMenu doc={selectedDoc} />}
          <LangToggle />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
