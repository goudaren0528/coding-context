import type { Database as SqlJsDatabase } from "sql.js";
import type { ProjectBrain } from "../types.js";

export function getProjectBrain(
  db: SqlJsDatabase,
  projectId: string
): ProjectBrain | null {
  const result = db.exec(
    `SELECT * FROM project_brain WHERE project_id = ?`,
    [projectId]
  );
  if (result.length === 0 || result[0].values.length === 0) return null;
  return rowToBrain(result[0].values[0]);
}

export function upsertProjectBrain(
  db: SqlJsDatabase,
  brain: ProjectBrain
): void {
  const existing = getProjectBrain(db, brain.projectId);
  if (existing) {
    db.run(
      `UPDATE project_brain SET
        architecture = ?, tech_stack = ?, key_patterns = ?,
        known_constraints = ?, open_questions = ?,
        important_entities = ?, important_commands = ?, updated_at = ?
       WHERE project_id = ?`,
      [
        JSON.stringify(brain.architecture),
        JSON.stringify(brain.techStack),
        JSON.stringify(brain.keyPatterns),
        JSON.stringify(brain.knownConstraints),
        JSON.stringify(brain.openQuestions),
        JSON.stringify(brain.importantEntities),
        JSON.stringify(brain.importantCommands),
        brain.updatedAt,
        brain.projectId,
      ]
    );
  } else {
    db.run(
      `INSERT INTO project_brain
        (project_id, architecture, tech_stack, key_patterns,
         known_constraints, open_questions, important_entities,
         important_commands, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        brain.projectId,
        JSON.stringify(brain.architecture),
        JSON.stringify(brain.techStack),
        JSON.stringify(brain.keyPatterns),
        JSON.stringify(brain.knownConstraints),
        JSON.stringify(brain.openQuestions),
        JSON.stringify(brain.importantEntities),
        JSON.stringify(brain.importantCommands),
        brain.updatedAt,
      ]
    );
  }
}

function rowToBrain(row: unknown[]): ProjectBrain {
  return {
    projectId: String(row[0]),
    architecture: parseJsonArray(row[1]),
    techStack: parseJsonArray(row[2]),
    keyPatterns: parseJsonArray(row[3]),
    knownConstraints: parseJsonArray(row[4]),
    openQuestions: parseJsonArray(row[5]),
    importantEntities: parseJsonArray(row[6]),
    importantCommands: parseJsonArray(row[7]),
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
