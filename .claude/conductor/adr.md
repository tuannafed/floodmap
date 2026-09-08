# NNNN Decision Title

Date: YYYY-MM-DD
Task: task-NNN-slug (or "n/a" for cross-task decisions)

## Status

Proposed | Accepted | Superseded | Rejected

## Context

What problem, constraint, or ambiguity forced this decision? Reference the
specific task, story, or challenge that prompted it.

## Decision

What did we decide? State the chosen option in 1-3 sentences.

## Consumers

Optional — **mandatory whenever this ADR defers a cutover or leaves any
consumer on an old path.** List **every call site**, found by `git grep` on
the table/column/symbol across the whole repo (not only the callers of one
function). A comment at one call site is not a list. The reviewer diffs this
against a fresh grep.

consumers_cut_over:

- path/to/consumer.ts — moved to the new behaviour in task-NNN-slug

consumers_on_hold:

- path/to/other-consumer.ts — stays on the old path until <task / condition>; why

## Deploy Order

Optional — **mandatory whenever something must be live before something
else** (a migration before the code that reads the column, an index before
the query, a rebuild before the dropdown that lists its output). Mirror it on
the prerequisite phase's `blocks_deploy_of:` in `overview.yaml`
(`rules/common/migration-safety.md`).

deploy_order:

1. <migration / DB object / rebuilt artifact> — confirmed applied on <env> (evidence: <query + result>)
2. <code that depends on it>

## Alternatives Considered

1. Alternative — rejected because [reason].
2. Alternative — rejected because [reason].

## Consequences

Positive:

- Consequence.

Tradeoffs:

- Consequence.

## Follow-Up

- Item.
