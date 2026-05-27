---
type: bug
date: 2026-05-28
number: 001
title: ctx-opencode-hangs-without-real-terminal
status: fixed
severity: high
author: opencode
related_files: src/runtime/pty.ts, src/runtime/session.ts, README.md, tests/runtime/pty.test.ts
---

## Bug Description

`ctx opencode` could appear to hang or never fully start on a user machine even though running `opencode` directly worked.

## Root Cause

`ctx` launched child tools through `child_process.spawn(..., stdio: ["pipe", "pipe", "pipe"])`, which removed the child process from the real terminal. OpenCode is an interactive TUI and expects a real terminal/PTY.

Direct `opencode` execution inherited the terminal and started normally, but `ctx opencode` forced piped stdio and prevented the TUI from behaving correctly.

## Solution

Run `opencode` in direct terminal passthrough mode instead of piped mode.

This fix:
- keeps `claude` on the existing piped path
- runs `opencode` with inherited stdio so it can see the real terminal
- skips session I/O capture and post-session compression for those direct-terminal OpenCode sessions
- documents the limitation in `README.md`

## Verification

- `npm run build`
- `npm run typecheck`
- `npm test`
- `node dist/index.js opencode`

The smoke test now starts the OpenCode TUI instead of stalling after the `ctx` header.
