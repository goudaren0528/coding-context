import type { Database as SqlJsDatabase } from "sql.js";
import { getEventTtlDays } from "../config.js";

export function archiveDecayedDecisions(db: SqlJsDatabase, projectId: string): number {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);

  const cutoffStr = cutoff.toISOString();

  const result = db.exec(
    `UPDATE decisions SET importance_score = importance_score * 0.5
     WHERE project_id = ? AND importance_score > 0.1 AND created_at < ?`,
    [projectId, cutoffStr]
  );

  const archiveResult = db.exec(
    `DELETE FROM decisions WHERE project_id = ? AND importance_score <= 0.1 AND created_at < ?`,
    [projectId, cutoffStr]
  );

  const purgeResult = db.exec(
    `DELETE FROM session_events WHERE session_id IN (
       SELECT id FROM sessions WHERE project_id = ? AND end_time < datetime('now', '-' || ? || ' days')
     )`,
    [projectId, getEventTtlDays()]
  );

  let deleted = db.getRowsModified();
  return deleted;
}
