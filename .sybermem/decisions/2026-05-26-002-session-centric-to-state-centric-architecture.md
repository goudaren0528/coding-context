---
type: decision
date: 2026-05-26
number: 002
title: session-centric-to-state-centric-architecture
status: accepted
author: opencode
related_files: src/types.ts, src/storage/state-store.ts, src/llm/compress.ts, src/memory/injector.ts, src/commands/resume.ts, docs/design.md
---

## Context

The initial product concept (v0.1) treated AI coding sessions as the primary unit of memory — each session was recorded, summarized, and stored independently. The user would access a timeline of past sessions.

However, user feedback and design review identified a fundamental flaw: the product was answering "what did I say yesterday?" when what the user actually needs is "where am I right now?"

10 consecutive sessions on "Stripe webhook retry architecture" produce 10 summaries that overlap heavily and don't converge. The user doesn't want to browse history. They want the current state.

## Decision

Redesign the entire memory architecture from session-centric to state-centric.

### Core change

Sessions are no longer the primary unit of memory. Instead, a single `workspace_state` row per project serves as the **single source of truth** for "where am I right now."

Each session end triggers an LLM-powered **compressor** (not summarizer) that merges the session's findings into the existing state:
- Resolved problems are removed from `activeProblems`
- New decisions replace conflicting old ones in `recentDecisions`
- Git-changed files affect `importantFiles`
- Unchanged state fields are preserved

### Three-tier memory model

```
Workspace State  ← volatile, updated every session
Project Brain    ← slowly evolving, compiled from multiple state snapshots
Developer Memory ← cross-project, in ~/.ctx/
```

### L1–L4 layered prompt injection

To avoid token bloat and attention dilution:
- L1: Terminal header (visible only, ~1 line)
- L2: Project state block (injected on startup, ~200 tokens)
- L3: Project brain block (long-term knowledge, optional)
- L4: Developer preferences block (cross-project, optional)

## Rationale

- **"Where am I?" > "What did I say?"**: The correct UX is immediate context recovery, not timeline browsing
- **Compression, not summarization**: 10 sessions should produce 1 evolving state, not 10 independent summaries
- **Token efficiency**: The L1 header is always < 100 chars. The L2 block is < 200 tokens. This never grows over time
- **Extensible**: Project brain and developer memory layers can be toggled on/off without affecting the core state layer

## Alternatives Considered

1. **Session timeline with search** — Rejected: requires semantic search, vector DB, complex retrieval infrastructure
2. **Full context window injection** — Rejected: token limits and attention dilution make this unsustainable
3. **Hybrid: state + timeline** — Partially adopted: sessions are stored but as secondary data. State is primary

## Consequences

- Workspace state is a single row per project — concurrent sessions could cause write conflicts (handled by sequential session model)
- Compressor prompt design is critical — must be carefully tuned to correctly merge rather than overwrite
- Loss of full conversation history for debugging — mitigated by session_events retention (14-day TTL)

## Notes

- Design finalized in docs/design.md v0.2.0, further refined in v0.3.0
- Compressor prompt template lives in src/llm/compress.ts
- State compression is synchronous (blocks ~2s on session end) — acceptable for MVP, async deferred
