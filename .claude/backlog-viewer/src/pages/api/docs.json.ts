import type { APIRoute } from 'astro';
import { readCawConfig } from '@/lib/caw-config';
import { IS_STATIC } from '@/lib/deploy-target';
import { listDocs } from '@/lib/doc-parser';
import { isDevMode, MOCK_DOCS } from '@/lib/mock-data';
import { getProjectRoot } from '@/lib/project-root';

export const prerender = IS_STATIC;

interface DocsResponse {
  docs: import('@/lib/doc-parser').DocSummary[];
  configured: boolean; // false when docPaths is empty/unset — UI shows setup hint, not "no docs"
}

export const GET: APIRoute = async () => {
  if (IS_STATIC) {
    // No filesystem access at runtime on Vercel — same precedent as /api/events.
    const body: DocsResponse = { docs: [], configured: false };
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  }

  const root = getProjectRoot();
  const config = await readCawConfig(root);

  // isDevMode() (`.claude/conductor` missing) is the right mock gate for
  // tasks/skills, which genuinely have no data without a real caw project.
  // Docs has its own explicit opt-in signal — a configured `docPaths` — so a
  // repo that's a real caw *hub* rather than a caw-init'd project (no
  // `.claude/conductor`, e.g. this monorepo's own root) still gets real doc
  // scanning once docPaths is set, instead of being stuck on the mock demo
  // data forever. Only fall back to the mock when NEITHER signal is present.
  if (config.docPaths.length === 0 && isDevMode(root)) {
    const body: DocsResponse = { docs: MOCK_DOCS, configured: true };
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
    });
  }

  try {
    const docs = await listDocs(root);
    const body: DocsResponse = { docs, configured: config.docPaths.length > 0 };
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
