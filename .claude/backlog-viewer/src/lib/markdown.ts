import DOMPurify, { type Config } from 'isomorphic-dompurify';
import { marked } from 'marked';

marked.setOptions({
  gfm: true,
  breaks: false,
});

// Task/skill/doc markdown ends up here from files any agent (or a
// compromised/malicious task write) can put content into, then straight into
// `dangerouslySetInnerHTML` in task-dialog.tsx, project-info.tsx,
// overview-tab.tsx, skills-view.tsx — sanitize is mandatory, not optional.
// isomorphic-dompurify works both server-side (Astro SSR, via its bundled
// jsdom) and client-side (React island hydration, via the browser's real DOM).
const SANITIZE_CONFIG: Config = {
  // No inline event handlers (DOMPurify strips on*/on-* attrs by default), no
  // <script>, no <style>, no <iframe>/<object>/<embed>/<form> — markdown
  // output never legitimately needs any of these. `javascript:`/`data:` hrefs
  // (e.g. `[x](javascript:alert(1))`) are already stripped by DOMPurify's own
  // default ALLOWED_URI_REGEXP — not overridden here, that default is
  // deliberately conservative and reinventing it risks a subtle bypass.
  FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form'],
  FORBID_ATTR: ['style'],
};

export function renderMarkdown(text: string): string {
  if (!text?.trim()) return '';
  try {
    const out = marked.parse(text);
    const html = typeof out === 'string' ? out : '';
    return DOMPurify.sanitize(html, SANITIZE_CONFIG);
  } catch {
    return escapeHtml(text);
  }
}

function escapeHtml(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
