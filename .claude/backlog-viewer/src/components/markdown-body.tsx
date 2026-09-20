import { Download, Eye, FileCode } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useI18n } from '@/lib/i18n/context';
import { renderMarkdown } from '@/lib/markdown';
import { exportHtml, exportMarkdown } from '@/lib/markdown-tools';
import { cn } from '@/lib/utils';

type Mode = 'preview' | 'raw';

interface MarkdownBodyProps {
  content: string;
  filenameBase: string;
  title: string;
}

// Shared preview/raw toggle + export menu for every markdown panel (task
// sections, conventions/knowledge/CLAUDE.md, rule files, SKILL.md bodies).
// Callers keep their own path-breadcrumb and empty/not-found states — this
// only replaces the `dangerouslySetInnerHTML` body once content is known
// non-empty.
export function MarkdownBody({ content, filenameBase, title }: MarkdownBodyProps) {
  const { s } = useI18n();
  const [mode, setMode] = useState<Mode>('preview');

  return (
    <div>
      <div className="flex items-center justify-end gap-1.5 mb-3">
        <div className="flex items-center gap-0.5 rounded-lg border border-border p-0.5">
          <button
            type="button"
            onClick={() => setMode('preview')}
            aria-label={s.markdownTools.preview}
            className={cn(
              'flex items-center justify-center size-6 rounded-md transition-colors',
              mode === 'preview'
                ? 'bg-primary/15 text-primary'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
            )}
          >
            <Eye className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setMode('raw')}
            aria-label={s.markdownTools.raw}
            className={cn(
              'flex items-center justify-center size-6 rounded-md transition-colors',
              mode === 'raw'
                ? 'bg-primary/15 text-primary'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
            )}
          >
            <FileCode className="size-3.5" />
          </button>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label={s.markdownTools.export}>
              <Download className="size-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => exportMarkdown(filenameBase, content)}>
              {s.markdownTools.exportMarkdown}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => exportHtml(filenameBase, content, title)}>
              {s.markdownTools.exportHtml}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {mode === 'preview' ? (
        <div
          className="prose-task max-w-none"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
        />
      ) : (
        <pre className="font-mono text-[12.5px] leading-relaxed bg-muted/40 border border-border rounded-lg p-4 overflow-x-auto whitespace-pre-wrap">
          {content}
        </pre>
      )}
    </div>
  );
}
