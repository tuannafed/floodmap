import { FileText } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import type { DocSummary } from '@/hooks/use-docs';
import { useI18n } from '@/lib/i18n/context';
import { docUrl } from './doc-export-menu';

interface DocsViewProps {
  docs: DocSummary[];
  configured: boolean;
  loading: boolean;
  selected: string | null;
}

// List + selection now live in the sidebar's Docs submenu (TasksSidebar) —
// this is just the preview pane for whatever's selected there.
export function DocsView({ docs, configured, loading, selected }: DocsViewProps) {
  const { s, lang } = useI18n();
  const selectedDoc = docs.find((d) => d.path === selected) ?? null;

  if (loading) {
    return (
      <div className="p-6 space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-8 w-56" />
      </div>
    );
  }

  if (!configured) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm max-w-lg mx-auto mt-8">
          <FileText className="size-8 mx-auto mb-3 text-muted-foreground/50" />
          <p className="font-medium text-foreground mb-1.5">{s.docs.notConfiguredTitle}</p>
          <p className="text-muted-foreground leading-relaxed">
            {lang === 'vi' ? (
              <>
                <code className="px-1 py-0.5 rounded bg-muted/40 text-xs">docs/</code> và{' '}
                <code className="px-1 py-0.5 rounded bg-muted/40 text-xs">specs/</code> được tự động
                nhận diện — tạo 1 trong 2 thư mục này ở gốc project, hoặc thêm mảng{' '}
                <code className="px-1 py-0.5 rounded bg-muted/40 text-xs">docPaths</code> vào{' '}
                <code className="px-1 py-0.5 rounded bg-muted/40 text-xs">
                  .claude/caw.config.json
                </code>{' '}
                cho thư mục khác, ví dụ{' '}
                <code className="px-1 py-0.5 rounded bg-muted/40 text-xs">
                  ["specs", "docs/reports"]
                </code>
                .
              </>
            ) : (
              <>
                <code className="px-1 py-0.5 rounded bg-muted/40 text-xs">docs/</code> and{' '}
                <code className="px-1 py-0.5 rounded bg-muted/40 text-xs">specs/</code> are
                auto-detected — create one at the project root, or add a{' '}
                <code className="px-1 py-0.5 rounded bg-muted/40 text-xs">docPaths</code> array to{' '}
                <code className="px-1 py-0.5 rounded bg-muted/40 text-xs">
                  .claude/caw.config.json
                </code>{' '}
                for any other folder, e.g.{' '}
                <code className="px-1 py-0.5 rounded bg-muted/40 text-xs">
                  ["specs", "docs/reports"]
                </code>
                .
              </>
            )}
          </p>
        </div>
      </div>
    );
  }

  if (docs.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
        {s.docs.noHtmlFound}
      </div>
    );
  }

  return (
    <div className="h-full min-h-0">
      {selectedDoc ? (
        <iframe
          key={selectedDoc.path}
          src={docUrl(selectedDoc.path)}
          title={selectedDoc.title}
          className="w-full h-full border-0 bg-white"
          // allow-scripts only, deliberately WITHOUT allow-same-origin: docs
          // built by the technical-doc-html skill use Mermaid/GSAP, which
          // need script execution to render — but allow-scripts + same-origin
          // together would let that script read this page's cookies/
          // localStorage and call /api/* as an authenticated same-origin
          // request. Without allow-same-origin the iframe gets a distinct
          // opaque origin: scripts still run, but can't reach the parent page
          // or the viewer's own API.
          sandbox="allow-scripts"
        />
      ) : (
        <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
          {s.docs.selectPrompt}
        </div>
      )}
    </div>
  );
}
