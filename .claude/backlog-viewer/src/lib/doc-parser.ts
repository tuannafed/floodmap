import { readdir, readFile, stat } from 'node:fs/promises';
import { basename, join, relative, sep } from 'node:path';
import { readCawConfig } from './caw-config';

export interface DocSummary {
  path: string; // relative to project root, e.g. specs/BD/260810/overview.html
  title: string; // from <title>, falls back to the filename
  folder: string; // which configured docPaths entry this was found under
  group: string | null; // first subfolder under `folder`, e.g. "BD" for specs/BD/x.html — null if directly under the configured root
  mtimeMs: number;
}

// Safety caps — a misconfigured docPaths entry (e.g. accidentally pointing at
// the whole project) shouldn't be able to walk forever or return thousands of
// rows to the UI.
const MAX_DOCS = 500;
const IGNORE_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  '.next',
  '.astro',
  '.vercel',
]);

async function walk(dir: string, out: string[]): Promise<void> {
  if (out.length >= MAX_DOCS) return;
  let entries: import('node:fs').Dirent[];
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return; // configured path doesn't exist yet — not an error, just empty
  }
  for (const entry of entries) {
    if (out.length >= MAX_DOCS) return;
    if (entry.isDirectory()) {
      if (IGNORE_DIRS.has(entry.name)) continue;
      await walk(join(dir, entry.name), out);
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.html')) {
      out.push(join(dir, entry.name));
    }
  }
}

// The regex below pulls the raw text node between <title> tags — HTML
// entities in there (the technical-doc-html skill writes titles like
// "Kiến trúc &amp; hạ tầng") are still escaped and need decoding before
// display, or the sidebar shows the literal "&amp;" instead of "&".
const NAMED_HTML_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
};

function decodeHtmlEntities(text: string): string {
  return text.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (match, entity: string) => {
    if (entity[0] === '#') {
      const isHex = entity[1] === 'x' || entity[1] === 'X';
      const code = Number.parseInt(entity.slice(isHex ? 2 : 1), isHex ? 16 : 10);
      return Number.isNaN(code) ? match : String.fromCodePoint(code);
    }
    return NAMED_HTML_ENTITIES[entity] ?? match;
  });
}

function extractTitle(html: string, fallback: string): string {
  const m = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  const title = m?.[1] ? decodeHtmlEntities(m[1]).trim() : '';
  return title || fallback;
}

/**
 * Recursively finds `*.html` files under each `docPaths` entry from
 * `.claude/caw.config.json`. Each configured path is scanned independently —
 * a typo'd/missing folder just yields no docs from that entry, not an error.
 */
export async function listDocs(projectRoot: string): Promise<DocSummary[]> {
  const { docPaths } = await readCawConfig(projectRoot);
  const out: DocSummary[] = [];

  for (const folder of docPaths) {
    const abs = join(projectRoot, folder);
    const found: string[] = [];
    await walk(abs, found);

    for (const file of found) {
      let mtimeMs = 0;
      let title = basename(file, '.html');
      try {
        const [st, raw] = await Promise.all([stat(file), readFile(file, 'utf8')]);
        mtimeMs = st.mtimeMs;
        title = extractTitle(raw, title);
      } catch {
        continue;
      }
      const relToFolder = relative(abs, file).split(sep);
      const group = relToFolder.length > 1 ? relToFolder[0] : null;
      out.push({ path: relative(projectRoot, file), title, folder, group, mtimeMs });
    }
  }

  out.sort((a, b) => b.mtimeMs - a.mtimeMs);
  return out;
}

/**
 * Resolves a doc's relative path back to an absolute filesystem path — but
 * only if it's one `listDocs()` actually discovered under a configured
 * `docPaths` entry. This is the whitelist: the raw-content route trusts a
 * user-supplied URL segment only after confirming it matches something we
 * ourselves found, the same pattern `getSkill()` uses against `listSkills()`.
 */
export async function getDocPath(projectRoot: string, relPath: string): Promise<string | null> {
  const docs = await listDocs(projectRoot);
  // Astro's rest-param router strips a trailing `.html` from the URL before
  // populating `params.path` (treats it like the implicit page-extension
  // convention) — confirmed live: a request for `.../overview.html` arrives
  // here as `.../overview`. Every doc we track ends in `.html`, so accept
  // both forms rather than depend on that routing behavior staying exact.
  const withExt = relPath.endsWith('.html') ? relPath : `${relPath}.html`;
  const found = docs.find((d) => d.path === relPath || d.path === withExt);
  return found ? join(projectRoot, found.path) : null;
}
