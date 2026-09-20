// Preview + export helpers for the raw markdown already loaded client-side
// (task sections, conventions/knowledge/CLAUDE.md, rule files, SKILL.md
// bodies), plus the docs (technical-doc-html output) export path below.
// All exports are pure client-side — no server round-trip.
import { renderMarkdown } from './markdown';

// "conductor/rules/common/harness-contract.md" → "harness-contract"
export function basenameNoExt(path: string): string {
  const base = path.split('/').pop() || path;
  return base.replace(/\.[^.]+$/, '');
}

export interface MarkdownTable {
  title: string;
  header: string[];
  rows: string[][];
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportMarkdown(filenameBase: string, rawText: string) {
  triggerDownload(
    new Blob([rawText], { type: 'text/markdown;charset=utf-8' }),
    `${filenameBase}.md`,
  );
}

export function exportHtml(filenameBase: string, rawText: string, title: string) {
  const body = renderMarkdown(rawText);
  const doc = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${title}</title>
<style>
  body { max-width: 860px; margin: 2.5rem auto; padding: 0 1.5rem; font: 15px/1.6 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #1f1b18; }
  h1, h2, h3, h4 { font-weight: 600; line-height: 1.3; }
  code, pre { font-family: ui-monospace, "SF Mono", monospace; }
  code { background: #f1ede9; padding: 0.15em 0.4em; border-radius: 4px; font-size: 0.9em; }
  pre { background: #f1ede9; padding: 1em; border-radius: 8px; overflow-x: auto; }
  pre code { background: none; padding: 0; }
  table { border-collapse: collapse; width: 100%; }
  th, td { border: 1px solid #ddd6cf; padding: 0.5em 0.75em; text-align: left; }
  th { background: #f1ede9; }
  blockquote { border-left: 3px solid #ddd6cf; margin-left: 0; padding-left: 1em; color: #6b6259; }
</style>
</head>
<body>
${body}
</body>
</html>
`;
  triggerDownload(new Blob([doc], { type: 'text/html;charset=utf-8' }), `${filenameBase}.html`);
}

// ExcelJS worksheet names: no `* ? : \ / [ ]`, no leading/trailing `'`, not
// "History", not empty, max 31 chars. Markdown headings routinely contain
// colons and slashes (e.g. "API: GET /users"), so this isn't an edge case —
// addWorksheet() throws synchronously on any of these, which is what made
// export fail on real docs while a plain "Stack"/"Team" heading worked fine.
export function sanitizeSheetName(title: string, fallback: string): string {
  const cleaned = title
    .replace(/[*?:/\\[\]]/g, '')
    .replace(/^'+|'+$/g, '')
    .trim();
  const base = cleaned && cleaned !== 'History' ? cleaned : fallback;
  return base.slice(0, 31);
}

// Shared by both the markdown-sourced and HTML-sourced Excel exports — one
// worksheet per table, sanitized/deduped names, bold header row, auto width.
// Dynamically imported (ExcelJS is ~1MB) so it doesn't sit in every route's
// initial bundle when most panels never touch the export menu.
async function buildWorkbook(tables: MarkdownTable[]) {
  const ExcelJS = (await import('exceljs')).default;
  const workbook = new ExcelJS.Workbook();
  const usedNames = new Set<string>();

  tables.forEach((table, i) => {
    const fallback = `Table ${i + 1}`;
    let name = sanitizeSheetName(table.title, fallback);
    let suffix = 2;
    while (usedNames.has(name.toLowerCase())) {
      const base = sanitizeSheetName(table.title, fallback).slice(
        0,
        31 - String(suffix).length - 1,
      );
      name = `${base} ${suffix}`;
      suffix += 1;
    }
    usedNames.add(name.toLowerCase());

    const sheet = workbook.addWorksheet(name);
    sheet.addRow(table.header);
    sheet.getRow(1).font = { bold: true };
    for (const row of table.rows) sheet.addRow(row);
    sheet.columns.forEach((col) => {
      let maxLen = 10;
      col.eachCell?.({ includeEmpty: true }, (cell) => {
        maxLen = Math.max(maxLen, String(cell.value ?? '').length);
      });
      col.width = Math.min(maxLen + 2, 60);
    });
  });

  return workbook;
}

// Excel export only applies to docs (see extractHtmlTables below) — Task
// Dialog / Project Info / Skill Sheet markdown panels export Markdown/HTML
// only. Exported (not just internal) so the "empty tables → no download"
// short-circuit stays covered by a plain Node test without needing a DOM.
export async function downloadWorkbook(
  filenameBase: string,
  tables: MarkdownTable[],
): Promise<boolean> {
  if (tables.length === 0) return false;
  const workbook = await buildWorkbook(tables);
  const buffer = await workbook.xlsx.writeBuffer();
  triggerDownload(
    new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
    `${filenameBase}.xlsx`,
  );
  return true;
}

// Docs (technical-doc-html output) have no reliable markdown source on disk —
// the skill doesn't guarantee the .md it was built from stays colocated with
// the generated .html (verified empirically: none of it did on a real
// project). The .html is the one artifact guaranteed to exist, so tables are
// read straight out of its rendered DOM instead.
export function extractHtmlTables(html: string): MarkdownTable[] {
  if (!html?.trim()) return [];
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const nodes = doc.body.querySelectorAll('h1, h2, h3, h4, h5, h6, table');
  const tables: MarkdownTable[] = [];
  let lastHeading = '';
  let unnamedCount = 0;

  for (const node of nodes) {
    if (node.tagName === 'TABLE') {
      const [header, ...rows] = Array.from((node as HTMLTableElement).rows).map((row) =>
        Array.from(row.cells).map((cell) => (cell.textContent ?? '').trim().replace(/\s+/g, ' ')),
      );
      if (!header) continue;
      unnamedCount += 1;
      tables.push({ title: lastHeading || `Table ${unnamedCount}`, header, rows });
    } else {
      lastHeading = (node.textContent ?? '').trim();
    }
  }
  return tables;
}

export async function exportDocExcel(filenameBase: string, html: string): Promise<boolean> {
  return downloadWorkbook(filenameBase, extractHtmlTables(html));
}

// The doc is already a complete standalone .html file (that's the whole
// point of technical-doc-html) — exporting it is just saving it verbatim,
// no markdown round-trip needed.
export function exportDocHtml(filenameBase: string, html: string) {
  triggerDownload(new Blob([html], { type: 'text/html;charset=utf-8' }), `${filenameBase}.html`);
}
