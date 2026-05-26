---
type: change
date: 2026-05-26
number: 005
title: phase4-plus-ctx-ask-natural-language-retrieval
status: implemented
author: opencode
related_files: src/memory/ask.ts, src/commands/ask.ts, src/index.ts
---

## Change Content

Implemented `ctx ask` — natural language question answering over project memory using Claude API for semantic retrieval. No vector database required.

New modules:
- `src/memory/ask.ts` — Retriever that constructs a Claude prompt from workspace state, recent session summaries, and historical decisions, then answers the user's question
- `src/commands/ask.ts` — CLI command that gathers project context (workspace state, last 5 sessions, top 20 decisions by importance) and dispatches to the retriever

Usage:
- `ctx ask "how did we handle retry storms?"` — Searches project memory and returns a concise answer
- Graceful fallback when no memory exists ("No memory available. Start a session first.")
- Graceful fallback when ANTHROPIC_API_KEY is not set ("Could not retrieve an answer.")

## Reason for Change

Phase 1-4 provided storage, compression, and portability but no ad-hoc querying capability. Users who needed to find past decisions or understand historical context had to manually browse `ctx resume` or session records. `ctx ask` provides a natural language interface to their project memory.

## Impact Scope

- New files: 2 (`memory/ask.ts`, `commands/ask.ts`)
- Modified: 1 (`index.ts`)
- Total: 40 source files, 12 CLI commands
- Context window: workspace state + 5 recent sessions + 20 top decisions

## Implementation

- Retriever constructs a Claude prompt: system instructions + context blocks + question
- Context is assembled from workspace_state (current), sessions (recent), decisions (historical, sorted by importance_score)
- No vector DB, no embeddings — pure Claude semantic reasoning over structured context
- Token budget: ~2000 tokens for context, 1024 max output

## Test Verification

- TypeScript compilation passes cleanly (`tsc --noEmit`)
- `ctx --help` shows `ask` command
- `ctx ask what did we decide` correctly detects no memory available
- Works without ANTHROPIC_API_KEY (graceful fallback message)

## Notes

- This is a lightweight alternative to full vector-based semantic search
- Future iterations could add embeddings for true semantic retrieval at scale
- Response quality depends on the Claude model's ability to reason over structured context
