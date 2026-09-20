---
paths:
  - "**/*.ts"
  - "**/*.tsx"
  - "**/*.js"
  - "**/*.jsx"
  - "**/*.py"
  - "**/*.go"
  - "**/*.rs"
  - "**/*.java"
  - "**/*.rb"
  - "**/*.php"
---
# Rule: Coding Standards (language-agnostic)

**Layer:** rules — non-negotiable project-wide conventions.
**Loaded:** lazily by Claude Code when a code file is touched — `caw init` copies
this file to the project's `.claude/rules/`, and the `paths:` frontmatter above
drives the conditional load (native to Claude Code at `.claude/rules/`).
**Scope:** universal rules that apply in any language. TS/JS-specific style
(types, `any`, React props) lives in [`typescript/coding-style.md`](../typescript/coding-style.md)
which loads on `.ts`/`.tsx`/`.js`/`.jsx`.
**Note:** These are *rules*, not patterns. They cannot be overridden by `conventions.md` or `.claude/rules/project.md`.

---

## Immutability

ALWAYS create new objects — NEVER mutate existing ones.

```typescript
// ❌ WRONG — mutates in place
function addRole(user: User, role: string) {
  user.roles.push(role);   // mutates original
  return user;
}

// ✅ CORRECT — returns new copy
function addRole(user: User, role: string): User {
  return { ...user, roles: [...user.roles, role] };
}
```

**Why:** Mutable state causes hidden side effects, makes debugging harder, and breaks concurrent execution.

---

## File Size

| Guideline | Limit |
|---|---|
| Typical file | 200–400 lines |
| Maximum before extraction | 800 lines |
| Single function | 50 lines max |
| Nesting depth | 4 levels max |

When a file exceeds 600 lines, extract utilities before adding more code.

---

## Naming

Match your language's own casing convention, consistently within the file:

```
JS/TS/Java        : camelCase vars/functions, PascalCase classes/types
Python/Rust/Ruby  : snake_case vars/functions, PascalCase classes/types
Go                : camelCase unexported, PascalCase exported
Constants         : SCREAMING_SNAKE_CASE (all languages)
Boolean names     : isX/hasX/canX/shouldX (or snake_case equivalent)
```

Files: kebab-case (JS/TS), snake_case (Python/Rust/Ruby), else per ecosystem default.
No abbreviations except well-known ones: `id`, `url`, `dto`, `ctx`, `req`, `res`, `err`.

---

## Error Handling

```typescript
// ❌ WRONG — silent swallow: catch (_e) {}
// ❌ WRONG — bare re-throw with no context: catch (e) { throw e }

// ✅ CORRECT — wrap with context, let caller decide
try {
  await riskyOp();
} catch (cause) {
  throw new AppError('Failed to complete X during Y', { cause });
}
```

**Rule:** Every `catch` block must either:
1. Handle the error (recover or transform into a typed error), or
2. Re-throw with added context

Never `console.error`/`console.log` in library/service code — log at the boundary (controller/handler).

---

## Input Validation

Validate at system boundaries only — not inside service functions:

| Boundary | What to validate |
|---|---|
| HTTP controllers | DTOs via class-validator or Zod schema |
| Queue consumers | Incoming message payload |
| Cron jobs | External data fetched from APIs |
| CLI commands | User-supplied arguments |

Do NOT add validation inside service methods that are only called by validated controllers.

---

## No Hardcoded Values

```typescript
// ❌ WRONG
const token = jwt.sign(payload, 'my-secret-key', { expiresIn: '15m' });

// ✅ CORRECT
const token = jwt.sign(payload, config.jwt.secret, { expiresIn: config.jwt.accessTokenTtl });
```

All config comes from environment or the config service. No magic strings or numbers.

---

## Close the class, not the instance

When a fix touches a pattern with **≥ 2 call sites** — a logging convention (`err` key), a
comparison rule (case-folded column), an error primitive (401 with `code`), a duplicated UI
primitive across apps — fixing the sites you found is not the deliverable. The same task ships:

1. A **static gate** for the class at `.claude/static-gates/check<Class>.mjs`, wired into CI —
   see [`templates/static-gates/README.md`](../../templates/static-gates/README.md).
2. A **`pipeline-postmortems.md` entry** if the defect reached a deployed environment.

Hand-enumerating call sites under-counts. The gate is the count.

---

## Code Quality Checklist

Before completing any task:
- [ ] No mutations of existing objects
- [ ] No hardcoded secrets, URLs, or config values
- [ ] No silent catch blocks
- [ ] Files under 800 lines
- [ ] Functions under 50 lines
- [ ] Nesting depth ≤ 4 levels
- [ ] (TS/JS) the `typescript/coding-style.md` checklist — no `any`, typed public APIs
