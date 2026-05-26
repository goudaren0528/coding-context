import initSqlJs from "sql.js";
import { describe, it, expect, beforeAll } from "vitest";
import { migrateProjectDb } from "../../src/storage/migrate.js";
import {
  createSession,
  completeSession,
  getSession,
  getLatestSessions,
  insertEvent,
  getSessionEvents,
  countProjectSessions,
} from "../../src/storage/session-store.js";

let db: ReturnType<typeof initSqlJs> extends Promise<infer T> ? T : never;

beforeAll(async () => {
  const SQL = await initSqlJs();
  db = new SQL.Database();
  migrateProjectDb(db);
});

describe("session-store", () => {
  it("creates a session with active status", () => {
    const session = createSession(db, {
      projectId: "proj_1",
      tool: "claude",
      cwd: "/projects/test",
      gitBranch: "main",
      gitCommit: "abc123",
    });

    expect(session.id).toBeDefined();
    expect(session.projectId).toBe("proj_1");
    expect(session.tool).toBe("claude");
    expect(session.status).toBe("active");
    expect(session.gitBranch).toBe("main");
    expect(session.gitCommit).toBe("abc123");
  });

  it("completes a session with title", () => {
    const session = createSession(db, {
      projectId: "proj_1",
      tool: "opencode",
      cwd: "/projects/test",
      gitBranch: null,
      gitCommit: null,
    });

    completeSession(db, session.id, "Stripe retry architecture");

    const retrieved = getSession(db, session.id);
    expect(retrieved).not.toBeNull();
    expect(retrieved!.status).toBe("completed");
    expect(retrieved!.title).toBe("Stripe retry architecture");
    expect(retrieved!.endTime).toBeDefined();
  });

  it("returns null for nonexistent session", () => {
    expect(getSession(db, "nonexistent")).toBeNull();
  });

  it("returns latest sessions ordered by start_time desc", () => {
    for (let i = 0; i < 3; i++) {
      createSession(db, {
        projectId: "proj_1",
        tool: "claude",
        cwd: "/projects/test",
        gitBranch: null,
        gitCommit: null,
      });
    }

    const sessions = getLatestSessions(db, "proj_1", 2);
    expect(sessions.length).toBe(2);
  });

  it("inserts and retrieves events", () => {
    const session = createSession(db, {
      projectId: "proj_2",
      tool: "claude",
      cwd: "/projects/test",
      gitBranch: null,
      gitCommit: null,
    });

    insertEvent(db, session.id, "stdin", "hello");
    insertEvent(db, session.id, "stdout", "world");

    const events = getSessionEvents(db, session.id);
    expect(events.length).toBe(2);
    expect(events[0].source).toBe("stdin");
    expect(events[1].source).toBe("stdout");
  });

  it("counts project sessions", () => {
    const count = countProjectSessions(db, "proj_1");
    expect(count).toBeGreaterThanOrEqual(4);
  });
});
