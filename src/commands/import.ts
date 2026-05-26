import * as fs from "fs";
import { getUserDbPath, ensureCtxHome } from "../paths.js";
import { openDatabase, saveDatabase } from "../storage/connection.js";
import { migrateUserDb } from "../storage/migrate.js";
import {
  insertPreference,
  getDeveloperPreferences,
} from "../storage/memory-store.js";
import type { DeveloperPreference } from "../types.js";

export async function importCommand(filePath: string): Promise<void> {
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }

  let data: Record<string, unknown>;
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    data = JSON.parse(raw);
  } catch (err) {
    console.log(`Failed to parse ${filePath}: ${String(err)}`);
    return;
  }

  const preferences = data.preferences as Record<string, unknown>[] | undefined;
  if (!preferences || !Array.isArray(preferences)) {
    console.log("No preferences found in export file.");
    return;
  }

  ensureCtxHome();
  const userDb = await openDatabase(getUserDbPath());
  migrateUserDb(userDb);

  const existingPrefs = getDeveloperPreferences(userDb, "active");
  const existingTexts = new Set(existingPrefs.map(p => p.preference));

  let imported = 0;
  let skipped = 0;

  for (const p of preferences) {
    const preferenceText = String(p.preference ?? "");
    if (!preferenceText || existingTexts.has(preferenceText)) {
      skipped++;
      continue;
    }

    insertPreference(userDb, {
      category: String(p.category ?? "coding_style") as DeveloperPreference["category"],
      preference: preferenceText,
      source: "explicit",
      appliesTo: (p.appliesTo ?? {}) as Record<string, unknown>,
      confidence: Number(p.confidence) || 1.0,
    });
    imported++;
  }

  saveDatabase(getUserDbPath(), userDb);

  console.log(`  Imported ${imported} preferences (${skipped} skipped as duplicates).`);
}
