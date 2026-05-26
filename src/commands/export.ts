import * as fs from "fs";
import * as path from "path";
import { getUserDbPath, getUserProjectsPath, ensureCtxHome } from "../paths.js";
import { openDatabase } from "../storage/connection.js";
import { migrateUserDb } from "../storage/migrate.js";
import {
  getDeveloperPreferences,
  getProjects,
} from "../storage/memory-store.js";

interface ExportData {
  version: string;
  exportedAt: string;
  preferences: Record<string, unknown>[];
  projects: Record<string, unknown>[];
}

export async function exportCommand(outputPath?: string): Promise<void> {
  ensureCtxHome();
  const userDb = await openDatabase(getUserDbPath());
  migrateUserDb(userDb);

  const preferences = getDeveloperPreferences(userDb, "active");
  const projects = getProjects(userDb);

  const exportData: ExportData = {
    version: "0.1.0",
    exportedAt: new Date().toISOString(),
    preferences: preferences.map(p => ({
      category: p.category,
      preference: p.preference,
      source: p.source,
      confidence: p.confidence,
      appliesTo: p.appliesTo,
    })),
    projects: projects.map(p => ({
      id: p.id,
      name: p.name,
      path: p.path,
      gitRemote: p.gitRemote,
      primaryLanguage: p.primaryLanguage,
      projectType: p.projectType,
    })),
  };

  const json = JSON.stringify(exportData, null, 2);

  if (outputPath) {
    const dir = path.dirname(path.resolve(outputPath));
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(outputPath, json, "utf-8");
    console.log(`  Exported ${exportData.preferences.length} preferences and ${exportData.projects.length} projects to ${outputPath}`);
  } else {
    console.log(json);
  }
}
