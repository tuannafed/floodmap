import { readFile } from 'node:fs/promises';
import type { APIRoute, GetStaticPaths } from 'astro';
import { IS_STATIC } from '@/lib/deploy-target';
import { getDocPath } from '@/lib/doc-parser';
import { getProjectRoot } from '@/lib/project-root';

// Raw-content route (not a `.json.ts`) — the iframe in DocsView points its
// `src` straight at this URL, so the response body must be the doc's actual
// HTML, not JSON. Meaningless on Vercel's static snapshot (no live project
// tree at runtime) — same precedent as /api/events, so it prerenders to
// nothing there rather than trying to bundle every doc file into the build.
export const prerender = IS_STATIC;

export const getStaticPaths: GetStaticPaths = async () => [];

export const GET: APIRoute = async ({ params }) => {
  if (IS_STATIC) {
    return new Response('Not available in the static build', { status: 404 });
  }

  const relPath = params.path;
  if (typeof relPath !== 'string' || !relPath) {
    return new Response('Not found', { status: 404 });
  }

  const root = getProjectRoot();
  // getDocPath() only resolves paths that listDocs() itself discovered by
  // walking the configured docPaths entries — that's the whitelist. The URL
  // segment is untrusted input, but it can never escape to an arbitrary
  // filesystem path since we never join() it directly; a request for a path
  // outside the configured folders (or with ../ segments) simply won't match
  // anything in the discovered list and falls through to 404.
  const abs = await getDocPath(root, relPath);
  if (!abs) {
    return new Response('Not found', { status: 404 });
  }

  try {
    const html = await readFile(abs, 'utf8');
    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    });
  } catch {
    return new Response('Not found', { status: 404 });
  }
};
