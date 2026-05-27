---
type: change
date: 2026-05-27
number: 012
title: llm-doctor-diagnostics
status: implemented
author: opencode
related_files: src/commands/doctor.ts, src/index.ts, src/llm/doctor.ts, README.md, tests/commands/doctor.test.ts
---

## Change Content

Added `ctx doctor llm` so users can verify active LLM configuration before starting AI-assisted sessions.

This pass included:
- added an LLM diagnostics report that checks whether LLM features are enabled and whether `model`, `baseUrl`, and `apiKey` are present
- extended `ctx doctor all` to include the new LLM report
- updated CLI help text and README command/config guidance to mention the new diagnostic command
- added focused command tests covering `doctor llm` and `doctor all`

## Reason for Change

After moving `ctx` to OpenAI-compatible configuration, users needed a fast way to confirm setup on another computer without trial-and-error inside `ctx ask` or a full coding session. A dedicated doctor check gives immediate feedback on what is missing.

## Impact Scope

- `ctx doctor llm` now reports missing `CTX_MODEL`, `CTX_BASE_URL`, or `CTX_API_KEY`
- `ctx doctor all` now covers privacy, LLM, and state guidance together
- README now documents the recommended configuration self-check workflow

## Implementation

- added `runLlmCheck(...)` in `src/llm/doctor.ts`
- updated `src/commands/doctor.ts` and `src/index.ts` for the new subject and help text
- added `tests/commands/doctor.test.ts`
- updated `README.md` command and configuration sections

## Test Verification

- `npm run build`
- `npm run typecheck`
- `npm test`
- `node dist/index.js doctor llm`
- `node dist/index.js --help`

All verification commands passed after the change.

## Notes

- project-level config can satisfy `model` and `baseUrl`, but API keys remain environment-only
