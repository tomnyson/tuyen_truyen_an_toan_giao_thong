# Project working agreement

This repository uses documentation-driven delivery. Every implementation change
must stay traceable to a user story and a technical specification.

## Required workflow

1. Read `docs/PRODUCT_REQUIREMENTS.md`, `docs/USER_STORIES.md`,
   `docs/TECHNICAL_SPEC.md`, and `docs/PROGRESS.md` before changing behavior.
2. Add or refine the relevant acceptance criteria before implementation when the
   requested behavior is not already specified.
3. Keep user-story IDs stable. New work receives a new `US-*` ID; existing IDs
   must not be reused for a different requirement.
4. Update `docs/PROGRESS.md` as implementation evidence becomes available.
5. Check an item with `[x]` only after its acceptance criterion is implemented
   and verified. A partial implementation remains unchecked and is recorded as
   `Partial`.
6. Evidence must point to a source file, test, migration, or verification
   command. A plan or claim is not completion evidence.
7. Record material architecture, API, data-model, security, or rollout decisions
   in `docs/TECHNICAL_SPEC.md` in the same change that introduces them.
8. Run checks proportionate to the change and record checks that could not run,
   including the reason.

## Review expectations

- Product review checks scope, user value, acceptance criteria, and status.
- Full-stack implementation keeps API, UI, database, documentation, and tests
  consistent.
- Code review prioritizes correctness, legal-source integrity, security,
  regressions, and missing tests.
- Legal citations shown to users must come from reviewed application data. AI
  output must not invent or silently alter a citation.

## Status vocabulary

- `Todo`: no implementation evidence.
- `In Progress`: actively being implemented.
- `Partial`: some acceptance criteria have evidence, but the story is incomplete.
- `Done`: every acceptance criterion is checked and has verification evidence.
- `Blocked`: progress requires an explicit external decision or dependency.

