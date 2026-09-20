import { describe, expect, it } from 'vitest';
import { resolveSimpleIcon, withResolvedIcons } from './icon-resolve';

describe('resolveSimpleIcon', () => {
  it('resolves a direct title match', () => {
    const icon = resolveSimpleIcon('React');
    expect(icon).not.toBeNull();
    expect(icon?.title.toLowerCase()).toBe('react');
  });

  it('resolves via a name alias (nextjs -> Next.js)', () => {
    const icon = resolveSimpleIcon('nextjs');
    expect(icon).not.toBeNull();
    expect(icon?.title).toBe('Next.js');
  });

  it('resolves via a name alias (postgres -> PostgreSQL)', () => {
    const icon = resolveSimpleIcon('postgres');
    expect(icon).not.toBeNull();
    expect(icon?.title).toBe('PostgreSQL');
  });

  it('resolves a loose contains-match (Expo Router -> Expo)', () => {
    const icon = resolveSimpleIcon('Expo Router');
    expect(icon).not.toBeNull();
  });

  it('falls back to null for a name with no matching brand icon', () => {
    // Normalizes to '' (non-alphanumeric stripped) — the loose contains-match loop
    // requires the normalized key to be >= 3 chars, so this is deterministically
    // unmatched regardless of which single/two-letter brand titles the icon set has.
    const icon = resolveSimpleIcon('!!!');
    expect(icon).toBeNull();
  });

  it('returns a record with title/hex/path', () => {
    const icon = resolveSimpleIcon('TypeScript');
    expect(icon).toMatchObject({
      title: expect.any(String),
      hex: expect.any(String),
      path: expect.any(String),
    });
  });
});

describe('withResolvedIcons', () => {
  it('attaches iconSvg per item without mutating the input', () => {
    const stack = [{ name: 'React', version: '19', role: 'Frontend', icon: 'react' }];
    const result = withResolvedIcons(stack);
    expect(result[0].iconSvg).not.toBeNull();
    expect(result[0].name).toBe('React');
    expect('iconSvg' in stack[0]).toBe(false);
  });

  it('sets iconSvg to null for an unresolvable name', () => {
    const stack = [{ name: '!!!', version: '', role: 'Other', icon: 'generic' }];
    const result = withResolvedIcons(stack);
    expect(result[0].iconSvg).toBeNull();
  });
});
