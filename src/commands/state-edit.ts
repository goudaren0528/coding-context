import { resolveProjectRoot, getProjectDbPath } from "../paths.js";
import { openDatabase, saveDatabase } from "../storage/connection.js";
import { getWorkspaceState, upsertWorkspaceState } from "../storage/state-store.js";

export async function stateEditCommand(field: string, value: string): Promise<void> {
  const projectRoot = resolveProjectRoot();
  const { ensureProjectInit } = await import("../project/init.js");
  const { config } = await ensureProjectInit(projectRoot);
  const projectDb = await openDatabase(getProjectDbPath(projectRoot));

  let state = getWorkspaceState(projectDb, config.projectId);
  if (!state) {
    console.log("No workspace state exists yet. Start a session first.");
    saveDatabase(getProjectDbPath(projectRoot), projectDb);
    return;
  }

  const validFields = ["currentFocus", "activeProblems", "nextActions", "recentDecisions", "importantFiles"];

  if (!validFields.includes(field)) {
    console.log(`Invalid field. Choose from: ${validFields.join(", ")}`);
    saveDatabase(getProjectDbPath(projectRoot), projectDb);
    return;
  }

  switch (field) {
    case "currentFocus":
      state.currentFocus = value;
      break;
    case "activeProblems":
      state.activeProblems = value.split(",").map(s => s.trim()).filter(Boolean);
      break;
    case "nextActions":
      state.nextActions = value.split(",").map(s => s.trim()).filter(Boolean);
      break;
    case "recentDecisions":
      state.recentDecisions = value.split(",").map(s => s.trim()).filter(Boolean);
      break;
    case "importantFiles":
      state.importantFiles = value.split(",").map(s => s.trim()).filter(Boolean);
      break;
  }

  state.updatedAt = new Date().toISOString();
  upsertWorkspaceState(projectDb, state);
  saveDatabase(getProjectDbPath(projectRoot), projectDb);

  console.log(`  \u2713 Updated ${field}`);
  console.log(`    ${value}`);
}
