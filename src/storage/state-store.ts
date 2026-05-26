import type { Database as SqlJsDatabase } from "sql.js";
import type { WorkspaceState } from "../types.js";

export function getWorkspaceState(
  db: SqlJsDatabase,
  projectId: string
): WorkspaceState | null {
  const result = db.exec(
    `SELECT * FROM workspace_state WHERE project_id = ?`,
    [projectId]
  );
  if (result.length === 0 || result[0].values.length === 0) return null;
  return rowToState(result[0].values[0]);
}

export function upsertWorkspaceState(
  db: SqlJsDatabase,
  state: WorkspaceState
): void {
  const existing = getWorkspaceState(db, state.projectId);
  if (existing) {
    db.run(
      `UPDATE workspace_state SET
        current_focus = ?, active_problems = ?, next_actions = ?,
        recent_decisions = ?, important_files = ?,
        git_branch = ?, git_commit = ?, updated_at = ?
       WHERE project_id = ?`,
      [
        state.currentFocus,
        JSON.stringify(state.activeProblems),
        JSON.stringify(state.nextActions),
        JSON.stringify(state.recentDecisions),
        JSON.stringify(state.importantFiles),
        state.gitBranch,
        state.gitCommit,
        state.updatedAt,
        state.projectId,
      ]
    );
  } else {
    db.run(
      `INSERT INTO workspace_state
        (project_id, current_focus, active_problems, next_actions,
         recent_decisions, important_files, git_branch, git_commit, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        state.projectId,
        state.currentFocus,
        JSON.stringify(state.activeProblems),
        JSON.stringify(state.nextActions),
        JSON.stringify(state.recentDecisions),
        JSON.stringify(state.importantFiles),
        state.gitBranch,
        state.gitCommit,
        state.updatedAt,
      ]
    );
  }
}

function rowToState(row: unknown[]): WorkspaceState {
  return {
    projectId: String(row[0]),
    currentFocus: row[1] ? String(row[1]) : null,
    activeProblems: parseJsonArray(row[2]),
    nextActions: parseJsonArray(row[3]),
    recentDecisions: parseJsonArray(row[4]),
    importantFiles: parseJsonArray(row[5]),
    gitBranch: row[6] ? String(row[6]) : null,
    gitCommit: row[7] ? String(row[7]) : null,
    updatedAt: String(row[8]),
  };
}

function parseJsonArray(val: unknown): string[] {
  try {
    return JSON.parse(String(val));
  } catch {
    return [];
  }
}
