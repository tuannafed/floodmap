import { FileText, Folder, Kanban, LayoutGrid, Sparkles } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@/components/ui/sidebar';
import type { DocSummary } from '@/hooks/use-docs';
import { useI18n } from '@/lib/i18n/context';
import type { Dict } from '@/lib/i18n/dict';
import { cn } from '@/lib/utils';

// Claude logo — multi-ray asterisk with beveled tips, matching official mark
function ClaudeLogo({ className }: { className?: string }) {
  // Each ray: [angleDeg, outerRadius, halfWidth] — center at 50,50, viewBox 100×100
  // Rays alternate long/short with slight angle offsets, tips are flat-beveled
  const cx = 50,
    cy = 50;
  const rays: [number, number, number][] = [
    [0, 46, 5.5],
    [27, 40, 4.2],
    [52, 45, 5.0],
    [79, 38, 3.8],
    [104, 44, 5.2],
    [130, 37, 4.0],
    [155, 46, 5.5],
    [180, 40, 4.2],
    [207, 44, 5.0],
    [232, 37, 3.8],
    [258, 45, 5.2],
    [283, 38, 4.0],
    [308, 43, 4.8],
  ];

  function rayPath(angleDeg: number, r: number, hw: number): string {
    const a = (angleDeg * Math.PI) / 180;
    const perp = a + Math.PI / 2;
    // Base points (at center)
    const bx1 = cx + Math.cos(perp) * hw;
    const by1 = cy + Math.sin(perp) * hw;
    const bx2 = cx - Math.cos(perp) * hw;
    const by2 = cy - Math.sin(perp) * hw;
    // Tip points — beveled (narrow the width by ~40% at the tip)
    const tipHw = hw * 0.55;
    const tx = cx + Math.cos(a) * r;
    const ty = cy + Math.sin(a) * r;
    const tx1 = tx + Math.cos(perp) * tipHw;
    const ty1 = ty + Math.sin(perp) * tipHw;
    const tx2 = tx - Math.cos(perp) * tipHw;
    const ty2 = ty - Math.sin(perp) * tipHw;
    return `M${bx1.toFixed(2)},${by1.toFixed(2)} L${tx1.toFixed(2)},${ty1.toFixed(2)} L${tx2.toFixed(2)},${ty2.toFixed(2)} L${bx2.toFixed(2)},${by2.toFixed(2)} Z`;
  }

  return (
    <svg viewBox="0 0 100 100" fill="currentColor" className={className} aria-hidden="true">
      {rays.map(([angle, r, hw], i) => (
        <path key={i} d={rayPath(angle, r, hw)} />
      ))}
    </svg>
  );
}

type View = 'dashboard' | 'board' | 'skills' | 'docs';

interface TasksSidebarProps {
  projectName: string;
  view: View;
  onViewChange: (view: View) => void;
  taskCount?: number;
  docs?: DocSummary[];
  selectedDoc?: string | null;
  onSelectDoc?: (path: string) => void;
}

function getMenuItems(s: Dict): { id: View; label: string; icon: typeof LayoutGrid }[] {
  return [
    { id: 'dashboard', label: s.sidebar.nav.dashboard, icon: LayoutGrid },
    { id: 'board', label: s.sidebar.nav.board, icon: Kanban },
    { id: 'skills', label: s.sidebar.nav.skills, icon: Sparkles },
    { id: 'docs', label: s.sidebar.nav.docs, icon: FileText },
  ];
}

// Doc titles are whatever the source HTML's <title> says — often
// "<Project Name> — <Doc Title>" (the technical-doc-html skill's own
// convention). That prefix is redundant in a per-project sidebar and eats
// most of the available width, so strip it for display wherever it's shared
// by more than one doc. Majority-based, not "docs[0] vs everyone else": a
// single unrelated doc (e.g. a generic overview whose own title happens to
// contain " — ") must not block stripping for every other doc that does
// share the project's lead-in. No project-name detection needed — a prefix
// only strips because multiple docs independently agree on it.
function stripSharedTitlePrefix(docs: DocSummary[]): Map<string, string> {
  const display = new Map<string, string>();
  const DASH = ' — ';

  const counts = new Map<string, number>();
  for (const d of docs) {
    const dashIdx = d.title.indexOf(DASH);
    if (dashIdx === -1) continue;
    const prefix = d.title.slice(0, dashIdx + DASH.length);
    counts.set(prefix, (counts.get(prefix) ?? 0) + 1);
  }

  let sharedPrefix: string | null = null;
  let sharedCount = 1;
  for (const [prefix, count] of counts) {
    if (count > sharedCount) {
      sharedPrefix = prefix;
      sharedCount = count;
    }
  }

  for (const d of docs) {
    display.set(
      d.path,
      sharedPrefix && d.title.startsWith(sharedPrefix)
        ? d.title.slice(sharedPrefix.length)
        : d.title,
    );
  }
  return display;
}

// Docs directly under a configured docPaths folder (e.g. specs/overview.html) stay a flat
// list; docs one level deeper (specs/BD/x.html, specs/SRS/y.html) get a folder submenu
// named after that subfolder — mirrors the project's own docs/BD, docs/SRS layout. Order
// within each bucket is preserved (already mtime-sorted by listDocs()); groups themselves
// sort alphabetically so the submenu doesn't reshuffle as files change.
function groupDocs(docs: DocSummary[]): {
  ungrouped: DocSummary[];
  groups: [string, DocSummary[]][];
} {
  const ungrouped: DocSummary[] = [];
  const byGroup = new Map<string, DocSummary[]>();
  for (const d of docs) {
    if (!d.group) {
      ungrouped.push(d);
      continue;
    }
    const list = byGroup.get(d.group);
    if (list) list.push(d);
    else byGroup.set(d.group, [d]);
  }
  const groups = Array.from(byGroup.entries()).sort(([a], [b]) => a.localeCompare(b));
  return { ungrouped, groups };
}

interface WorkspaceStats {
  agents: number;
  tasks: number;
  skills: number;
  commands: number;
  rules: number;
}

function useWorkspaceStats() {
  const [stats, setStats] = useState<WorkspaceStats | null>(null);
  useEffect(() => {
    fetch('/api/workspace.json')
      .then((r) => r.json())
      .then((d: WorkspaceStats) => setStats(d))
      .catch(() => undefined);
  }, []);
  return stats;
}

export function TasksSidebar({
  projectName,
  view,
  onViewChange,
  taskCount = 0,
  docs = [],
  selectedDoc = null,
  onSelectDoc,
}: TasksSidebarProps) {
  const { s } = useI18n();
  const ws = useWorkspaceStats();
  const docDisplayTitles = useMemo(() => stripSharedTitlePrefix(docs), [docs]);
  const docGroups = useMemo(() => groupDocs(docs), [docs]);
  const menuItems = useMemo(() => getMenuItems(s), [s]);

  const metrics = [
    {
      label: s.sidebar.metrics.agents,
      value: ws?.agents ?? taskCount,
      color: 'var(--primary)',
    },
    {
      label: s.sidebar.metrics.tasks,
      value: taskCount,
      color: 'var(--primary)',
    },
    {
      label: s.sidebar.metrics.skills,
      value: ws?.skills ?? '—',
      color: '#a78bfa',
    },
    {
      label: s.sidebar.metrics.commands,
      value: ws?.commands ?? '—',
      color: '#f6ad55',
    },
    {
      label: s.sidebar.metrics.rules,
      value: ws?.rules ?? '—',
      color: '#68d391',
    },
  ];

  return (
    <Sidebar className="border-r border-sidebar-border">
      {/* ── Brand ─────────────────────────────── */}
      <SidebarHeader className="px-5 pt-6 pb-5">
        <div className="flex items-center gap-3.5">
          {/* Logo: brand tile — near-black + glow in dark, soft primary tint in light */}
          <div className="size-9 rounded-lg brand-tile flex items-center justify-center shrink-0">
            <ClaudeLogo className="size-5 text-primary" />
          </div>
          <div className="min-w-0">
            <div
              className="text-base font-bold leading-tight tracking-tight truncate"
              title={projectName || s.sidebar.projectFallback}
            >
              {projectName || s.sidebar.projectFallback}
            </div>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-3 flex flex-col">
        {/* ── Navigation ───────────────────────── */}
        <SidebarGroup className="p-0">
          <SidebarGroupLabel className="px-2 mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-primary/80">
            {s.sidebar.navGroup}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const isActive = item.id === view;
                const showDocsSub = item.id === 'docs' && isActive && docs.length > 0;
                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      onClick={() => onViewChange(item.id)}
                      className={cn(
                        'h-9 px-3 rounded-base transition-all text-sm cursor-pointer',
                        isActive
                          ? 'bg-card text-foreground border border-primary/60 shadow-[0_0_12px_-4px_color-mix(in_oklch,var(--primary)_40%,transparent)]'
                          : 'text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/50 border border-transparent',
                      )}
                    >
                      <item.icon
                        className={cn('size-3 shrink-0', isActive ? 'text-primary' : '')}
                      />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                    {showDocsSub && (
                      <SidebarMenuSub className="mt-2 mx-4.5 pr-0 pl-2">
                        {docGroups.ungrouped.map((d) => (
                          <SidebarMenuSubItem key={d.path}>
                            <SidebarMenuSubButton
                              size="sm"
                              href="#"
                              title={d.title}
                              isActive={d.path === selectedDoc}
                              onClick={(e) => {
                                e.preventDefault();
                                onSelectDoc?.(d.path);
                              }}
                            >
                              <span className="truncate">
                                {docDisplayTitles.get(d.path) ?? d.title}
                              </span>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                        {docGroups.groups.map(([groupName, groupDocsList]) => (
                          <SidebarMenuSubItem key={groupName}>
                            <div className="flex items-center gap-1.5 px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground/70">
                              <Folder className="size-3.5 shrink-0" />
                              <span className="truncate">{groupName}</span>
                            </div>
                            <SidebarMenuSub className="mr-0 pr-0">
                              {groupDocsList.map((d) => (
                                <SidebarMenuSubItem key={d.path}>
                                  <SidebarMenuSubButton
                                    size="sm"
                                    href="#"
                                    title={d.title}
                                    isActive={d.path === selectedDoc}
                                    onClick={(e) => {
                                      e.preventDefault();
                                      onSelectDoc?.(d.path);
                                    }}
                                  >
                                    <span className="truncate text-[13px]">
                                      {docDisplayTitles.get(d.path) ?? d.title}
                                    </span>
                                  </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                              ))}
                            </SidebarMenuSub>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    )}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* spacer pushes System Status toward bottom */}
        <div className="flex-1" />

        {/* ── System Status ────────────────────── */}
        <SidebarGroup className="p-0 mb-3">
          <SidebarGroupLabel className="px-2 mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
            {s.sidebar.systemStatus}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="rounded-lg border border-sidebar-border bg-sidebar/60 overflow-hidden">
              {metrics.map((m, i) => (
                <div
                  key={m.label}
                  className={cn(
                    'flex items-center px-3 py-2',
                    i < metrics.length - 1 && 'border-b border-sidebar-border/40',
                  )}
                >
                  <span className="text-[11px] text-muted-foreground flex-1">{m.label}</span>
                  <div className="flex items-center gap-1.5">
                    <span
                      className="text-[11px] font-semibold tabular-nums"
                      style={{ color: m.color }}
                    >
                      {m.value}
                    </span>
                    <span
                      className="size-1.5 rounded-full animate-pulse"
                      style={{ backgroundColor: m.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* ── User profile ─────────────────────── */}
      <SidebarFooter className="p-3 pt-0">
        <div className="flex items-center gap-3 rounded-xl border border-sidebar-border bg-sidebar/60 px-3 py-2.5">
          {/* Hacker avatar — larger, dark bg, orange border ring */}
          <div
            className="size-12 rounded-full shrink-0 overflow-hidden"
            style={{
              boxShadow:
                '0 0 0 1.5px color-mix(in oklch, var(--primary) 60%, transparent), 0 0 10px -2px color-mix(in oklch, var(--primary) 35%, transparent)',
            }}
          >
            <svg viewBox="0 0 100 100" fill="none" className="size-12" aria-hidden="true">
              {/* Background — very dark */}
              <circle cx="50" cy="50" r="50" fill="#0f0e0d" />

              {/* Cloak / body — wide dark shape filling lower half */}
              <path
                d="M0 100 Q5 68 25 58 Q38 52 50 50 Q62 52 75 58 Q95 68 100 100Z"
                fill="#1a1714"
              />

              {/* Hood outer — large dark arch */}
              <path d="M14 46 Q15 10 50 8 Q85 10 86 46 Q80 34 50 32 Q20 34 14 46Z" fill="#1c1a17" />

              {/* Hood inner shadow — slightly lighter arch */}
              <path
                d="M20 48 Q22 20 50 18 Q78 20 80 48 Q74 36 50 35 Q26 36 20 48Z"
                fill="#252118"
              />

              {/* Face area — very dark oval, slightly lighter than bg */}
              <ellipse cx="50" cy="46" rx="16" ry="18" fill="#141210" />

              {/* Subtle face gradient via a slightly lighter center */}
              <ellipse cx="50" cy="44" rx="11" ry="13" fill="#181512" />

              {/* Eyes — amber/orange glow, small */}
              <ellipse cx="43" cy="43" rx="2.8" ry="2.2" fill="#c8611a" opacity="0.75" />
              <ellipse cx="57" cy="43" rx="2.8" ry="2.2" fill="#c8611a" opacity="0.75" />
              {/* Eye inner highlight */}
              <ellipse cx="43" cy="43" rx="1.4" ry="1.1" fill="#e8844a" opacity="0.6" />
              <ellipse cx="57" cy="43" rx="1.4" ry="1.1" fill="#e8844a" opacity="0.6" />

              {/* Hood lip / brim shadow at bottom of hood */}
              <path
                d="M22 50 Q36 55 50 54 Q64 55 78 50 Q74 58 50 58 Q26 58 22 50Z"
                fill="#111"
                opacity="0.7"
              />

              {/* Shoulder / cloak drape */}
              <path d="M0 100 L0 78 Q18 62 50 60 Q82 62 100 78 L100 100Z" fill="#131110" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold leading-tight">{s.sidebar.operator}</div>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="size-1.5 rounded-full bg-emerald-500 shrink-0" />
              <span className="text-[11px] text-emerald-500 font-medium">{s.sidebar.online}</span>
            </div>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
