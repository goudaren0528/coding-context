---
type: change
date: 2026-05-26
number: 001
title: phase2-memory-candidates-cross-project-patterns
status: implemented
author: opencode
related_files: src/memory/candidates.ts, src/storage/decay.ts, src/storage/migrate.ts, src/runtime/session.ts, src/commands/shared.ts, src/commands/memory.ts, src/commands/update.ts, src/memory/filter.ts, src/types.ts
---

## Change Content

Implemented Phase 2 of the ctx AI Workspace Runtime, adding memory candidates with approve/reject workflow, cross-project pattern detection, workspace state versioning, enhanced preference filtering, and decision decay.

New modules:
- `src/memory/candidates.ts` — Candidate generator with threshold-based auto-approval (≥3 projects → auto-active), approve/reject/forget operations
- `src/storage/decay.ts` — Decision decay: importance_score halving after 30 days, archiving when score ≤ 0.1, TTL-based event cleanup

Enhanced modules:
- `src/storage/migrate.ts` — Added `workspace_state_versions` and `memory_candidates` tables
- `src/runtime/session.ts` — Wire candidate generation into session finalization (entities + decisions → candidates), record state version on each compression
- `src/commands/memory.ts` — Added `approve`, `reject`, `forget` subcommands, display pending candidates with IDs
- `src/commands/update.ts` — Cross-project pattern detection: entities appearing in ≥2 projects → patterns + candidates
- `src/memory/filter.ts` — Enhanced filtering by language, projectType, and tool
- `src/types.ts` — Added MemoryCandidate interface

## Reason for Change

Phase 1 provided raw recording and basic preferences but lacked the feedback loop needed for inferred memory. Users need to approve or reject system-inferred candidates. Cross-project patterns needed to be detected automatically as evidence accumulates. Workspace state versions needed to be preserved for future rollback capability.

## Impact Scope

- All existing commands continue to work with no breaking changes
- `ctx memory` now shows pending candidates with resolution instructions
- `ctx update` now detects cross-project patterns and generates candidates
- Session finalization now generates memory candidates automatically
- New `memory_candidates` and `workspace_state_versions` tables added to DB schemas

## Implementation

- 2 new source files, 6 modified source files
- 30 total source files after Phase 2
- Candidate auto-promotion: evidence_count ≥ 3 → approved → inferred preference created
- Preference filtering: three-level (language/projectType/tool) with fallback
- Cross-project: scan all project_entities across registered projects, detect ≥2 occurrence patterns

## Test Verification

- TypeScript compilation passes cleanly (`tsc --noEmit`)
- `ctx memory` displays preferences and pending candidates
- `ctx memory add` creates explicit preferences
- `ctx update` scans registered projects for entities and patterns
- `node dist/index.js --help` shows all commands

## Notes

- Decision decay and event TTL cleanup are implemented but not triggered automatically yet (will be part of `ctx doctor` in Phase 3)
- Candidate auto-approval threshold (≥3 projects) is a sensible default but should be configurable in future
- Cross-project pattern detection currently string-matches entity names; semantic matching deferred to LLM-based Phase 4
