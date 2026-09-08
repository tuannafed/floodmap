---
paths:
  - "**/*.ts"
  - "**/*.tsx"
  - "**/*.js"
  - "**/*.jsx"
---
# Rule: TypeScript/JavaScript Coding Style

**Layer:** rules — non-negotiable, TS/JS-specific.
**Loaded:** lazily by Claude Code on `.ts`/`.tsx`/`.js`/`.jsx` touch — `caw init`
copies this file to the project's `.claude/rules/` (the `paths:` above drives it).
**Scope:** TS/JS-specific style only. Language-agnostic rules (immutability, error
handling, input validation, file size, naming, no-hardcoded-values) live in
[`../common/coding-standards.md`](../common/coding-standards.md) which also loads here.

---

## Types and Interfaces

### Public APIs

Add parameter and return types to exported functions and public class methods. Let TypeScript infer obvious local variable types.

```typescript
// WRONG
export function formatUser(user) {
  return `${user.firstName} ${user.lastName}`
}

// CORRECT
interface User { firstName: string; lastName: string }
export function formatUser(user: User): string {
  return `${user.firstName} ${user.lastName}`
}
```

### Interfaces vs Type Aliases

- Use `interface` for object shapes that may be extended or implemented
- Use `type` for unions, intersections, tuples, mapped types, utility types
- Prefer string literal unions over `enum`

```typescript
interface User { id: string; email: string }
type UserRole = 'admin' | 'member'
type UserWithRole = User & { role: UserRole }
```

### Avoid `any`

Use `unknown` for external/untrusted input, then narrow safely. Use generics when type depends on the caller.

```typescript
// WRONG
function getErrorMessage(error: any) { return error.message }

// CORRECT
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return 'Unexpected error'
}
```

### React Props

Define props with a named `interface` or `type`. Type callback props explicitly. Do not use `React.FC`.

```typescript
interface UserCardProps {
  user: User
  onSelect: (id: string) => void
}
function UserCard({ user, onSelect }: UserCardProps) {
  return <button onClick={() => onSelect(user.id)}>{user.email}</button>
}
```

## Idioms specific to TS/JS

The language-agnostic rules in `../common/coding-standards.md` (immutability, error
handling, input validation) apply here too — these are the TS/JS-specific ways to
satisfy them:

- **Immutable updates:** use the spread operator and `Readonly<T>` params.
- **Error narrowing:** `catch (error: unknown)` then narrow (`error instanceof Error`)
  before reading `.message`; re-throw with context.
- **Boundary validation:** prefer **Zod** schemas and infer the type with `z.infer`.

## Logging an Error with pino: the key MUST be `err`

```typescript
log.error({ error }, "Failed to sync");        // ❌ renders as `{}` — message/stack dropped
log.error({ err: error, id }, "Failed to sync"); // ✅ `err` triggers pino's Error serializer
```

pino runs its Error serializer **only** on the reserved key `err`. Under `error` / `e` /
`cause` / `exception` the Error is treated as a plain object, and because `message` and
`stack` are non-enumerable own properties the line renders as `{}` — proof something failed,
and nothing else. This is invisible to the type checker, to lint, and to the test suite, so
pair the rule with a **static grep gate in CI** (fail on `\{\s*error\s*[,}]` inside a
`log.<level>(` call). A green gate is still not proof of absence: it cannot see a payload
built into a variable before the log call.

## TypeScript checklist

- [ ] No `any` (use `unknown` + narrowing, or generics)
- [ ] Exported functions / public methods have explicit param + return types
- [ ] `interface` for object shapes, `type` for unions/intersections; string-literal unions over `enum`
- [ ] React props typed via named interface/type; no `React.FC`
- [ ] No `console.log` in production code
- [ ] Errors logged with pino use the `err` key, never `error`
