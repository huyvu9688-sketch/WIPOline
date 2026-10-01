# AI Workflow Rules

## Approach

Build this project incrementally, feature by feature, driven
by direct user requests rather than a fixed backlog. The files
in `context/` capture what's been built and why so a new
session (or a new agent) can pick up without re-deriving it
from the diff — read `progress-tracker.md` first, then
`architecture.md`/`project-overview.md` as needed, before
making changes.

## Scoping Rules

- Work on one feature unit at a time
- Prefer small, verifiable increments over large
  speculative changes
- Do not combine unrelated system boundaries in a
  single implementation step

## When to Split Work

Split an implementation step if it combines:

- A UI/nav change and a data-correctness fix (e.g. adding the
  WIP nav item was one step; syncing on-hand quantities from
  `OH-LLOCN.xlsb` was a separate one)
- Changes to more than one of: item master, stock mutation
  logic, and track-log/reporting display
- Behavior not clearly defined in the context files (e.g.
  whether Output should ever become a true withdrawal-only log
  instead of doubling as production demand — flagged as an
  open question, not decided unilaterally)

If a change cannot be verified end to end quickly,
the scope is too broad — split it.

## Handling Missing Requirements

- Do not invent product behavior not defined in the
  context files
- If a requirement is ambiguous, resolve it in the
  relevant context file before implementing
- If a requirement is missing, add it as an open question
  in `progress-tracker.md` before continuing

## Protected Files

Do not modify the following unless explicitly instructed:

- `components/ui/*` — shadcn-generated primitives; regenerate
  via the shadcn CLI instead of hand-editing.
- Derived `app/*/data.json` files — regenerate via their
  `scripts/*.mjs` script instead of hand-editing values.
- `node_modules/`, including `node_modules/next/dist/docs/` —
  read-only reference for this Next.js version's breaking
  changes (see root `AGENTS.md`).

## Keeping Docs in Sync

Update the relevant context file whenever implementation
changes:

- System architecture or boundaries
- Storage model decisions
- Code conventions or standards
- Feature scope

## Before Moving to the Next Unit

1. The current unit works end to end within its defined scope
2. No invariant defined in `architecture.md` was violated
3. `progress-tracker.md` reflects the completed work
4. `npm run build` passes
