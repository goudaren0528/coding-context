import { getUserDbPath, getUserProjectsPath, ensureCtxHome, getProjectDbPath } from "../paths.js";
import { openDatabase, saveDatabase } from "../storage/connection.js";
import { migrateUserDb } from "../storage/migrate.js";
import { getProjects } from "../storage/memory-store.js";
import { getGlobalEntitiesByNames, upsertGlobalEntity } from "../storage/entity-store.js";
import { upsertCandidate } from "../memory/candidates.js";
import * as fs from "fs";

export async function updateCommand(): Promise<void> {
  ensureCtxHome();
  const userDb = await openDatabase(getUserDbPath());
  migrateUserDb(userDb);

  const projects = getProjects(userDb);

  if (projects.length === 0) {
    console.log("No projects registered. Start a session first.");
    saveDatabase(getUserDbPath(), userDb);
    return;
  }

  console.log(`Scanning ${projects.length} projects...`);

  let entitiesUpdated = 0;
  let patternsDetected = 0;
  let candidatesGenerated = 0;

  const allProjectEntities = new Map<string, { name: string; type: string; projectId: string }[]>();

  for (const proj of projects) {
    const projectDbPath = getProjectDbPath(proj.path);
    if (!fs.existsSync(projectDbPath)) continue;

    const { openDatabase: openDb } = await import("../storage/connection.js");
    const projectDb = await openDb(projectDbPath);

    try {
      const result = projectDb.exec(
        `SELECT type, name, project_id FROM project_entities WHERE type IN ('library','concept','pattern') AND project_id = ?`,
        [proj.id]
      );

      if (result.length > 0 && result[0].values.length > 0) {
        for (const row of result[0].values) {
          const type = String(row[0]);
          const name = String(row[1]);
          const projectId = String(row[2]);
          upsertGlobalEntity(userDb, { type, name, projectId });
          entitiesUpdated++;

          if (!allProjectEntities.has(name)) {
            allProjectEntities.set(name, []);
          }
          allProjectEntities.get(name)!.push({ name, type, projectId });
        }
      }
    } catch {}

    saveDatabase(projectDbPath, projectDb);
  }

  for (const [name, occurrences] of allProjectEntities) {
    if (occurrences.length >= 2) {
      const existingPattern = userDb.exec(
        `SELECT id FROM cross_project_patterns WHERE pattern = ?`,
        [name]
      );

      const projectIds = occurrences.map(o => o.projectId);
      const now = new Date().toISOString();

      if (existingPattern.length > 0 && existingPattern[0].values.length > 0) {
        const id = String(existingPattern[0].values[0][0]);
        userDb.run(
          `UPDATE cross_project_patterns SET project_ids = ?, confidence = ?, last_seen_at = ? WHERE id = ?`,
          [JSON.stringify(projectIds), Math.min(0.95, 0.5 + occurrences.length * 0.1), now, id]
        );
      } else {
        const { nanoid } = await import("nanoid");
        userDb.run(
          `INSERT INTO cross_project_patterns (id, pattern, description, project_ids, confidence, last_seen_at, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [nanoid(), name, `${name} used across ${occurrences.length} projects`, JSON.stringify(projectIds), 0.6, now, now]
        );
      }
      patternsDetected++;

      upsertCandidate(userDb, {
        kind: "entity",
        content: `Frequently uses ${name} across projects`,
        projectId: occurrences[0].projectId,
        confidence: Math.min(0.85, 0.5 + occurrences.length * 0.1),
      });
      candidatesGenerated++;
    }
  }

  saveDatabase(getUserDbPath(), userDb);

  console.log(`  \u2713 ${entitiesUpdated} global entities updated`);
  console.log(`  \u2713 ${patternsDetected} cross-project patterns detected`);
  console.log(`  \u2713 ${candidatesGenerated} new memory candidates`);

  const pendingCount = userDb.exec(`SELECT COUNT(*) FROM memory_candidates WHERE status = 'pending'`);
  if (pendingCount.length > 0 && pendingCount[0].values.length > 0) {
    const count = Number(pendingCount[0].values[0][0]);
    if (count > 0) {
      console.log("");
      console.log(`  Run \`ctx memory\` to review ${count} pending candidates.`);
    }
  }

  console.log(`  \u2713 ${projects.length} projects scanned`);
}
