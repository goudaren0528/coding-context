---
type: change
date: 2026-05-27
number: 011
title: openai-compatible-llm-support
status: implemented
author: opencode
related_files: src/config.ts, src/types.ts, src/project/init.ts, src/llm/client.ts, src/llm/compress.ts, src/llm/titler.ts, src/memory/ask.ts, src/runtime/session.ts, src/commands/shared.ts, src/commands/ask.ts, README.md, docs/design.md, package.json, package-lock.json, tests/config.test.ts, tests/llm/client.test.ts, tests/commands/ask.test.ts
---

## Change Content

Replaced the Anthropic-only LLM integration with a single OpenAI-compatible request path driven by `CTX_MODEL`, `CTX_BASE_URL`, and `CTX_API_KEY`.

This pass included:
- added resolved LLM configuration with environment defaults and per-project `.ctx/config.json` overrides for non-secret fields
- changed new project config initialization to store `model: null` and `baseUrl: null` instead of a Claude-specific default
- replaced the Anthropic SDK client with a `fetch`-based OpenAI-compatible chat completions client
- threaded project config through `ask`, titling, and compression so project-level LLM overrides actually apply at runtime
- updated `ctx ask` fallback messaging and README setup docs to describe OpenAI-compatible configuration
- added focused tests for config resolution, the LLM client, and the `ctx ask` fallback message

## Reason for Change

The project had a narrow LLM integration point but was locked to Anthropic assumptions in configuration, client code, defaults, and user-facing documentation. The new project direction is to support generic OpenAI-compatible endpoints, including self-hosted or third-party services that only require a base URL, API key, and model name.

This change keeps the existing memory features intact while removing a provider-specific dependency that no longer matches the intended deployment model.

## Impact Scope

- `ctx ask`, session titling, and workspace-state compression now share one OpenAI-compatible LLM path
- project-level `.ctx/config.json` can override `enabled`, `model`, and `baseUrl`, while API keys remain environment-only
- the repository no longer depends on `@anthropic-ai/sdk`
- setup and runtime error messages now point users to `CTX_MODEL`, `CTX_BASE_URL`, and `CTX_API_KEY`

## Implementation

- added `ResolvedLlmConfig` and `resolveLlmConfig(...)` to centralize effective LLM settings
- updated `ProjectConfig.llm` to include nullable `model` and `baseUrl`
- rewrote `src/llm/client.ts` to call `POST <baseUrl>/chat/completions` with OpenAI-compatible payloads
- passed `projectConfig` through `SessionRunOptions`, `generateTitle(...)`, `compressSession(...)`, and `askQuestion(...)`
- removed the Anthropic dependency from `package.json` and refreshed `package-lock.json`
- updated `README.md` and `docs/design.md` to remove Anthropic-only setup guidance

## Test Verification

- `npm run build`
- `npm run typecheck`
- `npm test`
- `node dist/index.js --help`

All verification commands passed after the change.

## Notes

- API keys remain environment-only and are not stored in project config
- the client targets the common OpenAI-compatible chat-completions shape first rather than supporting every provider-specific variation
