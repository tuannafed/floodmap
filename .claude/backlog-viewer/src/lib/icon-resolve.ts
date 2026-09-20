// icon-resolve.ts — SERVER-ONLY brand-icon lookup. Only ever imported by API routes
// (src/pages/api/*.ts), never by a client-rendered component — `simple-icons` (the whole
// icon library) must never end up in the browser bundle. Resolution happens once per API
// response, in resolveStackIcons() below; overview-tab.tsx (a client component) just renders
// whatever `iconSvg` each stack item already carries.
import * as simpleIcons from 'simple-icons';

// One simple-icon record: title, brand hex (no '#'), and the SVG path.
export type IconRecord = { title: string; hex: string; path: string };

// Index every simple-icon by a normalized title for fuzzy lookup by tech name.
const ICON_BY_TITLE: Record<string, IconRecord> = (() => {
  const map: Record<string, IconRecord> = {};
  for (const value of Object.values(simpleIcons)) {
    const icon = value as Partial<IconRecord>;
    if (icon && typeof icon === 'object' && icon.title && icon.path && icon.hex) {
      map[normalize(icon.title)] = icon as IconRecord;
    }
  }
  return map;
})();

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Tech names in conventions.md don't always match simple-icons titles 1:1.
// Map a stack item's name → the simple-icons title to look up.
const NAME_ALIASES: Record<string, string> = {
  nextjs: 'nextdotjs',
  next: 'nextdotjs',
  socketio: 'socketdotio',
  'socket.io': 'socketdotio',
  postgres: 'postgresql',
  reactquery: 'reactquery',
  tanstackquery: 'reactquery',
  s3: 'amazons3',
  aws: 'amazonwebservices',
  rn: 'react',
  reactnative: 'react',
  nestjs: 'nestjs',
  tailwind: 'tailwindcss',
  tailwindcss: 'tailwindcss',
  radix: 'radixui',
  radixui: 'radixui',
};

export function resolveSimpleIcon(name: string): IconRecord | null {
  const key = normalize(name);
  // Try alias first, then the raw normalized name.
  const aliased = NAME_ALIASES[key];
  if (aliased && ICON_BY_TITLE[aliased]) return ICON_BY_TITLE[aliased];
  if (ICON_BY_TITLE[key]) return ICON_BY_TITLE[key];
  // Loose contains-match as a last resort (e.g. "expo router" → "expo").
  for (const [title, icon] of Object.entries(ICON_BY_TITLE)) {
    if (key.length >= 3 && (key.includes(title) || title.includes(key))) return icon;
  }
  return null;
}

// Attach the resolved icon (or null — client falls back to a role-based glyph) to each
// stack item, by name, without mutating the input array.
export function withResolvedIcons<T extends { name: string }>(
  stack: T[],
): (T & { iconSvg: IconRecord | null })[] {
  return stack.map((item) => ({ ...item, iconSvg: resolveSimpleIcon(item.name) }));
}
