import { readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';

export interface CawConfig {
  caw_home?: string;
  // Project-relative folders to scan for standalone HTML docs (e.g. specs
  // produced by the technical-doc-html skill). Explicit entries are written
  // by the user in `.claude/caw.config.json`; when absent, readCawConfig()
  // falls back to whichever DEFAULT_DOC_CANDIDATES exist on disk — see below.
  docPaths: string[];
}

// Conventional folder names to auto-detect when the user hasn't set
// `docPaths` explicitly — matches the example in the backlog-viewer README.
// Intentionally NOT a full-project scan: that would sweep in noise like
// `coverage/`, `playwright-report/`, `storybook-static/`, etc. A project
// whose docs live somewhere else still needs an explicit `docPaths` entry.
const DEFAULT_DOC_CANDIDATES = ['docs', 'specs'];

async function isDirectory(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isDirectory();
  } catch {
    return false;
  }
}

/**
 * Reads `<project>/.claude/caw.config.json`, written by `caw init` with just
 * `{ "caw_home": ... }`. Missing file / malformed JSON / wrong field types all
 * resolve to an empty config rather than throwing — this file is optional
 * from the viewer's perspective.
 *
 * When `docPaths` isn't set (or is empty) in the file, this auto-detects
 * `DEFAULT_DOC_CANDIDATES` that exist as real directories under the project
 * root, so common conventions work with zero config — an explicit
 * `docPaths` in the file always wins and skips auto-detection entirely.
 */
export async function readCawConfig(projectRoot: string): Promise<CawConfig> {
  let caw_home: string | undefined;
  let docPaths: string[] = [];
  try {
    const raw = await readFile(join(projectRoot, '.claude', 'caw.config.json'), 'utf8');
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    caw_home = typeof parsed.caw_home === 'string' ? parsed.caw_home : undefined;
    docPaths = Array.isArray(parsed.docPaths)
      ? parsed.docPaths.filter((p): p is string => typeof p === 'string' && p.trim().length > 0)
      : [];
  } catch {
    // Missing/malformed config file — fall through to auto-detection below.
  }

  if (docPaths.length === 0) {
    const detected = await Promise.all(
      DEFAULT_DOC_CANDIDATES.map(async (candidate) =>
        (await isDirectory(join(projectRoot, candidate))) ? candidate : null,
      ),
    );
    docPaths = detected.filter((d): d is string => d !== null);
  }

  return { caw_home, docPaths };
}
