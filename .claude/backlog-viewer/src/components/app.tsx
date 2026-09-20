import { useCallback, useEffect, useMemo, useState } from 'react';

import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { useDocs } from '@/hooks/use-docs';
import { useEventSubscribe } from '@/hooks/use-event-stream';
import { isAuthenticated } from '@/lib/auth';
import { I18nProvider } from '@/lib/i18n/context';
import type { Task } from '@/lib/task-parser';
import { fetchJson } from '@/lib/utils';
import { BoardView } from './board-view';
import { Dashboard } from './dashboard';
import { DocsView } from './docs-view';
import { SkillsView } from './skills-view';
import { TaskDialog } from './task-dialog';
import { TasksHeader } from './tasks-header';
import { TasksSidebar } from './tasks-sidebar';

type View = 'dashboard' | 'board' | 'skills' | 'docs';

function readHashView(): View {
  if (typeof window === 'undefined') return 'dashboard';
  const h = window.location.hash;
  if (h === '#/board') return 'board';
  if (h === '#/skills') return 'skills';
  if (h === '#/docs') return 'docs';
  return 'dashboard';
}

function viewToHash(view: View): string {
  if (view === 'board') return '#/board';
  if (view === 'skills') return '#/skills';
  if (view === 'docs') return '#/docs';
  return '#/';
}

export function App() {
  // Auth gate — redirect to /login if no localStorage credential.
  // Runs in useEffect (post-mount) so SSR/prerender doesn't redirect.
  useEffect(() => {
    if (!isAuthenticated()) {
      const next = window.location.pathname + window.location.search + window.location.hash;
      const loginUrl = `/login${next && next !== '/' ? `?next=${encodeURIComponent(next)}` : ''}`;
      window.location.replace(loginUrl);
    }
  }, []);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [projectName, setProjectName] = useState('');
  // Always start with 'dashboard' to match SSR — sync from browser after mount.
  const [view, setView] = useState<View>('dashboard');
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);

  // Docs list is fetched once here so the sidebar's Docs submenu and the
  // main preview pane (DocsView) share the same list + selection instead of
  // two independent fetches drifting apart.
  const { docs, configured: docsConfigured, loading: docsLoading } = useDocs();
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null);
  // A doc the user had open can disappear from under them (file moved/removed,
  // or an SSE refresh just replaced the whole list) — drop a stale selection
  // instead of leaving the iframe pointed at a 404.
  useEffect(() => {
    setSelectedDoc((current) => (current && docs.some((d) => d.path === current) ? current : null));
  }, [docs]);
  const handleSelectDoc = useCallback((path: string) => {
    setSelectedDoc(path);
    setView('docs');
    window.location.hash = '#/docs';
  }, []);

  // Sync view ↔ hash after hydration to avoid SSR mismatch.
  useEffect(() => {
    setView(readHashView());
    const onHash = () => setView(readHashView());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const handleViewChange = useCallback((next: View) => {
    setView(next);
    window.location.hash = viewToHash(next);
  }, []);

  // Initial fetch of project metadata. Static — only changes if the dev server
  // restarts with a different CAW_PROJECT_ROOT, so we don't subscribe to it.
  useEffect(() => {
    fetchJson<{ name?: string }>('/api/project.json')
      .then((d) => setProjectName(d.name || ''))
      .catch(() => undefined);
  }, []);

  const fetchTasks = useCallback(() => {
    fetch('/api/tasks.json', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((fresh: Task[] | null) => {
        if (Array.isArray(fresh)) setTasks(fresh);
      })
      .catch(() => undefined);
  }, []);

  // Initial load + re-fetch on every `tasks` SSE event.
  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);
  useEventSubscribe(['tasks'], fetchTasks);

  const onOpen = useCallback((id: string) => setOpenTaskId(id), []);
  const onCloseDialog = useCallback((open: boolean) => {
    if (!open) setOpenTaskId(null);
  }, []);

  const openTask = useMemo(
    () => (openTaskId ? (tasks.find((t) => t.id === openTaskId) ?? null) : null),
    [openTaskId, tasks],
  );

  const selectedDocSummary = useMemo(
    () => (selectedDoc ? (docs.find((d) => d.path === selectedDoc) ?? null) : null),
    [selectedDoc, docs],
  );

  return (
    <I18nProvider>
      <SidebarProvider>
        <TasksSidebar
          projectName={projectName}
          view={view}
          onViewChange={handleViewChange}
          taskCount={tasks.length}
          docs={docs}
          selectedDoc={selectedDoc}
          onSelectDoc={handleSelectDoc}
        />
        <SidebarInset className="min-w-0 overflow-hidden bg-transparent">
          <TasksHeader view={view} selectedDoc={selectedDocSummary} />
          <main className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden">
            {view === 'board' ? (
              <BoardView tasks={tasks} onOpen={onOpen} />
            ) : view === 'skills' ? (
              <SkillsView />
            ) : view === 'docs' ? (
              <DocsView
                docs={docs}
                configured={docsConfigured}
                loading={docsLoading}
                selected={selectedDoc}
              />
            ) : (
              <Dashboard tasks={tasks} />
            )}
          </main>
        </SidebarInset>
        <TaskDialog task={openTask} open={openTask !== null} onOpenChange={onCloseDialog} />
      </SidebarProvider>
    </I18nProvider>
  );
}
