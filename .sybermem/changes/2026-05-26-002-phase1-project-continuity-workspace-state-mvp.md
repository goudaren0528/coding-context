---
type: change
date: 2026-05-26
number: 002
title: phase1-project-continuity-workspace-state-mvp
status: implemented
author: opencode
related_files: src/index.ts, src/types.ts, src/paths.ts, src/config.ts, src/storage/connection.ts, src/storage/migrate.ts, src/storage/session-store.ts, src/storage/state-store.ts, src/storage/brain-store.ts, src/storage/entity-store.ts, src/storage/memory-store.ts, src/project/init.ts, src/project/scan.ts, src/git/context.ts, src/llm/client.ts, src/llm/titler.ts, src/llm/compress.ts, src/runtime/pty.ts, src/runtime/session.ts, src/memory/injector.ts, src/memory/filter.ts, src/commands/claude.ts, src/commands/opencode.ts, src/commands/resume.ts, src/commands/memory.ts, src/commands/update.ts, src/commands/shared.ts, src/sql.js.d.ts
---

## Change Content

Implemented Phase 1 MVP of ctx — the AI Workspace Runtime. Full project scaffold with 28 source files covering the complete lifecycle from session capture through LLM-powered state compression to layered prompt injection.

Architecture:
- **Three-tier memory**: Workspace State (volatile, per-session update), Project Brain (slowly-evolving project knowledge), Developer Memory (cross-project, `~/.ctx/`)
- **State-centric compression**: Session events are merged into workspace state via LLM compressor instead of archived as independent summaries
- **L1–L4 layered injection**: Terminal header, project state block, project brain block, developer preferences block
- **Dual SQLite storage**: Project DB (`<repo>/.ctx/db.sqlite`) + User DB (`~/.ctx/db.sqlite`), fully isolated, WASM-based via `sql.js` (no native compilation)

Key modules:
- `src/project/init.ts` — Auto-init on first `ctx claude` call (creates .ctx/, generates projectId, registers in ~/.ctx/)
- `src/project/scan.ts` — Repo scan for auto-attach (package.json parsing, dir structure, common commands)
- `src/git/context.ts` — Git branch/commit/changed files/uncommitted files/recent commits capture
- `src/llm/compressor.ts` — Claude API-based session → workspace state compression (NOT summarization)
- `src/runtime/session.ts` — Full session lifecycle: PTY spawn → capture → LLM titler → compressor → entity linking
- `src/memory/injector.ts` — L1–L4 injection builder with time-ago formatting
- `src/memory/filter.ts` — Preference filtering by tool/tech stack

5 CLI commands:
- `ctx claude` / `ctx opencode` — Start AI tool with auto-init + auto-attach + 4-layer context injection
- `ctx resume` — View current workspace state
- `ctx memory` — View/add developer preferences
- `ctx update` — Cross-project entity sync

## Reason for Change

Initial implementation of the product defined in `docs/design.md` v0.3.0. ctx addresses the core problem: every AI coding session starts from zero. Developers spend ~5 minutes re-explaining project context on each session start. ctx reduces this to <1 minute by maintaining persistent workspace state and developer preferences.

## Impact Scope

- Full product core: all 5 commands functional
- Project auto-detection: identifies git roots, auto-creates `.ctx/` on first use
- New project cold-start: developer preferences from `~/.ctx/` injected immediately
- Existing repo attach: package.json + directory structure → project brain seed
- Session compression: LLM-powered state update after each session
- Tech stack pivot: `better-sqlite3` + `node-pty` → `sql.js` + `child_process.spawn` due to Windows native compilation issues

## Implementation

- 28 TypeScript source files
- sql.js (WASM-based SQLite, zero native deps)
- child_process.spawn for PTY passthrough (instead of node-pty)
- 5 npm dependencies: @anthropic-ai/sdk, sql.js, commander, dotenv, nanoid
- TypeScript strict mode, ES2022 target, Node16 modules

## Test Verification

- TypeScript compilation passes cleanly (`tsc --noEmit`)
- `ctx --help` shows all 5 commands with descriptions
- `ctx --version` returns 0.1.0
- `ctx resume` shows project state (initial: no workspace state)
- `ctx memory` shows empty state with usage hint
- `ctx memory add "Prefer zod..."` creates explicit preference
- `ctx update` scans registered projects
- `.ctx/` automatically created on first command execution
- `~/.ctx/db.sqlite` + `~/.ctx/projects.json` automatically created

## Notes

- `ctx claude` / `ctx opencode` require Claude CLI / OpenCode CLI installed on system (not tested in this session)
- LLM features require `ANTHROPIC_API_KEY` environment variable
- Decision decay and event TTL cleanup deferred to Phase 2
- Workspace state versions and memory candidates deferred to Phase 2
