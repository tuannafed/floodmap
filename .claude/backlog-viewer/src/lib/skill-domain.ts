// Skill → domain classification.
//
// Hub-curated skills (Vercel, Prisma, Expo, …) do NOT declare a `domain` in
// their frontmatter — only `author` / `version`. So we infer the domain from
// the skill's explicit `domain`/`category` metadata when present, otherwise
// from keywords matched primarily against the skill's *name* (which is clean
// and structured), falling back to its description.

export interface DomainStyle {
  key: string;
  label: string;
  /** solid accent color — used directly for charts/bars, and as badge
   *  text + (alpha-blended) badge background so the badge adapts to the
   *  card it sits on instead of a hardcoded dark chip that only worked in
   *  dark mode (see laneColor/stageColor in lib/status.ts for the same
   *  pattern already used by task badges). */
  color: string;
}

export const DOMAINS: Record<string, DomainStyle> = {
  engineering: { key: 'engineering', label: 'Engineering', color: '#60a5fa' },
  quality: { key: 'quality', label: 'Quality', color: '#4ade80' },
  product: { key: 'product', label: 'Product', color: '#fb923c' },
  workflow: { key: 'workflow', label: 'Workflow', color: '#c084fc' },
  security: { key: 'security', label: 'Security', color: '#f87171' },
  devops: { key: 'devops', label: 'DevOps', color: '#38bdf8' },
};

export const ALL_DOMAINS = Object.keys(DOMAINS);

// Substring → domain, matched against the skill's *name*. Order matters: the
// first rule whose substring appears in the name wins, so put the most
// specific / least ambiguous substrings first.
const NAME_RULES: [string, string][] = [
  // Security — auth skills
  ['auth0', 'security'],
  ['authjs', 'security'],

  // Product — discovery, specs, roadmaps, stories
  ['prd', 'product'],
  ['user-story', 'product'],
  ['roadmap', 'product'],
  ['prioritization', 'product'],
  ['business-analyst', 'product'],
  ['specification', 'product'],

  // Quality — testing, review, perf, debugging, a11y
  ['accessibility', 'quality'],
  ['testing', 'quality'],
  ['code-review', 'quality'],
  ['performance', 'quality'],
  ['debugging', 'quality'],
  ['validate-skills', 'quality'],

  // DevOps — deploy, CI, edge platform
  ['deployment', 'devops'],
  ['github-actions', 'devops'],
  ['wrangler', 'devops'],
  ['workers', 'devops'],
  ['durable-object', 'devops'],
  ['cloudflare', 'devops'],
  ['turborepo', 'devops'],
  ['eas-update', 'devops'],

  // Workflow — meta / process skills
  ['find-skills', 'workflow'],
  ['refactor', 'workflow'],
  ['github', 'workflow'],

  // Engineering — frameworks, libraries, languages, data
  ['react', 'engineering'],
  ['next', 'engineering'],
  ['vercel', 'engineering'],
  ['expo', 'engineering'],
  ['native', 'engineering'],
  ['prisma', 'engineering'],
  ['postgres', 'engineering'],
  ['redis', 'engineering'],
  ['stripe', 'engineering'],
  ['supabase', 'engineering'],
  ['shadcn', 'engineering'],
  ['tailwind', 'engineering'],
  ['tanstack', 'engineering'],
  ['typescript', 'engineering'],
  ['javascript', 'engineering'],
  ['nestjs', 'engineering'],
  ['websocket', 'engineering'],
  ['agents-sdk', 'engineering'],
  ['ui', 'engineering'],
];

// Description fallback — only consulted when the name matches nothing.
const DESC_RULES: [string, string][] = [
  ['authentication', 'security'],
  ['security', 'security'],
  ['test', 'quality'],
  ['accessibilit', 'quality'],
  ['code review', 'quality'],
  ['performance', 'quality'],
  ['debug', 'quality'],
  ['deploy', 'devops'],
  ['ci/cd', 'devops'],
  ['prd', 'product'],
  ['requirement', 'product'],
  ['roadmap', 'product'],
  ['user stor', 'product'],
];

/**
 * Resolve a skill's domain. Priority:
 *   1. explicit `domain` / `category` metadata field
 *   2. substring match on the skill name
 *   3. substring match on the description
 *   4. fallback → 'engineering'
 */
export function inferDomain(skill: {
  name?: string;
  description?: string;
  metadata?: Record<string, string>;
}): DomainStyle {
  const meta = skill.metadata ?? {};

  // 1. explicit metadata
  const explicit = (meta.domain || meta.category || '').toLowerCase().trim();
  if (explicit) {
    for (const key of ALL_DOMAINS) {
      if (explicit.includes(key)) return DOMAINS[key];
    }
  }

  // 2. name match
  const name = (skill.name ?? '').toLowerCase();
  for (const [needle, domain] of NAME_RULES) {
    if (name.includes(needle)) return DOMAINS[domain];
  }

  // 3. description match
  const desc = (skill.description ?? '').toLowerCase();
  for (const [needle, domain] of DESC_RULES) {
    if (desc.includes(needle)) return DOMAINS[domain];
  }

  // 4. fallback
  return DOMAINS.engineering;
}
