import { Download } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { DocSummary } from '@/hooks/use-docs';
import { useI18n } from '@/lib/i18n/context';
import {
  basenameNoExt,
  exportDocExcel,
  exportDocHtml,
  extractHtmlTables,
} from '@/lib/markdown-tools';

export function docUrl(path: string): string {
  // Path segments come from the server's own directory walk (see
  // doc-parser.ts), but still encode each segment individually — a folder or
  // filename with a space or `#` would otherwise break routing.
  return `/api/docs/${path.split('/').map(encodeURIComponent).join('/')}`;
}

// Docs have no reliable markdown source (see extractHtmlTables) — export is
// scoped to what's actually guaranteed to exist: the rendered .html itself,
// and whatever <table> elements are in it. No preview/raw toggle here, since
// there's no separate source to toggle to.
export function DocExportMenu({ doc }: { doc: DocSummary }) {
  const { s } = useI18n();
  const [html, setHtml] = useState<string | null>(null);

  useEffect(() => {
    setHtml(null);
    fetch(docUrl(doc.path))
      .then((r) => r.text())
      .then(setHtml)
      .catch(() => setHtml(''));
  }, [doc.path]);

  const filenameBase = basenameNoExt(doc.path);
  const hasTables = html ? extractHtmlTables(html).length > 0 : false;

  const handleExportExcel = async () => {
    if (!html) return;
    try {
      const ok = await exportDocExcel(filenameBase, html);
      if (!ok) window.alert(s.markdownTools.noTables);
    } catch (err) {
      console.error('Excel export failed', err);
      window.alert(s.markdownTools.exportFailed);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          disabled={html === null}
          aria-label={s.markdownTools.export}
          className="h-8 min-w-8 px-2 rounded-md brand-tile flex items-center justify-center transition-colors text-[11px] cursor-pointer font-bold uppercase tracking-wide"
        >
          <Download className="size-3.5 text-primary" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          disabled={!html}
          onClick={() => html && exportDocHtml(filenameBase, html)}
        >
          {s.markdownTools.exportHtml}
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={!hasTables}
          title={hasTables ? undefined : s.markdownTools.noTables}
          onClick={handleExportExcel}
        >
          {s.markdownTools.exportExcel}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
