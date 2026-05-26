import type { Database as SqlJsDatabase } from "sql.js";
import type { ProjectEntity } from "../types.js";
import { nanoid } from "nanoid";

export function insertProjectEntity(
  db: SqlJsDatabase,
  params: {
    projectId: string;
    type: ProjectEntity["type"];
    name: string;
    globalEntityId: string | null;
    confidence?: number;
  }
): ProjectEntity {
  const id = nanoid();
  const now = new Date().toISOString();

  db.run(
    `INSERT INTO project_entities (id, project_id, type, name, global_entity_id, confidence, first_seen_at, last_seen_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, params.projectId, params.type, params.name, params.globalEntityId, params.confidence ?? 0.5, now, now]
  );

  return {
    id,
    projectId: params.projectId,
    type: params.type,
    name: params.name,
    globalEntityId: params.globalEntityId,
    confidence: params.confidence ?? 0.5,
    firstSeenAt: now,
    lastSeenAt: now,
  };
}

export function getProjectEntities(
  db: SqlJsDatabase,
  projectId: string
): ProjectEntity[] {
  const result = db.exec(
    `SELECT * FROM project_entities WHERE project_id = ? ORDER BY last_seen_at DESC`,
    [projectId]
  );
  if (result.length === 0) return [];
  return result[0].values.map(v => ({
    id: String(v[0]),
    projectId: String(v[1]),
    type: String(v[2]) as ProjectEntity["type"],
    name: String(v[3]),
    globalEntityId: v[4] ? String(v[4]) : null,
    confidence: Number(v[5]),
    firstSeenAt: String(v[6]),
    lastSeenAt: String(v[7]),
  }));
}

export function upsertProjectEntity(
  db: SqlJsDatabase,
  params: {
    projectId: string;
    type: ProjectEntity["type"];
    name: string;
    globalEntityId?: string | null;
  }
): ProjectEntity {
  const result = db.exec(
    `SELECT * FROM project_entities WHERE project_id = ? AND type = ? AND name = ?`,
    [params.projectId, params.type, params.name]
  );
  if (result.length > 0 && result[0].values.length > 0) {
    const row = result[0].values[0];
    const id = String(row[0]);
    const now = new Date().toISOString();
    db.run(
      `UPDATE project_entities SET last_seen_at = ?, global_entity_id = COALESCE(?, global_entity_id) WHERE id = ?`,
      [now, params.globalEntityId ?? null, id]
    );
    return {
      id,
      projectId: params.projectId,
      type: params.type,
      name: params.name,
      globalEntityId: params.globalEntityId ?? (row[4] ? String(row[4]) : null),
      confidence: Number(row[5]),
      firstSeenAt: String(row[6]),
      lastSeenAt: now,
    };
  }
  return insertProjectEntity(db, {
    projectId: params.projectId,
    type: params.type,
    name: params.name,
    globalEntityId: params.globalEntityId ?? null,
  });
}

export function getGlobalEntitiesByNames(
  userDb: SqlJsDatabase,
  names: string[]
): Map<string, { id: string; usageCount: number; linkedProjectIds: string[] }> {
  const map = new Map<string, { id: string; usageCount: number; linkedProjectIds: string[] }>();
  for (const name of names) {
    const result = userDb.exec(
      `SELECT id, usage_count, linked_project_ids FROM global_entities WHERE name = ?`,
      [name]
    );
    if (result.length > 0 && result[0].values.length > 0) {
      const row = result[0].values[0];
      map.set(name, {
        id: String(row[0]),
        usageCount: Number(row[1]),
        linkedProjectIds: JSON.parse(String(row[2])),
      });
    }
  }
  return map;
}

export function upsertGlobalEntity(
  userDb: SqlJsDatabase,
  params: {
    type: string;
    name: string;
    projectId: string;
  }
): void {
  const existing = userDb.exec(
    `SELECT id, usage_count, linked_project_ids FROM global_entities WHERE name = ?`,
    [params.name]
  );

  const now = new Date().toISOString();
  if (existing.length > 0 && existing[0].values.length > 0) {
    const row = existing[0].values[0];
    const id = String(row[0]);
    const usageCount = Number(row[1]) + 1;
    const linkedProjectIds: string[] = JSON.parse(String(row[2]));
    if (!linkedProjectIds.includes(params.projectId)) {
      linkedProjectIds.push(params.projectId);
    }
    userDb.run(
      `UPDATE global_entities SET usage_count = ?, linked_project_ids = ?, last_seen_at = ? WHERE id = ?`,
      [usageCount, JSON.stringify(linkedProjectIds), now, id]
    );
  } else {
    const id = nanoid();
    userDb.run(
      `INSERT INTO global_entities (id, type, name, description, usage_count, linked_project_ids, first_seen_at, last_seen_at)
       VALUES (?, ?, ?, NULL, 1, ?, ?, ?)`,
      [id, params.type, params.name, JSON.stringify([params.projectId]), now, now]
    );
  }
}
