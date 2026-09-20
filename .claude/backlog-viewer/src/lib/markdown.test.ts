import { describe, expect, it } from 'vitest';
import { renderMarkdown } from './markdown';

describe('renderMarkdown', () => {
  it('strips <script> tags entirely', () => {
    const out = renderMarkdown('hello <script>alert(1)</script> world');
    expect(out).not.toContain('<script');
    expect(out).not.toContain('alert(1)');
  });

  it('strips an onerror handler from an <img> tag', () => {
    const out = renderMarkdown('<img src=x onerror=alert(1)>');
    expect(out).not.toContain('onerror');
    expect(out).not.toContain('alert(1)');
  });

  it('strips a javascript: URL from a markdown link', () => {
    const out = renderMarkdown('[x](javascript:alert(1))');
    expect(out).not.toContain('javascript:');
    expect(out).not.toContain('alert(1)');
  });

  it('strips a javascript: URL from a raw <a href>', () => {
    const out = renderMarkdown('<a href="javascript:alert(document.cookie)">click</a>');
    expect(out).not.toContain('javascript:');
  });

  it('strips inline event handler attributes generally (onclick, onload, ...)', () => {
    const out = renderMarkdown('<div onclick="alert(1)" onload="alert(2)">text</div>');
    expect(out).not.toMatch(/\bon\w+\s*=/i);
  });

  it('strips <iframe> tags', () => {
    const out = renderMarkdown('<iframe src="https://evil.example/"></iframe>');
    expect(out).not.toContain('<iframe');
  });

  it('strips <style> tags and inline style attributes', () => {
    const out = renderMarkdown('<style>body{display:none}</style><p style="color:red">x</p>');
    expect(out).not.toContain('<style');
    expect(out).not.toContain('style=');
  });

  it('preserves legitimate markdown formatting', () => {
    const out = renderMarkdown(
      '# Title\n\n**bold** and _italic_ and [a link](https://example.com)',
    );
    expect(out).toContain('<h1');
    expect(out).toContain('<strong>bold</strong>');
    expect(out).toContain('<em>italic</em>');
    expect(out).toContain('href="https://example.com"');
    expect(out).toContain('a link');
  });

  it('preserves a normal fenced code block', () => {
    const out = renderMarkdown('```js\nconst x = 1;\n```');
    expect(out).toContain('<pre>');
    expect(out).toContain('<code');
    expect(out).toContain('const x = 1;');
  });

  it('returns empty string for empty/whitespace-only input', () => {
    expect(renderMarkdown('')).toBe('');
    expect(renderMarkdown('   \n  ')).toBe('');
  });
});
