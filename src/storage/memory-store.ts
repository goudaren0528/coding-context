import type { Database as SqlJsDatabase } from "sql.js";
import type { DeveloperPreference, RegisteredProject } from "../types.js";
import { nanoid } from "nanoid";

export function getDeveloperPreferences(
  db: SqlJsDatabase,
  status?: "active" | "candidate" | "archived"
): DeveloperPreference[] {
  let query = `SELECT * FROM developer_preferences`;
  const params: unknown[] = [];
  if (status) {
    query += ` WHERE status = ?`;
    params.push(status);
  }
  query += ` ORDER BY category, created_at DESC`;

  try {
    const result = db.exec(query, params);
    if (result.length === 0) return [];
    return result[0].values.map(v => rowToPreference(v));
  } catch {
    return [];
  }
}

export function insertPreference(
  db: SqlJsDatabase,
  params: {
    category: DeveloperPreference["category"];
    preference: string;
    source: "explicit" | "inferred";
    appliesTo?: Record<string, unknown>;
    confidence?: number;
  }
): DeveloperPreference {
  const id = nanoid();
  const now = new Date().toISOString();
  const appliesTo = JSON.stringify(params.appliesTo ?? {});
  const confidence = params.confidence ?? (params.source === "explicit" ? 1.0 : 0.5);
  const status = params.source === "explicit" ? "active" : "candidate";

  db.run(
    `INSERT INTO developer_preferences
      (id, category, preference, applies_to, confidence, source, evidence_project_ids, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, '[]', ?, ?, ?)`,
    [id, params.category, params.preference, appliesTo, confidence, params.source, status, now, now]
  );

  return {
    id,
    category: params.category,
    preference: params.preference,
    appliesTo: (params.appliesTo ?? {}) as DeveloperPreference["appliesTo"],
    source: params.source,
    confidence,
    evidenceProjectIds: [],
    status,
    createdAt: now,
    updatedAt: now,
  };
}

export function getProjects(db: SqlJsDatabase): RegisteredProject[] {
  try {
    const result = db.exec(`SELECT * FROM projects`);
    if (result.length === 0) return [];
    return result[0].values.map(v => ({
      id: String(v[0]),
      name: String(v[1]),
      path: String(v[2]),
      gitRemote: v[3] ? String(v[3]) : null,
      primaryLanguage: v[4] ? String(v[4]) : null,
      projectType: v[5] ? String(v[5]) : null,
      lastSeenAt: String(v[6]),
      createdAt: String(v[7]),
    }));
  } catch {
    return [];
  }
}

export function registerProject(
  db: SqlJsDatabase,
  params: {
    id: string;
    name: string;
    path: string;
    gitRemote?: string | null;
  }
): void {
  const now = new Date().toISOString();
  const existing = db.exec(`SELECT id FROM projects WHERE id = ?`, [params.id]);
  if (existing.length > 0 && existing[0].values.length > 0) {
    db.run(`UPDATE projects SET last_seen_at = ? WHERE id = ?`, [now, params.id]);
  } else {
    db.run(
      `INSERT INTO projects (id, name, path, git_remote, primary_language, project_type, last_seen_at, created_at)
       VALUES (?, ?, ?, ?, NULL, NULL, ?, ?)`,
      [params.id, params.name, params.path, params.gitRemote ?? null, now, now]
    );
  }
}

export function getProject(
  db: SqlJsDatabase,
  projectId: string
): RegisteredProject | null {
  const result = db.exec(`SELECT * FROM projects WHERE id = ?`, [projectId]);
  if (result.length === 0 || result[0].values.length === 0) return null;
  const v = result[0].values[0];
  return {
    id: String(v[0]),
    name: String(v[1]),
    path: String(v[2]),
    gitRemote: v[3] ? String(v[3]) : null,
    primaryLanguage: v[4] ? String(v[4]) : null,
    projectType: v[5] ? String(v[5]) : null,
    lastSeenAt: String(v[6]),
    createdAt: String(v[7]),
  };
}

function rowToPreference(row: unknown[]): DeveloperPreference {
  return {
    id: String(row[0]),
    category: String(row[1]) as DeveloperPreference["category"],
    preference: String(row[2]),
    appliesTo: parseJson(String(row[3])),
    confidence: Number(row[4]),
    source: String(row[5]) as "explicit" | "inferred",
    evidenceProjectIds: parseJsonArray(String(row[6])),
    status: String(row[7]) as "active" | "candidate" | "archived",
    createdAt: String(row[8]),
    updatedAt: String(row[9]),
  };
}

function parseJson(str: string): Record<string, unknown> {
  try {
    return JSON.parse(str);
  } catch {
    return {};
  }
}

function parseJsonArray(str: string): string[] {
  try {
    return JSON.parse(str);
  } catch {
    return [];
  }
}
