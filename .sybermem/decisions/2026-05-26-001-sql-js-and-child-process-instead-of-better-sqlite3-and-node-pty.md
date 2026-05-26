---
type: decision
date: 2026-05-26
number: 001
title: sql-js-and-child-process-instead-of-better-sqlite3-and-node-pty
status: accepted
author: opencode
related_files: package.json, src/storage/connection.ts, src/runtime/pty.ts
---

## Context

The initial design specified `better-sqlite3` for local SQLite storage and `node-pty` for pseudo-terminal passthrough. Both are well-established, high-performance libraries. However, both require native C++ compilation (node-gyp).

On the development machine (Windows 10, Node.js v24.14.1), neither library compiled successfully:
- `better-sqlite3`: prebuild-install found no prebuilt binaries for Node 24, and node-gyp failed due to missing Visual Studio Build Tools (VCINSTALLDIR not set, VS 2017 not supported beyond Node 21)
- `node-pty`: same compilation issue

Installing Visual Studio with "Desktop development with C++" workload was considered but rejected to keep the project accessible to anyone without heavy toolchain setup.

## Decision

Replace both native-compilation dependencies with pure-JavaScript alternatives:

| Original | Replacement |
|----------|-------------|
| `better-sqlite3` (native C++) | `sql.js` (WASM-based SQLite, compiled from C to WebAssembly, runs in Node without native deps) |
| `node-pty` (native C++) | `child_process.spawn` (Node.js built-in, cross-platform PTY alternative) |

### sql.js tradeoffs

- **Pros**: Zero native dependencies, works instantly on any platform, SQLite-compatible API
- **Cons**: WASM loading adds ~50ms cold start (acceptable), database is loaded entirely in memory and must be exported to disk explicitly (adds `saveDatabase()` call pattern), async initialization (`initSqlJs()`) requires `await` at connection time

### child_process.spawn tradeoffs

- **Pros**: Built into Node.js, no dependencies, cross-platform
- **Cons**: Not a true PTY — ANSI escape codes and raw terminal control sequences may not pass through perfectly. On Windows, `shell: true` is required for command resolution. Interactive TUI tools (like Claude Code) may experience degraded display compared to node-pty.

## Rationale

- **Zero install friction**: Users can `npm install` and use immediately, no build tools required
- **Cross-platform by default**: WASM and child_process are available on all platforms
- **MVP pragmatism**: Phase 1-3 need basic stdin/stdout passthrough, not full PTY emulation. Node-pty can be revisited if TUI rendering quality becomes a blocker
- **Package weight**: Reduced from 6 dependencies (including native build tools) to 5 pure-JS dependencies

## Consequences

### Positive
- Works on any machine with Node.js 22+ without extra setup
- Cleaner CI/CD — no native compilation step
- Smaller attack surface (fewer native dependencies)
- `sql.js` is actively maintained by the SQLite team

### Negative
- `child_process.spawn` may not perfectly handle Claude Code's TUI rendering (ANSI cursor movement, colors, progress bars)
- Database I/O requires explicit save/load with `db.export()` / `new Database(buffer)`, cannot use WAL mode
- Session event streaming writes are in-memory until explicit save — risk of data loss on unexpected crash
- No `better-sqlite3` synchronous API convenience — all sql.js calls require `await initSqlJs()`

## Alternatives Considered

1. **Install Visual Studio Build Tools** — Rejected: adds ~4 GB install, requires admin privileges, creates setup friction for contributors
2. **Use Docker/WSL for development** — Rejected: defeats "local-first, no setup" philosophy
3. **Use `bun:sqlite` instead** — Rejected: Bun runtime lock-in, Node.js ecosystem target
4. **Use JSON files instead of SQLite** — Rejected: loses SQL query capability, foreign keys, indexing, ACID

## Notes

- If `child_process.spawn` TUI quality proves insufficient, Phase 4+ can add optional `node-pty` support with graceful fallback
- `sql.js` memory model requires explicit `saveDatabase()` calls after writes — this is enforced in all store modules via the `saveDbs()` callback pattern
- Future consideration: `libsql` (Turso's fork of SQLite) has a WASM build that may supersede sql.js
