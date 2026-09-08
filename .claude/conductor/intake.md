# Feature Intake

Date: YYYY-MM-DD
Requested by: human prompt

## 1. Restate the Request

One sentence summary of what the human asked for.

## 2. Input Type

Pick one:

- [ ] Spec slice — implementing selected behavior from accepted product
- [ ] Change request — bounded behavior change, bug fix, or refinement
- [ ] New initiative — larger product area needing multiple Tasks
- [ ] Maintenance request — dependency, performance, security, ops work
- [ ] Harness improvement — process, template, or agent rule change

## 3. Risk Checklist

Mark each flag that applies:

| Flag                                                                     | Applies | Note |
| ------------------------------------------------------------------------ | ------- | ---- |
| Auth (login, session, JWT, password, refresh token)                      | [ ]     |      |
| Authorization (roles, permissions, tenancy)                              | [ ]     |      |
| Data model (schema, migrations, uniqueness, deletion)                    | [ ]     |      |
| Audit/security (audit logs, privacy, sensitive data)                     | [ ]     |      |
| External systems (email, payments, providers, queues, webhooks)          | [ ]     |      |
| Public contracts (API shape, response envelope, client-visible behavior) | [ ]     |      |
| Cross-platform (browser/mobile/desktop split, deep links)                | [ ]     |      |
| Existing behavior (already implemented or test-covered area changes)     | [ ]     |      |
| Weak proof (unclear or missing tests around the affected area)           | [ ]     |      |
| Multi-domain (more than one product domain changes at once)              | [ ]     |      |

## 4. Hard Gates

Hard gates auto-promote to risky lane unless human explicitly narrows scope:

- [ ] Auth
- [ ] Authorization
- [ ] Data loss or migration
- [ ] Audit/security
- [ ] External provider behavior
- [ ] Removing or weakening validation requirements

## 5. Lane

Lane is decided by the planner from blast radius — `agents/planner.md` § Lane. The risk checklist and hard gates above are its input: any hard gate ⇒ `risky`; otherwise the planner classifies. Record the planner's lane here once set.

## 6. Task Plan

- Task ID to create: `task-NNN-<slug>`
- Affected docs: [list]
- Validation expected: unit | integration | e2e
- ADR needed: yes | no — [reason]

## 7. Human Confirmation

- [ ] Human confirmed lane (only required if the planner classified it as `risky` or scope is ambiguous)
