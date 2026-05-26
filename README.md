# ctx

Local-first CLI runtime that adds persistent project memory to Claude Code and OpenCode.

`ctx` helps AI coding sessions start with project context instead of from zero. It keeps repo-local workspace state, a longer-lived project brain, and cross-project developer preferences on your machine.

## Status

`ctx` is an early public release. The core workflow works locally, but the project is still evolving and has not been broadly battle-tested across many environments yet.

## Who this is for

- Developers who use Claude Code or OpenCode repeatedly across multiple repositories
- People who want local-first project memory instead of a hosted memory service
- Teams exploring faster session recovery and less repeated project explanation

## Why it exists

Without a runtime layer, each new AI coding session has to reconstruct project context again. `ctx` aims to reduce that repeated setup by persisting:

- **Workspace state** — what you are doing right now in this repo
- **Project brain** — longer-lived knowledge about the repo
- **Developer memory** — cross-project preferences stored in your home directory

## Prerequisites

- Node.js 22+
- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) or [OpenCode](https://github.com/sst/opencode) installed and available on your `PATH`
- `ANTHROPIC_API_KEY` if you want LLM-backed features such as title generation, compression, and `ctx ask`

Example:

```bash
export ANTHROPIC_API_KEY=sk-ant-...
```

## Install locally

`ctx` is prepared for future npm publishing, but this repository is not publishing a package yet. For now, install from source:

```bash
git clone https://github.com/goudaren0528/coding-context.git
cd coding-context
npm install
npm run build
npm link
```

Verify the CLI:

```bash
ctx --help
```

## Quick start

From any project you want to work on:

```bash
cd /path/to/your/project
ctx claude
# or
ctx opencode
```

On first run, `ctx` will initialize repo-local state under `<repo>/.ctx/` and register the project in `~/.ctx/`.

## Commands

| Command | Description |
| --- | --- |
| `ctx claude` | Start Claude Code with project context |
| `ctx opencode` | Start OpenCode with project context |
| `ctx resume` | View the current workspace state |
| `ctx memory` | View stored developer preferences |
| `ctx memory add "..."` | Add a preference manually |
| `ctx memory approve <id>` | Approve an inferred candidate |
| `ctx memory reject <id>` | Reject an inferred candidate |
| `ctx memory forget <id>` | Archive a candidate |
| `ctx update` | Sync cross-project memory |
| `ctx doctor privacy` | Run privacy diagnostics |
| `ctx state edit <field> <value>` | Correct workspace state manually |
| `ctx export [file]` | Export sanitized developer memory |
| `ctx import <file>` | Import developer memory |
| `ctx restore` | Restore branch and working context hints |
| `ctx ask <question>` | Ask a natural-language question about project memory |

## How it works

### Memory layers

```text
Workspace State     Where am I right now?
Project Brain       What is this repository?
Developer Memory    How does this developer usually work?
```

### Session flow

1. `ctx claude` or `ctx opencode` resolves the project root and initializes local state if needed
2. `ctx` loads workspace state, project brain, and relevant developer preferences
3. Context is passed into the child CLI process
4. Session input/output is captured with redaction before storage
5. If LLM features are enabled, session findings are compressed back into workspace state

## Storage and privacy

`ctx` is local-first by default.

```text
~/.ctx/              cross-project developer memory
  db.sqlite
  projects.json

<repo>/.ctx/         repo-local project memory
  db.sqlite
  config.json
```

Privacy notes:

- `~/.ctx/` is user-local and should not be committed
- `<repo>/.ctx/` is meant to stay local and is ignored by this repo
- session data is redacted before storage for common secrets such as tokens and keys
- `ctx doctor privacy` helps audit privacy-related behavior
- `ctx export` produces a sanitized export for sharing or migration

## Configuration

| Environment variable | Default | Description |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | — | Enables LLM-backed features |
| `CTX_MODEL` | `claude-sonnet-4-20250514` | Model used for extraction/compression |
| `CTX_EVENT_TTL_DAYS` | `14` | Retention for raw session events |
| `CTX_L2_SESSION_THRESHOLD` | `10` | Threshold for L2 state detail |
| `CTX_L2_DAY_THRESHOLD` | `7` | Threshold for L2 recency detail |

Per-project config lives at `<repo>/.ctx/config.json`.

## Current limitations

- This is still an early release and should be treated as evolving tooling
- Claude Code / OpenCode integration depends on those CLIs being installed correctly on your machine
- The runtime uses `child_process.spawn`, so terminal behavior should not be described as full PTY emulation
- Some advanced release packaging metadata is prepared, but npm publication has not happened yet

## Development

```bash
npm install
npm run build
npm run typecheck
npm test
node dist/index.js --help
```

## Road to npm

This repository is being prepared so it can be published to npm later, but this release does not publish a package yet.

## Repository

- Source: https://github.com/goudaren0528/coding-context
- Issues: https://github.com/goudaren0528/coding-context/issues

## License

MIT
