import type { Database as SqlJsDatabase } from "sql.js";
import type { Session, SessionEvent } from "../types.js";
import { nanoid } from "nanoid";

export function createSession(
  db: SqlJsDatabase,
  params: {
    projectId: string;
    tool: "claude" | "opencode";
    cwd: string;
    gitBranch: string | null;
    gitCommit: string | null;
  }
): Session {
  const id = nanoid();
  const now = new Date().toISOString();

  db.run(
    `INSERT INTO sessions (id, project_id, tool, start_time, cwd, title, summary, status, git_branch, git_commit)
     VALUES (?, ?, ?, ?, ?, NULL, NULL, 'active', ?, ?)`,
    [id, params.projectId, params.tool, now, params.cwd, params.gitBranch, params.gitCommit]
  );

  return {
    id,
    projectId: params.projectId,
    tool: params.tool,
    startTime: now,
    endTime: null,
    cwd: params.cwd,
    title: null,
    summary: null,
    status: "active",
    gitBranch: params.gitBranch,
    gitCommit: params.gitCommit,
  };
}

export function completeSession(
  db: SqlJsDatabase,
  sessionId: string,
  title: string | null
): void {
  const now = new Date().toISOString();
  db.run(
    `UPDATE sessions SET end_time = ?, title = ?, status = 'completed' WHERE id = ?`,
    [now, title, sessionId]
  );
}

export function getSession(db: SqlJsDatabase, sessionId: string): Session | null {
  const result = db.exec(`SELECT * FROM sessions WHERE id = ?`, [sessionId]);
  if (result.length === 0 || result[0].values.length === 0) return null;
  return rowToSession(result[0].values[0]);
}

export function getLatestSessions(db: SqlJsDatabase, projectId: string, limit: number = 5): Session[] {
  const result = db.exec(
    `SELECT * FROM sessions WHERE project_id = ? ORDER BY start_time DESC LIMIT ?`,
    [projectId, limit]
  );
  if (result.length === 0) return [];
  return result[0].values.map(v => rowToSession(v));
}

export function insertEvent(
  db: SqlJsDatabase,
  sessionId: string,
  source: "stdin" | "stdout",
  content: string
): SessionEvent {
  const id = nanoid();
  const now = new Date().toISOString();

  db.run(
    `INSERT INTO session_events (id, session_id, timestamp, source, content) VALUES (?, ?, ?, ?, ?)`,
    [id, sessionId, now, source, content]
  );

  return { id, sessionId, timestamp: now, source, content };
}

export function getSessionEvents(db: SqlJsDatabase, sessionId: string): SessionEvent[] {
  const result = db.exec(
    `SELECT * FROM session_events WHERE session_id = ? ORDER BY timestamp ASC`,
    [sessionId]
  );
  if (result.length === 0) return [];
  return result[0].values.map(v => ({
    id: String(v[0]),
    sessionId: String(v[1]),
    timestamp: String(v[2]),
    source: String(v[3]) as "stdin" | "stdout",
    content: String(v[4]),
  }));
}

export function countProjectSessions(db: SqlJsDatabase, projectId: string): number {
  const result = db.exec(
    `SELECT COUNT(*) FROM sessions WHERE project_id = ?`,
    [projectId]
  );
  if (result.length === 0) return 0;
  return Number(result[0].values[0][0]);
}

export function getLastSessionEndTime(db: SqlJsDatabase, projectId: string): string | null {
  const result = db.exec(
    `SELECT end_time FROM sessions WHERE project_id = ? AND status = 'completed' ORDER BY end_time DESC LIMIT 1`,
    [projectId]
  );
  if (result.length === 0 || result[0].values.length === 0) return null;
  return String(result[0].values[0][0]);
}

export function purgeOldEvents(db: SqlJsDatabase, olderThanDays: number): number {
  const result = db.exec(
    `DELETE FROM session_events WHERE timestamp < datetime('now', '-' || ? || ' days')`,
    [olderThanDays]
  );
  return db.getRowsModified();
}

function rowToSession(row: unknown[]): Session {
  return {
    id: String(row[0]),
    projectId: String(row[1]),
    tool: String(row[2]) as "claude" | "opencode",
    startTime: String(row[3]),
    endTime: row[4] ? String(row[4]) : null,
    cwd: String(row[5]),
    title: row[6] ? String(row[6]) : null,
    summary: row[7] ? String(row[7]) : null,
    status: String(row[8]) as "active" | "completed",
    gitBranch: row[9] ? String(row[9]) : null,
    gitCommit: row[10] ? String(row[10]) : null,
  };
}
