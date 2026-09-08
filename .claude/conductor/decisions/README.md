# Architectural Decision Records

This folder holds ADRs for this project. Each ADR captures a non-obvious
architecture or product choice that will outlive the task that produced it.

Use the ADR template at `.claude/conductor/adr.md` when adding a new ADR.

## Filename Format

`NNNN-<kebab-slug>.md` where `NNNN` is the highest existing number + 1.

## Created By

ADRs are usually created by the planner agent during `/caw-plan`,
or by the coder agent during a phase when it must choose between architecture
options. See `.claude/rules/common/harness-contract.md` for the trigger rules.
