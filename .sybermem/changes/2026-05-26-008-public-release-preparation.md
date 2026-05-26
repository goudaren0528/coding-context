---
type: change
date: 2026-05-26
number: 008
title: public-release-preparation
status: implemented
author: claude
related_files: src/commands/shared.ts, src/runtime/session.ts, tests/git/context.test.ts, tests/commands/shared.test.ts, vitest.config.ts, package.json, src/index.ts, src/commands/export.ts, README.md, LICENSE, .github/workflows/ci.yml
---

## Change Content

Prepared `ctx` for first public GitHub adoption and future npm publication without publishing it yet.

This pass included:
- fixed `CTX_CONTEXT` handoff so computed context now reaches spawned Claude/OpenCode child processes
- fixed the non-git test case by creating temp directories outside the repository tree
- scoped Vitest to the real `tests/` directory so local agent worktrees under `.claude/worktrees/` are not executed as part of the repository test suite
- added a focused command-level test covering `CTX_CONTEXT` forwarding behavior
- normalized public versioning and package metadata to `0.3.0`
- rewrote `README.md` for public GitHub users
- added `LICENSE`
- added GitHub CI and issue/PR templates
- ignored repo-local `.ctx/` state in git

## Reason for Change

The codebase already had a strong product shape, but the repository was not yet trustworthy for outside users. Public adoption required more than feature completeness: new users needed a clear README, passing checks, correct context handoff, and standard open-source repository scaffolding.

This change focused on making the project understandable, verifiable, and trialable by strangers on GitHub while keeping npm publication as a later step.

## Impact Scope

- runtime startup path now forwards `CTX_CONTEXT` into child process environment
- test suite is now scoped to repository tests and no longer picks up `.claude/worktrees/**`
- package metadata is npm-ready for later publication
- public repository experience now includes README, LICENSE, CI, and contribution templates
- local `.ctx/` state is protected from accidental commit

## Implementation

- threaded optional `env` through `SessionRunOptions` and into `spawnPty(...)`
- updated `startTool(...)` to pass `CTX_CONTEXT` only when L2-L4 blocks exist
- fixed `tests/git/context.test.ts` to use `os.tmpdir()`
- added `tests/commands/shared.test.ts` to verify `CTX_CONTEXT` forwarding
- added `vitest.config.ts` with explicit `tests/**/*.test.ts` include and `.claude/**` exclusion
- updated `package.json`, `src/index.ts`, and `src/commands/export.ts` to version `0.3.0`
- rewrote `README.md` around public setup and expectations
- added `.github/workflows/ci.yml`, issue templates, and PR template

## Test Verification

- `npm run build`
- `npm run typecheck`
- `npm test`
- `node dist/index.js --help`
- `npm pack --dry-run`

All verification commands passed after the change.

## Notes

- No npm publish was performed in this pass
- Repository metadata fields that depend on a final public remote URL were left conservative because no `origin` remote is configured in this repository yet
- The adapter abstraction remains in place but was not refactored; this pass only fixed the existing runtime env handoff
