---
type: change
date: 2026-05-26
number: 003
title: phase3-privacy-reliability-correction
status: implemented
author: opencode
related_files: src/privacy/redactor.ts, src/privacy/exclude.ts, src/privacy/doctor.ts, src/commands/doctor.ts, src/commands/state-edit.ts, src/runtime/session.ts, src/index.ts
---

## Change Content

Implemented Phase 3: privacy, reliability, and correction capabilities.

New modules:
- `src/privacy/redactor.ts` — Secret redaction with 14 regex patterns (API keys, tokens, private keys, JWTs, OAuth tokens). Redacts on both event storage and LLM payloads.
- `src/privacy/exclude.ts` — File exclusion patterns (`.env`, `*.pem`, `*.key`, `secrets/**`, `node_modules/**`, etc.) with glob-style matching.
- `src/privacy/doctor.ts` — Privacy report generator: checks .gitignore for .ctx/ entry, DB file sizes, event retention TTL, exclusion patterns, user DB isolation.

New commands:
- `ctx doctor [privacy|state|all]` — Run privacy diagnostics with categorized issues/status output
- `ctx state edit <field> <value>` — Manually correct workspace state fields (currentFocus, activeProblems, nextActions, recentDecisions, importantFiles)

Wired into existing:
- `src/runtime/session.ts` — Session events are now redacted before storage and before LLM payloads. Both stdin and stdout streams pass through `redactSecrets()` before `insertEvent()`.

## Reason for Change

Phase 1-2 provided recording and structuring, but lacked safety guarantees. AI coding sessions capture terminal I/O which may contain API keys, tokens, and credentials. Without redaction, these would be stored in session_events and sent to LLM APIs for compression.

Additionally, users needed visibility into what ctx remembers and a way to correct incorrect state without waiting for the next session's compressor to overwrite it.

## Impact Scope

- All session events now redacted on capture (before storage and before LLM)
- 16 exclusion patterns applied to file capture
- `ctx doctor privacy` outputs clear issues (missing .gitignore entry) and status lines
- `ctx state edit` enables manual correction of all workspace state fields
- No breaking changes to any existing commands

## Implementation

- 3 new source files (privacy/), 2 new command files, 2 modified files
- 35 total source files after Phase 3
- 8 CLI commands: claude, opencode, resume, memory, update, doctor, state, help

## Test Verification

- TypeScript compilation passes cleanly (`tsc --noEmit`)
- `ctx --help` shows all 8 commands
- `ctx doctor privacy` detects missing .gitignore .ctx/ entry, reports DB sizes, retention, exclusions
- `ctx doctor` with no args defaults to `all`
- `ctx state edit currentFocus "test"` updates workspace state correctly
- `ctx state edit invalid` shows help message with valid fields

## Notes

- Redaction is applied on capture but NOT retroactively — existing session_events without redaction remain as-is
- `ctx state edit` overwrites the current workspace state; old version is recorded in workspace_state_versions (Phase 2) for potential rollback
- Exclusion patterns are currently hardcoded in `exclude.ts` — config file integration deferred to future iteration
